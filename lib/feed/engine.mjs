// Blended interest-discovery feed. Learns interest per topic-tree node from engagement,
// walks users deeper one step at a time with quiet probes, and assembles every batch so it
// never visibly circles a few topics: shifting mix ratios, spacing caps, fatigue, bridges
// between neighbouring topics, horizontal rotation and score jitter. Optional embedding
// neighbours of the reader's taste vector fill a "similar" slot. Pure; no I/O.

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
  freshnessHalfLifeDays: 45,
  scoreJitter: 0.25,
  historySize: 120,
  // Embedding neighbours of the reader's taste vector take this share of a warm batch (4–5 of 10),
  // capped per horizontal/subtopic so "more like this" never collapses into one corner.
  similarShare: 0.45,
  // …scaled by how the similar slot performs against the reader's overall rate once it has evidence.
  similarTrustEvidence: 4,
  similarMaxPerHorizontal: 1,
  similarMaxPerSubtopic: 2,
};

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
  const newest = [...byId.values()].sort((x, y) => Date.parse(y.createdAt || 0) - Date.parse(x.createdAt || 0)).slice(0, 2000);
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
  return { nodes: {}, frontier: {}, probes: {}, history: [], seen: [], events: 0, shown: 0, shownAt: {} };
}

const nodeKeys = (item) => {
  const topic = item.topicId;
  const sub = `${topic}/${item.subtopicId}`;
  const step = `${sub}/${item.stepId}`;
  return { topic, sub, step, horizontal: `${step}/${item.horizontalId}` };
};

const ALL = "__all__";
const SLOT = "__slot__:";

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

// Engagement → (success, weight). Skips and hides are informative negatives.
export function engagementSignal(event = {}) {
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

// Applies one engagement event to every level of the item's tree path, and resolves probes.
export function recordEvent(state, item, event, { now = Date.now(), config = DEFAULT_CONFIG } = {}) {
  const { success, weight } = engagementSignal(event);
  const keys = nodeKeys(item);
  // Learning spreads up the tree with diminishing weight: horizontal > step > subtopic > topic.
  const spread = { horizontal: 1, step: 0.9, sub: 0.8, topic: 0.6 };
  for (const [level, key] of [...Object.entries(keys), ["all", ALL]]) {
    const n = decayed(state.nodes[key], now, config, state.events);
    const w = weight * (spread[level] ?? 1);
    state.nodes[key] = { s: n.s + success * w, f: n.f + (1 - success) * w, at: now, ev: state.events };
  }
  // Per-slot engagement (the impression's slot from history) tells composeFeed which sources earn their share.
  const shownAs = state.history.findLast((h) => h.id === item.id)?.slot;
  if (shownAs) {
    const n = decayed(state.nodes[`${SLOT}${shownAs}`], now, config, state.events);
    state.nodes[`${SLOT}${shownAs}`] = { s: n.s + success * weight, f: n.f + (1 - success) * weight, at: now, ev: state.events };
  }
  state.events += 1;
  const frontier = state.frontier[keys.sub] || 1;
  const probe = state.probes[keys.sub] || { likes: 0, misses: 0, cooldownUntilShown: 0 };
  // Any engagement deeper than the known frontier (probe or organic) resolves the probe.
  if ((item.depth || 1) > frontier) {
    if (success >= 0.6) {
      probe.likes += 1;
      if (probe.likes >= config.advanceOnProbeLikes) {
        state.frontier[keys.sub] = item.depth;
        probe.likes = 0;
        probe.misses = 0;
      }
    } else {
      probe.misses += 1;
      probe.cooldownUntilShown = (state.shown || 0) + config.probeCooldownShown * Math.min(3, probe.misses);
    }
    state.probes[keys.sub] = probe;
  }
  return state;
}

// Records that a batch was shown (history drives spacing, fatigue, rotation and dedupe).
export function markShown(state, entries, { now = Date.now(), config = DEFAULT_CONFIG } = {}) {
  for (const entry of entries) {
    const keys = nodeKeys(entry.item);
    state.history.push({ id: entry.item.id, topic: keys.topic, sub: keys.sub, horizontal: keys.horizontal, depth: entry.item.depth || 1, slot: entry.slot, at: now });
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

function blendMix(config, events, poolEvidence) {
  const w = Math.min(1, events / config.warmAfterEvents, poolEvidence / config.warmPoolEvidence);
  return Object.fromEntries(Object.keys(config.warmMix).map((k) => [k, config.coldMix[k] * (1 - w) + config.warmMix[k] * w]));
}

function itemScore(item, now, config, rng) {
  const ageDays = Math.max(0, (now - Date.parse(item.createdAt || now)) / 86400000);
  const fresh = Math.pow(0.5, ageDays / config.freshnessHalfLifeDays);
  const pop = Math.log10(10 + Math.max(0, item.score || 0)) / 4;
  return fresh * 0.6 + pop * 0.4 + rng.next() * config.scoreJitter;
}

// Picks the best unseen item from a horizontal (freshness + popularity + jitter).
function pickFromHorizontal(h, seen, taken, now, config, rng) {
  let best = null;
  let bestScore = -Infinity;
  for (const item of h.items.slice(0, 60)) {
    if (seen.has(item.id) || taken.has(item.id)) continue;
    const s = itemScore(item, now, config, rng);
    if (s > bestScore) { best = item; bestScore = s; }
  }
  return best;
}

// Rotates horizontals inside a step: least recently shown, weighted by learned interest.
function pickFromStep(step, ctx) {
  const { state, now, config, rng } = ctx;
  const options = [...step.horizontals.values()].filter((h) => h.items.some((i) => !ctx.seen.has(i.id) && !ctx.taken.has(i.id)));
  if (!options.length) return null;
  const h = rng.weighted(options, (o) => {
    const since = now - (state.shownAt[o.key] || 0);
    const rotation = Math.min(1, since / (20 * 60000)) + 0.15;
    return rotation * (0.4 + interest(state, o.key, now, config).mean) * fatigue(state, o.key, "horizontal", config);
  });
  return pickFromHorizontal(h, ctx.seen, ctx.taken, now, config, rng);
}

function pickFromSubtopic(sub, depth, ctx) {
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

// Thompson sampling over a topic pool, damped by fatigue.
function sampleTopic(topicIds, ctx, boost = () => 1) {
  const { state, now, config, rng } = ctx;
  return rng.weighted(topicIds, (id) => {
    const it = interest(state, id, now, config);
    return rng.beta(it.a, it.b) * fatigue(state, id, "topic", config) * boost(id);
  });
}

function sampleSubtopic(topic, ctx) {
  const { state, now, config, rng } = ctx;
  return rng.weighted([...topic.subtopics.values()], (s) => {
    const it = interest(state, s.key, now, config);
    return rng.beta(it.a, it.b) * fatigue(state, s.key, "sub", config);
  });
}

function rankedInterests(state, index, now, config) {
  return [...index.topics.keys()]
    .map((id) => { const it = interest(state, id, now, config); return { id, ...it, lift: it.mean / it.global }; })
    .filter((t) => t.evidence > 1)
    .sort((x, y) => y.lift - x.lift);
}

const reasonFor = {
  similar: (source, similarity) => `${source === "recent" ? "like what you just engaged with" : "close to images you engage with"} (${Math.round(similarity * 100)}% similar)`,
  core: (item) => `matches your interest in ${item.topicId}`,
  probe: (item, sub) => `quiet probe one step deeper in ${sub} (depth ${item.depth})`,
  adjacent: (item, from) => `bridge from ${from} to ${item.topicId}`,
  explore: (item) => `exploring ${item.topicId}`,
  fresh: () => "fresh right now",
};

// Gives the similar slot `share` of the batch, scaling the other slots down to make room.
function withSimilar(mix, share) {
  if (!(share > 0)) return mix;
  return { ...Object.fromEntries(Object.entries(mix).map(([k, v]) => [k, v * (1 - share)])), similar: share };
}

// Picks embedding neighbours the reader can take: unseen, within their known depth, not in a subtopic
// they clearly avoid, weighted toward the closest with per-horizontal/subtopic caps.
function pickSimilar(similar, count, ctx) {
  const { state, now, config, rng } = ctx;
  const pool = (similar?.candidates || []).filter((c) => {
    const keys = nodeKeys(c.item);
    if (ctx.seen.has(c.item.id) || ctx.taken.has(c.item.id) || (c.item.depth || 1) > (state.frontier[keys.sub] || 1)) return false;
    const it = interest(state, keys.sub, now, config);
    return !(it.evidence >= 3 && it.mean / it.global < 0.6);
  });
  const perHorizontal = {};
  const perSub = {};
  const picks = [];
  while (picks.length < count && pool.length) {
    const best = Math.max(...pool.map((c) => c.similarity));
    const c = rng.weighted(pool, (o) => Math.exp((o.similarity - best) / 0.04) * fatigue(state, nodeKeys(o.item).sub, "sub", config));
    pool.splice(pool.indexOf(c), 1);
    const keys = nodeKeys(c.item);
    if ((perHorizontal[keys.horizontal] || 0) >= config.similarMaxPerHorizontal || (perSub[keys.sub] || 0) >= config.similarMaxPerSubtopic) continue;
    perHorizontal[keys.horizontal] = (perHorizontal[keys.horizontal] || 0) + 1;
    perSub[keys.sub] = (perSub[keys.sub] || 0) + 1;
    picks.push(c);
  }
  return picks;
}

// Builds one feed batch: [{ item, slot, reason }]. `similar` = { candidates: [{ item, similarity, source }],
// readiness 0–1 } from a nearest-neighbour search on the reader's taste vector (see taste.mjs); without it
// the batch is built from the topic tree alone.
export function composeFeed(state, index, { now = Date.now(), rng = createRng(now), config: overrides = {}, similar = null } = {}) {
  const config = { ...DEFAULT_CONFIG, ...overrides };
  const ctx = { state, index, now, config, rng, seen: new Set(state.seen), taken: new Set() };
  const allTopics = [...index.topics.keys()];
  const ranked = rankedInterests(state, index, now, config);
  const pool = ranked.filter((t) => t.lift >= config.interestLift && t.evidence >= config.minInterestEvidence).slice(0, config.maxCoreTopics);
  const interested = pool.map((t) => t.id);
  const poolEvidence = pool.reduce((sum, t) => sum + t.evidence * Math.min(2, t.lift - 1), 0);
  const trust = interest(state, `${SLOT}similar`, now, config);
  const similarTrust = trust.evidence >= config.similarTrustEvidence ? Math.max(0.25, Math.min(1.2, trust.mean / trust.global)) : 1;
  const similarShare = similar?.candidates?.length ? Math.min(0.6, config.similarShare * similarTrust * Math.max(0, Math.min(1, similar.readiness ?? 1))) : 0;
  const counts = slotCounts(withSimilar(blendMix(config, state.events, poolEvidence), similarShare), config.batchSize, rng, config.mixJitter);
  const candidates = [];
  const take = (item, slot, reason, reserve = false, extra = {}) => { if (item) { ctx.taken.add(item.id); candidates.push({ item, slot, reason, reserve, ...extra }); } };

  // Similar: nearest neighbours of the taste vector, picked first so they claim their items.
  for (const c of pickSimilar(similar, (counts.similar || 0) * 2, ctx))
    take(c.item, "similar", reasonFor.similar(c.source, c.similarity), false, { similarity: +c.similarity.toFixed(4) });

  // Probe targets: clearly-liked subtopics with room to go deeper and no recent missed probe.
  const probeTargets = [];
  for (const topic of index.topics.values())
    for (const sub of topic.subtopics.values()) {
      const frontier = state.frontier[sub.key] || 1;
      if (frontier >= sub.maxDepth || interest(state, sub.key, now, config).evidence < 2) continue;
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
    take(pickFromSubtopic(sub, state.frontier[sub.key] || 1, ctx), "core", reasonFor.core({ topicId: topic.id }));
  }
  // Adjacent: neighbours of an interest, kept shallow so the shift feels natural.
  for (let i = 0; i < counts.adjacent * 2; i += 1) {
    const from = interested.length ? sampleTopic(interested, ctx) : rng.pick(allTopics);
    const links = index.topicLinks[from] || {};
    const neighbours = Object.keys(links).filter((id) => index.topics.has(id));
    if (!neighbours.length) continue;
    const to = sampleTopic(neighbours, ctx, (id) => 0.3 + (links[id] || 0));
    const topic = index.topics.get(to);
    const sub = sampleSubtopic(topic, ctx);
    take(pickFromSubtopic(sub, Math.min(2, state.frontier[sub.key] || 1), ctx), "adjacent", reasonFor.adjacent({ topicId: to }, from));
  }
  // Explore: optimistic about topics that might be liked but lack evidence (upper bound vs baseline),
  // and spread across topics not already among this batch's candidates.
  for (let i = 0; i < counts.explore * 2; i += 1) {
    const inBatch = {};
    for (const c of candidates) inBatch[c.item.topicId] = (inBatch[c.item.topicId] || 0) + 1;
    const topicId = rng.weighted(allTopics, (id) => {
      const it = interest(state, id, now, config);
      return ((it.upper / it.global) ** 3 / (1 + 0.3 * it.evidence)) * fatigue(state, id, "topic", config) ** 2 * 0.25 ** (inBatch[id] || 0);
    });
    const topic = index.topics.get(topicId);
    take(pickFromSubtopic(sampleSubtopic(topic, ctx), 1, ctx), "explore", reasonFor.explore({ topicId }));
  }
  // Fresh: newest unseen items anywhere, shallow depth preferred.
  const freshPool = index.newest.filter((i) => !ctx.seen.has(i.id) && (i.depth || 1) <= 2).slice(0, 200);
  for (let i = 0; i < counts.fresh * 2 && freshPool.length; i += 1) {
    const item = rng.pick(freshPool);
    if (!ctx.taken.has(item.id)) take(item, "fresh", reasonFor.fresh());
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
    out.push({ item: c.item, slot: c.slot, reason: c.reason, ...(c.similarity != null ? { similarity: c.similarity } : {}) });
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

export function profileSummary(state, index, { now = Date.now(), config = DEFAULT_CONFIG, top = 8 } = {}) {
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
