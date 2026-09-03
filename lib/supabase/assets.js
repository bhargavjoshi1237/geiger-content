import { createClient } from "./client";
import { isSupabaseConfigured } from "./config";

// Data-access layer for Assets. Owns `content.assets` (the media library).
// Pure: validate, console.error on failure, return null / false — never throw,
// never toast. DB snake_case; UI camelCase, mapped at this boundary.

const TABLE = "assets";

export function normalizeAsset(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    name: row.name ?? "Untitled asset",
    folder: row.folder ?? "",
    fileType: row.file_type ?? "other",
    mime: row.mime ?? "",
    sizeBytes: Number(row.size_bytes ?? 0),
    url: row.url ?? "",
    alt: row.alt ?? "",
    status: row.status ?? "Ready",
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
    folder: "folder",
    fileType: "file_type",
    mime: "mime",
    url: "url",
    alt: "alt",
    status: "status",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("sizeBytes" in input) row.size_bytes = Number(input.sizeBytes) || 0;
  return row;
}

export async function listAssets(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = createClient().schema("content");
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[assets.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeAsset);
  } catch (e) {
    console.error("[assets.list]", e);
    return null;
  }
}

export async function getAsset(id) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = createClient().schema("content");
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[assets.get]", error.message);
      return null;
    }
    return normalizeAsset(data);
  } catch (e) {
    console.error("[assets.get]", e);
    return null;
  }
}

export async function createAsset(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = createClient().schema("content");
    const payload = toRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[assets.create]", error.message);
      return null;
    }
    return normalizeAsset(data);
  } catch (e) {
    console.error("[assets.create]", e);
    return null;
  }
}

export async function updateAsset(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = createClient().schema("content");
    const { data, error } = await sb
      .from(TABLE)
      .update(toRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[assets.update]", error.message);
      return null;
    }
    return normalizeAsset(data);
  } catch (e) {
    console.error("[assets.update]", e);
    return null;
  }
}

export async function softDeleteAsset(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = createClient().schema("content");
    const { error } = await sb
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[assets.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[assets.delete]", e);
    return false;
  }
}
