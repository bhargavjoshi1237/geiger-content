import test from "node:test";
import assert from "node:assert/strict";
import { MAX_FAILURES, planTasks, runWorker, withLocalProgress } from "../lib/feed/crawl/fleet.mjs";
import { loadTaxonomy } from "../lib/feed/taxonomy/index.mjs";
import { parseTaxonomy } from "../lib/feed/taxonomy/parse.mjs";

// In-memory stand-in for createFleetRepo with the same lease / cap / dedupe rules as the SQL.
function memoryRepo(tasks) {
  const rows = tasks.map((t, i) => ({
    id: `t${i}`, key: t.key, pool: t.pool || "main", kind: t.kind, subreddit: t.subreddit, params: t.params, step_path: t.stepPath, horizontal_path: t.horizontalPath,
    priority: t.priority, round: t.round || 0, status: t.status || "queued", cursor_before: t.cursorBefore || null, pages: t.pages || 0, images: t.images || 0,
    added: 0, last_added: 0, attempts: 0, lease_token: null, available_at: 0, error: null, walkers: 0,
  }));
  const images = new Map();
  const urls = new Set();
  const counts = new Map();
  let token = 0;
  let clock = 0;
  return {
    rows, images, countMap: counts,
    async seedTasks() { return 0; },
    async counts() { return new Map(counts); },
    async knownPosts(ids) { return new Set(ids.filter((id) => images.has(id))); },
    async ingest(records, per, worker) {
      const stored = [];
      for (const r of [...records].sort((a, b) => a.path.localeCompare(b.path))) {
        if ((counts.get(r.path) || 0) >= per || images.has(r.id) || urls.has(r.image.url)) continue;
        images.set(r.id, { ...r, worker });
        urls.add(r.image.url);
        counts.set(r.path, (counts.get(r.path) || 0) + 1);
        stored.push(r.path);
      }
      return stored;
    },
    async claim(worker, pool = "main") {
      const ready = rows
        .filter((r) => r.pool === pool && r.status === "queued" && r.available_at <= clock)
        .sort((a, b) => a.round - b.round || a.kind.localeCompare(b.kind) || b.last_added - a.last_added || a.priority - b.priority);
      const task = ready[0];
      if (!task) return null;
      Object.assign(task, { status: "leased", lease_token: ++token, worker });
      task.walkers += 1;
      return { ...task };
    },
    async checkpoint(task, cur) {
      const row = rows.find((r) => r.id === task.id);
      if (row.lease_token !== task.lease_token) return false;
      Object.assign(row, { cursor_before: cur.before, pages: cur.pages, images: cur.images, added: cur.added });
      return true;
    },
    async release(task, { status, lastAdded = 0, error = null, delayMs = 0 }) {
      const row = rows.find((r) => r.id === task.id);
      if (row.lease_token !== task.lease_token) return;
      const failed = error && row.attempts + 1 >= MAX_FAILURES;
      Object.assign(row, { status: failed ? "failed" : status, attempts: error ? row.attempts + 1 : 0, last_added: lastAdded, error, round: row.round + 1, available_at: clock + delayMs, lease_token: null, worker: null });
      row.walkers -= 1;
    },
    async blockSearches(subreddit, error, pool = "main") {
      for (const r of rows) if (r.subreddit === subreddit && r.pool === pool && r.kind === "search" && r.status === "queued") Object.assign(r, { status: "blocked", error });
    },
    async scanTask(subreddit, pool = "main") { return rows.find((r) => r.key === `${pool === "main" ? "" : `${pool}:`}scan:${subreddit}`) || null; },
    // An idle worker polls the queue about once a minute: let an hour pass per poll so delayed retries come due.
    async queue(pool = "main") {
      clock += 3600000;
      const mine = rows.filter((r) => r.pool === pool);
      return {
        queued: mine.filter((r) => r.status === "queued").length,
        ready: mine.filter((r) => r.status === "queued" && r.available_at <= clock).length,
        leased: mine.filter((r) => r.status === "leased").length,
        expired: 0,
      };
    },
    async heartbeat() {},
  };
}

const demoTopic = () => {
  const [topic] = parseTaxonomy(`
# Demo {demo} > demo2 @demosub @othersub
## Sub @demosub
- Loops @!demosub ~ loop
  Budget: budget | Fancy: fancy | Fails: leak | First: first | Done: flair=done
- Two @othersub ~ two
  A: a1 | B: b1 | C: c1 | D: d1 | E: e1
- Three @othersub ~ three
  A: a1 | B: b1 | C: c1 | D: d1 | E: e1
- Four @othersub ~ four
  A: a1 | B: b1 | C: c1 | D: d1 | E: e1
`);
  for (const s of topic.subtopics) for (const st of s.steps) { st.path = `demo/${s.id}/${st.id}`; for (const h of st.horizontals) h.path = `${st.path}/${h.id}`; }
  return topic;
};

// Fake archive: `pages` pages of image posts per subreddit, newest first, paged by `before`.
function fakeArchive({ pages = 3, perPage = 100, fail = () => false } = {}) {
  const start = Math.floor(Date.parse("2026-09-01") / 1000);
  const titles = ["budget loop", "fancy loop", "loop leak", "first loop", "two a1", "two b1", "three c1", "four d1"];
  const all = new Map();
  const postsFor = (sub) => {
    if (!all.has(sub))
      all.set(sub, Array.from({ length: pages * perPage }, (_, i) => ({
        id: `${sub}-${i}`, subreddit: sub, author: "u", title: titles[i % titles.length], created_utc: start - i * 60, url: `https://i.redd.it/${sub}-${i}.jpg`,
      })));
    return all.get(sub);
  };
  const calls = [];
  const client = {
    stats: { requests: 0, waits: 0, waitedMs: 0 },
    async searchPosts(params) {
      client.stats.requests += 1;
      calls.push(params);
      if (fail(params)) throw new Error("/api/posts/search 422: Timeout. Maybe slow down a bit");
      const before = params.before ? Date.parse(params.before) / 1000 : Infinity;
      return postsFor(params.subreddit).filter((p) => p.created_utc < before && (!params.title || p.title.includes(params.title))).slice(0, perPage);
    },
    async postsByIds(ids) {
      return ids.map((id) => ({ id, url: `https://i.redd.it/${id}.jpg`, post_hint: "image", preview: { images: [{ source: { url: `https://i.redd.it/${id}.jpg`, width: 800, height: 600 }, resolutions: [] }] } }));
    },
  };
  return { client, calls };
}

test("planTasks queues one scan per usable subreddit and keyword searches per step", () => {
  const topics = loadTaxonomy();
  const graph = { subreddits: { buildapc: { exists: true, imagePosts: true, subscribers: 9000000 }, watercooling: { exists: true, imagePosts: false } } };
  const tasks = planTasks(topics, graph);
  const keys = tasks.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length, "task keys are unique");
  assert.ok(keys.includes("scan:buildapc"));
  assert.ok(!keys.includes("scan:watercooling"), "text-only subreddits are not queued");
  assert.ok(!tasks.some((t) => t.kind === "search" && t.subreddit === "buildapc"), "huge subreddits get no keyword search");
  assert.ok(tasks.some((t) => t.kind === "search" && t.params.title));
  assert.ok(tasks.every((t) => t.topicId && Number.isInteger(t.priority)));
});

test("local crawl progress carries over into the seeded queue", () => {
  const tasks = planTasks([demoTopic()], null);
  const seeded = withLocalProgress(tasks, {
    cursors: { "scan:demosub": { before: "2026-05-01T00:00:00.000Z", pages: 7, images: 300, done: false }, "scan:othersub": { pages: 40, done: true } },
    searchBlocked: { othersub: "timeout" },
  });
  const demo = seeded.find((t) => t.key === "scan:demosub");
  assert.deepEqual([demo.status, demo.cursorBefore, demo.pages, demo.round], ["queued", "2026-05-01T00:00:00.000Z", 7, 0]);
  assert.equal(seeded.find((t) => t.key === "scan:othersub").status, "done");
  assert.ok(seeded.filter((t) => t.kind === "search").every((t) => t.round === 1), "searches wait a round behind scans");
  assert.ok(seeded.filter((t) => t.kind === "search" && t.subreddit === "othersub").every((t) => t.status === "blocked"));
});

test("two workers share the queue without walking a task twice or storing an image twice", async () => {
  const topics = [demoTopic()];
  const repo = memoryRepo(planTasks(topics, null));
  const { client: a } = fakeArchive();
  const { client: b } = fakeArchive();
  let maxWalkers = 0;
  const watch = (client) => ({ ...client, stats: client.stats, searchPosts: async (p) => { maxWalkers = Math.max(maxWalkers, ...repo.rows.map((r) => r.walkers)); return client.searchPosts(p); } });
  const [ra, rb] = await Promise.all([
    runWorker({ client: watch(a), repo, topics, worker: "a", per: 3, idleMs: 1 }),
    runWorker({ client: watch(b), repo, topics, worker: "b", per: 3, idleMs: 1 }),
  ]);
  assert.equal(maxWalkers, 1, "a task is never leased to two workers at once");
  assert.equal(ra.stoppedBy, "queue finished");
  assert.equal(rb.stoppedBy, "queue finished");
  assert.equal(ra.added + rb.added, repo.images.size, "every reported image was stored exactly once");
  assert.ok([...repo.countMap.values()].every((n) => n <= 3), "per-horizontal cap holds across workers");
  assert.ok(repo.rows.every((r) => r.status !== "leased"), "every lease was handed back");
  assert.equal(repo.countMap.get("demo/sub/loops/budget"), 3);
});

test("a failing keyword search blocks searches on that subreddit; a failing scan is retried later", async () => {
  const topics = [demoTopic()];
  const repo = memoryRepo(planTasks(topics, null));
  const { client } = fakeArchive({ fail: (p) => p.subreddit === "othersub" });
  const result = await runWorker({ client, repo, topics, worker: "a", per: 3, idleMs: 1 });
  const scan = repo.rows.find((r) => r.key === "scan:othersub");
  assert.equal(scan.status, "failed", "a scan page is retried until it has failed MAX_FAILURES times");
  assert.equal(scan.attempts, MAX_FAILURES);
  const searches = repo.rows.filter((r) => r.kind === "search" && r.subreddit === "othersub");
  assert.equal(searches.filter((r) => r.attempts === 2).length, 1, "one keyword query is retried once before blocking");
  assert.ok(searches.every((r) => ["blocked", "done"].includes(r.status)));
  assert.equal(result.stoppedBy, "queue finished");
});

test("pools keep their own walks of a shared subreddit and a worker only leases its pool", async () => {
  const main = demoTopic();
  const [personal] = parseTaxonomy(`
# Mine {mine} > demo @demosub
## Sub @demosub
- Loops @demosub ~ loop
  Budget: budget | Fancy: fancy | Fails: leak | First: first | Done: flair=done
- Two @demosub ~ two
  A: a1 | B: b1 | C: c1 | D: d1 | E: e1
- Three @demosub ~ three
  A: a1 | B: b1 | C: c1 | D: d1 | E: e1
- Four @demosub ~ four
  A: a1 | B: b1 | C: c1 | D: d1 | E: e1
`);
  for (const s of personal.subtopics) for (const st of s.steps) { st.path = `mine/${s.id}/${st.id}`; for (const h of st.horizontals) h.path = `${st.path}/${h.id}`; }
  const topics = [main, { ...personal, pool: "personal" }];
  const tasks = planTasks(topics, null);
  assert.ok(tasks.some((t) => t.key === "scan:demosub" && t.pool === "main"));
  assert.ok(tasks.some((t) => t.key === "personal:scan:demosub" && t.pool === "personal"));
  const repo = memoryRepo(tasks);
  const { client } = fakeArchive();
  const result = await runWorker({ client, repo, topics, worker: "p", pool: "personal", per: 3, idleMs: 1 });
  assert.equal(result.stoppedBy, "queue finished");
  assert.ok(repo.rows.filter((r) => r.pool === "main").every((r) => r.status === "queued" && r.pages === 0), "main pool untouched");
  assert.ok(repo.rows.filter((r) => r.pool === "personal").every((r) => r.status !== "queued"));
  assert.ok([...repo.images.values()].some((r) => r.topicId === "mine"));
});
