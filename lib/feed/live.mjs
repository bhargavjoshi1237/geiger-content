// Live test feed: the topic-tree engine plus pgvector "more like this" candidates from the reader's taste
// vectors, over the crawled catalog in Aiven. Shared by the /api/feed route and scripts/feed-live.mjs.
import { buildBias } from "./bias.mjs";
import { classifyAll, createDrift, explorationBoost } from "./drift.mjs";
import { createEmotion, EMOTION_IDS, emotionProfile } from "./emotion.mjs";
import { buildTopicLinks, composeFeed, createRng, createUserState, engineConfig, indexCatalog, interest, markShown, profileSummary } from "./engine.mjs";
import { blockedThemes, createGovernor, levelsUsed, rollSession } from "./governor.mjs";
import { createKnowledge, knowledgeSummary, withDifficulty } from "./knowledge.mjs";
import { canUndo, ensureStores, findJournal, learnFromEvent, subOf, undoFromJournal } from "./learn.mjs";
import { funnelMetrics } from "./metrics.mjs";
import { embedQueryText } from "./query-text.mjs";
import { replayLearning } from "./replay.mjs";
import { cleanSettings, DEFAULT_SETTINGS, FeedSettingsError, mergeSettings, resolveSettings } from "./settings.mjs";
import { EVENT_TYPES, normalizeEvent } from "./signals.mjs";
import { calibration, createStated, nextProbe, recordAsked, recordDismiss } from "./stated.mjs";
import { addSteering, cleanSteeringText, createSteering, createSteeringRequest, FeedSteeringError, pruneSteering, removeSteering, steeringLabels, steeringSearches, steeringShare, steeringViews } from "./steering.mjs";
import { createTaste, normalize, similarCandidates, tasteQuery, tasteSearches } from "./taste.mjs";
import { loadTaxonomy } from "./taxonomy/index.mjs";

export { cleanSettings, DEFAULT_SETTINGS, EVENT_TYPES, FeedSettingsError, FeedSteeringError };

const CATALOG_TTL_MS = 10 * 60000;
const MAX_EVENTS = 50;
// Overfetch for the user-embedding search: composeFeed drops seen, too-deep and over-cap items.
const TASTE_NEIGHBOURS = 150;
const PRIVATE_SESSION_MS = 3 * 3600000;
const STEERING_READINESS = 0.6;
const META_KEYS = ["eid", "reason", "emotion", "source", "probe", "answer", "sub", "of"];
const RESET_SCOPES = ["all", "topic", "emotion", "knowledge"];
const EXCLUDE_SCOPES = ["item", "topic", "session"];
const SCOPE_ID = /^[a-z0-9-]+(\/[a-z0-9-]+)?$/;

// Bad request to a feed operation (unknown scope/action, missing id); the route maps it to a 4xx.
export class FeedRequestError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "FeedRequestError";
    this.code = code;
    this.status = status;
  }
}

const levelView = (item) => {
  const d = item.difficulty;
  return d && Number.isFinite(d.level) ? { value: +d.level.toFixed(1), estimated: d.source !== "label" } : null;
};

// Client-facing view of a catalog item.
export const itemView = (item) => ({
  id: item.id,
  imageUrl: item.imageUrl,
  title: item.title,
  subreddit: item.subreddit,
  permalink: item.permalink,
  topicId: item.topicId,
  topicName: item.topicName || item.topicId,
  subtopicId: item.subtopicId,
  subtopicName: item.subtopicName || item.subtopicId,
  horizontalName: item.horizontalName || item.horizontalId,
  depth: item.depth || 1,
  createdAt: item.createdAt || null,
  embedded: Boolean(item.embedded),
  description: item.description || null,
  tags: item.tags || [],
  subjectPath: item.subjectPath || null,
  contentTypes: item.contentTypes || [],
  taxonomyVersion: item.taxonomyVersion || null,
  emotion: EMOTION_IDS.includes(item.emotion?.bucket) ? item.emotion.bucket : null,
  level: levelView(item),
});

// The reader's user embedding: their interest vectors weighted by strength (stored in feed_profiles.taste).
export function userEmbedding(query) {
  if (!query.interests.length) return null;
  const sum = query.interests[0].vector.map(() => 0);
  for (const i of query.interests) i.vector.forEach((x, k) => { sum[k] += x * i.weight; });
  return normalize(sum);
}

const obj = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : null);

// Reads a stored state blob (legacy shapes included). A dataset change drops learning but keeps settings, emotion and steering.
export function readState(raw, datasetId = null) {
  const r = obj(raw) || {};
  const same = !datasetId || r.datasetId === datasetId;
  const keep = (key, make) => (same && obj(r[key]) ? r[key] : make());
  const state = {
    datasetId,
    engine: keep("engine", createUserState),
    taste: keep("taste", createTaste),
    settings: mergeSettings(DEFAULT_SETTINGS, obj(r.settings) || {}),
    emotion: obj(r.emotion) || createEmotion(),
    knowledge: keep("knowledge", createKnowledge),
    drift: keep("drift", createDrift),
    steering: obj(r.steering) || createSteering(),
    governor: keep("governor", createGovernor),
    stated: keep("stated", createStated),
    reactions: keep("reactions", () => ({})),
    journal: same && Array.isArray(r.journal) ? r.journal : [],
  };
  if (obj(r.privateSession)) state.privateSession = r.privateSession;
  return ensureStores(state);
}

// True while a private session runs; an expired one is cleared.
function privateActive(state, now) {
  if (!state.privateSession) return false;
  if (now - (Number(state.privateSession.since) || 0) <= PRIVATE_SESSION_MS) return true;
  delete state.privateSession;
  return false;
}

const resolveFor = (state) => resolveSettings(state.settings, { drift: state.drift, shown: state.engine.shown || 0 });

// Whether an item falls under a topic (area id) or subject path scope.
const inScope = (item, id) => (id.includes("/") ? subOf(item) === id || item.subjectPath === id : item.topicId === id);
const underKey = (key, id) => key === id || key.startsWith(`${id}/`);
const dropKeys = (map, id) => { for (const k of Object.keys(map || {})) if (underKey(k, id)) delete map[k]; };

function eventMetadata(event, extra = {}) {
  const meta = {};
  for (const k of META_KEYS) if (event[k] != null) meta[k] = event[k];
  return { ...meta, ...extra };
}

// Display names for topics and subjects: item names first, then the taxonomy.
function buildNames(index, taxonomy) {
  const names = new Map();
  for (const item of index.byId.values()) {
    if (item.topicName && !names.has(item.topicId)) names.set(item.topicId, item.topicName);
    if (item.subtopicName && !names.has(subOf(item))) names.set(subOf(item), item.subtopicName);
  }
  for (const t of taxonomy) {
    if (!names.has(t.id)) names.set(t.id, t.name);
    for (const s of t.subtopics || []) if (!names.has(`${t.id}/${s.id}`)) names.set(`${t.id}/${s.id}`, s.name);
  }
  return names;
}

// Topic and subject choices for mute/boost/exclude pickers (the catalog's tree, or the taxonomy while it is empty).
function buildOptions(index, taxonomy, names) {
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (!index.topics.size)
    return taxonomy.map((t) => ({ id: t.id, name: t.name, subjects: (t.subtopics || []).map((s) => ({ path: `${t.id}/${s.id}`, name: s.name })).sort(byName) })).sort(byName);
  return [...index.topics.values()]
    .map((t) => ({ id: t.id, name: names.get(t.id) || t.id, subjects: [...t.subtopics.keys()].map((path) => ({ path, name: names.get(path) || path.split("/")[1] })).sort(byName) }))
    .sort(byName);
}

export function createLiveFeed(vectors, { clock = () => Date.now(), embedText = embedQueryText, virtualDepth = process.env.FEED_VIRTUAL_DEPTH !== "0" } = {}) {
  let cache = null;
  let loading = null;

  const activeId = async () => (await vectors.activeDataset?.())?.id || null;

  // A fresh cache is reused only while its dataset is still the active one.
  async function catalog() {
    if (cache && clock() - cache.at < CATALOG_TTL_MS && (await activeId()) === cache.datasetId) return cache;
    loading ||= (async () => {
      // Read the active id on both sides of the load so an activation mid-load can't pair one corpus with another's id.
      let items, datasetId;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        datasetId = await activeId();
        items = await vectors.loadCatalog();
        if ((await activeId()) === datasetId) break;
      }
      const topics = loadTaxonomy();
      // Difficulty on every item; labelled entertainment items also get a virtual depth (FEED_VIRTUAL_DEPTH=0 disables).
      const index = indexCatalog(items.map((i) => withDifficulty(i, { virtualDepth })), { topicLinks: buildTopicLinks(topics) });
      const names = buildNames(index, topics);
      cache = { at: clock(), datasetId, index, names, options: { topics: buildOptions(index, topics, names) }, items: items.length, embedded: items.filter((i) => i.embedded).length };
      return cache;
    })().finally(() => { loading = null; });
    return loading;
  }

  // Nearest neighbours of the reader's taste vectors plus active steering requests, as composeFeed's `similar`.
  async function similarFor(state, index, now, resolved) {
    const query = tasteQuery(state.taste, { now, config: resolved.tasteConfig });
    const steer = steeringSearches(state.steering, { now });
    const steered = Object.keys(steer).length > 0;
    if (!query.interests.length && !steered) return { similar: null, query };
    const exclude = state.engine.seen.slice(-500);
    const searches = { ...(query.interests.length ? tasteSearches(query, { perInterest: TASTE_NEIGHBOURS }) : {}), ...steer };
    const lists = Object.fromEntries(await Promise.all(Object.entries(searches).map(async ([key, search]) =>
      [key, await vectors.nearest(search.vector, { limit: search.limit, exclude })])));
    const readiness = steered ? Math.max(query.readiness, STEERING_READINESS) : query.readiness;
    return { similar: { candidates: similarCandidates(lists, index.byId), readiness, minShare: steeringShare(state.steering, now), labels: steeringLabels(state.steering) }, query };
  }

  function summary(state, cat, now, resolved = resolveFor(state)) {
    const config = engineConfig(resolved.config);
    const query = tasteQuery(state.taste, { now, config: resolved.tasteConfig });
    const { history, frontier } = state.engine;
    const base = profileSummary(state.engine, cat.index, { now, config });
    const knowledge = knowledgeSummary(state.knowledge, { now, target: resolved.depth.target });
    const drift = classifyAll(state.drift, { history, now });
    const funnel = funnelMetrics({ history, state: state.engine, now, config, governor: state.governor, frontier });
    const used = levelsUsed(state.governor, frontier);
    const ids = new Set([
      ...base.topics.map((t) => t.id), ...base.subtopics.map((s) => s.id), ...knowledge.map((k) => k.id), ...drift.map((d) => d.id),
      ...funnel.depthPerSubject.map((d) => d.id), ...Object.keys(used), ...query.interests.map((i) => i.topicId),
      ...Object.values(state.settings.topics || {}).flat(),
    ]);
    return {
      ...base,
      shown: state.engine.shown || 0,
      settings: state.settings,
      taste: { readiness: +query.readiness.toFixed(2), interests: query.interests.map((i) => ({ topicId: i.topicId, weight: i.weight })), recent: Boolean(query.recent) },
      emotion: { profile: emotionProfile(state.emotion, now), dials: resolved.emotionDials },
      knowledge: { subjects: knowledge },
      drift,
      funnel,
      steering: steeringViews(state.steering, now),
      governor: { levelsUsed: used, maxLevels: resolved.rabbitHole.maxLevels, blockedThemes: [...blockedThemes(history, { intensityCap: resolved.intensityCap, minor: resolved.minor }).themes] },
      stated: calibration(state.stated),
      names: Object.fromEntries([...ids].filter((id) => cat.names.has(id)).map((id) => [id, cat.names.get(id)])),
      nonProfiled: resolved.nonProfiled,
      privateSession: Boolean(state.privateSession) && now - (Number(state.privateSession.since) || 0) <= PRIVATE_SESSION_MS,
      canUndo: !resolved.nonProfiled && canUndo(state, now),
    };
  }

  // Probe for a liked subject the reader recently saw (null when cadence, cooldowns or mode forbid one).
  function probeFor(state, cat, now, resolved, base) {
    if (resolved.nonProfiled || privateActive(state, now)) return null;
    const config = engineConfig(resolved.config);
    const subjects = base.subtopics.map((s) => {
      const k = state.knowledge.subjects?.[s.id];
      return {
        id: s.id, name: cat.names.get(s.id) || s.id, lift: s.lift, evidence: interest(state.engine, s.id, now, config).evidence,
        theta: k?.theta ?? null, n: k?.n || 0, postId: state.engine.history.findLast((h) => h.sub === s.id)?.id ?? null,
      };
    }).filter((s) => s.postId);
    const probe = nextProbe(state.stated, { subjects, shown: state.engine.shown || 0, now });
    if (probe) recordAsked(state.stated, probe, { now, shown: state.engine.shown || 0 });
    return probe;
  }

  // Replays the profile's live events into fresh learning stores (after an exclusion).
  async function replay(state, profileId, client, cat, resolved) {
    const rows = vectors.loadEvents ? await vectors.loadEvents(client, profileId, { limit: 5000 }) : [];
    const embeddings = await vectors.embeddingsFor([...new Set(rows.map((r) => r.postId).filter((id) => cat.index.byId.has(id)))]);
    replayLearning(state, rows, cat.index, embeddings, { resolved });
  }

  // Post ids among the profile's logged events that fall under a topic/subject scope.
  async function scopePostIds(profileId, client, cat, id) {
    const rows = vectors.loadEvents ? await vectors.loadEvents(client, profileId, { limit: 50000, includeExcluded: true }) : [];
    return [...new Set(rows.map((r) => r.postId))].filter((pid) => cat.index.byId.has(pid) && inScope(cat.index.byId.get(pid), id));
  }

  const profileResult = (state, cat, now, resolved) => {
    const taste = userEmbedding(tasteQuery(state.taste, { now, config: resolved.tasteConfig }));
    return { state, events: state.engine.events, ...(taste ? { taste } : {}) };
  };

  return {
    catalog,

    async profile(projectId, ownerId, name) {
      const [row, cat] = await Promise.all([vectors.profile(projectId, ownerId, name), catalog()]);
      const state = readState(row.state, cat.datasetId);
      return { id: row.id, name: row.name, events: state.engine.events, summary: summary(state, cat, clock()), options: cat.options };
    },

    // Next batch for a profile: similarity candidates are fetched first (unlocked), then the batch is
    // composed and marked shown under the profile lock.
    async next(profileRow) {
      const cat = await catalog();
      const now = clock();
      const pre = readState(profileRow.state, cat.datasetId);
      const preResolved = resolveFor(pre);
      const { similar } = preResolved.nonProfiled ? { similar: null } : await similarFor(pre, cat.index, now, preResolved);
      return vectors.withProfile(profileRow.id, async (raw) => {
        const state = readState(raw, cat.datasetId);
        privateActive(state, now);
        rollSession(state.governor, { now, frontier: state.engine.frontier });
        // Updates drift.shifted (and stamps the boost budget) before settings resolve the drift boost.
        explorationBoost(state.drift, { shown: state.engine.shown || 0, driftBoostEnabled: Boolean(state.settings.driftBoost) });
        const resolved = resolveFor(state);
        const batch = composeFeed(state.engine, cat.index, { now, rng: createRng(now), similar, config: resolved.config, bias: buildBias({ state, resolved, now, index: cat.index }) });
        markShown(state.engine, batch, { now, config: engineConfig(resolved.config) });
        pruneSteering(state.steering, now);
        const base = summary(state, cat, now, resolved);
        const probe = probeFor(state, cat, now, resolved, base);
        return {
          state, events: state.engine.events,
          result: {
            items: batch.map((e) => ({ ...itemView(e.item), slot: e.slot, reason: e.reason, similarity: e.similarity ?? null, ...(e.steered ? { steered: true } : {}) })),
            summary: probe ? summary(state, cat, now, resolved) : base,
            probe,
          },
        };
      });
    },

    // Validates and merges a settings patch (nested objects merge one level deep); they shape every later batch.
    async updateSettings(profileId, patch) {
      const clean = cleanSettings(patch);
      const cat = await catalog();
      return vectors.withProfile(profileId, async (raw) => {
        const state = readState(raw, cat.datasetId);
        state.settings = mergeSettings(state.settings, clean);
        return { state, result: { settings: state.settings, summary: summary(state, cat, clock()) } };
      });
    },

    // Applies engagement events to every learning store and logs them; `undo` reverts a journalled event by eid.
    async record(profileId, events) {
      const cat = await catalog();
      const hasPost = (id) => cat.index.byId.has(id);
      const valid = (Array.isArray(events) ? events : []).slice(0, MAX_EVENTS).map((e) => normalizeEvent(e, { hasPost })).filter(Boolean);
      const embeddings = await vectors.embeddingsFor([...new Set(valid.filter((e) => e.type !== "undo").map((e) => e.postId))]);
      return vectors.withProfile(profileId, async (raw, client) => {
        const state = readState(raw, cat.datasetId);
        const now = clock();
        const resolved = resolveFor(state);
        const done = (result) => ({ ...profileResult(state, cat, now, resolved), result: { undone: [], ...result, summary: summary(state, cat, now, resolved) } });
        // Non-profiled readers are neither learned from nor logged.
        if (resolved.nonProfiled) return done({ recorded: 0, withEmbedding: 0, skipped: "non_profiled" });
        const isPrivate = privateActive(state, now);
        // Undo targets from an earlier batch need their embeddings fetched now.
        const late = valid.filter((e) => e.type === "undo").map((e) => findJournal(state, e.of, { now })?.postId).filter((id) => id && !embeddings.has(id));
        if (late.length) for (const [id, v] of await vectors.embeddingsFor([...new Set(late)])) embeddings.set(id, v);
        const rows = [];
        const undone = [];
        let withEmbedding = 0;
        for (const e of valid) {
          if (e.type === "undo") {
            const entry = findJournal(state, e.of, { now });
            const item = entry && cat.index.byId.get(entry.postId);
            if (!item || !undoFromJournal(state, e.of, { item, embedding: embeddings.get(item.id), now, resolved })) continue;
            undone.push(e.of);
            rows.push({ ...e, postId: item.id, at: now, metadata: eventMetadata(e) });
            continue;
          }
          const item = cat.index.byId.get(e.postId);
          // Private sessions and topics excluded from learning are logged as excluded, not learned.
          if (isPrivate || resolved.topics.exclude.has(item.topicId) || resolved.topics.exclude.has(subOf(item))) {
            rows.push({ ...e, at: now, metadata: eventMetadata(e, { excluded: true }) });
            continue;
          }
          learnFromEvent(state, item, e, { embedding: embeddings.get(e.postId), now, resolved, index: cat.index });
          if (embeddings.has(e.postId)) withEmbedding += 1;
          rows.push({ ...e, at: now, metadata: eventMetadata(e) });
        }
        await vectors.logEvents(client, profileId, rows);
        // The undone originals go after logging, so an event and its undo in one batch both land.
        if (undone.length) await vectors.softDeleteEvents?.(client, profileId, { eids: undone });
        return done({ recorded: rows.length, withEmbedding, undone, ...(isPrivate ? { skipped: "private_session" } : {}) });
      });
    },

    // Time-boxed steering requests: add (embedded outside the lock), remove or list.
    async steering(profileId, { action = "list", text, id } = {}) {
      if (!["add", "remove", "list"].includes(action)) throw new FeedSteeringError("steering_invalid", `Unknown steering action "${action}".`);
      if (action === "remove" && (typeof id !== "string" || !id)) throw new FeedSteeringError("steering_invalid", "Say which steering request to remove.");
      const clean = action === "add" ? cleanSteeringText(text) : null;
      const vector = clean ? await embedText(clean) : null;
      const cat = await catalog();
      return vectors.withProfile(profileId, async (raw) => {
        const state = readState(raw, cat.datasetId);
        const now = clock();
        if (action === "add") addSteering(state.steering, createSteeringRequest({ text: clean, vector, now }), { now });
        else if (action === "remove") removeSteering(state.steering, id);
        pruneSteering(state.steering, now);
        return { state, result: { steering: steeringViews(state.steering, now), summary: summary(state, cat, now) } };
      });
    },

    // Clears one learning scope: a topic/subject (its nodes, taste, knowledge, drift and logged events), emotion or knowledge.
    async scopedReset(profileId, { scope, id } = {}) {
      if (!RESET_SCOPES.includes(scope) || scope === "all") throw new FeedRequestError("invalid_scope", `Unknown reset scope "${scope}".`);
      if (scope === "topic" && !(typeof id === "string" && SCOPE_ID.test(id))) throw new FeedRequestError("invalid_scope", "Say which topic or subject to reset.");
      const cat = await catalog();
      return vectors.withProfile(profileId, async (raw, client) => {
        const state = readState(raw, cat.datasetId);
        const now = clock();
        if (scope === "emotion") state.emotion = createEmotion();
        else if (scope === "knowledge") state.knowledge = createKnowledge();
        else {
          for (const map of [state.engine.nodes, state.engine.frontier, state.engine.probes, state.engine.skipRuns, state.taste.topics, state.knowledge.subjects, state.drift.nodes]) dropKeys(map, id);
          const postIds = await scopePostIds(profileId, client, cat, id);
          state.journal = state.journal.filter((j) => !postIds.includes(j.postId));
          for (const pid of postIds) delete state.reactions[pid];
          if (postIds.length) await vectors.softDeleteEvents?.(client, profileId, { postIds });
        }
        return { ...profileResult(state, cat, now, resolveFor(state)), result: { scope, id: id ?? null } };
      });
    },

    // Excludes past events from learning (an item, a topic/subject, or this session) and rebuilds learning without them.
    async exclude(profileId, { scope, id, on = true } = {}) {
      if (!EXCLUDE_SCOPES.includes(scope)) throw new FeedRequestError("invalid_scope", `Unknown exclude scope "${scope}".`);
      if (scope === "item" && !(typeof id === "string" && id)) throw new FeedRequestError("invalid_scope", "Say which post to exclude.");
      if (scope === "topic" && !(typeof id === "string" && SCOPE_ID.test(id))) throw new FeedRequestError("invalid_scope", "Say which topic or subject to exclude.");
      const flag = on !== false;
      const cat = await catalog();
      return vectors.withProfile(profileId, async (raw, client) => {
        const state = readState(raw, cat.datasetId);
        const now = clock();
        let excluded = 0;
        if (scope === "session") {
          if (flag) {
            excluded = await vectors.markEventsExcluded?.(client, profileId, { since: state.governor.sessionStart || now }) ?? 0;
            state.privateSession = { since: now };
          } else delete state.privateSession;
        } else {
          if (scope === "topic") {
            const list = (state.settings.topics?.exclude || []).filter((x) => x !== id);
            state.settings = mergeSettings(state.settings, cleanSettings({ topics: { exclude: flag ? [...list, id] : list } }));
          }
          const postIds = scope === "item" ? [id] : await scopePostIds(profileId, client, cat, id);
          if (postIds.length) excluded = await vectors.markEventsExcluded?.(client, profileId, { postIds, excluded: flag }) ?? 0;
        }
        const resolved = resolveFor(state);
        if (excluded) await replay(state, profileId, client, cat, resolved);
        return { ...profileResult(state, cat, now, resolved), result: { excluded, summary: summary(state, cat, now, resolved) } };
      });
    },

    // Stated-interest probe: `get` schedules one now, `dismiss` cools a subject down.
    async probe(profileId, { action = "get", sub } = {}) {
      if (!["get", "dismiss"].includes(action)) throw new FeedRequestError("invalid_probe", `Unknown probe action "${action}".`);
      if (action === "dismiss" && !(typeof sub === "string" && SCOPE_ID.test(sub))) throw new FeedRequestError("invalid_probe", "Say which subject to dismiss.");
      const cat = await catalog();
      return vectors.withProfile(profileId, async (raw) => {
        const state = readState(raw, cat.datasetId);
        const now = clock();
        const resolved = resolveFor(state);
        let probe = null;
        if (action === "dismiss") recordDismiss(state.stated, sub, now);
        else probe = probeFor(state, cat, now, resolved, profileSummary(state.engine, cat.index, { now, config: engineConfig(resolved.config) }));
        return { state, result: { probe, summary: summary(state, cat, now, resolved) } };
      });
    },

    // Images most like one post (image → image).
    async similar(postId, { limit = 24 } = {}) {
      const cat = await catalog();
      const vector = (await vectors.embeddingsFor([String(postId)])).get(String(postId));
      if (!vector) return { source: cat.index.byId.has(String(postId)) ? itemView(cat.index.byId.get(String(postId))) : null, results: [], reason: "This image has no embedding yet." };
      const rows = await vectors.nearest(vector, { limit, exclude: [String(postId)] });
      return { source: itemView(cat.index.byId.get(String(postId))), results: rows.filter((r) => cat.index.byId.has(r.id)).map((r) => ({ ...itemView(cat.index.byId.get(r.id)), similarity: r.similarity })) };
    },

    // Images matching a text query (text → image, shared Nomic embedding space).
    async search(text, { limit = 24 } = {}) {
      const cat = await catalog();
      const rows = await vectors.nearest(await embedText(text), { limit });
      return { results: rows.filter((r) => cat.index.byId.has(r.id)).map((r) => ({ ...itemView(cat.index.byId.get(r.id)), similarity: r.similarity })) };
    },
  };
}
