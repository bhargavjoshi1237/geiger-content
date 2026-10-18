import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, RECENCY_PRESETS } from "../lib/feed/engine.mjs";
import {
  cleanSettings, DEFAULT_SETTINGS, EXPLORATION_PRESETS, FeedSettingsError, mergeSettings, NON_PROFILED_CONFIG,
  RABBIT_HOLE_CONFIG, REACTIVITY_PRESETS, resolveSettings, SIMILAR_PRESETS, VARIETY_PRESETS,
} from "../lib/feed/settings.mjs";

const DAY = 24 * 3600000;

test("settings: legacy recency patch round-trips and unknown modes throw", () => {
  assert.deepEqual(cleanSettings({ recency: "latest" }), { recency: "latest" });
  assert.deepEqual(cleanSettings({}), {});
  assert.deepEqual(cleanSettings(), {});
  assert.deepEqual(cleanSettings({ shiny: true, v: 7 }), {}, "unknown top-level keys are ignored");
  assert.throws(() => cleanSettings({ recency: "yesterday" }), FeedSettingsError);
  assert.throws(() => cleanSettings(null), FeedSettingsError);
  assert.ok(new FeedSettingsError("x") instanceof Error);
});

test("settings: every enum and typed field rejects a bad value", () => {
  const bad = [
    { exploration: "wild" }, { variety: "huge" }, { similar: "max" }, { reactivity: "instant" }, { intensityCap: "none" },
    { depth: { target: "expert" } }, { depth: { basicsSuppression: "yes" } }, { depth: [] },
    { rabbitHole: { enabled: 1 } }, { rabbitHole: { maxLevelsPerSession: 0 } }, { rabbitHole: { maxLevelsPerSession: 4 } }, { rabbitHole: { maxLevelsPerSession: 1.5 } },
    { nonProfiled: "true" }, { minor: 0 }, { driftBoost: null },
    { emotionDials: { amused: 2 } }, { emotionDials: { bored: 0.5 } }, { emotionDials: { sad: "1" } },
    { signalWeights: { like: 4 } }, { signalWeights: { like: -1 } }, { signalWeights: { stare: 1 } }, { signalWeights: { undo: 1 } },
    { negativeStrength: 0.1 }, { negativeStrength: 3.5 }, { negativeStrength: Number.NaN },
    { topics: { mute: "dogs" } }, { topics: { mute: ["Dogs"] } }, { topics: { boost: ["a/b/c"] } }, { topics: { exclude: [42] } }, { topics: null },
  ];
  for (const patch of bad) assert.throws(() => cleanSettings(patch), FeedSettingsError, JSON.stringify(patch));
});

test("settings: valid values pass through, nested patches keep only the keys present", () => {
  const patch = cleanSettings({ exploration: "adventurous", variety: "wide", similar: "off", reactivity: "fast", intensityCap: "calm", minor: true, driftBoost: true, nonProfiled: false, negativeStrength: 0.25, rabbitHole: { enabled: true }, depth: { target: "deep" }, signalWeights: { like: 0, explore_click: 3 } });
  assert.deepEqual(patch, { exploration: "adventurous", variety: "wide", similar: "off", reactivity: "fast", intensityCap: "calm", minor: true, driftBoost: true, nonProfiled: false, negativeStrength: 0.25, rabbitHole: { enabled: true }, depth: { target: "deep" }, signalWeights: { like: 0, explore_click: 3 } });
});

test("settings: topic lists are deduped and a mute wins over a boost", () => {
  const { topics } = cleanSettings({ topics: { mute: ["dogs", "dogs", "cars/f1"], boost: ["dogs", "cats", "cats"], exclude: ["news"] } });
  assert.deepEqual(topics, { mute: ["dogs", "cars/f1"], boost: ["cats"], exclude: ["news"] });
  const merged = mergeSettings(mergeSettings(DEFAULT_SETTINGS, cleanSettings({ topics: { boost: ["dogs", "cats"] } })), cleanSettings({ topics: { mute: ["dogs"] } }));
  assert.deepEqual(merged.topics, { mute: ["dogs"], boost: ["cats"], exclude: [] });
});

test("settings: topic caps are enforced after dedupe", () => {
  const ids = (n) => Array.from({ length: n }, (_, i) => `t${i}`);
  assert.equal(cleanSettings({ topics: { mute: ids(30) } }).topics.mute.length, 30);
  assert.equal(cleanSettings({ topics: { boost: [...ids(10), ...ids(10)] } }).topics.boost.length, 10);
  assert.throws(() => cleanSettings({ topics: { mute: ids(31) } }), FeedSettingsError);
  assert.throws(() => cleanSettings({ topics: { boost: ids(11) } }), FeedSettingsError);
  assert.throws(() => cleanSettings({ topics: { exclude: ids(21) } }), FeedSettingsError);
});

test("settings: emotion dials round to the nearest 0.5", () => {
  const { emotionDials } = cleanSettings({ emotionDials: { amused: 0.3, amazed: 0.74, moved: -0.8, sad: -0.2, angry: 1, disgusted: -1 } });
  assert.deepEqual(emotionDials, { amused: 0.5, amazed: 0.5, moved: -1, sad: 0, angry: 1, disgusted: -1 });
  assert.ok(Object.is(emotionDials.sad, 0), "no negative zero");
});

test("settings: nested merge keeps untouched siblings and never aliases defaults", () => {
  const base = mergeSettings(DEFAULT_SETTINGS, { topics: { mute: ["dogs"], boost: ["cats"], exclude: [] }, emotionDials: { amused: 1 }, depth: { target: "deep" } });
  assert.equal(base.emotionDials.sad, 0, "defaults fill the dial siblings");
  const next = mergeSettings(base, cleanSettings({ topics: { mute: ["birds"] }, emotionDials: { sad: -0.5 }, depth: { basicsSuppression: false }, rabbitHole: { maxLevelsPerSession: 3 }, recency: "fresh" }));
  assert.deepEqual(next.topics, { mute: ["birds"], boost: ["cats"], exclude: [] });
  assert.equal(next.emotionDials.amused, 1);
  assert.equal(next.emotionDials.sad, -0.5);
  assert.deepEqual(next.depth, { target: "deep", basicsSuppression: false });
  assert.deepEqual(next.rabbitHole, { enabled: false, maxLevelsPerSession: 3 });
  assert.equal(next.recency, "fresh");
  assert.equal(next.v, 1);
  next.topics.exclude.push("x");
  next.signalWeights.like = 2;
  assert.deepEqual(DEFAULT_SETTINGS.topics.exclude, []);
  assert.deepEqual(DEFAULT_SETTINGS.signalWeights, {});
});

test("settings: defaults resolve to an empty config so composeFeed is unchanged", () => {
  const r = resolveSettings(DEFAULT_SETTINGS);
  assert.deepEqual(r.config, {});
  assert.deepEqual(r.tasteConfig, {});
  assert.deepEqual(r.topics, { mute: new Set(), boost: new Set(), exclude: new Set() });
  assert.deepEqual(r.emotionDials, DEFAULT_SETTINGS.emotionDials);
  assert.equal(r.intensityCap, "moderate");
  assert.equal(r.minor, false);
  assert.deepEqual(r.depth, { target: "balanced", basicsSuppression: true });
  assert.deepEqual(r.rabbitHole, { enabled: false, maxLevels: 1 });
  assert.equal(r.nonProfiled, false);
  assert.deepEqual(resolveSettings(undefined).config, {});
  assert.deepEqual(resolveSettings({}).config, {});
});

test("settings: each preset produces its exact override table", () => {
  const cfg = (s) => resolveSettings(s).config;
  assert.deepEqual(cfg({ exploration: "focused" }), { warmMix: { core: 0.65, adjacent: 0.15, explore: 0.08, fresh: 0.12 }, coldMix: { core: 0.3, adjacent: 0.15, explore: 0.45, fresh: 0.1 }, optimismZ: 0.8, warmAfterEvents: 25, probeRate: 0.18 });
  assert.deepEqual(cfg({ exploration: "adventurous" }), { warmMix: { core: 0.35, adjacent: 0.3, explore: 0.3, fresh: 0.05 }, coldMix: { core: 0.1, adjacent: 0.2, explore: 0.65, fresh: 0.05 }, optimismZ: 2.2, warmAfterEvents: 70, warmPoolEvidence: 12, probeRate: 0.1 });
  assert.deepEqual(cfg({ variety: "tight" }), { fatigueStrength: 0.08, maxTopicPerWindow: 4, maxSubtopicPerWindow: 3, maxTopicRun: 3, maxTopicPerBatch: 4, maxCoreTopics: 4 });
  assert.deepEqual(cfg({ variety: "wide" }), { fatigueStrength: 0.3, maxTopicPerWindow: 2, maxSubtopicPerWindow: 1, maxTopicRun: 1, maxTopicPerBatch: 2, maxCoreTopics: 8, similarMaxPerSubtopic: 1 });
  assert.deepEqual(cfg({ similar: "off" }), { similarShare: 0 });
  assert.deepEqual(cfg({ similar: "low" }), { similarShare: 0.2 });
  assert.deepEqual(cfg({ similar: "balanced" }), {});
  assert.equal(DEFAULT_CONFIG.similarShare, 0.45, "balanced similar equals the engine default");
  assert.deepEqual(cfg({ similar: "high" }), { similarShare: 0.6, similarMaxPerSubtopic: 3 });
  assert.deepEqual(resolveSettings({ reactivity: "steady" }), { ...resolveSettings({}), config: { eventDecay: 0.998, halfLifeMs: 10 * DAY }, tasteConfig: { short: { halfLifeMs: 2 * 3600000, eventDecay: 0.93 }, long: { halfLifeMs: 30 * DAY, eventDecay: 0.999 } } });
  assert.deepEqual(resolveSettings({ reactivity: "fast" }), { ...resolveSettings({}), config: { eventDecay: 0.985, halfLifeMs: 2 * DAY }, tasteConfig: { short: { halfLifeMs: 20 * 60000, eventDecay: 0.8 }, long: { halfLifeMs: 7 * DAY, eventDecay: 0.995 } } });
  assert.deepEqual(cfg({ recency: "fresh" }), RECENCY_PRESETS.fresh);
  assert.deepEqual(cfg({ recency: "latest" }), RECENCY_PRESETS.latest);
  assert.deepEqual(cfg({ rabbitHole: { enabled: true } }), { warmMix: { core: 0.65, adjacent: 0.15, explore: 0.1, fresh: 0.1 }, probeRate: 0.3, probeLift: 1.2, minProbeGap: 3, advanceOnProbeLikes: 1, maxTopicPerWindow: 4, maxSubtopicPerWindow: 3, maxTopicRun: 3 });
  assert.deepEqual(cfg({ nonProfiled: true }), { profileFree: true, similarShare: 0, mixJitter: 0, freshShare: 1, freshPoolSize: 400 });
  assert.deepEqual(cfg({ signalWeights: { like: 2 }, negativeStrength: 0.5 }), { signalWeights: { like: 2 }, negativeStrength: 0.5 });
  for (const table of [EXPLORATION_PRESETS, VARIETY_PRESETS, SIMILAR_PRESETS]) assert.deepEqual(table.balanced, {});
  assert.deepEqual(REACTIVITY_PRESETS.balanced, { config: {}, tasteConfig: {} });
  assert.equal(RABBIT_HOLE_CONFIG.probeRate, 0.3);
  assert.equal(NON_PROFILED_CONFIG.profileFree, true);
  for (const key of Object.keys(cfg({ exploration: "adventurous", variety: "wide", similar: "high", reactivity: "fast", rabbitHole: { enabled: true }, nonProfiled: true }))) assert.ok(key in DEFAULT_CONFIG || key === "profileFree", `${key} is a known config key`);
});

test("settings: merge order lets later layers win", () => {
  const fresh = resolveSettings({ exploration: "focused", recency: "latest" }).config;
  assert.equal(fresh.freshShare, RECENCY_PRESETS.latest.freshShare, "recency wins freshShare over exploration");
  assert.deepEqual(fresh.warmMix, EXPLORATION_PRESETS.focused.warmMix);
  const wide = resolveSettings({ variety: "wide", similar: "high" }).config;
  assert.equal(wide.similarMaxPerSubtopic, 3, "similar wins over variety");
  const rabbit = resolveSettings({ exploration: "adventurous", variety: "wide", rabbitHole: { enabled: true } }).config;
  assert.deepEqual(rabbit.warmMix, RABBIT_HOLE_CONFIG.warmMix, "rabbit hole wins over exploration");
  assert.equal(rabbit.maxTopicRun, 3);
  assert.equal(rabbit.probeRate, 0.3);
  const np = resolveSettings({ similar: "high", recency: "latest", rabbitHole: { enabled: true }, nonProfiled: true }).config;
  assert.equal(np.similarShare, 0, "non-profiled wins last");
  assert.equal(np.freshShare, 1);
  assert.equal(np.freshPoolSize, 400);
  assert.equal(np.mixJitter, 0);
});

test("settings: non-profiled keeps mutes and excludes but ignores boosts", () => {
  const r = resolveSettings({ nonProfiled: true, topics: { mute: ["dogs"], boost: ["cats"], exclude: ["news/politics"] } });
  assert.equal(r.nonProfiled, true);
  assert.deepEqual(r.topics, { mute: new Set(["dogs"]), boost: new Set(), exclude: new Set(["news/politics"]) });
  assert.deepEqual(resolveSettings({ topics: { mute: [], boost: ["cats"] } }).topics.boost, new Set(["cats"]));
});

test("settings: minor forces a single rabbit-hole level per session", () => {
  const settings = { rabbitHole: { enabled: true, maxLevelsPerSession: 3 } };
  assert.deepEqual(resolveSettings(settings).rabbitHole, { enabled: true, maxLevels: 3 });
  assert.deepEqual(resolveSettings({ ...settings, minor: true }).rabbitHole, { enabled: true, maxLevels: 1 });
  assert.equal(resolveSettings({ ...settings, minor: true }).minor, true);
});

test("settings: drift boost applies only when enabled, shifted and within its impression budget", () => {
  const drift = { shifted: true, boostUntilShown: 30 };
  assert.equal(resolveSettings({ driftBoost: true }, { drift, shown: 10 }).config.exploreBoost, 0.6);
  assert.equal(resolveSettings({ driftBoost: true }, { drift, shown: 30 }).config.exploreBoost, undefined, "budget spent");
  assert.equal(resolveSettings({ driftBoost: false }, { drift, shown: 10 }).config.exploreBoost, undefined, "opt-in only");
  assert.equal(resolveSettings({ driftBoost: true }, { drift: { shifted: false, boostUntilShown: 30 }, shown: 10 }).config.exploreBoost, undefined);
  assert.equal(resolveSettings({ driftBoost: true }).config.exploreBoost, undefined, "no drift state, no boost");
  assert.equal(resolveSettings({ driftBoost: true, nonProfiled: true }, { drift, shown: 10 }).config.exploreBoost, 0.6, "drift boost layers last");
});

test("settings: a stored legacy { recency } object resolves", () => {
  const r = resolveSettings({ recency: "fresh" });
  assert.deepEqual(r.config, RECENCY_PRESETS.fresh);
  assert.deepEqual(r.tasteConfig, {});
  assert.deepEqual(r.rabbitHole, { enabled: false, maxLevels: 1 });
  assert.deepEqual(r.depth, { target: "balanced", basicsSuppression: true });
  const merged = mergeSettings({ recency: "latest" }, cleanSettings({ variety: "tight" }));
  assert.deepEqual(merged, { recency: "latest", variety: "tight" });
  assert.deepEqual(resolveSettings(merged).config, { ...VARIETY_PRESETS.tight, ...RECENCY_PRESETS.latest });
  assert.deepEqual(resolveSettings({ recency: "unknown-legacy", exploration: "gone" }).config, {}, "stale stored modes fall back to balanced");
});
