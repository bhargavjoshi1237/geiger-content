import test from "node:test";
import assert from "node:assert/strict";
import { allSubreddits, flattenHorizontals, loadTaxonomy, SHAPE, validateTaxonomy } from "../lib/feed/taxonomy/index.mjs";
import { parseTaxonomy, slugify } from "../lib/feed/taxonomy/parse.mjs";

test("topic tree is 60 core + 7 personal topics × 5 subtopics × 4 steps × 5 horizontals", () => {
  const topics = loadTaxonomy();
  assert.deepEqual(validateTaxonomy(topics), []);
  assert.equal(topics.length, SHAPE.topics);
  assert.equal(flattenHorizontals(topics).length, 67 * 5 * 4 * 5);
  assert.equal(topics.filter((t) => t.pool === "personal").length, 7);
  assert.equal(topics.filter((t) => t.pool === "main").length, 60);
});

test("every horizontal path is unique and steps are ordered by depth", () => {
  const rows = flattenHorizontals();
  assert.equal(new Set(rows.map((r) => r.horizontal.path)).size, rows.length);
  for (const topic of loadTaxonomy())
    for (const subtopic of topic.subtopics) assert.deepEqual(subtopic.steps.map((s) => s.depth), [1, 2, 3, 4]);
});

test("related topics form a connected bridge graph", () => {
  const topics = loadTaxonomy();
  const links = new Map(topics.map((t) => [t.id, new Set(t.related)]));
  for (const t of topics) for (const r of t.related) links.get(r).add(t.id);
  const seen = new Set([topics[0].id]);
  const queue = [topics[0].id];
  while (queue.length) for (const next of links.get(queue.shift())) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  assert.equal(seen.size, topics.length, "every topic is reachable through related links");
});

test("parser reads dedicated subreddits, flair keywords and names with colons", () => {
  const [topic] = parseTaxonomy(`
# Demo {demo} > other @base
## Sub @shared
- Step one @!dedicated @extra ~ alpha, beta gamma
  1:18 models: 1:18 | Flair pick: flair=Build Complete | C: c | D: d | E: e
`);
  const step = topic.subtopics[0].steps[0];
  assert.deepEqual(step.dedicated, ["dedicated"]);
  assert.deepEqual(step.subreddits, ["dedicated", "extra"]);
  assert.equal(step.horizontals[0].id, "1-18-models");
  assert.deepEqual(step.horizontals[0].keywords, [{ field: "any", text: "1:18" }]);
  assert.deepEqual(step.horizontals[1].keywords, [{ field: "flair", text: "build complete" }]);
  assert.equal(slugify("Hardline & exotic cooling"), "hardline-and-exotic-cooling");
});

test("tree names roughly a thousand subreddits to crawl", () => {
  const subs = allSubreddits();
  assert.ok(subs.length > 800 && subs.length < 1200, `got ${subs.length}`);
});
