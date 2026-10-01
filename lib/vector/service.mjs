import * as repo from "./repository.mjs";
import { vectorPool } from "./connection.mjs";
import {
  MODEL,
  READABLE_PREPROCESSING,
  normalizeVector,
  filterCandidates,
  journeyCandidates,
} from "./core.mjs";
import { VectorError, isUuid } from "./auth.mjs";
import { queryEmbedding, syncSources, runWorker, profileRevision } from "./ingestion.mjs";
import {
  ownProfile,
  adminClient,
  personalizationAllowed,
  hydratedCandidates,
  sourceRevision,
} from "./sources.mjs";

export { syncSources, runWorker };

export async function search(ctx, input = {}) {
  const kind = ["all", "entry", "asset"].includes(input.kind)
    ? input.kind
    : "all";
  const limit = Math.min(30, Math.max(1, Number(input.limit) || 12));
  let embedding,
    exclude = null;
  if (input.referenceId) {
    if (!isUuid(input.referenceId))
      throw new VectorError(
        "invalid_reference",
        "Choose a valid reference source.",
      );
    const referenceKind = input.referenceKind === "asset" ? "asset" : "entry";
    const visible = await hydratedCandidates(ctx, [
      { source_kind: referenceKind, source_id: input.referenceId, score: 1 },
    ], [], { includeTopics: false });
    if (!visible.length)
      throw new VectorError(
        "reference_unavailable",
        "The reference must be an eligible source in this project.",
        404,
      );
    const { rows } = await vectorPool().query(
      "select embedding::text from content.vectors where project_id=$1 and source_kind=$2 and source_id=$3 and active and deleted_at is null and model=$4 and preprocessing=any($5::text[]) order by chunk_index",
      [ctx.projectId, referenceKind, input.referenceId, MODEL, READABLE_PREPROCESSING],
    );
    if (!rows.length)
      throw new VectorError(
        "reference_not_indexed",
        "Index the reference source before using semantic similarity.",
        409,
      );
    const sum = Array(768).fill(0);
    for (const row of rows)
      JSON.parse(row.embedding).forEach((value, i) => {
        sum[i] += value;
      });
    embedding = normalizeVector(sum);
    exclude = input.referenceId;
  } else embedding = await queryEmbedding(ctx, input.query);
  if (!embedding) return { results: [], method: "semantic" };
  const candidates = await repo.nearest(
    ctx.projectId,
    embedding,
    kind,
    exclude,
  );
  const { data: rules, error } = await ctx.content
    .from("ranking_rules")
    .select("*")
    .eq("project_id", ctx.projectId)
    .is("deleted_at", null);
  if (error)
    throw new VectorError(
      "rules_unavailable",
      "Could not load editorial ranking rules.",
      503,
    );
  const results = await hydratedCandidates(ctx, candidates, rules || [], { limit });
  return { results, method: "semantic", model: MODEL };
}

export async function status(ctx) {
  const result = await repo.projectStatus(ctx.projectId);
  const visible = await hydratedCandidates(
    ctx,
    result.sources.map((row) => ({
      source_kind: row.sourceKind,
      source_id: row.sourceId,
      score: 1,
    })),
    [],
    { includeTopics: false },
  );
  const allowed = new Set(
    visible.map((row) => `${row.sourceKind}:${row.sourceId}`),
  );
  result.sources = result.sources.filter((row) =>
    allowed.has(`${row.sourceKind}:${row.sourceId}`),
  );
  return result;
}

export async function settings(ctx, input) {
  return repo.saveSettings(ctx.projectId, input, ctx.user.id);
}

export async function startIndexing(ctx) {
  const current = await repo.getSettings(ctx.projectId);
  await repo.saveSettings(
    ctx.projectId,
    { ...current, enabled: true },
    ctx.user.id,
  );
  return syncSources(ctx.projectId);
}

export async function audience(ctx) {
  const profile = await ownProfile(ctx);
  if (!profile)
    return {
      profileId: null,
      consent: "pending",
      interests: [],
      knowledge: [],
    };
  const allowed = await personalizationAllowed(adminClient(), profile.id);
  const { data: knowledge, error } = await ctx.content
    .from("profile_knowledge")
    .select("id,title,body,topic_label,evidence,kind,confidence,updated_at")
    .eq("project_id", ctx.projectId)
    .eq("owner_id", ctx.user.id)
    .eq("profile_id", profile.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error)
    throw new VectorError(
      "knowledge_unavailable",
      "Could not load your knowledge records.",
      503,
    );
  const { rows } = allowed
    ? await vectorPool().query(
        "select topic_label,metadata,updated_at from content.profile_vectors where project_id=$1 and profile_id=$2 and deleted_at is null",
        [ctx.projectId, profile.id],
      )
    : { rows: [] };
  return {
    profileId: profile.id,
    consent: allowed ? "granted" : "denied",
    interests: rows.map((row) => ({
      topic: row.topic_label || "All interests",
      signals: row.metadata.signals,
      updatedAt: row.updated_at,
    })),
    knowledge: (knowledge || []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      topic: row.topic_label,
      evidence: row.evidence,
      kind: row.kind,
      confidence: Number(row.confidence),
      updatedAt: row.updated_at,
    })),
  };
}

export async function updateAudience(ctx, input = {}) {
  const admin = adminClient(),
    profile = await ownProfile(ctx, true),
    sb = admin.schema("content");
  if (input.consent !== undefined) {
    if (!["granted", "denied"].includes(input.consent))
      throw new VectorError(
        "invalid_consent",
        "Choose whether to allow personalization.",
      );
    await repo.withProfileLock(ctx.projectId, profile.id, async (client) => {
      const result = await sb.from("consent_state").upsert(
        {
          profile_id: profile.id,
          purpose: "personalization",
          status: input.consent,
        },
        { onConflict: "profile_id,purpose" },
      );
      if (result.error)
        throw new VectorError(
          "consent_unavailable",
          "Could not save personalization consent.",
          503,
        );
      if (input.consent === "denied")
        await repo.eraseProfile(client, ctx.projectId, profile.id);
    });
  }
  if (input.action === "refresh" || input.consent === "granted") {
    if (!(await personalizationAllowed(admin, profile.id)))
      throw new VectorError(
        "consent_required",
        "Enable personalization before refreshing your interests.",
        403,
      );
    const config = await repo.getSettings(ctx.projectId);
    if (!config.enabled)
      throw new VectorError(
        "indexing_disabled",
        "Enable library indexing before refreshing your interests.",
        409,
      );
    await repo.enqueue(
      ctx.projectId,
      "profile",
      profile.id,
      await profileRevision(ctx.projectId, profile, config, admin),
      { forceRefresh: true },
    );
    const notes = await sb
      .from("profile_knowledge")
      .select("*")
      .eq("project_id", ctx.projectId)
      .eq("profile_id", profile.id)
      .eq("owner_id", ctx.user.id)
      .is("deleted_at", null)
      .limit(100);
    if (notes.error)
      throw new VectorError(
        "knowledge_unavailable",
        "Could not refresh your knowledge records.",
        503,
      );
    for (const note of notes.data || [])
      await repo.enqueue(
        ctx.projectId,
        "knowledge",
        note.id,
        sourceRevision("knowledge", note),
      );
  }
  return audience(ctx);
}

export async function saveKnowledge(ctx, input = {}) {
  const profile = await ownProfile(ctx, true),
    admin = adminClient();
  const title = String(input.title || "").trim(),
    body = String(input.body || "").trim();
  if (!title || !body || title.length > 200 || Buffer.byteLength(body) > 6000)
    throw new VectorError(
      "invalid_knowledge",
      "Add a title and a knowledge note below 6,000 bytes.",
    );
  if (input.id && !isUuid(input.id))
    throw new VectorError("invalid_knowledge", "Invalid knowledge record.");
  const sb = ctx.content;
  const fields = {
    project_id: ctx.projectId,
    profile_id: profile.id,
    owner_id: ctx.user.id,
    title,
    body,
    topic_label: String(input.topic || "").slice(0, 100),
    evidence: String(input.evidence || "").slice(0, 1500),
    kind: "self_declared",
    created_by: ctx.user.id,
  };
  let result;
  if (input.id)
    result = await sb
      .from("profile_knowledge")
      .update(fields)
      .eq("id", input.id)
      .eq("owner_id", ctx.user.id)
      .eq("project_id", ctx.projectId)
      .is("deleted_at", null)
      .select("*")
      .single();
  else {
    const count = await sb
      .from("profile_knowledge")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ctx.user.id)
      .eq("project_id", ctx.projectId)
      .is("deleted_at", null);
    if (count.error || count.count >= 100)
      throw new VectorError(
        "knowledge_limit",
        "Keep at most 100 active knowledge records per project.",
        409,
      );
    result = await sb
      .from("profile_knowledge")
      .insert(fields)
      .select("*")
      .single();
  }
  if (result.error)
    throw new VectorError(
      "knowledge_save_failed",
      "Could not save the knowledge record.",
      503,
    );
  if (await personalizationAllowed(admin, profile.id))
    await repo.enqueue(
      ctx.projectId,
      "knowledge",
      result.data.id,
      sourceRevision("knowledge", result.data),
    );
  return { id: result.data.id };
}

export async function removeKnowledge(ctx, id) {
  if (!isUuid(id))
    throw new VectorError(
      "invalid_knowledge",
      "Choose a valid knowledge record.",
    );
  const profile = await ownProfile(ctx);
  if (!profile)
    throw new VectorError(
      "profile_unavailable",
      "Your audience profile is unavailable.",
      404,
    );
  await repo.withProfileLock(ctx.projectId, profile.id, async (client) => {
    const result = await ctx.content
      .from("profile_knowledge")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("project_id", ctx.projectId)
      .eq("owner_id", ctx.user.id)
      .select("id")
      .maybeSingle();
    if (result.error || !result.data)
      throw new VectorError(
        "knowledge_unavailable",
        "The knowledge record could not be removed.",
        404,
      );
    await client.query(
      "delete from content.knowledge_vectors where project_id=$1 and owner_id=$2 and source_id=$3",
      [ctx.projectId, ctx.user.id, id],
    );
  });
  return { removed: true };
}

export async function personalized(ctx, input = {}) {
  const admin = adminClient(),
    profile = await ownProfile(ctx);
  if (!profile || !(await personalizationAllowed(admin, profile.id)))
    throw new VectorError(
      "consent_required",
      "Enable personalization to request interest-based recommendations.",
      403,
    );
  const { rows } = await vectorPool().query(
    "select embedding::text,metadata from content.profile_vectors where project_id=$1 and profile_id=$2 and purpose='interest' and topic_label=$3 and model=$4 and preprocessing=any($5::text[]) and deleted_at is null",
    [
      ctx.projectId,
      profile.id,
      String(input.topic || "").slice(0, 100),
      MODEL,
      READABLE_PREPROCESSING,
    ],
  );
  if (!rows[0])
    return {
      results: [],
      reason:
        "No interest vector yet. Engage with indexed content and refresh your interests.",
    };
  const candidates = await repo.nearest(
    ctx.projectId,
    JSON.parse(rows[0].embedding),
    input.kind === "asset" ? "asset" : "all",
  );
  const ruleResult = await ctx.content
    .from("ranking_rules")
    .select("*")
    .eq("project_id", ctx.projectId)
    .is("deleted_at", null);
  const stageResult = await ctx.content
    .from("topic_stages")
    .select("topic_label,stage")
    .eq("project_id", ctx.projectId)
    .eq("profile_id", profile.id)
    .is("deleted_at", null);
  if (ruleResult.error || stageResult.error)
    throw new VectorError(
      "rules_unavailable",
      "Could not verify recommendation rules and journey stages.",
      503,
    );
  const results = journeyCandidates(
    filterCandidates(
      await hydratedCandidates(ctx, candidates),
      ruleResult.data || [],
      rows[0].metadata.excluded || [],
    ),
    stageResult.data || [],
  );
  if (!(await personalizationAllowed(admin, profile.id)))
    throw new VectorError(
      "consent_required",
      "Personalization consent has changed.",
      403,
    );
  return {
    results: results.slice(0, 12).map((row) => ({
      ...row,
      reason: "Similar to content you engaged with",
    })),
    method: "interest",
  };
}

export async function trackActivity(ctx, input = {}) {
  if (
    !isUuid(input.sourceId) ||
    !isUuid(input.eventId) ||
    !["entry", "asset"].includes(input.sourceKind) ||
    !["like", "save", "click", "dismiss", "not_interested"].includes(input.type)
  )
    throw new VectorError(
      "invalid_activity",
      "Choose a valid source and interaction.",
    );
  const admin = adminClient(),
    profile = await ownProfile(ctx, true);
  if (!(await personalizationAllowed(admin, profile.id)))
    throw new VectorError(
      "consent_required",
      "Enable personalization in Embeddings before recording personal interests.",
      403,
    );
  const visible = await hydratedCandidates(ctx, [
    { source_kind: input.sourceKind, source_id: input.sourceId, score: 1 },
  ], [], { includeTopics: false });
  if (!visible.length)
    throw new VectorError(
      "source_unavailable",
      "This source is not available in your project.",
      404,
    );
  const result = await admin
    .schema("content")
    .from("events")
    .upsert(
      {
        id: input.eventId,
        project_id: ctx.projectId,
        user_id: ctx.user.id,
        entry_id: input.sourceKind === "entry" ? input.sourceId : null,
        type: input.type,
        context: {
          profileId: profile.id,
          ...(input.sourceKind === "asset" ? { assetId: input.sourceId } : {}),
        },
        created_by: ctx.user.id,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (result.error)
    throw new VectorError(
      "activity_unavailable",
      "Could not record this interaction.",
      503,
    );
  const config = await repo.getSettings(ctx.projectId);
  if (config.enabled && config.audienceEnabled)
    await repo.enqueue(
      ctx.projectId,
      "profile",
      profile.id,
      await profileRevision(ctx.projectId, profile, config, admin),
    );
  return { recorded: true };
}

export async function searchKnowledge(ctx, query) {
  const profile = await ownProfile(ctx);
  if (!profile || !(await personalizationAllowed(adminClient(), profile.id)))
    throw new VectorError(
      "consent_required",
      "Enable personalization to search your knowledge embeddings.",
      403,
    );
  const embedding = await queryEmbedding(ctx, query);
  const { rows } = await vectorPool().query(
    "select source_id,1-(embedding <=> $4::vector) as score from content.knowledge_vectors where project_id=$1 and owner_id=$2 and profile_id=$3 and deleted_at is null and model=$5 and preprocessing=any($6::text[]) order by embedding <=> $4::vector limit 20",
    [
      ctx.projectId,
      ctx.user.id,
      profile.id,
      JSON.stringify(embedding),
      MODEL,
      READABLE_PREPROCESSING,
    ],
  );
  if (!rows.length) return { results: [] };
  const { data, error } = await ctx.content
    .from("profile_knowledge")
    .select("id,title,body,topic_label,kind,confidence")
    .eq("project_id", ctx.projectId)
    .eq("owner_id", ctx.user.id)
    .in(
      "id",
      rows.map((row) => row.source_id),
    )
    .is("deleted_at", null);
  if (error)
    throw new VectorError(
      "knowledge_unavailable",
      "Could not verify knowledge result ownership.",
      503,
    );
  const latestProfile = await ownProfile(ctx);
  if (
    latestProfile?.id !== profile.id ||
    !(await personalizationAllowed(adminClient(), profile.id))
  )
    throw new VectorError(
      "consent_required",
      "Your profile or personalization consent changed.",
      403,
    );
  return {
    results: rows.flatMap((row) => {
      const record = data.find((item) => item.id === row.source_id);
      return record
        ? [
            {
              id: record.id,
              title: record.title,
              body: record.body,
              topic: record.topic_label,
              kind: record.kind,
              confidence: Number(record.confidence),
              score: Number(row.score),
            },
          ]
        : [];
    }),
  };
}
