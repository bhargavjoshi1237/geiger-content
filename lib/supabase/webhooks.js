"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for outbound webhooks. Owns `content.webhooks`
// (subscriptions fired on publish/unpublish) + `content.webhook_deliveries`
// (the per-attempt delivery log). Pure: validate, console.error on failure,
// return null / [] / false — never throw, never toast. DB snake_case; UI
// camelCase.

const TABLE = "webhooks";
const DELIVERIES_TABLE = "webhook_deliveries";

export const WEBHOOK_EVENTS = [
  "entry.published",
  "entry.unpublished",
  "entry.scheduled",
];

export function normalizeWebhook(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    name: row.name ?? "Untitled webhook",
    url: row.url ?? "",
    events: Array.isArray(row.events) ? row.events : [],
    status: row.status ?? "Active",
    hasSecret: Boolean(row.secret),
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

export function normalizeDelivery(row) {
  if (!row) return null;
  return {
    id: row.id,
    webhookId: row.webhook_id ?? null,
    event: row.event ?? "",
    payload: row.payload && typeof row.payload === "object" ? row.payload : {},
    status: row.status ?? "Pending",
    attempts: row.attempts ?? 0,
    responseCode: row.response_code ?? null,
    responseBody: row.response_body ?? "",
    projectId: row.project_id ?? null,
    createdAt: row.created_at ?? null,
  };
}

function toRow(input) {
  const row = {};
  const map = {
    name: "name",
    url: "url",
    events: "events",
    status: "status",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("secret" in input) row.secret = input.secret || "";
  return row;
}

export async function listWebhooks(projectId) {
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
      console.error("[webhooks.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeWebhook);
  } catch (e) {
    console.error("[webhooks.list]", e);
    return null;
  }
}

export async function getWebhook(id) {
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
      console.error("[webhooks.get]", error.message);
      return null;
    }
    return normalizeWebhook(data);
  } catch (e) {
    console.error("[webhooks.get]", e);
    return null;
  }
}

export async function createWebhook(input) {
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
      console.error("[webhooks.create]", error.message);
      return null;
    }
    return normalizeWebhook(data);
  } catch (e) {
    console.error("[webhooks.create]", e);
    return null;
  }
}

export async function updateWebhook(id, patch) {
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
      console.error("[webhooks.update]", error.message);
      return null;
    }
    return normalizeWebhook(data);
  } catch (e) {
    console.error("[webhooks.update]", e);
    return null;
  }
}

export async function softDeleteWebhook(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[webhooks.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[webhooks.delete]", e);
    return false;
  }
}

// Appends a delivery-log row. Status is one of Pending / Delivered / Failed.
export async function logDelivery(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const row = {
      webhook_id: input.webhookId || null,
      event: input.event || "",
      payload: input.payload || {},
      status: input.status || "Pending",
      attempts: input.attempts ?? 1,
      response_code: input.responseCode ?? null,
      response_body: String(input.responseBody || "").slice(0, 4000),
    };
    if (input.projectId) row.project_id = input.projectId;
    if (input.id) row.id = input.id;
    const { data, error } = await sb
      .from(DELIVERIES_TABLE)
      .insert(row)
      .select("*")
      .single();
    if (error) {
      console.error("[webhooks.logDelivery]", error.message);
      return null;
    }
    return normalizeDelivery(data);
  } catch (e) {
    console.error("[webhooks.logDelivery]", e);
    return null;
  }
}

// Delivery rows for one webhook, newest first (the per-webhook log view).
export async function listDeliveries(webhookId, limit = 50) {
  if (!webhookId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(DELIVERIES_TABLE)
      .select("*")
      .eq("webhook_id", webhookId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[webhooks.deliveries]", error.message);
      return null;
    }
    return (data || []).map(normalizeDelivery);
  } catch (e) {
    console.error("[webhooks.deliveries]", e);
    return null;
  }
}

// Delivery rows across a project, newest first (the global log view).
export async function listProjectDeliveries(projectId, limit = 100) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(DELIVERIES_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[webhooks.projectDeliveries]", error.message);
      return null;
    }
    return (data || []).map(normalizeDelivery);
  } catch (e) {
    console.error("[webhooks.projectDeliveries]", e);
    return null;
  }
}

// Best-effort fan-out: POSTs { event, payload } to every Active webhook in
// the project subscribed to `event`, logging one delivery row per webhook.
// Never throws — delivery failures are recorded, not raised.
export async function fireWebhooks(projectId, event, payload) {
  if (!projectId || !event || !isSupabaseConfigured()) return [];
  try {
    const hooks = await listWebhooks(projectId);
    const targets = (hooks || []).filter(
      (h) => h.status === "Active" && h.events.includes(event) && h.url,
    );
    const results = await Promise.all(
      targets.map(async (hook) => {
        const body = {
          event,
          payload: payload || {},
          sentAt: new Date().toISOString(),
        };
        try {
          const res = await fetch(hook.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const text = await res.text().catch(() => "");
          await logDelivery({
            webhookId: hook.id,
            projectId,
            event,
            payload: body,
            status: res.ok ? "Delivered" : "Failed",
            attempts: 1,
            responseCode: res.status,
            responseBody: text,
          });
          return { webhookId: hook.id, ok: res.ok };
        } catch (e) {
          console.error("[webhooks.fire]", hook.id, e);
          await logDelivery({
            webhookId: hook.id,
            projectId,
            event,
            payload: body,
            status: "Failed",
            attempts: 1,
            responseCode: null,
            responseBody: e?.message || "fetch failed",
          });
          return { webhookId: hook.id, ok: false };
        }
      }),
    );
    return results;
  } catch (e) {
    console.error("[webhooks.fire]", e);
    return [];
  }
}
