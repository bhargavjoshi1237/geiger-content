import { createClient } from "@supabase/supabase-js";
import { VectorError, isUuid } from "./auth.mjs";
import {
  fingerprint,
  MODEL,
  PREPROCESSING,
  imageStoragePath,
  extractEntryText,
} from "./core.mjs";

export const SOURCE_TABLES = {
  entry: "entries",
  asset: "assets",
  profile: "profiles",
  knowledge: "profile_knowledge",
};

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new VectorError(
      "source_unconfigured",
      "The server Supabase connection is not configured.",
      503,
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function sourceRevision(kind, row, settings = {}) {
  const content = kind === "entry"
    ? { title: String(row.title ?? "none").slice(0, 200), text: extractEntryText(row) }
    : kind === "asset"
      ? { identity: row.url, bytes: row.size_bytes, hash: row.metadata?.content_hash || row.metadata?.sha256 || row.metadata?.etag || null }
      : kind === "knowledge"
        ? { title: String(row.title ?? "none").slice(0, 200), text: row.body }
        : { identifiers: [row.primary_identifier, ...(row.identifiers || [])].sort(), activity: settings.activity || [], sources: settings.sources || [], halfLife: settings.halfLifeDays, topics: settings.topicLimit };
  return fingerprint({
    kind,
    content,
    model: MODEL,
    preprocessing: PREPROCESSING,
  });
}

export function topicsOf(row) {
  const topics = row.metadata?.topics || row.metadata?.tags || [];
  return [
    ...new Set(
      (Array.isArray(topics) ? topics : [])
        .filter((x) => typeof x === "string" && x.trim())
        .map((x) => x.trim().slice(0, 100)),
    ),
  ].slice(0, 10);
}

export function sourceEligible(kind, row) {
  if (!row || row.deleted_at) return false;
  if (kind === "entry") return row.status === "Published";
  if (kind === "asset")
    return row.file_type === "image" && row.status === "Ready";
  return true;
}

export async function aggregateEligible(admin, projectId, kind, row) {
  if (!sourceEligible(kind, row) || row.metadata?.visibility === "private")
    return false;
  if (kind === "asset") {
    try {
      imageStoragePath(
        row.url,
        projectId,
        row.id,
        process.env.NEXT_PUBLIC_SUPABASE_URL,
      );
    } catch {
      return false;
    }
    if (row.metadata?.entry_id) {
      if (!isUuid(row.metadata.entry_id)) return false;
      const parent = await getSource(
        admin,
        projectId,
        "entry",
        row.metadata.entry_id,
      );
      if (
        !sourceEligible("entry", parent) ||
        parent.metadata?.visibility === "private"
      )
        return false;
    }
  }
  return true;
}

export async function sourceTopics(client, projectId, kind, row) {
  const entryId = kind === "entry" ? row.id : row.metadata?.entry_id;
  const topics = topicsOf(row);
  if (!isUuid(entryId)) return topics;
  const sb = client.schema ? client.schema("content") : client;
  const { data, error } = await sb
    .from("entry_terms")
    .select("terms(label,deleted_at,taxonomies(project_id,deleted_at))")
    .eq("entry_id", entryId)
    .is("deleted_at", null)
    .limit(100);
  if (error)
    throw new VectorError(
      "topics_unavailable",
      "Could not load source topics.",
      503,
    );
  for (const item of data || []) {
    const term = item.terms;
    if (
      term &&
      !term.deleted_at &&
      term.taxonomies?.project_id === projectId &&
      !term.taxonomies.deleted_at &&
      term.label
    )
      topics.push(term.label);
  }
  return [...new Set(topics)].slice(0, 10);
}

export async function getSource(admin, projectId, kind, sourceId) {
  const table = SOURCE_TABLES[kind];
  if (!table)
    throw new VectorError("invalid_source", "Unsupported embedding source.");
  const { data, error } = await admin
    .schema("content")
    .from(table)
    .select("*")
    .eq("project_id", projectId)
    .eq("id", sourceId)
    .maybeSingle();
  if (error)
    throw new VectorError(
      "source_unavailable",
      "Could not load the embedding source.",
      503,
      Date.now() + 60000,
    );
  return data;
}

export async function personalizationAllowed(admin, profileId) {
  const { data, error } = await admin
    .schema("content")
    .from("consent_state")
    .select("status")
    .eq("profile_id", profileId)
    .eq("purpose", "personalization")
    .maybeSingle();
  if (error)
    throw new VectorError(
      "consent_unavailable",
      "Could not verify personalization consent.",
      503,
      Date.now() + 60000,
    );
  return data?.status === "granted";
}

export async function ownProfile(ctx, create = false) {
  const sb = adminClient().schema("content");
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("project_id", ctx.projectId)
    .eq("primary_identifier", ctx.user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error)
    throw new VectorError(
      "profile_unavailable",
      "Could not resolve your audience profile.",
      503,
    );
  if (data || !create) return data;
  const result = await sb
    .from("profiles")
    .insert({
      project_id: ctx.projectId,
      primary_identifier: ctx.user.id,
      identifiers: [ctx.user.id],
      created_by: ctx.user.id,
    })
    .select("*")
    .single();
  if (result.error)
    throw new VectorError(
      "profile_unavailable",
      "Could not create your audience profile.",
      503,
    );
  return result.data;
}

export async function hydratedCandidates(ctx, candidates, rules = [], options = {}) {
  const sb = ctx.content;
  const entries = [
    ...new Set(
      candidates
        .filter((x) => x.source_kind === "entry")
        .map((x) => x.source_id),
    ),
  ];
  const assets = [
    ...new Set(
      candidates
        .filter((x) => x.source_kind === "asset")
        .map((x) => x.source_id),
    ),
  ];
  const records = new Map();
  for (const [kind, ids, table, projection] of [
    ["entry", entries, "entries", "id,project_id,title,slug,type,status,excerpt,metadata,created_by,created_at,updated_at,deleted_at"],
    ["asset", assets, "assets", "id,project_id,name,file_type,mime,status,alt,url,metadata,created_by,created_at,updated_at,deleted_at"],
  ]) {
    if (!ids.length) continue;
    if (kind === "asset") {
      const allow = await ctx.content.rpc("rbac_allows", {
        p_permission: "content.asset.view",
        p_project: ctx.projectId,
      });
      if (allow.error || allow.data !== true) continue;
    }
    const result = await sb
      .from(table)
      .select(projection)
      .eq("project_id", ctx.projectId)
      .in("id", ids)
      .is("deleted_at", null);
    if (result.error)
      throw new VectorError(
        "source_unavailable",
        "Could not verify search result visibility.",
        503,
      );
    for (const row of result.data || []) {
      if (
        !sourceEligible(kind, row) ||
        (row.metadata?.visibility === "private" &&
          row.created_by !== ctx.user.id)
      )
        continue;
      if (kind === "asset") {
        try {
          imageStoragePath(
            row.url,
            ctx.projectId,
            row.id,
            process.env.NEXT_PUBLIC_SUPABASE_URL,
          );
        } catch {
          continue;
        }
        if (row.metadata?.entry_id && !isUuid(row.metadata.entry_id)) continue;
      }
      records.set(`${kind}:${row.id}`, row);
    }
  }
  const parents = [
    ...new Set(
      [...records.entries()]
        .filter(
          ([key, row]) => key.startsWith("asset:") && row.metadata?.entry_id,
        )
        .map(([, row]) => row.metadata.entry_id),
    ),
  ];
  if (parents.length) {
    const { data, error } = await sb
      .from("entries")
      .select("id,status,created_by,metadata")
      .eq("project_id", ctx.projectId)
      .in("id", parents)
      .is("deleted_at", null);
    if (error)
      throw new VectorError(
        "source_unavailable",
        "Could not verify image publication state.",
        503,
      );
    const allowed = new Set(
      (data || [])
        .filter(
          (row) =>
            row.status === "Published" &&
            (row.metadata?.visibility !== "private" ||
              row.created_by === ctx.user.id),
        )
        .map((row) => row.id),
    );
    for (const [key, row] of records)
      if (
        key.startsWith("asset:") &&
        row.metadata?.entry_id &&
        !allowed.has(row.metadata.entry_id)
      )
        records.delete(key);
  }
  const best = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.source_kind}:${candidate.source_id}`,
      row = records.get(key);
    if (!row || (best.get(key)?.score ?? -Infinity) >= candidate.score)
      continue;
    best.set(key, {
      sourceKind: candidate.source_kind,
      parentEntryId: row.metadata?.entry_id || null,
      sourceId: row.id,
      title: row.title || row.name || "Untitled",
      excerpt: row.excerpt || row.alt || "",
      url: row.url || "",
      score: Number(candidate.score),
      topics: topicsOf(row),
      targetStages: Array.isArray(row.metadata?.journey_stages)
        ? row.metadata.journey_stages
        : [],
      difficulty: row.metadata?.difficulty || null,
      entry:
        candidate.source_kind === "entry"
          ? {
              id: row.id,
              title: row.title,
              slug: row.slug,
              type: row.type,
              status: row.status,
              excerpt: row.excerpt,
              createdAt: row.created_at,
            }
          : null,
    });
  }
  const { filterCandidates } = await import("./core.mjs");
  const ranked = filterCandidates([...best.values()], rules).slice(0, options.limit || best.size);
  if (options.includeTopics === false) return ranked;
  const entryIds = [...new Set(ranked.map(row => row.sourceKind === "entry" ? row.sourceId : row.parentEntryId).filter(isUuid))];
  if (!entryIds.length) return ranked;
  const { data, error } = await sb.from("entry_terms")
    .select("entry_id,terms(label,deleted_at,taxonomies(project_id,deleted_at))")
    .in("entry_id", entryIds).is("deleted_at", null).limit(entryIds.length * 100);
  if (error) throw new VectorError("topics_unavailable", "Could not load source topics.", 503);
  const terms = new Map();
  for (const item of data || []) {
    const term = item.terms;
    if (!term?.label || term.deleted_at || term.taxonomies?.deleted_at || term.taxonomies?.project_id !== ctx.projectId) continue;
    if (!terms.has(item.entry_id)) terms.set(item.entry_id, []);
    terms.get(item.entry_id).push(term.label);
  }
  return ranked.map(row => ({ ...row, topics: [...new Set([...row.topics, ...(terms.get(row.sourceKind === "entry" ? row.sourceId : row.parentEntryId) || [])])].slice(0, 10) }));
}
