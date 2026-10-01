// Runs the persona simulator against the feed engine and writes a report.
//   node scripts/feed-simulate.mjs [--catalog auto|synthetic|manifest] [--links auto|taxonomy] [--batches 60] [--seed 42] [--persona id]
// "auto" uses the crawled manifest when it covers every topic, else a synthetic catalog.
import fs from "node:fs";
import path from "node:path";
import { buildTopicLinks, indexCatalog } from "../lib/feed/engine.mjs";
import { DEFAULT_CORPUS_DIR, readManifest } from "../lib/feed/crawl/store.mjs";
import { PERSONAS, catalogFromManifest, runSimulation, syntheticCatalog } from "../lib/feed/simulator.mjs";
import { loadTaxonomy } from "../lib/feed/taxonomy/index.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dir = flag("dir", DEFAULT_CORPUS_DIR);
const topics = loadTaxonomy();
const graphFile = path.join(dir, "graph.json");
const edges = flag("links", "auto") !== "taxonomy" && fs.existsSync(graphFile) ? JSON.parse(fs.readFileSync(graphFile, "utf8")).topicEdges || [] : [];
const topicLinks = buildTopicLinks(topics, edges);

const mode = flag("catalog", "auto");
const manifest = mode === "synthetic" ? [] : [...readManifest(dir)];
const manifestTopics = new Set(manifest.map((r) => r.topicId));
const useManifest = mode === "manifest" || (mode === "auto" && manifestTopics.size === topics.length);
const items = useManifest ? catalogFromManifest(manifest) : syntheticCatalog(topics);
const index = indexCatalog(items, { topicLinks });
const batches = Number(flag("batches", 60));
const seed = Number(flag("seed", 42));
const only = flag("persona");

const results = PERSONAS.filter((p) => !only || p.id === only).map((persona) => runSimulation({ persona, index, batches, seed }));
const rows = results.map(({ persona, metrics: m }) => ({
  persona: persona.id,
  engagement: `${m.engagementEarly} → ${m.engagementLate}`,
  interestShare: `${m.interestShareEarly} → ${m.interestShareLate}`,
  circling: m.circlingIndex,
  topicsPerBatch: m.distinctTopicsPerBatch,
  maxRun: m.maxSameTopicRun,
  violations: m.sameHorizontalBackToBack + m.crowdedWindows,
  probes: `${m.probes.accepted}/${m.probes.shown}`,
  focusDepth: m.focusDepthReached ?? "-",
  toDepth3: m.batchesToDepth?.[3] ?? "-",
}));
console.log(`Catalog: ${useManifest ? `crawled manifest (${items.length} items)` : `synthetic (${items.length} items)`}; ${batches} batches × 10; topic links from ${edges.length ? "taxonomy + crawl graph" : "taxonomy"}`);
console.table(rows);

const outDir = path.join(dir, "simulations");
fs.mkdirSync(outDir, { recursive: true });
const report = { generatedAt: new Date().toISOString(), catalog: useManifest ? "manifest" : "synthetic", items: items.length, batches, seed, results: results.map((r) => ({ persona: r.persona, metrics: r.metrics, timeline: r.timeline })) };
fs.writeFileSync(path.join(outDir, "latest.json"), JSON.stringify(report, null, 2));
const md = [
  "# Feed simulation",
  "",
  `Generated ${report.generatedAt} — ${report.catalog} catalog (${items.length} items), ${batches} batches of 10, seed ${seed}.`,
  "",
  "| Persona | Engagement early → late | Interest share early → late | Circling (top-3 share of last 50) | Topics / batch | Max topic run | Spacing violations | Probes accepted | Focus depth | Batches to depth 3 |",
  "|---|---|---|---:|---:|---:|---:|---|---:|---:|",
  ...rows.map((r) => `| ${r.persona} | ${r.engagement} | ${r.interestShare} | ${r.circling} | ${r.topicsPerBatch} | ${r.maxRun} | ${r.violations} | ${r.probes} | ${r.focusDepth} | ${r.toDepth3} |`),
  "",
].join("\n");
fs.writeFileSync(path.join(outDir, "latest.md"), md);
console.log(`Report: ${path.join(outDir, "latest.md")}`);
