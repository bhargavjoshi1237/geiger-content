import test from "node:test";
import assert from "node:assert/strict";
import { buildTopicLinks, circlingIndex, composeFeed, createRng, createUserState, DEFAULT_CONFIG, indexCatalog, lift, markShown, recordEvent } from "../lib/feed/engine.mjs";
import { PERSONAS, runSimulation, syntheticCatalog } from "../lib/feed/simulator.mjs";
import { loadTaxonomy } from "../lib/feed/taxonomy/index.mjs";

const topics = loadTaxonomy();
const index = indexCatalog(syntheticCatalog(topics, { perHorizontal: 6, now: Date.parse("2026-09-30") }), { topicLinks: buildTopicLinks(topics) });
const persona = (id) => PERSONAS.find((p) => p.id === id);

test("a cold feed explores many topics and never repeats an item", () => {
  const state = createUserState();
  const rng = createRng(3);
  const ids = new Set();
  let now = Date.parse("2026-09-01");
  for (let b = 0; b < 5; b += 1) {
    const batch = composeFeed(state, index, { now, rng });
    assert.equal(batch.length, DEFAULT_CONFIG.batchSize);
    for (const e of batch) { assert.ok(!ids.has(e.item.id), "no repeats"); ids.add(e.item.id); }
    assert.ok(new Set(batch.map((e) => e.item.topicId)).size >= 7, "cold batches are broad");
    markShown(state, batch, { now });
    now += 60000;
  }
});

test("spacing rules hold across a long session for every persona", () => {
  for (const p of PERSONAS) {
    const { metrics } = runSimulation({ persona: p, index, batches: 40, seed: 11 });
    assert.equal(metrics.sameHorizontalBackToBack, 0, `${p.id}: same horizontal back to back`);
    assert.equal(metrics.crowdedWindows, 0, `${p.id}: >3 of one topic in a window of 6`);
    assert.ok(metrics.maxSameTopicRun <= DEFAULT_CONFIG.maxTopicRun, `${p.id}: topic run ${metrics.maxSameTopicRun}`);
    assert.ok(metrics.distinctTopicsPerBatch >= 5.5, `${p.id}: ${metrics.distinctTopicsPerBatch} topics per batch`);
  }
});

test("the feed finds a persona's interests without circling them", () => {
  const { metrics } = runSimulation({ persona: persona("casual-foodie"), index, batches: 60, seed: 5 });
  assert.ok(metrics.interestShareLate > metrics.interestShareEarly, `${metrics.interestShareEarly} → ${metrics.interestShareLate}`);
  assert.ok(metrics.interestShareLate >= 0.35, `late share ${metrics.interestShareLate}`);
  assert.ok(metrics.circlingIndex <= 0.75, `circling ${metrics.circlingIndex}`);
});

test("interest discovery is robust across seeds, not one lucky run", () => {
  const readers = ["aio-to-custom-loops", "casual-foodie", "outdoor-dog-owner"];
  let found = 0;
  let runs = 0;
  for (const id of readers)
    for (let seed = 1; seed <= 8; seed += 1) {
      const { metrics } = runSimulation({ persona: persona(id), index, batches: 60, seed });
      runs += 1;
      if (metrics.interestShareLate >= 0.3 && metrics.interestShareLate > metrics.interestShareEarly) found += 1;
    }
  assert.ok(found / runs >= 0.8, `found interests in ${found}/${runs} runs`);
});

test("quiet probes walk an AIO owner down to custom loops and beyond", () => {
  const { metrics, timeline } = runSimulation({ persona: persona("aio-to-custom-loops"), index, batches: 60, seed: 9 });
  assert.ok(metrics.focusDepthReached >= 3, `reached depth ${metrics.focusDepthReached}`);
  const depthsSeen = timeline.map((t) => t.focusDepth);
  for (let i = 1; i < depthsSeen.length; i += 1) assert.ok(depthsSeen[i] - depthsSeen[i - 1] <= 1, "depth advances one step at a time");
  const probeShare = timeline.flatMap((t) => t.slots).filter((s) => s === "probe").length / (timeline.length * DEFAULT_CONFIG.batchSize);
  assert.ok(probeShare < 0.15, `probes stay quiet (${probeShare.toFixed(3)})`);
});

test("a liked subtopic gains lift relative to the user's baseline", () => {
  const state = createUserState();
  const now = Date.parse("2026-09-01");
  const items = [...index.byId.values()];
  const loved = items.filter((i) => i.topicId === "coffee").slice(0, 6);
  const ignored = items.filter((i) => i.topicId !== "coffee").slice(0, 30);
  for (const item of loved) recordEvent(state, item, { type: "like" }, { now });
  for (const item of ignored) recordEvent(state, item, { type: "skip" }, { now });
  assert.ok(lift(state, "coffee", now) > 2, `coffee lift ${lift(state, "coffee", now)}`);
  assert.ok(lift(state, ignored[0].topicId, now) < 1, "skipped topics fall below baseline");
});

test("a missed probe backs off before probing that subtopic again", () => {
  const state = createUserState();
  const now = Date.parse("2026-09-01");
  const deep = [...index.byId.values()].find((i) => i.topicId === "pc-building" && i.subtopicId === "cooling" && i.depth === 2);
  recordEvent(state, deep, { type: "skip" }, { now });
  assert.ok(state.probes["pc-building/cooling"].cooldownUntilShown > state.shown);
  recordEvent(state, deep, { type: "save" }, { now });
  assert.equal(state.frontier["pc-building/cooling"], 2);
});

test("same seed, same feed", () => {
  const run = () => runSimulation({ persona: persona("outdoor-dog-owner"), index, batches: 12, seed: 21 }).timeline.map((t) => t.topics.join(",")).join("|");
  assert.equal(run(), run());
});

test("circling index measures how concentrated recent impressions are", () => {
  assert.equal(circlingIndex([{ topic: "a" }, { topic: "a" }, { topic: "b" }, { topic: "c" }, { topic: "d" }]), 0.8);
});
