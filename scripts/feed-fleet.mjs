// Fleet coordinator (runs on this machine, as the Aiven admin). Apply the queue tables first: `npm run vector:db:push`.
//   node scripts/feed-fleet.mjs seed     # queue every crawl task + upload the local corpus/cursors (idempotent)
//   node scripts/feed-fleet.mjs build    # worker login + one-file worker at data/feed-fleet/feed-worker.mjs
//   node scripts/feed-fleet.mjs status   # images, queue progress, live workers
//   node scripts/feed-fleet.mjs pull     # copy fleet-collected images into the local manifest (for Feed Lab / simulator)
//   node scripts/feed-fleet.mjs requeue  # retry blocked/failed tasks
//   node scripts/feed-fleet.mjs work --pool personal,edgy [--max-minutes M]  # crawl pools from this machine
import crypto from "node:crypto";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import pg from "pg";
import { createArcticClient } from "../lib/feed/crawl/arctic.mjs";
import { createFleetRepo, planTasks, runWorker, withLocalProgress } from "../lib/feed/crawl/fleet.mjs";
import { DEFAULT_CORPUS_DIR, openStore, readManifest } from "../lib/feed/crawl/store.mjs";
import { flattenHorizontals, loadTaxonomy } from "../lib/feed/taxonomy/index.mjs";
import { connectionOptions } from "../lib/vector/connection.mjs";

nextEnv.loadEnvConfig(process.cwd());
const command = process.argv[2] || "status";
const args = process.argv.slice(3);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const PER = 25;
const FLEET_DIR = path.join(process.cwd(), "data", "feed-fleet");
const log = (message) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);

const pool = new pg.Pool(connectionOptions());
pool.on("error", () => {});
const repo = createFleetRepo(pool);

async function seed() {
  const taxonomy = loadTaxonomy();
  const store = openStore(DEFAULT_CORPUS_DIR);
  const tasks = withLocalProgress(planTasks(taxonomy, store.readJson("graph.json", null)), store.state);
  const inserted = await repo.seedTasks(tasks);
  log(`queue: ${inserted} new tasks (${tasks.length} planned; ${tasks.filter((t) => t.kind === "scan").length} scans, ${tasks.filter((t) => t.kind === "search").length} searches)`);
  let batch = [];
  let stored = 0;
  const flush = async () => { stored += (await repo.ingest(batch, PER, "local")).length; batch = []; };
  for (const record of readManifest(DEFAULT_CORPUS_DIR)) {
    batch.push(record);
    if (batch.length === 500) await flush();
  }
  if (batch.length) await flush();
  log(`images: uploaded ${stored} local records not already in the queue database`);
}

// Gives the least-privilege feed_worker role a password (once, kept in .env.local) and bundles the worker.
async function build() {
  let workerUrl = process.env.FEED_WORKER_DATABASE_URL;
  if (!workerUrl) {
    const password = crypto.randomBytes(24).toString("base64url");
    await pool.query(`alter role feed_worker with login password '${password}'`);
    const url = new URL(process.env.VECTOR_DATABASE_URL);
    url.username = "feed_worker";
    url.password = password;
    url.searchParams.set("sslmode", "require");
    workerUrl = url.toString();
    fs.appendFileSync(path.join(process.cwd(), ".env.local"), `\nFEED_WORKER_DATABASE_URL=${workerUrl}\n`);
    log("created the feed_worker login (saved as FEED_WORKER_DATABASE_URL in .env.local)");
  }
  const check = new pg.Pool({ ...connectionOptions({ VECTOR_DATABASE_URL: workerUrl }), max: 1 });
  try {
    const { rows } = await check.query("select count(*)::int as n from content.feed_crawl_tasks");
    log(`worker login ok — sees ${rows[0].n} tasks`);
  } finally {
    await check.end();
  }
  const esbuild = await import("esbuild");
  fs.mkdirSync(FLEET_DIR, { recursive: true });
  const outfile = path.join(FLEET_DIR, "feed-worker.mjs");
  await esbuild.build({
    entryPoints: [path.join(process.cwd(), "scripts", "feed-worker.mjs")],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    external: ["pg-native"],
    define: { __FEED_DB_URL__: JSON.stringify(workerUrl) },
    // pg is CommonJS: give the ESM bundle a real require() for Node built-ins.
    banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
    legalComments: "none",
    logLevel: "warning",
  });
  log(`built ${path.relative(process.cwd(), outfile)} (${Math.round(fs.statSync(outfile).size / 1024)} KB) — copy it to each machine and run: node feed-worker.mjs`);
  log("it contains the feed_worker password (crawl tables only) — don't commit or post it publicly");
}

async function status() {
  const taxonomy = loadTaxonomy();
  const rows = flattenHorizontals(taxonomy);
  const target = rows.length;
  const capByPath = new Map(rows.map((r) => [r.horizontal.path, r.topic.cap || PER]));
  const targetImages = rows.reduce((sum, r) => sum + (r.topic.cap || PER), 0);
  const pools = [...new Set(taxonomy.map((t) => t.pool))];
  const [{ rows: [images] }, { rows: tasks }, { rows: workers }, { rows: counts }] = await Promise.all([
    pool.query(`select count(*)::int as total,
                       count(*) filter (where created_at > now() - interval '1 hour')::int as last_hour,
                       count(*) filter (where worker <> 'local')::int as fleet
                from content.feed_crawl_images where deleted_at is null`),
    pool.query("select pool, kind, status, count(*)::int as n from content.feed_crawl_tasks where deleted_at is null group by 1, 2, 3 order by 1, 2, 3"),
    pool.query(`select name, status, current_task, requests, waits, waited_seconds, added, started_at, last_seen,
                       last_seen > now() - interval '3 minutes' as live
                from content.feed_crawl_workers where deleted_at is null order by last_seen desc limit 50`),
    pool.query("select path, n from content.feed_crawl_counts where deleted_at is null"),
  ]);
  const full = counts.filter((c) => capByPath.has(c.path) && c.n >= capByPath.get(c.path)).length;
  console.log(`Images: ${images.total.toLocaleString()} / ${targetImages.toLocaleString()} (${images.fleet.toLocaleString()} from the fleet, ${images.last_hour.toLocaleString()} in the last hour)`);
  console.log(`Horizontals at target: ${full.toLocaleString()} / ${target.toLocaleString()}`);
  const { rows: byTopic } = await pool.query("select topic_id, count(*)::int as n from content.feed_crawl_images where deleted_at is null group by 1");
  const topicImages = new Map(byTopic.map((r) => [r.topic_id, r.n]));
  for (const name of pools) {
    const topics = taxonomy.filter((t) => t.pool === name);
    const have = topics.reduce((sum, t) => sum + (topicImages.get(t.id) || 0), 0);
    const cap = topics[0]?.cap || PER;
    console.log(`\n[${name}] ${have.toLocaleString()} / ${(flattenHorizontals(topics).length * cap).toLocaleString()} images across ${topics.length} topics (${cap} per horizontal)`);
    console.log(`  tasks: ${tasks.filter((t) => t.pool === name).map((t) => `${t.kind} ${t.status} ${t.n}`).join(" · ") || "none queued yet"}`);
    if (name !== "main") console.log(`  ${topics.map((t) => `${t.id} ${topicImages.get(t.id) || 0}`).join(" · ")}`);
  }
  console.log("");
  const live = workers.filter((w) => w.live);
  console.log(`Workers: ${live.length} live of ${workers.length} seen`);
  for (const w of workers) {
    const hours = Math.max((new Date(w.last_seen) - new Date(w.started_at)) / 3600000, 1 / 60);
    console.log(`  ${w.live ? "●" : "○"} ${w.name.padEnd(28)} ${String(w.status).padEnd(8)} +${w.added} images (${Math.round(w.added / hours)}/h), ${w.requests} req, ${w.waits} waits${w.live && w.current_task ? ` — ${w.current_task}` : ""}`);
  }
}

// Appends every fleet image the local manifest doesn't have yet as a new manifest part.
async function pull() {
  const store = openStore(DEFAULT_CORPUS_DIR);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  const file = path.join(store.dir, "manifest", `part-fleet-${stamp}.jsonl`);
  let after = "00000000-0000-0000-0000-000000000000";
  let written = 0;
  for (;;) {
    const { rows } = await pool.query("select id, record from content.feed_crawl_images where deleted_at is null and id > $1 order by id limit 5000", [after]);
    if (!rows.length) break;
    after = rows.at(-1).id;
    const fresh = rows.map((r) => r.record).filter((r) => !store.seenPosts.has(r.id));
    if (fresh.length) fs.appendFileSync(file, fresh.map((r) => JSON.stringify(r)).join("\n") + "\n");
    written += fresh.length;
  }
  log(written ? `pulled ${written} new images into ${path.relative(process.cwd(), file)}` : "local manifest is already up to date");
}

// Puts blocked/failed tasks back in the queue (e.g. after a rate-limit storm) and re-levels untouched rounds.
async function requeue() {
  const { rowCount: requeued } = await pool.query(
    "update content.feed_crawl_tasks set status = 'queued', error = null, attempts = 0, available_at = now(), updated_at = now() where status in ('blocked', 'failed') and deleted_at is null",
  );
  const { rowCount: leveled } = await pool.query(
    "update content.feed_crawl_tasks set round = case kind when 'scan' then 0 else 1 end, updated_at = now() where status = 'queued' and added = 0 and last_added = 0 and round <= 1",
  );
  log(`requeued ${requeued} blocked/failed tasks; re-leveled ${leveled} untouched tasks`);
}

// Runs a worker from this machine on one pool, over the admin connection (no worker login needed).
async function work() {
  const name = flag("pool", "main");
  const maxMinutes = Number(flag("max-minutes", Infinity));
  const controller = new AbortController();
  const stop = () => { log("stopping — handing the current task back"); controller.abort(); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  const client = createArcticClient({
    deadline: Number.isFinite(maxMinutes) ? Date.now() + maxMinutes * 60000 : Infinity,
    signal: controller.signal,
    onWait: (event) => log(`rate limited (${event.status || "network"} ${event.message || ""}) — waiting ${Math.round(event.waitMs / 1000)}s`),
  });
  const worker = flag("name", `${os.hostname()}-${name}`);
  log(`worker ${worker} crawling the ${name} pool`);
  const summary = await runWorker({ client, repo, topics: loadTaxonomy(), worker, host: os.hostname(), version: "fleet-local", pool: name, signal: controller.signal, log });
  log(`done (${summary.stoppedBy || "finished"}): ${summary.tasks} tasks, ${summary.pages} pages, +${summary.added} images, ${client.stats.requests} requests, ${client.stats.waits} rate-limit waits`);
}

const commands = { seed, build, status, pull, requeue, work };
try {
  if (!commands[command]) throw new Error(`Unknown command "${command}". Use seed, build, status, pull, requeue or work.`);
  await commands[command]();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
