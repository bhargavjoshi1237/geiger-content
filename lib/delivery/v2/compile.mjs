// Query IR -> PostgREST plan. Paths come only from the schema; values are always quoted, never spliced raw.

// Numbers and booleans compare as jsonb (numeric/boolean order); everything else as text.
export function attributePath(attr) {
  if (attr.source === "column") return attr.column;
  return attr.type === "number" || attr.type === "boolean" ? `data->${attr.key}` : `data->>${attr.key}`;
}

// PostgREST logic-tree value quoting.
export function quote(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// LIKE metacharacters match literally; PostgREST reserves * as its wildcard, so a literal * matches any one character.
export function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (c) => `\\${c}`).replace(/\*/g, "_");
}

const LIKE = {
  $contains: ["like", (v) => `*${v}*`],
  $notContains: ["not.like", (v) => `*${v}*`],
  $containsi: ["ilike", (v) => `*${v}*`],
  $notContainsi: ["not.ilike", (v) => `*${v}*`],
  $startsWith: ["like", (v) => `${v}*`],
  $startsWithi: ["ilike", (v) => `${v}*`],
  $endsWith: ["like", (v) => `*${v}`],
  $endsWithi: ["ilike", (v) => `*${v}`],
  $eqi: ["ilike", (v) => v],
  $nei: ["not.ilike", (v) => v],
};
const COMPARE = { $eq: "eq", $ne: "neq", $lt: "lt", $lte: "lte", $gt: "gt", $gte: "gte" };

function compileCondition({ attr, op, value }) {
  const path = attributePath(attr);
  if (COMPARE[op]) return `${path}.${COMPARE[op]}.${quote(value)}`;
  if (LIKE[op]) {
    const [operator, wrap] = LIKE[op];
    return `${path}.${operator}.${quote(wrap(escapeLike(value)))}`;
  }
  if (op === "$in" || op === "$notIn") return `${path}.${op === "$in" ? "" : "not."}in.(${value.map(quote).join(",")})`;
  if (op === "$between") return `and(${path}.gte.${quote(value[0])},${path}.lte.${quote(value[1])})`;
  if (op === "$null" || op === "$notNull") return `${path}.${(op === "$null") === value ? "" : "not."}is.null`;
  throw new Error(`Uncompiled operator ${op}`);
}

function compileNode(node) {
  if (node.kind === "cond") return compileCondition(node);
  const parts = node.children.map(compileNode).filter(Boolean);
  if (!parts.length) return null;
  if (node.kind === "not") return `not.and(${parts.join(",")})`;
  return `${node.kind}(${parts.join(",")})`;
}

// Returns the logic group for a single `.or()` call (PostgREST ANDs repeated groups), or null for no filters.
export function compileWhere(where) {
  return where ? compileNode(where) : null;
}

export function compileOrder(sort) {
  return sort.map(({ attr, desc }) => ({ column: attributePath(attr), ascending: !desc }));
}
