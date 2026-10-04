// Live test feed: the topic-tree engine plus pgvector "more like this" candidates from the reader's taste
// vectors, over the crawled catalog in Aiven. Shared by the /api/feed route and scripts/feed-live.mjs.
import { buildTopicLinks, composeFeed, createRng, createUserState, indexCatalog, markShown, profileSummary, recordEvent } from "./engine.mjs";
import { embedQueryText } from "./query-text.mjs";
import { createTaste, normalize, recordTaste, similarCandidates, tasteQuery, tasteSearches } from "./taste.mjs";
import { loadTaxonomy } from "./taxonomy/index.mjs";

export const EVENT_TYPES = ["like", "save", "share", "comment", "dwell", "skip", "hide"];
const CATALOG_TTL_MS = 10 * 60000;
const MAX_EVENTS = 50;
// Overfetch for the user-embedding search: composeFeed drops seen, too-deep and over-cap items.
const TASTE_NEIGHBOURS = 150;

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
  embedded: Boolean(item.embedded),
  description: item.description || null,
  tags: item.tags || [],
});

// The reader's user embedding: their interest vectors weighted by strength (stored in feed_profiles.taste).
export function userEmbedding(query) {
  if (!query.interests.length) return null;
  const sum = query.interests[0].vector.map(() => 0);
  for (const i of query.interests) i.vector.forEach((x, k) => { sum[k] += x * i.weight; });
  return normalize(sum);
}

const readState = (raw) => ({ engine: raw?.engine || createUserState(), taste: raw?.taste || createTaste() });

export function createLiveFeed(vectors, { clock = () => Date.now() } = {}) {
  let cache = null;
  let loading = null;

  async function catalog() {
    if (cache && clock() - cache.at < CATALOG_TTL_MS) return cache;
    loading ||= (async () => {
      const items = await vectors.loadCatalog();
      const topics = loadTaxonomy();
      cache = { at: clock(), index: indexCatalog(items, { topicLinks: buildTopicLinks(topics) }), items: items.length, embedded: items.filter((i) => i.embedded).length };
      return cache;
    })().finally(() => { loading = null; });
    return loading;
  }

  // Nearest neighbours of the stored user embedding (feed_profiles.taste) plus the right-now vector, as
  // composeFeed's `similar`.
  async function similarFor(profileId, state, index, now) {
    const query = tasteQuery(state.taste, { now });
    if (!query.interests.length) return { similar: null, query };
    const exclude = state.engine.seen.slice(-500);
    const { recent } = tasteSearches(query);
    const lists = { taste: await vectors.nearestToTaste(profileId, { limit: TASTE_NEIGHBOURS, exclude }) };
    if (recent) lists.recent = await vectors.nearest(recent.vector, { limit: recent.limit, exclude });
    return { similar: { candidates: similarCandidates(lists, index.byId), readiness: query.readiness }, query };
  }

  function summary(state, index, now) {
    const query = tasteQuery(state.taste, { now });
    return {
      ...profileSummary(state.engine, index, { now }),
      shown: state.engine.shown || 0,
      taste: { readiness: +query.readiness.toFixed(2), interests: query.interests.map((i) => ({ topicId: i.topicId, weight: i.weight })), recent: Boolean(query.recent) },
    };
  }

  return {
    catalog,

    async profile(projectId, ownerId, name) {
      const [row, cat] = await Promise.all([vectors.profile(projectId, ownerId, name), catalog()]);
      return { id: row.id, name: row.name, events: row.events, summary: summary(readState(row.state), cat.index, clock()) };
    },

    // Next batch for a profile: similarity candidates are fetched first (unlocked), then the batch is
    // composed and marked shown under the profile lock.
    async next(profileRow) {
      const cat = await catalog();
      const now = clock();
      const { similar } = await similarFor(profileRow.id, readState(profileRow.state), cat.index, now);
      return vectors.withProfile(profileRow.id, async (raw) => {
        const state = readState(raw);
        const batch = composeFeed(state.engine, cat.index, { now, rng: createRng(now), similar });
        markShown(state.engine, batch, { now });
        return {
          state,
          result: { items: batch.map((e) => ({ ...itemView(e.item), slot: e.slot, reason: e.reason, similarity: e.similarity ?? null })), summary: summary(state, cat.index, now) },
        };
      });
    },

    // Applies engagement events ([{ postId, type, dwellMs?, slot? }]) to the tree interests and taste vectors.
    async record(profileId, events) {
      const cat = await catalog();
      const valid = (Array.isArray(events) ? events : []).slice(0, MAX_EVENTS)
        .filter((e) => e && EVENT_TYPES.includes(e.type) && cat.index.byId.has(String(e.postId)))
        .map((e) => ({ postId: String(e.postId), type: e.type, dwellMs: Math.max(0, Math.min(600000, Number(e.dwellMs) || 0)), slot: typeof e.slot === "string" ? e.slot.slice(0, 20) : null }));
      const embeddings = await vectors.embeddingsFor([...new Set(valid.map((e) => e.postId))]);
      return vectors.withProfile(profileId, async (raw, client) => {
        const state = readState(raw);
        const now = clock();
        for (const e of valid) {
          const item = cat.index.byId.get(e.postId);
          recordEvent(state.engine, item, e, { now });
          recordTaste(state.taste, embeddings.get(e.postId), e, { topicId: item.topicId, now });
        }
        await vectors.logEvents(client, profileId, valid.map((e) => ({ ...e, at: now })));
        return {
          state,
          taste: userEmbedding(tasteQuery(state.taste, { now })),
          events: state.engine.events,
          result: { recorded: valid.length, withEmbedding: valid.filter((e) => embeddings.has(e.postId)).length, summary: summary(state, cat.index, now) },
        };
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
      const rows = await vectors.nearest(await embedQueryText(text), { limit });
      return { results: rows.filter((r) => cat.index.byId.has(r.id)).map((r) => ({ ...itemView(cat.index.byId.get(r.id)), similarity: r.similarity })) };
    },
  };
}
