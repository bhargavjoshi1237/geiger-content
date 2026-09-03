import { createClient } from "./client";
import { isSupabaseConfigured } from "./config";

// Data-access layer for Content Slots. Owns `content.slots` (named delivery
// locations resolving to eligible entries + a fallback). Pure: validate,
// console.error on failure, return null / false — never throw, never toast.
// DB snake_case; UI camelCase, mapped at this boundary.

const TABLE = "slots";

export function normalizeSlot(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    key: row.key ?? "",
    name: row.name ?? "Untitled slot",
    description: row.description ?? "",
    status: row.status ?? "Active",
    fallbackEntryId: row.fallback_entry_id ?? null,
    eligibleEntryIds: Array.isArray(meta.eligible_entry_ids)
      ? meta.eligible_entry_ids
      : [],
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

function toRow(input) {
  const row = {};
  const map = {
    key: "key",
    name: "name",
    description: "description",
    status: "status",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("fallbackEntryId" in input)
    row.fallback_entry_id = input.fallbackEntryId || null;
  return row;
}

export async function listSlots(projectId) {
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
      console.error("[slots.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeSlot);
  } catch (e) {
    console.error("[slots.list]", e);
    return null;
  }
}

export async function getSlot(id) {
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
      console.error("[slots.get]", error.message);
      return null;
    }
    return normalizeSlot(data);
  } catch (e) {
    console.error("[slots.get]", e);
    return null;
  }
}

export async function createSlot(input) {
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
      console.error("[slots.create]", error.message);
      return null;
    }
    return normalizeSlot(data);
  } catch (e) {
    console.error("[slots.create]", e);
    return null;
  }
}

export async function updateSlot(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = createClient().schema("content");
    const payload = toRow(patch);
    // Eligible entries live in the metadata expansion bag until promoted.
    if ("eligibleEntryIds" in patch) {
      payload.metadata = { eligible_entry_ids: patch.eligibleEntryIds || [] };
    }
    const { data, error } = await sb
      .from(TABLE)
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[slots.update]", error.message);
      return null;
    }
    return normalizeSlot(data);
  } catch (e) {
    console.error("[slots.update]", e);
    return null;
  }
}

export async function softDeleteSlot(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = createClient().schema("content");
    const { error } = await sb
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[slots.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[slots.delete]", e);
    return false;
  }
}
