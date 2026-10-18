// Assembles the 60-topic tree and exposes flattened lookups for the crawler and feed engine.
import { parseTaxonomy } from "./parse.mjs";
import { entertainmentTaxonomy, TAXONOMY_VERSION } from "./entertainment.mjs";
import tech from "./tech.mjs";
import vehicles from "./vehicles.mjs";
import food from "./food.mjs";
import home from "./home.mjs";
import pets from "./pets.mjs";
import outdoors from "./outdoors.mjs";
import sports from "./sports.mjs";
import arts from "./arts.mjs";
import style from "./style.mjs";
import culture from "./culture.mjs";
import interests from "./interests.mjs";
import edgy from "./edgy.mjs";

const SOURCES = { tech, vehicles, food, home, pets, outdoors, sports, arts, style, culture, interests, edgy };
// Topics from these files crawl in their own queue pool; everything else is the "main" pool.
const POOLS = { interests: "personal", edgy: "edgy" };

// 60 core + 8 personal-interest + 10 edgy topics.
export const LEGACY_SHAPE = { topics: 78, subtopics: 5, steps: 4, horizontals: 5 };
export const SHAPE = { topics: 6 };
// Pools that are kept deliberately small: their own tree shape and images per horizontal.
export const POOL_SHAPES = { edgy: { subtopics: 3, steps: 4, horizontals: 3 } };
export const POOL_CAPS = { edgy: 10 };

function resolve(topics) {
  for (const topic of topics) {
    for (const subtopic of topic.subtopics) {
      subtopic.path = `${topic.id}/${subtopic.id}`;
      for (const step of subtopic.steps) {
        step.path = `${subtopic.path}/${step.id}`;
        // Steps without their own subreddits inherit the subtopic's, then the topic's.
        if (!step.subreddits.length) step.subreddits = subtopic.subreddits.length ? [...subtopic.subreddits] : [...topic.subreddits];
        for (const horizontal of step.horizontals) horizontal.path = `${step.path}/${horizontal.id}`;
      }
    }
  }
  return topics;
}

let cached = null;
export function loadLegacyTaxonomy() {
  if (cached) return cached;
  const topics = resolve(Object.entries(SOURCES).flatMap(([file, text]) => parseTaxonomy(text, { file }).map((topic) => ({ ...topic, pool: POOLS[file] || "main", cap: POOL_CAPS[POOLS[file]] || null }))));
  cached = topics;
  return topics;
}

let entertainment = null;
export function loadTaxonomy() {
  return entertainment ||= entertainmentTaxonomy();
}

// Flat rows, one per horizontal, carrying their ancestors.
export function flattenHorizontals(topics = loadTaxonomy()) {
  const rows = [];
  for (const topic of topics)
    for (const subtopic of topic.subtopics)
      for (const step of subtopic.steps)
        for (const horizontal of step.horizontals) rows.push({ topic, subtopic, step, horizontal });
  return rows;
}

export function flattenSteps(topics = loadTaxonomy()) {
  return topics.flatMap((topic) => topic.subtopics.flatMap((subtopic) => subtopic.steps.map((step) => ({ topic, subtopic, step }))));
}

// Every subreddit named anywhere in the tree (case-preserved, deduped case-insensitively).
export function allSubreddits(topics = loadTaxonomy()) {
  const seen = new Map();
  const add = (name) => { if (!seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name); };
  for (const topic of topics) {
    topic.subreddits.forEach(add);
    for (const subtopic of topic.subtopics) {
      subtopic.subreddits.forEach(add);
      for (const step of subtopic.steps) step.subreddits.forEach(add);
    }
  }
  return [...seen.values()];
}

// Returns a list of human-readable problems; empty means the tree matches SHAPE.
export function validateTaxonomy(topics = loadTaxonomy(), base = LEGACY_SHAPE) {
  if (topics.every(t => t.version === TAXONOMY_VERSION)) {
    const problems = [];
    if (!topics.length) problems.push("no entertainment areas");
    const ids = new Set(topics.map(t => t.id));
    const paths = flattenHorizontals(topics).map(r => r.horizontal.path);
    if (ids.size !== topics.length) problems.push("duplicate area ids");
    if (new Set(paths).size !== paths.length) problems.push("duplicate content paths");
    for (const t of topics) {
      if (!t.subtopics.length) problems.push(`${t.id}: no subjects`);
      for (const r of t.related) if (!ids.has(r)) problems.push(`${t.id}: unknown related area ${r}`);
      for (const s of t.subtopics) {
        if (!s.subreddits.length) problems.push(`${s.path}: no sources`);
        if (s.steps.some(st => st.depth !== 1)) problems.push(`${s.path}: subjects cannot be an expertise ladder`);
      }
    }
    return problems;
  }
  const problems = [];
  const ids = new Set(topics.map((t) => t.id));
  if (topics.length !== base.topics) problems.push(`expected ${base.topics} topics, found ${topics.length}`);
  if (ids.size !== topics.length) problems.push("duplicate topic ids");
  for (const topic of topics) {
    const shape = { ...base, ...(POOL_SHAPES[topic.pool] || {}) };
    for (const rel of topic.related) if (!ids.has(rel)) problems.push(`${topic.id}: unknown related topic "${rel}"`);
    if (topic.related.includes(topic.id)) problems.push(`${topic.id}: relates to itself`);
    if (!topic.subreddits.length) problems.push(`${topic.id}: no topic subreddits`);
    if (topic.subtopics.length !== shape.subtopics) problems.push(`${topic.id}: ${topic.subtopics.length} subtopics`);
    if (new Set(topic.subtopics.map((s) => s.id)).size !== topic.subtopics.length) problems.push(`${topic.id}: duplicate subtopic ids`);
    for (const subtopic of topic.subtopics) {
      if (subtopic.steps.length !== shape.steps) problems.push(`${subtopic.path}: ${subtopic.steps.length} steps`);
      if (new Set(subtopic.steps.map((s) => s.id)).size !== subtopic.steps.length) problems.push(`${subtopic.path}: duplicate step ids`);
      for (const step of subtopic.steps) {
        if (step.horizontals.length !== shape.horizontals) problems.push(`${step.path}: ${step.horizontals.length} horizontals`);
        if (new Set(step.horizontals.map((h) => h.id)).size !== step.horizontals.length) problems.push(`${step.path}: duplicate horizontal ids`);
        if (!step.keywords.length && !step.dedicated.length) problems.push(`${step.path}: needs step keywords or a dedicated @!subreddit`);
        if (!step.subreddits.length) problems.push(`${step.path}: no subreddits`);
        for (const horizontal of step.horizontals)
          if (!horizontal.keywords.length) problems.push(`${horizontal.path}: no keywords`);
      }
    }
  }
  return problems;
}
