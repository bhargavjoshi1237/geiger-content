import sharp from "sharp";
import { vectorPool, transaction } from "./connection.mjs";
import {
  MODEL,
  PREPROCESSING,
  READABLE_PREPROCESSING,
  imageStoragePath,
  chunkText,
  extractEntryText,
  weightedInterest,
  fingerprint,
  chunkFingerprint,
} from "./core.mjs";
import { embedContent, ProviderError } from "./provider.mjs";
import { VectorError, isUuid } from "./auth.mjs";
import * as repo from "./repository.mjs";
import {
  SOURCE_TABLES,
  adminClient,
  sourceRevision,
  sourceEligible,
  getSource,
  personalizationAllowed,
  topicsOf,
  aggregateEligible,
  sourceTopics,
} from "./sources.mjs";

export async function syncSources(
  projectId,
  admin = adminClient(),
  deadline = Date.now() + 30000,
) {
  const settings = await repo.getSettings(projectId);
  if (!settings.enabled) return { queued: 0, scanned: 0 };
  await reconcileSources(projectId, settings, admin);
  let queued = 0,
    scanned = 0;
  const kinds = Object.entries(SOURCE_TABLES),
    rotation = (Number(settings.cursor.source_rotation) || 0) % kinds.length;
  await repo.updateCursor(
    projectId,
    "source_rotation",
    (rotation + 1) % kinds.length,
  );
  for (const [kind, table] of [
    ...kinds.slice(rotation),
    ...kinds.slice(0, rotation),
  ]) {
    if (Date.now() >= deadline) break;
    if (
      (kind === "entry" && !settings.indexText) ||
      (kind === "asset" && !settings.indexImages) ||
      (["profile", "knowledge"].includes(kind) && !settings.audienceEnabled)
    )
      continue;
    const offset = Number(settings.cursor[kind]) || 0;
    const { data, error } = await admin
      .schema("content")
      .from(table)
      .select("*")
      .eq("project_id", projectId)
      .order("id")
      .range(offset, offset + 24);
    if (error)
      throw new VectorError(
        "sync_unavailable",
        "Could not synchronize the source library.",
        503,
      );
    let visited = 0;
    for (const row of data || []) {
      if (Date.now() >= deadline) break;
      visited++;
      if (kind === "asset" && row.file_type !== "image") continue;
      if (
        kind === "profile" &&
        !(await personalizationAllowed(admin, row.id))
      ) {
        await invalidateProfile(projectId, row.id);
        continue;
      }
      const revision = kind === "profile"
        ? await profileRevision(projectId, row, settings, admin)
        : sourceRevision(kind, row, settings);
      queued += await repo.enqueue(projectId, kind, row.id, revision);
      scanned++;
    }
    await repo.updateCursor(
      projectId,
      kind,
      visited === (data || []).length && visited < 25 ? 0 : offset + visited,
    );
  }
  return { queued, scanned };
}

async function reconcileSources(projectId, settings, admin) {
  const pool = vectorPool();
  for (const kind of ["entry", "asset", "profile"]) {
    const key = `maintenance_${kind}`,
      offset = Number(settings.cursor[key]) || 0;
    const sql =
      kind === "profile"
        ? "select profile_id as source_id from (select profile_id from content.profile_vectors where project_id=$1 union select profile_id from content.knowledge_vectors where project_id=$1) profiles order by profile_id offset $2 limit 10"
        : "select distinct source_id from content.vectors where project_id=$1 and source_kind=$3 and active and deleted_at is null order by source_id offset $2 limit 10";
    const { rows } = await pool.query(
      sql,
      kind === "profile" ? [projectId, offset] : [projectId, offset, kind],
    );
    for (const item of rows) {
      const source = await getSource(admin, projectId, kind, item.source_id);
      if (kind === "profile") {
        if (
          !sourceEligible(kind, source) ||
          !(await personalizationAllowed(admin, item.source_id))
        )
          await invalidateProfile(projectId, item.source_id);
      } else if (!sourceEligible(kind, source))
        await repo.retireSource(projectId, kind, item.source_id);
    }
    await repo.updateCursor(projectId, key, rows.length < 10 ? 0 : offset + 10);
  }
}

async function embedding(projectId, input, ingestion = true) {
  if (!process.env.GEMINI_API_KEY)
    throw new ProviderError(
      "provider_unconfigured",
      "Add GEMINI_API_KEY to the server environment.",
    );
  await repo.reserveRequest(projectId, ingestion);
  try {
    return await embedContent(input);
  } catch (error) {
    await repo.recordProviderError(error);
    throw error;
  }
}

export async function queryEmbedding(ctx, query) {
  if (
    typeof query !== "string" ||
    !query.trim() ||
    Buffer.byteLength(query) > 6000
  )
    throw new VectorError(
      "invalid_query",
      "Enter a search query of at most 6,000 bytes.",
    );
  const key = fingerprint({
    query: query.trim(),
    model: MODEL,
    preprocessing: PREPROCESSING,
  });
  const pool = vectorPool();
  const { rows } = await pool.query(
    "select embedding::text from content.query_vectors where project_id=$1 and owner_id=$2 and cache_key=$3 and expires_at>now()",
    [ctx.projectId, ctx.user.id, key],
  );
  if (rows[0]) return JSON.parse(rows[0].embedding);
  const result = await embedding(
    ctx.projectId,
    { text: query.trim(), purpose: "query" },
    false,
  );
  await transaction(async (client) => {
    await client.query(
      "select pg_advisory_xact_lock(hashtext('geiger_vector_capacity'))",
    );
    await client.query(
      "delete from content.query_vectors where expires_at<now()",
    );
    await repo.capacityGuard(client);
    const count = await client.query(
      "select count(*)::int as n from content.query_vectors",
    );
    if (count.rows[0].n < 1000)
      await client.query(
        "insert into content.query_vectors(project_id,owner_id,cache_key,embedding,expires_at) values($1,$2,$3,$4::vector,now()+interval '7 days') on conflict(project_id,owner_id,cache_key) do update set embedding=$4::vector,expires_at=excluded.expires_at",
        [ctx.projectId, ctx.user.id, key, JSON.stringify(result)],
      );
  });
  return result;
}

async function imageInput(admin, row) {
  const path = imageStoragePath(
    row.url,
    row.project_id,
    row.id,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  if (Number(row.size_bytes) > 10 * 1024 * 1024)
    throw new VectorError(
      "image_too_large",
      "Image must be at most 10 MB for indexing.",
      422,
    );
  const { data, error } = await admin.storage
    .from("content")
    .createSignedUrl(path, 60);
  if (error || !data?.signedUrl)
    throw new VectorError(
      "image_unavailable",
      "Could not access the stored image.",
      503,
      Date.now() + 60000,
    );
  const signed = new URL(data.signedUrl),
    base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (signed.origin !== base.origin)
    throw new VectorError(
      "invalid_image_origin",
      "Image storage origin is not allowed.",
      422,
    );
  const response = await fetch(signed, {
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (
    !response.ok ||
    Number(response.headers.get("content-length")) > 10 * 1024 * 1024
  )
    throw new VectorError(
      "image_unavailable",
      "Could not download the stored image within the size limit.",
      422,
    );
  const reader = response.body.getReader(),
    buffers = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 10 * 1024 * 1024)
        throw new VectorError(
          "image_too_large",
          "Image exceeded the 10 MB download limit.",
          422,
        );
      buffers.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel();
  }
  try {
    const image = sharp(Buffer.concat(buffers), {
      limitInputPixels: 40000000,
      animated: false,
    });
    const metadata = await image.metadata();
    if (!["png", "jpeg", "webp", "avif", "heif"].includes(metadata.format))
      throw new Error("Unsupported image format");
    return {
      image: await image
        .rotate()
        .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer(),
      mime: "image/jpeg",
    };
  } catch {
    throw new VectorError(
      "unsupported_image",
      "Image could not be decoded as a supported static image.",
      422,
    );
  }
}

async function invalidateProfile(projectId, profileId) {
  await repo.withProfileLock(projectId, profileId, (client) =>
    repo.eraseProfile(client, projectId, profileId),
  );
}

export async function profileActivity(projectId, row, admin) {
  const ids = [
    ...new Set(
      [row.primary_identifier, ...(row.identifiers || [])].filter(
        (x) => typeof x === "string",
      ),
    ),
  ].slice(0, 20);
  const sb = admin.schema("content"),
    all = [];
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  for (const column of ["user_id", "anonymous_id"]) {
    if (!ids.length) continue;
    const { data, error } = await sb
      .from("events")
      .select("id,entry_id,type,at,context,created_by")
      .eq("project_id", projectId)
      .in(column, ids)
      .is("deleted_at", null)
      .gte("at", since)
      .order("at", { ascending: false })
      .limit(2500);
    if (error)
      throw new VectorError(
        "events_unavailable",
        "Could not aggregate profile activity.",
        503,
        Date.now() + 60000,
      );
    all.push(
      ...(data || []).filter(
        (event) =>
          event.created_by === row.primary_identifier &&
          event.context?.profileId === row.id,
      ),
    );
  }
  return [...new Map(all.map(event => [event.id, event])).values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function profileRevision(projectId, row, settings, admin = adminClient(), client = vectorPool()) {
  const activity = await profileActivity(projectId, row, admin);
  const sourceIds = [...new Set(activity.map(event => event.entry_id || event.context?.assetId).filter(isUuid))].sort().slice(0, 40);
  const { rows } = sourceIds.length
    ? await client.query(
      "select source_kind,source_id,revision,metadata from content.vectors where project_id=$1 and source_id=any($2::uuid[]) and active and deleted_at is null and model=$3 and preprocessing=any($4::text[]) and chunk_index=0 order by source_kind,source_id",
      [projectId, sourceIds, MODEL, READABLE_PREPROCESSING],
    ) : { rows: [] };
  const sources = new Map();
  for (const kind of ["entry", "asset"]) {
    const ids = rows.filter(vector => vector.source_kind === kind).map(vector => vector.source_id);
    if (!ids.length) continue;
    const { data, error } = await admin.schema("content").from(SOURCE_TABLES[kind])
      .select("*").eq("project_id", projectId).in("id", ids);
    if (error) throw new VectorError("source_unavailable", "Could not verify profile source freshness.", 503);
    for (const source of data || []) sources.set(`${kind}:${source.id}`, source);
  }
  const parentIds = [...new Set([...sources.entries()].filter(([key]) => key.startsWith("asset:")).map(([, source]) => source.metadata?.entry_id).filter(isUuid))];
  if (parentIds.length) {
    const { data, error } = await admin.schema("content").from("entries")
      .select("*").eq("project_id", projectId).in("id", parentIds);
    if (error) throw new VectorError("source_unavailable", "Could not verify profile image parents.", 503);
    for (const source of data || []) sources.set(`entry:${source.id}`, source);
  }
  const entryIds = [...new Set([...rows.filter(vector => vector.source_kind === "entry").map(vector => vector.source_id), ...parentIds])];
  const terms = new Map();
  if (entryIds.length) {
    const { data, error } = await admin.schema("content").from("entry_terms")
      .select("entry_id,terms(label,deleted_at,taxonomies(project_id,deleted_at))")
      .in("entry_id", entryIds).is("deleted_at", null).limit(entryIds.length * 100);
    if (error) throw new VectorError("topics_unavailable", "Could not verify profile topic freshness.", 503);
    for (const item of data || []) {
      const term = item.terms;
      if (!term?.label || term.deleted_at || term.taxonomies?.deleted_at || term.taxonomies?.project_id !== projectId) continue;
      if (!terms.has(item.entry_id)) terms.set(item.entry_id, []);
      terms.get(item.entry_id).push(term.label);
    }
  }
  return sourceRevision("profile", row, {
    ...settings,
    activity: activity.map(event => ({ id: event.id, type: event.type, at: event.at, sourceId: event.entry_id || event.context?.assetId })),
    sources: rows.map(vector => {
      const source = sources.get(`${vector.source_kind}:${vector.source_id}`);
      const parent = source?.metadata?.entry_id ? sources.get(`entry:${source.metadata.entry_id}`) : null;
      return { kind: vector.source_kind, id: vector.source_id, revision: vector.revision,
        content: source ? sourceRevision(vector.source_kind, source) : null,
        eligible: sourceEligible(vector.source_kind, source) && source?.metadata?.visibility !== "private",
        parent: source?.metadata?.entry_id ? { eligible: sourceEligible("entry", parent) && parent?.metadata?.visibility !== "private" } : null,
        topics: [...topicsOf(source || {}), ...(terms.get(vector.source_kind === "entry" ? vector.source_id : source?.metadata?.entry_id) || [])].sort(),
      };
    }),
  });
}

async function profileInterests(job, row, settings, admin, deadline) {
  if (
    !settings.audienceEnabled ||
    !sourceEligible("profile", row) ||
    !(await personalizationAllowed(admin, row.id))
  ) {
    await invalidateProfile(job.project_id, job.source_id);
    return;
  }
  const revision = await profileRevision(job.project_id, row, settings, admin);
  if (revision !== job.revision) {
    await repo.enqueue(job.project_id, "profile", row.id, revision);
    throw new VectorError("stale_source", "Profile activity or sources changed before indexing.", 409);
  }
  const all = await profileActivity(job.project_id, row, admin);
  const pool = vectorPool();
  const sourceIds = [
    ...new Set(all.map((e) => e.entry_id || e.context?.assetId).filter(isUuid)),
  ].sort().slice(0, 40);
  const { rows: vectors } = sourceIds.length
    ? await pool.query(
        "select source_id,source_kind,embedding::text,metadata from content.vectors where project_id=$1 and source_id=any($2::uuid[]) and active and deleted_at is null and model=$3 and preprocessing=any($4::text[]) and chunk_index=0",
        [job.project_id, sourceIds, MODEL, READABLE_PREPROCESSING],
      )
    : { rows: [] };
  const eligible = new Map();
  for (const vector of vectors) {
    if (Date.now() >= deadline)
      throw new VectorError(
        "worker_yield",
        "Interest refresh will continue in the next worker run.",
        503,
        Date.now() + 1000,
      );
    const source = await getSource(
      admin,
      job.project_id,
      vector.source_kind,
      vector.source_id,
    );
    if (
      await aggregateEligible(admin, job.project_id, vector.source_kind, source)
    ) {
      vector.metadata.topics = await sourceTopics(
        admin,
        job.project_id,
        vector.source_kind,
        source,
      );
      eligible.set(vector.source_id, vector);
    }
  }
  const events = all.map((event) => {
    const sourceId = event.entry_id || event.context?.assetId,
      vector = eligible.get(sourceId);
    return {
      id: event.id,
      sourceId,
      type: event.type,
      at: event.at,
      embedding: vector ? JSON.parse(vector.embedding) : null,
      topics: vector?.metadata.topics || [],
    };
  });
  const options = { halfLifeDays: settings.halfLifeDays };
  const global = weightedInterest(events, options);
  const topics = [...new Set(events.flatMap((e) => e.topics))]
    .map((topic) => ({
      topic,
      events: events.filter((e) => e.topics.includes(topic)),
    }))
    .sort((a, b) => b.events.length - a.events.length)
    .slice(0, settings.topicLimit);
  const groups = [
    { topic: "", result: global },
    ...topics.map((item) => ({
      topic: item.topic,
      result: weightedInterest(item.events, options),
    })),
  ];
  if (!(await personalizationAllowed(admin, row.id))) {
    await invalidateProfile(job.project_id, row.id);
    return;
  }
  await repo.withProfileLock(job.project_id, row.id, async (client) => {
    await repo.assertLease(client, job);
    const latest = await getSource(admin, job.project_id, "profile", row.id);
    if (
      !sourceEligible("profile", latest) ||
      fingerprint(latest) !== fingerprint(row) ||
      !(await personalizationAllowed(admin, row.id))
    ) {
      await repo.eraseProfile(client, job.project_id, row.id);
      return;
    }
    const currentRevision = await profileRevision(job.project_id, latest, settings, admin, client);
    if (currentRevision !== job.revision)
      throw new VectorError("stale_source", "Profile activity or sources changed during indexing.", 409);
    await client.query(
      "select pg_advisory_xact_lock(hashtext('geiger_vector_capacity'))",
    );
    await client.query(
      "update content.profile_vectors set deleted_at=now(),updated_at=now() where project_id=$1 and profile_id=$2 and deleted_at is null",
      [job.project_id, row.id],
    );
    for (const group of groups) {
      if (!group.result.embedding) continue;
      const existing = await client.query(
        "select 1 from content.profile_vectors where project_id=$1 and profile_id=$2 and purpose='interest' and topic_label=$3",
        [job.project_id, row.id, group.topic],
      );
      await repo.projectCapacityGuard(
        job.project_id,
        client,
        existing.rowCount > 0,
      );
      await client.query(
        "insert into content.profile_vectors(project_id,profile_id,topic_label,embedding,revision,metadata,model,preprocessing) values($1,$2,$3,$4::vector,$5,$6,$7,$8) on conflict(project_id,profile_id,purpose,topic_label) do update set embedding=$4::vector,revision=$5,metadata=$6,model=$7,preprocessing=$8,deleted_at=null,updated_at=now()",
        [
          job.project_id,
          row.id,
          group.topic,
          JSON.stringify(group.result.embedding),
          job.revision,
          { signals: group.result.signals, excluded: global.excluded },
          MODEL,
          PREPROCESSING,
        ],
      );
    }
  });
}

async function knowledgeEmbedding(job, row, admin) {
  const pool = vectorPool();
  if (
    !sourceEligible("knowledge", row) ||
    !(await personalizationAllowed(admin, row?.profile_id || job.source_id))
  ) {
    await pool.query(
      "update content.knowledge_vectors set deleted_at=now() where project_id=$1 and source_id=$2",
      [job.project_id, job.source_id],
    );
    return;
  }
  const profile = await getSource(
    admin,
    job.project_id,
    "profile",
    row.profile_id,
  );
  if (
    !profile ||
    profile.deleted_at ||
    profile.primary_identifier !== row.owner_id
  )
    throw new VectorError(
      "knowledge_owner_mismatch",
      "Knowledge source ownership could not be verified.",
      403,
    );
  if (sourceRevision("knowledge", row) !== job.revision) {
    await repo.enqueue(
      job.project_id,
      "knowledge",
      row.id,
      sourceRevision("knowledge", row),
    );
    throw new VectorError(
      "stale_source",
      "Knowledge changed before indexing.",
      409,
    );
  }
  if (Buffer.byteLength(row.body) > 6000)
    throw new VectorError(
      "knowledge_too_large",
      "Keep each knowledge item below 6,000 bytes.",
      422,
    );
  const result = await embedding(job.project_id, {
    title: row.title,
    text: row.body,
  });
  const latest = await getSource(admin, job.project_id, "knowledge", row.id);
  if (
    !sourceEligible("knowledge", latest) ||
    sourceRevision("knowledge", latest) !== job.revision ||
    !(await personalizationAllowed(admin, row.profile_id))
  )
    throw new VectorError(
      "stale_source",
      "The source or consent changed during indexing.",
      409,
    );
  await repo.withProfileLock(job.project_id, row.profile_id, async (client) => {
    await repo.assertLease(client, job);
    const [current, currentProfile] = await Promise.all([
      getSource(admin, job.project_id, "knowledge", row.id),
      getSource(admin, job.project_id, "profile", row.profile_id),
    ]);
    if (
      !sourceEligible("knowledge", current) ||
      sourceRevision("knowledge", current) !== job.revision ||
      !sourceEligible("profile", currentProfile) ||
      currentProfile.primary_identifier !== row.owner_id ||
      !(await personalizationAllowed(admin, row.profile_id))
    )
      throw new VectorError(
        "stale_source",
        "Knowledge source or consent changed during indexing.",
        409,
      );
    await client.query(
      "select pg_advisory_xact_lock(hashtext('geiger_vector_capacity'))",
    );
    const existing = await client.query(
      "select 1 from content.knowledge_vectors where project_id=$1 and owner_id=$2 and source_id=$3",
      [job.project_id, row.owner_id, row.id],
    );
    await repo.projectCapacityGuard(
      job.project_id,
      client,
      existing.rowCount > 0,
    );
    await client.query(
      "insert into content.knowledge_vectors(project_id,profile_id,owner_id,source_id,revision,embedding,metadata,model,preprocessing) values($1,$2,$3,$4,$5,$6::vector,$7,$8,$9) on conflict(project_id,owner_id,source_id) do update set embedding=$6::vector,revision=$5,metadata=$7,model=$8,preprocessing=$9,updated_at=now(),deleted_at=null",
      [
        job.project_id,
        row.profile_id,
        row.owner_id,
        row.id,
        job.revision,
        JSON.stringify(result),
        { topic: row.topic_label, kind: row.kind },
        MODEL,
        PREPROCESSING,
      ],
    );
  });
}

export async function processJob(
  job,
  admin = adminClient(),
  deadline = Date.now() + 45000,
) {
  const settings = await repo.getSettings(job.project_id);
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id")
    .eq("id", job.project_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (projectError || !project || !settings.enabled)
    throw new VectorError(
      "project_unavailable",
      "The source project is unavailable or indexing is disabled.",
      409,
    );
  const row = await getSource(
    admin,
    job.project_id,
    job.source_kind,
    job.source_id,
  );
  if (job.source_kind === "profile")
    return profileInterests(job, row, settings, admin, deadline);
  if (job.source_kind === "knowledge")
    return knowledgeEmbedding(job, row, admin);
  if (
    !sourceEligible(job.source_kind, row) ||
    (job.source_kind === "asset" && !settings.indexImages) ||
    (job.source_kind === "entry" && !settings.indexText)
  ) {
    await repo.retireSource(job.project_id, job.source_kind, job.source_id);
    return;
  }
  if (sourceRevision(job.source_kind, row) !== job.revision) {
    await repo.enqueue(
      job.project_id,
      job.source_kind,
      row.id,
      sourceRevision(job.source_kind, row),
    );
    throw new VectorError(
      "stale_source",
      "Source changed before processing.",
      409,
    );
  }
  const chunks =
    job.source_kind === "asset"
      ? [await imageInput(admin, row)]
      : chunkText(extractEntryText(row)).map((text) => ({
          text,
          title: row.title,
        }));
  if (!chunks.length) {
    await repo.retireSource(job.project_id, job.source_kind, row.id);
    return;
  }
  if (chunks.length > 64)
    throw new VectorError(
      "too_many_chunks",
      "Split this entry into smaller entries before indexing.",
      422,
    );
  const staged = await repo.stagedChunks(job);
  const reusable = await repo.reusableChunks(job);
  const topics = await sourceTopics(
    admin,
    job.project_id,
    job.source_kind,
    row,
  );
  for (let i = 0; i < chunks.length; i++) {
    if (staged.has(i)) continue;
    if (Date.now() > deadline)
      throw new VectorError(
        "worker_yield",
        "Indexing will continue in the next worker run.",
        503,
        Date.now() + 1000,
      );
    await repo.renewJob(job);
    const chunkHash = chunkFingerprint(chunks[i]);
    const result = reusable.get(chunkHash) || await embedding(job.project_id, chunks[i]);
    reusable.set(chunkHash, result);
    await repo.stageChunk(job, i, result, {
      title: row.title || row.name,
      topics,
      sourceUpdatedAt: row.updated_at,
      chunkHash,
    });
  }
  const latest = await getSource(
    admin,
    job.project_id,
    job.source_kind,
    row.id,
  );
  if (
    !sourceEligible(job.source_kind, latest) ||
    sourceRevision(job.source_kind, latest) !== job.revision
  ) {
    if (!sourceEligible(job.source_kind, latest))
      await repo.retireSource(job.project_id, job.source_kind, row.id);
    else await repo.discardRevision(job);
    if (latest)
      await repo.enqueue(
        job.project_id,
        job.source_kind,
        row.id,
        sourceRevision(job.source_kind, latest),
      );
    throw new VectorError(
      "stale_source",
      "Source changed during indexing.",
      409,
    );
  }
  await repo.activateSource(job, chunks.length, async () => {
    const current = await getSource(
      admin,
      job.project_id,
      job.source_kind,
      row.id,
    );
    if (
      !sourceEligible(job.source_kind, current) ||
      sourceRevision(job.source_kind, current) !== job.revision
    )
      throw new VectorError(
        "stale_source",
        "Source changed before activation.",
        409,
      );
  });
}

export async function runWorker({
  projectId = null,
  limit = 3,
  sync = true,
} = {}) {
  const admin = adminClient(),
    pool = vectorPool();
  const deadline = Date.now() + 25000,
    syncDeadline = Date.now() + 10000;
  await repo.pruneDerivedData();
  let queued = 0;
  if (sync) {
    const { rows } = await pool.query(
      "select project_id from content.vector_settings where deleted_at is null and config->>'enabled'='true' and ($1::uuid is null or project_id=$1) order by updated_at limit 20",
      [projectId],
    );
    for (const project of rows) {
      if (Date.now() >= syncDeadline) break;
      const { data, error } = await admin
        .from("projects")
        .select("id")
        .eq("id", project.project_id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error)
        throw new VectorError(
          "project_unavailable",
          "Could not verify source project.",
          503,
        );
      if (data)
        queued += (await syncSources(project.project_id, admin, syncDeadline))
          .queued;
    }
  }
  let completed = 0,
    failed = 0,
    deferred = 0;
  for (let i = 0; i < Math.min(5, limit) && Date.now() < deadline; i++) {
    const job = await repo.claimJob(projectId);
    if (!job) break;
    try {
      await processJob(job, admin, deadline);
      await repo.finishJob(job);
      completed++;
    } catch (error) {
      const known =
        error instanceof ProviderError || error instanceof VectorError;
      const safe = known
        ? error
        : new VectorError(
            "worker_failed",
            "Background indexing failed. Retry the job after checking the source.",
            503,
            Date.now() + Math.min(3600000, 60000 * Math.pow(2, job.attempts)),
          );
      if (safe.code === "provider_unconfigured")
        safe.retryAt = Date.now() + 3600000;
      await repo.finishJob(job, safe);
      if (safe.code === "stale_source") completed++;
      else if (safe.retryAt) {
        deferred++;
      } else failed++;
      if (safe.status === 429 || safe.code === "provider_unconfigured") break;
    }
  }
  return { queued, completed, failed, deferred };
}
