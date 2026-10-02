// Fleet crawler worker. `npm run feed:fleet -- build` bundles it into one file (data/feed-fleet/feed-worker.mjs)
// with the queue's connection baked in: copy that to any machine with Node 18+ and run `node feed-worker.mjs`.
// Run one worker per IP address — Arctic Shift rate-limits per IP, so a second worker on the same IP adds nothing.
// Flags: --name <id> --max-minutes M --max-requests N --interval-ms 1200 --slice-pages 20 --search-pages 6 --dry-pages 12
// Ctrl-C finishes the current request and hands the task back to the queue.
import crypto from "node:crypto";
import os from "node:os";
import pg from "pg";
import { createArcticClient } from "../lib/feed/crawl/arctic.mjs";
import { createFleetRepo, runWorker } from "../lib/feed/crawl/fleet.mjs";
import { loadTaxonomy } from "../lib/feed/taxonomy/index.mjs";

const VERSION = "fleet-1";
/* global __FEED_DB_URL__ */
const EMBEDDED_DB_URL = typeof __FEED_DB_URL__ === "string" ? __FEED_DB_URL__ : "";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const num = (name, fallback) => (flag(name) === undefined ? fallback : Number(flag(name)));
const log = (message) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);

const dbUrl = flag("db") || process.env.FEED_DB_URL || process.env.FEED_WORKER_DATABASE_URL || EMBEDDED_DB_URL;
if (!dbUrl) {
  console.error("No queue database configured. Use the built data/feed-fleet/feed-worker.mjs, or pass --db / FEED_DB_URL.");
  process.exit(1);
}
if (Number(process.versions.node.split(".")[0]) < 18) {
  console.error(`Node 18 or newer is required (found ${process.versions.node}).`);
  process.exit(1);
}

// Aiven serves TLS from its own CA; like the app's vector connection, encrypt without pinning that CA.
function poolOptions(raw) {
  const url = new URL(raw);
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  url.searchParams.delete("sslmode");
  return { connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: false }, max: 2, connectionTimeoutMillis: 15000, statement_timeout: 60000, keepAlive: true };
}

const worker = flag("name", `${os.hostname()}-${crypto.randomBytes(2).toString("hex")}`).slice(0, 60);
const pool = new pg.Pool(poolOptions(dbUrl));
pool.on("error", (error) => log(`database connection dropped (${error.message}) — reconnecting`));
const repo = createFleetRepo(pool);

const controller = new AbortController();
const stop = () => { log("stopping — handing the current task back"); controller.abort(); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

const maxMinutes = num("max-minutes", Infinity);
const client = createArcticClient({
  minIntervalMs: num("interval-ms", 1200),
  maxRequests: num("max-requests", Infinity),
  deadline: Number.isFinite(maxMinutes) ? Date.now() + maxMinutes * 60000 : Infinity,
  signal: controller.signal,
  onWait: (event) => log(`rate limited (${event.status || "network"} ${event.message || ""}) — waiting ${Math.round(event.waitMs / 1000)}s`),
});

log(`worker ${worker} (${VERSION}) starting`);
const topics = loadTaxonomy();
let backoff = 30000;
let summary = null;
// Database/network failures restart the loop after a pause; an abandoned lease is reclaimed by the queue.
while (!controller.signal.aborted) {
  try {
    summary = await runWorker({
      client,
      repo,
      topics,
      worker,
      host: os.hostname(),
      version: VERSION,
      slicePages: num("slice-pages", 20),
      searchPages: num("search-pages", 6),
      dryPages: num("dry-pages", 12),
      signal: controller.signal,
      log,
    });
    break;
  } catch (error) {
    log(`worker error: ${error.message} — restarting in ${Math.round(backoff / 1000)}s`);
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, backoff);
      controller.signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
    });
    backoff = Math.min(backoff * 2, 300000);
  }
}
if (summary) log(`done (${summary.stoppedBy || "finished"}): ${summary.tasks} tasks, ${summary.pages} pages, +${summary.added} images, ${client.stats.requests} requests, ${client.stats.waits} rate-limit waits`);
await pool.end();
