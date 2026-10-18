import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { applyRoute, buildTopicLinks, circlingIndex, composeFeed, createRng, createUserState, DEFAULT_CONFIG, engagementSignal, engineConfig, indexCatalog, lift, markShown, recencyConfig, recordEvent, skipEscalationFor, slotKey } from "../lib/feed/engine.mjs";
import { withDifficulty } from "../lib/feed/knowledge.mjs";
import { invertRoute, routeEvent } from "../lib/feed/signals.mjs";
import { LEGACY_PERSONAS as PERSONAS, runSimulation, SIMULATION_START, syntheticCatalog, syntheticEmbeddings } from "../lib/feed/simulator.mjs";
import { nearestInMemory, similarCandidates } from "../lib/feed/taste.mjs";
import { loadLegacyTaxonomy as loadTaxonomy, loadTaxonomy as loadEntertainment } from "../lib/feed/taxonomy/index.mjs";

// The 60 core topics: a fixed catalog keeps these seeded behaviour checks stable as personal topics are added.
const topics = loadTaxonomy().filter((t) => t.pool === "main");
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

// Catalog dated up to the simulation start, so item ages are real (the shared index above is newer than it).
const dated = indexCatalog(syntheticCatalog(topics, { perHorizontal: 6, now: SIMULATION_START }), { topicLinks: buildTopicLinks(topics) });

test("the latest preset serves much newer posts than balanced without breaking spacing", () => {
  const run = (mode) => runSimulation({ persona: persona("casual-foodie"), index: dated, batches: 40, seed: 7, config: recencyConfig(mode) }).metrics;
  const balanced = run("balanced");
  const fresh = run("fresh");
  const latest = run("latest");
  assert.ok(fresh.medianAgeDays < balanced.medianAgeDays, `fresh ${fresh.medianAgeDays}d vs balanced ${balanced.medianAgeDays}d`);
  assert.ok(latest.medianAgeDays < fresh.medianAgeDays, `latest ${latest.medianAgeDays}d vs fresh ${fresh.medianAgeDays}d`);
  assert.ok(latest.shareLastWeek > balanced.shareLastWeek * 2.5, `last-week share ${balanced.shareLastWeek} → ${latest.shareLastWeek}`);
  assert.equal(latest.sameHorizontalBackToBack, 0);
  // Learning under latest is checked across seeds: seed 7 alone flips with any skip tuning (it is one of 3/24 seeds that miss).
  const learns = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => runSimulation({ persona: persona("casual-foodie"), index: dated, batches: 40, seed, config: recencyConfig("latest") }).metrics).filter((m) => m.interestShareLate > m.interestShareEarly).length;
  assert.ok(learns >= 6, `still learns interests in ${learns}/8 seeds`);
});

test("the fresh slot honours its share and age cap, and falls back when nothing is young enough", () => {
  const counts = (config) => {
    const batch = composeFeed(createUserState(), dated, { now: SIMULATION_START, rng: createRng(5), config });
    return batch.filter((e) => e.slot === "fresh");
  };
  const latest = counts(recencyConfig("latest"));
  assert.ok(latest.length >= 3, `latest batch has ${latest.length} fresh items`);
  for (const e of latest) assert.ok(SIMULATION_START - Date.parse(e.item.createdAt) <= 7 * 86400000, "within the 7-day cap");
  const stale = counts({ ...recencyConfig("latest"), freshMaxAgeDays: 0 });
  assert.ok(stale.length >= 3, "an empty young pool falls back to the newest items");
});

test("unknown recency modes fall back to the balanced defaults", () => {
  assert.deepEqual(recencyConfig("nope"), {});
  assert.deepEqual(recencyConfig("balanced"), {});
});

test("an empty catalog yields an empty batch instead of failing", () => {
  const empty = indexCatalog([]);
  for (const mode of ["balanced", "latest"]) assert.deepEqual(composeFeed(createUserState(), empty, { rng: createRng(1), config: recencyConfig(mode) }), []);
});

// ------------------------------------------------------------------------------------------------
// Signal routing, bias and composition modes.

const allItems = [...index.byId.values()];
const subOf = (i) => `${i.topicId}/${i.subtopicId}`;
const SEPT = Date.parse("2026-09-01");

test("engagementSignal keeps the legacy numbers, caps dwell and keeps the unknown fallback", () => {
  assert.deepEqual(engagementSignal({ type: "like" }), { success: 1, weight: 1.2 });
  assert.deepEqual(engagementSignal({ type: "save" }), { success: 1, weight: 1.6 });
  assert.deepEqual(engagementSignal({ type: "hide" }), { success: 0, weight: 2.5 });
  assert.deepEqual(engagementSignal({ type: "skip" }), { success: 0, weight: 0.8 });
  assert.equal(engagementSignal({ type: "dwell", dwellMs: 9000 }).success, DEFAULT_CONFIG.dwellSuccessCap);
  assert.equal(engagementSignal({ type: "dwell", dwellMs: 9000 }, { dwellSuccessCap: 0.85 }).success, 0.85);
  assert.deepEqual(engagementSignal({ type: "knew_this" }), { success: 0, weight: 0 });
  assert.deepEqual(engagementSignal({ type: "mystery" }), { success: 0.2, weight: 0.2 });
  assert.equal(slotKey("explore"), "__slot__:explore");
});

test("applyRoute with sign -1 (or an inverted route) undoes interest without reverting the frontier", () => {
  const deep = allItems.find((i) => i.topicId === "pc-building" && i.subtopicId === "cooling" && i.depth === 2);
  const route = routeEvent({ type: "like" }, { item: deep, config: DEFAULT_CONFIG });
  for (const undo of [(s) => applyRoute(s, deep, route, { now: SEPT, sign: -1 }), (s) => applyRoute(s, deep, invertRoute(route), { now: SEPT })]) {
    const state = createUserState();
    applyRoute(state, deep, route, { now: SEPT });
    assert.equal(state.events, 1);
    assert.equal(state.frontier["pc-building/cooling"], 2);
    undo(state);
    assert.equal(state.events, 0);
    for (const node of Object.values(state.nodes)) assert.ok(node.s < 1e-9 && node.f < 1e-9, "interest subtracted back to zero");
    assert.equal(state.frontier["pc-building/cooling"], 2, "frontier is not reverted");
  }
});

test("single skips stay in the subject; a run of skips escalates to the topic and a like resets the run", () => {
  const config = { ...DEFAULT_CONFIG, skipRunThreshold: 3 };
  const sub = allItems.filter((i) => subOf(i) === subOf(allItems[0]));
  const state = createUserState();
  recordEvent(state, sub[0], { type: "skip" }, { now: SEPT, config });
  assert.equal(state.nodes[sub[0].topicId], undefined, "one skip does not touch the topic node");
  assert.ok(state.nodes[subOf(sub[0])].f > 0, "the subject still learns");
  recordEvent(state, sub[1], { type: "skip" }, { now: SEPT, config });
  assert.equal(state.nodes[sub[0].topicId], undefined);
  assert.equal(skipEscalationFor(state, sub[2], { config }).escalate, true);
  recordEvent(state, sub[2], { type: "skip" }, { now: SEPT, config });
  assert.ok(state.nodes[sub[0].topicId].f > 0, "the third skip in a row penalises the topic");
  recordEvent(state, sub[3], { type: "like" }, { now: SEPT, config });
  assert.equal(state.skipRuns[subOf(sub[0])], undefined, "a like in the subject resets the run");
  assert.equal(skipEscalationFor(state, sub[4], { config }).run, 1);
});

test("a skip run outlives a subject's gap between appearances, so a disliked topic is still penalised (topic spread stays 0)", () => {
  const sub = allItems.filter((i) => subOf(i) === subOf(allItems[0]));
  const others = allItems.filter((i) => i.topicId !== allItems[0].topicId).slice(0, 60);
  const state = createUserState();
  recordEvent(state, sub[0], { type: "skip" }, { now: SEPT });
  assert.equal(state.nodes[sub[0].topicId], undefined, "a single skip never touches the topic");
  assert.equal(state.nodes[subOf(sub[0])].f, 0.8 * DEFAULT_CONFIG.skipSpread.sub);
  // The subject comes back ~50 events later (a few batches): the run is still live and the second skip escalates.
  for (const item of others.slice(0, 50)) recordEvent(state, item, { type: "like" }, { now: SEPT });
  recordEvent(state, sub[1], { type: "skip" }, { now: SEPT });
  assert.ok(state.nodes[sub[0].topicId]?.f > 0, "the second skip in the run reaches the topic");
  // At the old 30-event window the run had expired and the topic was never penalised.
  const old = { skipRunWindowEvents: 30 };
  const legacy = createUserState();
  recordEvent(legacy, sub[0], { type: "skip" }, { now: SEPT, config: old });
  for (const item of others.slice(0, 50)) recordEvent(legacy, item, { type: "like" }, { now: SEPT, config: old });
  recordEvent(legacy, sub[1], { type: "skip" }, { now: SEPT, config: old });
  assert.equal(legacy.nodes[sub[0].topicId], undefined);
});

test("skipRunThreshold 1 reproduces the legacy skip exactly", () => {
  const item = allItems[0];
  const state = recordEvent(createUserState(), item, { type: "skip" }, { now: SEPT, config: { skipRunThreshold: 1 } });
  const legacy = { horizontal: 1, step: 0.9, sub: 0.8, topic: 0.6 };
  const keys = { topic: item.topicId, sub: subOf(item), step: `${subOf(item)}/${item.stepId}`, horizontal: `${subOf(item)}/${item.stepId}/${item.horizontalId}` };
  for (const [level, key] of Object.entries(keys)) assert.deepEqual(state.nodes[key], { s: 0, f: 0.8 * legacy[level], at: SEPT, ev: 0 });
  assert.deepEqual(state.nodes.__all__, { s: 0, f: 0.8, at: SEPT, ev: 0 });
});

test("engineConfig fills partial overrides with the defaults", () => {
  assert.equal(engineConfig(), DEFAULT_CONFIG);
  const cfg = engineConfig({ eventDecay: 0.99 });
  assert.equal(cfg.eventDecay, 0.99);
  assert.equal(cfg.halfLifeMs, DEFAULT_CONFIG.halfLifeMs);
  assert.equal(cfg.profileFree, false);
  assert.equal(cfg.exploreBoost, 0);
});

// Snapshot of composeFeed taken before signal routing and bias landed (likes/saves/hides and legacy skips only).
test("a null bias leaves composition byte-identical for a fixed seed", () => {
  const embeddings = syntheticEmbeddings(allItems);
  const config = { ...DEFAULT_CONFIG, skipRunThreshold: 1 };
  const loved = new Set(["dogs", "coffee", "pc-building"]);
  const state = createUserState();
  const rng = createRng(77);
  let now = SEPT;
  const out = [];
  for (let b = 0; b < 20; b += 1) {
    const anchor = allItems[(b * 97) % allItems.length];
    const similar = b >= 5 ? { candidates: similarCandidates({ recent: nearestInMemory(embeddings.get(anchor.id), embeddings, { limit: 40, exclude: new Set(state.seen) }) }, index.byId), readiness: 0.8 } : null;
    const batch = composeFeed(state, index, { now, rng, similar, bias: null });
    out.push(batch.map((e) => [e.item.id, e.slot, e.reason, e.similarity ?? null]));
    markShown(state, batch, { now });
    batch.forEach((e, i) => {
      now += 5000;
      const type = loved.has(e.item.topicId) ? (i % 2 ? "like" : "save") : i % 7 === 3 ? "hide" : "skip";
      recordEvent(state, e.item, { type }, { now, config });
    });
    now += 60000;
  }
  assert.equal(createHash("sha1").update(JSON.stringify(out)).digest("hex"), "d1240f7d088b0031dfb805420bdd3d566d345688");
});

// A reader who loves coffee and dogs, for the bias tests.
function warmReader() {
  const state = createUserState();
  for (const item of allItems.filter((i) => ["coffee", "dogs"].includes(i.topicId) && i.depth === 1).slice(0, 40)) recordEvent(state, item, { type: "like" }, { now: SEPT });
  for (const item of allItems.filter((i) => !["coffee", "dogs"].includes(i.topicId)).filter((_, k) => k % 37 === 0).slice(0, 40)) recordEvent(state, item, { type: "skip" }, { now: SEPT });
  return state;
}

test("muted topics and subjects never appear over a 30-batch run, even as similar candidates", () => {
  const embeddings = syntheticEmbeddings(allItems);
  const state = warmReader();
  const mutedSub = subOf(allItems.find((i) => i.topicId === "dogs"));
  const bias = { excludeTopics: new Set(["coffee"]), excludeSubs: new Set([mutedSub]) };
  const rng = createRng(3);
  let now = SEPT;
  for (let b = 0; b < 30; b += 1) {
    const anchor = allItems.find((i) => i.topicId === "coffee" && !state.seen.includes(i.id));
    const similar = { candidates: similarCandidates({ recent: nearestInMemory(embeddings.get(anchor.id), embeddings, { limit: 40, exclude: new Set(state.seen) }) }, index.byId), readiness: 1 };
    const batch = composeFeed(state, index, { now, rng, similar, bias });
    assert.ok(batch.length >= DEFAULT_CONFIG.batchSize - 1, `batch ${b} still fills (${batch.length})`);
    for (const e of batch) {
      assert.notEqual(e.item.topicId, "coffee", "muted topic");
      assert.notEqual(subOf(e.item), mutedSub, "muted subject");
    }
    markShown(state, batch, { now });
    now += 60000;
  }
});

test("an item weight of 0 drops items everywhere; muting every topic yields an empty batch", () => {
  const blocked = (item) => Number(item.id.slice(4)) % 2 === 0;
  const state = warmReader();
  const rng = createRng(8);
  for (let b = 0; b < 10; b += 1) {
    const batch = composeFeed(state, index, { now: SEPT, rng, bias: { itemWeight: (item) => (blocked(item) ? 0 : 1) } });
    assert.ok(batch.length > 0 && batch.every((e) => !blocked(e.item)));
    markShown(state, batch, { now: SEPT });
  }
  assert.deepEqual(composeFeed(state, index, { now: SEPT, rng, bias: { excludeTopics: new Set(index.topics.keys()) } }), []);
});

test("boosted topics join the core pool and show up more", () => {
  const share = (bias) => {
    const state = warmReader();
    const rng = createRng(12);
    let hits = 0;
    let total = 0;
    for (let b = 0; b < 20; b += 1) {
      const batch = composeFeed(state, index, { now: SEPT, rng, bias });
      hits += batch.filter((e) => e.item.topicId === "baking").length;
      total += batch.length;
      markShown(state, batch, { now: SEPT });
    }
    return hits / total;
  };
  const plain = share(null);
  const boosted = share({ boostTopics: new Set(["baking"]) });
  assert.ok(boosted > plain * 2, `baking share ${plain.toFixed(3)} → ${boosted.toFixed(3)}`);
});

test("maxDepthFor stops probes past the governor's cap", () => {
  const probes = (bias) => {
    const state = createUserState();
    for (const item of allItems.filter((i) => subOf(i) === "pc-building/cooling" && i.depth === 1).slice(0, 15)) recordEvent(state, item, { type: "like" }, { now: SEPT });
    for (const item of allItems.filter((i) => i.topicId !== "pc-building").filter((_, k) => k % 41 === 0).slice(0, 30)) recordEvent(state, item, { type: "skip" }, { now: SEPT });
    const rng = createRng(4);
    let count = 0;
    for (let b = 0; b < 20; b += 1) {
      const batch = composeFeed(state, index, { now: SEPT, rng, bias });
      count += batch.filter((e) => e.slot === "probe").length;
      markShown(state, batch, { now: SEPT });
    }
    return count;
  };
  assert.ok(probes(null) > 0, "probes run without a cap");
  assert.equal(probes({ maxDepthFor: () => 1 }), 0);
});

test("steering candidates claim a minimum share with a request reason and a steered flag", () => {
  const embeddings = syntheticEmbeddings(allItems);
  const anchor = allItems.find((i) => i.topicId === "camping" && i.depth === 1);
  const rows = nearestInMemory(embeddings.get(anchor.id), embeddings, { limit: 40 });
  const similar = { candidates: similarCandidates({ "steer:r1": rows }, index.byId), readiness: 0, minShare: 0.3, labels: { "steer:r1": "camping in the rain" } };
  const batch = composeFeed(createUserState(), index, { now: SEPT, rng: createRng(2), similar });
  const steered = batch.filter((e) => e.steered);
  assert.ok(steered.length >= 2, `${steered.length} steered items`);
  for (const e of steered) {
    assert.equal(e.slot, "similar");
    assert.equal(e.reason, `matches your request "camping in the rain"`);
  }
  assert.ok(batch.filter((e) => !e.steered).every((e) => !("steered" in e)));
});

test("profileFree serves only fresh, non-personalised items regardless of learned interest", () => {
  const config = { profileFree: true, similarShare: 0, mixJitter: 0, freshShare: 1, freshPoolSize: 400 };
  const warm = warmReader();
  const cold = { ...createUserState(), history: warm.history, seen: warm.seen };
  const nodes = JSON.stringify(warm.nodes);
  const batch = composeFeed(warm, index, { now: SEPT, rng: createRng(6), config });
  assert.equal(batch.length, DEFAULT_CONFIG.batchSize);
  assert.ok(batch.every((e) => e.slot === "fresh" && e.reason === "not personalised — newest and popular"));
  assert.equal(JSON.stringify(warm.nodes), nodes, "nothing learned");
  const coldBatch = composeFeed(cold, index, { now: SEPT, rng: createRng(6), config });
  assert.deepEqual(coldBatch.map((e) => e.item.id), batch.map((e) => e.item.id), "interest plays no part");
});

test("exploreBoost widens the explore share", () => {
  const count = (exploreBoost) => {
    const state = warmReader();
    let explore = 0;
    for (let seed = 1; seed <= 20; seed += 1) explore += composeFeed(state, index, { now: SEPT, rng: createRng(seed), config: { exploreBoost } }).filter((e) => e.slot === "explore").length;
    return explore;
  };
  const base = count(0);
  const boosted = count(0.6);
  assert.ok(boosted > base * 1.5, `explore slots ${base} → ${boosted}`);
});

test("markShown records sensitive themes and emotion only for labelled items", () => {
  const state = createUserState();
  const labelled = { ...allItems[1], sensitive: ["gore"], emotion: { bucket: "angry", intensity: 0.8 } };
  markShown(state, [{ item: allItems[0], slot: "core" }, { item: labelled, slot: "fresh" }, { item: { ...allItems[2], emotion: "neutral", sensitive: [] }, slot: "core" }], { now: SEPT });
  assert.ok(!("sens" in state.history[0]) && !("emo" in state.history[0]) && !("int" in state.history[0]));
  assert.deepEqual([state.history[1].sens, state.history[1].emo, state.history[1].int], [["gore"], "angry", 0.8]);
  assert.ok(!("sens" in state.history[2]) && !("emo" in state.history[2]));
});

test("labelled entertainment items get virtual depth, so frontier probes come back to life", () => {
  const ent = loadEntertainment();
  const catalog = syntheticCatalog(ent, { perHorizontal: 6, now: SIMULATION_START }).map((item) => {
    const n = Number(item.id.slice(4));
    return withDifficulty(n % 3 === 0 ? { ...item, difficulty: { level: 4 } } : n % 3 === 1 ? { ...item, difficulty: { level: 2 } } : item);
  });
  const plain = catalog.find((i) => Number(i.id.slice(4)) % 3 === 2);
  assert.deepEqual([plain.depth, plain.stepId], [1, "content"], "heuristic difficulty never changes depth");
  const hard = catalog.find((i) => Number(i.id.slice(4)) % 3 === 0);
  assert.deepEqual([hard.depth, hard.stepId], [2, "level-2"]);
  const entIndex = indexCatalog(catalog, { topicLinks: buildTopicLinks(ent) });
  const target = subOf(catalog[0]);
  const state = createUserState();
  for (const item of catalog.filter((i) => subOf(i) === target && i.depth === 1).slice(0, 12)) recordEvent(state, item, { type: "like" }, { now: SIMULATION_START });
  for (const item of catalog.filter((i) => i.topicId !== catalog[0].topicId).filter((_, k) => k % 29 === 0).slice(0, 25)) recordEvent(state, item, { type: "skip" }, { now: SIMULATION_START });
  const rng = createRng(5);
  let probe = null;
  for (let b = 0; b < 30 && !probe; b += 1) {
    const batch = composeFeed(state, entIndex, { now: SIMULATION_START, rng });
    probe = batch.find((e) => e.slot === "probe" && subOf(e.item) === target) || null;
    markShown(state, batch, { now: SIMULATION_START });
  }
  assert.ok(probe, "a labelled subject is probed one level deeper");
  assert.equal(probe.item.depth, 2);
  recordEvent(state, probe.item, { type: "like" }, { now: SIMULATION_START });
  assert.equal(state.frontier[target], 2);
});
