import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";
import { createLiveFeed, FeedRequestError, FeedSettingsError, FeedSteeringError } from "../lib/feed/live.mjs";
import { catalogFromManifest, syntheticEmbeddings } from "../lib/feed/simulator.mjs";
import { captionFields, createFeedVectors } from "../lib/feed/vectors.mjs";
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

// In-memory stand-in for createFeedVectors: one profile, no embeddings, an in-memory feed_events log.
function memoryVectors(items) {
  const row = { id: "p1", name: "default", state: {}, events: 0 };
  const log = [];
  const live = (r) => !r.deletedAt && r.type !== "undo";
  return {
    row,
    log,
    loadCatalog: async () => items,
    embeddingsFor: async () => new Map(),
    logEvents: async (client, profileId, events) => { for (const e of events) log.push({ ...e, metadata: { ...e.metadata }, deletedAt: null }); },
    loadEvents: async (client, profileId, { includeExcluded = false } = {}) => log.filter((r) => live(r) && (includeExcluded || !r.metadata.excluded)).map((r) => structuredClone(r)),
    markEventsExcluded: async (client, profileId, { postIds = [], since = null, excluded = true } = {}) => {
      const hit = log.filter((r) => live(r) && (postIds.includes(r.postId) || (since != null && r.at >= since)));
      for (const r of hit) { if (excluded) r.metadata.excluded = true; else delete r.metadata.excluded; }
      return hit.length;
    },
    softDeleteEvents: async (client, profileId, { eids = [], postIds = [] } = {}) => {
      const hit = log.filter((r) => !r.deletedAt && (eids.includes(r.metadata.eid) || postIds.includes(r.postId)));
      for (const r of hit) r.deletedAt = Date.now();
      return hit.length;
    },
    profile: async () => row,
    withProfile: async (id, fn) => { const out = await fn(structuredClone(row.state)); row.state = out.state; return out.result; },
  };
}

test("entertainment taste persists separate subject interests and queries each vector", async () => {
  const items = ["one-piece", "classroom-of-the-elite"].flatMap((subject, j) => Array.from({ length: 8 }, (_, i) => ({
    id: `${subject}-${i}`, topicId: "anime-manga", subjectPath: `anime-manga/${subject}`, subtopicId: subject,
    stepId: "content", horizontalId: "general", depth: 1, createdAt: "2026-10-01", embedded: true, vector: j ? [0, 1] : [1, 0],
  })));
  const vectors = memoryVectors(items);
  vectors.embeddingsFor = async ids => new Map(items.filter(i => ids.includes(i.id)).map(i => [i.id, i.vector]));
  const queries = [];
  vectors.nearest = async vector => { queries.push(vector); return []; };
  vectors.nearestToTaste = async () => { throw new Error("Blended average must not replace separate interests"); };
  const feed = createLiveFeed(vectors, { clock: () => Date.parse("2026-10-07") });
  await feed.record("p1", items.slice(0, 6).concat(items.slice(8, 14)).map(i => ({ postId: i.id, type: "like" })));
  assert.deepEqual(Object.keys(vectors.row.state.taste.topics).sort(), ["anime-manga/classroom-of-the-elite", "anime-manga/one-piece"]);
  await feed.next(vectors.row);
  assert.ok(queries.some(v => v[0] > 0.99 && v[1] === 0));
  assert.ok(queries.some(v => v[1] > 0.99 && v[0] === 0));
});

test("live feed: activating another dataset invalidates the cached catalog", async () => {
  const datasets = { old: [{ id: "old-1", topicId: "t", subtopicId: "s", stepId: "a", depth: 1, horizontalId: "h", createdAt: "2026-10-01" }], new: [] };
  let active = "old";
  const vectors = memoryVectors([]);
  vectors.loadCatalog = async () => datasets[active];
  vectors.activeDataset = async () => ({ id: active });
  const feed = createLiveFeed(vectors, { clock: () => Date.parse("2026-10-07") });
  assert.equal((await feed.catalog()).items, 1);
  active = "new";
  assert.equal((await feed.catalog()).items, 0, "a fresh cache must not outlive a dataset switch");
});

test("live feed: recency settings persist, shape later batches and reject unknown modes", async () => {
  const now = Date.parse("2026-09-01T08:00:00Z");
  const items = Array.from({ length: 400 }, (_, i) => ({
    id: `p${i}`, topicId: `t${i % 20}`, subtopicId: `s${i % 3}`, stepId: "a", depth: 1, horizontalId: `h${i % 5}`,
    createdAt: new Date(now - i * 86400000).toISOString(), score: 10,
  }));
  const vectors = memoryVectors(items);
  const feed = createLiveFeed(vectors, { clock: () => now });
  assert.equal((await feed.profile()).summary.settings.recency, "balanced");
  const { settings } = await feed.updateSettings("p1", { recency: "latest" });
  assert.equal(settings.recency, "latest");
  assert.equal(vectors.row.state.settings.recency, "latest");
  const { items: batch } = await feed.next(vectors.row);
  const fresh = batch.filter((i) => i.slot === "fresh");
  assert.ok(fresh.length >= 3, `${fresh.length} fresh items in a latest batch`);
  for (const i of fresh) assert.ok(Number(i.id.slice(1)) <= 7, `${i.id} is within a week`);
  await assert.rejects(feed.updateSettings("p1", { recency: "yesterday" }), FeedSettingsError);
});

test("live feed: an empty catalog serves empty batches and still records settings", async () => {
  const vectors = memoryVectors([]);
  const feed = createLiveFeed(vectors);
  assert.equal((await feed.profile()).summary.topics.length, 0);
  await feed.updateSettings("p1", { recency: "latest" });
  assert.deepEqual((await feed.next(vectors.row)).items, []);
  assert.equal((await feed.record("p1", [{ postId: "gone", type: "like" }])).recorded, 0);
});

const T0 = Date.parse("2026-09-01T08:00:00Z");
// 6 topics × 3 subjects × 30 items, unlabelled unless `extra` says otherwise.
const grid = (extra = () => ({})) => Array.from({ length: 540 }, (_, i) => ({
  id: `p${i}`, topicId: `t${i % 6}`, subtopicId: `s${Math.floor(i / 6) % 3}`, stepId: "a", depth: 1, horizontalId: `h${Math.floor(i / 18) % 5}`,
  createdAt: new Date(T0 - i * 3600000).toISOString(), score: 10, ...extra(i),
}));
const subOfId = (id) => { const i = Number(id.slice(1)); return `t${i % 6}/s${Math.floor(i / 6) % 3}`; };
const idsIn = (sub, n) => Array.from({ length: 540 }, (_, i) => `p${i}`).filter((id) => subOfId(id) === sub).slice(0, n);

test("live feed: a legacy state blob reads with defaults and the profile carries the new summary and options", async () => {
  const vectors = memoryVectors(grid());
  vectors.row.state = { datasetId: null, engine: { nodes: {}, frontier: {}, probes: {}, history: [], seen: [], events: 0, shown: 0, shownAt: {} }, taste: { topics: {}, short: null, negative: null, events: 0 }, settings: { recency: "balanced" } };
  const feed = createLiveFeed(vectors, { clock: () => T0 });
  const profile = await feed.profile();
  const { summary } = profile;
  assert.equal(summary.settings.recency, "balanced");
  assert.equal(summary.settings.v, 1);
  assert.equal(summary.emotion.profile.length, 7);
  assert.deepEqual(summary.knowledge.subjects, []);
  assert.deepEqual(summary.drift, []);
  assert.deepEqual(summary.steering, []);
  assert.equal(summary.funnel.maxRun, 0);
  assert.deepEqual(summary.stated, { answered: 0, agreement: null });
  assert.equal(summary.governor.maxLevels, 1);
  assert.equal(summary.nonProfiled, false);
  assert.equal(summary.privateSession, false);
  assert.equal(summary.canUndo, false);
  assert.equal(profile.options.topics.length, 6);
  assert.equal(profile.options.topics[0].subjects.length, 3);
});

test("live feed: events log metadata, undo by eid reverts learning and soft-deletes the original", async () => {
  const vectors = memoryVectors(grid());
  const feed = createLiveFeed(vectors, { clock: () => T0 });
  const liked = await feed.record("p1", [{ postId: "p0", type: "like", eid: "e1" }, { postId: "p1", type: "hide", reason: "seen_it", eid: "e2" }]);
  assert.equal(liked.recorded, 2);
  assert.equal(liked.summary.canUndo, true);
  assert.deepEqual(vectors.log.map((r) => r.metadata), [{ eid: "e1" }, { eid: "e2", reason: "seen_it" }]);
  assert.equal(vectors.row.state.engine.events, 1, "seen_it never lowers interest");
  const undone = await feed.record("p1", [{ type: "undo", of: "e1", eid: "u1" }, { type: "undo", of: "missing" }]);
  assert.deepEqual(undone.undone, ["e1"]);
  assert.equal(vectors.row.state.engine.events, 0);
  assert.ok(vectors.log[0].deletedAt, "the undone like is soft-deleted");
  assert.deepEqual(vectors.log.at(-1).metadata, { eid: "u1", of: "e1" });
  assert.equal(vectors.log.at(-1).postId, "p0");
});

test("live feed: muted topics and subjects never appear", async () => {
  let now = T0;
  const vectors = memoryVectors(grid());
  const feed = createLiveFeed(vectors, { clock: () => now });
  await feed.updateSettings("p1", { topics: { mute: ["t2", "t1/s1"] } });
  for (let b = 0; b < 20; b += 1) {
    now += 60000;
    const { items } = await feed.next(vectors.row);
    assert.ok(items.length > 0);
    for (const i of items) assert.ok(i.topicId !== "t2" && `${i.topicId}/${i.subtopicId}` !== "t1/s1", `${i.id} is muted`);
  }
});

test("live feed: steering requests add searched candidates until they expire", async () => {
  let now = T0;
  const vectors = memoryVectors(grid());
  const steerHits = idsIn("t5/s2", 10).map((id, k) => ({ id, similarity: 0.9 - k * 0.01 }));
  let steerSearches = 0;
  vectors.nearest = async (vector) => { if (vector[1] === 1) { steerSearches += 1; return steerHits; } return []; };
  const feed = createLiveFeed(vectors, { clock: () => now, embedText: async () => [0, 1] });
  const { steering } = await feed.steering("p1", { action: "add", text: "  tiny   houses " });
  assert.equal(steering.length, 1);
  assert.equal(steering[0].text, "tiny houses");
  const { items } = await feed.next(vectors.row);
  const steered = items.filter((i) => i.steered);
  assert.ok(steered.length >= 1, "steered items in the batch");
  assert.equal(steered[0].reason, 'matches your request "tiny houses"');
  await assert.rejects(feed.steering("p1", { action: "add", text: "  " }), (e) => e instanceof FeedSteeringError && e.code === "steering_invalid");
  for (const text of ["one more", "two more", "three more", "four more", "five more"]) await feed.steering("p1", { action: "add", text });
  await assert.rejects(feed.steering("p1", { action: "add", text: "seven" }), (e) => e.code === "steering_limit" && e.status === 409);
  now += 3 * 24 * 3600000 + 1;
  steerSearches = 0;
  const later = await feed.next(vectors.row);
  assert.equal(steerSearches, 0, "expired requests are not searched");
  assert.ok(later.items.every((i) => !i.steered));
  assert.deepEqual(later.summary.steering, []);
  assert.deepEqual((await feed.steering("p1", { action: "remove", id: "nope" })).steering, []);
});

test("live feed: non-profiled mode learns nothing and logs nothing", async () => {
  const vectors = memoryVectors(grid());
  const feed = createLiveFeed(vectors, { clock: () => T0 });
  await feed.updateSettings("p1", { nonProfiled: true });
  const out = await feed.record("p1", [{ postId: "p0", type: "like", eid: "e1" }]);
  assert.equal(out.skipped, "non_profiled");
  assert.equal(out.recorded, 0);
  assert.deepEqual(vectors.log, []);
  assert.equal(vectors.row.state.engine.events, 0);
  const { items, probe, summary } = await feed.next(vectors.row);
  assert.ok(items.length > 0 && items.every((i) => i.slot === "fresh"));
  assert.equal(probe, null);
  assert.equal(summary.nonProfiled, true);
});

test("live feed: private sessions log events as excluded; exclusions replay learning without them", async () => {
  let now = T0;
  const vectors = memoryVectors(grid());
  const feed = createLiveFeed(vectors, { clock: () => now });
  await feed.record("p1", [{ postId: "p0", type: "like" }, { postId: "p1", type: "like" }]);
  assert.equal(vectors.row.state.engine.events, 2);
  const item = await feed.exclude("p1", { scope: "item", id: "p0" });
  assert.equal(item.excluded, 1);
  assert.equal(vectors.row.state.engine.events, 1, "learning rebuilt without the excluded like");
  assert.equal(vectors.row.state.engine.nodes.t0, undefined);
  now += 60000;
  const priv = await feed.exclude("p1", { scope: "session", on: true });
  assert.equal(priv.summary.privateSession, true);
  const out = await feed.record("p1", [{ postId: "p2", type: "like" }]);
  assert.equal(out.skipped, "private_session");
  assert.equal(vectors.log.at(-1).metadata.excluded, true);
  assert.equal(vectors.row.state.engine.events, 1);
  assert.equal((await feed.exclude("p1", { scope: "session", on: false })).summary.privateSession, false);
  const topic = await feed.exclude("p1", { scope: "topic", id: "t1" });
  assert.deepEqual(topic.summary.settings.topics.exclude, ["t1"]);
  assert.equal(vectors.row.state.engine.events, 0);
  await feed.record("p1", [{ postId: "p7", type: "like" }]);
  assert.equal(vectors.log.at(-1).metadata.excluded, true, "a topic excluded from learning is logged, not learned");
  await assert.rejects(feed.exclude("p1", { scope: "planet" }), (e) => e instanceof FeedRequestError);
});

test("live feed: a scoped topic reset clears that topic's learning and events only", async () => {
  const vectors = memoryVectors(grid());
  const feed = createLiveFeed(vectors, { clock: () => T0 });
  await feed.record("p1", [{ postId: "p0", type: "like", eid: "a" }, { postId: "p1", type: "like" }, { postId: "p6", type: "react", emotion: "amused" }]);
  await feed.scopedReset("p1", { scope: "topic", id: "t0" });
  const { nodes } = vectors.row.state.engine;
  assert.ok(!Object.keys(nodes).some((k) => k === "t0" || k.startsWith("t0/")));
  assert.ok(nodes.t1);
  assert.deepEqual(vectors.log.filter((r) => r.deletedAt).map((r) => r.postId), ["p0", "p6"]);
  assert.deepEqual(vectors.row.state.journal, []);
  await feed.scopedReset("p1", { scope: "emotion" });
  assert.deepEqual(vectors.row.state.emotion, { b: {}, n: 0 });
  await assert.rejects(feed.scopedReset("p1", { scope: "topic", id: "Bad Id" }), FeedRequestError);
});

test("live feed: a probe is offered for a liked subject and its answer is recorded", async () => {
  let now = T0;
  const vectors = memoryVectors(grid());
  const feed = createLiveFeed(vectors, { clock: () => now });
  await feed.record("p1", [...idsIn("t0/s0", 6).map((postId) => ({ postId, type: "like" })), ...idsIn("t3/s1", 6).map((postId) => ({ postId, type: "skip" }))]);
  let probe = null;
  for (let b = 0; b < 8 && !probe; b += 1) {
    now += 60000;
    ({ probe } = await feed.next(vectors.row));
  }
  assert.ok(probe, "a probe within 80 impressions");
  assert.equal(probe.kind, "knowledge");
  assert.ok(vectors.row.state.engine.history.some((h) => h.id === probe.postId && h.sub === probe.sub));
  const answered = await feed.record("p1", [{ postId: probe.postId, type: "probe_answer", probe: probe.kind, answer: "some", sub: probe.sub }]);
  assert.equal(answered.summary.stated.answered, 1);
  assert.ok(answered.summary.knowledge.subjects.some((s) => s.id === probe.sub));
  const dismissed = await feed.probe("p1", { action: "dismiss", sub: probe.sub });
  assert.equal(dismissed.probe, null);
  assert.ok(vectors.row.state.stated.dismissed[probe.sub]);
});

test("live feed: caption labels map onto items and item views", async () => {
  assert.deepEqual(captionFields({ emotion: "neutral", emotion_intensity: null, difficulty: 4, bloom: "none", sensitive: ["gore", 3] }), { emotion: { bucket: "neutral", intensity: null }, difficulty: { level: 4 }, bloom: null, sensitive: ["gore"] });
  assert.deepEqual(captionFields({ emotion: "amazed", emotion_intensity: 5, difficulty: 9 }), { emotion: { bucket: "amazed", intensity: 1 }, difficulty: null, bloom: null, sensitive: [] });
  assert.deepEqual(captionFields(null), { emotion: null, difficulty: null, bloom: null, sensitive: [] });
  const vectors = memoryVectors(grid((i) => (i % 2 ? { emotion: { bucket: "neutral", intensity: null }, difficulty: { level: 4 } } : { emotion: { bucket: "moved", intensity: 0.6 } })));
  const { items: batch } = await createLiveFeed(vectors, { clock: () => T0 }).next(vectors.row);
  assert.ok(batch.length > 0);
  for (const v of batch) {
    if (Number(v.id.slice(1)) % 2) {
      assert.equal(v.emotion, null, "neutral is not a bucket");
      assert.deepEqual(v.level, { value: 4, estimated: false });
    } else {
      assert.equal(v.emotion, "moved");
      assert.equal(v.level.estimated, true);
    }
  }
});
