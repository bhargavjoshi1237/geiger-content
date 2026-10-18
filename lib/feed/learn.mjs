// Learning orchestrator: routes one reader event (signals.mjs) into every store of the profile state (engine
// nodes, taste, emotion, knowledge, drift, stated answers, reactions) and journals undoable events. Pure; no I/O.
import { applyRoute, engineConfig, lift, skipEscalationFor } from "./engine.mjs";
import { createDrift, recordDrift } from "./drift.mjs";
import { createEmotion, inferItemEmotion, isNegativeArousal, recordEmotion } from "./emotion.mjs";
import { capFrontier, createGovernor } from "./governor.mjs";
import { createKnowledge, estimateDifficulty, levelToB, revertKnowledge, thetaToFrontier, updateKnowledge } from "./knowledge.mjs";
import { resolveSettings } from "./settings.mjs";
import { routeEvent, UNDOABLE_TYPES } from "./signals.mjs";
import { createStated, recordAnswer } from "./stated.mjs";
import { mergeTasteConfig, recordTaste } from "./taste.mjs";

export const UNDO_WINDOW_MS = 30 * 60000;
export const JOURNAL_MAX = 40;
export const REACTIONS_MAX = 100;

export const subOf = (item) => `${item.topicId}/${item.subtopicId}`;
const tasteTopicOf = (item) => item.subjectPath || item.topicId;

// Fills any store a legacy or partial state lacks, in place.
export function ensureStores(state) {
  state.emotion ||= createEmotion();
  state.knowledge ||= createKnowledge();
  state.drift ||= createDrift();
  state.governor ||= createGovernor();
  state.stated ||= createStated();
  state.reactions ||= {};
  if (!Array.isArray(state.journal)) state.journal = [];
  state.engine.skipRuns ||= {};
  return state;
}

// Difficulty b of the item when it belongs to `sub`, else a mid-level item (b 0).
function itemBFor(item, sub) {
  if (!item || subOf(item) !== sub) return levelToB(3);
  return Number.isFinite(item.difficulty?.b) ? item.difficulty.b : estimateDifficulty(item).b;
}

function rememberReaction(state, postId, bucket, now) {
  state.reactions[postId] = { bucket, at: now };
  const ids = Object.keys(state.reactions);
  if (ids.length <= REACTIONS_MAX) return;
  ids.sort((a, b) => (state.reactions[a].at || 0) - (state.reactions[b].at || 0));
  for (const id of ids.slice(0, ids.length - REACTIONS_MAX)) delete state.reactions[id];
}

// Applies one normalized event on a catalog item to every learning store. `index` clamps knowledge-seeded
// frontiers to the subject's depth; `cap` runs the governor descent cap; `journal` records undoable events.
export function learnFromEvent(state, item, event, { embedding = null, now = Date.now(), resolved = null, config = null, index = null, cap = true, journal = true } = {}) {
  ensureStores(state);
  const res = resolved || resolveSettings(state.settings);
  const cfg = engineConfig(config || res.config);
  const sub = subOf(item);
  const prior = state.reactions[item.id]?.bucket || null;
  const escalateSkip = event.type === "skip" && skipEscalationFor(state.engine, item, { config: cfg }).escalate;
  const liftBefore = event.type === "skip" || event.type === "probe_answer" ? lift(state.engine, event.sub || sub, now, cfg) : null;
  const route = routeEvent(event, {
    item, config: cfg, itemEmotion: inferItemEmotion(item),
    negativeReaction: isNegativeArousal(prior) ? prior : false,
    subLiked: event.type === "skip" && liftBefore >= cfg.interestLift,
    escalateSkip, reaction: prior,
  });
  const applied = { taste: false, topicId: tasteTopicOf(item), knowledge: null, frontier: null, reaction: null };

  applyRoute(state.engine, item, route, { now, config: cfg });
  if (embedding?.length) {
    recordTaste(state.taste, embedding, event, { topicId: applied.topicId, now, config: mergeTasteConfig(res.tasteConfig), liking: route.liking });
    applied.taste = true;
  }
  if (route.emotion) recordEmotion(state.emotion, route.emotion.bucket, { kind: route.emotion.kind, amount: route.emotion.amount, now });
  if (route.knowledge) {
    const k = route.knowledge;
    const out = updateKnowledge(state.knowledge, k.sub, { outcome: k.outcome, strength: k.strength, itemB: itemBFor(item, k.sub), floor: k.floor, now });
    applied.knowledge = { sub: k.sub, delta: out.delta };
    // A confident θ seeds the subject's frontier, upward only and never past its deepest step.
    const maxDepth = index?.topics?.get(k.sub.split("/")[0])?.subtopics?.get(k.sub)?.maxDepth ?? Infinity;
    const prev = state.engine.frontier[k.sub] || 1;
    const next = Math.min(thetaToFrontier(out.theta), maxDepth);
    if (next > prev) {
      state.engine.frontier[k.sub] = next;
      applied.frontier = { sub: k.sub, prev, next };
    }
  }
  if (route.interest && route.interest.weight > 0) {
    recordDrift(state.drift, item.topicId, route.interest, { now });
    recordDrift(state.drift, sub, route.interest, { now });
  }
  if (route.stated) recordAnswer(state.stated, { ...route.stated, lift: liftBefore, now });
  if (event.type === "react" && event.emotion) {
    applied.reaction = { prev: state.reactions[item.id] || null };
    rememberReaction(state, item.id, event.emotion, now);
  }
  if (cap) capFrontier(state.governor, state.engine.frontier, { maxLevels: res.rabbitHole.maxLevels, minor: res.minor });
  if (journal && event.eid && UNDOABLE_TYPES.includes(event.type)) {
    state.journal = state.journal.filter((j) => j.eid !== event.eid);
    state.journal.push({ eid: event.eid, postId: item.id, type: event.type, at: now, route: { interest: route.interest, liking: route.liking, emotion: route.emotion }, applied });
    if (state.journal.length > JOURNAL_MAX) state.journal.splice(0, state.journal.length - JOURNAL_MAX);
  }
  return { route, applied };
}

// The live journal entry for `eid`, or null once it is missing or older than the undo window.
export function findJournal(state, eid, { now = Date.now(), windowMs = UNDO_WINDOW_MS } = {}) {
  const entry = (state.journal || []).find((j) => j.eid === eid);
  return entry && now - entry.at <= windowMs ? entry : null;
}

export const canUndo = (state, now = Date.now()) => (state.journal || []).some((j) => now - j.at <= UNDO_WINDOW_MS);

// Reverts a journalled event (interest, taste, emotion, knowledge, seeded frontier, reaction); drift stays. True when undone.
export function undoFromJournal(state, eid, { item, embedding = null, now = Date.now(), resolved = null, config = null } = {}) {
  ensureStores(state);
  const entry = findJournal(state, eid, { now });
  if (!entry || !item || item.id !== entry.postId) return false;
  const res = resolved || resolveSettings(state.settings);
  const cfg = engineConfig(config || res.config);
  const { route, applied } = entry;
  if (route.interest) applyRoute(state.engine, item, { type: entry.type, interest: route.interest }, { now, config: cfg, sign: -1 });
  if (applied.taste && embedding?.length)
    recordTaste(state.taste, embedding, { type: entry.type }, { topicId: applied.topicId, now, config: mergeTasteConfig(res.tasteConfig), liking: route.liking, sign: -1 });
  if (route.emotion) recordEmotion(state.emotion, route.emotion.bucket, { kind: route.emotion.kind, amount: -route.emotion.amount, now });
  if (applied.knowledge) revertKnowledge(state.knowledge, applied.knowledge.sub, { delta: applied.knowledge.delta });
  if (applied.frontier && state.engine.frontier[applied.frontier.sub] === applied.frontier.next) {
    if (applied.frontier.prev > 1) state.engine.frontier[applied.frontier.sub] = applied.frontier.prev;
    else delete state.engine.frontier[applied.frontier.sub];
  }
  if (applied.reaction) {
    if (applied.reaction.prev) state.reactions[entry.postId] = applied.reaction.prev;
    else delete state.reactions[entry.postId];
  }
  state.journal = state.journal.filter((j) => j !== entry);
  return true;
}
