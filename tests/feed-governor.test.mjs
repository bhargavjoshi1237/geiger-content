import test from "node:test";
import assert from "node:assert/strict";
import { blockedThemes, capFrontier, createGovernor, GOVERNOR_CONFIG, intensityWeight, levelsUsed, maxAllowedFrontier, rollSession, sensitiveCounts } from "../lib/feed/governor.mjs";

const t0 = Date.parse("2026-10-01T10:00:00Z");
const MIN = 60 * 1000;
const sens = (themes, n) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, sens: themes }));
const intense = (n, bucket = "angry", int = 0.9) => Array.from({ length: n }, (_, i) => ({ id: `e${i}`, emo: bucket, int }));
const plain = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}` }));

test("descent cap clamps a jump of 3 to +1 per session", () => {
  const gov = rollSession(createGovernor(), { now: t0, frontier: { "a/b": 2 } });
  assert.equal(gov.sessionId, 1);
  assert.equal(maxAllowedFrontier(gov, "a/b", { maxLevels: 1 }), 3);
  assert.equal(maxAllowedFrontier(gov, "a/new", { maxLevels: 1 }), 2);
  const frontier = { "a/b": 5, "a/new": 2, "a/other": 4 };
  assert.deepEqual(capFrontier(gov, frontier, { maxLevels: 1 }).sort(), ["a/b", "a/other"]);
  assert.deepEqual(frontier, { "a/b": 3, "a/new": 2, "a/other": 2 });
  assert.deepEqual(levelsUsed(gov, frontier), { "a/b": 1, "a/new": 1, "a/other": 1 });
  assert.deepEqual(capFrontier(gov, frontier, { maxLevels: 1 }), [], "idempotent once clamped");
});

test("maxLevels widens the allowance; minor forces one level", () => {
  const gov = rollSession(createGovernor(), { now: t0, frontier: {} });
  assert.equal(maxAllowedFrontier(gov, "x/y", { maxLevels: 3 }), 4);
  assert.equal(maxAllowedFrontier(gov, "x/y", { maxLevels: 3, minor: true }), 2);
  assert.equal(maxAllowedFrontier(gov, "x/y", {}), 1 + GOVERNOR_CONFIG.defaultMaxLevels);
});

test("a new session after the gap resets the base; activity inside the gap keeps it", () => {
  const gov = rollSession(createGovernor(), { now: t0, frontier: {} });
  const frontier = { "a/b": 2 };
  rollSession(gov, { now: t0 + 20 * MIN, frontier });
  assert.equal(gov.sessionId, 1, "still the same session");
  assert.equal(maxAllowedFrontier(gov, "a/b", { maxLevels: 1 }), 2);
  rollSession(gov, { now: t0 + 45 * MIN, frontier });
  assert.equal(gov.sessionId, 1, "gap is measured from the last activity");
  rollSession(gov, { now: t0 + 80 * MIN, frontier });
  assert.equal(gov.sessionId, 2);
  assert.equal(gov.sessionStart, t0 + 80 * MIN);
  assert.equal(maxAllowedFrontier(gov, "a/b", { maxLevels: 1 }), 3);
  assert.deepEqual(levelsUsed(gov, frontier), {});
  frontier["a/b"] = 9;
  assert.deepEqual(capFrontier(gov, frontier, { maxLevels: 1 }), ["a/b"]);
  assert.equal(frontier["a/b"], 3);
});

test("capFrontier is a no-op before any session snapshot exists", () => {
  const frontier = { "a/b": 4 };
  assert.deepEqual(capFrontier(createGovernor(), frontier, { maxLevels: 1 }), []);
  assert.equal(frontier["a/b"], 4);
});

test("sensitiveCounts only looks at the recent window", () => {
  const history = [...sens(["gore"], 10), ...plain(GOVERNOR_CONFIG.window - 3), ...sens(["gore", "gore", "violence"], 2), ...intense(1), ...intense(1, "amused"), ...intense(1, "sad", 0.5)];
  const counts = sensitiveCounts(history);
  assert.deepEqual(counts.themes, { gore: 2, violence: 2 });
  assert.equal(counts.intense, 1);
  assert.deepEqual(sensitiveCounts([]), { themes: {}, intense: 0 });
});

test("blocked themes appear at the cap", () => {
  const caps = GOVERNOR_CONFIG.caps.moderate;
  assert.equal(blockedThemes(sens(["gore"], caps.themes - 1), { intensityCap: "moderate" }).themes.size, 0);
  // One under the cap stays open (with moderate at 1 that is none of the theme).
  const at = blockedThemes([...sens(["gore"], caps.themes), ...sens(["violence"], caps.themes - 1)], { intensityCap: "moderate" });
  assert.deepEqual([...at.themes], ["gore"]);
  assert.equal(at.blockIntense, false);
  assert.equal(blockedThemes(intense(caps.intense - 1), { intensityCap: "moderate" }).blockIntense, false);
  assert.equal(blockedThemes(intense(caps.intense), { intensityCap: "moderate" }).blockIntense, true);
  assert.equal(blockedThemes(sens(["gore"], 2), { intensityCap: "calm" }).themes.has("gore"), true);
  const any = blockedThemes([...sens(["gore"], 25), ...intense(5)], { intensityCap: "any" });
  assert.equal(any.themes.size, 0);
  assert.equal(any.blockIntense, false);
});

test("the minor factor halves caps (min 1)", () => {
  // Halving checked on the previous 4/8 and 2/4 caps, passed explicitly.
  const config = { caps: { any: { themes: Infinity, intense: Infinity }, moderate: { themes: 4, intense: 8 }, calm: { themes: 2, intense: 4 } } };
  assert.equal(blockedThemes(sens(["gore"], 1), { intensityCap: "moderate", minor: true, config }).themes.size, 0);
  assert.equal(blockedThemes(sens(["gore"], 2), { intensityCap: "moderate", minor: true, config }).themes.has("gore"), true);
  assert.equal(blockedThemes(intense(3), { intensityCap: "moderate", minor: true, config }).blockIntense, false);
  assert.equal(blockedThemes(intense(4), { intensityCap: "moderate", minor: true, config }).blockIntense, true);
  assert.equal(blockedThemes(intense(2), { intensityCap: "calm", minor: true, config }).blockIntense, true);
  // Defaults: moderate 1/2 halves to 1/1 (never below 1), and minors never get the uncapped tier.
  assert.equal(blockedThemes(intense(1), { intensityCap: "moderate", minor: true }).blockIntense, true);
  assert.equal(blockedThemes(sens(["gore"], 1), { intensityCap: "calm", minor: true }).themes.has("gore"), true);
  assert.equal(blockedThemes(sens(["gore"], 1), { intensityCap: "any", minor: true }).themes.has("gore"), true);
});

test("moderate bites at a normal reader's rate (two of a theme, two intense negatives per 30), unlike any", () => {
  const window = [...plain(26), ...sens(["gore"], 2), ...intense(2)];
  const moderate = blockedThemes(window, { intensityCap: "moderate" });
  assert.deepEqual([...moderate.themes], ["gore"]);
  assert.equal(moderate.blockIntense, true);
  const any = blockedThemes(window, { intensityCap: "any" });
  assert.deepEqual([any.themes.size, any.blockIntense], [0, false]);
  const caps = GOVERNOR_CONFIG.caps;
  assert.ok(caps.calm.themes <= caps.moderate.themes && caps.calm.intense < caps.moderate.intense, "calm stays at least as strict as moderate");
});

test("intensityWeight zeroes blocked themes and throttles intense negatives", () => {
  const blocked = { themes: new Set(["gore"]), blockIntense: true };
  assert.equal(intensityWeight({ sensitive: ["gore"] }, { blocked }), 0);
  assert.equal(intensityWeight({ sensitive: ["violence"] }, { blocked }), 1);
  assert.equal(intensityWeight({ emotion: { bucket: "angry", intensity: 0.8 } }, { blocked }), 0.2);
  assert.equal(intensityWeight({ emotion: { bucket: "sad", intensity: 0.75 } }, { blocked }), 0.2);
  assert.equal(intensityWeight({ emotion: { bucket: "angry", intensity: 0.8 } }, { blocked: { themes: new Set(), blockIntense: false } }), 1);
  assert.equal(intensityWeight({ emotion: { bucket: "amazed", intensity: 1 } }, { blocked }), 1);
  assert.equal(intensityWeight({ emotion: { bucket: "angry", intensity: 0.5 } }, { blocked }), 1);
});

test("calm drops high-arousal angry and disgusted items", () => {
  const none = { themes: new Set(), blockIntense: false };
  assert.equal(intensityWeight({ emotion: { bucket: "disgusted", intensity: 0.7 } }, { blocked: none, intensityCap: "calm" }), 0);
  assert.equal(intensityWeight({ emotion: { bucket: "angry", intensity: 0.69 } }, { blocked: none, intensityCap: "calm" }), 1);
  assert.equal(intensityWeight({ emotion: { bucket: "sad", intensity: 1 } }, { blocked: none, intensityCap: "calm" }), 1);
  assert.equal(intensityWeight({ emotion: { bucket: "disgusted", intensity: 0.9 } }, { blocked: none, intensityCap: "moderate" }), 1);
});

test("unlabelled items always return 1", () => {
  const blocked = { themes: new Set(["gore", "violence"]), blockIntense: true };
  for (const cap of ["any", "moderate", "calm"]) {
    assert.equal(intensityWeight({ id: "x" }, { blocked, intensityCap: cap }), 1);
    assert.equal(intensityWeight({ id: "x", sensitive: [], emotion: null }, { blocked, intensityCap: cap }), 1);
    assert.equal(intensityWeight({ id: "x" }, { intensityCap: cap }), 1);
  }
  assert.equal(intensityWeight(null), 1);
});
