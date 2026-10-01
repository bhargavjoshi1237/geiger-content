import { randomUUID } from "node:crypto";
import { vectorPool, transaction } from "./connection.mjs";
import {
  MODEL,
  DIMENSIONS,
  PREPROCESSING,
  READABLE_PREPROCESSING,
  nextPacificReset,
  validateVector,
} from "./core.mjs";
import { ProviderError } from "./provider.mjs";
import { VectorError } from "./auth.mjs";

export const DEFAULT_SETTINGS = {
  enabled: false,
  indexImages: true,
  indexText: true,
  audienceEnabled: true,
  topicLimit: 5,
  halfLifeDays: 30,
  ingestionDailyLimit: 800,
  maxVectors: 50000,
};
const encoded = (value) => JSON.stringify(validateVector(value));
const integer = (value, min, max, fallback) =>
  Math.min(
    max,
    Math.max(min, Number.isInteger(Number(value)) ? Number(value) : fallback),
  );

export function cleanSettings(input = {}) {
  return {
    enabled: input.enabled === true,
    indexImages: input.indexImages !== false,
    indexText: input.indexText !== false,
    audienceEnabled: input.audienceEnabled !== false,
    topicLimit: integer(input.topicLimit, 0, 5, 5),
    halfLifeDays: integer(input.halfLifeDays, 1, 90, 30),
    ingestionDailyLimit: integer(
      input.ingestionDailyLimit,
      1,
      integer(process.env.GEMINI_DAILY_LIMIT, 1, 1000000, 1000),
      800,
    ),
    maxVectors: integer(input.maxVectors, 100, 50000, 50000),
  };
}

export async function getSettings(projectId, client = vectorPool()) {
  const { rows } = await client.query(
    "select config,sync_cursor from content.vector_settings where project_id=$1 and deleted_at is null",
    [projectId],
  );
  return {
    ...DEFAULT_SETTINGS,
    ...rows[0]?.config,
    cursor: rows[0]?.sync_cursor || {},
  };
}

export async function saveSettings(projectId, input, actor) {
  const config = cleanSettings(input);
  await vectorPool().query(
    "insert into content.vector_settings(project_id,config,created_by) values($1,$2,$3) on conflict(project_id) do update set config=$2,updated_at=now(),deleted_at=null",
    [projectId, config, actor],
  );
  return config;
}

export async function updateCursor(projectId, kind, offset) {
  await vectorPool().query(
    "update content.vector_settings set sync_cursor=sync_cursor || jsonb_build_object($2::text,$3::integer),updated_at=now() where project_id=$1",
    [projectId, kind, offset],
  );
}

export async function enqueue(
  projectId,
  kind,
  sourceId,
  revision,
  metadata = {},
) {
  return transaction(async (client) => {
    await client.query(
      "select pg_advisory_xact_lock(hashtext('geiger_vector_capacity'))",
    );
    await capacityGuard(client);
    if (kind === "profile" && !metadata.forceRefresh) {
      const current = await client.query(
        "select 1 from content.embedding_jobs where project_id=$1 and source_kind='profile' and source_id=$2 and revision=$3 and status='completed' and deleted_at is null and coalesce(metadata->>'superseded','false')='false' limit 1",
        [projectId, sourceId, revision],
      );
      if (current.rowCount) return 0;
    }
    const table = {
      entry: "vectors",
      asset: "vectors",
      knowledge: "knowledge_vectors",
      profile: "profile_vectors",
    }[kind];
    if (table && !metadata.forceRefresh) {
      const current = await client.query(
        `select 1 from content.${table} where project_id=$1 and ${kind === "profile" ? "profile_id" : "source_id"}=$2 and revision=$3 and deleted_at is null ${table === "vectors" ? "and active and source_kind=$4" : ""} limit 1`,
        table === "vectors"
          ? [projectId, sourceId, revision, kind]
          : [projectId, sourceId, revision],
      );
      if (current.rowCount) return 0;
    }
    const count = await client.query(
      "select count(*)::int as n from content.embedding_jobs",
    );
    if (count.rows[0].n >= 100000)
      throw new VectorError(
        "queue_capacity_reached",
        "The indexing queue is full. Run the worker before adding more sources.",
        507,
      );
    const { rowCount } = await client.query(
      "insert into content.embedding_jobs(project_id,source_kind,source_id,revision,metadata) values($1,$2,$3,$4,$5) on conflict(project_id,source_kind,source_id,revision) do update set status='queued',attempts=0,available_at=now(),error_code=null,error_message=null,updated_at=now(),deleted_at=null where content.embedding_jobs.status='completed' or (content.embedding_jobs.status='failed' and content.embedding_jobs.error_code in ('stale_source','lease_lost'))",
      [projectId, kind, sourceId, revision, metadata],
    );
    return rowCount;
  });
}

export async function claimJob(projectId = null) {
  const token = randomUUID();
  const { rows } = await vectorPool().query(
    `with ready as (
    select j.id from content.embedding_jobs j join content.vector_settings s on s.project_id=j.project_id
    where j.deleted_at is null and s.deleted_at is null and s.config->>'enabled'='true'
      and ($1::uuid is null or j.project_id=$1) and j.available_at<=now()
      and (j.status in ('queued','retry') or (j.status='processing' and j.lease_until<now()))
    order by j.available_at,j.created_at for update of j skip locked limit 1
  ) update content.embedding_jobs j set status='processing',lease_token=$2,lease_until=now()+interval '10 minutes',attempts=attempts+1,updated_at=now()
    from ready where j.id=ready.id returning j.*`,
    [projectId, token],
  );
  return rows[0] || null;
}

export async function renewJob(job) {
  const result = await vectorPool().query(
    "update content.embedding_jobs set lease_until=now()+interval '10 minutes' where id=$1 and lease_token=$2 and status='processing' and lease_until>now()",
    [job.id, job.lease_token],
  );
  if (!result.rowCount)
    throw new VectorError(
      "lease_lost",
      "Another worker has claimed this job.",
      409,
    );
}

export async function finishJob(job, error = null) {
  const superseded = error?.code === "stale_source";
  if (superseded) error = null;
  const retry =
    error?.retryAt &&
    (error.status === 429 || error.code === "worker_yield" || job.attempts < 5);
  await vectorPool().query(
    "update content.embedding_jobs set status=$3,error_code=$4,error_message=$5,available_at=$6,lease_token=null,lease_until=null,metadata=metadata || $7::jsonb,updated_at=now() where id=$1 and lease_token=$2",
    [
      job.id,
      job.lease_token,
      error ? (retry ? "retry" : "failed") : "completed",
      error?.code || null,
      error?.message || null,
      new Date(retry ? error.retryAt : Date.now()),
      { superseded },
    ],
  );
}

export async function retryJobs(projectId) {
  const result = await vectorPool().query(
    "update content.embedding_jobs set status='queued',attempts=0,available_at=now(),error_code=null,error_message=null,updated_at=now() where project_id=$1 and status in ('failed','retry') and deleted_at is null",
    [projectId],
  );
  return { retried: result.rowCount };
}

export async function reserveRequest(
  projectId,
  ingestion = false,
  existingClient = null,
) {
  const settings = await getSettings(projectId, existingClient || vectorPool());
  const reserveWindow = async (client) => {
    await client.query(
      "select pg_advisory_xact_lock(hashtext('geiger_gemini_embedding_quota'))",
    );
    await client.query(
      "delete from content.embedding_usage where (period='minute' and bucket<to_char(now()-interval '2 days','YYYY-MM-DD HH24:MI')) or (period='day' and bucket<to_char(now()-interval '30 days','YYYY-MM-DD'))",
    );
    await capacityGuard(client);
    const { rows: state } = await client.query(
      "select blocked_until,error_code from content.provider_state where model=$1",
      [MODEL],
    );
    if (state[0]?.blocked_until > new Date())
      throw new ProviderError(
        state[0].error_code || "rate_limited",
        "Gemini quota is temporarily exhausted. Try again after the retry time.",
        429,
        state[0].blocked_until.getTime(),
      );
    const {
      rows: [clock],
    } = await client.query(
      "select to_char(now() at time zone 'America/Los_Angeles','YYYY-MM-DD') as day, to_char(now() at time zone 'UTC','YYYY-MM-DD HH24:MI') as minute",
    );
    const daily = integer(process.env.GEMINI_DAILY_LIMIT, 1, 1000000, 1000);
    const minute = integer(process.env.GEMINI_RPM_LIMIT, 1, 100000, 60);
    const reserve = integer(
      process.env.GEMINI_QUERY_RESERVE,
      0,
      daily - 1,
      Math.min(200, Math.floor(daily * 0.2)),
    );
    const windows = [
      ["global", "day", clock.day, ingestion ? daily - reserve : daily],
      ["global", "minute", clock.minute, minute],
    ];
    if (ingestion)
      windows.push([
        projectId,
        "day",
        clock.day,
        Math.min(settings.ingestionDailyLimit, daily - reserve),
      ]);
    for (const [scope, period, bucket, limit] of windows) {
      const { rows } = await client.query(
        "select requests from content.embedding_usage where scope=$1 and period=$2 and bucket=$3",
        [scope, period, bucket],
      );
      if (Number(rows[0]?.requests || 0) >= limit)
        throw new ProviderError(
          period === "day" ? "daily_budget_reached" : "rate_limited",
          period === "day"
            ? "The configured daily request budget is reached."
            : "The configured per-minute request budget is reached.",
          429,
          period === "day" ? nextPacificReset().getTime() : Date.now() + 60000,
        );
    }
    for (const [scope, period, bucket] of windows)
      await client.query(
        "insert into content.embedding_usage(scope,period,bucket,requests) values($1,$2,$3,1) on conflict(scope,period,bucket) do update set requests=content.embedding_usage.requests+1",
        [scope, period, bucket],
      );
  };
  if (existingClient) await reserveWindow(existingClient);
  else await transaction(reserveWindow);
}

export async function recordProviderError(error) {
  if (
    error.status !== 429 ||
    !error.retryAt ||
    !["daily_quota_exhausted", "rate_limited"].includes(error.code)
  )
    return;
  await vectorPool().query(
    "insert into content.provider_state(model,blocked_until,error_code) values($1,$2,$3) on conflict(model) do update set blocked_until=greatest(content.provider_state.blocked_until,$2),error_code=$3,updated_at=now()",
    [MODEL, new Date(error.retryAt), error.code],
  );
}

export async function capacityGuard(client = vectorPool()) {
  const {
    rows: [size],
  } = await client.query(
    "select pg_database_size(current_database())::float8 as bytes",
  );
  const maximum = integer(
    process.env.VECTOR_STORAGE_BUDGET_BYTES,
    1000000,
    1000000000000,
    700000000,
  );
  if (size.bytes >= maximum)
    throw new VectorError(
      "storage_budget_reached",
      "The database storage budget is reached. Review capacity before indexing more content.",
      507,
    );
}

export async function projectCapacityGuard(
  projectId,
  client,
  replacing = false,
) {
  await capacityGuard(client);
  const settings = await getSettings(projectId, client);
  const {
    rows: [count],
  } = await client.query(
    "select ((select count(*) from content.vectors where project_id=$1)+(select count(*) from content.profile_vectors where project_id=$1)+(select count(*) from content.knowledge_vectors where project_id=$1))::int as n",
    [projectId],
  );
  if (!replacing && count.n >= settings.maxVectors)
    throw new VectorError(
      "vector_budget_reached",
      "The project vector limit is reached.",
      507,
    );
}

export async function assertLease(client, job) {
  const lease = await client.query(
    "select id from content.embedding_jobs where id=$1 and lease_token=$2 and status='processing' and lease_until>now() for update",
    [job.id, job.lease_token],
  );
  if (!lease.rowCount)
    throw new VectorError(
      "lease_lost",
      "This job no longer owns its processing lease.",
      409,
    );
  if (job.source_kind !== "profile") return;
  const newer = await client.query(
    "select 1 from content.embedding_jobs where project_id=$1 and source_kind=$2 and source_id=$3 and created_at>(select created_at from content.embedding_jobs where id=$4) and status<>'failed' and deleted_at is null limit 1",
    [job.project_id, job.source_kind, job.source_id, job.id],
  );
  if (newer.rowCount)
    throw new VectorError(
      "stale_source",
      "A newer source job superseded this revision.",
      409,
    );
}

export async function withProfileLock(projectId, profileId, operation) {
  return transaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      `${projectId}:profile:${profileId}`,
    ]);
    return operation(client);
  });
}

export async function eraseProfile(client, projectId, profileId) {
  await client.query(
    "delete from content.profile_vectors where project_id=$1 and profile_id=$2",
    [projectId, profileId],
  );
  await client.query(
    "delete from content.knowledge_vectors where project_id=$1 and profile_id=$2",
    [projectId, profileId],
  );
  await client.query(
    "update content.embedding_jobs set deleted_at=now() where project_id=$1 and source_kind='profile' and source_id=$2 and status in ('completed','failed')",
    [projectId, profileId],
  );
}

export async function pruneDerivedData() {
  await transaction(async (client) => {
    await client.query(
      "select pg_advisory_xact_lock(hashtext('geiger_vector_capacity'))",
    );
    await client.query(
      "update content.embedding_jobs set status='completed',error_code=null,error_message=null,metadata=metadata || '{\"superseded\":true}'::jsonb,updated_at=now() where status='failed' and error_code='stale_source'",
    );
    await client.query(
      "delete from content.query_vectors where expires_at<now()",
    );
    await client.query(
      "delete from content.vectors where deleted_at<now()-interval '1 day' or (not active and updated_at<now()-interval '7 days')",
    );
    for (const table of ["profile_vectors", "knowledge_vectors"])
      await client.query(
        `delete from content.${table} where deleted_at is not null`,
      );
    await client.query(
      "delete from content.embedding_jobs j where status in ('completed','failed') and updated_at<now()-interval '30 days' and (source_kind<>'profile' or deleted_at is not null or status='failed' or exists(select 1 from content.embedding_jobs newer where newer.project_id=j.project_id and newer.source_kind='profile' and newer.source_id=j.source_id and newer.status='completed' and newer.created_at>j.created_at))",
    );
    await client.query(
      "delete from content.embedding_usage where (period='minute' and bucket<to_char(now()-interval '2 days','YYYY-MM-DD HH24:MI')) or (period='day' and bucket<to_char(now()-interval '30 days','YYYY-MM-DD'))",
    );
  });
}

export async function discardRevision(job) {
  await vectorPool().query(
    "update content.vectors set active=false,deleted_at=now() where project_id=$1 and source_kind=$2 and source_id=$3 and revision=$4 and not active",
    [job.project_id, job.source_kind, job.source_id, job.revision],
  );
}

export async function stagedChunks(job) {
  const { rows } = await vectorPool().query(
    "select chunk_index,embedding::text from content.vectors where project_id=$1 and source_kind=$2 and source_id=$3 and revision=$4 and deleted_at is null",
    [job.project_id, job.source_kind, job.source_id, job.revision],
  );
  return new Map(
    rows.map((row) => [row.chunk_index, JSON.parse(row.embedding)]),
  );
}

export async function reusableChunks(job) {
  const { rows } = await vectorPool().query(
    "select metadata->>'chunkHash' as hash,embedding::text from content.vectors where project_id=$1 and source_kind=$2 and source_id=$3 and model=$4 and preprocessing=$5 and metadata ? 'chunkHash' order by active desc,updated_at desc",
    [job.project_id, job.source_kind, job.source_id, MODEL, PREPROCESSING],
  );
  const chunks = new Map();
  for (const row of rows) if (!chunks.has(row.hash)) chunks.set(row.hash, JSON.parse(row.embedding));
  return chunks;
}

export async function stageChunk(job, chunkIndex, embedding, metadata) {
  await transaction(async (client) => {
    await client.query(
      "select pg_advisory_xact_lock(hashtext('geiger_vector_capacity'))",
    );
    const existing = await client.query(
      "select 1 from content.vectors where project_id=$1 and source_kind=$2 and source_id=$3 and revision=$4 and chunk_index=$5",
      [
        job.project_id,
        job.source_kind,
        job.source_id,
        job.revision,
        chunkIndex,
      ],
    );
    await projectCapacityGuard(job.project_id, client, existing.rowCount > 0);
    await client.query(
      "insert into content.vectors(project_id,source_kind,source_id,revision,chunk_index,embedding,metadata,model,preprocessing) values($1,$2,$3,$4,$5,$6::vector,$7,$8,$9) on conflict(project_id,source_kind,source_id,revision,chunk_index) do update set embedding=$6::vector,metadata=$7,model=$8,preprocessing=$9,deleted_at=null,updated_at=now()",
      [
        job.project_id,
        job.source_kind,
        job.source_id,
        job.revision,
        chunkIndex,
        encoded(embedding),
        metadata,
        MODEL,
        PREPROCESSING,
      ],
    );
  });
}

export async function activateSource(job, chunks, verify = async () => {}) {
  await transaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      `${job.project_id}:${job.source_kind}:${job.source_id}`,
    ]);
    await assertLease(client, job);
    await verify();
    const {
      rows: [count],
    } = await client.query(
      "select count(*)::int as n from content.vectors where project_id=$1 and source_kind=$2 and source_id=$3 and revision=$4 and deleted_at is null",
      [job.project_id, job.source_kind, job.source_id, job.revision],
    );
    if (count.n !== chunks)
      throw new VectorError(
        "incomplete_revision",
        "Embedding revision is incomplete.",
        409,
      );
    await client.query(
      "update content.vectors set active=false,deleted_at=now(),updated_at=now() where project_id=$1 and source_kind=$2 and source_id=$3 and revision<>$4 and deleted_at is null",
      [job.project_id, job.source_kind, job.source_id, job.revision],
    );
    await client.query(
      "update content.vectors set active=true,updated_at=now() where project_id=$1 and source_kind=$2 and source_id=$3 and revision=$4 and deleted_at is null",
      [job.project_id, job.source_kind, job.source_id, job.revision],
    );
  });
}

export async function retireSource(projectId, kind, sourceId) {
  await vectorPool().query(
    "update content.vectors set active=false,deleted_at=now(),updated_at=now() where project_id=$1 and source_kind=$2 and source_id=$3 and deleted_at is null",
    [projectId, kind, sourceId],
  );
}

export async function nearest(
  projectId,
  embedding,
  kind = "all",
  exclude = null,
) {
  return transaction(async (client) => {
    await client.query("set local hnsw.iterative_scan = 'strict_order'");
    await client.query("set local hnsw.ef_search = 100");
    const { rows } = await client.query(
      `select source_kind,source_id,chunk_index,metadata,1-(embedding <=> $2::vector) as score
      from content.vectors where project_id=$1 and active and deleted_at is null and model=$3 and preprocessing=any($4::text[])
      and ($5='all' or source_kind=$5) and ($6::uuid is null or source_id<>$6)
      order by embedding <=> $2::vector limit 100`,
      [projectId, encoded(embedding), MODEL, READABLE_PREPROCESSING, kind, exclude],
    );
    return rows;
  });
}

export async function projectStatus(projectId) {
  const pool = vectorPool();
  const settings = await getSettings(projectId);
  settings.checkedAt = new Date().toISOString();
  const [sources, jobs, totals, usage, state, extension] = await Promise.all([
    pool.query(
      "select source_kind,source_id,revision,count(*)::int as chunks,max(updated_at) as updated_at, max(metadata->>'title') as title from content.vectors where project_id=$1 and active and deleted_at is null group by source_kind,source_id,revision order by max(updated_at) desc limit 100",
      [projectId],
    ),
    pool.query(
      "select id,source_kind,source_id,status,attempts,error_code,error_message,available_at,updated_at from content.embedding_jobs where project_id=$1 and deleted_at is null order by updated_at desc limit 30",
      [projectId],
    ),
    pool.query(
      "select (select count(*) from content.vectors where project_id=$1 and active and deleted_at is null)::int as content_vectors,(select count(*) from content.profile_vectors where project_id=$1 and deleted_at is null)::int as profile_vectors,(select count(*) from content.knowledge_vectors where project_id=$1 and deleted_at is null)::int as knowledge_vectors,pg_database_size(current_database())::float8 as database_bytes,(select coalesce(sum(pg_total_relation_size(oid)),0) from pg_class where relnamespace='content'::regnamespace and relkind='r')::float8 as table_bytes",
      [projectId],
    ),
    pool.query(
      "select requests from content.embedding_usage where scope='global' and period='day' and bucket=to_char(now() at time zone 'America/Los_Angeles','YYYY-MM-DD')",
    ),
    pool.query(
      "select blocked_until,error_code from content.provider_state where model=$1",
      [MODEL],
    ),
    pool.query("select extversion from pg_extension where extname='vector'"),
  ]);
  return {
    settings,
    model: MODEL,
    dimensions: DIMENSIONS,
    providerConfigured: Boolean(process.env.GEMINI_API_KEY),
    databaseConfigured: true,
    extension: extension.rows[0]?.extversion,
    sources: sources.rows.map((row) => ({
      sourceKind: row.source_kind,
      sourceId: row.source_id,
      title: row.title,
      chunks: row.chunks,
      updatedAt: row.updated_at,
    })),
    jobs: jobs.rows.map((row) => ({
      id: row.id,
      sourceKind: row.source_kind,
      sourceId: row.source_id,
      status: row.status,
      attempts: row.attempts,
      errorCode: row.error_code,
      error: row.error_message,
      retryAt: row.available_at,
      updatedAt: row.updated_at,
    })),
    totals: {
      contentVectors: totals.rows[0].content_vectors,
      profileVectors: totals.rows[0].profile_vectors,
      knowledgeVectors: totals.rows[0].knowledge_vectors,
      databaseBytes: totals.rows[0].database_bytes,
      tableBytes: totals.rows[0].table_bytes,
    },
    quota: {
      used: usage.rows[0]?.requests || 0,
      dailyLimit: integer(process.env.GEMINI_DAILY_LIMIT, 1, 1000000, 1000),
      rpmLimit: integer(process.env.GEMINI_RPM_LIMIT, 1, 100000, 60),
      blockedUntil: state.rows[0]?.blocked_until,
      errorCode: state.rows[0]?.error_code,
      resetAt: nextPacificReset(),
    },
  };
}
