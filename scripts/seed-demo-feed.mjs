import nextEnv from "@next/env";
import pg from "pg";
import { writeFile } from "node:fs/promises";
import { DEMO_PROJECT } from "./demo-data.mjs";
import { vectorPool, connectionOptions } from "../lib/vector/connection.mjs";
import { createFeedVectors, FEED_MODEL } from "../lib/feed/vectors.mjs";
import { createUserState, recordEvent, markShown, indexCatalog, profileSummary } from "../lib/feed/engine.mjs";
import { createTaste, recordTaste, tasteQuery } from "../lib/feed/taste.mjs";
import { userEmbedding } from "../lib/feed/live.mjs";
import { catalogFromManifest } from "../lib/feed/simulator.mjs";

nextEnv.loadEnvConfig(process.cwd());
// This seed needs one vector connection; leave capacity for the running fleet.
globalThis.geigerVectorPool = new pg.Pool({ ...connectionOptions(), max: 1 });
globalThis.geigerVectorPool.on("error", () => {});
const source = new pg.Client({ connectionString: process.env.STRING_URI, connectionTimeoutMillis: 10000 });
try {
  await source.connect();
  const owners = (await source.query("select distinct g.user_id from content.role_grants g join public.roles r on r.id=g.role_id where g.project_id=$1 and r.key='owner' and g.status='active' and g.deleted_at is null and r.deleted_at is null", [DEMO_PROJECT])).rows;
  const pool = vectorPool();
  const vectors = createFeedVectors(pool);
  const topics = (await pool.query("select i.topic_id,count(*)::int n from content.feed_crawl_images i join content.feed_image_embeddings e on e.image_id=i.id and e.model=$1 and e.status='done' and e.deleted_at is null where i.deleted_at is null and i.topic_id !~* '(adult|nsfw|edgy|gore)' group by i.topic_id order by n desc limit 4", [FEED_MODEL])).rows;
  const report = { projectId: DEMO_PROJECT, syntheticEngagement: true, realCorpusEmbeddings: true, profiles: [] };
  for (const owner of owners) {
    for (const [i, topic] of topics.entries()) {
      const name = `demo-${topic.topic_id}`.slice(0, 40);
      const profile = await vectors.profile(DEMO_PROJECT, owner.user_id, name);
      const records = (await pool.query("select i.record,e.embedding::text embedding from content.feed_crawl_images i join content.feed_image_embeddings e on e.image_id=i.id where i.topic_id=$1 and e.model=$2 and e.status='done' and e.deleted_at is null and i.deleted_at is null order by e.updated_at desc limit 24", [topic.topic_id, FEED_MODEL])).rows;
      const items = catalogFromManifest(records.map(r => r.record));
      const index = indexCatalog(items);
      const now = Date.now();
      const result = await vectors.withProfile(profile.id, async (raw, client) => {
        if (raw.engine?.events > 0 || raw.taste?.events > 0) return { state: raw, result: { preserved: true } };
        const state = { engine: createUserState(), taste: createTaste() };
        const log = [];
        for (const [j, item] of items.entries()) {
          const event = { type: ["like", "save", "dwell", "share", "comment", "skip"][j % 6], dwellMs: j % 6 === 2 ? 18000 : 0, slot: "demo" };
          const at = now - (24 - j) * 60000;
          recordEvent(state.engine, item, event, { now: at });
          recordTaste(state.taste, JSON.parse(records[j].embedding), event, { topicId: item.topicId, now: at });
          log.push({ ...event, postId: item.id, at });
        }
        markShown(state.engine, items.map(item => ({ item, slot: "demo" })), { now });
        await vectors.logEvents(client, profile.id, log);
        const query = tasteQuery(state.taste, { now });
        return { state, taste: userEmbedding(query), events: log.length, result: { events: log.length, summary: profileSummary(state.engine, index, { now }), readiness: query.readiness } };
      });
      report.profiles.push({ ownerId: owner.user_id, name, topic: topic.topic_id, ...result });
      console.log(`FEED ${name}: ${JSON.stringify(result)}`);
      // Initialize the screen's default reader only when it has no activity.
      if (i === 0) {
        const defaultProfile = await vectors.profile(DEMO_PROJECT, owner.user_id, "default");
        if (!defaultProfile.events) {
          const seeded = (await pool.query("select state,taste::text taste,events from content.feed_profiles where id=$1", [profile.id])).rows[0];
          await vectors.withProfile(defaultProfile.id, async (raw, client) => {
            if (raw.engine?.events > 0 || raw.taste?.events > 0) return { state: raw, result: { preserved: true } };
            await client.query("insert into content.feed_events(profile_id,post_id,type,dwell_ms,slot,created_at) select $1,post_id,type,dwell_ms,slot,created_at from content.feed_events where profile_id=$2 and deleted_at is null", [defaultProfile.id, profile.id]);
            return { state: seeded.state, taste: seeded.taste ? JSON.parse(seeded.taste) : null, events: seeded.events, result: { seeded: true } };
          });
        }
      }
    }
  }
  await writeFile("docs/demonstrator-feed-report.json", JSON.stringify(report, null, 2) + "\n");
} catch (error) {
  console.error(`Demo feed failed: ${error.code || error.name}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await source.end();
  if (globalThis.geigerVectorPool) await vectorPool().end();
}
