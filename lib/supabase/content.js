import { createClient } from "./client";

// Data-access layer for the Content area. The only place that talks to the
// `content.entries` table. Keeps actions pure: validate, console.error on
// failure, and return null / false / [] — never throw, never toast (the screen
// owns UX). DB is snake_case; the UI is camelCase, mapped at this boundary.

const TABLE = "entries";

// The dashboard renders before the table exists (and works against bundled
// sample data when Supabase isn't configured). Guard every call so a missing
// env or missing table degrades to "no DB" rather than crashing.
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

// DB row -> camelCase view model the screens render directly.
export function normalizeContent(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    title: row.title ?? "",
    slug: row.slug ?? "",
    status: row.status ?? "Draft",
    type: row.type ?? "Article",
    excerpt: row.excerpt ?? "",
    body: row.body ?? "",
    author: row.author ?? "",
    locale: row.locale ?? "en",
    coverUrl: row.cover_url ?? "",
    // The project this entry belongs to. Access is scoped to project members
    // (org membership) via RLS.
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    // Expansion-bag keys surface as first-class fields on the view model.
    ...meta,
  };
}

// camelCase patch -> snake_case columns. Emits a column only when its key is
// present in `input`, so one updateContent() serves both a full-form save and a
// single-field inline edit (`{ status }`, `{ title }`…).
function toRow(input) {
  const row = {};
  const map = {
    title: "title",
    slug: "slug",
    status: "status",
    type: "type",
    excerpt: "excerpt",
    body: "body",
    author: "author",
    locale: "locale",
    coverUrl: "cover_url",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

// Entries in a project, newest first. Requires a project id — without one there
// is nothing to scope to, so we return null (the screen keeps its sample
// state). RLS additionally guarantees only the caller's projects come back.
export async function listContent(projectId) {
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
      console.error("[content.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeContent);
  } catch (e) {
    console.error("[content.list]", e);
    return null;
  }
}

export async function getContent(id) {
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
      console.error("[content.get]", error.message);
      return null;
    }
    return normalizeContent(data);
  } catch (e) {
    console.error("[content.get]", e);
    return null;
  }
}

// Insert. Honors a caller-supplied `id` (the UI mints a UUID up front for
// optimistic rendering) so the row and the optimistic list entry stay in sync.
export async function createContent(input) {
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
      console.error("[content.create]", error.message);
      return null;
    }
    return normalizeContent(data);
  } catch (e) {
    console.error("[content.create]", e);
    return null;
  }
}

export async function updateContent(id, patch) {
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
      console.error("[content.update]", error.message);
      return null;
    }
    return normalizeContent(data);
  } catch (e) {
    console.error("[content.update]", e);
    return null;
  }
}

// Soft delete — sets deleted_at; lists filter it out.
export async function softDeleteContent(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = createClient().schema("content");
    const { error } = await sb
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[content.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[content.delete]", e);
    return false;
  }
}
