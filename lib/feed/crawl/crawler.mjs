// Orchestrates the corpus crawl: graph (subreddit links → topic bridges), collect
// (newest-first scan, then targeted keyword search), and the coverage report.
import { allSubreddits, flattenHorizontals } from "../taxonomy/index.mjs";
import { BudgetExhausted } from "./arctic.mjs";
import { buildMatchers, classifyPost } from "./classify.mjs";
import { extractImages, isImageCandidate } from "./media.mjs";

// Hard floor: never collect posts from before 2025.
export const DATE_FLOOR = "2025-01-01T00:00:00Z";

export function resolveFloor(input) {
  const floor = Date.parse(DATE_FLOOR);
  const asked = input ? Date.parse(input) : floor;
  return new Date(Number.isFinite(asked) ? Math.max(asked, floor) : floor).toISOString();
}

export function extractSubredditLinks(text) {
  const links = new Set();
  for (const m of String(text || "").matchAll(/(?:^|[^a-z0-9_])\/?r\/([a-z0-9_]{3,21})/gi)) links.add(m[1].toLowerCase());
  return [...links];
}

const PAGE = 100;
const isoFromEpoch = (seconds) => new Date(seconds * 1000).toISOString();

// Subreddit metadata we keep; `imagePosts` is false for text-only (submission_type "self") subs.
export function subredditRecord(info, name) {
  if (!info) return { name, exists: false, imagePosts: false, links: [] };
  const key = String(info.display_name || name).toLowerCase();
  const isPublic = !info.subreddit_type || ["public", "restricted", "archived", "gold_restricted"].includes(info.subreddit_type);
  return {
    name: info.display_name || name,
    exists: isPublic,
    subscribers: info.subscribers ?? null,
    category: info.advertiser_category || null,
    over18: Boolean(info.over18),
    type: info.subreddit_type || null,
    submissionType: info.submission_type || null,
    imagePosts: isPublic && !info.over18 && info.submission_type !== "self" && Boolean(info.allow_images || info.allow_galleries),
    links: extractSubredditLinks(`${info.description || ""}\n${info.public_description || ""}`).filter((l) => l !== key),
  };
}

// ---------------------------------------------------------------------------------------------
// Graph: subreddit metadata + sidebar links, folded into weighted topic-to-topic bridges.

export async function runGraph({ client, store, topics, log = () => {} }) {
  const graph = store.readJson("graph.json", null) || { subreddits: {} };
  const names = allSubreddits(topics);
  let fetched = 0;
  let stoppedBy = null;
  try {
    for (const name of names) {
      const key = name.toLowerCase();
      if (graph.subreddits[key] && "imagePosts" in graph.subreddits[key]) continue;
      graph.subreddits[key] = subredditRecord(await client.subredditInfo(name), name);
      fetched += 1;
      if (fetched % 25 === 0) {
        store.writeJson("graph.json", foldGraph(graph, topics));
        log(`graph: ${Object.keys(graph.subreddits).length}/${names.length} subreddits`);
      }
    }
  } catch (error) {
    if (!(error instanceof BudgetExhausted)) throw error;
    stoppedBy = error.message;
  }
  const folded = foldGraph(graph, topics);
  store.writeJson("graph.json", folded);
  return { fetched, total: names.length, known: Object.keys(graph.subreddits).length, stoppedBy, edges: folded.topicEdges.length };
}

export function foldGraph(graph, topics) {
  const subTopics = new Map();
  for (const topic of topics) {
    const subs = new Set([...topic.subreddits, ...topic.subtopics.flatMap((s) => [...s.subreddits, ...s.steps.flatMap((st) => st.subreddits)])]);
    for (const sub of subs) {
      const key = sub.toLowerCase();
      if (!subTopics.has(key)) subTopics.set(key, new Set());
      subTopics.get(key).add(topic.id);
    }
  }
  const edges = new Map();
  const suggestions = new Map();
  for (const [key, info] of Object.entries(graph.subreddits)) {
    const from = subTopics.get(key);
    if (!from || !info.exists) continue;
    for (const link of info.links || []) {
      const to = subTopics.get(link);
      if (!to) {
        for (const topicId of from) {
          if (!suggestions.has(topicId)) suggestions.set(topicId, new Map());
          const bucket = suggestions.get(topicId);
          bucket.set(link, (bucket.get(link) || 0) + 1);
        }
        continue;
      }
      for (const a of from)
        for (const b of to) {
          if (a === b) continue;
          const id = `${a}>${b}`;
          edges.set(id, (edges.get(id) || 0) + 1);
        }
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    subreddits: graph.subreddits,
    missing: Object.entries(graph.subreddits).filter(([, v]) => !v.exists).map(([k]) => k).sort(),
    textOnly: Object.entries(graph.subreddits).filter(([, v]) => v.exists && v.imagePosts === false).map(([k]) => k).sort(),
    topicEdges: [...edges].map(([id, weight]) => { const [from, to] = id.split(">"); return { from, to, weight }; }).sort((x, y) => y.weight - x.weight),
    suggestions: Object.fromEntries([...suggestions].map(([topicId, bucket]) => [topicId, [...bucket].filter(([, refs]) => refs >= 2).sort((x, y) => y[1] - x[1]).slice(0, 15).map(([name, refs]) => ({ name, refs }))])),
  };
}

// ---------------------------------------------------------------------------------------------
// Collect.

function toRecord(post, images, match, via) {
  return {
    id: post.id,
    source: "reddit",
    subreddit: post.subreddit,
    author: post.author,
    title: post.title,
    flair: post.link_flair_text || null,
    createdAt: isoFromEpoch(post.created_utc),
    score: post.score ?? 0,
    comments: post.num_comments ?? 0,
    upvoteRatio: post.upvote_ratio ?? null,
    permalink: post.permalink ? `https://www.reddit.com${post.permalink}` : `https://www.reddit.com/comments/${post.id}`,
    image: images[0],
    gallery: images.length > 1 ? images : undefined,
    imageCount: images.length,
    topicId: match.topic.id,
    topicName: match.topic.name,
    subtopicId: match.subtopic.id,
    subtopicName: match.subtopic.name,
    stepId: match.step.id,
    stepName: match.step.name,
    depth: match.step.depth,
    horizontalId: match.horizontal.id,
    horizontalName: match.horizontal.name,
    path: match.horizontal.path,
    matched: match.matched,
    via,
    collectedAt: new Date().toISOString(),
  };
}

export async function runCollect({
  client,
  store,
  topics,
  per = 25,
  floor,
  scanPages = 20,
  dedicatedPages = 150,
  searchPages = 6,
  searchMaxSubscribers = 2000000,
  phases = ["scan", "search"],
  log = () => {},
}) {
  const floorIso = resolveFloor(floor);
  const floorSec = Date.parse(floorIso) / 1000;
  const { steps, bySubreddit } = buildMatchers(topics);
  const graph = store.readJson("graph.json", null) || { subreddits: {} };
  const blocked = (store.state.searchBlocked = store.state.searchBlocked || {});
  const isFull = (p) => store.count(p) >= per;
  const stepFull = (m) => m.horizontals.every((h) => isFull(h.horizontal.path));
  const subFull = (sub) => (bySubreddit.get(sub) || []).every(stepFull);
  const startedAt = new Date().toISOString();
  const startTotal = store.total();
  const summary = { scanned: 0, searched: 0, added: 0, skippedSubreddits: 0, errors: [] };
  let infoFetched = 0;

  // Metadata decides whether a subreddit can hold image posts at all; fetched once, then cached.
  async function usable(sub) {
    if (!graph.subreddits[sub] || !("imagePosts" in graph.subreddits[sub])) {
      graph.subreddits[sub] = subredditRecord(await client.subredditInfo(sub), sub);
      infoFetched += 1;
      if (infoFetched % 20 === 0) store.writeJson("graph.json", foldGraph(graph, topics));
    }
    const info = graph.subreddits[sub];
    return info.exists && info.imagePosts !== false;
  }

  // Classify a page, hydrate the tentative matches, keep those with a usable image.
  async function ingest(posts, sub, via, cur) {
    const pending = new Map();
    const tentative = [];
    for (const post of posts) {
      if (!isImageCandidate(post)) continue;
      cur.images = (cur.images || 0) + 1;
      if (store.seenPosts.has(post.id)) continue;
      const match = classifyPost(post, bySubreddit.get(sub), { isFull: (p) => store.count(p) + (pending.get(p) || 0) >= per });
      if (!match) continue;
      pending.set(match.horizontal.path, (pending.get(match.horizontal.path) || 0) + 1);
      tentative.push({ post, match });
    }
    if (!tentative.length) return 0;
    const hydrated = new Map((await client.postsByIds(tentative.map((t) => t.post.id))).map((p) => [p.id, p]));
    const records = [];
    const added = new Map();
    for (const { post, match } of tentative) {
      const full = hydrated.get(post.id);
      if (!full) continue;
      const images = extractImages(full);
      if (!images.length || store.seenImages.has(images[0].url)) continue;
      const p = match.horizontal.path;
      if (store.count(p) + (added.get(p) || 0) >= per) continue;
      added.set(p, (added.get(p) || 0) + 1);
      records.push(toRecord({ ...post, ...full }, images, match, via));
    }
    store.append(records);
    summary.added += records.length;
    return records.length;
  }

  // Walk one query newest-first from its saved cursor down to the floor.
  async function walk(key, params, sub, maxPages, via, stillNeeded) {
    const cur = store.cursor(key) || { before: null, pages: 0, done: false };
    let pagesThisRun = 0;
    while (!cur.done && pagesThisRun < maxPages && stillNeeded()) {
      const keyword = Boolean(params.title || params.link_flair_text);
      let posts;
      try {
        // Keyword queries are heavy for the archive: retry them less and give up sooner.
        posts = await client.searchPosts({ subreddit: sub, after: floorIso, before: cur.before || undefined, ...params }, keyword ? { maxRetries: 2 } : undefined);
      } catch (error) {
        if (error instanceof BudgetExhausted) throw error;
        cur.done = true;
        cur.error = error.message.slice(0, 160);
        summary.errors.push({ key, error: cur.error });
        if (keyword) blocked[sub] = cur.error;
        break;
      }
      pagesThisRun += 1;
      cur.pages += 1;
      if (posts.length) {
        await ingest(posts, sub, via, cur);
        const oldest = Math.min(...posts.map((p) => p.created_utc));
        cur.before = isoFromEpoch(oldest);
        if (posts.length < PAGE || oldest <= floorSec) cur.done = true;
      } else cur.done = true;
      store.setCursor(key, cur);
      store.save();
    }
    return cur;
  }

  let stoppedBy = null;
  try {
    // Phase 1: newest-first scan of every subreddit, dedicated ones first within each topic.
    if (phases.includes("scan")) {
      const visited = new Set();
      for (const topic of topics) {
        const topicSteps = steps.filter((m) => m.topic === topic);
        const subs = [...new Set([...topicSteps.flatMap((m) => [...m.dedicated]), ...topicSteps.flatMap((m) => m.step.subreddits.map((s) => s.toLowerCase()))])];
        for (const sub of subs) {
          if (visited.has(sub)) continue;
          visited.add(sub);
          if (!(await usable(sub))) { summary.skippedSubreddits += 1; continue; }
          const dedicated = (bySubreddit.get(sub) || []).some((m) => m.dedicated.has(sub));
          await walk(`scan:${sub}`, {}, sub, dedicated ? dedicatedPages : scanPages, "scan", () => !subFull(sub));
          summary.scanned += 1;
        }
        log(`scan: ${topic.id} done — corpus ${store.total()} images`);
      }
    }
    // Phase 2: keyword search for steps whose horizontals are still short.
    if (phases.includes("search")) {
      for (const topic of topics) {
        for (const m of steps.filter((s) => s.topic === topic)) {
          for (const subName of [...m.step.dedicated, ...m.step.subreddits]) {
            const sub = subName.toLowerCase();
            if (stepFull(m) || blocked[sub] || !(await usable(sub))) continue;
            // Huge subreddits time out on keyword search, and a scan that saw no images means none to find.
            const scan = store.cursor(`scan:${sub}`);
            if ((graph.subreddits[sub]?.subscribers || 0) > searchMaxSubscribers) continue;
            if (scan && scan.pages >= 3 && !scan.images) continue;
            const queries = [];
            if (m.dedicated.has(sub)) {
              // Whole subreddit is on-topic: search each short horizontal's own keywords.
              for (const h of m.horizontals) if (!isFull(h.horizontal.path)) for (const k of h.horizontal.keywords) queries.push(k);
            } else queries.push(...m.step.keywords);
            for (const k of queries) {
              if (stepFull(m)) break;
              const params = k.field === "flair" ? { link_flair_text: k.text } : { title: k.text };
              await walk(`search:${sub}:${k.field}:${k.text}`, params, sub, searchPages, `search:${k.text}`, () => !stepFull(m));
              summary.searched += 1;
            }
          }
        }
        log(`search: ${topic.id} done — corpus ${store.total()} images`);
      }
    }
  } catch (error) {
    if (!(error instanceof BudgetExhausted)) throw error;
    stoppedBy = error.message;
  }
  if (infoFetched) store.writeJson("graph.json", foldGraph(graph, topics));
  store.state.runs = [...(store.state.runs || []), {
    startedAt,
    endedAt: new Date().toISOString(),
    topics: topics.map((t) => t.id),
    phases,
    added: store.total() - startTotal,
    requests: client.stats.requests,
    waits: client.stats.waits,
    waitedSeconds: Math.round(client.stats.waitedMs / 1000),
    stoppedBy,
  }].slice(-200);
  store.save();
  return { ...summary, stoppedBy, total: store.total(), requests: client.stats.requests, waits: client.stats.waits };
}

// ---------------------------------------------------------------------------------------------
// Report.

export function buildReport({ store, topics, per = 25 }) {
  const rows = flattenHorizontals(topics);
  const graph = store.readJson("graph.json", null);
  const byTopic = [];
  const short = [];
  let full = 0;
  for (const topic of topics) {
    const topicRows = rows.filter((r) => r.topic === topic);
    const counts = topicRows.map((r) => Math.min(store.count(r.horizontal.path), per));
    const topicFull = counts.filter((c) => c >= per).length;
    full += topicFull;
    byTopic.push({
      id: topic.id,
      name: topic.name,
      images: topicRows.reduce((sum, r) => sum + store.count(r.horizontal.path), 0),
      horizontalsFull: topicFull,
      horizontals: topicRows.length,
      byDepth: [1, 2, 3, 4].map((d) => topicRows.filter((r) => r.step.depth === d).reduce((sum, r) => sum + store.count(r.horizontal.path), 0)),
    });
    for (const r of topicRows) if (store.count(r.horizontal.path) < per) short.push({ path: r.horizontal.path, have: store.count(r.horizontal.path) });
  }
  const runs = store.state.runs || [];
  const report = {
    generatedAt: new Date().toISOString(),
    target: { perHorizontal: per, horizontals: rows.length, images: rows.length * per },
    collected: store.total(),
    horizontalsFull: full,
    horizontalsShort: short.length,
    topics: byTopic,
    short,
    missingSubreddits: graph?.missing || [],
    textOnlySubreddits: graph?.textOnly || [],
    runs: { count: runs.length, requests: runs.reduce((a, r) => a + (r.requests || 0), 0), waits: runs.reduce((a, r) => a + (r.waits || 0), 0), waitedSeconds: runs.reduce((a, r) => a + (r.waitedSeconds || 0), 0), last: runs.at(-1) || null },
  };
  store.writeJson("report.json", report);
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "0%");
  const md = [
    `# Feed corpus coverage`,
    ``,
    `Generated ${report.generatedAt}. Target ${report.target.images.toLocaleString()} images (${rows.length.toLocaleString()} horizontals × ${per}).`,
    ``,
    `- Collected: **${report.collected.toLocaleString()}** images (${pct(report.collected, report.target.images)})`,
    `- Horizontals at target: **${full.toLocaleString()} / ${rows.length.toLocaleString()}**`,
    `- Runs: ${report.runs.count}, requests ${report.runs.requests.toLocaleString()}, rate-limit waits ${report.runs.waits} (${report.runs.waitedSeconds}s)`,
    `- Text-only subreddits skipped: ${report.textOnlySubreddits.length}`,
    `- Subreddits not found: ${report.missingSubreddits.length}${report.missingSubreddits.length ? ` (${report.missingSubreddits.slice(0, 40).join(", ")}${report.missingSubreddits.length > 40 ? ", …" : ""})` : ""}`,
    ``,
    `| Topic | Images | Full horizontals | Depth 1 | Depth 2 | Depth 3 | Depth 4 |`,
    `|---|---:|---:|---:|---:|---:|---:|`,
    ...byTopic.map((t) => `| ${t.name} | ${t.images} | ${t.horizontalsFull}/${t.horizontals} | ${t.byDepth.join(" | ")} |`),
    ``,
  ].join("\n");
  store.writeText("report.md", md);
  return report;
}
