// Distributed crawl: a Postgres task queue (content.feed_crawl_*) that many worker machines lease
// from, so the remaining corpus splits across IPs without walking a page or storing an image twice.
import { BudgetExhausted } from "./arctic.mjs";
import { buildMatchers, classifyPost } from "./classify.mjs";
import { isoFromEpoch, PAGE, resolveFloor, toRecord } from "./crawler.mjs";
import { extractImages, isImageCandidate } from "./media.mjs";

export const LEASE_MINUTES = 15;
export const MAX_FAILURES = 8;

// Every scan + keyword-search walk the single-machine crawler would run, as queue rows.
// Priority is the position inside its topic, so all topics get their first subreddits early.
export function planTasks(topics, graph, { searchMaxSubscribers = 2000000 } = {}) {
  const { steps } = buildMatchers(topics);
  const info = (sub) => graph?.subreddits?.[sub];
  const usable = (sub) => { const i = info(sub); return !i || (i.exists && i.imagePosts !== false); };
  const tasks = new Map();
  for (const topic of topics) {
    const topicSteps = steps.filter((m) => m.topic === topic);
    const subs = [...new Set([...topicSteps.flatMap((m) => [...m.dedicated]), ...topicSteps.flatMap((m) => m.step.subreddits.map((s) => s.toLowerCase()))])];
    subs.forEach((sub, priority) => {
      const key = `scan:${sub}`;
      if (!tasks.has(key) && usable(sub)) tasks.set(key, { key, kind: "scan", subreddit: sub, params: {}, topicId: topic.id, stepPath: null, horizontalPath: null, priority });
    });
    let priority = 0;
    for (const m of topicSteps) {
      for (const sub of new Set([...m.step.dedicated, ...m.step.subreddits].map((s) => s.toLowerCase()))) {
        // Huge subreddits time out on keyword search.
        if (!usable(sub) || (info(sub)?.subscribers || 0) > searchMaxSubscribers) continue;
        // A dedicated subreddit is all on-topic: search each horizontal's own keywords there.
        const queries = m.dedicated.has(sub)
          ? m.horizontals.flatMap((h) => h.horizontal.keywords.map((k) => ({ k, horizontalPath: h.horizontal.path })))
          : m.step.keywords.map((k) => ({ k, horizontalPath: null }));
        for (const { k, horizontalPath } of queries) {
          const key = `search:${sub}:${k.field}:${k.text}`;
          if (tasks.has(key)) continue;
          tasks.set(key, {
            key, kind: "search", subreddit: sub, topicId: topic.id, stepPath: m.step.path, horizontalPath, priority: priority++,
            params: k.field === "flair" ? { link_flair_text: k.text } : { title: k.text },
          });
        }
      }
    }
  }
  return [...tasks.values()];
}

// Folds the single-machine crawl state (cursors, blocked subs) into planned tasks before seeding.
// Searches start a round behind scans, like the single-machine scan-then-search phases.
export function withLocalProgress(tasks, state = {}) {
  const cursors = state.cursors || {};
  const blocked = state.searchBlocked || {};
  return tasks.map((task) => {
    const cur = cursors[task.key];
    const status = cur?.done ? "done" : task.kind === "search" && blocked[task.subreddit] ? "blocked" : "queued";
    return { ...task, status, cursorBefore: cur?.before || null, pages: cur?.pages || 0, images: cur?.images || 0, round: task.kind === "scan" ? 0 : 1 };
  });
}

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

// SQL access for the queue; `db` is a pg Pool (or anything with query()).
export function createFleetRepo(db) {
  const q = (text, values) => db.query(text, values);
  return {
    async seedTasks(tasks) {
      let inserted = 0;
      for (const batch of chunks(tasks, 500)) {
        const rows = batch.map((t) => ({
          key: t.key, kind: t.kind, subreddit: t.subreddit, params: t.params, topic_id: t.topicId, step_path: t.stepPath, horizontal_path: t.horizontalPath,
          priority: t.priority, round: t.round || 0, status: t.status || "queued", cursor_before: t.cursorBefore || null, pages: t.pages || 0, images: t.images || 0,
        }));
        const { rowCount } = await q(
          `insert into content.feed_crawl_tasks (key, kind, subreddit, params, topic_id, step_path, horizontal_path, priority, round, status, cursor_before, pages, images)
           select * from jsonb_to_recordset($1::jsonb) as t(key text, kind text, subreddit text, params jsonb, topic_id text, step_path text, horizontal_path text,
             priority integer, round integer, status text, cursor_before timestamptz, pages integer, images integer)
           on conflict (key) do nothing`,
          [JSON.stringify(rows)],
        );
        inserted += rowCount;
      }
      return inserted;
    },

    // Stores records (capped at `per` per path, deduped by post and image); returns the stored paths.
    async ingest(records, per, worker) {
      if (!records.length) return [];
      const { rows } = await q("select content.feed_crawl_ingest($1::jsonb, $2, $3) as path", [JSON.stringify(records), per, worker]);
      return rows.map((r) => r.path);
    },

    async counts() {
      const { rows } = await q("select path, n from content.feed_crawl_counts where deleted_at is null");
      return new Map(rows.map((r) => [r.path, r.n]));
    },

    async knownPosts(ids) {
      if (!ids.length) return new Set();
      const { rows } = await q("select post_id from content.feed_crawl_images where post_id = any($1::text[])", [ids]);
      return new Set(rows.map((r) => r.post_id));
    },

    // Leases the next ready task (breadth first: lowest round, scans before searches); expired leases are reclaimable.
    async claim(worker) {
      const { rows } = await q(
        `with next as (
           select id from content.feed_crawl_tasks
           where deleted_at is null and ((status = 'queued' and available_at <= now()) or (status = 'leased' and lease_until < now()))
           order by round, kind, last_added desc, priority, key
           for update skip locked limit 1
         )
         update content.feed_crawl_tasks t
         set status = 'leased', lease_token = gen_random_uuid(), lease_until = now() + interval '${LEASE_MINUTES} minutes', worker = $1, updated_at = now()
         from next where t.id = next.id returning t.*`,
        [worker],
      );
      return rows[0] || null;
    },

    // Saves the cursor and renews the lease; false means the lease was lost to another worker.
    async checkpoint(task, cur) {
      const { rowCount } = await q(
        `update content.feed_crawl_tasks set cursor_before = $3, pages = $4, images = $5, added = $6,
           lease_until = now() + interval '${LEASE_MINUTES} minutes', updated_at = now()
         where id = $1 and lease_token = $2 and status = 'leased'`,
        [task.id, task.lease_token, cur.before, cur.pages, cur.images, cur.added],
      );
      return rowCount === 1;
    },

    // Hands the task back: done/blocked, or queued for a later round; repeated errors end in 'failed'.
    async release(task, { status, lastAdded = 0, error = null, delayMs = 0 }) {
      await q(
        `update content.feed_crawl_tasks set
           status = case when $5::text is not null and attempts + 1 >= ${MAX_FAILURES} then 'failed' else $3 end,
           attempts = case when $5::text is null then 0 else attempts + 1 end,
           round = round + 1, last_added = $4, error = $5, available_at = now() + ($6 || ' milliseconds')::interval,
           lease_token = null, lease_until = null, worker = null, updated_at = now()
         where id = $1 and lease_token = $2`,
        [task.id, task.lease_token, status, lastAdded, error, String(Math.round(delayMs))],
      );
    },

    async blockSearches(subreddit, error) {
      await q(
        "update content.feed_crawl_tasks set status = 'blocked', error = $2, updated_at = now() where subreddit = $1 and kind = 'search' and status = 'queued'",
        [subreddit, error],
      );
    },

    async scanTask(subreddit) {
      const { rows } = await q("select pages, images, status from content.feed_crawl_tasks where key = $1", [`scan:${subreddit}`]);
      return rows[0] || null;
    },

    async queue() {
      const { rows } = await q(
        `select count(*) filter (where status = 'queued')::int as queued,
                count(*) filter (where status = 'queued' and available_at <= now())::int as ready,
                count(*) filter (where status = 'leased' and lease_until >= now())::int as leased,
                count(*) filter (where status = 'leased' and lease_until < now())::int as expired
         from content.feed_crawl_tasks where deleted_at is null`,
      );
      return rows[0];
    },

    async heartbeat(worker, { host, version, status = "running", currentTask = null, stats = {}, added = 0 }) {
      await q(
        `insert into content.feed_crawl_workers (name, host, version, status, current_task, requests, waits, waited_seconds, added)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (name) do update set host = excluded.host, version = excluded.version, status = excluded.status, current_task = excluded.current_task,
           requests = excluded.requests, waits = excluded.waits, waited_seconds = excluded.waited_seconds, added = excluded.added,
           last_seen = now(), updated_at = now()`,
        [worker, host || null, version || null, status, currentTask, stats.requests || 0, stats.waits || 0, Math.round((stats.waitedMs || 0) / 1000), added],
      );
    },
  };
}

const sleep = (ms, signal) =>
  new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });

// One worker's loop: lease a task, walk a slice of pages from its cursor, store what matches, hand it back.
export async function runWorker({
  client,
  repo,
  topics,
  worker,
  host,
  version,
  per = 25,
  floor,
  slicePages = 20,
  searchPages = 6,
  dryPages = 12,
  countsTtlMs = 120000,
  idleMs = 60000,
  signal,
  log = () => {},
  now = () => Date.now(),
}) {
  const floorIso = resolveFloor(floor);
  const floorSec = Date.parse(floorIso) / 1000;
  const { steps, bySubreddit } = buildMatchers(topics);
  const stepByPath = new Map(steps.map((m) => [m.step.path, m]));
  let counts = await repo.counts();
  let countsAt = now();
  const count = (p) => counts.get(p) || 0;
  const isFull = (p) => count(p) >= per;
  const stepFull = (m) => m.horizontals.every((h) => isFull(h.horizontal.path));
  const summary = { tasks: 0, pages: 0, added: 0, errors: 0, stoppedBy: null };
  const beat = (status, currentTask = null) =>
    repo.heartbeat(worker, { host, version, status, currentTask, stats: client.stats, added: summary.added }).catch((error) => log(`heartbeat failed: ${error.message}`));

  // Classify a page, drop posts any worker already stored, hydrate the matches and store them.
  async function ingest(posts, sub, via, cur) {
    const candidates = posts.filter(isImageCandidate);
    cur.images += candidates.length;
    if (!candidates.length) return 0;
    const known = await repo.knownPosts(candidates.map((p) => p.id));
    const pending = new Map();
    const tentative = [];
    for (const post of candidates) {
      if (known.has(post.id)) continue;
      const match = classifyPost(post, bySubreddit.get(sub), { isFull: (p) => count(p) + (pending.get(p) || 0) >= per });
      if (!match) continue;
      pending.set(match.horizontal.path, (pending.get(match.horizontal.path) || 0) + 1);
      tentative.push({ post, match });
    }
    if (!tentative.length) return 0;
    const hydrated = new Map((await client.postsByIds(tentative.map((t) => t.post.id))).map((p) => [p.id, p]));
    const records = [];
    for (const { post, match } of tentative) {
      const full = hydrated.get(post.id);
      const images = full ? extractImages(full) : [];
      if (images.length) records.push(toRecord({ ...post, ...full }, images, match, via));
    }
    const stored = await repo.ingest(records, per, worker);
    for (const p of stored) counts.set(p, count(p) + 1);
    // Rejected records mean another worker filled those paths first: refresh counts soon.
    if (stored.length < records.length) countsAt = 0;
    return stored.length;
  }

  async function runTask(task) {
    const sub = task.subreddit;
    const keyword = task.kind === "search";
    let stillNeeded;
    if (keyword) {
      const m = stepByPath.get(task.step_path);
      if (!m) return repo.release(task, { status: "done", error: "step no longer in the topic tree" });
      stillNeeded = () => (task.horizontal_path ? !isFull(task.horizontal_path) : !stepFull(m));
      // A scan that saw no images in 3+ pages means there are none to search for.
      const scan = await repo.scanTask(sub);
      if (scan && scan.pages >= 3 && !scan.images) return repo.release(task, { status: "done" });
    } else {
      const matchers = bySubreddit.get(sub) || [];
      stillNeeded = () => !matchers.every(stepFull);
    }
    if (!stillNeeded()) return repo.release(task, { status: "done" });

    const cur = { before: task.cursor_before ? new Date(task.cursor_before).toISOString() : null, pages: task.pages, images: task.images, added: task.added };
    const via = keyword ? `search:${task.params.title || task.params.link_flair_text}` : "scan";
    let pages = 0;
    let dry = 0;
    let addedHere = 0;
    let done = false;
    try {
      while (!done && pages < (keyword ? searchPages : slicePages) && dry < dryPages && stillNeeded()) {
        // Keyword queries are heavy for the archive: retry them less and give up sooner.
        const posts = await client.searchPosts({ subreddit: sub, after: floorIso, before: cur.before || undefined, ...task.params }, keyword ? { maxRetries: 2 } : undefined);
        const added = posts.length ? await ingest(posts, sub, via, cur) : 0;
        pages += 1;
        cur.pages += 1;
        cur.added += added;
        addedHere += added;
        summary.pages += 1;
        summary.added += added;
        dry = added ? 0 : dry + 1;
        if (posts.length) {
          const oldest = Math.min(...posts.map((p) => p.created_utc));
          cur.before = isoFromEpoch(oldest);
          if (posts.length < PAGE || oldest <= floorSec) done = true;
        } else done = true;
        if (!(await repo.checkpoint(task, cur))) {
          log(`${task.key}: lease expired and was taken over — moving on`);
          return;
        }
      }
    } catch (error) {
      if (error instanceof BudgetExhausted) {
        await repo.release(task, { status: "queued", lastAdded: addedHere });
        throw error;
      }
      summary.errors += 1;
      const message = error.message.slice(0, 160);
      log(`${task.key}: ${message}`);
      // Failed pages are retried later; a keyword query that fails twice blocks keyword search on that subreddit.
      if (keyword && task.attempts >= 1) {
        await repo.release(task, { status: "blocked", lastAdded: addedHere, error: message });
        await repo.blockSearches(sub, message);
      } else await repo.release(task, { status: "queued", lastAdded: addedHere, error: message, delayMs: (keyword ? 30 : 10) * 60000 });
      return;
    }
    await repo.release(task, { status: done || !stillNeeded() ? "done" : "queued", lastAdded: addedHere });
    if (addedHere) log(`${task.key}: +${addedHere} (${pages} pages)`);
  }

  await beat("running");
  try {
    while (!signal?.aborted) {
      if (now() - countsAt > countsTtlMs) {
        counts = await repo.counts();
        countsAt = now();
      }
      const task = await repo.claim(worker);
      if (!task) {
        const queue = await repo.queue();
        if (!queue.queued && !queue.leased && !queue.expired) {
          summary.stoppedBy = "queue finished";
          break;
        }
        log(`nothing ready (${queue.leased} leased by other workers, ${queue.queued} waiting) — checking again in ${Math.round(idleMs / 1000)}s`);
        await beat("idle");
        await sleep(idleMs, signal);
        continue;
      }
      await beat("running", task.key);
      await runTask(task);
      summary.tasks += 1;
      if (summary.tasks % 10 === 0) log(`${summary.tasks} tasks, ${summary.pages} pages, +${summary.added} images, ${client.stats.requests} requests, ${client.stats.waits} rate-limit waits`);
    }
  } catch (error) {
    if (!(error instanceof BudgetExhausted)) throw error;
    summary.stoppedBy = error.message;
  }
  if (!summary.stoppedBy && signal?.aborted) summary.stoppedBy = "aborted";
  await beat("stopped");
  return summary;
}
