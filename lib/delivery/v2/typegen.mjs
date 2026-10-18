// TypeScript declarations from a `_schema` document; the Types screen and `/_schema?format=ts` share this generator.

const RESERVED_NAMES = new Set(["Media", "Pagination", "OffsetPagination", "ListResponse", "SingleResponse", "EntryBase",
  "Entry", "ContentTypes", "Filters", "LogicFilters", "StringFilter", "NumberFilter", "BooleanFilter", "DateFilter", "NullFilter",
  "OrderedFilter", "SystemFilters"]);

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const prop = (key) => (IDENTIFIER.test(key) ? key : JSON.stringify(key));

export function typeName(apiId) {
  const pascal = String(apiId || "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
  const name = /^[A-Za-z]/.test(pascal) ? pascal : `Type${pascal}`;
  return RESERVED_NAMES.has(name) ? `Content${name}` : name;
}

function assignNames(types) {
  const used = new Map();
  return types.map((t) => {
    const base = typeName(t.apiId);
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    return n === 1 ? base : `${base}${n}`;
  });
}

function valueType(field, hasEntries) {
  switch (field.type) {
    case "number":
      return "number | null";
    case "boolean":
      return "boolean | null";
    case "enum":
      return field.options?.length ? `${field.options.map((o) => JSON.stringify(o)).join(" | ")} | null` : "string | null";
    case "json":
      return "unknown";
    case "media":
      return field.multiple ? "Media[]" : "Media | null";
    case "reference": {
      const target = hasEntries ? "Entry" : "EntryBase";
      return field.multiple ? `${target}[]` : `${target} | null`;
    }
    default:
      return "string | null";
  }
}

const FILTER_TYPES = {
  text: "StringFilter",
  richtext: "StringFilter",
  enum: "StringFilter",
  number: "NumberFilter",
  date: "DateFilter",
  boolean: "BooleanFilter",
  json: "NullFilter",
  media: "NullFilter",
};

const PRELUDE = `export interface Media {
  id: string;
  url: string;
  name: string;
  mime: string;
  width: number | null;
  height: number | null;
  alt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface OffsetPagination {
  start: number;
  limit: number;
  total: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: { pagination: Pagination | OffsetPagination };
}

export interface SingleResponse<T> {
  data: T;
  meta: Record<string, never>;
}

export interface EntryBase {
  id: string;
  slug: string;
  locale: string;
  type: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NullFilter {
  $null?: boolean;
  $notNull?: boolean;
}

export interface OrderedFilter<V> extends NullFilter {
  $eq?: V;
  $ne?: V;
  $in?: V[];
  $notIn?: V[];
  $lt?: V;
  $lte?: V;
  $gt?: V;
  $gte?: V;
  $between?: [V, V];
}

export interface StringFilter extends OrderedFilter<string> {
  $eqi?: string;
  $nei?: string;
  $contains?: string;
  $notContains?: string;
  $containsi?: string;
  $notContainsi?: string;
  $startsWith?: string;
  $startsWithi?: string;
  $endsWith?: string;
  $endsWithi?: string;
}

export type NumberFilter = OrderedFilter<number>;
export type DateFilter = OrderedFilter<string>;

export interface BooleanFilter extends NullFilter {
  $eq?: boolean;
  $ne?: boolean;
}

export type LogicFilters<F> = F & {
  $and?: LogicFilters<F>[];
  $or?: LogicFilters<F>[];
  $not?: LogicFilters<F>;
};

export interface SystemFilters {
  id?: OrderedFilter<string> | string;
  slug?: StringFilter | string;
  locale?: StringFilter | string;
  publishedAt?: DateFilter | string;
  createdAt?: DateFilter | string;
  updatedAt?: DateFilter | string;
}`;

export function generateTypes(schema, { source = "Geiger Content" } = {}) {
  const types = Array.isArray(schema?.types) ? schema.types : [];
  const names = assignNames(types);
  const hasEntries = types.length > 0;
  const blocks = types.map((t, i) => {
    const name = names[i];
    const props = [`  type: ${JSON.stringify(t.apiId)};`];
    const filters = [];
    for (const key of t.builtins || []) {
      props.push(`  ${prop(key)}: string;`);
      filters.push(`  ${prop(key)}?: StringFilter | string;`);
    }
    for (const field of t.fields || []) {
      const optional = field.type === "reference" ? "?" : "";
      const comment = field.type === "reference" ? "  /** Present only when populated. */\n" : "";
      props.push(`${comment}  ${prop(field.key)}${optional}: ${valueType(field, hasEntries)};`);
      const filter = FILTER_TYPES[field.type];
      if (filter) filters.push(`  ${prop(field.key)}?: ${filter}${filter === "NullFilter" ? "" : ` | ${field.type === "number" ? "number" : field.type === "boolean" ? "boolean" : "string"}`};`);
    }
    return [
      `/** ${String(t.name).replace(/\*\//g, "* /")} — GET /${t.apiPlural} */`,
      `export interface ${name} extends EntryBase {\n${props.join("\n")}\n}`,
      `export type ${name}Filters = LogicFilters<SystemFilters & {\n${filters.join("\n")}\n}>;`,
    ].join("\n\n");
  });
  const entryUnion = hasEntries ? `export type Entry = ${names.join(" | ")};` : "export type Entry = EntryBase;";
  const map = types.map((t, i) => `  ${prop(t.apiPlural)}: ${names[i]};`).join("\n");
  return [
    `// Generated by ${source}. Do not edit; regenerate after changing content types.`,
    PRELUDE,
    ...blocks,
    entryUnion,
    `export interface ContentTypes {\n${map}\n}`,
    "",
  ].join("\n\n");
}
