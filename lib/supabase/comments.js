"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for editorial comments. Owns `content.comments`
// (entry_id FK, field_key, thread_id, body, mentions text[], resolved).
// Threads group replies by thread_id; resolving marks every reply resolved.
// Pure: validate, console.error on failure, return null / false — never throw,
// never toast. DB snake_case; UI camelCase, mapped at this boundary.

const TABLE = "comments";

export function normalizeComment(row) {
  if (!row) return null;
  return {
    id: row.id,
    entryId: row.entry_id ?? null,
    fieldKey: row.field_key ?? "",
    threadId: row.thread_id ?? "",
    body: row.body ?? "",
    mentions: Array.isArray(row.mentions) ? row.mentions : [],
    resolved: Boolean(row.resolved),
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

function toRow(input) {
  const row = {};
  const map = {
    entryId: "entry_id",
    fieldKey: "field_key",
    threadId: "thread_id",
    body: "body",
    resolved: "resolved",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("mentions" in input)
    row.mentions = Array.isArray(input.mentions) ? input.mentions : [];
  return row;
}

export async function listComments(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[comments.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeComment);
  } catch (e) {
    console.error("[comments.list]", e);
    return null;
  }
}

export async function listThreadsByEntry(entryId) {
  if (!entryId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("entry_id", entryId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[comments.threads]", error.message);
      return null;
    }
    return (data || []).map(normalizeComment);
  } catch (e) {
    console.error("[comments.threads]", e);
    return null;
  }
}

export async function createComment(input) {
  if (!isSupabaseConfigured()) return null;
  if (!input?.entryId || !input?.body?.trim()) {
    console.error("[comments.create] entryId and body required");
    return null;
  }
  try {
    const sb = contentClient();
    const payload = toRow({
      ...input,
      threadId: input.threadId || input.id || undefined,
    });
    if (input.id) payload.id = input.id;
    // A fresh top-level comment opens its own thread keyed by its id.
    if (!payload.thread_id) payload.thread_id = payload.id;
    const { data, error } = await sb
      .from(TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[comments.create]", error.message);
      return null;
    }
    return normalizeComment(data);
  } catch (e) {
    console.error("[comments.create]", e);
    return null;
  }
}

export async function resolveThread(threadId, resolved = true) {
  if (!threadId || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(TABLE)
      .update({ resolved })
      .eq("thread_id", threadId);
    if (error) {
      console.error("[comments.resolve]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[comments.resolve]", e);
    return false;
  }
}

export async function softDeleteComment(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[comments.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[comments.delete]", e);
    return false;
  }
}
