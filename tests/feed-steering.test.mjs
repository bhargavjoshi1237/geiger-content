import test from "node:test";
import assert from "node:assert/strict";
import {
  activeSteering, addSteering, cleanSteeringText, createSteering, createSteeringRequest, FeedSteeringError,
  pruneSteering, removeSteering, STEERING_CONFIG, steeringLabels, steeringSearches, steeringShare, steeringViews,
} from "../lib/feed/steering.mjs";

const T0 = Date.parse("2026-10-01T12:00:00Z");
const DAY = 24 * 3600000;
const vec = (seed) => Array.from({ length: 8 }, (_, k) => Math.sin(seed + k) / 3);
const request = (id, text, now = T0, extra = {}) => createSteeringRequest({ id, text, vector: vec(id.length), now, ...extra });
const throwsCode = (fn, code) => assert.throws(fn, (e) => e instanceof FeedSteeringError && e.code === code);

test("text validation trims, collapses whitespace and rejects empty, short and long text", () => {
  assert.equal(cleanSteeringText("  more   volcano\n\tphotos "), "more volcano photos");
  throwsCode(() => cleanSteeringText("   "), "steering_invalid");
  throwsCode(() => cleanSteeringText("ab"), "steering_invalid");
  throwsCode(() => cleanSteeringText("x".repeat(STEERING_CONFIG.maxLen + 1)), "steering_invalid");
  throwsCode(() => cleanSteeringText(42), "steering_invalid");
  assert.equal(cleanSteeringText("x".repeat(STEERING_CONFIG.maxLen)).length, STEERING_CONFIG.maxLen);
  const err = new FeedSteeringError("steering_limit", "full");
  assert.equal(err.status, 409);
  assert.ok(err instanceof Error);
});

test("a request rounds its vector to 4 dp, defaults ttl and weight, and clamps weight", () => {
  const r = createSteeringRequest({ id: "a1", text: " Volcanoes  ", vector: [0.123456, -0.98766, 1], now: T0 });
  assert.deepEqual(r.vector, [0.1235, -0.9877, 1]);
  assert.equal(r.text, "Volcanoes");
  assert.equal(r.createdAt, T0);
  assert.equal(r.expiresAt, T0 + 3 * DAY);
  assert.equal(r.weight, STEERING_CONFIG.weight);
  assert.equal(createSteeringRequest({ id: "a2", text: "abc", vector: [1], now: T0, weight: 5 }).weight, STEERING_CONFIG.maxWeight);
  assert.equal(createSteeringRequest({ id: "a3", text: "abc", vector: [1], now: T0, weight: 0 }).weight, STEERING_CONFIG.minWeight);
  assert.equal(createSteeringRequest({ id: "a4", text: "abc", vector: [1], now: T0, ttlMs: 1000 }).expiresAt, T0 + 1000);
  throwsCode(() => createSteeringRequest({ id: "a5", text: "abc", vector: [], now: T0 }), "steering_invalid");
  throwsCode(() => createSteeringRequest({ id: "a6", text: "abc", now: T0 }), "steering_invalid");
  const auto = createSteeringRequest({ text: "abc", vector: [1], now: T0 });
  assert.equal(auto.id, createSteeringRequest({ text: "abc", vector: [1], now: T0 }).id, "generated ids are deterministic");
});

test("ttl expiry boundary: active until expiresAt, gone at it", () => {
  const s = addSteering(createSteering(), request("v", "volcanoes"), { now: T0 });
  const end = T0 + STEERING_CONFIG.ttlMs;
  assert.equal(activeSteering(s, end - 1).length, 1);
  assert.equal(activeSteering(s, end).length, 0);
  assert.equal(steeringShare(s, end - 1), STEERING_CONFIG.minShare);
  assert.equal(steeringShare(s, end), 0);
  assert.equal(steeringShare(createSteering(), T0), 0);
});

test("the cap rejects a seventh active request but expired ones free their slot", () => {
  const s = createSteering();
  for (let k = 0; k < STEERING_CONFIG.maxActive; k += 1) addSteering(s, request(`r${k}`, `topic number ${k}`), { now: T0 });
  throwsCode(() => addSteering(s, request("r9", "one too many"), { now: T0 }), "steering_limit");
  assert.equal(s.requests.length, STEERING_CONFIG.maxActive, "rejected rather than evicted");
  const later = T0 + STEERING_CONFIG.ttlMs;
  addSteering(s, request("r9", "one too many", later), { now: later });
  assert.deepEqual(s.requests.map((r) => r.id), ["r9"], "add prunes expired requests first");
});

test("a duplicate normalized text refreshes the expiry instead of adding, even at the cap", () => {
  const s = addSteering(createSteering(), request("d1", "More  Volcano photos"), { now: T0 });
  const later = T0 + DAY;
  addSteering(s, request("d2", "more volcano   PHOTOS", later), { now: later });
  assert.equal(s.requests.length, 1);
  assert.equal(s.requests[0].id, "d1");
  assert.equal(s.requests[0].expiresAt, later + STEERING_CONFIG.ttlMs);
  for (let k = 1; k < STEERING_CONFIG.maxActive; k += 1) addSteering(s, request(`f${k}`, `filler ${k}`, later), { now: later });
  assert.doesNotThrow(() => addSteering(s, request("d3", "more volcano photos", later), { now: later }));
});

test("reads skip expired requests without mutating; prune and remove mutate in place", () => {
  const s = createSteering();
  addSteering(s, request("old", "old request", T0, { ttlMs: 1000 }), { now: T0 });
  addSteering(s, request("new", "new request"), { now: T0 });
  const now = T0 + 5000;
  assert.deepEqual(activeSteering(s, now).map((r) => r.id), ["new"]);
  assert.equal(s.requests.length, 2, "reads do not prune");
  assert.equal(pruneSteering(s, now), s);
  assert.deepEqual(s.requests.map((r) => r.id), ["new"]);
  assert.equal(removeSteering(s, "new"), s);
  assert.equal(s.requests.length, 0);
  assert.deepEqual(activeSteering(undefined, now), []);
  assert.deepEqual(steeringSearches(null, { now }), {});
});

test("views report remainingMs and searches/labels are keyed steer:<id>", () => {
  const s = addSteering(createSteering(), request("abc", "alpine lakes", T0, { weight: 0.8 }), { now: T0 });
  addSteering(s, request("gone", "expired one", T0, { ttlMs: 10 }), { now: T0 });
  const now = T0 + DAY;
  assert.deepEqual(steeringViews(s, now), [{ id: "abc", text: "alpine lakes", expiresAt: T0 + 3 * DAY, remainingMs: 2 * DAY, weight: 0.8 }]);
  const searches = steeringSearches(s, { now });
  assert.deepEqual(Object.keys(searches), ["steer:abc"]);
  assert.deepEqual(searches["steer:abc"], { vector: s.requests[0].vector, limit: 40 });
  assert.equal(steeringSearches(s, { now, limit: 12 })["steer:abc"].limit, 12);
  assert.equal(steeringLabels(s)["steer:abc"], "alpine lakes");
});
