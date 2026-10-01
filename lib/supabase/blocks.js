"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for reusable blocks. Owns `content.blocks`
// (key, name, schema jsonb) + `content.block_instances`
// (block_id FK, entry_id FK, position, data jsonb).
// Pure: validate, console.error on failure, return null / false — never throw,
// never toast. DB snake_case; UI camelCase, mapped at this boundary.

const BLOCKS_TABLE = "blocks";
const INSTANCES_TABLE = "block_instances";

export function normalizeBlock(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    key: row.key ?? "",
    name: row.name ?? "Untitled block",
    schema: row.schema && typeof row.schema === "object" ? row.schema : {},
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function blockToRow(input) {
  const row = {};
  const map = {
    key: "key",
    name: "name",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("schema" in input) row.schema = input.schema || {};
  return row;
}

export function normalizeBlockInstance(row) {
  if (!row) return null;
  return {
    id: row.id,
    blockId: row.block_id ?? null,
    entryId: row.entry_id ?? null,
    position: Number(row.position ?? 0),
    data: row.data && typeof row.data === "object" ? row.data : {},
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

function instanceToRow(input) {
  const row = {};
  const map = {
    blockId: "block_id",
    entryId: "entry_id",
    position: "position",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("data" in input) row.data = input.data || {};
  return row;
}

export async function listBlocks(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(BLOCKS_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) {
      console.error("[blocks.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeBlock);
  } catch (e) {
    console.error("[blocks.list]", e);
    return null;
  }
}

export async function createBlock(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const payload = blockToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(BLOCKS_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[blocks.create]", error.message);
      return null;
    }
    return normalizeBlock(data);
  } catch (e) {
    console.error("[blocks.create]", e);
    return null;
  }
}

export async function updateBlock(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(BLOCKS_TABLE)
      .update(blockToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[blocks.update]", error.message);
      return null;
    }
    return normalizeBlock(data);
  } catch (e) {
    console.error("[blocks.update]", e);
    return null;
  }
}

export async function softDeleteBlock(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(BLOCKS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[blocks.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[blocks.delete]", e);
    return false;
  }
}

export async function listInstancesByEntry(entryId) {
  if (!entryId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(INSTANCES_TABLE)
      .select("*")
      .eq("entry_id", entryId)
      .is("deleted_at", null)
      .order("position", { ascending: true });
    if (error) {
      console.error("[blocks.instances.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeBlockInstance);
  } catch (e) {
    console.error("[blocks.instances.list]", e);
    return null;
  }
}

export async function createInstance(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const payload = instanceToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(INSTANCES_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[blocks.instances.create]", error.message);
      return null;
    }
    return normalizeBlockInstance(data);
  } catch (e) {
    console.error("[blocks.instances.create]", e);
    return null;
  }
}

export async function updateInstance(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(INSTANCES_TABLE)
      .update(instanceToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[blocks.instances.update]", error.message);
      return null;
    }
    return normalizeBlockInstance(data);
  } catch (e) {
    console.error("[blocks.instances.update]", e);
    return null;
  }
}

export async function softDeleteInstance(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(INSTANCES_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[blocks.instances.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[blocks.instances.delete]", e);
    return false;
  }
}
