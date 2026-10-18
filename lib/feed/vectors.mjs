// Aiven access for the live test feed: the crawled catalog, image embeddings (content.feed_image_embeddings, halfvec),
// pgvector nearest neighbours, reader profiles (content.feed_profiles) and the behaviour log (content.feed_events).
import { catalogFromManifest } from "./simulator.mjs";

// Image model the corpus is embedded with (scripts/kaggle/feed_enrich.py), and its aligned text model.
export const FEED_MODEL = "nomic-embed-vision-v1.5";
export const FEED_TEXT_MODEL = "nomic-embed-text-v1.5";
export const FEED_DIMENSIONS = 768;

const toVector = (values) => `[${Array.from(values, (x) => (+x).toFixed(6)).join(",")}]`;

// Caption labels (feed_enrich.py `data`): emotion incl. a literal "neutral", 1-5 intensity/difficulty (null when unlabelled).
const CAPTION_EMOTIONS = new Set(["amused", "amazed", "moved", "curious", "sad", "angry", "disgusted", "neutral"]);
const level = (v) => (Number.isInteger(v) && v >= 1 && v <= 5 ? v : null);

export function captionFields(data) {
  const d = data && typeof data === "object" ? data : {};
  const intensity = level(d.emotion_intensity);
  const difficulty = level(d.difficulty);
  return {
    emotion: CAPTION_EMOTIONS.has(d.emotion) ? { bucket: d.emotion, intensity: intensity == null ? null : intensity / 5 } : null,
    difficulty: difficulty == null ? null : { level: difficulty },
    bloom: typeof d.bloom === "string" && d.bloom !== "none" ? d.bloom : null,
    sensitive: Array.isArray(d.sensitive) ? [...new Set(d.sensitive.filter((t) => typeof t === "string"))] : [],
  };
}

// A feed_events row in the replay/learning row shape.
const eventRow = (r) => ({ postId: r.post_id, type: r.type, dwellMs: r.dwell_ms, slot: r.slot, metadata: r.metadata || {}, at: new Date(r.created_at).getTime() });

// `db` is a pg Pool (vectorPool()); `model` lets tests or a second model share the same code.
export function createFeedVectors(db, { model = FEED_MODEL } = {}) {
  const q = (text, values) => db.query(text, values);

  // Cosine HNSW search ordered by `target` (SQL taking $1 = `param`); rows with no target distance are dropped.
  async function nearestTo(target, param, { limit = 50, exclude = [] } = {}) {
    const skip = new Set(exclude);
    const client = await db.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('hnsw.ef_search', $1, true)", [String(Math.min(1000, Math.max(100, (limit + skip.size) * 2)))]);
      const { rows } = await client.query(
        `select i.post_id, 1 - (e.embedding <=> ${target}) as similarity
         from content.feed_image_embeddings e join content.feed_active_images i on i.id = e.image_id
         where e.status = 'done' and e.deleted_at is null and e.model = $2 and i.deleted_at is null and ${target} is not null
         order by e.embedding <=> ${target} limit $3`,
        [param, model, Math.min(1000, limit + Math.min(skip.size, 500))],
      );
      await client.query("commit");
      return rows.filter((r) => !skip.has(r.post_id)).slice(0, limit).map((r) => ({ id: r.post_id, similarity: Number(r.similarity) }));
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    model,

    async activeDataset() {
      const { rows } = await q("select id,status,date_from,date_until from content.feed_datasets where active");
      return rows[0] || null;
    },

    // Every crawled image as a catalog item (minus images deleted from Reddit), flagged when it has an embedding.
    async loadCatalog() {
      const items = [];
      let after = "00000000-0000-0000-0000-000000000000";
      for (;;) {
        const { rows } = await q(
          `select i.id, i.record, (e.id is not null) as embedded, c.description, c.tags, c.data from content.feed_active_images i
           left join content.feed_image_embeddings e on e.image_id = i.id and e.model = $2 and e.status = 'done' and e.deleted_at is null
           left join lateral (
             select description, tags, data from content.feed_image_captions
             where image_id = i.id and status = 'done' and deleted_at is null order by updated_at desc limit 1
           ) c on true
           where i.deleted_at is null and i.id > $1
             and not exists (select 1 from content.feed_image_embeddings d where d.image_id = i.id and d.status = 'failed' and d.error in ('http 404', 'http 410'))
           order by i.id limit 10000`,
          [after, model],
        );
        if (!rows.length) break;
        after = rows.at(-1).id;
        const mapped = catalogFromManifest(rows.map((r) => r.record));
        rows.forEach((r, i) => items.push({
          ...mapped[i],
          embedded: r.embedded,
          description: r.description || null,
          tags: [...new Set([...(r.record.contentTypes || []), ...(r.tags || [])])],
          topicName: r.record.topicName,
          subtopicName: r.record.subtopicName,
          horizontalName: r.record.horizontalName,
          permalink: r.record.permalink,
          ...captionFields(r.data),
        }));
      }
      return items;
    },

    // { postId → unit vector } for the given posts (missing posts have no embedding yet).
    async embeddingsFor(postIds) {
      if (!postIds.length) return new Map();
      const { rows } = await q(
        `select i.post_id, e.embedding::text as embedding from content.feed_image_embeddings e
         join content.feed_active_images i on i.id = e.image_id
         where i.post_id = any($1::text[]) and e.model = $2 and e.status = 'done' and e.deleted_at is null`,
        [postIds, model],
      );
      return new Map(rows.map((r) => [r.post_id, JSON.parse(r.embedding)]));
    },

    // Cosine nearest neighbours of `vector`: [{ id: postId, similarity }]. Over-fetches past `exclude`.
    nearest(vector, options) {
      return nearestTo("$1::public.halfvec", toVector(vector), options);
    },

    // Nearest neighbours of a profile's stored taste vector (feed_profiles.taste); [] while it has none.
    nearestToTaste(profileId, options) {
      return nearestTo("(select taste::public.halfvec from content.feed_profiles where id = $1)", profileId, options);
    },

    async status() {
      const [{ rows: [totals] }, { rows: errors }, { rows: topics }, { rows: captions }] = await Promise.all([
        q(
          `select (select count(*) from content.feed_active_images)::int as images,
                  count(*) filter (where e.status = 'done')::int as embedded,
                  count(*) filter (where e.status = 'failed')::int as failed,
                  count(*) filter (where e.status = 'done' and e.updated_at > now() - interval '1 hour')::int as last_hour
           from content.feed_image_embeddings e join content.feed_active_images i on i.id=e.image_id where e.model = $1 and e.deleted_at is null`,
          [model],
        ),
        q(
          `select split_part(e.error, ':', 1) as error, count(*)::int as n from content.feed_image_embeddings e
           join content.feed_active_images i on i.id=e.image_id where e.model = $1 and e.status = 'failed' and e.deleted_at is null group by 1 order by 2 desc limit 5`,
          [model],
        ),
        q(
          `select i.topic_id, count(*)::int as images, count(e.id)::int as embedded from content.feed_active_images i
           left join content.feed_image_embeddings e on e.image_id = i.id and e.model = $1 and e.status = 'done'
           where i.deleted_at is null group by 1 order by 3 asc`,
          [model],
        ),
        q(
          `select c.model, count(*) filter (where c.status = 'done')::int as done, count(*) filter (where c.status = 'failed')::int as failed,
                  count(*) filter (where c.status = 'done' and c.updated_at > now() - interval '1 hour')::int as last_hour
           from content.feed_image_captions c join content.feed_active_images i on i.id=c.image_id where c.deleted_at is null group by 1 order by 2 desc`,
        ),
      ]);
      return { model, ...totals, pending: Math.max(0, totals.images - totals.embedded - totals.failed), errors, topics, captions, dataset: await this.activeDataset() };
    },

    // Reader profile row (created on first use) for the signed-in owner.
    async profile(projectId, ownerId, name = "default") {
      const { rows } = await q(
        `insert into content.feed_profiles (project_id, owner_id, name, created_by) values ($1, $2, $3, $2)
         on conflict (project_id, owner_id, name) do update set deleted_at = null
         returning id, name, state, events, updated_at`,
        [projectId, ownerId, name],
      );
      return rows[0];
    },

    async listProfiles(projectId, ownerId) {
      const { rows } = await q(
        "select id, name, events, updated_at from content.feed_profiles where project_id = $1 and owner_id = $2 and deleted_at is null order by updated_at desc",
        [projectId, ownerId],
      );
      return rows;
    },

    // Runs `fn(state)` on the locked profile state and saves what it returns ({ state, taste?, result }).
    async withProfile(profileId, fn) {
      const client = await db.connect();
      try {
        await client.query("begin");
        const { rows } = await client.query("select id, state, events from content.feed_profiles where id = $1 for update", [profileId]);
        if (!rows[0]) throw new Error("Feed profile not found.");
        const out = await fn(rows[0].state || {}, client);
        await client.query(
          "update content.feed_profiles set state = $2, taste = coalesce($3::public.vector, taste), events = $4 where id = $1",
          [profileId, out.state, out.taste ? toVector(out.taste) : null, out.events ?? rows[0].events],
        );
        await client.query("commit");
        return out.result;
      } catch (error) {
        await client.query("rollback").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },

    // Appends events ({ postId, type, dwellMs?, slot?, metadata?, at }); metadata carries eid, reason, emotion… and excluded.
    async logEvents(client, profileId, events) {
      if (!events.length) return;
      await client.query(
        `insert into content.feed_events (profile_id, post_id, type, dwell_ms, slot, metadata, created_at)
         select $1, e.post_id, e.type, e.dwell_ms, e.slot, coalesce(e.metadata, '{}'::jsonb), e.at from jsonb_to_recordset($2::jsonb)
           as e(post_id text, type text, dwell_ms integer, slot text, metadata jsonb, at timestamptz)`,
        [profileId, JSON.stringify(events.map((e) => ({ post_id: e.postId ?? "", type: e.type, dwell_ms: e.dwellMs ?? null, slot: e.slot ?? null, metadata: e.metadata || {}, at: new Date(e.at).toISOString() })))],
      );
    },

    // Newest live events in time order (undo rows and, unless asked, excluded rows left out) for replay.
    async loadEvents(client, profileId, { limit = 5000, includeExcluded = false } = {}) {
      const { rows } = await (client || db).query(
        `select post_id, type, dwell_ms, slot, metadata, created_at from content.feed_events
         where profile_id = $1 and deleted_at is null and type <> 'undo'
           and ($3 or not coalesce((metadata->>'excluded')::boolean, false))
         order by created_at desc limit $2`,
        [profileId, limit, includeExcluded],
      );
      return rows.reverse().map(eventRow);
    },

    // Sets (or clears) metadata.excluded on events for these posts and/or since a time; returns the row count.
    async markEventsExcluded(client, profileId, { postIds = [], since = null, excluded = true } = {}) {
      if (!postIds.length && since == null) return 0;
      const { rowCount } = await (client || db).query(
        `update content.feed_events set metadata = case when $4 then metadata || '{"excluded":true}'::jsonb else metadata - 'excluded' end, updated_at = now()
         where profile_id = $1 and deleted_at is null and type <> 'undo'
           and (post_id = any($2::text[]) or ($3::timestamptz is not null and created_at >= $3::timestamptz))`,
        [profileId, postIds, since == null ? null : new Date(since).toISOString(), excluded],
      );
      return rowCount;
    },

    // Soft-deletes events by client eid (undo) and/or post id (scoped reset); returns the row count.
    async softDeleteEvents(client, profileId, { eids = [], postIds = [] } = {}) {
      if (!eids.length && !postIds.length) return 0;
      const { rowCount } = await (client || db).query(
        `update content.feed_events set deleted_at = now()
         where profile_id = $1 and deleted_at is null and (metadata->>'eid' = any($2::text[]) or post_id = any($3::text[]))`,
        [profileId, eids, postIds],
      );
      return rowCount;
    },

    async resetProfile(profileId) {
      await q("update content.feed_events set deleted_at = now() where profile_id = $1 and deleted_at is null", [profileId]);
      // Learning is wiped; the reader's settings survive a reset.
      await q("update content.feed_profiles set state = jsonb_strip_nulls(jsonb_build_object('settings', state->'settings')), taste = null, events = 0 where id = $1", [profileId]);
    },
  };
}
