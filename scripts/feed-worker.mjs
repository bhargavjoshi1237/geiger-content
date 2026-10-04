// Fleet crawler worker. `npm run feed:fleet -- build` bundles it into one file (data/feed-fleet/feed-worker.mjs)
// with the queue's connection and a public proxy list baked in: copy that to any machine with Node 18+ and run `node feed-worker.mjs`.
// Arctic Shift rate-limits per IP, so besides the machine's own IP it runs up to --max-proxies crawl slots, each through
// a random working proxy from the list (dead proxies are swapped out automatically).
// Flags: --name <id> --pool main|personal,edgy --phase all|scan|search --max-proxies 15 (0 = direct only) --no-direct --max-minutes M
//        --max-requests N (per slot) --interval-ms 1200 --slice-pages 20 --search-pages 6 --dry-pages 12
// Ctrl-C finishes the current requests and hands the tasks back to the queue.
import crypto from "node:crypto";
import os from "node:os";
import pg from "pg";
import { createArcticClient } from "../lib/feed/crawl/arctic.mjs";
import { createFleetRepo, runWorker } from "../lib/feed/crawl/fleet.mjs";
import { createProxiedFetch, createProxyPool } from "../lib/feed/crawl/proxies.mjs";
import { loadTaxonomy } from "../lib/feed/taxonomy/index.mjs";

const VERSION = "fleet-3";
/* global __FEED_DB_URL__, __FEED_PROXIES__ */
const EMBEDDED_DB_URL = typeof __FEED_DB_URL__ === "string" ? __FEED_DB_URL__ : "";
const EMBEDDED_PROXIES = typeof __FEED_PROXIES__ !== "undefined" && Array.isArray(__FEED_PROXIES__) ? __FEED_PROXIES__ : [];

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

const maxProxies = Math.max(0, num("max-proxies", 15));
const direct = !args.includes("--no-direct");
const slots = [...(direct ? [null] : []), ...Array.from({ length: maxProxies }, (_, i) => i + 1)];
if (!slots.length) {
  console.error("Nothing to run: --no-direct with --max-proxies 0.");
  process.exit(1);
}

// Aiven serves TLS from its own CA; like the app's vector connection, encrypt without pinning that CA.
function poolOptions(raw) {
  const url = new URL(raw);
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  url.searchParams.delete("sslmode");
  return { connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: false }, max: Math.min(2 + Math.ceil(slots.length / 3), 8), connectionTimeoutMillis: 15000, statement_timeout: 60000, keepAlive: true };
}

const base = flag("name", `${os.hostname()}-${crypto.randomBytes(2).toString("hex")}`).slice(0, 52);
const crawlPool = flag("pool", "main");
const phase = flag("phase", "all");
if (!["all", "scan", "search"].includes(phase)) {
  console.error(`Invalid crawl phase "${phase}". Use all, scan or search.`);
  process.exit(1);
}
const db = new pg.Pool(poolOptions(dbUrl));
db.on("error", (error) => log(`database connection dropped (${error.message}) — reconnecting`));
const repo = createFleetRepo(db);

const controller = new AbortController();
const stop = () => { log("stopping — handing the current tasks back"); controller.abort(); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

const maxMinutes = num("max-minutes", Infinity);
const deadline = Number.isFinite(maxMinutes) ? Date.now() + maxMinutes * 60000 : Infinity;
const proxies = maxProxies ? createProxyPool({ embedded: EMBEDDED_PROXIES, spares: 3, signal: controller.signal, log }) : null;
const topics = loadTaxonomy();

// One crawl slot: its own Arctic client (own throttle + exit IP) leasing tasks from the shared queue.
async function runSlot(slot) {
  const worker = slot === null ? base : `${base}-p${slot}`;
  const proxied = slot === null ? null : createProxiedFetch({ pool: proxies, name: worker, signal: controller.signal, log });
  const client = createArcticClient({
    ...(proxied ? { fetchImpl: proxied.fetchImpl } : {}),
    minIntervalMs: num("interval-ms", 1200),
    maxRequests: num("max-requests", Infinity),
    deadline,
    signal: controller.signal,
    onWait: (event) => log(`${worker}: rate limited (${event.status || "network"} ${event.message || ""}) — waiting ${Math.round(event.waitMs / 1000)}s`),
  });
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
        pool: crawlPool,
        phase,
        slicePages: num("slice-pages", 20),
        searchPages: num("search-pages", 6),
        dryPages: num("dry-pages", 12),
        signal: controller.signal,
        log: (message) => log(`${worker}: ${message}`),
      });
      break;
    } catch (error) {
      log(`${worker}: worker error: ${error.message} — restarting in ${Math.round(backoff / 1000)}s`);
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, backoff);
        controller.signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
      });
      backoff = Math.min(backoff * 2, 300000);
    }
  }
  if (summary) log(`${worker}: done (${summary.stoppedBy || "finished"}): ${summary.tasks} tasks, ${summary.pages} pages, +${summary.added} images, ${client.stats.requests} requests, ${client.stats.waits} rate-limit waits`);
  // The time budget ends every slot; the queue finishing ends them all.
  if (summary?.stoppedBy === "queue finished" || Date.now() >= deadline) controller.abort();
}

log(`worker ${base} (${VERSION}) starting on the ${crawlPool} pool (${phase}): ${direct ? "direct + " : ""}${maxProxies} proxy slots (${EMBEDDED_PROXIES.length} embedded proxies)`);
const timer = proxies ? setInterval(() => log(`proxies: ${proxies.stats.working} working of ${proxies.stats.probed} probed, ${proxies.stats.retired} retired`), 10 * 60000) : null;
await Promise.all(slots.map(runSlot));
clearInterval(timer);
await db.end();
process.exit(0);
