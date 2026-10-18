import test from "node:test";
import assert from "node:assert/strict";
import { classifyAll, classifyDrift, createDrift, DRIFT_CONFIG, explorationBoost, jsDivergence, noteExposure, recordDrift, regimeShift } from "../lib/feed/drift.mjs";

const DAY = 24 * 3600000;
const T0 = Date.parse("2026-09-01T18:00:00Z");
const LIKE = { success: 1, weight: 1.2 };
const SKIP = { success: 0, weight: 0.8 };

// One session per day; each event on an area also feeds its subject, as live learning does.
function session(drift, day, events) {
  let now = T0 + day * DAY;
  for (const [topic, sub, signal] of events) {
    now += 60000;
    recordDrift(drift, topic, signal, { now });
    if (sub) recordDrift(drift, `${topic}/${sub}`, signal, { now });
  }
  return now;
}

const repeat = (n, row) => Array.from({ length: n }, () => row);
const interleave = (...lists) => lists[0].flatMap((_, i) => lists.map((l) => l[i]).filter(Boolean));

function gamerToF1() {
  const drift = createDrift();
  let now = T0;
  // Three gaming sessions where F1 shows up and is skipped.
  for (let day = 0; day < 3; day += 1)
    now = session(drift, day, interleave([...repeat(7, ["gaming", "rpg", LIKE]), ["gaming", "rpg", SKIP]], repeat(3, ["f1", "racing", SKIP])));
  // Then the reader turns: F1 is liked, gaming skipped.
  for (let day = 3; day < 6; day += 1)
    now = session(drift, day, interleave([...repeat(7, ["f1", "racing", LIKE]), ["f1", "racing", SKIP]], repeat(6, ["gaming", "rpg", SKIP])));
  return { drift, now };
}

test("a gamer turning to F1 reads as gaming fading/rested and F1 emerging", () => {
  const { drift, now } = gamerToF1();
  assert.equal(classifyDrift(drift, "f1", { now, exposure: 0 }).label, "emerging");
  assert.equal(classifyDrift(drift, "f1/racing", { now, exposure: 0 }).label, "emerging");
  assert.ok(["fading", "rested"].includes(classifyDrift(drift, "gaming", { now, exposure: 0 }).label));
  const f1 = classifyDrift(drift, "f1", { now });
  assert.ok(f1.ratio > 1 && f1.fast > f1.slow, `fast above slow (${JSON.stringify(f1)})`);
  const all = classifyAll(drift, { now, history: [] });
  assert.deepEqual(all.map((r) => [r.id, r.scope, r.label]).sort(), [
    ["f1", "topic", "emerging"], ["f1/racing", "subject", "emerging"], ["gaming", "topic", "fading"], ["gaming/rpg", "subject", "fading"],
  ]);
});

test("a single-session burst on a new topic is a spike, not an emergence", () => {
  const drift = createDrift();
  const first = session(drift, 0, repeat(6, ["cats", null, LIKE]));
  assert.equal(classifyDrift(drift, "cats", { now: first }).label, "steady", "a brand-new reader has no spikes");
  for (let day = 1; day < 3; day += 1) session(drift, day, repeat(6, ["cats", null, LIKE]));
  const now = session(drift, 3, repeat(6, ["volcanoes", null, LIKE]));
  assert.equal(classifyDrift(drift, "volcanoes", { now }).label, "spike");
  assert.equal(classifyDrift(drift, "cats", { now }).label, "steady");
});

test("a heavily shown topic with low engagement is rested, not fading", () => {
  const drift = createDrift();
  for (let day = 0; day < 3; day += 1) session(drift, day, repeat(6, ["dogs", null, LIKE]));
  let now = 0;
  for (let day = 3; day < 6; day += 1) now = session(drift, day, repeat(6, ["dogs", null, SKIP]));
  assert.equal(classifyDrift(drift, "dogs", { now, exposure: 0 }).label, "fading");
  // An area needs a third of the 30-impression window to read as satiated (was 3, which every area clears).
  assert.equal(classifyDrift(drift, "dogs", { now, exposure: 12 }).label, "rested");
  noteExposure(drift, "dogs", DRIFT_CONFIG.restedExposure);
  assert.equal(classifyDrift(drift, "dogs", { now }).label, "rested");
  const history = repeat(10, { topic: "dogs", sub: "dogs/puppies" });
  assert.equal(classifyAll(drift, { now, history })[0].label, "rested");
});

test("a fading area still shown at its usual share is fading; rested needs real over-exposure (subjects sooner)", () => {
  const drift = createDrift();
  for (let day = 0; day < 3; day += 1) session(drift, day, repeat(6, ["gaming", "rpg", LIKE]));
  let now = 0;
  for (let day = 3; day < 6; day += 1) now = session(drift, day, repeat(6, ["gaming", "rpg", SKIP]));
  // Six areas share a 30-impression window, so 5-8 impressions is an ordinary share, not satiation.
  for (const exposure of [5, 8]) assert.equal(classifyDrift(drift, "gaming", { now, exposure }).label, "fading", `area at ${exposure}`);
  assert.equal(classifyDrift(drift, "gaming", { now, exposure: DRIFT_CONFIG.restedExposure }).label, "rested");
  assert.equal(classifyDrift(drift, "gaming/rpg", { now, exposure: 2 }).label, "fading");
  assert.equal(classifyDrift(drift, "gaming/rpg", { now, exposure: DRIFT_CONFIG.subject.restedExposure }).label, "rested");
  const history = [...repeat(7, { topic: "gaming", sub: "gaming/rpg" }), ...repeat(23, { topic: "music", sub: "music/pop" })];
  assert.deepEqual(classifyAll(drift, { now, history }).map((r) => [r.id, r.label]).sort(), [["gaming", "fading"], ["gaming/rpg", "rested"]]);
});

test("a subject rising clearly over two sessions is emerging; a topic still needs three", () => {
  const drift = createDrift();
  const thin = (n, signal) => repeat(n, ["sports", "f1", signal]);
  // Three sessions where F1 is mostly skipped, then two where it is mostly liked.
  for (let day = 0; day < 3; day += 1) session(drift, day, interleave([...thin(3, SKIP), ...thin(1, LIKE)], repeat(4, ["music", "pop", LIKE])));
  let now = 0;
  for (let day = 3; day < 5; day += 1) now = session(drift, day, interleave(thin(4, LIKE), repeat(4, ["music", "pop", LIKE])));
  assert.equal(classifyDrift(drift, "sports/f1", { now }).label, "emerging");
  assert.notEqual(classifyDrift(drift, "sports", { now }).label, "emerging", "two sessions are not enough for an area");
  assert.equal(classifyDrift(drift, "music/pop", { now }).label, "steady", "a steady subject stays steady");
  // A subject override can be tuned per call like any other key.
  assert.notEqual(classifyDrift(drift, "sports/f1", { now, config: { subject: { emergeSessions: 3 } } }).label, "emerging");
});

test("the regime shift fires on a swap of engaged topics and boosts exploration once", () => {
  const drift = createDrift();
  session(drift, 0, repeat(6, ["gaming", null, LIKE]));
  let now = session(drift, 1, repeat(6, ["gaming", null, LIKE]));
  assert.equal(regimeShift(drift), false);
  assert.equal(explorationBoost(drift, { shown: 40, driftBoostEnabled: true }), null);
  now = session(drift, 2, repeat(6, ["f1", null, LIKE]));
  assert.equal(regimeShift(drift), true);
  assert.deepEqual(explorationBoost(drift, { shown: 50, driftBoostEnabled: true }), { exploreBoost: 0.6 });
  assert.equal(drift.shifted, true);
  assert.equal(drift.boostUntilShown, 50 + DRIFT_CONFIG.boostShown);
  // No re-stamp while still shifted; the boost ends once its impressions are used.
  assert.ok(explorationBoost(drift, { shown: 60, driftBoostEnabled: true }));
  assert.equal(drift.boostUntilShown, 70);
  assert.equal(explorationBoost(drift, { shown: 70, driftBoostEnabled: true }), null);
  assert.equal(explorationBoost(drift, { shown: 55, driftBoostEnabled: false }), null);
  // The flag holds across a boundary while the new session is still thin.
  recordDrift(drift, "f1", LIKE, { now: now + DAY });
  assert.equal(regimeShift(drift), true);
  assert.ok(jsDivergence({ a: 1 }, { b: 1 }) > 0.99 && jsDivergence({ a: 1, b: 1 }, { a: 2, b: 2 }) < 1e-9);
});

test("sparse evidence stays steady", () => {
  const drift = createDrift();
  assert.equal(classifyDrift(drift, "nothing", { now: T0 }).label, "steady");
  session(drift, 0, [["birds", null, LIKE]]);
  session(drift, 1, [["birds", null, SKIP], ["birds", null, LIKE]]);
  const now = session(drift, 2, [["birds", null, LIKE]]);
  assert.equal(classifyDrift(drift, "birds", { now }).label, "steady");
  assert.deepEqual(classifyAll(drift, { now }), []);
  assert.equal(regimeShift(drift), false);
});

test("labels are stable across a session boundary", () => {
  const steadyDrift = createDrift();
  let now = 0;
  for (let day = 0; day < 6; day += 1) now = session(steadyDrift, day, interleave(repeat(4, ["art", null, LIKE]), repeat(4, ["art", null, SKIP])));
  assert.equal(classifyDrift(steadyDrift, "art", { now }).label, "steady");
  recordDrift(steadyDrift, "art", LIKE, { now: now + DAY });
  assert.equal(classifyDrift(steadyDrift, "art", { now: now + DAY }).label, "steady");

  const { drift, now: end } = gamerToF1();
  const before = classifyDrift(drift, "f1", { now: end }).label;
  const next = end + DAY;
  recordDrift(drift, "f1", SKIP, { now: next });
  assert.equal(classifyDrift(drift, "f1", { now: next }).label, before);
  // The roll pushed the previous session and capped the history.
  assert.equal(drift.nodes.f1.sessions.length, 6);
  assert.ok(drift.nodes.f1.sessions.length <= DRIFT_CONFIG.maxSessions);
  assert.equal(drift.nodes.f1.cur.id, next);
});

test("events within the session gap share one session across nodes", () => {
  const drift = createDrift();
  recordDrift(drift, "a", LIKE, { now: T0 });
  recordDrift(drift, "b", LIKE, { now: T0 + 20 * 60000 });
  recordDrift(drift, "a", LIKE, { now: T0 + 40 * 60000 });
  assert.equal(drift.nodes.a.sessions.length, 0);
  assert.equal(drift.nodes.b.cur.id, T0);
  recordDrift(drift, "a", LIKE, { now: T0 + 80 * 60000 });
  assert.equal(drift.nodes.a.sessions.length, 1);
  assert.equal(drift.nodes.a.cur.id, T0 + 80 * 60000);
  assert.equal(recordDrift(drift, "c", { success: 1, weight: 0 }, { now: T0 }), drift);
  assert.ok(!drift.nodes.c);
});
