"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for entry references. Owns `content.entry_references`
// (from_entry FK, to_entry FK, field_key) with forward (outgoing) and reverse
// (incoming) lookups. Pure: validate, console.error on failure, return
// null / false — never throw, never toast. DB snake_case; UI camelCase.

const TABLE = "entry_references";

export function normalizeReference(row) {
  if (!row) return null;
  return {
    id: row.id,
    fromEntryId: row.from_entry_id ?? null,
    toEntryId: row.to_entry_id ?? null,
    fieldKey: row.field_key ?? "",
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

function toRow(input) {
  const row = {};
  const map = {
    fromEntryId: "from_entry_id",
    toEntryId: "to_entry_id",
    fieldKey: "field_key",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

async function listBy(column, entryId, tag) {
  if (!entryId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq(column, entryId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(tag, error.message);
      return null;
    }
    return (data || []).map(normalizeReference);
  } catch (e) {
    console.error(tag, e);
    return null;
  }
}

// Outgoing links: entries this entry points to.
export async function listReferencesFrom(entryId) {
  return listBy("from_entry_id", entryId, "[references.from]");
}

// Incoming links: entries pointing at this entry (reverse lookup).
export async function listReferencesTo(entryId) {
  return listBy("to_entry_id", entryId, "[references.to]");
}

export async function createReference(input) {
  if (!isSupabaseConfigured()) return null;
  if (!input?.fromEntryId || !input?.toEntryId) {
    console.error("[references.create] fromEntryId and toEntryId required");
    return null;
  }
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
      console.error("[references.create]", error.message);
      return null;
    }
    return normalizeReference(data);
  } catch (e) {
    console.error("[references.create]", e);
    return null;
  }
}

export async function softDeleteReference(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[references.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[references.delete]", e);
    return false;
  }
}
