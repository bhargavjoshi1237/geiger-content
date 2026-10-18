// Per-reader feed settings (schema v1): validation, nested merge and resolution into engine/taste config overrides. Pure; no I/O.
import { RECENCY_MODES, RECENCY_PRESETS } from "./engine.mjs";

const HOUR = 3600000;
const DAY = 24 * HOUR;

export const EMOTION_BUCKETS = ["amused", "amazed", "moved", "curious", "sad", "angry", "disgusted"];
export const SIGNAL_WEIGHT_KEYS = ["like", "save", "share", "comment", "dwell", "skip", "hide", "react", "learned", "outbound", "explore_click"];

export const DEFAULT_SETTINGS = {
  v: 1,
  recency: "balanced",
  exploration: "balanced",
  variety: "balanced",
  similar: "balanced",
  reactivity: "balanced",
  rabbitHole: { enabled: false, maxLevelsPerSession: 1 },
  nonProfiled: false,
  topics: { mute: [], boost: [], exclude: [] },
  emotionDials: Object.fromEntries(EMOTION_BUCKETS.map((b) => [b, 0])),
  intensityCap: "moderate",
  minor: false,
  depth: { target: "balanced", basicsSuppression: true },
  signalWeights: {},
  negativeStrength: 1,
  driftBoost: false,
};

export class FeedSettingsError extends Error {
  constructor(message) {
    super(message);
    this.name = "FeedSettingsError";
  }
}

// Preset tables (section 3.5); each value is a DEFAULT_CONFIG override, balanced is always inert.
export const EXPLORATION_PRESETS = {
  focused: { warmMix: { core: 0.65, adjacent: 0.15, explore: 0.08, fresh: 0.12 }, coldMix: { core: 0.3, adjacent: 0.15, explore: 0.45, fresh: 0.1 }, optimismZ: 0.8, warmAfterEvents: 25, probeRate: 0.18 },
  balanced: {},
  adventurous: { warmMix: { core: 0.35, adjacent: 0.3, explore: 0.3, fresh: 0.05 }, coldMix: { core: 0.1, adjacent: 0.2, explore: 0.65, fresh: 0.05 }, optimismZ: 2.2, warmAfterEvents: 70, warmPoolEvidence: 12, probeRate: 0.1 },
};

export const VARIETY_PRESETS = {
  tight: { fatigueStrength: 0.08, maxTopicPerWindow: 4, maxSubtopicPerWindow: 3, maxTopicRun: 3, maxTopicPerBatch: 4, maxCoreTopics: 4 },
  balanced: {},
  wide: { fatigueStrength: 0.3, maxTopicPerWindow: 2, maxSubtopicPerWindow: 1, maxTopicRun: 1, maxTopicPerBatch: 2, maxCoreTopics: 8, similarMaxPerSubtopic: 1 },
};

// balanced (.45) equals DEFAULT_CONFIG.similarShare, so it stays empty to keep defaults inert.
export const SIMILAR_PRESETS = {
  off: { similarShare: 0 },
  low: { similarShare: 0.2 },
  balanced: {},
  high: { similarShare: 0.6, similarMaxPerSubtopic: 3 },
};

// Reactivity tunes both engine forgetting (config) and taste channels (tasteConfig, merged by taste.mergeTasteConfig).
export const REACTIVITY_PRESETS = {
  steady: { config: { eventDecay: 0.998, halfLifeMs: 10 * DAY }, tasteConfig: { short: { halfLifeMs: 2 * HOUR, eventDecay: 0.93 }, long: { halfLifeMs: 30 * DAY, eventDecay: 0.999 } } },
  balanced: { config: {}, tasteConfig: {} },
  fast: { config: { eventDecay: 0.985, halfLifeMs: 2 * DAY }, tasteConfig: { short: { halfLifeMs: 20 * 60000, eventDecay: 0.8 }, long: { halfLifeMs: 7 * DAY, eventDecay: 0.995 } } },
};

export const RABBIT_HOLE_CONFIG = { warmMix: { core: 0.65, adjacent: 0.15, explore: 0.1, fresh: 0.1 }, probeRate: 0.3, probeLift: 1.2, minProbeGap: 3, advanceOnProbeLikes: 1, maxTopicPerWindow: 4, maxSubtopicPerWindow: 3, maxTopicRun: 3 };

export const NON_PROFILED_CONFIG = { profileFree: true, similarShare: 0, mixJitter: 0, freshShare: 1, freshPoolSize: 400 };

const DRIFT_BOOST_CONFIG = { exploreBoost: 0.6 };

const ENUMS = {
  recency: RECENCY_MODES,
  exploration: Object.keys(EXPLORATION_PRESETS),
  variety: Object.keys(VARIETY_PRESETS),
  similar: Object.keys(SIMILAR_PRESETS),
  reactivity: Object.keys(REACTIVITY_PRESETS),
  intensityCap: ["any", "moderate", "calm"],
};
const DEPTH_TARGETS = ["gentle", "balanced", "deep"];
const TOPIC_CAPS = { mute: 30, boost: 10, exclude: 20 };
const TOPIC_ID = /^[a-z0-9-]+(\/[a-z0-9-]+)?$/;
const NESTED = ["rabbitHole", "topics", "emotionDials", "depth", "signalWeights"];

const isObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const fail = (message) => { throw new FeedSettingsError(message); };

function oneOf(key, value, allowed) {
  if (!allowed.includes(value)) fail(`Unknown ${key} mode "${value}".`);
  return value;
}

function bool(key, value) {
  if (typeof value !== "boolean") fail(`${key} must be a boolean.`);
  return value;
}

function inRange(key, value, lo, hi) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < lo || value > hi) fail(`${key} must be a number between ${lo} and ${hi}.`);
  return value;
}

function objectOf(key, value) {
  if (!isObject(value)) fail(`${key} must be an object.`);
  return value;
}

function topicList(key, value) {
  if (!Array.isArray(value)) fail(`topics.${key} must be an array.`);
  for (const id of value) if (typeof id !== "string" || !TOPIC_ID.test(id)) fail(`Invalid topic id "${id}" in topics.${key}.`);
  const list = [...new Set(value)];
  if (list.length > TOPIC_CAPS[key]) fail(`topics.${key} allows at most ${TOPIC_CAPS[key]} entries.`);
  return list;
}

// A muted id can never also be boosted.
const withoutMuted = (topics) => (topics.mute && topics.boost ? { ...topics, boost: topics.boost.filter((id) => !topics.mute.includes(id)) } : topics);

// Validates a settings patch; returns only the keys present (nested objects too). Throws FeedSettingsError.
export function cleanSettings(input = {}) {
  objectOf("settings", input);
  const out = {};
  for (const key of Object.keys(ENUMS)) if (key in input) out[key] = oneOf(key, input[key], ENUMS[key]);
  for (const key of ["nonProfiled", "minor", "driftBoost"]) if (key in input) out[key] = bool(key, input[key]);
  if ("negativeStrength" in input) out.negativeStrength = inRange("negativeStrength", input.negativeStrength, 0.25, 3);
  if ("rabbitHole" in input) {
    const rh = objectOf("rabbitHole", input.rabbitHole);
    out.rabbitHole = {};
    if ("enabled" in rh) out.rabbitHole.enabled = bool("rabbitHole.enabled", rh.enabled);
    if ("maxLevelsPerSession" in rh) {
      if (!Number.isInteger(rh.maxLevelsPerSession) || rh.maxLevelsPerSession < 1 || rh.maxLevelsPerSession > 3) fail("rabbitHole.maxLevelsPerSession must be an integer from 1 to 3.");
      out.rabbitHole.maxLevelsPerSession = rh.maxLevelsPerSession;
    }
  }
  if ("topics" in input) {
    const t = objectOf("topics", input.topics);
    const topics = {};
    for (const key of Object.keys(TOPIC_CAPS)) if (key in t) topics[key] = topicList(key, t[key]);
    out.topics = withoutMuted(topics);
  }
  if ("emotionDials" in input) {
    const d = objectOf("emotionDials", input.emotionDials);
    out.emotionDials = {};
    for (const [bucket, value] of Object.entries(d)) {
      if (!EMOTION_BUCKETS.includes(bucket)) fail(`Unknown emotion "${bucket}".`);
      out.emotionDials[bucket] = Math.round(inRange(`emotionDials.${bucket}`, value, -1, 1) * 2) / 2 || 0;
    }
  }
  if ("depth" in input) {
    const d = objectOf("depth", input.depth);
    out.depth = {};
    if ("target" in d) out.depth.target = oneOf("depth.target", d.target, DEPTH_TARGETS);
    if ("basicsSuppression" in d) out.depth.basicsSuppression = bool("depth.basicsSuppression", d.basicsSuppression);
  }
  if ("signalWeights" in input) {
    const w = objectOf("signalWeights", input.signalWeights);
    out.signalWeights = {};
    for (const [signal, value] of Object.entries(w)) {
      if (!SIGNAL_WEIGHT_KEYS.includes(signal)) fail(`Unknown signal "${signal}".`);
      out.signalWeights[signal] = inRange(`signalWeights.${signal}`, value, 0, 3);
    }
  }
  return out;
}

// Shallow top-level merge; nested objects merge one level deep (always fresh copies) and a mute always wins over a boost.
export function mergeSettings(current = {}, patch = {}) {
  const base = isObject(current) ? current : {};
  const next = { ...base, ...patch };
  for (const key of NESTED) if (isObject(base[key]) || isObject(patch[key])) next[key] = { ...(isObject(base[key]) ? base[key] : {}), ...(isObject(patch[key]) ? patch[key] : {}) };
  if (isObject(next.topics)) next.topics = withoutMuted(Object.fromEntries(Object.entries(next.topics).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])));
  return next;
}

// Drift boost lasts while the reader is shifted and within the boostUntilShown impression budget (0 = not yet stamped).
const driftBoostActive = (s, drift, shown) => Boolean(s.driftBoost && drift?.shifted && (!drift.boostUntilShown || shown == null || shown < drift.boostUntilShown));

// Turns stored settings into engine config overrides (defaults resolve to {}), taste overrides and the per-module knobs.
export function resolveSettings(settings, { drift = null, shown = null } = {}) {
  const s = mergeSettings(DEFAULT_SETTINGS, isObject(settings) ? settings : {});
  const reactivity = REACTIVITY_PRESETS[s.reactivity] || REACTIVITY_PRESETS.balanced;
  const config = {
    ...(EXPLORATION_PRESETS[s.exploration] || {}),
    ...(VARIETY_PRESETS[s.variety] || {}),
    ...(SIMILAR_PRESETS[s.similar] || {}),
    ...reactivity.config,
    ...(RECENCY_PRESETS[s.recency] || {}),
    ...(s.rabbitHole.enabled ? RABBIT_HOLE_CONFIG : {}),
    ...(s.nonProfiled ? NON_PROFILED_CONFIG : {}),
    ...(driftBoostActive(s, drift, shown) ? DRIFT_BOOST_CONFIG : {}),
  };
  if (isObject(s.signalWeights) && Object.keys(s.signalWeights).length) config.signalWeights = { ...s.signalWeights };
  if (typeof s.negativeStrength === "number" && s.negativeStrength !== 1) config.negativeStrength = s.negativeStrength;
  const mute = new Set(s.topics.mute || []);
  return {
    config,
    tasteConfig: structuredClone(reactivity.tasteConfig),
    topics: { mute, boost: new Set(s.nonProfiled ? [] : (s.topics.boost || []).filter((id) => !mute.has(id))), exclude: new Set(s.topics.exclude || []) },
    emotionDials: { ...DEFAULT_SETTINGS.emotionDials, ...s.emotionDials },
    intensityCap: s.intensityCap,
    minor: Boolean(s.minor),
    depth: { target: s.depth.target, basicsSuppression: s.depth.basicsSuppression !== false },
    rabbitHole: { enabled: Boolean(s.rabbitHole.enabled), maxLevels: s.minor ? 1 : s.rabbitHole.maxLevelsPerSession },
    nonProfiled: Boolean(s.nonProfiled),
  };
}
