"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for experiments. Owns `content.experiments`
// (name, status, traffic_split, goal_metric, holdout_pct, starts_at,
// ends_at), `content.experiment_variants` (experiment_id, entry_id
// nullable, weight) and `content.experiment_exposures` (experiment_id,
// variant_id, profile_id, converted, at). Pure: validate, console.error on
// failure, return null / false / [] — never throw, never toast. DB
// snake_case; UI camelCase, mapped at this boundary.

const EXPERIMENTS_TABLE = "experiments";
const VARIANTS_TABLE = "experiment_variants";
const EXPOSURES_TABLE = "experiment_exposures";

export function normalizeExperiment(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    name: row.name ?? "Untitled experiment",
    status: row.status ?? "Draft",
    trafficSplit:
      row.traffic_split && typeof row.traffic_split === "object" ? row.traffic_split : {},
    goalMetric: row.goal_metric ?? "conversion",
    holdoutPct: Number(row.holdout_pct ?? 0),
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function experimentToRow(input) {
  const row = {};
  const map = {
    name: "name",
    status: "status",
    goalMetric: "goal_metric",
    holdoutPct: "holdout_pct",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("trafficSplit" in input) row.traffic_split = input.trafficSplit ?? {};
  if ("startsAt" in input) row.starts_at = input.startsAt || null;
  if ("endsAt" in input) row.ends_at = input.endsAt || null;
  return row;
}

export function normalizeExperimentVariant(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    experimentId: row.experiment_id ?? null,
    entryId: row.entry_id ?? null,
    name: row.name ?? "Variant",
    weight: Number(row.weight ?? 1),
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function experimentVariantToRow(input) {
  const row = {};
  const map = {
    experimentId: "experiment_id",
    name: "name",
    weight: "weight",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("entryId" in input) row.entry_id = input.entryId || null;
  return row;
}

export async function listExperiments(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(EXPERIMENTS_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[experiments.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeExperiment);
  } catch (e) {
    console.error("[experiments.list]", e);
    return null;
  }
}

export async function getExperiment(id) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(EXPERIMENTS_TABLE)
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[experiments.get]", error.message);
      return null;
    }
    return normalizeExperiment(data);
  } catch (e) {
    console.error("[experiments.get]", e);
    return null;
  }
}

export async function createExperiment(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const payload = experimentToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(EXPERIMENTS_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[experiments.create]", error.message);
      return null;
    }
    return normalizeExperiment(data);
  } catch (e) {
    console.error("[experiments.create]", e);
    return null;
  }
}

export async function updateExperiment(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(EXPERIMENTS_TABLE)
      .update(experimentToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[experiments.update]", error.message);
      return null;
    }
    return normalizeExperiment(data);
  } catch (e) {
    console.error("[experiments.update]", e);
    return null;
  }
}

export async function softDeleteExperiment(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    if (!sb) return false;
    const { error } = await sb
      .from(EXPERIMENTS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[experiments.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[experiments.delete]", e);
    return false;
  }
}

export async function listExperimentVariants(experimentId) {
  if (!experimentId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(VARIANTS_TABLE)
      .select("*")
      .eq("experiment_id", experimentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[experiments.listVariants]", error.message);
      return null;
    }
    return (data || []).map(normalizeExperimentVariant);
  } catch (e) {
    console.error("[experiments.listVariants]", e);
    return null;
  }
}

export async function createExperimentVariant(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const payload = experimentVariantToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(VARIANTS_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[experiments.createVariant]", error.message);
      return null;
    }
    return normalizeExperimentVariant(data);
  } catch (e) {
    console.error("[experiments.createVariant]", e);
    return null;
  }
}

export async function updateExperimentVariant(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(VARIANTS_TABLE)
      .update(experimentVariantToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[experiments.updateVariant]", error.message);
      return null;
    }
    return normalizeExperimentVariant(data);
  } catch (e) {
    console.error("[experiments.updateVariant]", e);
    return null;
  }
}

// Deterministic variant assignment: stable hash of
// `${experimentId}:${profileId}` over weights, with holdout_pct carving out
// a no-treatment bucket first. Pure — no DB, never throws.
export function assignVariant(experiment, variants, profileId) {
  if (!experiment || !Array.isArray(variants) || variants.length === 0) return null;
  const key = `${experiment.id}:${String(profileId || "anonymous")}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const roll = (hash % 10000) / 100;
  const holdout = Number(experiment.holdoutPct ?? 0);
  if (holdout > 0 && roll < holdout) return { holdout: true, variantId: null };
  const total = variants.reduce((sum, v) => sum + Math.max(Number(v.weight ?? 1), 0), 0) || 1;
  let cursor = holdout;
  for (const v of variants) {
    cursor += (Math.max(Number(v.weight ?? 1), 0) / total) * (100 - holdout);
    if (roll < cursor) return { holdout: false, variantId: v.id };
  }
  return { holdout: false, variantId: variants[variants.length - 1].id };
}

export async function recordExposure({ projectId, experimentId, variantId, profileId }) {
  if (!isSupabaseConfigured() || !experimentId || !profileId) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(EXPOSURES_TABLE)
      .insert({
        project_id: projectId || null,
        experiment_id: experimentId,
        variant_id: variantId || null,
        profile_id: String(profileId),
        converted: false,
        at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) {
      console.error("[experiments.exposure]", error.message);
      return null;
    }
    return data?.id || null;
  } catch (e) {
    console.error("[experiments.exposure]", e);
    return null;
  }
}

export async function recordConversion(exposureId) {
  if (!exposureId || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    if (!sb) return false;
    const { error } = await sb
      .from(EXPOSURES_TABLE)
      .update({ converted: true })
      .eq("id", exposureId);
    if (error) {
      console.error("[experiments.conversion]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[experiments.conversion]", e);
    return false;
  }
}

// Two-proportion z-test of b's conversion rate vs a's (control). Pure — no
// DB, never throws. Returns { z, p (two-tailed), significant (p < 0.05) };
// degenerate input (no exposures, zero standard error) reports no evidence.
export function significance(aExposures, aConversions, bExposures, bConversions) {
  const none = { z: 0, p: 1, significant: false };
  try {
    const n1 = Number(aExposures);
    const x1 = Number(aConversions);
    const n2 = Number(bExposures);
    const x2 = Number(bConversions);
    if (
      !Number.isFinite(n1) ||
      !Number.isFinite(x1) ||
      !Number.isFinite(n2) ||
      !Number.isFinite(x2) ||
      n1 <= 0 ||
      n2 <= 0 ||
      x1 < 0 ||
      x2 < 0 ||
      x1 > n1 ||
      x2 > n2
    ) {
      return none;
    }
    const pooled = (x1 + x2) / (n1 + n2);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
    if (!Number.isFinite(se) || se === 0) return none;
    const z = (x2 / n2 - x1 / n1) / se;
    if (!Number.isFinite(z)) return none;
    const p = 2 * (1 - normalCdf(Math.abs(z)));
    const clamped = Math.min(1, Math.max(0, p));
    return { z, p: clamped, significant: clamped < 0.05 };
  } catch (e) {
    console.error("[experiments.significance]", e);
    return none;
  }
}

// Standard-normal CDF (Abramowitz & Stegun 7.1.26 approximation). Pure.
function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

// Conversion rate per variant for one experiment. Returns [] on failure.
export async function experimentResults(experimentId) {
  if (!experimentId || !isSupabaseConfigured()) return [];
  try {
    const sb = contentClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from(EXPOSURES_TABLE)
      .select("variant_id, converted")
      .eq("experiment_id", experimentId)
      .is("deleted_at", null);
    if (error) {
      console.error("[experiments.results]", error.message);
      return [];
    }
    const byVariant = new Map();
    for (const row of data || []) {
      const key = row.variant_id || "(holdout)";
      if (!byVariant.has(key)) byVariant.set(key, { variantId: row.variant_id, exposures: 0, conversions: 0 });
      const agg = byVariant.get(key);
      agg.exposures += 1;
      if (row.converted) agg.conversions += 1;
    }
    return [...byVariant.values()].map((r) => ({
      ...r,
      rate: r.exposures ? r.conversions / r.exposures : 0,
    }));
  } catch (e) {
    console.error("[experiments.results]", e);
    return [];
  }
}

export async function results(experimentId) {
  if (!experimentId || !isSupabaseConfigured()) return [];
  try {
    const rows = await experimentResults(experimentId);
    if (!rows || rows.length === 0) return [];
    // First variant (creation order) is the control; every other arm is
    // tested against it. Falls back to the first result row when variants
    // are unreadable. The control itself carries significance: null.
    let controlId = null;
    try {
      const variants = await listExperimentVariants(experimentId);
      if (variants && variants.length > 0) controlId = variants[0].id;
    } catch {
      controlId = null;
    }
    const control =
      rows.find((r) => r.variantId === controlId) || rows[0];
    return rows.map((r) =>
      r.variantId === control.variantId
        ? { ...r, isControl: true, significance: null }
        : {
            ...r,
            isControl: false,
            significance: significance(
              control.exposures,
              control.conversions,
              r.exposures,
              r.conversions,
            ),
          },
    );
  } catch (e) {
    console.error("[experiments.results]", e);
    return [];
  }
}
