// Reader taste as embeddings: decayed sums of the vectors of images they engaged with. Long-term
// vectors per interest topic, a short-term one (what they are into right now) and a negative one
// (hides) give the query vectors for nearest-neighbour "more like this" candidates. Pure; no I/O.
import { engagementSignal } from "./engine.mjs";

export const TASTE_CONFIG = {
  long: { halfLifeMs: 14 * 24 * 3600000, eventDecay: 0.998 },
  short: { halfLifeMs: 45 * 60000, eventDecay: 0.88 },
  negative: { halfLifeMs: 3 * 24 * 3600000, eventDecay: 0.99 },
  // Long-term weight at which similarity candidates get their full share of the batch.
  readyWeight: 8,
  // One long-term vector per topic (multi-interest), so two loves don't average into neither.
  maxTopics: 8,
  queryTopics: 3,
  minTopicWeight: 1.5,
  negativeBlend: 0.2,
};

export function createTaste() {
  return { topics: {}, short: null, negative: null, events: 0 };
}

export function normalize(vector) {
  let sum = 0;
  for (const x of vector) sum += x * x;
  const norm = Math.sqrt(sum);
  return norm > 0 ? Array.from(vector, (x) => x / norm) : null;
}

export function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
  return sum;
}

// Channel { v: weighted sum, w: total weight, at, ev } decayed by age and by events since its last update.
function decayChannel(channel, now, events, { halfLifeMs, eventDecay }) {
  if (!channel) return null;
  const k = Math.pow(0.5, Math.max(0, now - channel.at) / halfLifeMs) * Math.pow(eventDecay, Math.max(0, events - channel.ev));
  return { v: channel.v.map((x) => x * k), w: channel.w * k, at: now, ev: events };
}

function addTo(channel, embedding, weight, now, events) {
  const base = channel || { v: new Array(embedding.length).fill(0), w: 0, at: now, ev: events };
  return { v: base.v.map((x, i) => +(x + weight * embedding[i]).toFixed(6)), w: base.w + weight, at: now, ev: events };
}

const decayedWeight = (channel, now, events, config) => decayChannel(channel, now, events, config.long)?.w || 0;

// Positive and negative strength of one engagement event (likes/saves pull, hides push hard, skips push a little).
export function tasteSignal(event = {}) {
  const { success, weight } = engagementSignal(event);
  const positive = success > 0.5 ? weight * (success - 0.5) * 2 : 0;
  const negative = event.type === "hide" ? 2.5 : event.type === "skip" ? 0.3 : 0;
  return { positive, negative };
}

// Folds one event on an item (`embedding` unit vector, `topicId` its topic) into the taste channels.
export function recordTaste(taste, embedding, event, { topicId = "_", now = Date.now(), config = TASTE_CONFIG } = {}) {
  if (!embedding?.length) return taste;
  const { positive, negative } = tasteSignal(event);
  const events = taste.events;
  if (positive > 0) {
    taste.topics[topicId] = addTo(decayChannel(taste.topics[topicId], now, events, config.long), embedding, positive, now, events + 1);
    taste.short = addTo(decayChannel(taste.short, now, events, config.short), embedding, positive, now, events + 1);
    // Keep the strongest topics only; the weakest falls out.
    const ids = Object.keys(taste.topics);
    if (ids.length > config.maxTopics) {
      const weakest = ids.reduce((a, b) => (decayedWeight(taste.topics[a], now, events, config) <= decayedWeight(taste.topics[b], now, events, config) ? a : b));
      delete taste.topics[weakest];
    }
  }
  if (negative > 0) taste.negative = addTo(decayChannel(taste.negative, now, events, config.negative), embedding, negative, now, events + 1);
  taste.events = events + 1;
  return taste;
}

// Query vectors for similarity search: one per strongest interest topic (minus what was hidden), the
// short-term "right now" vector, and readiness (0 = no evidence, 1 = enough for the full similar share).
export function tasteQuery(taste, { now = Date.now(), config = TASTE_CONFIG } = {}) {
  const events = taste?.events ?? 0;
  const negative = decayChannel(taste?.negative, now, events, config.negative);
  const negativeUnit = negative && negative.w > 0.05 ? normalize(negative.v) : null;
  const negativeWeight = negativeUnit ? config.negativeBlend * Math.min(1, negative.w / 3) : 0;
  const away = (unit) => (unit && negativeWeight ? normalize(unit.map((x, i) => x - negativeWeight * negativeUnit[i])) : unit);
  const channels = Object.entries(taste?.topics || {}).map(([topicId, c]) => ({ topicId, c: decayChannel(c, now, events, config.long) }));
  const total = channels.reduce((sum, { c }) => sum + c.w, 0);
  const interests = channels
    .filter(({ c }) => c.w >= config.minTopicWeight)
    .sort((a, b) => b.c.w - a.c.w)
    .slice(0, config.queryTopics)
    .map(({ topicId, c }) => ({ topicId, weight: +c.w.toFixed(3), vector: away(normalize(c.v)) }))
    .filter((i) => i.vector);
  const short = decayChannel(taste?.short, now, events, config.short);
  const recent = short && short.w > 0.5 ? away(normalize(short.v)) : null;
  return { interests, recent, readiness: interests.length ? Math.min(1, total / config.readyWeight) : 0 };
}

// Every query vector of a taste with how many neighbours to fetch for it: { source → { vector, limit } }.
// Overfetches: composeFeed drops seen items, items past the reader's depth and over-cap horizontals.
export function tasteSearches(query, { perInterest = 60, recent = 40 } = {}) {
  const out = {};
  for (const i of query.interests) out[`taste:${i.topicId}`] = { vector: i.vector, limit: perInterest };
  if (query.recent && query.interests.length) out.recent = { vector: query.recent, limit: recent };
  return out;
}

// Brute-force cosine nearest neighbours over unit vectors ({ id → vector }); for simulations and tests.
export function nearestInMemory(query, vectors, { limit = 50, exclude = new Set() } = {}) {
  if (!query) return [];
  const top = [];
  for (const [id, vector] of vectors) {
    if (exclude.has(id)) continue;
    const similarity = dot(query, vector);
    if (top.length < limit) top.push({ id, similarity });
    else if (similarity > top[top.length - 1].similarity) top[top.length - 1] = { id, similarity };
    else continue;
    top.sort((a, b) => b.similarity - a.similarity);
  }
  return top;
}

// Merges neighbour lists ({ source → [{ id, similarity }] }) into unique candidates for composeFeed.
export function similarCandidates(lists, byId) {
  const out = new Map();
  for (const [source, rows] of Object.entries(lists))
    for (const row of rows || []) {
      const item = byId.get(row.id);
      if (!item) continue;
      const prev = out.get(row.id);
      if (!prev || prev.similarity < row.similarity) out.set(row.id, { item, similarity: row.similarity, source });
    }
  return [...out.values()].sort((a, b) => b.similarity - a.similarity);
}
