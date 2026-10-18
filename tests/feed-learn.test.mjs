import test from "node:test";
import assert from "node:assert/strict";
import { createUserState, slotKey } from "../lib/feed/engine.mjs";
import { emotionAffinity, itemEmotionMultiplier } from "../lib/feed/emotion.mjs";
import { rollSession } from "../lib/feed/governor.mjs";
import { thetaOf, withDifficulty } from "../lib/feed/knowledge.mjs";
import { canUndo, ensureStores, findJournal, learnFromEvent, UNDO_WINDOW_MS, undoFromJournal } from "../lib/feed/learn.mjs";
import { DEFAULT_SETTINGS } from "../lib/feed/settings.mjs";
import { createTaste } from "../lib/feed/taste.mjs";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const fresh = () => ensureStores({ engine: createUserState(), taste: createTaste(), settings: structuredClone(DEFAULT_SETTINGS) });
const item = (id, extra = {}) => withDifficulty({ id, topicId: "games", subtopicId: "zelda", subjectPath: "games/zelda", stepId: "content", horizontalId: "general", depth: 1, createdAt: "2026-09-30", ...extra });
const nodeTotal = (state) => Object.values(state.engine.nodes).reduce((sum, n) => sum + n.s + n.f, 0);
const close = (a, b, msg, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} vs ${b}`);
// Engine nodes decay per event, so an undo restores them only up to that decay.
const NODE_TOL = 0.05;

test("an angry reaction followed by a long dwell moves emotion only, not the topic nodes", () => {
  const state = fresh();
  const post = item("rage-1", { emotion: { bucket: "angry", intensity: 0.8 } });
  learnFromEvent(state, post, { postId: post.id, type: "react", emotion: "angry", eid: "r1" }, { now: NOW });
  const { route } = learnFromEvent(state, post, { postId: post.id, type: "dwell", dwellMs: 12000 }, { now: NOW + 1000 });
  assert.equal(route.flags.gated, true);
  assert.deepEqual(state.engine.nodes, {}, "no interest node moved");
  assert.equal(state.engine.events, 0);
  // The reaction lands as a rejection of anger and the gated dwell as a quarter engagement, so anger now reads as disliked.
  close(state.emotion.b.angry.rej, 1, "angry rej", 1e-4);
  assert.ok(state.emotion.b.angry.rx > 0, "the gated dwell still lands on angry");
  assert.ok(emotionAffinity(state.emotion, "angry", NOW + 1000) < 0, "an angry reaction teaches less anger");
  assert.equal(state.reactions[post.id].bucket, "angry");
});

test("angry and disgusted reactions lower that emotion's item multiplier; undo restores it; sad stays a mild like", () => {
  const state = fresh();
  const rage = (id) => item(id, { emotion: { bucket: "angry", intensity: 0.7 } });
  const probe = rage("probe");
  assert.equal(itemEmotionMultiplier(probe, state.emotion, { now: NOW }), 1);
  for (let i = 0; i < 3; i += 1) learnFromEvent(state, rage(`r${i}`), { postId: `r${i}`, type: "react", emotion: "angry", eid: `a${i}` }, { now: NOW + i });
  const after = itemEmotionMultiplier(probe, state.emotion, { now: NOW + 10 });
  assert.ok(after < 0.75, `three angry reactions cut angry items (×${after.toFixed(2)})`);
  learnFromEvent(state, item("g"), { postId: "g", type: "react", emotion: "disgusted", eid: "g1" }, { now: NOW + 3 });
  assert.ok(emotionAffinity(state.emotion, "disgusted", NOW + 10) < 0);
  for (const eid of ["a0", "a1", "a2"]) undoFromJournal(state, eid, { item: rage(`r${eid.slice(1)}`), now: NOW + 20 });
  close(itemEmotionMultiplier(probe, state.emotion, { now: NOW + 20 }), 1, "undo restores the multiplier");
  learnFromEvent(state, item("s"), { postId: "s", type: "react", emotion: "sad", eid: "s1" }, { now: NOW + 21 });
  assert.ok(emotionAffinity(state.emotion, "sad", NOW + 22) > 0, "a sad reaction is not a rejection");
});

test("knew_this raises θ and leaves interest nodes untouched", () => {
  const state = fresh();
  const post = item("deep-1", { difficulty: 4 });
  learnFromEvent(state, post, { postId: post.id, type: "knew_this", eid: "k1" }, { now: NOW });
  assert.deepEqual(state.engine.nodes, {});
  assert.ok(thetaOf(state.knowledge, "games/zelda", NOW) > 1, "θ is floored above the item's difficulty");
  assert.equal(state.knowledge.subjects["games/zelda"].n, 1);
  assert.equal(state.journal.length, 1);
  assert.ok(canUndo(state, NOW));
});

test("undo restores nodes, taste, emotion and θ within tolerance", () => {
  const state = fresh();
  const a = item("a", { emotion: { bucket: "amused", intensity: 0.6 } });
  const b = item("b", { difficulty: 3 });
  const emb = new Map([["a", [1, 0, 0]], ["b", [0, 1, 0]], ["c", [0, 0, 1]]]);
  const c = item("c", { horizontalId: "art" });
  learnFromEvent(state, c, { postId: "c", type: "like", eid: "c1" }, { now: NOW, embedding: emb.get("c") });
  const before = structuredClone(state);
  learnFromEvent(state, a, { postId: "a", type: "like", eid: "e1" }, { now: NOW, embedding: emb.get("a") });
  learnFromEvent(state, b, { postId: "b", type: "learned", eid: "e2" }, { now: NOW, embedding: emb.get("b") });
  assert.ok(state.emotion.b.amused.rx > 0);
  assert.ok(state.knowledge.subjects["games/zelda"]);
  assert.equal(undoFromJournal(state, "e2", { item: b, embedding: emb.get("b"), now: NOW }), true);
  assert.equal(undoFromJournal(state, "e1", { item: a, embedding: emb.get("a"), now: NOW }), true);
  assert.equal(undoFromJournal(state, "e1", { item: a, now: NOW }), false, "an undone eid is gone from the journal");
  for (const [key, node] of Object.entries(before.engine.nodes)) {
    close(state.engine.nodes[key].s, node.s, `${key} s`, NODE_TOL);
    close(state.engine.nodes[key].f, node.f, `${key} f`, NODE_TOL);
  }
  for (const key of Object.keys(state.engine.nodes).filter((k) => !(k in before.engine.nodes))) close(state.engine.nodes[key].s + state.engine.nodes[key].f, 0, `${key} cleared`, NODE_TOL);
  assert.equal(state.engine.events, before.engine.events);
  assert.equal(state.taste.events, before.taste.events);
  for (const [i, x] of before.taste.topics["games/zelda"].v.entries()) close(state.taste.topics["games/zelda"].v[i], x, `taste v[${i}]`);
  close(state.taste.topics["games/zelda"].w, before.taste.topics["games/zelda"].w, "taste weight");
  close(state.emotion.b.amused?.rx ?? 0, 0, "amused rx");
  assert.equal(state.knowledge.subjects["games/zelda"], before.knowledge.subjects["games/zelda"]);
  assert.deepEqual(state.journal.map((j) => j.eid), ["c1"]);
});

test("undo is refused outside the window and for unknown eids", () => {
  const state = fresh();
  const a = item("a");
  learnFromEvent(state, a, { postId: "a", type: "save", eid: "s1" }, { now: NOW });
  assert.equal(findJournal(state, "s1", { now: NOW + UNDO_WINDOW_MS + 1 }), null);
  assert.equal(undoFromJournal(state, "s1", { item: a, now: NOW + UNDO_WINDOW_MS + 1 }), false);
  assert.equal(undoFromJournal(state, "nope", { item: a, now: NOW }), false);
  assert.equal(canUndo(state, NOW + UNDO_WINDOW_MS + 1), false);
});

test("undoing a reaction restores the previous one; non-undoable events are not journalled", () => {
  const state = fresh();
  const a = item("a");
  learnFromEvent(state, a, { postId: "a", type: "react", emotion: "amused", eid: "r1" }, { now: NOW });
  learnFromEvent(state, a, { postId: "a", type: "react", emotion: "moved", eid: "r2" }, { now: NOW + 1 });
  assert.equal(state.reactions.a.bucket, "moved");
  undoFromJournal(state, "r2", { item: a, now: NOW + 2 });
  assert.equal(state.reactions.a.bucket, "amused");
  learnFromEvent(state, a, { postId: "a", type: "dwell", dwellMs: 4000, eid: "d1" }, { now: NOW + 3 });
  assert.equal(state.journal.some((j) => j.eid === "d1"), false);
});

test("skip runs, slot nodes and probe answers flow through the orchestrator", () => {
  const state = fresh();
  state.engine.history.push({ id: "a", topic: "games", sub: "games/zelda", horizontal: "x", depth: 1, slot: "explore", at: NOW });
  const a = item("a");
  learnFromEvent(state, a, { postId: "a", type: "like" }, { now: NOW });
  assert.ok(state.engine.nodes[slotKey("explore")].s > 0);
  learnFromEvent(state, a, { postId: "a", type: "skip" }, { now: NOW });
  assert.equal(state.engine.skipRuns["games/zelda"].n, 1);
  learnFromEvent(state, a, { postId: "a", type: "probe_answer", probe: "interest", answer: "more", sub: "games/zelda" }, { now: NOW });
  assert.equal(state.stated.answers.length, 1);
  assert.equal(state.stated.answers[0].answer, "more");
  assert.ok(Number.isFinite(state.stated.answers[0].lift));
});

test("a confident θ seeds the frontier upward and the governor caps descent per session", () => {
  const expert = item("x", { taxonomyVersion: "entertainment-v2", difficulty: 5 });
  assert.equal(expert.depth, 3, "labelled entertainment items get a virtual depth");
  const capped = fresh();
  rollSession(capped.governor, { now: NOW, frontier: capped.engine.frontier });
  const open = fresh();
  for (const [s, cap] of [[capped, true], [open, false]])
    for (let i = 0; i < 2; i += 1) learnFromEvent(s, expert, { postId: "x", type: "knew_this", eid: `k${i}` }, { now: NOW + i, cap });
  assert.equal(open.engine.frontier["games/zelda"], 3);
  assert.equal(capped.engine.frontier["games/zelda"], 2, "one level per session by default");
});
