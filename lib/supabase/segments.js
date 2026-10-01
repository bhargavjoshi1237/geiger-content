import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for Audience Segments. Owns `content.segments` (named
// groups with a stored AND/OR rule tree) plus the naive in-JS rule matcher
// the segment builder preview reads. Pure: validate, console.error on
// failure, return null / false — never throw, never toast. DB snake_case;
// UI camelCase, mapped at this boundary.
//
// Rule shape:
//   { op: "and" | "or", conditions: [ Condition | Rule ] }
// Condition shape:
//   { field: "trait.<key>" | "events.<type>" | "<trait key>",
//     operator: "equals" | "not_equals" | "contains" | "not_contains"
//             | "gt" | "gte" | "lt" | "lte" | "exists" | "not_exists",
//     value: any }
// Evaluation context: { traits: {key: value}, eventCounts: {type: n} }.

const TABLE = "segments";

export const EMPTY_RULE = { op: "and", conditions: [] };

export function normalizeSegment(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    name: row.name ?? "Untitled segment",
    rule:
      row.rule && typeof row.rule === "object" ? row.rule : { ...EMPTY_RULE },
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta, // expansion-bag keys surface as first-class fields
  };
}

function toRow(input) {
  const row = {};
  const map = {
    name: "name",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("rule" in input)
    row.rule =
      input.rule && typeof input.rule === "object"
        ? input.rule
        : { ...EMPTY_RULE };
  return row;
}

export async function listSegments(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[segments.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeSegment);
  } catch (e) {
    console.error("[segments.list]", e);
    return null;
  }
}

export async function getSegment(id) {
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
      console.error("[segments.get]", error.message);
      return null;
    }
    return normalizeSegment(data);
  } catch (e) {
    console.error("[segments.get]", e);
    return null;
  }
}

export async function createSegment(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const payload = toRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[segments.create]", error.message);
      return null;
    }
    return normalizeSegment(data);
  } catch (e) {
    console.error("[segments.create]", e);
    return null;
  }
}

export async function updateSegment(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TABLE)
      .update(toRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[segments.update]", error.message);
      return null;
    }
    return normalizeSegment(data);
  } catch (e) {
    console.error("[segments.update]", e);
    return null;
  }
}

export async function softDeleteSegment(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    if (!sb) return false;
    const { error } = await sb
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[segments.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[segments.delete]", e);
    return false;
  }
}

// Resolve one condition's left-hand value from the context. "events.<type>"
// reads the event-count bag; "trait.<key>" or a bare key reads traits.
function resolveField(field, ctx) {
  const traits = ctx?.traits || {};
  const eventCounts = ctx?.eventCounts || {};
  if (typeof field !== "string") return undefined;
  if (field.startsWith("events.")) return eventCounts[field.slice(7)] ?? 0;
  if (field.startsWith("trait.")) return traits[field.slice(6)];
  return traits[field];
}

function compareNumbers(left, right) {
  const l = Number(left);
  const r = Number(right);
  if (Number.isNaN(l) || Number.isNaN(r)) return null;
  return l - r;
}

export function evaluateCondition(condition = {}, ctx = {}) {
  const left = resolveField(condition.field, ctx);
  const right = condition.value;
  switch (condition.operator) {
    case "equals":
      return left === right || String(left) === String(right);
    case "not_equals":
      return left !== right && String(left) !== String(right);
    case "contains":
      if (Array.isArray(left)) return left.includes(right);
      return String(left ?? "").includes(String(right ?? ""));
    case "not_contains":
      if (Array.isArray(left)) return !left.includes(right);
      return !String(left ?? "").includes(String(right ?? ""));
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const diff = compareNumbers(left, right);
      if (diff === null) return false;
      if (condition.operator === "gt") return diff > 0;
      if (condition.operator === "gte") return diff >= 0;
      if (condition.operator === "lt") return diff < 0;
      return diff <= 0;
    }
    case "exists":
      return left !== undefined && left !== null && left !== "";
    case "not_exists":
      return left === undefined || left === null || left === "";
    default:
      return false;
  }
}

// Naive AND/OR matcher over a stored rule tree. A node with `conditions` is a
// group; anything with a `field` is a leaf condition. An empty group matches
// everything (so a fresh segment previews as "all profiles").
export function evaluateSegment(rule, ctx = {}) {
  if (!rule || typeof rule !== "object") return true;
  if (Array.isArray(rule.conditions)) {
    if (rule.conditions.length === 0) return true;
    const results = rule.conditions.map((c) =>
      c && typeof c === "object" && Array.isArray(c.conditions)
        ? evaluateSegment(c, ctx)
        : evaluateCondition(c, ctx),
    );
    return rule.op === "or"
      ? results.some(Boolean)
      : results.every(Boolean);
  }
  return evaluateCondition(rule, ctx);
}

// Count how many of the given evaluation contexts match the rule — the
// builder's member-count preview. Each entry is { traits, eventCounts }.
export function countSegmentMembers(rule, contexts = []) {
  if (!Array.isArray(contexts) || contexts.length === 0) return 0;
  return contexts.filter((ctx) => evaluateSegment(rule, ctx)).length;
}
