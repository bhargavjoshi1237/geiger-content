"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for Governance policy tables. Owns `content.policies`
// (named editorial guardrails: name, rules jsonb, enforced bool) and
// `content.retention_policies` (scope, days, action). Pure: validate,
// console.error on failure, return null / false / [] — never throw, never
// toast. DB snake_case; UI camelCase, mapped at this boundary.

const POLICIES_TABLE = "policies";
const RETENTION_TABLE = "retention_policies";

// --- Content policies -------------------------------------------------------

export function normalizePolicy(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    name: row.name ?? "Untitled policy",
    rules:
      row.rules && typeof row.rules === "object" && !Array.isArray(row.rules)
        ? row.rules
        : {},
    enforced: row.enforced ?? true,
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function policyToRow(input) {
  const row = {};
  const map = {
    name: "name",
    enforced: "enforced",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("rules" in input) {
    row.rules =
      input.rules && typeof input.rules === "object" ? input.rules : {};
  }
  return row;
}

export async function listPolicies(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await contentClient()
      .from(POLICIES_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[policies.list]", error.message);
      return null;
    }
    return (data || []).map(normalizePolicy);
  } catch (e) {
    console.error("[policies.list]", e);
    return null;
  }
}

export async function createPolicy(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = policyToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await contentClient()
      .from(POLICIES_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[policies.create]", error.message);
      return null;
    }
    return normalizePolicy(data);
  } catch (e) {
    console.error("[policies.create]", e);
    return null;
  }
}

export async function updatePolicy(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await contentClient()
      .from(POLICIES_TABLE)
      .update(policyToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[policies.update]", error.message);
      return null;
    }
    return normalizePolicy(data);
  } catch (e) {
    console.error("[policies.update]", e);
    return null;
  }
}

export async function softDeletePolicy(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const { error } = await contentClient()
      .from(POLICIES_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[policies.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[policies.delete]", e);
    return false;
  }
}

// --- Retention policies -----------------------------------------------------

export function normalizeRetentionPolicy(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    scope: row.scope ?? "",
    days: Number(row.days ?? 365),
    action: row.action ?? "archive",
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function retentionToRow(input) {
  const row = {};
  const map = {
    scope: "scope",
    action: "action",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("days" in input) row.days = Math.max(1, Number(input.days) || 365);
  return row;
}

export async function listRetentionPolicies(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await contentClient()
      .from(RETENTION_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[retention.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeRetentionPolicy);
  } catch (e) {
    console.error("[retention.list]", e);
    return null;
  }
}

export async function createRetentionPolicy(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = retentionToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await contentClient()
      .from(RETENTION_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[retention.create]", error.message);
      return null;
    }
    return normalizeRetentionPolicy(data);
  } catch (e) {
    console.error("[retention.create]", e);
    return null;
  }
}

export async function updateRetentionPolicy(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await contentClient()
      .from(RETENTION_TABLE)
      .update(retentionToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[retention.update]", error.message);
      return null;
    }
    return normalizeRetentionPolicy(data);
  } catch (e) {
    console.error("[retention.update]", e);
    return null;
  }
}

export async function softDeleteRetentionPolicy(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const { error } = await contentClient()
      .from(RETENTION_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[retention.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[retention.delete]", e);
    return false;
  }
}
