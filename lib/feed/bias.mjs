// Reader bias for composeFeed: mutes and boosts from settings, the emotion/knowledge/intensity item weight,
// emotion-composition weights on topics and subjects, and the governor's per-session depth cap
// (see engine.biasContext for the shape). Pure; no I/O.
import { inferItemEmotion, itemEmotionMultiplier } from "./emotion.mjs";
import { blockedThemes, intensityWeight, maxAllowedFrontier } from "./governor.mjs";
import { itemKnowledgeMultiplier } from "./knowledge.mjs";

// Item emotion inference is pure per catalog item, so it is cached across batches.
const INFERRED = new WeakMap();
export function inferredEmotion(item) {
  if (!item || typeof item !== "object") return inferItemEmotion(item);
  if (!INFERRED.has(item)) INFERRED.set(item, inferItemEmotion(item));
  return INFERRED.get(item);
}

// Per-topic and per-subject emotion mix of a catalog index ({ topics, subs }: key → { n, groups: "bucket|confidence" → count }), cached per index.
const COMPOSITION = new WeakMap();
export function emotionComposition(index) {
  if (!index?.topics) return null;
  if (COMPOSITION.has(index)) return COMPOSITION.get(index);
  const topics = new Map();
  const subs = new Map();
  const add = (map, key, group) => {
    const row = map.get(key) || map.set(key, { n: 0, groups: new Map() }).get(key);
    row.n += 1;
    if (group) row.groups.set(group, (row.groups.get(group) || 0) + 1);
  };
  for (const [topicId, topic] of index.topics)
    for (const [subKey, sub] of topic.subtopics)
      for (const step of sub.steps.values())
        for (const h of step.horizontals.values())
          for (const item of h.items) {
            const { bucket, confidence } = inferredEmotion(item);
            const group = bucket && confidence ? `${bucket}|${confidence}` : null;
            add(topics, topicId, group);
            add(subs, subKey, group);
          }
  const out = { topics, subs };
  COMPOSITION.set(index, out);
  return out;
}

// Topic/subject weights: the mean emotion multiplier of the node's items under the dials and learned affinity,
// so a dial (or a learned dislike) moves topic and subject selection, not just the pick inside a horizontal. Null when inert.
export function emotionNodeWeights(index, { emotion = null, dials = null, now = Date.now() } = {}) {
  const comp = emotionComposition(index);
  if (!comp) return null;
  const mults = new Map();
  const multOf = (group) => {
    if (!mults.has(group)) {
      const [bucket, confidence] = group.split("|");
      mults.set(group, itemEmotionMultiplier(null, emotion, { dials, now, inferred: { bucket, confidence: Number(confidence) } }));
    }
    return mults.get(group);
  };
  for (const row of comp.topics.values()) for (const group of row.groups.keys()) multOf(group);
  if ([...mults.values()].every((m) => m === 1)) return null;
  const weight = (row) => {
    if (!row?.n) return 1;
    let sum = row.n;
    for (const [group, count] of row.groups) sum += count * (multOf(group) - 1);
    return sum / row.n;
  };
  return { topicWeight: (id) => weight(comp.topics.get(id)), subWeight: (key) => weight(comp.subs.get(key)) };
}

const split = (ids) => {
  const topics = new Set();
  const subs = new Set();
  for (const id of ids || []) (String(id).includes("/") ? subs : topics).add(String(id));
  return { topics, subs };
};

// Bias from resolved settings; non-profiled readers keep their mutes, dials and intensity caps but no learned weights.
// `index` (the catalog index) turns on the emotion-composition topic/subject weights.
export function buildBias({ state, resolved, now = Date.now(), index = null }) {
  const mute = split(resolved.topics.mute);
  const boost = split(resolved.topics.boost);
  const profiled = !resolved.nonProfiled;
  const emotion = profiled ? state.emotion : null;
  const knowledge = profiled ? state.knowledge : null;
  const blocked = blockedThemes(state.engine?.history || [], { intensityCap: resolved.intensityCap, minor: resolved.minor });
  const governor = state.governor;
  const nodes = index ? emotionNodeWeights(index, { emotion, dials: resolved.emotionDials, now }) : null;
  return {
    excludeTopics: mute.topics,
    excludeSubs: mute.subs,
    boostTopics: boost.topics,
    boostSubs: boost.subs,
    ...(nodes || {}),
    itemWeight: (item) =>
      itemEmotionMultiplier(item, emotion, { dials: resolved.emotionDials, now, inferred: inferredEmotion(item) }) *
      (knowledge ? itemKnowledgeMultiplier(item, knowledge, { target: resolved.depth.target, basicsSuppression: resolved.depth.basicsSuppression, now }) : 1) *
      intensityWeight(item, { blocked, intensityCap: resolved.intensityCap }),
    maxDepthFor: (sub) => (governor?.sessionStart ? maxAllowedFrontier(governor, sub, { maxLevels: resolved.rabbitHole.maxLevels, minor: resolved.minor }) : Infinity),
  };
}
