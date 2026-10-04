"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for Phase 6 personalization. Owns `content.variants`
// (slot candidates with rules/priority/weight/status),
// `content.ranking_rules` (boost|exclude with weight) and
// `content.frequency_caps` (per-slot impression caps). Pure: validate,
// console.error on failure, return null / false / [] — never throw, never
// toast. DB snake_case; UI camelCase, mapped at this boundary.

const VARIANTS_TABLE = "variants";
const RANKING_TABLE = "ranking_rules";
const CAPS_TABLE = "frequency_caps";

// Canonical row normalizer lives in the server-safe `@/lib/decide-core` (shared
// with the edge endpoint); imported for local use and re-exported so existing imports keep working.
import { normalizeVariant } from "@/lib/decide-core";
export { normalizeVariant };

function variantToRow(input) {
  const row = {};
  const map = {
    slotId: "slot_id",
    entryId: "entry_id",
    priority: "priority",
    weight: "weight",
    status: "status",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("entryId" in input) row.entry_id = input.entryId || null;
  if ("rules" in input) row.rules = input.rules ?? {};
  return row;
}

export async function listVariants(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(VARIANTS_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("priority", { ascending: false });
    if (error) {
      console.error("[variants.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeVariant);
  } catch (e) {
    console.error("[variants.list]", e);
    return null;
  }
}

export async function listVariantsBySlot(slotId) {
  if (!slotId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(VARIANTS_TABLE)
      .select("*")
      .eq("slot_id", slotId)
      .is("deleted_at", null)
      .order("priority", { ascending: false });
    if (error) {
      console.error("[variants.listBySlot]", error.message);
      return null;
    }
    return (data || []).map(normalizeVariant);
  } catch (e) {
    console.error("[variants.listBySlot]", e);
    return null;
  }
}

export async function listBySlot(slotId) {
  return listVariantsBySlot(slotId);
}

export async function getVariant(id) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(VARIANTS_TABLE)
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[variants.get]", error.message);
      return null;
    }
    return normalizeVariant(data);
  } catch (e) {
    console.error("[variants.get]", e);
    return null;
  }
}

export async function createVariant(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const payload = variantToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(VARIANTS_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[variants.create]", error.message);
      return null;
    }
    return normalizeVariant(data);
  } catch (e) {
    console.error("[variants.create]", e);
    return null;
  }
}

export async function updateVariant(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(VARIANTS_TABLE)
      .update(variantToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[variants.update]", error.message);
      return null;
    }
    return normalizeVariant(data);
  } catch (e) {
    console.error("[variants.update]", e);
    return null;
  }
}

export async function softDeleteVariant(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    if (!sb) return false;
    const { error } = await sb
      .from(VARIANTS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[variants.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[variants.delete]", e);
    return false;
  }
}

// --- Ranking rules (boost | exclude) ---

export function normalizeRankingRule(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    ruleType: row.rule_type ?? "boost",
    entryId: row.entry_id ?? null,
    weight: Number(row.weight ?? 1),
    reason: row.reason ?? "",
    status: row.status ?? "Active",
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function rankingRuleToRow(input) {
  const row = {};
  const map = {
    ruleType: "rule_type",
    entryId: "entry_id",
    weight: "weight",
    reason: "reason",
    status: "status",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("entryId" in input) row.entry_id = input.entryId || null;
  return row;
}

export async function listRankingRules(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(RANKING_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[rankingRules.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeRankingRule);
  } catch (e) {
    console.error("[rankingRules.list]", e);
    return null;
  }
}

export async function createRankingRule(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const payload = rankingRuleToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(RANKING_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[rankingRules.create]", error.message);
      return null;
    }
    return normalizeRankingRule(data);
  } catch (e) {
    console.error("[rankingRules.create]", e);
    return null;
  }
}

export async function updateRankingRule(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(RANKING_TABLE)
      .update(rankingRuleToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[rankingRules.update]", error.message);
      return null;
    }
    return normalizeRankingRule(data);
  } catch (e) {
    console.error("[rankingRules.update]", e);
    return null;
  }
}

export async function softDeleteRankingRule(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    if (!sb) return false;
    const { error } = await sb
      .from(RANKING_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[rankingRules.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[rankingRules.delete]", e);
    return false;
  }
}

// --- Frequency caps ---

export function normalizeFrequencyCap(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    slotId: row.slot_id ?? null,
    maxImpressions: Number(row.max_impressions ?? 3),
    windowHours: Number(row.window_hours ?? 24),
    status: row.status ?? "Active",
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function frequencyCapToRow(input) {
  const row = {};
  const map = {
    slotId: "slot_id",
    maxImpressions: "max_impressions",
    windowHours: "window_hours",
    status: "status",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

export async function listFrequencyCaps(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(CAPS_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[frequencyCaps.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeFrequencyCap);
  } catch (e) {
    console.error("[frequencyCaps.list]", e);
    return null;
  }
}

export async function createFrequencyCap(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const payload = frequencyCapToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(CAPS_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[frequencyCaps.create]", error.message);
      return null;
    }
    return normalizeFrequencyCap(data);
  } catch (e) {
    console.error("[frequencyCaps.create]", e);
    return null;
  }
}

export async function updateFrequencyCap(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(CAPS_TABLE)
      .update(frequencyCapToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[frequencyCaps.update]", error.message);
      return null;
    }
    return normalizeFrequencyCap(data);
  } catch (e) {
    console.error("[frequencyCaps.update]", e);
    return null;
  }
}

export async function softDeleteFrequencyCap(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    if (!sb) return false;
    const { error } = await sb
      .from(CAPS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[frequencyCaps.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[frequencyCaps.delete]", e);
    return false;
  }
}
