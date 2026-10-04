// Feed embeddings coordinator (runs on this machine, as the Aiven admin). Apply migrations first: `npm run vector:db:push`.
//   node scripts/feed-embed.mjs build                 # feed_embedder login + data/feed-embed/feed_enrich.ipynb (embeddings + captions) for Kaggle
//   node scripts/feed-embed.mjs status                # embedded / failed / pending, thinnest topics
//   node scripts/feed-embed.mjs similar <postId>      # images most like one image
//   node scripts/feed-embed.mjs search "custom loop"  # text → image (NOMIC_API_KEY or local @huggingface/transformers)
//   node scripts/feed-embed.mjs simulate [--persona id] [--batches 40] [--seed 11] [--all-items]
//       persona readers on the real catalog: topic tree only vs tree + pgvector taste neighbours
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import pg from "pg";
import { indexCatalog, buildTopicLinks } from "../lib/feed/engine.mjs";
import { createLiveFeed } from "../lib/feed/live.mjs";
import { PERSONAS, runSimulation, runSimulationAsync } from "../lib/feed/simulator.mjs";
import { similarCandidates, tasteQuery, tasteSearches } from "../lib/feed/taste.mjs";
import { loadTaxonomy } from "../lib/feed/taxonomy/index.mjs";
import { createFeedVectors } from "../lib/feed/vectors.mjs";
import { connectionOptions } from "../lib/vector/connection.mjs";

nextEnv.loadEnvConfig(process.cwd());
const command = process.argv[2] || "status";
const args = process.argv.slice(3);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const OUT_DIR = path.join(process.cwd(), "data", "feed-embed");
const log = (message) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);

const pool = new pg.Pool({ ...connectionOptions(), max: 4 });
pool.on("error", () => {});
const vectors = createFeedVectors(pool);

// Gives the feed_embedder role a password (once, kept in .env.local) and writes the Kaggle script with it baked in.
async function build() {
  let url = process.env.FEED_EMBED_DATABASE_URL;
  if (!url) {
    const password = crypto.randomBytes(24).toString("base64url");
    await pool.query(`alter role feed_embedder with login password '${password}'`);
    const u = new URL(process.env.VECTOR_DATABASE_URL);
    u.username = "feed_embedder";
    u.password = password;
    u.searchParams.set("sslmode", "require");
    url = u.toString();
    fs.appendFileSync(path.join(process.cwd(), ".env.local"), `\nFEED_EMBED_DATABASE_URL=${url}\n`);
    log("created the feed_embedder login (saved as FEED_EMBED_DATABASE_URL in .env.local)");
  }
  const check = new pg.Pool({ ...connectionOptions({ VECTOR_DATABASE_URL: url }), max: 1 });
  try {
    const { rows } = await check.query("select count(*)::int as n from content.feed_crawl_images");
    await check.query("select count(*) from content.feed_image_embeddings");
    log(`embedder login ok — sees ${rows[0].n.toLocaleString()} images`);
  } finally {
    await check.end();
  }
  const source = fs.readFileSync(path.join(process.cwd(), "scripts", "kaggle", "feed_enrich.py"), "utf8");
  const filled = source.replace(/^DB_URL = "".*$/m, `DB_URL = ${JSON.stringify(url)}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outfile = path.join(OUT_DIR, "feed_enrich.ipynb");
  fs.writeFileSync(outfile, JSON.stringify(toNotebook(filled), null, 1));
  log(`wrote ${path.relative(process.cwd(), outfile)} — Kaggle → New Notebook → File → Import Notebook, set GPU T4 x2 + Internet on, Run All`);
  log("it contains the feed_embedder password (read crawl images, write embeddings/captions only) — keep the notebook private");
  log("or paste the cells of scripts/kaggle/feed_enrich.py by hand and add the URL as the Kaggle secret FEED_EMBED_DATABASE_URL");
}

// "# %%" percent-format cells → a Jupyter notebook ("# %% [markdown]" cells become markdown).
function toNotebook(text) {
  const cells = text.split(/^# %%/m).filter((c) => c.trim()).map((chunk) => {
    const [head, ...rest] = chunk.split("\n");
    const markdown = head.includes("[markdown]");
    const body = rest.join("\n").trim().split("\n").map((line) => (markdown ? line.replace(/^# ?/, "") : line));
    const lines = body.map((line, i) => (i < body.length - 1 ? `${line}\n` : line));
    return markdown
      ? { cell_type: "markdown", metadata: {}, source: lines }
      : { cell_type: "code", metadata: {}, execution_count: null, outputs: [], source: lines };
  });
  return {
    cells,
    metadata: { kernelspec: { name: "python3", display_name: "Python 3", language: "python" }, language_info: { name: "python" }, kaggle: { accelerator: "nvidiaTeslaT4", isInternetEnabled: true, isGpuEnabled: true } },
    nbformat: 4,
    nbformat_minor: 4,
  };
}

async function status() {
  const s = await vectors.status();
  const pct = s.images ? ((100 * s.embedded) / s.images).toFixed(1) : "0";
  console.log(`Model: ${s.model}`);
  console.log(`Images: ${s.images.toLocaleString()} · embedded ${s.embedded.toLocaleString()} (${pct}%) · failed ${s.failed.toLocaleString()} · pending ${s.pending.toLocaleString()} · ${s.last_hour.toLocaleString()} in the last hour`);
  if (s.errors.length) console.log(`Top failures: ${s.errors.map((e) => `${e.error} ${e.n}`).join(" · ")}`);
  const covered = s.topics.filter((t) => t.embedded > 0).length;
  console.log(`Topics with embeddings: ${covered} / ${s.topics.length}`);
  console.log(`Thinnest: ${s.topics.slice(0, 8).map((t) => `${t.topic_id} ${t.embedded}/${t.images}`).join(" · ")}`);
  if (!s.captions.length) console.log("Captions: none yet");
  for (const c of s.captions)
    console.log(`Captions (${c.model}): ${c.done.toLocaleString()} done (${((100 * c.done) / Math.max(1, s.images)).toFixed(1)}%) · ${c.failed.toLocaleString()} failed · ${c.last_hour.toLocaleString()} in the last hour`);
  // Workers in the shared pool, by recent output.
  const { rows: workers } = await pool.query(
    `select worker, count(*)::int as n from content.feed_image_captions
     where status = 'done' and updated_at > now() - interval '15 minutes' group by 1 order by 2 desc`,
  );
  for (const w of workers) console.log(`  ● ${w.worker.padEnd(44)} ${(w.n / 900).toFixed(2)} captions/s`);
  if (workers.length) console.log(`  pool: ${(workers.reduce((a, w) => a + w.n, 0) / 900).toFixed(2)} captions/s`);
}

const live = () => createLiveFeed(vectors);
const show = (r) => console.log(`  ${r.similarity.toFixed(3)}  ${r.topicId}/${r.subtopicName} · ${r.horizontalName} — ${String(r.title).slice(0, 70)}  ${r.imageUrl}`);

async function similar() {
  const postId = args[0];
  if (!postId) throw new Error("Usage: similar <postId>");
  const out = await live().similar(postId, { limit: Number(flag("limit", 12)) });
  if (out.source) console.log(`Source: ${out.source.topicId}/${out.source.subtopicName} — ${out.source.title}\n  ${out.source.imageUrl}`);
  if (!out.results.length) console.log(out.reason || "No neighbours.");
  out.results.forEach(show);
}

async function search() {
  const text = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")).join(" ");
  const out = await live().search(text, { limit: Number(flag("limit", 12)) });
  console.log(`"${text}"`);
  out.results.forEach(show);
}

// Personas on the real catalog, with taste neighbours from pgvector (the same path the live feed uses).
async function simulate() {
  const items = await vectors.loadCatalog();
  const embedded = items.filter((i) => i.embedded);
  if (!embedded.length) throw new Error("No embedded images yet — run the Kaggle notebook first (see `build`).");
  const catalogItems = args.includes("--all-items") ? items : embedded;
  const topics = loadTaxonomy();
  const index = indexCatalog(catalogItems, { topicLinks: buildTopicLinks(topics) });
  const batches = Number(flag("batches", 40));
  const seed = Number(flag("seed", 11));
  const only = flag("persona");
  log(`catalog: ${index.byId.size.toLocaleString()} items (${embedded.length.toLocaleString()} embedded) · ${batches} batches × 10 · seed ${seed}`);
  const similarFor = async ({ taste, state, now }) => {
    const q = tasteQuery(taste, { now });
    if (!q.interests.length) return null;
    const lists = {};
    for (const [source, s] of Object.entries(tasteSearches(q))) lists[source] = await vectors.nearest(s.vector, { limit: s.limit, exclude: state.seen.slice(-500) });
    return { candidates: similarCandidates(lists, index.byId), readiness: q.readiness };
  };
  const rows = [];
  for (const persona of PERSONAS.filter((p) => !only || p.id === only)) {
    const tree = runSimulation({ persona, index, batches, seed }).metrics;
    const hybrid = (await runSimulationAsync({ persona, index, batches, seed, similarFor, embeddingsFor: (ids) => vectors.embeddingsFor(ids) })).metrics;
    rows.push({
      persona: persona.id,
      "engagement (tree → hybrid)": `${tree.engagementLate} → ${hybrid.engagementLate}`,
      "interest share": `${tree.interestShareLate} → ${hybrid.interestShareLate}`,
      circling: `${tree.circlingIndex} → ${hybrid.circlingIndex}`,
      "spacing breaks": `${tree.sameHorizontalBackToBack + tree.crowdedWindows} / ${hybrid.sameHorizontalBackToBack + hybrid.crowdedWindows}`,
      "similar accepted": `${hybrid.similar.accepted}/${hybrid.similar.shown}`,
    });
    log(`${persona.id} done`);
  }
  console.table(rows);
}

const commands = { build, status, similar, search, simulate };
try {
  if (!commands[command]) throw new Error(`Unknown command "${command}". Use build, status, similar, search or simulate.`);
  await commands[command]();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
