import test from "node:test";
import assert from "node:assert/strict";
import { buildTopicLinks, composeFeed, createRng, createUserState, indexCatalog, markShown, recordEvent } from "../lib/feed/engine.mjs";
import { PERSONAS, runSimulation, similarFromMemory, syntheticCatalog, syntheticEmbeddings } from "../lib/feed/simulator.mjs";
import { createTaste, dot, nearestInMemory, normalize, recordTaste, similarCandidates, TASTE_CONFIG, tasteQuery, tasteSearches } from "../lib/feed/taste.mjs";
import { loadTaxonomy } from "../lib/feed/taxonomy/index.mjs";

const topics = loadTaxonomy().filter((t) => t.pool === "main");
const items = syntheticCatalog(topics, { perHorizontal: 6, now: Date.parse("2026-09-30") });
const index = indexCatalog(items, { topicLinks: buildTopicLinks(topics) });
const embeddings = syntheticEmbeddings(items);
const persona = (id) => PERSONAS.find((p) => p.id === id);
const centroid = (topicId) => normalize(items.filter((i) => i.topicId === topicId).map((i) => embeddings.get(i.id)).reduce((a, v) => a.map((x, k) => x + v[k])));

test("likes pull a topic's taste vector toward that topic; hides push the query away", () => {
  const taste = createTaste();
  const now = Date.parse("2026-09-01");
  const dogs = items.filter((i) => i.topicId === "dogs").slice(0, 6);
  for (const item of dogs) recordTaste(taste, embeddings.get(item.id), { type: "like" }, { topicId: item.topicId, now });
  const q = tasteQuery(taste, { now });
  assert.equal(q.interests[0].topicId, "dogs");
  const before = dot(q.interests[0].vector, centroid("dogs"));
  assert.ok(before > 0.8, `close to the dogs centroid (${before})`);
  assert.ok(q.readiness > 0.5 && q.readiness <= 1);
  const hidden = items.find((i) => i.topicId === "dogs" && !dogs.includes(i));
  for (let k = 0; k < 3; k += 1) recordTaste(taste, embeddings.get(hidden.id), { type: "hide" }, { topicId: "dogs", now });
  const after = tasteQuery(taste, { now }).interests[0].vector;
  assert.ok(dot(after, embeddings.get(hidden.id)) < dot(q.interests[0].vector, embeddings.get(hidden.id)), "hidden image moves further away");
});

test("taste keeps one vector per interest and forgets the weakest beyond the cap", () => {
  const taste = createTaste();
  const now = Date.parse("2026-09-01");
  const ids = [...new Set(items.map((i) => i.topicId))].slice(0, TASTE_CONFIG.maxTopics + 2);
  ids.forEach((topicId, n) => {
    for (const item of items.filter((i) => i.topicId === topicId).slice(0, n + 1)) recordTaste(taste, embeddings.get(item.id), { type: "save" }, { topicId, now });
  });
  assert.equal(Object.keys(taste.topics).length, TASTE_CONFIG.maxTopics);
  assert.ok(!taste.topics[ids[0]], "the weakest topic was dropped");
  const q = tasteQuery(taste, { now });
  assert.equal(q.interests.length, TASTE_CONFIG.queryTopics);
  assert.deepEqual(Object.keys(tasteSearches(q)).filter((k) => k.startsWith("taste:")).length, TASTE_CONFIG.queryTopics);
});

test("a cold reader has no taste query and the feed has no similar slot", () => {
  const q = tasteQuery(createTaste());
  assert.deepEqual(q, { interests: [], recent: null, readiness: 0 });
  const batch = composeFeed(createUserState(), index, { now: Date.parse("2026-09-01"), rng: createRng(1), similar: null });
  assert.ok(batch.every((e) => e.slot !== "similar"));
});

test("a warm taste fills 4-5 similar slots within the reader's depth and the spacing rules", () => {
  const state = createUserState();
  const taste = createTaste();
  const rng = createRng(4);
  let now = Date.parse("2026-09-01");
  // Three interests: the max-3-per-topic batch cap leaves room for 4-5 neighbours only across topics.
  const liked = ["dogs", "camping", "coffee"].flatMap((topicId) => items.filter((i) => i.topicId === topicId && i.depth === 1).slice(0, 5));
  for (const item of liked) {
    markShown(state, [{ item, slot: "core" }], { now });
    recordEvent(state, item, { type: "like" }, { now });
    recordTaste(taste, embeddings.get(item.id), { type: "like" }, { topicId: item.topicId, now });
    now += 5000;
  }
  const shares = [];
  for (let b = 0; b < 6; b += 1) {
    const similar = similarFromMemory(taste, embeddings, state, index, now);
    const batch = composeFeed(state, index, { now, rng, similar });
    const sims = batch.filter((e) => e.slot === "similar");
    shares.push(sims.length);
    for (const e of sims) {
      assert.ok(e.item.depth <= (state.frontier[`${e.item.topicId}/${e.item.subtopicId}`] || 1), "within known depth");
      assert.ok(e.similarity > 0 && e.reason.includes("similar"));
    }
    for (let i = 1; i < batch.length; i += 1)
      assert.notEqual(`${batch[i].item.topicId}/${batch[i].item.subtopicId}/${batch[i].item.stepId}/${batch[i].item.horizontalId}`, `${batch[i - 1].item.topicId}/${batch[i - 1].item.subtopicId}/${batch[i - 1].item.stepId}/${batch[i - 1].item.horizontalId}`);
    markShown(state, batch, { now });
    now += 60000;
  }
  const mean = shares.reduce((a, b) => a + b, 0) / shares.length;
  assert.ok(mean >= 3 && mean <= 6, `similar per batch ${shares.join(",")}`);
});

test("nearest neighbours are exact and skip excluded ids", () => {
  const query = embeddings.get(items[0].id);
  const top = nearestInMemory(query, embeddings, { limit: 5, exclude: new Set([items[0].id]) });
  assert.equal(top.length, 5);
  assert.ok(!top.some((t) => t.id === items[0].id));
  const brute = [...embeddings].filter(([id]) => id !== items[0].id).map(([id, v]) => ({ id, similarity: dot(query, v) })).sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  assert.deepEqual(top.map((t) => t.id), brute.map((t) => t.id));
  const merged = similarCandidates({ a: top.slice(0, 3), b: top.slice(1, 5) }, index.byId);
  assert.equal(merged.length, 5);
});

test("with embeddings the feed keeps every spacing rule and adapts faster to a shift in taste", () => {
  for (const p of PERSONAS) {
    const { metrics } = runSimulation({ persona: p, index, batches: 40, seed: 11, embeddings });
    assert.equal(metrics.sameHorizontalBackToBack + metrics.crowdedWindows, 0, `${p.id}: spacing`);
  }
  let tree = 0;
  let hybrid = 0;
  for (const seed of [5, 11, 21]) {
    tree += runSimulation({ persona: persona("shifting-taste"), index, batches: 60, seed }).metrics.engagementLate;
    hybrid += runSimulation({ persona: persona("shifting-taste"), index, batches: 60, seed, embeddings }).metrics.engagementLate;
  }
  assert.ok(hybrid > tree, `late engagement tree ${tree.toFixed(3)} vs hybrid ${hybrid.toFixed(3)}`);
});
