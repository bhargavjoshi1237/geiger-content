import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";
import { createLiveFeed } from "../lib/feed/live.mjs";
import { catalogFromManifest, syntheticEmbeddings } from "../lib/feed/simulator.mjs";
import { createFeedVectors } from "../lib/feed/vectors.mjs";
import { connectionOptions } from "../lib/vector/connection.mjs";

nextEnv.loadEnvConfig(process.cwd());
const live = process.env.VECTOR_LIVE_TESTS === "1";

// Synthetic vectors under their own model tag, so real embeddings are never read or touched.
test("live feed: taste neighbours from pgvector fill the similar slot and profiles persist", { skip: !live, timeout: 120000 }, async () => {
  // Inserting fixtures into the HNSW index next to a live ingest can take longer than the 15 s app timeout.
  const pool = new pg.Pool({ ...connectionOptions(), max: 4, statement_timeout: 120000 });
  const model = `test-${randomUUID().slice(0, 8)}`;
  const projectId = randomUUID();
  const ownerId = randomUUID();
  const vectors = createFeedVectors(pool, { model });
  try {
    const { rows } = await pool.query(
      `select i.id, i.post_id, i.record from content.feed_crawl_images i where i.deleted_at is null and i.depth = 1
       and i.topic_id in ('dogs', 'camping', 'coffee')
       and not exists (select 1 from content.feed_image_embeddings d where d.image_id = i.id and d.status = 'failed' and d.error in ('http 404', 'http 410'))
       order by i.id limit 600`,
    );
    assert.ok(rows.length >= 100, "enough crawled images to test with");
    const items = catalogFromManifest(rows.map((r) => r.record));
    const embeddings = syntheticEmbeddings(items, { dims: 768 });
    await pool.query(
      `insert into content.feed_image_embeddings (image_id, model, status, embedding)
       select t.id, $1, 'done', t.emb::public.halfvec from unnest($2::uuid[], $3::text[]) as t(id, emb)`,
      [model, rows.map((r) => r.id), rows.map((r) => `[${embeddings.get(r.post_id).join(",")}]`)],
    );
    const feed = createLiveFeed(vectors);
    const profile = await feed.profile(projectId, ownerId, "test");
    assert.equal(profile.events, 0);

    const first = await feed.next(await vectors.profile(projectId, ownerId, "test"));
    assert.equal(first.items.length, 10);
    assert.ok(first.items.every((i) => i.slot !== "similar"), "cold reader gets no similar slot");

    const liked = items.filter((i) => ["dogs", "camping", "coffee"].includes(i.topicId)).slice(0, 18);
    const recorded = await feed.record(profile.id, liked.map((i) => ({ postId: i.id, type: "like", slot: "core" })));
    assert.equal(recorded.recorded, liked.length);
    assert.equal(recorded.withEmbedding, liked.length);
    assert.ok(recorded.summary.taste.readiness > 0.5);

    let similarShown = 0;
    for (let b = 0; b < 3; b += 1) {
      const batch = await feed.next(await vectors.profile(projectId, ownerId, "test"));
      const sims = batch.items.filter((i) => i.slot === "similar");
      similarShown += sims.length;
      for (const s of sims) assert.ok(s.similarity > 0 && s.embedded);
    }
    assert.ok(similarShown >= 4, `similar items over 3 batches: ${similarShown}`);

    const { rows: [saved] } = await pool.query("select events, taste is not null as has_taste from content.feed_profiles where id = $1", [profile.id]);
    assert.equal(saved.events, liked.length);
    assert.ok(saved.has_taste, "user embedding stored");
    const fromColumn = await vectors.nearestToTaste(profile.id, { limit: 5 });
    assert.equal(fromColumn.length, 5, "similarity search runs off the stored taste column");
    assert.ok(fromColumn.every((r) => r.similarity > 0));
    assert.deepEqual(await vectors.nearestToTaste(randomUUID(), { limit: 5 }), [], "no taste vector, no neighbours");

    const neighbours = await feed.similar(liked[0].id, { limit: 5 });
    assert.equal(neighbours.results.length, 5);
    assert.ok(neighbours.results.every((r) => r.id !== liked[0].id));
  } finally {
    await pool.query("delete from content.feed_events where profile_id in (select id from content.feed_profiles where project_id = $1)", [projectId]);
    await pool.query("delete from content.feed_profiles where project_id = $1", [projectId]);
    await pool.query("delete from content.feed_image_embeddings where model = $1", [model]);
    await pool.end();
  }
});
