import test from "node:test";
import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { randomUUID } from "node:crypto";
import { vectorPool, transaction } from "../lib/vector/connection.mjs";
import * as repo from "../lib/vector/repository.mjs";
import { processJob } from "../lib/vector/ingestion.mjs";
import { sourceRevision } from "../lib/vector/sources.mjs";
import { chunkFingerprint, MODEL, PREPROCESSING } from "../lib/vector/core.mjs";
nextEnv.loadEnvConfig(process.cwd());
const live = process.env.VECTOR_LIVE_TESTS === "1";

test("ingestion reuses a stored chunk from a different revision and index without a provider request", { skip: !live }, async () => {
  const project = randomUUID(), source = randomUUID(), pool = vectorPool();
  const row = { id: source, project_id: project, status: "Published", title: "Reuse fixture", body: "Previously embedded body.", metadata: {} };
  const embedding = Array.from({ length: 768 }, (_, i) => i === 0 ? 1 : 0);
  const fakeAdmin = { schema: () => fakeAdmin, from: (table) => {
    const builder = { select: () => builder, eq: () => builder, is: () => builder,
      maybeSingle: async () => ({ data: table === "projects" ? { id: project } : row, error: null }),
      limit: async () => ({ data: [], error: null }) };
    return builder;
  } };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => assert.fail("Unchanged chunks must not make a provider request");
  try {
    await repo.saveSettings(project, { enabled: true }, randomUUID());
    await repo.enqueue(project, "entry", source, "previous-revision");
    const prior = await repo.claimJob(project);
    await repo.stageChunk(prior, 4, embedding, { chunkHash: chunkFingerprint({ title: row.title, text: row.body }) });
    await repo.finishJob(prior);
    const revision = sourceRevision("entry", row);
    await repo.enqueue(project, "entry", source, revision);
    const job = await repo.claimJob(project);
    await processJob(job, fakeAdmin);
    await repo.finishJob(job);
    const result = await pool.query("select chunk_index,model,preprocessing,embedding::text from content.vectors where project_id=$1 and revision=$2 and active and deleted_at is null", [project, revision]);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].chunk_index, 0);
    assert.equal(result.rows[0].model, MODEL);
    assert.equal(result.rows[0].preprocessing, PREPROCESSING);
    assert.deepEqual(JSON.parse(result.rows[0].embedding), embedding);
  } finally {
    globalThis.fetch = originalFetch;
    for (const table of ["vectors", "embedding_jobs", "vector_settings"])
      await pool.query(`delete from content.${table} where project_id=$1`, [project]);
    await pool.end();
    delete globalThis.geigerVectorPool;
  }
});

test(
  "Aiven extension and project-filtered cosine retrieval",
  { skip: !live },
  async () => {
    const pool = vectorPool();
    try {
      const available = await pool.query(
        "select name, default_version, installed_version from pg_available_extensions where name = 'vector'",
      );
      assert.ok(available.rows.length);
      console.log("Aiven pgvector:", JSON.stringify(available.rows));
      const project = randomUUID(),
        other = randomUUID(),
        source = randomUUID();
      const vector = JSON.stringify(
        Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0)),
      );
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query(
          "insert into content.vectors(project_id,source_kind,source_id,revision,embedding,active) values($1,'asset',$2,'test',$3::vector,true),($4,'asset',$5,'test',$3::vector,true)",
          [project, source, vector, other, randomUUID()],
        );
        await client.query("set local enable_seqscan = off");
        const rows = await client.query(
          "select source_id from content.vectors where project_id=$1 and active and deleted_at is null order by embedding <=> $2::vector limit 5",
          [project, vector],
        );
        assert.deepEqual(
          rows.rows.map((row) => row.source_id),
          [source],
        );
        const plan = await client.query(
          "explain select source_id from content.vectors where project_id=$1 and active and deleted_at is null order by embedding <=> $2::vector limit 5",
          [project, vector],
        );
        assert.ok(
          plan.rows.some((row) => row["QUERY PLAN"].includes("vectors_")),
          plan.rows.map(row => row["QUERY PLAN"].slice(0, 180)).join("\n"),
        );
        const ann = await client.query(
          "explain select source_id from content.vectors where active and deleted_at is null order by embedding <=> $1::vector limit 5",
          [vector],
        );
        assert.ok(
          ann.rows.some((row) =>
            row["QUERY PLAN"].includes("vectors_hnsw_idx"),
          ),
        );
      } finally {
        await client.query("rollback");
        client.release();
      }
    } finally {
      await pool.end();
      delete globalThis.geigerVectorPool;
    }
  },
);

test(
  "three concurrent workers stage safely and cannot activate superseded or expired leases",
  { skip: !live },
  async () => {
    const project = randomUUID(),
      source = randomUUID(),
      pool = vectorPool();
    const embedding = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0));
    try {
      await repo.saveSettings(project, { enabled: true }, randomUUID());
      await repo.enqueue(project, "entry", source, "old");
      const old = await repo.claimJob(project);
      assert.ok(old);
      await Promise.all(
        [0, 1, 2].map((i) =>
          repo.stageChunk(old, i, embedding, {
            title: "Controlled integration fixture",
          }),
        ),
      );
      await assert.rejects(
        repo.activateSource(old, 4),
        (error) => error.code === "incomplete_revision",
      );
      await repo.enqueue(project, "entry", source, "new");
      const newer = await repo.claimJob(project);
      await repo.stageChunk(newer, 0, embedding, {});
      await repo.activateSource(newer, 1);
      await repo.finishJob(newer);
      await assert.rejects(
        repo.activateSource(old, 3, async () => {
          throw Object.assign(new Error("Source revision changed"), {
            code: "stale_source",
          });
        }),
        (error) => error.code === "stale_source",
      );
      await repo.discardRevision(old);
      const current = await pool.query(
        "select revision from content.vectors where project_id=$1 and active and deleted_at is null",
        [project],
      );
      assert.deepEqual(
        current.rows.map((row) => row.revision),
        ["new"],
      );
      assert.equal(await repo.enqueue(project, "entry", source, "new"), 0);
      const reverseSource = randomUUID();
      await repo.enqueue(project, "entry", reverseSource, "current-r2");
      const currentFirst = await repo.claimJob(project);
      await repo.enqueue(project, "entry", reverseSource, "stale-r1");
      await repo.stageChunk(currentFirst, 0, embedding, {});
      await repo.activateSource(currentFirst, 1);
      await repo.finishJob(currentFirst);
      const reverseResult = await pool.query(
        "select revision from content.vectors where project_id=$1 and source_id=$2 and active",
        [project, reverseSource],
      );
      assert.deepEqual(
        reverseResult.rows.map((row) => row.revision),
        ["current-r2"],
      );
      const lateStale = await repo.claimJob(project);
      await repo.finishJob(
        lateStale,
        Object.assign(new Error("Source changed"), { code: "stale_source" }),
      );
      assert.equal(
        await repo.enqueue(project, "entry", reverseSource, "stale-r1"),
        1,
      );
      const lateRetry = await repo.claimJob(project);
      await repo.finishJob(lateRetry);
      await repo.retireSource(project, "entry", source);
      assert.equal(await repo.enqueue(project, "entry", source, "new"), 1);
      const reclaimed = await repo.claimJob(project);
      await pool.query(
        "update content.embedding_jobs set lease_until=now()-interval '1 second' where id=$1",
        [reclaimed.id],
      );
      await assert.rejects(
        repo.renewJob(reclaimed),
        (error) => error.code === "lease_lost",
      );
      await assert.rejects(
        repo.activateSource(reclaimed, 1),
        (error) => error.code === "lease_lost",
      );
    } finally {
      for (const table of ["vectors", "embedding_jobs", "vector_settings"])
        await pool.query(`delete from content.${table} where project_id=$1`, [
          project,
        ]);
      await pool.end();
      delete globalThis.geigerVectorPool;
    }
  },
);

test(
  "profile invalidation shares the activation lock and erases derived personal vectors",
  { skip: !live },
  async () => {
    const project = randomUUID(),
      profile = randomUUID(),
      pool = vectorPool(),
      embedding = JSON.stringify(
        Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0)),
      );
    try {
      let release, started;
      const gate = new Promise((resolve) => {
          release = resolve;
        }),
        ready = new Promise((resolve) => {
          started = resolve;
        });
      const activation = repo.withProfileLock(
        project,
        profile,
        async (client) => {
          await client.query(
            "insert into content.profile_vectors(project_id,profile_id,embedding,revision) values($1,$2,$3::vector,'fixture')",
            [project, profile, embedding],
          );
          started();
          await gate;
        },
      );
      await ready;
      const invalidation = repo.withProfileLock(project, profile, (client) =>
        repo.eraseProfile(client, project, profile),
      );
      release();
      await Promise.all([activation, invalidation]);
      const result = await pool.query(
        "select 1 from content.profile_vectors where project_id=$1",
        [project],
      );
      assert.equal(result.rowCount, 0);
    } finally {
      await pool.query(
        "delete from content.profile_vectors where project_id=$1",
        [project],
      );
      await pool.end();
      delete globalThis.geigerVectorPool;
    }
  },
);

test(
  "a source changing during ingestion cannot retire an already activated newer revision",
  { skip: !live },
  async () => {
    const project = randomUUID(),
      source = randomUUID(),
      pool = vectorPool();
    const oldRow = {
        id: source,
        project_id: project,
        status: "Published",
        title: "Fixture",
        body: "Old body",
        metadata: {},
      },
      newRow = { ...oldRow, body: "Current body" };
    const oldRevision = sourceRevision("entry", oldRow),
      newRevision = sourceRevision("entry", newRow),
      embedding = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0));
    let reads = 0;
    const fakeAdmin = {
      schema: () => fakeAdmin,
      from: (table) => {
        const builder = {
          select: () => builder,
          eq: () => builder,
          is: () => builder,
          maybeSingle: async () => ({
            data:
              table === "projects"
                ? { id: project }
                : reads++ === 0
                  ? oldRow
                  : newRow,
            error: null,
          }),
          limit: async () => ({ data: [], error: null }),
        };
        return builder;
      },
    };
    try {
      await repo.saveSettings(project, { enabled: true }, randomUUID());
      await repo.enqueue(project, "entry", source, oldRevision);
      const old = await repo.claimJob(project);
      await repo.stageChunk(old, 0, embedding, {});
      await repo.enqueue(project, "entry", source, newRevision);
      const newer = await repo.claimJob(project);
      await repo.stageChunk(newer, 0, embedding, {});
      await repo.activateSource(newer, 1);
      await repo.finishJob(newer);
      await repo.stageChunk(old, 0, embedding, {});
      await assert.rejects(
        processJob(old, fakeAdmin),
        (error) => error.code === "stale_source",
      );
      const active = await pool.query(
        "select revision from content.vectors where project_id=$1 and active and deleted_at is null",
        [project],
      );
      assert.deepEqual(
        active.rows.map((row) => row.revision),
        [newRevision],
      );
    } finally {
      for (const table of ["vectors", "embedding_jobs", "vector_settings"])
        await pool.query(`delete from content.${table} where project_id=$1`, [
          project,
        ]);
      await pool.end();
      delete globalThis.geigerVectorPool;
    }
  },
);

test(
  "transaction helper rolls back failed writes",
  { skip: !live },
  async () => {
    const project = randomUUID();
    try {
      await assert.rejects(
        transaction(async (client) => {
          await client.query(
            "insert into content.vector_settings(project_id) values($1)",
            [project],
          );
          throw new Error("abort");
        }),
      );
      const result = await vectorPool().query(
        "select project_id from content.vector_settings where project_id=$1",
        [project],
      );
      assert.equal(result.rowCount, 0);
    } finally {
      await vectorPool().end();
      delete globalThis.geigerVectorPool;
    }
  },
);

test(
  "quota reservations count together and return a retryable 429 without consuming provider calls",
  { skip: !live },
  async () => {
    const project = randomUUID(),
      pool = vectorPool();
    try {
      await transaction(async (client) => {
        await client.query(
          "insert into content.vector_settings(project_id,config) values($1,$2)",
          [project, { ingestionDailyLimit: 1 }],
        );
        await repo.reserveRequest(project, true, client);
        await assert.rejects(
          repo.reserveRequest(project, true, client),
          (error) =>
            error.status === 429 &&
            error.code === "daily_budget_reached" &&
            error.retryAt > Date.now(),
        );
        const usage = await client.query(
          "select requests from content.embedding_usage where scope=$1 and period='day'",
          [project],
        );
        assert.equal(usage.rows[0].requests, 1);
        throw new Error("rollback controlled quota fixture");
      }).catch((error) => {
        assert.equal(error.message, "rollback controlled quota fixture");
      });
      const persisted = await pool.query(
        "select 1 from content.embedding_usage where scope=$1",
        [project],
      );
      assert.equal(persisted.rowCount, 0);
    } finally {
      await pool.end();
      delete globalThis.geigerVectorPool;
    }
  },
);
