// Rebuilds a profile's learning from its feed_events rows (after an exclusion or scoped delete). Impression
// history, settings and steering are kept; the undo journal is cleared. Pure; no I/O.
import { explorationBoost, createDrift } from "./drift.mjs";
import { createEmotion } from "./emotion.mjs";
import { createKnowledge } from "./knowledge.mjs";
import { ensureStores, learnFromEvent } from "./learn.mjs";
import { normalizeEvent } from "./signals.mjs";
import { createTaste } from "./taste.mjs";

export const REPLAY_LIMIT = 5000;
const META_KEYS = ["eid", "reason", "emotion", "source", "probe", "answer", "sub"];

const atOf = (row) => {
  const t = row.at instanceof Date ? row.at.getTime() : typeof row.at === "number" ? row.at : Date.parse(row.at ?? row.created_at);
  return Number.isFinite(t) ? t : 0;
};

// A logged row ({ postId|post_id, type, dwellMs|dwell_ms, slot, metadata, at|created_at }) as a raw client event.
export function rowToEvent(row) {
  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const event = { postId: row.postId ?? row.post_id, type: row.type, dwellMs: row.dwellMs ?? row.dwell_ms ?? 0, slot: row.slot ?? null };
  for (const k of META_KEYS) if (meta[k] != null) event[k] = meta[k];
  return event;
}

// Replays the newest 5000 non-excluded, non-undo rows in time order into fresh stores. `catalog` is an index
// (with byId) or a Map; `embeddings` a Map postId → vector. The governor descent cap is not applied to history.
export function replayLearning(state, events, catalog, embeddings = new Map(), { resolved = null, config = null, index = null } = {}) {
  const byId = catalog?.byId instanceof Map ? catalog.byId : catalog instanceof Map ? catalog : new Map();
  const idx = index || (catalog?.topics ? catalog : null);
  ensureStores(state);
  const { history, seen, shown, shownAt } = state.engine;
  state.engine = { nodes: {}, frontier: {}, probes: {}, history, seen, events: 0, shown, shownAt, skipRuns: {} };
  state.taste = createTaste();
  state.emotion = createEmotion();
  state.knowledge = createKnowledge();
  state.drift = createDrift();
  state.reactions = {};
  state.journal = [];
  state.stated.answers = [];
  const rows = (Array.isArray(events) ? events : [])
    .filter((r) => r && r.type !== "undo" && !r.metadata?.excluded && !r.deletedAt && !r.deleted_at)
    .map((r) => ({ r, at: atOf(r) }))
    .sort((a, b) => a.at - b.at)
    .slice(-REPLAY_LIMIT);
  const hasPost = (id) => byId.has(id);
  for (const { r, at } of rows) {
    const event = normalizeEvent(rowToEvent(r), { hasPost });
    if (!event || event.type === "undo") continue;
    learnFromEvent(state, byId.get(event.postId), event, { embedding: embeddings.get(event.postId), now: at, resolved, config, index: idx, cap: false, journal: false });
  }
  explorationBoost(state.drift, { shown: state.engine.shown || 0 });
  return state;
}
