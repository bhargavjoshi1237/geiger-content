"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for structured content modeling. Owns
// `content.content_types` (key unique, name, icon) + `content.fields`
// (type_id FK, key, label, data_type, validation jsonb, localized, position).
// Pure: validate, console.error on failure, return null / false — never throw,
// never toast. DB snake_case; UI camelCase, mapped at this boundary.

const TYPES_TABLE = "content_types";
const FIELDS_TABLE = "fields";

export function normalizeContentType(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    key: row.key ?? "",
    name: row.name ?? "Untitled type",
    icon: row.icon ?? "",
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function typeToRow(input) {
  const row = {};
  const map = {
    key: "key",
    name: "name",
    icon: "icon",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

export function normalizeField(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    typeId: row.type_id ?? null,
    key: row.key ?? "",
    label: row.label ?? "",
    dataType: row.data_type ?? "text",
    validation:
      row.validation && typeof row.validation === "object"
        ? row.validation
        : {},
    localized: Boolean(row.localized),
    position: Number(row.position ?? 0),
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function fieldToRow(input) {
  const row = {};
  const map = {
    typeId: "type_id",
    key: "key",
    label: "label",
    dataType: "data_type",
    localized: "localized",
    position: "position",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("validation" in input) row.validation = input.validation || {};
  return row;
}

export async function listContentTypes(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TYPES_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) {
      console.error("[types.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeContentType);
  } catch (e) {
    console.error("[types.list]", e);
    return null;
  }
}

export async function getContentType(id) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TYPES_TABLE)
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[types.get]", error.message);
      return null;
    }
    return normalizeContentType(data);
  } catch (e) {
    console.error("[types.get]", e);
    return null;
  }
}

export async function createContentType(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const payload = typeToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(TYPES_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[types.create]", error.message);
      return null;
    }
    return normalizeContentType(data);
  } catch (e) {
    console.error("[types.create]", e);
    return null;
  }
}

export async function updateContentType(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TYPES_TABLE)
      .update(typeToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[types.update]", error.message);
      return null;
    }
    return normalizeContentType(data);
  } catch (e) {
    console.error("[types.update]", e);
    return null;
  }
}

export async function softDeleteContentType(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(TYPES_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[types.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[types.delete]", e);
    return false;
  }
}

export async function listFieldsByType(typeId) {
  if (!typeId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(FIELDS_TABLE)
      .select("*")
      .eq("type_id", typeId)
      .is("deleted_at", null)
      .order("position", { ascending: true });
    if (error) {
      console.error("[types.fields.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeField);
  } catch (e) {
    console.error("[types.fields.list]", e);
    return null;
  }
}

export async function createField(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const payload = fieldToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(FIELDS_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[types.fields.create]", error.message);
      return null;
    }
    return normalizeField(data);
  } catch (e) {
    console.error("[types.fields.create]", e);
    return null;
  }
}

export async function updateField(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(FIELDS_TABLE)
      .update(fieldToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[types.fields.update]", error.message);
      return null;
    }
    return normalizeField(data);
  } catch (e) {
    console.error("[types.fields.update]", e);
    return null;
  }
}

export async function softDeleteField(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(FIELDS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[types.fields.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[types.fields.delete]", e);
    return false;
  }
}
