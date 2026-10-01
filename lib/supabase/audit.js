"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";
import { getUser } from "./user";

// Data-access layer for the audit log. Owns `content.audit_log`, the
// append-only record behind Governance → Audit Logs. Pure: validate,
// console.error on failure, return null / [] — never throw, never toast (the
// screen owns UX). DB is snake_case; the UI is camelCase, mapped here.
//
// INSERT-ONLY. There is no update/delete export: the table's RLS exposes only
// select + insert, so rows can be appended and read but never rewritten.

const TABLE = "audit_log";

// DB row -> camelCase view model the Audit Logs screen renders directly.
export function normalizeAuditEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    actor: row.actor ?? null,
    action: row.action ?? "",
    entity: row.entity ?? "",
    entityId: row.entity_id ?? null,
    diff:
      row.diff && typeof row.diff === "object" && !Array.isArray(row.diff)
        ? row.diff
        : {},
    at: row.at ?? null,
  };
}

// Keep diffs small: logAction truncates the bag to a bounded set of short
// string fields so a careless caller can't balloon the table.
function toDiff(input) {
  if (!input || typeof input !== "object") return {};
  const diff = {};
  for (const [key, value] of Object.entries(input).slice(0, 12)) {
    if (value === null || value === undefined) continue;
    const text =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    diff[key] = text.length > 200 ? `${text.slice(0, 200)}…` : text;
  }
  return diff;
}

// Append one audit event. Best-effort by contract: resolves null (not
// configured, invalid input, or write failed) and never throws, so mutation
// paths can `void logAction(...)` without risking the write they record.
export async function logAction({
  projectId = null,
  actor = null,
  action,
  entity,
  entityId = null,
  diff = {},
}) {
  if (!action || !entity || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await contentClient()
      .from(TABLE)
      .insert({
        project_id: projectId,
        actor,
        action,
        entity,
        entity_id: entityId,
        diff: toDiff(diff),
      })
      .select("*")
      .single();
    if (error) {
      console.error("[audit.log]", error.message);
      return null;
    }
    return normalizeAuditEvent(data);
  } catch (e) {
    console.error("[audit.log]", e);
    return null;
  }
}

// Newest audit events in a project. Tri-state like every list*: null → not
// configured or read failed (screen renders its empty state), [] → no events.
export async function listAudit(projectId, { limit = 100 } = {}) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await contentClient()
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .order("at", { ascending: false })
      .limit(Math.max(1, Math.min(limit, 500)));
    if (error) {
      console.error("[audit.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeAuditEvent);
  } catch (e) {
    console.error("[audit.list]", e);
    return null;
  }
}

// Fire-and-forget wrapper for mutation paths. Resolves the actor from the
// session when the caller doesn't pass one, swallows everything, and never
// blocks: `auditWrite({...})` without await.
export function auditWrite({
  projectId = null,
  actor = null,
  action,
  entity,
  entityId = null,
  diff = {},
}) {
  try {
    const run = async () => {
      let resolved = actor;
      if (!resolved) {
        try {
          resolved = (await getUser())?.id ?? null;
        } catch {
          resolved = null;
        }
      }
      await logAction({
        projectId,
        actor: resolved,
        action,
        entity,
        entityId,
        diff,
      });
    };
    void run();
  } catch {
    // Recording must never break the mutation it records.
  }
}
