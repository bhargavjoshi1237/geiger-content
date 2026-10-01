"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for delivery environments. Owns `content.environments`
// (named targets like production/staging that scope content.entries via
// environment_id). Pure: validate, console.error on failure, return
// null / false — never throw, never toast. DB snake_case; UI camelCase.

const TABLE = "environments";

export function normalizeEnvironment(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    key: row.key ?? "",
    name: row.name ?? "Untitled environment",
    isDefault: row.is_default ?? false,
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
    key: "key",
    name: "name",
    isDefault: "is_default",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

export async function listEnvironments(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[environments.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeEnvironment);
  } catch (e) {
    console.error("[environments.list]", e);
    return null;
  }
}

export async function getEnvironment(id) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[environments.get]", error.message);
      return null;
    }
    return normalizeEnvironment(data);
  } catch (e) {
    console.error("[environments.get]", e);
    return null;
  }
}

export async function createEnvironment(input) {
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
      console.error("[environments.create]", error.message);
      return null;
    }
    return normalizeEnvironment(data);
  } catch (e) {
    console.error("[environments.create]", e);
    return null;
  }
}

export async function updateEnvironment(id, patch) {
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
      console.error("[environments.update]", error.message);
      return null;
    }
    return normalizeEnvironment(data);
  } catch (e) {
    console.error("[environments.update]", e);
    return null;
  }
}

export async function softDeleteEnvironment(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[environments.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[environments.delete]", e);
    return false;
  }
}

// The project's default environment (the one unscoped reads fall back to),
// or null when none is flagged.
export async function getDefaultEnvironment(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .eq("is_default", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[environments.getDefault]", error.message);
      return null;
    }
    return normalizeEnvironment(data);
  } catch (e) {
    console.error("[environments.getDefault]", e);
    return null;
  }
}

// Returns the default environment, creating a `production` one when the
// project has none yet. Null when the DB is absent or the write fails.
export async function ensureDefaultEnvironment(projectId, userId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  const existing = await getDefaultEnvironment(projectId);
  if (existing) return existing;
  const rows = await listEnvironments(projectId);
  if (rows && rows.length > 0) {
    const promoted = await updateEnvironment(rows[0].id, { isDefault: true });
    return promoted;
  }
  return createEnvironment({
    key: "production",
    name: "Production",
    isDefault: true,
    projectId,
    createdBy: userId ?? null,
  });
}

// Marks one environment the default, clearing the flag on the rest of the
// project's environments. Returns the updated row, or null on failure.
export async function setDefaultEnvironment(projectId, id) {
  if (!projectId || !id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { error: clearError } = await sb
      .from(TABLE)
      .update({ is_default: false })
      .eq("project_id", projectId)
      .is("deleted_at", null);
    if (clearError) {
      console.error("[environments.setDefault]", clearError.message);
      return null;
    }
    return updateEnvironment(id, { isDefault: true });
  } catch (e) {
    console.error("[environments.setDefault]", e);
    return null;
  }
}
