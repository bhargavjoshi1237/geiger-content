import test from "node:test";
import assert from "node:assert/strict";
import { createUserState, indexCatalog } from "../lib/feed/engine.mjs";
import { rollSession } from "../lib/feed/governor.mjs";
import { withDifficulty } from "../lib/feed/knowledge.mjs";
import { ensureStores, learnFromEvent } from "../lib/feed/learn.mjs";
import { replayLearning, rowToEvent } from "../lib/feed/replay.mjs";
import { DEFAULT_SETTINGS } from "../lib/feed/settings.mjs";
import { createTaste } from "../lib/feed/taste.mjs";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const fresh = () => ensureStores({ engine: createUserState(), taste: createTaste(), settings: structuredClone(DEFAULT_SETTINGS) });
const items = ["a", "b", "c", "d"].map((id, i) => withDifficulty({ id, topicId: i < 2 ? "games" : "music", subtopicId: "x", stepId: "s", horizontalId: `h${i}`, depth: 1, emotion: { bucket: "amused", intensity: 0.4 } }));
const index = indexCatalog(items);
const emb = new Map(items.map((it, i) => [it.id, [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0, i === 3 ? 1 : 0]]));
const row = (postId, type, at, metadata = {}, extra = {}) => ({ postId, type, dwellMs: extra.dwellMs ?? null, slot: null, metadata, at });
const learned = (state) => ({ engine: { nodes: state.engine.nodes, frontier: state.engine.frontier, events: state.engine.events, skipRuns: state.engine.skipRuns }, taste: state.taste, emotion: state.emotion, knowledge: state.knowledge, drift: state.drift });

test("replay with an excluded event equals the state built without it", () => {
  const rows = [
    row("a", "like", NOW, { eid: "e1" }),
    row("c", "react", NOW + 1000, { eid: "e2", emotion: "amused" }),
    row("b", "knew_this", NOW + 2000, { eid: "e3" }),
    row("d", "dwell", NOW + 3000, {}, { dwellMs: 9000 }),
  ];
  const withExcluded = replayLearning(fresh(), rows.map((r, i) => (i === 1 ? { ...r, metadata: { ...r.metadata, excluded: true } } : r)), index, emb);
  const without = replayLearning(fresh(), rows.filter((_, i) => i !== 1), index, emb);
  assert.deepEqual(learned(withExcluded), learned(without));
  // Live passes the index too, so a θ-seeded frontier is clamped to the subject's depth in both (knew_this now seeds depth 2).
  const direct = fresh();
  for (const r of rows.filter((_, i) => i !== 1)) learnFromEvent(direct, index.byId.get(r.postId), rowToEvent(r), { embedding: emb.get(r.postId), now: r.at, index, cap: false, journal: false });
  assert.deepEqual(learned(withExcluded).engine, learned(direct).engine, "replay matches learning the same events live");
});

test("replay ignores undo rows and unknown posts, keeps impressions and clears the journal", () => {
  const state = fresh();
  state.engine.history.push({ id: "a", topic: "games", sub: "games/x", horizontal: "h", depth: 1, slot: "core", at: NOW });
  state.engine.seen.push("a");
  state.engine.shown = 1;
  state.journal.push({ eid: "old", postId: "a", type: "like", at: NOW, route: {}, applied: {} });
  replayLearning(state, [row("a", "like", NOW), row("a", "undo", NOW + 1, { of: "e1" }), row("gone", "like", NOW + 2)], index, emb);
  assert.equal(state.engine.events, 1);
  assert.equal(state.engine.shown, 1);
  assert.deepEqual(state.engine.seen, ["a"]);
  assert.deepEqual(state.journal, []);
});

test("replay sorts by time and keeps the newest 5000", () => {
  const rows = [row("b", "hide", NOW + 5000, { reason: "this_item" }), row("a", "like", NOW)];
  const state = replayLearning(fresh(), rows, index, emb);
  assert.ok(state.engine.nodes.__all__.s > 0 && state.engine.nodes.__all__.f > 0);
  const many = Array.from({ length: 5002 }, (_, i) => row("a", "dwell", NOW + i, {}, { dwellMs: 100 }));
  assert.equal(replayLearning(fresh(), many, index, emb).engine.events, 5000);
});

test("replay does not cap historical descent with the current governor", () => {
  const expert = withDifficulty({ id: "x", topicId: "games", subtopicId: "x", stepId: "s", horizontalId: "h", depth: 1, taxonomyVersion: "entertainment-v2", difficulty: 5 });
  const idx = indexCatalog([expert, { ...expert, id: "y", depth: 3 }]);
  const state = fresh();
  rollSession(state.governor, { now: NOW + 10, frontier: {} });
  replayLearning(state, [row("x", "knew_this", NOW), row("x", "knew_this", NOW + 1)], idx, new Map());
  assert.equal(state.engine.frontier["games/x"], 3);
});
