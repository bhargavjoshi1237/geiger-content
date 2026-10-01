"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for external sources. Owns `content.external_sources`
// (name, type, url, status): named feeds/APIs content can be imported from.
// Pure: validate, console.error on failure, return null / false — never throw,
// never toast. DB snake_case; UI camelCase, mapped at this boundary.

const TABLE = "external_sources";

export function normalizeSource(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    name: row.name ?? "Untitled source",
    type: row.type ?? "API",
    url: row.url ?? "",
    status: row.status ?? "Disconnected",
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function toRow(input) {
  const row = {};
  const map = {
    name: "name",
    type: "type",
    url: "url",
    status: "status",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

export async function listSources(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) {
      console.error("[sources.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeSource);
  } catch (e) {
    console.error("[sources.list]", e);
    return null;
  }
}

export async function createSource(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const payload = toRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[sources.create]", error.message);
      return null;
    }
    return normalizeSource(data);
  } catch (e) {
    console.error("[sources.create]", e);
    return null;
  }
}

export async function updateSource(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TABLE)
      .update(toRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[sources.update]", error.message);
      return null;
    }
    return normalizeSource(data);
  } catch (e) {
    console.error("[sources.update]", e);
    return null;
  }
}

export async function softDeleteSource(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[sources.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[sources.delete]", e);
    return false;
  }
}
