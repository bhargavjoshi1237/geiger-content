// Feed corpus crawler CLI. Resumable: every run continues from data/feed-corpus/state.json.
//   node scripts/feed-crawl.mjs graph                      # subreddit metadata + topic bridges
//   node scripts/feed-crawl.mjs collect [--topics a,b] [--max-requests N] [--max-minutes M]
//   node scripts/feed-crawl.mjs report                     # coverage report (no network)
//   node scripts/feed-crawl.mjs plan                       # tree + budget summary (no network)
// Flags: --per 25 --floor 2025-01-01 --phase scan|search|all --scan-pages 20
//        --dedicated-pages 150 --search-pages 6 --dry-pages 12 --deep --interval-ms 1200 --dir data/feed-corpus
// Breadth first by default: a subreddit pauses after --dry-pages unproductive pages; --deep digs the long tail.
import { createArcticClient } from "../lib/feed/crawl/arctic.mjs";
import { buildReport, resolveFloor, runCollect, runGraph } from "../lib/feed/crawl/crawler.mjs";
import { DEFAULT_CORPUS_DIR, openStore } from "../lib/feed/crawl/store.mjs";
import { allSubreddits, flattenHorizontals, loadTaxonomy, validateTaxonomy } from "../lib/feed/taxonomy/index.mjs";

const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith("--") ? args[0] : "collect";
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const num = (name, fallback) => (flag(name) === undefined ? fallback : Number(flag(name)));

const taxonomy = loadTaxonomy();
const problems = validateTaxonomy(taxonomy);
if (problems.length) {
  console.error(`Topic tree is invalid:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
const wanted = flag("topics") ? new Set(flag("topics").split(",").map((s) => s.trim())) : null;
const topics = wanted ? taxonomy.filter((t) => wanted.has(t.id)) : taxonomy;
if (wanted && topics.length !== wanted.size) {
  const known = new Set(taxonomy.map((t) => t.id));
  console.error(`Unknown topic ids: ${[...wanted].filter((id) => !known.has(id)).join(", ")}`);
  process.exit(1);
}
const per = num("per", 25);
const store = openStore(flag("dir", DEFAULT_CORPUS_DIR));
const log = (message) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);

if (command === "plan") {
  const rows = flattenHorizontals(topics);
  console.log(JSON.stringify({
    topics: topics.length,
    subtopics: topics.length * 5,
    steps: topics.length * 20,
    horizontals: rows.length,
    targetImages: rows.length * per,
    subreddits: allSubreddits(topics).length,
    floor: resolveFloor(flag("floor")),
    collectedSoFar: store.total(),
  }, null, 2));
  process.exit(0);
}

if (command === "report") {
  const report = buildReport({ store, topics, per });
  console.log(`Collected ${report.collected} / ${report.target.images} images; ${report.horizontalsFull}/${report.target.horizontals} horizontals at target. See ${store.dir}/report.md`);
  process.exit(0);
}

const controller = new AbortController();
const stop = () => { log("stopping after the current request — state is saved"); controller.abort(); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

const maxMinutes = num("max-minutes", Infinity);
const client = createArcticClient({
  minIntervalMs: num("interval-ms", 1200),
  maxRequests: num("max-requests", Infinity),
  deadline: Number.isFinite(maxMinutes) ? Date.now() + maxMinutes * 60000 : Infinity,
  signal: controller.signal,
  onWait: (event) => {
    store.logWait(event);
    log(`rate limited (${event.status || "network"} ${event.message || ""}) — waiting ${Math.round(event.waitMs / 1000)}s, attempt ${event.attempt}`);
  },
});

try {
  if (command === "graph") {
    const result = await runGraph({ client, store, topics, log });
    log(`graph: ${JSON.stringify(result)}`);
  } else if (command === "collect") {
    const phase = flag("phase", "all");
    const result = await runCollect({
      client,
      store,
      topics,
      per,
      floor: flag("floor"),
      scanPages: num("scan-pages", 20),
      dedicatedPages: num("dedicated-pages", 150),
      searchPages: num("search-pages", 6),
      dryPages: num("dry-pages", 12),
      deep: args.includes("--deep"),
      phases: phase === "all" ? ["scan", "search"] : [phase],
      log,
    });
    log(`collect: ${JSON.stringify({ ...result, errors: result.errors.length })}`);
    const report = buildReport({ store, topics: taxonomy, per });
    log(`corpus: ${report.collected} images, ${report.horizontalsFull}/${report.target.horizontals} horizontals at target`);
    if (result.stoppedBy) log(`stopped early (${result.stoppedBy}) — run the same command again to resume`);
  } else {
    console.error(`Unknown command "${command}". Use plan, graph, collect or report.`);
    process.exitCode = 1;
  }
} finally {
  process.off("SIGINT", stop);
  process.off("SIGTERM", stop);
}
