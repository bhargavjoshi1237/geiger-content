import test from "node:test";
import assert from "node:assert/strict";
import { buildBias } from "../lib/feed/bias.mjs";
import { composeFeed, createRng, createUserState, indexCatalog, markShown } from "../lib/feed/engine.mjs";
import { createEmotion, recordEmotion } from "../lib/feed/emotion.mjs";
import { createGovernor, rollSession } from "../lib/feed/governor.mjs";
import { createKnowledge, withDifficulty } from "../lib/feed/knowledge.mjs";
import { DEFAULT_SETTINGS, mergeSettings, resolveSettings } from "../lib/feed/settings.mjs";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const state = (extra = {}) => ({ engine: createUserState(), emotion: createEmotion(), knowledge: createKnowledge(), governor: createGovernor(), ...extra });
const resolved = (patch = {}) => resolveSettings(mergeSettings(DEFAULT_SETTINGS, patch));
const item = (id, extra = {}) => ({ id, topicId: "t", subtopicId: "s", stepId: "a", horizontalId: "h", depth: 1, ...extra });

test("defaults are inert: unlabelled items weigh 1, nothing is excluded or boosted", () => {
  const bias = buildBias({ state: state(), resolved: resolved(), now: NOW });
  assert.equal(bias.itemWeight(item("plain")), 1);
  assert.equal(bias.itemWeight(withDifficulty(item("rated", { difficulty: 5 }))), 1, "no knowledge record, no reweighting");
  assert.equal(bias.excludeTopics.size + bias.excludeSubs.size + bias.boostTopics.size + bias.boostSubs.size, 0);
  assert.equal(bias.maxDepthFor("t/s"), Infinity, "no governor session yet");
});

test("mutes and boosts split into areas and subject paths", () => {
  const bias = buildBias({ state: state(), resolved: resolved({ topics: { mute: ["games", "music/jazz"], boost: ["films/noir", "art"] } }), now: NOW });
  assert.deepEqual([...bias.excludeTopics], ["games"]);
  assert.deepEqual([...bias.excludeSubs], ["music/jazz"]);
  assert.deepEqual([...bias.boostTopics], ["art"]);
  assert.deepEqual([...bias.boostSubs], ["films/noir"]);
});

test("emotion dials, learned rejections and the calm cap lower matching items", () => {
  const angry = item("a", { emotion: { bucket: "angry", intensity: 0.8 } });
  const amused = item("b", { emotion: { bucket: "amused", intensity: 0.4 } });
  assert.ok(buildBias({ state: state(), resolved: resolved({ emotionDials: { angry: -1 } }), now: NOW }).itemWeight(angry) < 0.6);
  const s = state();
  recordEmotion(s.emotion, "amused", { kind: "reject", amount: 3, now: NOW });
  assert.ok(buildBias({ state: s, resolved: resolved(), now: NOW }).itemWeight(amused) < 1, "an upsetting-hidden bucket drops");
  assert.equal(buildBias({ state: s, resolved: resolved({ nonProfiled: true }), now: NOW }).itemWeight(amused), 1, "non-profiled ignores learned affinity");
  assert.equal(buildBias({ state: state(), resolved: resolved({ intensityCap: "calm" }), now: NOW }).itemWeight(angry), 0);
});

test("an expert's basics are suppressed and the governor caps depth per session", () => {
  const s = state();
  s.knowledge.subjects["t/s"] = { theta: 2.5, n: 5, at: NOW };
  const basic = withDifficulty(item("easy", { difficulty: 1 }));
  assert.ok(buildBias({ state: s, resolved: resolved(), now: NOW }).itemWeight(basic) < 0.2);
  assert.ok(buildBias({ state: s, resolved: resolved({ depth: { basicsSuppression: false } }), now: NOW }).itemWeight(basic) > 0.2);
  rollSession(s.governor, { now: NOW, frontier: { "t/s": 2 } });
  assert.equal(buildBias({ state: s, resolved: resolved(), now: NOW }).maxDepthFor("t/s"), 3);
  assert.equal(buildBias({ state: s, resolved: resolved({ rabbitHole: { enabled: true, maxLevelsPerSession: 3 } }), now: NOW }).maxDepthFor("t/s"), 5);
  assert.equal(buildBias({ state: s, resolved: resolved({ minor: true, rabbitHole: { enabled: true, maxLevelsPerSession: 3 } }), now: NOW }).maxDepthFor("t/s"), 3);
});

test("a muted subject never appears across 30 batches", () => {
  const items = [];
  for (let t = 0; t < 4; t += 1) for (let s = 0; s < 3; s += 1) for (let i = 0; i < 100; i += 1)
    items.push({ id: `t${t}-s${s}-${i}`, topicId: `t${t}`, subtopicId: `s${s}`, stepId: "a", horizontalId: `h${i % 4}`, depth: 1, createdAt: new Date(NOW - i * 3600000).toISOString(), score: i });
  const index = indexCatalog(items);
  const s = state();
  const res = resolved({ topics: { mute: ["t1/s1", "t3"] } });
  for (let b = 0; b < 30; b += 1) {
    const now = NOW + b * 60000;
    const batch = composeFeed(s.engine, index, { now, rng: createRng(b + 1), config: res.config, bias: buildBias({ state: s, resolved: res, now }) });
    assert.ok(batch.length > 0);
    for (const e of batch) assert.ok(e.item.topicId !== "t3" && `${e.item.topicId}/${e.item.subtopicId}` !== "t1/s1", `${e.item.id} is muted`);
    markShown(s.engine, batch, { now });
  }
});

// Four areas of three subjects; area t0's subject s0 is almost all angry, everything else amused/neutral.
function moodIndex() {
  const items = [];
  for (let t = 0; t < 4; t += 1) for (let s = 0; s < 3; s += 1) for (let i = 0; i < 40; i += 1) {
    const bucket = t === 0 && s === 0 ? (i % 10 ? "angry" : "amused") : i % 2 ? "amused" : "neutral";
    items.push({ id: `t${t}-s${s}-${i}`, topicId: `t${t}`, subtopicId: `s${s}`, stepId: "a", horizontalId: `h${i % 4}`, depth: 1, createdAt: new Date(NOW - i * 3600000).toISOString(), score: i, emotion: { bucket, intensity: 0.5 } });
  }
  return indexCatalog(items);
}

test("emotion dials weight topics and subjects by their emotion mix; inert dials add no node weights", () => {
  const index = moodIndex();
  assert.equal(buildBias({ state: state(), resolved: resolved(), now: NOW, index }).topicWeight, undefined, "no dials, no learned affinity: no node weights");
  const bias = buildBias({ state: state(), resolved: resolved({ emotionDials: { angry: -1 } }), now: NOW, index });
  assert.ok(bias.subWeight("t0/s0") < 0.6, `angry subject ${bias.subWeight("t0/s0")}`);
  assert.equal(bias.subWeight("t0/s1"), 1, "a subject without angry items keeps weight 1");
  assert.ok(bias.topicWeight("t0") < 1 && bias.topicWeight("t0") > bias.subWeight("t0/s0"), "the area is diluted by its other subjects");
  assert.equal(bias.topicWeight("t1"), 1);
  // Learned anger (angry reactions) weighs nodes the same way, without any dial.
  const s = state();
  recordEmotion(s.emotion, "angry", { kind: "reject", amount: 4, now: NOW });
  assert.ok(buildBias({ state: s, resolved: resolved(), now: NOW, index }).subWeight("t0/s0") < 1);
});

test("an angry dial cuts an angry-heavy subject at selection, beyond reordering inside a horizontal", () => {
  const index = moodIndex();
  const run = (withIndex) => {
    const s = state();
    const res = resolved({ emotionDials: { angry: -1 } });
    let hits = 0;
    for (let b = 0; b < 30; b += 1) {
      const now = NOW + b * 60000;
      const batch = composeFeed(s.engine, index, { now, rng: createRng(b + 1), config: res.config, bias: buildBias({ state: s, resolved: res, now, index: withIndex ? index : null }) });
      hits += batch.filter((e) => e.item.topicId === "t0" && e.item.subtopicId === "s0").length;
      markShown(s.engine, batch, { now });
    }
    return hits;
  };
  const itemOnly = run(false);
  const withNodes = run(true);
  assert.ok(withNodes < itemOnly * 0.8, `angry subject impressions ${itemOnly} → ${withNodes}`);
});
