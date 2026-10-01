import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for Data Connections. Owns `content.data_connections`
// (external sources feeding profiles/events: warehouse sync, CDP, CSV
// import…). Pure: validate, console.error on failure, return null / false —
// never throw, never toast. DB snake_case; UI camelCase, mapped at this
// boundary.

const TABLE = "data_connections";

export function normalizeConnection(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    name: row.name ?? "Untitled connection",
    type: row.type ?? "webhook",
    status: row.status ?? "Active",
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta, // expansion-bag keys surface as first-class fields
  };
}

function toRow(input) {
  const row = {};
  const map = {
    name: "name",
    type: "type",
    status: "status",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

export async function listConnections(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[connections.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeConnection);
  } catch (e) {
    console.error("[connections.list]", e);
    return null;
  }
}

export async function getConnection(id) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[connections.get]", error.message);
      return null;
    }
    return normalizeConnection(data);
  } catch (e) {
    console.error("[connections.get]", e);
    return null;
  }
}

export async function createConnection(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const payload = toRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[connections.create]", error.message);
      return null;
    }
    return normalizeConnection(data);
  } catch (e) {
    console.error("[connections.create]", e);
    return null;
  }
}

export async function updateConnection(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TABLE)
      .update(toRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[connections.update]", error.message);
      return null;
    }
    return normalizeConnection(data);
  } catch (e) {
    console.error("[connections.update]", e);
    return null;
  }
}

export async function softDeleteConnection(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    if (!sb) return false;
    const { error } = await sb
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[connections.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[connections.delete]", e);
    return false;
  }
}
