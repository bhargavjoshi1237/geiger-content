// On-disk crawl state: JSONL manifest parts (the source of truth for what was collected),
// resumable cursors, and a rate-limit log, all under one corpus directory.
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_CORPUS_DIR = path.join(process.cwd(), "data", "feed-corpus");

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function writeJsonAtomic(file, value) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

// Streams every manifest record (all parts, in name order).
export function* readManifest(dir = DEFAULT_CORPUS_DIR) {
  const manifestDir = path.join(dir, "manifest");
  if (!fs.existsSync(manifestDir)) return;
  for (const name of fs.readdirSync(manifestDir).filter((f) => f.endsWith(".jsonl")).sort()) {
    for (const line of fs.readFileSync(path.join(manifestDir, name), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { yield JSON.parse(line); } catch { /* a torn last line from a killed run is skipped */ }
    }
  }
}

export function openStore(dir = DEFAULT_CORPUS_DIR, { now = () => new Date() } = {}) {
  const manifestDir = path.join(dir, "manifest");
  fs.mkdirSync(manifestDir, { recursive: true });
  const stateFile = path.join(dir, "state.json");
  const state = readJson(stateFile, { version: 1, cursors: {}, runs: [] });
  const counts = new Map();
  const seenPosts = new Set();
  const seenImages = new Set();
  for (const record of readManifest(dir)) {
    counts.set(record.path, (counts.get(record.path) || 0) + 1);
    seenPosts.add(record.id);
    if (record.image?.url) seenImages.add(record.image.url);
  }
  let partFile = null;

  return {
    dir,
    state,
    counts,
    seenPosts,
    seenImages,
    count: (p) => counts.get(p) || 0,
    total: () => [...counts.values()].reduce((a, b) => a + b, 0),
    append(records) {
      if (!records.length) return;
      if (!partFile) {
        const stamp = now().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
        partFile = path.join(manifestDir, `part-${stamp}.jsonl`);
      }
      fs.appendFileSync(partFile, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
      for (const record of records) {
        counts.set(record.path, (counts.get(record.path) || 0) + 1);
        seenPosts.add(record.id);
        if (record.image?.url) seenImages.add(record.image.url);
      }
    },
    cursor: (key) => state.cursors[key] || null,
    setCursor(key, value) { state.cursors[key] = value; },
    save() { writeJsonAtomic(stateFile, state); },
    logWait(event) { fs.appendFileSync(path.join(dir, "ratelimit.log"), JSON.stringify(event) + "\n"); },
    readJson: (name, fallback = null) => readJson(path.join(dir, name), fallback),
    writeJson: (name, value) => writeJsonAtomic(path.join(dir, name), value),
    writeText: (name, text) => fs.writeFileSync(path.join(dir, name), text),
  };
}
