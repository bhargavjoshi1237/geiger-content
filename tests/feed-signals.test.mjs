import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SIGNAL_TABLE, EMOTION_IDS, EVENT_TYPES, HIDE_REASONS, invertRoute, normalizeEvent, routeEvent, skipEscalation, SPREADS } from "../lib/feed/signals.mjs";

// The pre-routing engagementSignal, frozen here for parity checks.
function legacySignal(event = {}) {
  const dwell = Number(event.dwellMs || 0);
  switch (event.type) {
    case "save":
    case "share": return { success: 1, weight: 1.6 };
    case "like": return { success: 1, weight: 1.2 };
    case "comment": return { success: 0.9, weight: 1.2 };
    case "hide": return { success: 0, weight: 2.5 };
    case "skip": return { success: 0, weight: 0.8 };
    case "dwell": return dwell >= 2500 ? { success: Math.min(0.85, 0.45 + dwell / 20000), weight: 0.7 } : { success: 0.1, weight: 0.5 };
    default: return { success: 0.2, weight: 0.2 };
  }
}
const legacyPositive = (e) => { const { success, weight } = legacySignal(e); return success > 0.5 ? weight * (success - 0.5) * 2 : 0; };

const item = { id: "p1", topicId: "gaming", subtopicId: "speedruns", stepId: "s1", horizontalId: "h1", depth: 1 };
const SUB = "gaming/speedruns";
const route = (event, ctx = {}) => routeEvent(event, { item, ...ctx });
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg ?? ""} ${a} != ${b}`);
const interestOf = (r) => r.interest && { success: r.interest.success, weight: r.interest.weight };

test("legacy parity: like, save, share, comment, hide, skip and dwell keep the old numbers", () => {
  const legacyCap = { dwellSuccessCap: 0.85, skipRunThreshold: 1 };
  for (const event of [{ type: "like" }, { type: "save" }, { type: "share" }, { type: "comment" }, { type: "hide" }, { type: "skip" }, { type: "dwell", dwellMs: 900 }, { type: "dwell", dwellMs: 2500 }, { type: "dwell", dwellMs: 9000 }, { type: "dwell", dwellMs: 60000 }]) {
    const r = route(event, { config: legacyCap, escalateSkip: true });
    const old = legacySignal(event);
    close(r.interest.success, old.success, `${event.type} success`);
    close(r.interest.weight, old.weight, `${event.type} weight`);
    if (event.type !== "skip") assert.deepEqual(r.interest.spread, SPREADS.FULL, `${event.type} spreads fully`);
    const positive = legacyPositive(event);
    if (positive > 0) { close(r.liking.long, positive); close(r.liking.short, positive); }
  }
  assert.deepEqual(route({ type: "skip" }, { escalateSkip: true }).interest.spread, SPREADS.FULL, "an escalated skip spreads like the legacy skip");
  assert.equal(route({ type: "hide" }).liking.negative, 2.5);
  // Short dwells sit under the new cap, so they match without any override.
  for (const dwellMs of [0, 1000, 2600]) assert.deepEqual(interestOf(route({ type: "dwell", dwellMs })), legacySignal({ type: "dwell", dwellMs }));
});

test("dwell success is capped by dwellSuccessCap (default .6)", () => {
  close(route({ type: "dwell", dwellMs: 60000 }).interest.success, 0.6);
  close(route({ type: "dwell", dwellMs: 60000 }, { config: { dwellSuccessCap: 0.85 } }).interest.success, 0.85);
  const weak = route({ type: "dwell", dwellMs: 60000 }).liking;
  close(weak.long, 0.7 * 0.1 * 2, "weak legacy liking");
  assert.equal(route({ type: "dwell", dwellMs: 1000 }).liking, null, "short dwell has no liking");
});

test("unknown types keep the legacy fallback; undo routes nothing", () => {
  assert.deepEqual(interestOf(route({ type: "mystery" })), { success: 0.2, weight: 0.2 });
  assert.equal(route({ type: "mystery" }).liking, null);
  const undo = route({ type: "undo", of: "e1" });
  assert.deepEqual([undo.interest, undo.liking, undo.emotion, undo.knowledge, undo.stated], [null, null, null, null, null]);
});

test("like and save engage the item's emotion; save is a weak want-to-learn", () => {
  const liked = route({ type: "like", eid: "e1" }, { itemEmotion: { bucket: "amused", confidence: 0.5 } });
  assert.equal(liked.eid, "e1");
  assert.deepEqual(liked.liking, { long: 1.2, short: 1.2, negative: 0 });
  assert.deepEqual(liked.emotion, { bucket: "amused", kind: "engage", amount: 1 });
  assert.equal(liked.knowledge, null);
  const saved = route({ type: "save" }, { itemEmotion: "amazed" });
  assert.deepEqual(saved.liking, { long: 1.6, short: 1.6, negative: 0 });
  assert.deepEqual(saved.emotion, { bucket: "amazed", kind: "engage", amount: 1 });
  assert.deepEqual(saved.knowledge, { sub: SUB, outcome: 0.5, strength: 0.15 });
  assert.equal(route({ type: "like" }).emotion, null, "no emotion without a known bucket");
});

test("share carries its paired reaction at half strength, and only counts as interest when it is non-negative", () => {
  const happy = route({ type: "share", emotion: "amused" });
  assert.deepEqual(interestOf(happy), { success: 1, weight: 1.6 });
  assert.deepEqual(happy.liking, { long: 1.6, short: 1.6, negative: 0 });
  assert.deepEqual(happy.emotion, { bucket: "amused", kind: "react", amount: 0.5 });
  assert.deepEqual(route({ type: "share" }, { reaction: "moved" }).emotion, { bucket: "moved", kind: "react", amount: 0.5 });
  const angry = route({ type: "share", emotion: "angry" });
  assert.equal(angry.interest, null);
  assert.equal(angry.liking, null);
  assert.deepEqual(angry.emotion, { bucket: "angry", kind: "engage", amount: 1 });
  assert.equal(angry.flags.gated, true);
});

test("comment uses the legacy liking formula", () => {
  const r = route({ type: "comment" });
  assert.deepEqual(interestOf(r), { success: 0.9, weight: 1.2 });
  close(r.liking.long, 1.2 * 0.4 * 2);
  assert.deepEqual(r.interest.spread, SPREADS.FULL);
});

test("skip: a subject-level spread that spares the topic until escalated, short-term liking only, knowledge for liked basics", () => {
  const r = route({ type: "skip" });
  assert.deepEqual(interestOf(r), { success: 0, weight: 0.8 });
  assert.equal(r.interest.skip, true);
  // Subject at .7 (was .5; sibling contrast drives focus depth); the topic is spared.
  assert.deepEqual(r.interest.spread, { horizontal: 1, step: 0.9, sub: 0.7, topic: 0, all: 1 });
  assert.deepEqual(route({ type: "skip" }, { config: { skipSpread: SPREADS.HORIZONTAL_ONLY } }).interest.spread, SPREADS.HORIZONTAL_ONLY);
  assert.deepEqual(r.liking, { long: 0, short: -0.3, negative: 0 });
  assert.equal(r.knowledge, null, "no knowledge when the subject is not liked");
  const basics = { ...item, difficulty: { level: 2 } };
  assert.deepEqual(routeEvent({ type: "skip" }, { item: basics, subLiked: true }).knowledge, { sub: SUB, outcome: 1, strength: 0.15 });
  assert.equal(routeEvent({ type: "skip" }, { item: { ...item, difficulty: { level: 3 } }, subLiked: true }).knowledge, null, "advanced items say nothing");
  assert.equal(routeEvent({ type: "skip" }, { item, subLiked: true }).knowledge, null, "unlabelled items say nothing");
});

test("hide reasons route to their own stores", () => {
  const legacy = route({ type: "hide" });
  assert.deepEqual(interestOf(legacy), { success: 0, weight: 2.5 });
  assert.deepEqual(legacy.interest.spread, SPREADS.FULL);
  assert.deepEqual(legacy.liking, { long: 0, short: 0, negative: 2.5 });

  const one = route({ type: "hide", reason: "this_item" });
  assert.deepEqual(interestOf(one), { success: 0, weight: 2.5 });
  assert.deepEqual(one.interest.spread, SPREADS.HORIZONTAL_ONLY);
  assert.equal(one.liking.negative, 2.5);

  const topic = route({ type: "hide", reason: "this_topic" });
  assert.deepEqual(interestOf(topic), { success: 0, weight: 3 });
  assert.deepEqual(topic.interest.spread, SPREADS.SUB_STRONG);
  assert.equal(topic.liking.negative, 3);

  const seen = route({ type: "hide", reason: "seen_it" });
  assert.equal(seen.interest, null);
  assert.equal(seen.liking, null);
  assert.deepEqual(seen.knowledge, { sub: SUB, outcome: 1, strength: 0.6 });

  const upset = route({ type: "hide", reason: "upsetting" }, { itemEmotion: "disgusted" });
  assert.deepEqual(interestOf(upset), { success: 0, weight: 2.5 });
  assert.deepEqual(upset.interest.spread, SPREADS.HORIZONTAL_ONLY);
  assert.equal(upset.liking.negative, 2.5);
  assert.deepEqual(upset.emotion, { bucket: "disgusted", kind: "reject", amount: 1 });
  assert.equal(upset.knowledge, null);
  assert.deepEqual(HIDE_REASONS, ["this_item", "this_topic", "seen_it", "upsetting"]);
  assert.deepEqual(EMOTION_IDS, ["amused", "amazed", "moved", "curious", "sad", "angry", "disgusted"]);
});

test("reactions: positive ones are mild interest, negative ones only move emotion", () => {
  const cases = { amused: [0.6, 0.6, 1], amazed: [0.6, 0.6, 1], moved: [0.6, 0.4, 1], curious: [0.5, 0.3, 1] };
  for (const [emotion, [weight, liking]] of Object.entries(cases)) {
    const r = route({ type: "react", emotion });
    assert.deepEqual(interestOf(r), { success: 1, weight }, emotion);
    assert.deepEqual(r.interest.spread, SPREADS.REACT);
    assert.deepEqual(r.liking, { long: liking, short: liking, negative: 0 });
    assert.deepEqual(r.emotion, { bucket: emotion, kind: "react", amount: 1 });
    assert.equal(r.knowledge, null);
  }
  // Negative reactions carry no interest; sad stays a (capped) reaction, anger and disgust reject their bucket.
  for (const [emotion, kind] of [["sad", "react"], ["angry", "reject"], ["disgusted", "reject"]]) {
    const r = route({ type: "react", emotion });
    assert.equal(r.interest, null, emotion);
    assert.equal(r.liking, null, emotion);
    assert.deepEqual(r.emotion, { bucket: emotion, kind, amount: 1 });
  }
});

test("knowledge signals: knew_this, learned and knowledge probes", () => {
  const knew = route({ type: "knew_this" });
  assert.deepEqual([knew.interest, knew.liking, knew.emotion], [null, null, null]);
  assert.deepEqual(knew.knowledge, { sub: SUB, outcome: 1, strength: 0.5, floor: true });
  const learned = route({ type: "learned" });
  assert.deepEqual(interestOf(learned), { success: 1, weight: 0.8 });
  assert.deepEqual(learned.interest.spread, SPREADS.REACT);
  assert.deepEqual(learned.liking, { long: 0.6, short: 0.6, negative: 0 });
  assert.deepEqual(learned.knowledge, { sub: SUB, outcome: 0.5, strength: 0.6 });
  for (const [answer, outcome] of [["new", 0], ["some", 0.5], ["know", 1]]) {
    const r = route({ type: "probe_answer", probe: "knowledge", answer, sub: "film/noir" });
    assert.equal(r.interest, null);
    assert.deepEqual(r.knowledge, { sub: "film/noir", outcome, strength: 1 });
    assert.deepEqual(r.stated, { probe: "knowledge", answer, sub: "film/noir" });
  }
});

test("explore clicks, outbound links and interest probes", () => {
  const click = route({ type: "explore_click", source: "steer" });
  assert.deepEqual(interestOf(click), { success: 1, weight: 0.6 });
  assert.equal(click.interest.spread.topic, 0, "explore clicks stop at the subject");
  assert.deepEqual(click.liking, { long: 1, short: 1, negative: 0 });
  const out = route({ type: "outbound" });
  assert.deepEqual(interestOf(out), { success: 1, weight: 1.2 });
  assert.deepEqual(out.interest.spread, SPREADS.FULL);
  assert.equal(out.liking, null);
  for (const [answer, expected] of [["more", { success: 1, weight: 3 }], ["same", { success: 1, weight: 0.8 }], ["less", { success: 0, weight: 3 }]]) {
    const r = route({ type: "probe_answer", probe: "interest", answer, sub: SUB });
    assert.deepEqual(interestOf(r), expected, answer);
    assert.deepEqual(r.interest.spread, SPREADS.SUB_STRONG);
    assert.equal(r.liking, null);
    assert.deepEqual(r.stated, { probe: "interest", answer, sub: SUB });
  }
});

test("core rule 1: a negative-arousal reaction gates dwell, share, comment, like and save", () => {
  for (const type of ["dwell", "share", "comment", "like", "save"]) {
    const r = route({ type, dwellMs: 30000 }, { negativeReaction: true, reaction: "angry", itemEmotion: "amused" });
    assert.equal(r.interest, null, type);
    assert.equal(r.liking, null, type);
    assert.deepEqual(r.emotion, { bucket: "angry", kind: "engage", amount: 1 }, type);
    assert.equal(r.flags.gated, true);
  }
  assert.ok(route({ type: "skip" }, { negativeReaction: true }).interest, "negatives still count");
  assert.ok(route({ type: "hide", reason: "upsetting" }, { negativeReaction: true }).interest);
});

test("core rule 2: seen_it and knew_this never lower interest", () => {
  for (const event of [{ type: "hide", reason: "seen_it" }, { type: "knew_this" }]) {
    const r = route(event, { config: { negativeStrength: 3, signalWeights: { hide: 3 } } });
    assert.equal(r.interest, null);
    assert.equal(r.liking, null);
  }
});

test("negativeStrength doubles hide and skip weights and negative liking", () => {
  const config = { negativeStrength: 2 };
  const hide = route({ type: "hide" }, { config });
  close(hide.interest.weight, 5);
  close(hide.liking.negative, 5);
  close(route({ type: "hide", reason: "this_topic" }, { config }).interest.weight, 6);
  const skip = route({ type: "skip" }, { config });
  close(skip.interest.weight, 1.6);
  close(skip.liking.short, -0.6);
  close(route({ type: "like" }, { config }).interest.weight, 1.2, "positives are untouched");
  close(route({ type: "probe_answer", probe: "interest", answer: "less", sub: SUB }, { config }).interest.weight, 3, "stated answers are untouched");
});

test("signalWeights scale a signal, and a zero weight drops it entirely", () => {
  const off = route({ type: "like" }, { config: { signalWeights: { like: 0 } }, itemEmotion: "amused" });
  assert.equal(off.interest, null);
  assert.equal(off.liking, null);
  assert.ok(off.emotion, "emotion is not an interest weight");
  const loud = route({ type: "save" }, { config: { signalWeights: { save: 2 } } });
  close(loud.interest.weight, 3.2);
  assert.deepEqual(loud.liking, { long: 3.2, short: 3.2, negative: 0 });
  close(route({ type: "like" }, { config: { signalWeights: { save: 2 } } }).interest.weight, 1.2, "other signals are untouched");
});

test("a custom signal table overrides individual rows", () => {
  const config = { signalTable: { outbound: { interest: { success: 1, weight: 0.4, spread: "SUB_CAPPED" } } } };
  const r = route({ type: "outbound" }, { config });
  assert.deepEqual(interestOf(r), { success: 1, weight: 0.4 });
  assert.deepEqual(r.interest.spread, SPREADS.SUB_CAPPED);
  close(route({ type: "like" }, { config }).interest.weight, 1.2);
  assert.ok(Object.isFrozen(DEFAULT_SIGNAL_TABLE));
});

test("skipEscalation: run 1 stays local, run 2 escalates, threshold 1 is legacy, the window expires", () => {
  const runs = {};
  const step = (eventsCount, config = {}) => {
    const out = skipEscalation(runs, SUB, { eventsCount, config });
    runs[SUB] = { n: out.run, at: eventsCount };
    return out;
  };
  assert.deepEqual(step(10), { run: 1, escalate: false });
  assert.deepEqual(step(11), { run: 2, escalate: true });
  assert.deepEqual(step(12), { run: 3, escalate: true });
  assert.deepEqual(skipEscalation({}, SUB, { eventsCount: 0, config: { skipRunThreshold: 1 } }), { run: 1, escalate: true });
  // The default window is 100 events (was 30): a subject recurs only every few batches.
  assert.deepEqual(skipEscalation({ [SUB]: { n: 2, at: 0 } }, SUB, { eventsCount: 31 }), { run: 3, escalate: true }, "a run survives 30 events");
  assert.deepEqual(skipEscalation({ [SUB]: { n: 2, at: 0 } }, SUB, { eventsCount: 101 }), { run: 1, escalate: false }, "stale run restarts");
  assert.deepEqual(skipEscalation({ [SUB]: { n: 2, at: 0 } }, SUB, { eventsCount: 5, config: { skipRunWindowEvents: 4 } }), { run: 1, escalate: false });
  assert.deepEqual(skipEscalation({ [SUB]: { n: 2, at: 0 } }, SUB, { eventsCount: 30 }), { run: 3, escalate: true });
  assert.deepEqual(skipEscalation({ other: { n: 5, at: 0 } }, SUB, { eventsCount: 1 }), { run: 1, escalate: false }, "runs are per subject");
});

test("invertRoute negates interest and liking only, without mutating the original", () => {
  const original = route({ type: "like", eid: "e9" }, { itemEmotion: "amused" });
  const inverse = invertRoute(original);
  assert.equal(inverse.interest.weight, -1.2);
  assert.equal(inverse.interest.success, 1);
  assert.deepEqual(inverse.interest.spread, original.interest.spread);
  assert.deepEqual(inverse.liking, { long: -1.2, short: -1.2, negative: 0 });
  assert.deepEqual(inverse.emotion, original.emotion);
  assert.equal(inverse.eid, "e9");
  assert.equal(original.interest.weight, 1.2);
  assert.equal(invertRoute(route({ type: "knew_this" })).interest, null);
  assert.equal(invertRoute(route({ type: "hide" })).liking.negative, -2.5);
});

test("normalizeEvent validates types, fields and the post lookup", () => {
  const hasPost = (id) => id === "p1";
  assert.equal(normalizeEvent({ postId: "p1", type: "poke" }, { hasPost }), null);
  assert.equal(normalizeEvent({ postId: "p2", type: "like" }, { hasPost }), null, "unknown post");
  assert.equal(normalizeEvent(null), null);
  assert.deepEqual(normalizeEvent({ postId: 7, type: "like", junk: 1 }), { postId: "7", type: "like", dwellMs: 0, slot: null });
  assert.equal(normalizeEvent({ postId: "p1", type: "dwell", dwellMs: 9e9 }, { hasPost }).dwellMs, 600000);
  assert.equal(normalizeEvent({ postId: "p1", type: "dwell", dwellMs: -5 }, { hasPost }).dwellMs, 0);
  assert.equal(normalizeEvent({ postId: "p1", type: "like", slot: "x".repeat(50) }).slot.length, 20);
  assert.equal(normalizeEvent({ postId: "p1", type: "like", eid: "e".repeat(40) }).eid.length, 40);
  assert.equal(normalizeEvent({ postId: "p1", type: "like", eid: "e".repeat(41) }).eid, undefined, "over-long eid is dropped");
  assert.equal(normalizeEvent({ postId: "p1", type: "hide", reason: "bored" }).reason, undefined, "bad reason is dropped");
  assert.equal(normalizeEvent({ postId: "p1", type: "hide", reason: "seen_it" }).reason, "seen_it");
  assert.equal(normalizeEvent({ postId: "p1", type: "like", reason: "seen_it" }).reason, undefined, "reason only on hide");
  assert.equal(normalizeEvent({ postId: "p1", type: "react", emotion: "bored" }), null, "react needs a valid emotion");
  assert.equal(normalizeEvent({ postId: "p1", type: "react", emotion: "moved" }).emotion, "moved");
  assert.equal(normalizeEvent({ postId: "p1", type: "share", emotion: "bored" }).emotion, undefined);
  assert.equal(normalizeEvent({ postId: "p1", type: "explore_click", source: "steer" }).source, "steer");
  assert.equal(normalizeEvent({ postId: "p1", type: "explore_click", source: "ads" }).source, undefined);
  const probe = normalizeEvent({ postId: "p1", type: "probe_answer", probe: "interest", answer: "more", sub: SUB });
  assert.deepEqual([probe.probe, probe.answer, probe.sub], ["interest", "more", SUB]);
  assert.equal(normalizeEvent({ postId: "p1", type: "probe_answer", probe: "interest", answer: "know", sub: SUB }), null, "answer must match the probe kind");
  assert.equal(normalizeEvent({ postId: "p1", type: "probe_answer", probe: "knowledge", answer: "know", sub: "Bad Path" }), null);
  assert.equal(normalizeEvent({ postId: "p1", type: "probe_answer", probe: "knowledge", answer: "know", sub: "a/" + "b".repeat(80) }), null, "sub is at most 80 chars");
  assert.deepEqual(normalizeEvent({ type: "undo", of: "e1" }, { hasPost }), { postId: null, type: "undo", of: "e1" }, "undo needs no post");
  assert.equal(normalizeEvent({ type: "undo" }), null, "undo needs a target");
  assert.equal(normalizeEvent({ postId: "p1", type: "dwell", dwellMs: 3000, of: "e1", sub: SUB }, { hasPost }).of, undefined, "fields belong to their types");
});

test("every event type routes without throwing, even with no item or context", () => {
  for (const type of EVENT_TYPES) {
    const r = routeEvent({ type, emotion: "amused", probe: "interest", answer: "more", sub: SUB, reason: "this_item" });
    assert.equal(r.type, type);
    assert.ok(r.flags && typeof r.flags === "object");
  }
  assert.equal(routeEvent({ type: "knew_this" }).knowledge, null, "no subject without an item");
});
