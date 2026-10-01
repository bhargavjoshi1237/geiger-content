import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for Behavior Events. Owns `content.events` (raw
// anonymous/known behavior events behind the collect beacon). Pure: validate,
// console.error on failure, return null / [] — never throw, never toast.
// DB snake_case; UI camelCase, mapped at this boundary.

const TABLE = "events";

const ANON_STORAGE_KEY = "geiger-content:anonymous-id";

export function normalizeEvent(row) {
  if (!row) return null;
  const context =
    row.context && typeof row.context === "object" ? row.context : {};
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    anonymousId: row.anonymous_id ?? null,
    userId: row.user_id ?? null,
    entryId: row.entry_id ?? null,
    type: row.type ?? "page_view",
    context,
    at: row.at ?? row.created_at ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    ...meta, // expansion-bag keys surface as first-class fields
  };
}

function toRow(input) {
  const row = {};
  const map = {
    projectId: "project_id",
    anonymousId: "anonymous_id",
    userId: "user_id",
    entryId: "entry_id",
    type: "type",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("context" in input)
    row.context =
      input.context && typeof input.context === "object" ? input.context : {};
  if ("at" in input) row.at = input.at || null;
  return row;
}

// Insert one event. Requires at least an identity (anonymousId or userId);
// type defaults to page_view.
export async function trackEvent(input = {}) {
  if (!isSupabaseConfigured()) return null;
  if (!input.anonymousId && !input.userId) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const payload = toRow({ type: "page_view", ...input });
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[events.track]", error.message);
      return null;
    }
    return normalizeEvent(data);
  } catch (e) {
    console.error("[events.track]", e);
    return null;
  }
}

// Events in a project, newest first. Optional filters: type, entryId,
// anonymousId, userId, since / until (ISO strings), limit.
export async function listEvents(projectId, filters = {}) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    let query = sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("at", { ascending: false });
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.entryId) query = query.eq("entry_id", filters.entryId);
    if (filters.anonymousId)
      query = query.eq("anonymous_id", filters.anonymousId);
    if (filters.userId) query = query.eq("user_id", filters.userId);
    if (filters.since) query = query.gte("at", filters.since);
    if (filters.until) query = query.lte("at", filters.until);
    query = query.limit(filters.limit || 500);
    const { data, error } = await query;
    if (error) {
      console.error("[events.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeEvent);
  } catch (e) {
    console.error("[events.list]", e);
    return null;
  }
}

export async function getEvent(id) {
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
      console.error("[events.get]", error.message);
      return null;
    }
    return normalizeEvent(data);
  } catch (e) {
    console.error("[events.get]", e);
    return null;
  }
}

// Client-side page-view helper. Sends a beacon to the collect endpoint — no
// Supabase env needed in the page itself, so the public renderer can call it
// freely.
//
// Usage (Phase 2 owns app/c/[id]/page.js — call this from a "use client"
// view-tracker component inside it):
//   import { trackPageView } from "@/lib/supabase/events";
//   useEffect(() => {
//     trackPageView({ entryId, projectId });
//   }, [entryId, projectId]);
//
// The anonymous id is minted once and kept in localStorage; login-time merge
// of anonymous → known happens server-side via mergeProfiles.
export function trackPageView({
  entryId = null,
  projectId = null,
  type = "page_view",
  context = {},
} = {}) {
  try {
    if (typeof window === "undefined" || typeof fetch === "undefined") return;
    let anonymousId = null;
    try {
      anonymousId = window.localStorage.getItem(ANON_STORAGE_KEY);
      if (!anonymousId && typeof crypto !== "undefined" && crypto.randomUUID) {
        anonymousId = crypto.randomUUID();
        window.localStorage.setItem(ANON_STORAGE_KEY, anonymousId);
      }
    } catch {
      anonymousId = null;
    }
    const body = JSON.stringify({
      anonymousId,
      entryId,
      projectId,
      type,
      context,
    });
    const url = "/api/content/v1/collect";
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        const blob =
          typeof Blob !== "undefined"
            ? new Blob([body], { type: "application/json" })
            : body;
        if (navigator.sendBeacon(url, blob)) return;
      }
    } catch {
      // fall through to fetch
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch (e) {
    console.error("[events.trackPageView]", e);
  }
}
