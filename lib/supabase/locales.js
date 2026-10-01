"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for locales + entry versions. Owns `content.locales`
// (code unique per project, label, fallback_code, is_default) and reads
// `content.entry_versions` (entry_id, version, payload jsonb, published_at).
// Pure: validate, console.error on failure, return null / false — never throw,
// never toast. DB snake_case; UI camelCase, mapped at this boundary.
//
// Localization model: per-locale variants are separate `content.entries` rows
// sharing a slug root — the entries table keeps its single-column PK, so no
// (entry_id, locale) composite exists. Locales here are the enabled-locale
// registry; the Localization screen derives per-locale coverage from entries.

const LOCALES_TABLE = "locales";
const VERSIONS_TABLE = "entry_versions";

export function normalizeLocale(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    code: row.code ?? "",
    label: row.label ?? "",
    fallbackCode: row.fallback_code ?? "",
    isDefault: Boolean(row.is_default),
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function localeToRow(input) {
  const row = {};
  const map = {
    code: "code",
    label: "label",
    fallbackCode: "fallback_code",
    isDefault: "is_default",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

export async function listLocales(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(LOCALES_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("code", { ascending: true });
    if (error) {
      console.error("[locales.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeLocale);
  } catch (e) {
    console.error("[locales.list]", e);
    return null;
  }
}

export async function createLocale(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const payload = localeToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(LOCALES_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[locales.create]", error.message);
      return null;
    }
    return normalizeLocale(data);
  } catch (e) {
    console.error("[locales.create]", e);
    return null;
  }
}

export async function updateLocale(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(LOCALES_TABLE)
      .update(localeToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[locales.update]", error.message);
      return null;
    }
    return normalizeLocale(data);
  } catch (e) {
    console.error("[locales.update]", e);
    return null;
  }
}

export async function softDeleteLocale(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(LOCALES_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[locales.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[locales.delete]", e);
    return false;
  }
}

export function normalizeVersion(row) {
  if (!row) return null;
  return {
    id: row.id,
    entryId: row.entry_id ?? null,
    version: Number(row.version ?? 1),
    payload: row.payload && typeof row.payload === "object" ? row.payload : {},
    publishedAt: row.published_at ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
  };
}

export async function listVersionsByEntry(entryId) {
  if (!entryId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(VERSIONS_TABLE)
      .select("*")
      .eq("entry_id", entryId)
      .is("deleted_at", null)
      .order("version", { ascending: false });
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

export async function createVersion(input) {
  if (!isSupabaseConfigured()) return null;
  if (!input?.entryId) {
    console.error("[versions.create] entryId required");
    return null;
  }
  try {
    const sb = contentClient();
    const payload = {
      entry_id: input.entryId,
      version: input.version ?? 1,
      payload: input.payload || {},
    };
    if (input.publishedAt) payload.published_at = input.publishedAt;
    if (input.createdBy) payload.created_by = input.createdBy;
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(VERSIONS_TABLE)
      .insert(payload)
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
