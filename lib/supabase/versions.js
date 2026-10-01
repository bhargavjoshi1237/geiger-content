"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for entry versions. Owns `content.entry_versions`
// (immutable publish snapshots backing Version History and Compare &
// Rollback). Pure: validate, console.error on failure, return null / [] /
// false — never throw, never toast. DB snake_case; UI camelCase.

const TABLE = "entry_versions";

export function normalizeVersion(row) {
  if (!row) return null;
  return {
    id: row.id,
    entryId: row.entry_id ?? null,
    version: row.version ?? 1,
    payload: row.payload && typeof row.payload === "object" ? row.payload : {},
    publishedAt: row.published_at ?? null,
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

// Every snapshot of an entry, oldest first.
export async function listVersions(entryId) {
  if (!entryId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("entry_id", entryId)
      .is("deleted_at", null)
      .order("version", { ascending: true });
    if (error) {
      console.error("[versions.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeVersion);
  } catch (e) {
    console.error("[versions.list]", e);
    return null;
  }
}

// Recent snapshots across entries (for the Publishing History screen).
export async function listRecentVersions(projectId, limit = 50) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[versions.recent]", error.message);
      return null;
    }
    return (data || []).map(normalizeVersion);
  } catch (e) {
    console.error("[versions.recent]", e);
    return null;
  }
}

// Appends a snapshot for an entry, numbering it one past the latest version.
export async function createVersion(entryId, payload, opts = {}) {
  if (!entryId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const existing = await listVersions(entryId);
    const next = (existing || []).reduce((m, v) => Math.max(m, v.version), 0) + 1;
    const row = {
      entry_id: entryId,
      version: next,
      payload: payload || {},
    };
    if (opts.projectId) row.project_id = opts.projectId;
    if (opts.publishedAt) row.published_at = opts.publishedAt;
    if (opts.createdBy) row.created_by = opts.createdBy;
    const { data, error } = await sb
      .from(TABLE)
      .insert(row)
      .select("*")
      .single();
    if (error) {
      console.error("[versions.create]", error.message);
      return null;
    }
    return normalizeVersion(data);
  } catch (e) {
    console.error("[versions.create]", e);
    return null;
  }
}

// Restores an entry's editable columns from a snapshot. Applies the payload
// as a Draft (never auto-publishes) and returns the updated entry.
export async function rollbackTo(entryId, versionId) {
  if (!entryId || !versionId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data: snap, error: snapError } = await sb
      .from(TABLE)
      .select("*")
      .eq("id", versionId)
      .eq("entry_id", entryId)
      .is("deleted_at", null)
      .maybeSingle();
    if (snapError || !snap) {
      console.error("[versions.rollback]", snapError?.message || "missing snapshot");
      return null;
    }
    const payload =
      snap.payload && typeof snap.payload === "object" ? snap.payload : {};
    // The snapshot stores snake_case entry columns; map them back onto the
    // camelCase entries update path. Restores as a Draft, never published.
    const camel = { status: "Draft" };
    const fieldMap = {
      title: "title",
      slug: "slug",
      type: "type",
      excerpt: "excerpt",
      body: "body",
      author: "author",
      locale: "locale",
      cover_url: "coverUrl",
    };
    for (const [col, key] of Object.entries(fieldMap)) {
      if (col in payload) camel[key] = payload[col];
    }
    const { updateContent } = await import("./content");
    return updateContent(entryId, camel);
  } catch (e) {
    console.error("[versions.rollback]", e);
    return null;
  }
}
