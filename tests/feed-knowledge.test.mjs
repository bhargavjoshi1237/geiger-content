import test from "node:test";
import assert from "node:assert/strict";
import {
  createKnowledge, estimateDifficulty, itemKnowledgeMultiplier, KNOWLEDGE_CONFIG, knowledgeLabel, knowledgeSummary,
  levelToB, predictedSuccess, revertKnowledge, thetaOf, thetaToFrontier, thetaToLevel, updateKnowledge, withDifficulty,
} from "../lib/feed/knowledge.mjs";

const now = Date.parse("2026-10-01");
const SUB = "gaming/strategy";
const item = (level, extra = {}) => ({ id: `i-${level}`, topicId: "gaming", subtopicId: "strategy", subjectPath: SUB, taxonomyVersion: "entertainment-v2", depth: 1, difficulty: level, ...extra });
const withTheta = (theta, n) => ({ subjects: { [SUB]: { theta, n, at: now } } });

test("levels and b are inverse on the default scale", () => {
  assert.equal(levelToB(3), 0);
  assert.equal(levelToB(5), 2);
  assert.equal(thetaToLevel(levelToB(4)), 4);
  assert.equal(thetaToLevel(10), 5);
  assert.equal(thetaToLevel(-10), 1);
  assert.ok(Math.abs(predictedSuccess(0, 0) - 0.5) < 1e-12);
});

test("knew_this raises θ and enforces the floor above the item's difficulty", () => {
  const k = createKnowledge();
  // A mid-level item: b + margin must stay under thetaMax for the exact floor check (a level-5 item now floors at the clamp).
  const b = levelToB(3);
  const r = updateKnowledge(k, SUB, { outcome: 1, strength: 1, itemB: b, floor: true, now });
  assert.ok(r.delta > 0);
  assert.equal(r.nBefore, 0);
  assert.ok(Math.abs(k.subjects[SUB].theta - (b + KNOWLEDGE_CONFIG.knewFloorMargin)) < 1e-12, "floored at b + margin");
  assert.equal(k.subjects[SUB].n, 1);
  // Without the floor the Elo step alone stays well below b + margin.
  const plain = createKnowledge();
  updateKnowledge(plain, SUB, { outcome: 1, itemB: b, now });
  assert.ok(plain.subjects[SUB].theta < b + KNOWLEDGE_CONFIG.knewFloorMargin / 2);
});

test("learned (outcome .5) moves θ toward b from either side", () => {
  const above = withTheta(2, 3);
  const r1 = updateKnowledge(above, SUB, { outcome: 0.5, itemB: 0, now });
  assert.ok(r1.delta < 0 && r1.theta > 0, "a reader above b drifts down toward it");
  const below = withTheta(-2, 3);
  const r2 = updateKnowledge(below, SUB, { outcome: 0.5, itemB: 0, now });
  assert.ok(r2.delta > 0 && r2.theta < 0, "a reader below b drifts up toward it");
});

test("the step size K shrinks as evidence grows", () => {
  const fresh = withTheta(0, 0);
  const seasoned = withTheta(0, 20);
  const a = updateKnowledge(fresh, SUB, { outcome: 1, itemB: 0, now });
  const b = updateKnowledge(seasoned, SUB, { outcome: 1, itemB: 0, now });
  assert.ok(Math.abs(a.delta - 0.4) < 1e-12, "K = kBase at n 0, times (1 − .5)");
  assert.ok(b.delta > 0 && b.delta < a.delta / 2);
});

test("revert subtracts the journalled delta exactly and drops a fresh record", () => {
  const k = withTheta(0.6, 4);
  const before = structuredClone(k);
  const r = updateKnowledge(k, SUB, { outcome: 1, strength: 1.5, itemB: 1, floor: true, now });
  revertKnowledge(k, SUB, { delta: r.delta });
  assert.ok(Math.abs(k.subjects[SUB].theta - before.subjects[SUB].theta) < 1e-12);
  assert.equal(k.subjects[SUB].n, 4);
  const cold = createKnowledge();
  const r2 = updateKnowledge(cold, SUB, { outcome: 0, itemB: 2, now });
  revertKnowledge(cold, SUB, { delta: r2.delta });
  assert.deepEqual(cold, createKnowledge());
  // Clamped updates report the clamped change, so revert stays exact at the edge.
  const edge = withTheta(2.95, 1);
  const r3 = updateKnowledge(edge, SUB, { outcome: 1, itemB: 3, floor: true, now });
  assert.equal(edge.subjects[SUB].theta, KNOWLEDGE_CONFIG.thetaMax);
  revertKnowledge(edge, SUB, { delta: r3.delta });
  assert.ok(Math.abs(edge.subjects[SUB].theta - 2.95) < 1e-12);
});

test("θ forgets toward theta0 on read", () => {
  const k = withTheta(2, 5);
  assert.equal(thetaOf(k, SUB, now), 2);
  assert.ok(Math.abs(thetaOf(k, SUB, now + KNOWLEDGE_CONFIG.forgetHalfLifeMs) - 1) < 1e-12);
  assert.equal(thetaOf(k, "other/sub", now), KNOWLEDGE_CONFIG.theta0);
});

test("band weights: 1 inside the band, decaying outside to a floor", () => {
  const k = withTheta(1, 5);
  const inBand = item(null, { difficulty: { level: 3, b: 1 - 1.2 } }); // σ(1.2) ≈ .77
  assert.equal(itemKnowledgeMultiplier(inBand, k, { now }), 1);
  const slightlyHard = item(null, { difficulty: { level: 3.5, b: 0.5 } }); // 0.35 above the band
  const veryHard = item(5, {});
  const mSlight = itemKnowledgeMultiplier(slightlyHard, k, { now });
  const mHard = itemKnowledgeMultiplier(veryHard, k, { now });
  assert.ok(mSlight < 1 && mSlight > 0.8, `slightly hard ${mSlight}`);
  assert.equal(mHard, KNOWLEDGE_CONFIG.minWeight);
  // A deeper target shifts the band up so the harder item is now inside it.
  const hardish = item(null, { difficulty: { level: 3, b: 0.5 } });
  assert.equal(itemKnowledgeMultiplier(hardish, k, { now, target: "deep" }), 1);
  assert.ok(itemKnowledgeMultiplier(inBand, k, { now, target: "gentle" }) <= 1);
});

test("basics suppression applies to experts only when on", () => {
  const expert = withTheta(2.5, 6);
  const basic = item(1, {}); // b = -2 ≤ θ − 2
  const on = itemKnowledgeMultiplier(basic, expert, { now });
  const off = itemKnowledgeMultiplier(basic, expert, { now, basicsSuppression: false });
  assert.ok(Math.abs(on - off * KNOWLEDGE_CONFIG.basics.penalty) < 1e-12);
  assert.equal(off, KNOWLEDGE_CONFIG.minWeight);
  // Too little evidence for the basics rule (n 2 < minN 3) keeps only the band weight.
  const thin = withTheta(2.5, 2);
  assert.equal(itemKnowledgeMultiplier(basic, thin, { now }), off);
});

test("knowing mid-level items lifts θ past basics.minTheta, so the expert's basics get suppressed", () => {
  const k = createKnowledge();
  for (let i = 0; i < 3; i += 1) updateKnowledge(k, SUB, { outcome: 1, strength: 0.5, itemB: levelToB(3), floor: true, now });
  const theta = thetaOf(k, SUB, now);
  assert.ok(theta >= KNOWLEDGE_CONFIG.basics.minTheta, `θ ${theta}`);
  assert.ok(predictedSuccess(theta, levelToB(3)) >= KNOWLEDGE_CONFIG.band.pHigh - 1e-3, "a known item sits at the easy edge of the band");
  // Levels 1-2 are now penalised on top of the band weight; the known level-3 item is not.
  for (const level of [1, 2]) {
    const off = itemKnowledgeMultiplier(item(level), k, { now, basicsSuppression: false });
    assert.ok(Math.abs(itemKnowledgeMultiplier(item(level), k, { now }) - off * KNOWLEDGE_CONFIG.basics.penalty) < 1e-12, `level ${level}`);
  }
  assert.equal(itemKnowledgeMultiplier(item(3), k, { now }), itemKnowledgeMultiplier(item(3), k, { now, basicsSuppression: false }));
  // With the old .2 margin the same three answers left θ under minTheta and nothing was suppressed.
  const old = createKnowledge();
  for (let i = 0; i < 3; i += 1) updateKnowledge(old, SUB, { outcome: 1, strength: 0.5, itemB: levelToB(3), floor: true, now, config: { knewFloorMargin: 0.2 } });
  assert.ok(thetaOf(old, SUB, now) < KNOWLEDGE_CONFIG.basics.minTheta);
});

test("cold subjects and items without difficulty return 1", () => {
  assert.equal(itemKnowledgeMultiplier(item(5), createKnowledge(), { now }), 1);
  assert.equal(itemKnowledgeMultiplier(item(5), withTheta(2.5, 1), { now }), 1, "below minEvidence");
  assert.equal(itemKnowledgeMultiplier(item(undefined, { difficulty: undefined }), withTheta(2.5, 9), { now }), 1);
});

test("heuristic difficulty follows content type and tags", () => {
  assert.deepEqual(estimateDifficulty({ contentTypes: ["analysis"] }), { level: 4, b: 1, source: "heuristic" });
  assert.equal(estimateDifficulty({ contentTypes: ["meme"], tags: ["funny"] }).level, 1);
  assert.equal(estimateDifficulty({ contentTypes: ["discussion"], tags: ["diagram", "stats"] }).level, 4);
  assert.equal(estimateDifficulty({ contentTypes: ["analysis"], tags: ["technical"] }).level, 5);
  assert.equal(estimateDifficulty({ contentTypes: ["highlight"], tags: ["reaction"] }).level, 1);
  assert.equal(estimateDifficulty({}).level, 2);
  assert.deepEqual(estimateDifficulty({ difficulty: { level: 4 } }), { level: 4, b: 1, source: "label" });
  assert.equal(estimateDifficulty({ difficulty: 9 }).level, 5);
});

test("withDifficulty leaves heuristic-only items at depth 1", () => {
  const raw = { id: "h", taxonomyVersion: "entertainment-v2", depth: 1, stepId: "s", contentTypes: ["analysis"], tags: ["technical"] };
  const out = withDifficulty(raw);
  assert.equal(out.depth, 1);
  assert.equal(out.stepId, "s");
  assert.equal(out.difficulty.source, "heuristic");
  assert.equal(raw.difficulty, undefined, "input untouched");
});

test("labelled entertainment-v2 items map to virtual depths", () => {
  const depth = (level, opts) => withDifficulty({ id: "l", taxonomyVersion: "entertainment-v2", depth: 1, stepId: "s", difficulty: level }, opts);
  assert.deepEqual([1, 2, 3, 4, 5].map((l) => depth(l).depth), [1, 1, 2, 2, 3]);
  assert.equal(depth(5).stepId, "level-3");
  assert.equal(depth(5, { virtualDepth: false }).depth, 1);
  assert.equal(withDifficulty({ id: "x", taxonomyVersion: "legacy", depth: 2, difficulty: 5 }).depth, 2, "other taxonomies keep their depth");
  assert.equal(withDifficulty(depth(4)).depth, 2, "re-running is stable");
});

test("labels switch at the thresholds and need evidence", () => {
  assert.equal(knowledgeLabel(3, 1), null);
  assert.equal(knowledgeLabel(0.74, 2), "Familiar");
  assert.equal(knowledgeLabel(0.75, 2), "Proficient");
  assert.equal(knowledgeLabel(1.74, 5), "Proficient");
  assert.equal(knowledgeLabel(1.75, 5), "Mastered");
});

test("frontier rises with θ and summary lists the best-evidenced subjects", () => {
  assert.equal(thetaToFrontier(0), 1);
  assert.equal(thetaToFrontier(1.75), 2);
  assert.equal(thetaToFrontier(3), 3);
  const k = { subjects: { [SUB]: { theta: 1, n: 5, at: now }, "music/jazz": { theta: 2, n: 9, at: now }, "art/ink": { theta: 0, n: 1, at: now } } };
  const s = knowledgeSummary(k, { now, top: 2 });
  assert.deepEqual(s.map((x) => x.id), ["music/jazz", SUB]);
  assert.deepEqual(s[1], { id: SUB, theta: 1, level: 4, label: "Proficient", n: 5, band: { lo: 2.3, hi: 3.2 } });
});
