// Server-safe rule matching and deterministic variant selection.

export function normalizeVariant(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    ...meta,
    id: row.id,
    slotId: row.slot_id ?? null,
    entryId: row.entry_id ?? null,
    rules:
      row.rules && typeof row.rules === "object"
        ? row.rules
        : Array.isArray(row.rules)
          ? row.rules
          : {},
    priority: Number(row.priority ?? 0),
    weight: Number(row.weight ?? 1),
    status: row.status ?? "Active",
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

function getPath(source, field) {
  if (!source || !field) return undefined;
  const parts = String(field).split(".");
  let current = source;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

function matchClause(clause, bag) {
  if (!clause || typeof clause !== "object") return true;
  const { field, op = "equals", value } = clause;
  const actual = getPath(bag, field);
  switch (op) {
    case "equals":
      return String(actual ?? "") === String(value ?? "");
    case "not_equals":
      return String(actual ?? "") !== String(value ?? "");
    case "contains":
      return String(actual ?? "").includes(String(value ?? ""));
    case "in":
      return Array.isArray(value) && value.map(String).includes(String(actual ?? ""));
    case "gt":
      return Number(actual) > Number(value);
    case "lt":
      return Number(actual) < Number(value);
    default:
      return String(actual ?? "") === String(value ?? "");
  }
}

export function rulesMatch(rules, bag) {
  if (!rules) return { matched: true, clauses: 0 };
  const clauses = Array.isArray(rules) ? rules : rules.all || rules.any || [];
  const list = Array.isArray(clauses) ? clauses : Object.entries(clauses).map(([field, value]) => ({ field, op: "equals", value }));
  if (list.length === 0) return { matched: true, clauses: 0 };
  const mode = rules.any && !rules.all ? "any" : "all";
  const results = list.map((c) => matchClause(c, bag));
  const matched = mode === "any" ? results.some(Boolean) : results.every(Boolean);
  return { matched, clauses: list.length };
}

export function hashChoice(key, bucketCount) {
  let hash = 0;
  const s = String(key || "anonymous");
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return bucketCount > 0 ? hash % bucketCount : 0;
}

function describeRules(rules) {
  if (!rules) return "no targeting rules";
  const list = Array.isArray(rules) ? rules : rules.all || rules.any || [];
  const arr = Array.isArray(list)
    ? list
    : Object.entries(list).map(([field, value]) => ({ field, op: "equals", value }));
  if (arr.length === 0) return "no targeting rules (default)";
  return arr.map((c) => `${c.field} ${c.op || "equals"} "${c.value}"`).join(" and ");
}

// Select an eligible variant from fetched rows.
export function decideOverVariants(variants, { profile = {}, context = {} } = {}) {
  const bag = { ...(profile || {}), ...(context || {}) };
  const active = (variants || []).filter((v) => (v.status || "Active") === "Active");
  if (active.length === 0) {
    return { entryId: null, variantId: null, reason: "No active variants for this slot, so no content was selected." };
  }
  const matching = active.filter((v) => rulesMatch(v.rules, bag).matched);
  if (matching.length === 0) {
    return { entryId: null, variantId: null, reason: "No variant's targeting rules matched this profile and context, so no content was selected." };
  }
  const topPriority = Math.max(...matching.map((v) => Number(v.priority ?? 0)));
  const contenders = matching.filter((v) => Number(v.priority ?? 0) === topPriority);
  let winner;
  let why;
  if (contenders.length === 1) {
    [winner] = contenders;
    why = `matched ${describeRules(winner.rules)} and had the highest priority (${topPriority})`;
  } else {
    const total = contenders.reduce((sum, v) => sum + Math.max(Number(v.weight ?? 1), 0), 0);
    const profileKey = String(profile?.id || profile?.anonymousId || context?.anonymousId || "anonymous");
    const pick = hashChoice(`${profileKey}:${contenders.map((v) => v.id).join(",")}`, Math.max(Math.round(total * 100), 1));
    let cursor = 0;
    winner = contenders[contenders.length - 1];
    for (const v of contenders) {
      cursor += Math.max(Number(v.weight ?? 1), 0) * 100;
      if (pick < cursor) {
        winner = v;
        break;
      }
    }
    why = `matched ${describeRules(winner.rules)}, tied on priority (${topPriority}) with ${contenders.length - 1} other(s), and won the deterministic weight draw (weight ${winner.weight})`;
  }
  return {
    entryId: winner.entryId || null,
    variantId: winner.id,
    reason: `Selected entry ${winner.entryId || "(no entry)"} because it ${why}.`,
  };
}
