// Signal routing: turns one reader event into a Route that says how much it moves interest nodes,
// taste liking, the emotion profile, knowledge and stated answers. Pure; no I/O.
import { EMOTION_IDS, isNegativeArousal } from "./emotion.mjs";

export { EMOTION_IDS };

export const EVENT_TYPES = ["like", "save", "share", "comment", "dwell", "skip", "hide", "react", "knew_this", "learned", "explore_click", "outbound", "probe_answer", "undo"];
export const HIDE_REASONS = ["this_item", "this_topic", "seen_it", "upsetting"];
export const EXPLORE_SOURCES = ["similar", "search", "steer"];
export const PROBE_ANSWERS = { interest: ["more", "same", "less"], knowledge: ["new", "some", "know"] };
export const UNDOABLE_TYPES = ["like", "save", "hide", "react", "knew_this", "learned", "share"];

// How far one event's interest spreads up the item's tree path (all = the reader's overall rate).
export const SPREADS = Object.freeze({
  FULL: Object.freeze({ horizontal: 1, step: 0.9, sub: 0.8, topic: 0.6, all: 1 }),
  HORIZONTAL_ONLY: Object.freeze({ horizontal: 1, step: 0, sub: 0, topic: 0, all: 1 }),
  REACT: Object.freeze({ horizontal: 1, step: 0.9, sub: 0.8, topic: 0.3, all: 1 }),
  SUB_STRONG: Object.freeze({ horizontal: 1, step: 1, sub: 1, topic: 0.3, all: 1 }),
  SUB_CAPPED: Object.freeze({ horizontal: 1, step: 0.9, sub: 0.8, topic: 0, all: 1 }),
});

// Defaults for the config keys this module reads (engine.DEFAULT_CONFIG carries the same values).
const DEFAULTS = {
  dwellSuccessCap: 0.6,
  skipRunThreshold: 2,
  skipRunWindowEvents: 100,
  skipSpread: { horizontal: 1, step: 0.9, sub: 0.7, topic: 0, all: 1 },
  negativeStrength: 1,
};

const like = (long, short = long, negative = 0) => ({ long, short, negative });
const reactRule = (weight, liking) => ({ interest: { success: 1, weight, spread: "REACT" }, liking: like(liking), emotion: { kind: "react", amount: 1, from: "event" } });
const reactOnly = { emotion: { kind: "react", amount: 1, from: "event" } };
// Anger or disgust at an item is a vote for less of that emotion (affinity goes negative), never for more.
const rejectOnly = { emotion: { kind: "reject", amount: 1, from: "event" } };

// Per-signal routing numbers keyed by type or type:variant; liking "legacy" = weight*(success-.5)*2.
export const DEFAULT_SIGNAL_TABLE = Object.freeze({
  like: { interest: { success: 1, weight: 1.2, spread: "FULL" }, liking: like(1.2), emotion: { kind: "engage", amount: 1, from: "item" } },
  save: { interest: { success: 1, weight: 1.6, spread: "FULL" }, liking: like(1.6), emotion: { kind: "engage", amount: 1, from: "item" }, knowledge: { outcome: 0.5, strength: 0.15 } },
  share: { interest: { success: 1, weight: 1.6, spread: "FULL" }, liking: like(1.6), emotion: { kind: "react", amount: 0.5, from: "reaction" } },
  comment: { interest: { success: 0.9, weight: 1.2, spread: "FULL" }, liking: "legacy" },
  dwell: { interest: { success: 0.45, weight: 0.7, spread: "FULL" }, minMs: 2500, perMs: 1 / 20000, liking: "legacy" },
  "dwell:short": { interest: { success: 0.1, weight: 0.5, spread: "FULL" } },
  skip: { interest: { success: 0, weight: 0.8, spread: "skip" }, liking: like(0, -0.3, 0), knowledge: { outcome: 1, strength: 0.15, whenLiked: true, maxLevel: 2 } },
  hide: { interest: { success: 0, weight: 2.5, spread: "FULL" }, liking: like(0, 0, 2.5) },
  "hide:this_item": { interest: { success: 0, weight: 2.5, spread: "HORIZONTAL_ONLY" }, liking: like(0, 0, 2.5) },
  "hide:this_topic": { interest: { success: 0, weight: 3, spread: "SUB_STRONG" }, liking: like(0, 0, 3) },
  "hide:seen_it": { knowledge: { outcome: 1, strength: 0.6 } },
  "hide:upsetting": { interest: { success: 0, weight: 2.5, spread: "HORIZONTAL_ONLY" }, liking: like(0, 0, 2.5), emotion: { kind: "reject", amount: 1, from: "item" } },
  "react:amused": reactRule(0.6, 0.6),
  "react:amazed": reactRule(0.6, 0.6),
  "react:moved": reactRule(0.6, 0.4),
  "react:curious": reactRule(0.5, 0.3),
  "react:sad": reactOnly,
  "react:angry": rejectOnly,
  "react:disgusted": rejectOnly,
  knew_this: { knowledge: { outcome: 1, strength: 0.5, floor: true } },
  learned: { interest: { success: 1, weight: 0.8, spread: "REACT" }, liking: like(0.6), knowledge: { outcome: 0.5, strength: 0.6 } },
  explore_click: { interest: { success: 1, weight: 0.6, spread: "SUB_CAPPED" }, liking: like(1) },
  outbound: { interest: { success: 1, weight: 1.2, spread: "FULL" } },
  "probe_answer:interest:more": { interest: { success: 1, weight: 3, spread: "SUB_STRONG" } },
  "probe_answer:interest:same": { interest: { success: 1, weight: 0.8, spread: "SUB_STRONG" } },
  "probe_answer:interest:less": { interest: { success: 0, weight: 3, spread: "SUB_STRONG" } },
  "probe_answer:knowledge:new": { knowledge: { outcome: 0, strength: 1 } },
  "probe_answer:knowledge:some": { knowledge: { outcome: 0.5, strength: 1 } },
  "probe_answer:knowledge:know": { knowledge: { outcome: 1, strength: 1 } },
  undo: {},
  // Unknown types keep the legacy fallback so engagementSignal stays backward compatible.
  unknown: { interest: { success: 0.2, weight: 0.2, spread: "FULL" }, liking: "legacy" },
});

// Signals whose interest and liking a negative-arousal reaction on the same item suppresses.
const GATED_TYPES = new Set(["like", "save", "share", "comment", "dwell"]);
const HIDE_TYPES = new Set(["hide", "skip"]);

const EID = /^[!-~]{1,40}$/;
const SUB = /^[a-z0-9-]+(\/[a-z0-9-]+)?$/;
const str = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const okEid = (v) => (typeof v === "string" && EID.test(v) ? v : null);
const okSub = (v) => (typeof v === "string" && v.length <= 80 && SUB.test(v) ? v : null);

// Validates one client event; drops unknown/invalid fields, null when the event itself is unusable.
export function normalizeEvent(raw, { hasPost = true } = {}) {
  if (!raw || typeof raw !== "object" || !EVENT_TYPES.includes(raw.type)) return null;
  const type = raw.type;
  const postId = raw.postId == null || raw.postId === "" ? null : String(raw.postId).slice(0, 80);
  if (type === "undo") {
    const of = okEid(raw.of);
    if (!of) return null;
    const event = { postId, type, of };
    const eid = okEid(raw.eid);
    if (eid) event.eid = eid;
    return event;
  }
  const exists = typeof hasPost === "function" ? postId != null && hasPost(postId) : postId != null && hasPost !== false;
  if (!exists) return null;
  const event = { postId, type, dwellMs: Math.max(0, Math.min(600000, Number(raw.dwellMs) || 0)), slot: str(raw.slot, 20) };
  const eid = okEid(raw.eid);
  if (eid) event.eid = eid;
  if (type === "hide" && HIDE_REASONS.includes(raw.reason)) event.reason = raw.reason;
  if ((type === "react" || type === "share") && EMOTION_IDS.includes(raw.emotion)) event.emotion = raw.emotion;
  if (type === "react" && !event.emotion) return null;
  if (type === "explore_click" && EXPLORE_SOURCES.includes(raw.source)) event.source = raw.source;
  if (type === "probe_answer") {
    const sub = okSub(raw.sub);
    if (!PROBE_ANSWERS[raw.probe]?.includes(raw.answer) || !sub) return null;
    Object.assign(event, { probe: raw.probe, answer: raw.answer, sub });
  }
  return event;
}

// Table key for an event: type, or type:variant for hide reasons, reactions, probe answers and short dwells.
function ruleKey(event, table) {
  const { type } = event;
  if (type === "hide") return event.reason ? `hide:${event.reason}` : "hide";
  if (type === "react") return `react:${event.emotion}`;
  if (type === "probe_answer") return `probe_answer:${event.probe}:${event.answer}`;
  if (type === "dwell") return Number(event.dwellMs || 0) >= (table.dwell?.minMs ?? 2500) ? "dwell" : "dwell:short";
  return type;
}

const bucketOf = (v) => (typeof v === "string" ? v : v?.bucket ?? null);
const subOf = (item) => (item ? (item.topicId && item.subtopicId ? `${item.topicId}/${item.subtopicId}` : item.subjectPath ?? null) : null);
const levelOf = (item) => {
  const v = item?.difficulty?.level ?? item?.level?.value ?? item?.level;
  return Number.isFinite(v) ? v : null;
};

function spreadFor(spread, config, escalateSkip) {
  if (spread === "skip") return escalateSkip ? SPREADS.FULL : config.skipSpread ?? DEFAULTS.skipSpread;
  return typeof spread === "string" ? SPREADS[spread] ?? SPREADS.FULL : spread ?? SPREADS.FULL;
}

const legacyLiking = ({ success, weight }) => (success > 0.5 ? like(weight * (success - 0.5) * 2) : null);

// Routes one normalized event to the learning stores; never throws.
export function routeEvent(event = {}, ctx = {}) {
  const { item = null, config = {}, itemEmotion = null, negativeReaction = false, subLiked = false, escalateSkip = false, reaction = null } = ctx;
  const type = event.type;
  const table = config.signalTable ? { ...DEFAULT_SIGNAL_TABLE, ...config.signalTable } : DEFAULT_SIGNAL_TABLE;
  const known = EVENT_TYPES.includes(type);
  const rule = (known ? table[ruleKey(event, table)] : table.unknown) || {};
  const route = { type, interest: null, liking: null, emotion: null, knowledge: null, stated: null, flags: {} };
  if (event.eid) route.eid = event.eid;

  if (rule.interest) {
    let { success } = rule.interest;
    if (type === "dwell" && rule.perMs) success = Math.min(config.dwellSuccessCap ?? DEFAULTS.dwellSuccessCap, success + Number(event.dwellMs || 0) * rule.perMs);
    route.interest = { success, weight: rule.interest.weight, spread: spreadFor(rule.interest.spread, config, escalateSkip) };
    if (type === "skip") route.interest.skip = true;
  }
  if (rule.liking === "legacy") route.liking = route.interest ? legacyLiking(route.interest) : null;
  else if (rule.liking) route.liking = { ...rule.liking };

  const itemBucket = bucketOf(itemEmotion);
  const reactionBucket = event.emotion ?? reaction ?? null;
  if (rule.emotion) {
    const { kind, amount, from } = rule.emotion;
    if (from === "event" && event.emotion) route.emotion = { bucket: event.emotion, kind, amount };
    else if (from === "item" && itemBucket) route.emotion = { bucket: itemBucket, kind, amount };
    else if (from === "reaction") {
      if (reactionBucket) route.emotion = { bucket: reactionBucket, kind, amount };
      else if (itemBucket) route.emotion = { bucket: itemBucket, kind: "engage", amount: 1 };
    }
  }

  const k = rule.knowledge;
  const sub = type === "probe_answer" ? event.sub : subOf(item);
  if (k && sub && (!k.whenLiked || (subLiked && levelOf(item) != null && levelOf(item) <= k.maxLevel))) {
    route.knowledge = { sub, outcome: k.outcome, strength: k.strength };
    if (k.floor) route.knowledge.floor = true;
  }
  if (type === "probe_answer") route.stated = { probe: event.probe, answer: event.answer, sub: event.sub };

  // Core rule 1: engaging with something that made the reader angry or disgusted is not interest.
  const negative = Boolean(negativeReaction) || (type === "share" && isNegativeArousal(event.emotion));
  if (negative && GATED_TYPES.has(type)) {
    route.interest = null;
    route.liking = null;
    const bucket = reaction ?? (typeof negativeReaction === "string" ? negativeReaction : null) ?? event.emotion ?? itemBucket;
    route.emotion = bucket ? { bucket, kind: "engage", amount: 1 } : null;
    route.flags.gated = true;
  }
  return applyMultipliers(route, type, config);
}

// Core rule 3: operator multipliers on top of the table; zeroed signals drop out entirely.
function applyMultipliers(route, type, config) {
  const sw = Number(config.signalWeights?.[type]);
  const m = Number.isFinite(sw) && sw >= 0 ? sw : 1;
  const nsRaw = Number(config.negativeStrength ?? DEFAULTS.negativeStrength);
  const ns = Number.isFinite(nsRaw) && nsRaw >= 0 ? nsRaw : 1;
  if (route.interest) {
    route.interest.weight *= m * (HIDE_TYPES.has(type) ? ns : 1);
    if (!(route.interest.weight > 0)) route.interest = null;
  }
  if (route.liking) {
    const scale = (v) => v * m * (v < 0 ? ns : 1);
    route.liking = { long: scale(route.liking.long), short: scale(route.liking.short), negative: route.liking.negative * m * ns };
    if (!route.liking.long && !route.liking.short && !route.liking.negative) route.liking = null;
  }
  return route;
}

// Inverse route for undo: negated interest and liking weights; other stores are reverted by their owners.
export function invertRoute(route) {
  if (!route) return route;
  return {
    ...route,
    interest: route.interest ? { ...route.interest, weight: -route.interest.weight } : null,
    liking: route.liking ? { long: -route.liking.long || 0, short: -route.liking.short || 0, negative: -route.liking.negative || 0 } : null,
    flags: { ...route.flags },
  };
}

// Consecutive-skip run in a subject; skipRuns[sub] = { n, at } where at is the event count of the last skip.
export function skipEscalation(skipRuns, sub, { eventsCount = 0, config = {} } = {}) {
  const threshold = config.skipRunThreshold ?? DEFAULTS.skipRunThreshold;
  const windowEvents = config.skipRunWindowEvents ?? DEFAULTS.skipRunWindowEvents;
  const prev = skipRuns?.[sub];
  const live = prev && eventsCount - (prev.at ?? 0) <= windowEvents;
  const run = (live ? prev.n || 0 : 0) + 1;
  return { run, escalate: run >= threshold };
}
