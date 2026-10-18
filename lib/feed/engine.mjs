// Blended interest-discovery feed. Learns interest per topic-tree node from engagement,
// walks users deeper one step at a time with quiet probes, and assembles every batch so it
// never visibly circles a few topics: shifting mix ratios, spacing caps, fatigue, bridges
// between neighbouring topics, horizontal rotation and score jitter. Optional embedding
// neighbours of the reader's taste vector fill a "similar" slot. Pure; no I/O.
import { DEFAULT_SIGNAL_TABLE, EVENT_TYPES, routeEvent, skipEscalation } from "./signals.mjs";

export const DEFAULT_CONFIG = {
  batchSize: 10,
  // Slot mix once the engine is confident, and while it is still cold.
  warmMix: { core: 0.5, adjacent: 0.25, explore: 0.15, fresh: 0.1 },
  coldMix: { core: 0.15, adjacent: 0.15, explore: 0.6, fresh: 0.1 },
  mixJitter: 0.06,
  warmAfterEvents: 40,
  // …and only as fast as the interest pool has evidence, so a thin pool can't monopolise core slots.
  warmPoolEvidence: 8,
  // A topic joins the core pool once its lift clears interestLift on at least this much evidence.
  minInterestEvidence: 2,
  // Spacing: never the same horizontal back to back; caps inside a sliding window.
  window: 6,
  maxTopicPerWindow: 3,
  maxSubtopicPerWindow: 2,
  maxTopicRun: 2,
  maxTopicPerBatch: 3,
  minProbeGap: 4,
  // Depth funnel.
  probeRate: 0.14,
  // Interest is relative: a node counts once its engagement beats the user's overall rate by this lift.
  interestLift: 1.15,
  probeLift: 1.35,
  maxCoreTopics: 6,
  // After a missed probe, wait this many impressions (× misses, capped at 3) before probing again.
  probeCooldownShown: 12,
  advanceOnProbeLikes: 1,
  // Learning.
  halfLifeMs: 5 * 24 * 3600000,
  // Per-event forgetting so a shift in taste shows up within a session, not days later.
  eventDecay: 0.994,
  // Each node is shrunk toward the user's overall engagement rate with this many pseudo-events.
  priorStrength: 3,
  // Probes use a lower confidence bound: mean − z·sd must beat the baseline by probeLift.
  confidenceZ: 0.75,
  // Exploration is optimistic: topics whose upper bound looks good but lack evidence get re-tested.
  optimismZ: 1.5,
  globalPrior: { a: 1, b: 4 },
  fatigueWindow: 30,
  fatigueStrength: 0.18,
  // Recency: freshness vs popularity when picking inside a horizontal, and the fresh slot's share/pool.
  freshnessHalfLifeDays: 45,
  freshnessWeight: 0.6,
  freshShare: 0.1,
  freshPoolSize: 200,
  freshMaxDepth: 2,
  // Fresh slot only draws items younger than this (null = any age); falls back to the newest pool when empty.
  freshMaxAgeDays: null,
  // 0 = uniform pick from the fresh pool; higher favours the very newest.
  freshBias: 0,
  scoreJitter: 0.25,
  historySize: 120,
  // Embedding neighbours of the reader's taste vector take this share of a warm batch (4–5 of 10),
  // capped per horizontal/subtopic so "more like this" never collapses into one corner.
  similarShare: 0.45,
  // …scaled by how the similar slot performs against the reader's overall rate once it has evidence.
  similarTrustEvidence: 4,
  similarMaxPerHorizontal: 1,
  similarMaxPerSubtopic: 2,
  // Floor on the similar share whenever candidates exist (steering raises it per request via similar.minShare).
  similarMinShare: 0,
  // Candidate weight multiplier for `steer:` similar sources.
  steeringPriority: 2,
  // Signal routing (signals.mjs): per-signal numbers, operator multipliers and negative scaling.
  signalTable: DEFAULT_SIGNAL_TABLE,
  signalWeights: {},
  negativeStrength: 1,
  // A skip only reaches the topic node after this many consecutive skips in a subject (1 = legacy). A subject recurs only every
  // few batches, so the run lives 100 events (at 30 it expired before a disliked topic was ever penalised, starving the focus
  // subject); sub .7 keeps siblings distinguishable. Topic stays 0 for an un-escalated skip.
  skipRunThreshold: 2,
  skipRunWindowEvents: 100,
  skipSpread: { horizontal: 1, step: 0.9, sub: 0.7, topic: 0, all: 1 },
  dwellSuccessCap: 0.6,
  // Non-profiled composition: newest and popular only, no interest model.
  profileFree: false,
  // Drift boost: added to optimismZ and to the explore share of the mix.
  exploreBoost: 0,
};

// Fills partial overrides (e.g. resolved settings) with the defaults; route events with it so signals.mjs sees the engine's skip tuning.
export const engineConfig = (overrides) => (!overrides || overrides === DEFAULT_CONFIG ? DEFAULT_CONFIG : { ...DEFAULT_CONFIG, ...overrides });
const withDefaults = engineConfig;

// How strongly the feed favours the newest posts; each preset overrides DEFAULT_CONFIG.
export const RECENCY_PRESETS = {
  balanced: {},
  fresh: { freshShare: 0.25, freshnessHalfLifeDays: 20, freshnessWeight: 0.75, scoreJitter: 0.15, freshPoolSize: 400, freshMaxAgeDays: 30, freshBias: 1 },
  latest: { freshShare: 0.45, freshnessHalfLifeDays: 7, freshnessWeight: 0.85, scoreJitter: 0.1, freshPoolSize: 300, freshMaxAgeDays: 7, freshBias: 2, freshMaxDepth: 3 },
};
export const RECENCY_MODES = Object.keys(RECENCY_PRESETS);

export const recencyConfig = (mode) => RECENCY_PRESETS[mode] || RECENCY_PRESETS.balanced;

// ------------------------------------------------------------------------------------------------
// Randomness: seeded so simulations and tests are reproducible.

export function createRng(seed = 1) {
  let s = seed >>> 0 || 1;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
  const gamma = (k) => {
    if (k < 1) return gamma(k + 1) * next() ** (1 / k);
    const d = k - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x;
      let v;
      do { x = normal(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = next();
      if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  return {
    next,
    beta: (a, b) => { const x = gamma(a); return x / (x + gamma(b)); },
    pick: (list) => list[Math.floor(next() * list.length)],
    weighted(list, weightOf) {
      const weights = list.map((item) => Math.max(0, weightOf(item)));
      const total = weights.reduce((a, b) => a + b, 0);
      if (!(total > 0)) return list.length ? list[Math.floor(next() * list.length)] : undefined;
      let r = next() * total;
      for (let i = 0; i < list.length; i += 1) { r -= weights[i]; if (r <= 0) return list[i]; }
      return list[list.length - 1];
    },
  };
}

// ------------------------------------------------------------------------------------------------
// Catalog index: items grouped by the topic tree.
// Item: { id, topicId, subtopicId, stepId, depth, horizontalId, createdAt, score, ... }

export function indexCatalog(items, { topicLinks = {} } = {}) {
  const topics = new Map();
  const byId = new Map();
  for (const item of items) {
    if (!item?.id || !item.topicId) continue;
    byId.set(item.id, item);
    const t = topics.get(item.topicId) || topics.set(item.topicId, { id: item.topicId, subtopics: new Map() }).get(item.topicId);
    const subKey = `${item.topicId}/${item.subtopicId}`;
    const s = t.subtopics.get(subKey) || t.subtopics.set(subKey, { key: subKey, topicId: item.topicId, steps: new Map() }).get(subKey);
    const stepKey = `${subKey}/${item.stepId}`;
    const st = s.steps.get(stepKey) || s.steps.set(stepKey, { key: stepKey, depth: item.depth || 1, horizontals: new Map() }).get(stepKey);
    const hKey = `${stepKey}/${item.horizontalId}`;
    const h = st.horizontals.get(hKey) || st.horizontals.set(hKey, { key: hKey, items: [] }).get(hKey);
    h.items.push(item);
  }
  for (const t of topics.values())
    for (const s of t.subtopics.values()) {
      s.byDepth = new Map();
      for (const st of s.steps.values()) {
        for (const h of st.horizontals.values()) h.items.sort((x, y) => Date.parse(y.createdAt || 0) - Date.parse(x.createdAt || 0));
        s.byDepth.set(st.depth, [...(s.byDepth.get(st.depth) || []), st]);
      }
      s.maxDepth = Math.max(...s.byDepth.keys());
    }
  const newest = [...byId.values()].sort((x, y) => Date.parse(y.createdAt || 0) - Date.parse(x.createdAt || 0)).slice(0, 5000);
  return { topics, byId, newest, topicLinks };
}

// Symmetric, normalised topic adjacency from authored `related` lists plus crawled edges.
export function buildTopicLinks(taxonomyTopics, crawledEdges = []) {
  const links = {};
  const add = (a, b, w) => {
    if (a === b) return;
    links[a] = links[a] || {};
    links[a][b] = (links[a][b] || 0) + w;
  };
  for (const t of taxonomyTopics) for (const r of t.related || []) { add(t.id, r, 1); add(r, t.id, 0.6); }
  const max = Math.max(1, ...crawledEdges.map((e) => e.weight));
  for (const e of crawledEdges) { add(e.from, e.to, e.weight / max); add(e.to, e.from, (0.5 * e.weight) / max); }
  return links;
}

// ------------------------------------------------------------------------------------------------
// User state.

export function createUserState() {
  return { nodes: {}, frontier: {}, probes: {}, history: [], seen: [], events: 0, shown: 0, shownAt: {}, skipRuns: {} };
}

const nodeKeys = (item) => {
  const topic = item.topicId;
  const sub = `${topic}/${item.subtopicId}`;
  const step = `${sub}/${item.stepId}`;
  return { topic, sub, step, horizontal: `${step}/${item.horizontalId}` };
};

const ALL = "__all__";
const SLOT = "__slot__:";
const STEER = "steer:";
// sampleTopic/sampleSubtopic multiplier for boosted topics and subjects.
const BOOST = 2.5;

// Node key of a slot's own engagement record (which sources earn their share).
export const slotKey = (slot) => SLOT + slot;

// Observed engagement on a node ({ s: successes, f: failures }), decayed by age and by
// how many events have happened since it was last touched.
function decayed(node, now, config, events = node?.ev ?? 0) {
  if (!node) return { s: 0, f: 0, at: now, ev: events };
  const k = Math.pow(0.5, Math.max(0, now - node.at) / config.halfLifeMs) * Math.pow(config.eventDecay, Math.max(0, events - (node.ev ?? events)));
  return { s: node.s * k, f: node.f * k, at: now, ev: events };
}

function globalRate(state, now, config) {
  const n = decayed(state.nodes[ALL], now, config, state.events);
  return (n.s + config.globalPrior.a) / (n.s + n.f + config.globalPrior.a + config.globalPrior.b);
}

// Posterior for a node, centred on the user's own overall rate until evidence says otherwise.
export function interest(state, key, now, config = DEFAULT_CONFIG) {
  const g = globalRate(state, now, config);
  const n = decayed(state.nodes[key], now, config, state.events);
  const a = n.s + config.priorStrength * g;
  const b = n.f + config.priorStrength * (1 - g);
  const mean = a / (a + b);
  const sd = Math.sqrt((a * b) / ((a + b) ** 2 * (a + b + 1)));
  return { mean, lower: Math.max(0, mean - config.confidenceZ * sd), upper: mean + config.optimismZ * sd, evidence: n.s + n.f, a, b, global: g };
}

// Engagement on a node relative to the user's engagement with everything (1 = average).
export function lift(state, key, now, config = DEFAULT_CONFIG) {
  const it = interest(state, key, now, config);
  return it.mean / it.global;
}

// Engagement → (success, weight) via the signal table; null-interest signals give { 0, 0 }, unknown types the legacy { .2, .2 }.
export function engagementSignal(event = {}, config = DEFAULT_CONFIG) {
  if (!EVENT_TYPES.includes(event?.type)) return { success: 0.2, weight: 0.2 };
  const route = routeEvent(event, { config: withDefaults(config) }).interest;
  return route ? { success: route.success, weight: route.weight } : { success: 0, weight: 0 };
}

// Moves one node by (success, weight); `undo` subtracts the same amounts, clamped at 0.
function bump(state, key, success, w, now, config, undo) {
  const n = decayed(state.nodes[key], now, config, state.events);
  const s = success * w;
  const f = (1 - success) * w;
  state.nodes[key] = undo ? { s: Math.max(0, n.s - s), f: Math.max(0, n.f - f), at: now, ev: state.events } : { s: n.s + s, f: n.f + f, at: now, ev: state.events };
}

// Consecutive-skip run in the item's subject: { run, escalate } for the skip about to be recorded.
export function skipEscalationFor(state, item, { config = DEFAULT_CONFIG } = {}) {
  return skipEscalation(state.skipRuns || {}, nodeKeys(item).sub, { eventsCount: state.events, config: withDefaults(config) });
}

// Applies a routed event (signals.routeEvent) to the item's tree path by its spread, the slot node, skip runs
// and probes. Undo is `sign: -1` or an inverted route (negative weight): it subtracts and never reverts frontier/probes.
export function applyRoute(state, item, route, { now = Date.now(), config = DEFAULT_CONFIG, sign = 1 } = {}) {
  const cfg = withDefaults(config);
  const keys = nodeKeys(item);
  const r = route || {};
  const forward = sign > 0 && !(r.interest?.weight < 0);
  state.skipRuns ||= {};
  if (forward && r.type === "skip") {
    const { run } = skipEscalation(state.skipRuns, keys.sub, { eventsCount: state.events, config: cfg });
    state.skipRuns[keys.sub] = { n: run, at: state.events };
  } else if (forward && r.interest) delete state.skipRuns[keys.sub];
  if (!r.interest) return state;
  const { success } = r.interest;
  const weight = Math.abs(r.interest.weight);
  const spread = r.interest.spread || { horizontal: 1, step: 0.9, sub: 0.8, topic: 0.6, all: 1 };
  // Learning spreads up the tree with diminishing weight: horizontal > step > subtopic > topic.
  for (const [level, key] of [...Object.entries(keys), ["all", ALL]]) {
    const w = weight * (spread[level] ?? 1);
    if (w > 0) bump(state, key, success, w, now, cfg, !forward);
  }
  // Per-slot engagement (the impression's slot from history) tells composeFeed which sources earn their share.
  const shownAs = state.history.findLast((h) => h.id === item.id)?.slot;
  if (shownAs) bump(state, slotKey(shownAs), success, weight, now, cfg, !forward);
  if (!forward) {
    state.events = Math.max(0, state.events - 1);
    return state;
  }
  state.events += 1;
  const frontier = state.frontier[keys.sub] || 1;
  const probe = state.probes[keys.sub] || { likes: 0, misses: 0, cooldownUntilShown: 0 };
  // Any engagement deeper than the known frontier (probe or organic) resolves the probe.
  if ((item.depth || 1) > frontier) {
    if (success >= 0.6) {
      probe.likes += 1;
      if (probe.likes >= cfg.advanceOnProbeLikes) {
        state.frontier[keys.sub] = item.depth;
        probe.likes = 0;
        probe.misses = 0;
      }
    } else {
      probe.misses += 1;
      probe.cooldownUntilShown = (state.shown || 0) + cfg.probeCooldownShown * Math.min(3, probe.misses);
    }
    state.probes[keys.sub] = probe;
  }
  return state;
}

// Routes one engagement event (skips escalate after a run in the subject) and applies it; `route` skips the routing.
export function recordEvent(state, item, event, { now = Date.now(), config = DEFAULT_CONFIG, route = null } = {}) {
  const cfg = withDefaults(config);
  const escalateSkip = !route && event?.type === "skip" && skipEscalationFor(state, item, { config: cfg }).escalate;
  return applyRoute(state, item, route || routeEvent(event, { item, config: cfg, escalateSkip }), { now, config: cfg });
}

// Records that a batch was shown (history drives spacing, fatigue, rotation and dedupe).
export function markShown(state, entries, { now = Date.now(), config = DEFAULT_CONFIG } = {}) {
  for (const entry of entries) {
    const keys = nodeKeys(entry.item);
    const h = { id: entry.item.id, topic: keys.topic, sub: keys.sub, horizontal: keys.horizontal, depth: entry.item.depth || 1, slot: entry.slot, at: now };
    // Governor and funnel metrics read sensitive themes and emotion intensity, only when labelled.
    const { sensitive, emotion } = entry.item;
    if (Array.isArray(sensitive) && sensitive.length) h.sens = [...sensitive];
    if (emotion && typeof emotion === "object" && emotion.bucket) h.emo = emotion.bucket;
    if (emotion && typeof emotion === "object" && Number.isFinite(emotion.intensity)) h.int = emotion.intensity;
    state.history.push(h);
    state.seen.push(entry.item.id);
    state.shownAt[keys.horizontal] = now;
    state.shown = (state.shown || 0) + 1;
  }
  if (state.history.length > config.historySize) state.history.splice(0, state.history.length - config.historySize);
  if (state.seen.length > 5000) state.seen.splice(0, state.seen.length - 5000);
  return state;
}

// ------------------------------------------------------------------------------------------------
// Composition.

function fatigue(state, key, level, config) {
  const recent = state.history.slice(-config.fatigueWindow);
  const shown = recent.filter((h) => h[level] === key).length;
  return Math.exp(-config.fatigueStrength * shown);
}

function slotCounts(mix, size, rng, jitter) {
  const entries = Object.entries(mix).map(([slot, share]) => [slot, Math.max(0.02, share + (rng.next() * 2 - 1) * jitter)]);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  const exact = entries.map(([slot, v]) => [slot, (v / total) * size]);
  const counts = Object.fromEntries(exact.map(([slot, v]) => [slot, Math.floor(v)]));
  let left = size - Object.values(counts).reduce((a, b) => a + b, 0);
  for (const [slot] of exact.sort((x, y) => (y[1] % 1) - (x[1] % 1))) { if (left <= 0) break; counts[slot] += 1; left -= 1; }
  return counts;
}

// Cold → warm blend of the slot mix; a drift boost (exploreBoost) adds to the explore share.
function blendMix(config, events, poolEvidence) {
  const w = Math.min(1, events / config.warmAfterEvents, poolEvidence / config.warmPoolEvidence);
  const mix = Object.fromEntries(Object.keys(config.warmMix).map((k) => [k, config.coldMix[k] * (1 - w) + config.warmMix[k] * w]));
  if (!(config.exploreBoost > 0)) return mix;
  mix.explore = (mix.explore || 0) + config.exploreBoost;
  const total = Object.values(mix).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(mix).map(([k, v]) => [k, v / total]));
}

// Gives the fresh slot `share` of the batch, scaling the other slots to make room.
function withFresh(mix, share) {
  if (share == null || Math.abs(share - (mix.fresh || 0)) < 1e-9) return mix;
  const rest = Object.entries(mix).filter(([k]) => k !== "fresh");
  const total = rest.reduce((a, [, v]) => a + v, 0) || 1;
  return { ...Object.fromEntries(rest.map(([k, v]) => [k, (v / total) * (1 - share)])), fresh: share };
}

const ageDays = (item, now) => Math.max(0, (now - Date.parse(item.createdAt || now)) / 86400000);
const freshness = (item, now, config) => Math.pow(0.5, ageDays(item, now) / config.freshnessHalfLifeDays);

// Freshness + popularity, scaled by the item's bias weight, plus jitter.
function itemScore(item, now, config, rng, w = 1) {
  const pop = Math.log10(10 + Math.max(0, item.score || 0)) / 4;
  return (freshness(item, now, config) * config.freshnessWeight + pop * (1 - config.freshnessWeight)) * w + rng.next() * config.scoreJitter;
}

// Reader bias (mutes, boosts, soft weights) normalised for composeFeed; null keeps the legacy path and its rng draws.
function biasContext(bias, index) {
  if (!bias) return null;
  const finite = (fn, arg) => {
    if (typeof fn !== "function") return 1;
    const v = Number(fn(arg));
    return Number.isFinite(v) ? Math.max(0, v) : 1;
  };
  const memo = (fn) => {
    const cache = new Map();
    return (key) => { if (!cache.has(key)) cache.set(key, fn(key)); return cache.get(key); };
  };
  const exTopics = new Set(bias.excludeTopics || []);
  const exSubs = new Set(bias.excludeSubs || []);
  const topicWeight = memo((id) => finite(bias.topicWeight, id));
  const subWeight = memo((key) => finite(bias.subWeight, key));
  const topicOk = memo((id) => !exTopics.has(id) && topicWeight(id) > 0 && [...(index.topics.get(id)?.subtopics.keys() || [id])].some((k) => !exSubs.has(k) && subWeight(k) > 0));
  const subOk = (key) => topicOk(key.split("/")[0]) && !exSubs.has(key) && subWeight(key) > 0;
  const itemCache = new Map();
  const itemWeight = (item) => {
    if (itemCache.has(item.id)) return itemCache.get(item.id);
    const w = subOk(nodeKeys(item).sub) ? finite(bias.itemWeight, item) : 0;
    itemCache.set(item.id, w);
    return w;
  };
  const boostTopics = new Set(bias.boostTopics || []);
  const boostSubs = new Set(bias.boostSubs || []);
  const maxDepthFor = (key) => {
    const d = typeof bias.maxDepthFor === "function" ? Number(bias.maxDepthFor(key)) : NaN;
    return d >= 1 ? d : Infinity;
  };
  return { topicOk, subOk, topicWeight, subWeight, itemWeight, boostTopics, boostSubs, maxDepthFor };
}

// Picks the best unseen item from a horizontal (freshness + popularity + jitter); biased items scale, weight 0 is skipped.
function pickFromHorizontal(h, ctx) {
  const { seen, taken, now, config, rng, bias } = ctx;
  let best = null;
  let bestScore = -Infinity;
  for (const item of h.items.slice(0, 60)) {
    if (seen.has(item.id) || taken.has(item.id)) continue;
    const w = bias ? bias.itemWeight(item) : 1;
    if (!(w > 0)) continue;
    const s = itemScore(item, now, config, rng, w);
    if (s > bestScore) { best = item; bestScore = s; }
  }
  return best;
}

// Rotates horizontals inside a step: least recently shown, weighted by learned interest.
function pickFromStep(step, ctx) {
  const { state, now, config, rng, bias } = ctx;
  const options = [...step.horizontals.values()].filter((h) => h.items.some((i) => !ctx.seen.has(i.id) && !ctx.taken.has(i.id) && (!bias || bias.itemWeight(i) > 0)));
  if (!options.length) return null;
  const h = rng.weighted(options, (o) => {
    const since = now - (state.shownAt[o.key] || 0);
    const rotation = Math.min(1, since / (20 * 60000)) + 0.15;
    return rotation * (0.4 + interest(state, o.key, now, config).mean) * fatigue(state, o.key, "horizontal", config);
  });
  return pickFromHorizontal(h, ctx);
}

function pickFromSubtopic(sub, depth, ctx) {
  if (!sub) return null;
  const target = Math.max(1, Math.min(sub.maxDepth, depth));
  for (const d of [target, target - 1, target + 1, target - 2, 1]) {
    const steps = sub.byDepth.get(d);
    if (!steps) continue;
    const step = ctx.rng.pick(steps);
    const item = pickFromStep(step, ctx);
    if (item) return item;
  }
  return null;
}

// Thompson sampling over a topic pool, damped by fatigue (excluded topics drop out, boosted ones weigh more).
function sampleTopic(topicIds, ctx, boost = () => 1) {
  const { state, now, config, rng, bias } = ctx;
  const ids = bias ? topicIds.filter((id) => bias.topicOk(id)) : topicIds;
  return rng.weighted(ids, (id) => {
    const it = interest(state, id, now, config);
    const w = rng.beta(it.a, it.b) * fatigue(state, id, "topic", config) * boost(id);
    return bias ? w * bias.topicWeight(id) * (bias.boostTopics.has(id) ? BOOST : 1) : w;
  });
}

function sampleSubtopic(topic, ctx) {
  if (!topic) return undefined;
  const { state, now, config, rng, bias } = ctx;
  const subs = [...topic.subtopics.values()];
  return rng.weighted(bias ? subs.filter((s) => bias.subOk(s.key)) : subs, (s) => {
    const it = interest(state, s.key, now, config);
    const w = rng.beta(it.a, it.b) * fatigue(state, s.key, "sub", config);
    return bias ? w * bias.subWeight(s.key) * (bias.boostSubs.has(s.key) ? BOOST : 1) : w;
  });
}

function rankedInterests(state, index, now, config) {
  return [...index.topics.keys()]
    .map((id) => { const it = interest(state, id, now, config); return { id, ...it, lift: it.mean / it.global }; })
    .filter((t) => t.evidence > 1)
    .sort((x, y) => y.lift - x.lift);
}

const PROFILE_FREE_REASON = "not personalised — newest and popular";

const reasonFor = {
  similar: (source, similarity, label) => {
    if (typeof source === "string" && source.startsWith(STEER)) return label ? `matches your request "${label}"` : "matches your request";
    return `${source === "recent" ? "like what you just engaged with" : "close to images you engage with"} (${Math.round(similarity * 100)}% similar)`;
  },
  core: (item) => `matches your interest in ${item.topicId}`,
  probe: (item, sub) => `quiet probe one step deeper in ${sub} (depth ${item.depth})`,
  adjacent: (item, from) => `bridge from ${from} to ${item.topicId}`,
  explore: (item) => `exploring ${item.topicId}`,
  fresh: (item, now) => { const d = ageDays(item, now); return d < 1 ? "fresh — posted today" : `fresh — posted ${Math.round(d)}d ago`; },
};

// Gives the similar slot `share` of the batch, scaling the other slots down to make room.
function withSimilar(mix, share) {
  if (!(share > 0)) return mix;
  return { ...Object.fromEntries(Object.entries(mix).map(([k, v]) => [k, v * (1 - share)])), similar: share };
}

const isSteered = (source) => typeof source === "string" && source.startsWith(STEER);

// Picks embedding neighbours the reader can take: unseen, within their known depth, not in a subtopic
// they clearly avoid, weighted toward the closest with per-horizontal/subtopic caps.
function pickSimilar(similar, count, ctx) {
  const { state, now, config, rng, bias } = ctx;
  const pool = (similar?.candidates || []).filter((c) => {
    const keys = nodeKeys(c.item);
    if (ctx.seen.has(c.item.id) || ctx.taken.has(c.item.id) || (c.item.depth || 1) > (state.frontier[keys.sub] || 1)) return false;
    if (bias && !(bias.itemWeight(c.item) > 0)) return false;
    const it = interest(state, keys.sub, now, config);
    return !(it.evidence >= 3 && it.mean / it.global < 0.6);
  });
  const perHorizontal = {};
  const perSub = {};
  const picks = [];
  while (picks.length < count && pool.length) {
    const best = Math.max(...pool.map((c) => c.similarity));
    const c = rng.weighted(pool, (o) => {
      const keys = nodeKeys(o.item);
      const w = Math.exp((o.similarity - best) / 0.04) * fatigue(state, keys.sub, "sub", config) * (isSteered(o.source) ? config.steeringPriority : 1);
      return bias ? w * bias.itemWeight(o.item) * bias.topicWeight(keys.topic) * bias.subWeight(keys.sub) : w;
    });
    pool.splice(pool.indexOf(c), 1);
    const keys = nodeKeys(c.item);
    if ((perHorizontal[keys.horizontal] || 0) >= config.similarMaxPerHorizontal || (perSub[keys.sub] || 0) >= config.similarMaxPerSubtopic) continue;
    perHorizontal[keys.horizontal] = (perHorizontal[keys.horizontal] || 0) + 1;
    perSub[keys.sub] = (perSub[keys.sub] || 0) + 1;
    picks.push(c);
  }
  return picks;
}

// Non-profiled batch: newest unseen items scored by freshness and popularity only, all in the fresh slot.
function composeProfileFree(ctx) {
  const { state, index, now, config, rng, bias } = ctx;
  const unseen = index.newest.filter((i) => !ctx.seen.has(i.id) && (!bias || bias.itemWeight(i) > 0));
  const shallow = unseen.filter((i) => (i.depth || 1) <= config.freshMaxDepth);
  const pool = (shallow.length ? shallow : unseen).slice(0, config.freshPoolSize);
  const candidates = pool
    .map((item) => ({ item, score: itemScore(item, now, config, rng, bias ? bias.itemWeight(item) : 1) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, config.batchSize * 2)
    .map(({ item }) => ({ item, slot: "fresh", reason: PROFILE_FREE_REASON, reserve: false }));
  return arrange(candidates, { fresh: config.batchSize }, state, ctx);
}

// Builds one feed batch: [{ item, slot, reason }]. `similar` = { candidates: [{ item, similarity, source }],
// readiness 0–1, minShare?, labels? } from nearest-neighbour searches (taste vectors, `steer:<id>` requests); without it
// the batch is built from the topic tree alone. `bias` (see biasContext) mutes, boosts and reweights; null is inert.
export function composeFeed(state, index, { now = Date.now(), rng = createRng(now), config: overrides = {}, similar = null, bias = null } = {}) {
  // An empty catalog (e.g. before the first crawl) has nothing to compose from.
  if (!index.topics.size) return [];
  let config = { ...DEFAULT_CONFIG, ...overrides };
  if (config.exploreBoost > 0) config = { ...config, optimismZ: config.optimismZ + config.exploreBoost };
  const ctx = { state, index, now, config, rng, seen: new Set(state.seen), taken: new Set(), bias: biasContext(bias, index) };
  const allTopics = ctx.bias ? [...index.topics.keys()].filter((id) => ctx.bias.topicOk(id)) : [...index.topics.keys()];
  // Everything muted: nothing to show.
  if (!allTopics.length) return [];
  if (config.profileFree) return composeProfileFree(ctx);
  const ranked = rankedInterests(state, index, now, config);
  const pool = (ctx.bias ? ranked.filter((t) => ctx.bias.topicOk(t.id)) : ranked).filter((t) => t.lift >= config.interestLift && t.evidence >= config.minInterestEvidence).slice(0, config.maxCoreTopics);
  const interested = pool.map((t) => t.id);
  // Boosted topics (and the topics of boosted subjects) join the core pool.
  if (ctx.bias)
    for (const id of [...ctx.bias.boostTopics, ...[...ctx.bias.boostSubs].map((k) => k.split("/")[0])])
      if (index.topics.has(id) && ctx.bias.topicOk(id) && !interested.includes(id)) interested.push(id);
  const poolEvidence = pool.reduce((sum, t) => sum + t.evidence * Math.min(2, t.lift - 1), 0);
  const trust = interest(state, slotKey("similar"), now, config);
  const similarTrust = trust.evidence >= config.similarTrustEvidence ? Math.max(0.25, Math.min(1.2, trust.mean / trust.global)) : 1;
  let similarShare = similar?.candidates?.length ? Math.min(0.6, config.similarShare * similarTrust * Math.max(0, Math.min(1, similar.readiness ?? 1))) : 0;
  const minShare = Math.max(Number(similar?.minShare) || 0, Number(config.similarMinShare) || 0);
  if (minShare > 0 && similar?.candidates?.length) similarShare = Math.max(similarShare, Math.min(0.6, minShare));
  const counts = slotCounts(withSimilar(withFresh(blendMix(config, state.events, poolEvidence), config.freshShare), similarShare), config.batchSize, rng, config.mixJitter);
  const candidates = [];
  const take = (item, slot, reason, reserve = false, extra = {}) => { if (item) { ctx.taken.add(item.id); candidates.push({ item, slot, reason, reserve, ...extra }); } };

  // Similar: nearest neighbours of the taste vector, picked first so they claim their items.
  for (const c of pickSimilar(similar, (counts.similar || 0) * 2, ctx))
    take(c.item, "similar", reasonFor.similar(c.source, c.similarity, similar?.labels?.[c.source]), false, { similarity: +c.similarity.toFixed(4), ...(isSteered(c.source) ? { steered: true } : {}) });

  // Probe targets: clearly-liked subtopics with room to go deeper and no recent missed probe.
  const probeTargets = [];
  for (const topic of index.topics.values())
    for (const sub of topic.subtopics.values()) {
      if (ctx.bias && !ctx.bias.subOk(sub.key)) continue;
      const frontier = state.frontier[sub.key] || 1;
      if (frontier >= sub.maxDepth || interest(state, sub.key, now, config).evidence < 2) continue;
      if (ctx.bias && frontier + 1 > ctx.bias.maxDepthFor(sub.key)) continue;
      const probe = state.probes[sub.key];
      if (probe && probe.cooldownUntilShown > (state.shown || 0)) continue;
      const it = interest(state, sub.key, now, config);
      if (it.lower / it.global >= config.probeLift) probeTargets.push({ sub, frontier, lift: it.mean / it.global });
    }
  // Core + probes from the topics the user has shown interest in (cold users fall back to explore).
  for (let i = 0; i < counts.core * 2; i += 1) {
    if (probeTargets.length && rng.next() < config.probeRate * 2) {
      const target = rng.weighted(probeTargets, (t) => t.lift ** 2);
      take(pickFromSubtopic(target.sub, target.frontier + 1, ctx), "probe", reasonFor.probe({ depth: target.frontier + 1 }, target.sub.key));
      continue;
    }
    const topic = index.topics.get(sampleTopic(interested.length ? interested : allTopics, ctx));
    if (!topic) break;
    const sub = sampleSubtopic(topic, ctx);
    if (!sub) continue;
    take(pickFromSubtopic(sub, state.frontier[sub.key] || 1, ctx), "core", reasonFor.core({ topicId: topic.id }));
  }
  // Adjacent: neighbours of an interest, kept shallow so the shift feels natural.
  for (let i = 0; i < counts.adjacent * 2; i += 1) {
    const from = interested.length ? sampleTopic(interested, ctx) : rng.pick(allTopics);
    const links = index.topicLinks[from] || {};
    const neighbours = Object.keys(links).filter((id) => index.topics.has(id) && (!ctx.bias || ctx.bias.topicOk(id)));
    if (!neighbours.length) continue;
    const to = sampleTopic(neighbours, ctx, (id) => 0.3 + (links[id] || 0));
    const topic = index.topics.get(to);
    const sub = sampleSubtopic(topic, ctx);
    if (!sub) continue;
    take(pickFromSubtopic(sub, Math.min(2, state.frontier[sub.key] || 1), ctx), "adjacent", reasonFor.adjacent({ topicId: to }, from));
  }
  // Explore: optimistic about topics that might be liked but lack evidence (upper bound vs baseline),
  // and spread across topics not already among this batch's candidates.
  for (let i = 0; i < counts.explore * 2; i += 1) {
    const inBatch = {};
    for (const c of candidates) inBatch[c.item.topicId] = (inBatch[c.item.topicId] || 0) + 1;
    const topicId = rng.weighted(allTopics, (id) => {
      const it = interest(state, id, now, config);
      const w = ((it.upper / it.global) ** 3 / (1 + 0.3 * it.evidence)) * fatigue(state, id, "topic", config) ** 2 * 0.25 ** (inBatch[id] || 0);
      return ctx.bias ? w * ctx.bias.topicWeight(id) : w;
    });
    const topic = index.topics.get(topicId);
    take(pickFromSubtopic(sampleSubtopic(topic, ctx), 1, ctx), "explore", reasonFor.explore({ topicId }));
  }
  // Fresh: newest unseen items anywhere, shallow depth preferred, optionally capped by age and biased to the newest.
  const unseenNewest = index.newest.filter((i) => !ctx.seen.has(i.id) && (i.depth || 1) <= config.freshMaxDepth && (!ctx.bias || ctx.bias.itemWeight(i) > 0));
  const young = config.freshMaxAgeDays == null ? unseenNewest : unseenNewest.filter((i) => ageDays(i, now) <= config.freshMaxAgeDays);
  const freshPool = (young.length ? young : unseenNewest).slice(0, config.freshPoolSize);
  for (let i = 0; i < counts.fresh * 2 && freshPool.length; i += 1) {
    const item = rng.weighted(freshPool, (o) => freshness(o, now, config) ** config.freshBias * (ctx.bias ? ctx.bias.itemWeight(o) : 1));
    if (!ctx.taken.has(item.id)) take(item, "fresh", reasonFor.fresh(item, now));
  }
  // Reserve: shallow picks from topics outside the recent window, so thin catalogs can keep
  // the spacing rules instead of relaxing them. Only used when quota slots don't fit.
  const recentTopics = new Set(state.history.slice(-config.window).map((h) => h.topic));
  const spare = allTopics.filter((id) => !recentTopics.has(id));
  for (let i = 0; i < config.batchSize && spare.length; i += 1) {
    const topicId = spare.splice(Math.floor(rng.next() * spare.length), 1)[0];
    take(pickFromSubtopic(sampleSubtopic(index.topics.get(topicId), ctx), 1, ctx), "explore", reasonFor.explore({ topicId }), true);
  }
  return arrange(candidates, counts, state, ctx);
}

// Orders candidates into the batch while honouring the spacing rules; relaxes the topic
// caps only when nothing else fits, never the same-horizontal-in-a-row rule.
function arrange(candidates, counts, state, ctx) {
  const { config, rng } = ctx;
  const quota = { ...counts };
  const tail = state.history.slice(-config.window).map((h) => ({ topic: h.topic, sub: h.sub, horizontal: h.horizontal, slot: h.slot }));
  const out = [];
  const pool = [...candidates];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const fits = (c, strict) => {
    const k = nodeKeys(c.item);
    const seq = [...tail, ...out.map((o) => nodeKeys(o.item))];
    const last = seq[seq.length - 1];
    if (last && last.horizontal === k.horizontal) return false;
    const win = seq.slice(-(config.window - 1));
    if (strict >= 1 && win.filter((s) => s.sub === k.sub).length >= config.maxSubtopicPerWindow) return false;
    if (strict >= 2 && win.filter((s) => s.topic === k.topic).length >= config.maxTopicPerWindow) return false;
    if (strict >= 1 && out.filter((o) => o.item.topicId === k.topic).length >= config.maxTopicPerBatch) return false;
    if (strict >= 2 && seq.slice(-config.maxTopicRun).length === config.maxTopicRun && seq.slice(-config.maxTopicRun).every((s) => s.topic === k.topic)) return false;
    if (c.slot === "probe") {
      const recentSlots = [...tail.map((t) => t.slot), ...out.map((o) => o.slot)].slice(-(config.minProbeGap - 1));
      if (recentSlots.includes("probe")) return false;
    }
    return true;
  };
  while (out.length < config.batchSize && pool.length) {
    let chosen = -1;
    for (const strict of [2, 1, 0]) {
      // Prefer slots that still have quota, then anything that fits.
      // Quota slots first, then any real candidate, then the reserve — before relaxing a rule.
      chosen = pool.findIndex((c) => !c.reserve && (quota[c.slot === "probe" ? "core" : c.slot] || 0) > 0 && fits(c, strict));
      if (chosen < 0) chosen = pool.findIndex((c) => !c.reserve && fits(c, strict));
      if (chosen < 0) chosen = pool.findIndex((c) => c.reserve && fits(c, strict));
      if (chosen >= 0) break;
    }
    if (chosen < 0) break;
    const [c] = pool.splice(chosen, 1);
    const q = c.slot === "probe" ? "core" : c.slot;
    quota[q] = (quota[q] || 0) - 1;
    out.push({ item: c.item, slot: c.slot, reason: c.reason, ...(c.similarity != null ? { similarity: c.similarity } : {}), ...(c.steered ? { steered: true } : {}) });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// Analytics.

// Share of the last N impressions taken by the 3 most-shown topics (lower = more blended).
export function circlingIndex(history, n = 50) {
  const recent = history.slice(-n);
  if (!recent.length) return 0;
  const counts = {};
  for (const h of recent) counts[h.topic] = (counts[h.topic] || 0) + 1;
  return Object.values(counts).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) / recent.length;
}

export function topicEntropy(history, n = 50) {
  const recent = history.slice(-n);
  const counts = {};
  for (const h of recent) counts[h.topic] = (counts[h.topic] || 0) + 1;
  return -Object.values(counts).reduce((sum, c) => { const p = c / recent.length; return sum + p * Math.log2(p); }, 0);
}

export function profileSummary(state, index, { now = Date.now(), config: overrides = DEFAULT_CONFIG, top = 8 } = {}) {
  const config = withDefaults(overrides);
  const topics = rankedInterests(state, index, now, config).slice(0, top).map((t) => ({ id: t.id, interest: +t.mean.toFixed(3), lift: +t.lift.toFixed(2), evidence: +t.evidence.toFixed(2) }));
  const subtopics = Object.keys(state.nodes)
    .filter((k) => k.split("/").length === 2)
    .map((k) => ({ id: k, ...interest(state, k, now, config), lift: lift(state, k, now, config), depth: state.frontier[k] || 1 }))
    .filter((s) => s.evidence > 0.5)
    .sort((x, y) => y.lift - x.lift)
    .slice(0, top)
    .map((s) => ({ id: s.id, interest: +s.mean.toFixed(3), lift: +s.lift.toFixed(2), knowledgeDepth: s.depth }));
  const slots = {};
  for (const h of state.history.slice(-50)) slots[h.slot] = (slots[h.slot] || 0) + 1;
  return { events: state.events, topics, subtopics, circlingIndex: +circlingIndex(state.history).toFixed(3), entropy: +topicEntropy(state.history).toFixed(3), recentSlots: slots };
}
