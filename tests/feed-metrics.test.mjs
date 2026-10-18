import test from "node:test";
import assert from "node:assert/strict";
import { createUserState, DEFAULT_CONFIG } from "../lib/feed/engine.mjs";
import { funnelMetrics } from "../lib/feed/metrics.mjs";

const NOW = Date.parse("2026-10-01");
let seqId = 0;
const h = (topic, extra = {}) => ({ id: `${topic}-${(seqId += 1)}`, topic, sub: `${topic}/s`, slot: "core", ...extra });
const seq = (topics) => topics.map((t) => h(t));

test("empty history returns zeros and nulls", () => {
  const m = funnelMetrics({ history: [], state: createUserState(), now: NOW });
  assert.deepEqual(m, { circlingIndex: 0, entropy: 0, maxRun: 0, topicChurn: 0, explorationYield: null, depthPerSubject: [], sensitiveShare: 0, intenseShare: 0 });
  assert.deepEqual(funnelMetrics(), m);
});

test("circling index and entropy match the engine over the last 50", () => {
  const history = seq([..."aaaabbbbcccc"]);
  const m = funnelMetrics({ history, now: NOW });
  assert.equal(m.circlingIndex, 1);
  assert.equal(m.entropy, 1.585);
  const two = funnelMetrics({ history: seq(["a", "b", "a", "b"]), now: NOW });
  assert.equal(two.entropy, 1);
  assert.equal(two.circlingIndex, 1);
});

test("maxRun is the longest same-topic run in the last 50 impressions", () => {
  assert.equal(funnelMetrics({ history: seq([..."abbbcbba"]) }).maxRun, 3);
  // A 10-long run older than the last 50 impressions is ignored.
  const old = seq(Array(10).fill("z"));
  const recent = seq(Array.from({ length: 50 }, (_, i) => (i % 2 ? "a" : "b")));
  assert.equal(funnelMetrics({ history: [...old, ...recent] }).maxRun, 1);
});

test("topicChurn is the Jaccard distance between the two latest 25-impression windows", () => {
  const first = seq(Array.from({ length: 25 }, (_, i) => ["a", "b", "c"][i % 3]));
  const same = seq(Array.from({ length: 25 }, (_, i) => ["c", "a", "b"][i % 3]));
  assert.equal(funnelMetrics({ history: [...first, ...same] }).topicChurn, 0);
  const shifted = seq(Array.from({ length: 25 }, (_, i) => ["c", "d"][i % 2]));
  // {a,b,c} vs {c,d}: intersection 1, union 4.
  assert.equal(funnelMetrics({ history: [...first, ...shifted] }).topicChurn, 0.75);
  const disjoint = seq(Array(25).fill("x"));
  assert.equal(funnelMetrics({ history: [...first, ...disjoint] }).topicChurn, 1);
  assert.equal(funnelMetrics({ history: first.slice(0, 49) }).topicChurn, 0, "too few impressions");
});

test("explorationYield combines the explore and adjacent slot nodes", () => {
  const state = createUserState();
  state.events = 10;
  state.nodes["__slot__:explore"] = { s: 3, f: 1, at: NOW, ev: 10 };
  state.nodes["__slot__:adjacent"] = { s: 1, f: 3, at: NOW, ev: 10 };
  state.nodes["__slot__:core"] = { s: 9, f: 0, at: NOW, ev: 10 };
  assert.equal(funnelMetrics({ state, now: NOW }).explorationYield, 0.5);
  delete state.nodes["__slot__:adjacent"];
  assert.equal(funnelMetrics({ state, now: NOW }).explorationYield, 0.75);
  assert.equal(funnelMetrics({ state: createUserState(), now: NOW }).explorationYield, null);
});

test("explorationYield is decayed by age and event distance", () => {
  const state = createUserState();
  state.events = 10;
  // Explore is one half-life old, adjacent is fresh: the old successes count half.
  state.nodes["__slot__:explore"] = { s: 4, f: 0, at: NOW - DEFAULT_CONFIG.halfLifeMs, ev: 10 };
  state.nodes["__slot__:adjacent"] = { s: 0, f: 2, at: NOW, ev: 10 };
  assert.equal(funnelMetrics({ state, now: NOW }).explorationYield, 0.5);
  const noDecay = funnelMetrics({ state, now: NOW, config: { halfLifeMs: Infinity } });
  assert.equal(noDecay.explorationYield, 0.667);
});

test("depthPerSubject lists deep subjects with their descent this session", () => {
  const frontier = { "a/x": 3, "b/y": 1, "c/z": 2 };
  const governor = { startFrontier: { "a/x": 2 } };
  const m = funnelMetrics({ history: [], frontier, governor });
  assert.deepEqual(m.depthPerSubject, [{ id: "a/x", depth: 3, sessionDescent: 1 }, { id: "c/z", depth: 2, sessionDescent: 1 }]);
  // Falls back to the engine state's frontier, with no governor meaning no descent is attributed.
  const state = createUserState();
  state.frontier = { "a/x": 4 };
  assert.deepEqual(funnelMetrics({ state }).depthPerSubject, [{ id: "a/x", depth: 4, sessionDescent: 0 }]);
});

test("sensitive and intense shares are fractions of the last 50 entries", () => {
  const history = [
    ...seq(Array(50).fill("old")).map((e) => ({ ...e, sens: ["violence"], emo: "angry", int: 1 })),
    h("a", { sens: ["violence"] }),
    h("a", { sens: [] }),
    h("b", { emo: "angry", int: 0.8 }),
    h("b", { emo: "sad", int: 0.75 }),
    h("c", { emo: "angry", int: 0.5 }),
    h("c", { emo: "amazed", int: 1 }),
    ...seq(Array(44).fill("d")),
  ];
  const m = funnelMetrics({ history });
  assert.equal(m.sensitiveShare, 0.02);
  assert.equal(m.intenseShare, 0.04);
});
