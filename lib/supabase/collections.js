import { createClient } from "./client";
import { isSupabaseConfigured } from "./config";

// Data-access layer for Collections. Owns `content.collections` and the
// `content.collection_items` junction (ordered entry membership). Pure:
// validate, console.error on failure, return null / false / [] — never throw,
// never toast. DB snake_case; UI camelCase, mapped at this boundary.

const TABLE = "collections";
const ITEMS_TABLE = "collection_items";

export function normalizeCollection(row, itemCount = null) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    name: row.name ?? "Untitled collection",
    slug: row.slug ?? "",
    description: row.description ?? "",
    status: row.status ?? "Draft",
    coverUrl: row.cover_url ?? "",
    itemCount: itemCount ?? row.item_count ?? 0,
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
    slug: "slug",
    description: "description",
    status: "status",
    coverUrl: "cover_url",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

export async function listCollections(projectId) {
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
      console.error("[collections.list]", error.message);
      return null;
    }
    const rows = data || [];
    if (rows.length === 0) return [];
    // Item counts in one extra query (small N; avoids an RPC for v1).
    const { data: items, error: itemsError } = await sb
      .from(ITEMS_TABLE)
      .select("collection_id")
      .in(
        "collection_id",
        rows.map((r) => r.id),
      );
    if (itemsError) {
      console.error("[collections.count]", itemsError.message);
      return rows.map((r) => normalizeCollection(r, 0));
    }
    const counts = new Map();
    for (const it of items || []) {
      counts.set(it.collection_id, (counts.get(it.collection_id) || 0) + 1);
    }
    return rows.map((r) => normalizeCollection(r, counts.get(r.id) || 0));
  } catch (e) {
    console.error("[collections.list]", e);
    return null;
  }
}

export async function getCollection(id) {
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
      console.error("[collections.get]", error.message);
      return null;
    }
    return normalizeCollection(data);
  } catch (e) {
    console.error("[collections.get]", e);
    return null;
  }
}

export async function createCollection(input) {
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
      console.error("[collections.create]", error.message);
      return null;
    }
    return normalizeCollection(data, 0);
  } catch (e) {
    console.error("[collections.create]", e);
    return null;
  }
}

export async function updateCollection(id, patch) {
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
      console.error("[collections.update]", error.message);
      return null;
    }
    return normalizeCollection(data);
  } catch (e) {
    console.error("[collections.update]", e);
    return null;
  }
}

export async function softDeleteCollection(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = createClient().schema("content");
    const { error } = await sb
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[collections.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[collections.delete]", e);
    return false;
  }
}

// --- Membership -----------------------------------------------------------

export async function listCollectionEntryIds(collectionId) {
  if (!collectionId || !isSupabaseConfigured()) return null;
  try {
    const sb = createClient().schema("content");
    const { data, error } = await sb
      .from(ITEMS_TABLE)
      .select("entry_id, position")
      .eq("collection_id", collectionId)
      .order("position", { ascending: true });
    if (error) {
      console.error("[collections.items]", error.message);
      return null;
    }
    return (data || []).map((r) => r.entry_id);
  } catch (e) {
    console.error("[collections.items]", e);
    return null;
  }
}

export async function addCollectionItem(collectionId, entryId) {
  if (!collectionId || !entryId || !isSupabaseConfigured()) return false;
  try {
    const sb = createClient().schema("content");
    const { data: existing } = await sb
      .from(ITEMS_TABLE)
      .select("position")
      .eq("collection_id", collectionId)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos =
      existing && existing.length ? (existing[0].position ?? 0) + 1 : 0;
    const { error } = await sb.from(ITEMS_TABLE).insert({
      collection_id: collectionId,
      entry_id: entryId,
      position: nextPos,
    });
    if (error) {
      // Already a member — treat as success so the UI stays idempotent.
      if (error.code === "23505") return true;
      console.error("[collections.add]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[collections.add]", e);
    return false;
  }
}

export async function removeCollectionItem(collectionId, entryId) {
  if (!collectionId || !entryId || !isSupabaseConfigured()) return false;
  try {
    const sb = createClient().schema("content");
    const { error } = await sb
      .from(ITEMS_TABLE)
      .delete()
      .eq("collection_id", collectionId)
      .eq("entry_id", entryId);
    if (error) {
      console.error("[collections.remove]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[collections.remove]", e);
    return false;
  }
}
