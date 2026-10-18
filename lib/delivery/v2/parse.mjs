// Strapi v5-style query string -> validated, typed query IR. Every key and operator is checked against the type's schema.
import { DeliveryError, validationError } from "./errors.mjs";

export const LIMITS = {
  queryLength: 8192,
  parameters: 200,
  bracketDepth: 6,
  conditions: 20,
  logicDepth: 5,
  inValues: 100,
  sortKeys: 3,
  defaultPageSize: 25,
  maxPageSize: 100,
  valueLength: 1000,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCALE = /^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8}){0,2}$/;
const UNSAFE_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);
const LIST_PARAMS = new Set(["filters", "sort", "fields", "populate", "pagination", "locale", "status"]);
const SINGLE_PARAMS = new Set(["fields", "populate", "locale", "status"]);

const TEXT_OPS = ["$eq", "$eqi", "$ne", "$nei", "$in", "$notIn", "$lt", "$lte", "$gt", "$gte", "$between",
  "$contains", "$notContains", "$containsi", "$notContainsi", "$startsWith", "$startsWithi", "$endsWith", "$endsWithi",
  "$null", "$notNull"];
const ORDERED_OPS = ["$eq", "$ne", "$in", "$notIn", "$lt", "$lte", "$gt", "$gte", "$between", "$null", "$notNull"];
const OPERATORS = {
  text: TEXT_OPS,
  richtext: TEXT_OPS,
  enum: TEXT_OPS,
  number: ORDERED_OPS,
  date: ORDERED_OPS,
  datetime: ORDERED_OPS,
  boolean: ["$eq", "$ne", "$null", "$notNull"],
  id: ["$eq", "$ne", "$in", "$notIn", "$null", "$notNull"],
  json: ["$null", "$notNull"],
  media: ["$null", "$notNull"],
  reference: [],
};
const SORTABLE = new Set(["id", "text", "enum", "number", "date", "datetime", "boolean"]);

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// Decodes bracket syntax (filters[price][$gt]=10, sort[0]=title) into nested objects and arrays, like qs.
export function parseQueryString(search) {
  const raw = String(search || "").replace(/^\?/, "");
  if (raw.length > LIMITS.queryLength) throw new DeliveryError(414, "URITooLongError", "The query string is too long.");
  const pairs = [...new URLSearchParams(raw)];
  if (pairs.length > LIMITS.parameters) throw validationError(`Use at most ${LIMITS.parameters} query parameters.`);
  const root = Object.create(null);
  for (const [rawKey, value] of pairs) {
    const match = rawKey.match(/^([^[\]]+)((?:\[[^[\]]*\])*)$/);
    const segments = match ? [match[1], ...[...match[2].matchAll(/\[([^[\]]*)\]/g)].map((m) => m[1])] : [rawKey];
    if (segments.length - 1 > LIMITS.bracketDepth) throw validationError("Query parameters are nested too deeply.", segments);
    if (segments.some((s) => UNSAFE_SEGMENTS.has(s))) throw validationError("Invalid query parameter.", segments);
    let node = root;
    for (let i = 0; i < segments.length; i += 1) {
      const last = i === segments.length - 1;
      const segment = segments[i] === "" ? String(Object.keys(node).length) : segments[i];
      if (last) {
        if (segment in node && typeof node[segment] === "string") node[segment] = [node[segment], value];
        else if (Array.isArray(node[segment])) node[segment].push(value);
        else if (segment in node) throw validationError("Conflicting query parameters.", segments);
        else node[segment] = value;
      } else {
        if (!(segment in node)) node[segment] = Object.create(null);
        else if (typeof node[segment] !== "object" || Array.isArray(node[segment])) throw validationError("Conflicting query parameters.", segments);
        node = node[segment];
      }
    }
  }
  return arrayify(root);
}

// Objects keyed 0..n become arrays, as qs does.
function arrayify(node) {
  if (Array.isArray(node)) return node.map(arrayify);
  if (node === null || typeof node !== "object") return node;
  const keys = Object.keys(node);
  if (keys.length && keys.every((k) => /^\d+$/.test(k))) {
    const indexes = keys.map(Number).sort((a, b) => a - b);
    if (indexes[indexes.length - 1] >= LIMITS.inValues) throw validationError(`Arrays are limited to ${LIMITS.inValues} items.`);
    return indexes.map((i) => arrayify(node[String(i)]));
  }
  const out = {};
  for (const key of keys) out[key] = arrayify(node[key]);
  return out;
}

const toList = (value) => (Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [value])
  .map((v) => (typeof v === "string" ? v.trim() : v))
  .filter((v) => v !== "" && v !== undefined);

function castBoolean(value, path) {
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  throw validationError("Expected true or false.", path);
}

function castScalar(attr, value, path) {
  if (typeof value !== "string") throw validationError("Expected a single value.", path);
  if (value.length > LIMITS.valueLength) throw validationError("The value is too long.", path);
  switch (attr.type) {
    case "number": {
      const n = Number(value);
      if (value.trim() === "" || !Number.isFinite(n)) throw validationError("Expected a number.", path);
      return n;
    }
    case "boolean":
      return castBoolean(value, path);
    case "id":
      if (!UUID.test(value)) throw validationError("Expected a uuid.", path);
      return value.toLowerCase();
    case "date": {
      // Date fields store YYYY-MM-DD strings, so compare on the calendar day.
      if (Number.isNaN(Date.parse(value))) throw validationError("Expected an ISO 8601 date.", path);
      return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
    }
    case "datetime":
      if (Number.isNaN(Date.parse(value))) throw validationError("Expected an ISO 8601 date.", path);
      return new Date(value).toISOString();
    default:
      return value;
  }
}

function parseCondition(attr, op, value, path) {
  if (!OPERATORS[attr.type]?.includes(op)) {
    throw validationError(attr.type === "reference"
      ? `Filtering on relation "${attr.key}" isn't supported yet.`
      : `Operator ${op} doesn't apply to ${attr.type} attribute "${attr.key}".`, path);
  }
  if (op === "$null" || op === "$notNull") return { kind: "cond", attr, op, value: castBoolean(value, path) };
  if (op === "$in" || op === "$notIn") {
    const values = Array.isArray(value) ? value : [value];
    if (!values.length || values.length > LIMITS.inValues) throw validationError(`${op} takes 1 to ${LIMITS.inValues} values.`, path);
    return { kind: "cond", attr, op, value: values.map((v, i) => castScalar(attr, v, [...path, String(i)])) };
  }
  if (op === "$between") {
    if (!Array.isArray(value) || value.length !== 2) throw validationError("$between takes exactly two values.", path);
    return { kind: "cond", attr, op, value: value.map((v, i) => castScalar(attr, v, [...path, String(i)])) };
  }
  return { kind: "cond", attr, op, value: castScalar(attr, value, path) };
}

function parseFilterNode(node, type, path, state, depth) {
  if (!isPlainObject(node)) throw validationError("Filters must be an object.", path);
  const children = [];
  for (const [key, value] of Object.entries(node)) {
    const here = [...path, key];
    if (key === "$and" || key === "$or") {
      if (depth + 1 > LIMITS.logicDepth) throw validationError(`Logic operators nest at most ${LIMITS.logicDepth} levels.`, here);
      const items = Array.isArray(value) ? value : [value];
      children.push({
        kind: key.slice(1),
        children: items.map((item, i) => parseFilterNode(item, type, [...here, String(i)], state, depth + 1)),
      });
    } else if (key === "$not") {
      if (depth + 1 > LIMITS.logicDepth) throw validationError(`Logic operators nest at most ${LIMITS.logicDepth} levels.`, here);
      children.push({ kind: "not", children: [parseFilterNode(value, type, here, state, depth + 1)] });
    } else if (key.startsWith("$")) {
      throw validationError(`Unknown operator ${key}.`, here);
    } else {
      const attr = type.attributes.get(key);
      if (!attr) throw validationError(`Invalid filter key "${key}".`, here);
      const ops = isPlainObject(value) ? Object.entries(value) : [["$eq", value]];
      for (const [op, operand] of ops) {
        if (!op.startsWith("$")) throw validationError(`Filtering on relation "${key}" isn't supported yet.`, [...here, op]);
        state.conditions += 1;
        if (state.conditions > LIMITS.conditions) throw validationError(`Use at most ${LIMITS.conditions} filter conditions.`, [...here, op]);
        children.push(parseCondition(attr, op, operand, [...here, op]));
      }
    }
  }
  return { kind: "and", children };
}

function parseSort(value, type) {
  const items = toList(value);
  if (items.some((item) => typeof item !== "string")) throw validationError("Sort entries must be strings.", ["sort"]);
  if (items.length > LIMITS.sortKeys) throw validationError(`Sort by at most ${LIMITS.sortKeys} keys.`, ["sort"]);
  const sort = items.map((item, i) => {
    const [key, dir = "asc"] = item.split(":");
    const attr = type.attributes.get(key);
    if (!attr || !SORTABLE.has(attr.type)) throw validationError(`Can't sort by "${key}".`, ["sort", String(i)]);
    if (!/^(asc|desc)$/i.test(dir)) throw validationError(`Sort direction must be asc or desc.`, ["sort", String(i)]);
    return { attr, desc: dir.toLowerCase() === "desc" };
  });
  if (!sort.length) sort.push({ attr: type.attributes.get("publishedAt"), desc: true });
  if (!sort.some((s) => s.attr.key === "id")) sort.push({ attr: type.attributes.get("id"), desc: false });
  return sort;
}

function parseFields(value, type) {
  if (value === undefined) return null;
  const keys = toList(value);
  const fields = new Set();
  keys.forEach((key, i) => {
    if (typeof key !== "string" || !type.attributes.has(key)) throw validationError(`Invalid field "${key}".`, ["fields", String(i)]);
    fields.add(key);
  });
  return fields;
}

function parseTargetFields(value, path) {
  if (value === undefined) return null;
  const keys = toList(value);
  if (keys.some((key) => typeof key !== "string" || !/^[A-Za-z][A-Za-z0-9_]*$/.test(key))) throw validationError("Invalid populate fields.", path);
  return new Set(keys);
}

// Relations populate one level deep; media always resolves.
function parsePopulate(value, type) {
  const populate = new Map();
  if (value === undefined) return populate;
  const relations = type.fields.filter((f) => f.type === "reference" || f.type === "media");
  const add = (key, spec, path) => {
    const field = relations.find((f) => f.key === key);
    if (!field) throw validationError(`"${key}" isn't a relation or media field.`, path);
    if (field.type === "reference") populate.set(key, spec);
  };
  if (value === "*" || value === "true") {
    for (const f of relations) if (f.type === "reference") populate.set(f.key, { fields: null });
  } else if (isPlainObject(value)) {
    for (const [key, spec] of Object.entries(value)) {
      const path = ["populate", key];
      if (spec === "true" || spec === "*") add(key, { fields: null }, path);
      else if (isPlainObject(spec)) {
        if (spec.populate !== undefined) throw validationError("Populate is limited to one level.", [...path, "populate"]);
        const unknown = Object.keys(spec).find((k) => k !== "fields");
        if (unknown) throw validationError(`Unsupported populate option "${unknown}".`, [...path, unknown]);
        add(key, { fields: parseTargetFields(spec.fields, [...path, "fields"]) }, path);
      } else if (spec !== "false") throw validationError("Invalid populate value.", path);
    }
  } else {
    toList(value).forEach((key, i) => {
      if (typeof key !== "string") throw validationError("Invalid populate value.", ["populate", String(i)]);
      add(key, { fields: null }, ["populate", String(i)]);
    });
  }
  return populate;
}

function positiveInt(value, path, min) {
  const n = Number(value);
  if (typeof value !== "string" || !Number.isInteger(n) || n < min) throw validationError(`Expected an integer of at least ${min}.`, path);
  return n;
}

function parsePagination(value) {
  if (value === undefined) value = {};
  if (!isPlainObject(value)) throw validationError("Pagination must be an object.", ["pagination"]);
  const unknown = Object.keys(value).find((k) => !["page", "pageSize", "start", "limit", "withCount"].includes(k));
  if (unknown) throw validationError(`Unknown pagination option "${unknown}".`, ["pagination", unknown]);
  const byPage = "page" in value || "pageSize" in value;
  const byOffset = "start" in value || "limit" in value;
  if (byPage && byOffset) throw validationError("Use page/pageSize or start/limit, not both.", ["pagination"]);
  const withCount = value.withCount === undefined ? true : castBoolean(value.withCount, ["pagination", "withCount"]);
  if (byOffset) {
    const start = value.start === undefined ? 0 : positiveInt(value.start, ["pagination", "start"], 0);
    const limit = value.limit === undefined ? LIMITS.defaultPageSize : Math.min(positiveInt(value.limit, ["pagination", "limit"], 1), LIMITS.maxPageSize);
    return { mode: "offset", start, limit, offset: start, withCount };
  }
  const page = value.page === undefined ? 1 : positiveInt(value.page, ["pagination", "page"], 1);
  const pageSize = value.pageSize === undefined ? LIMITS.defaultPageSize : Math.min(positiveInt(value.pageSize, ["pagination", "pageSize"], 1), LIMITS.maxPageSize);
  return { mode: "page", page, pageSize, limit: pageSize, offset: (page - 1) * pageSize, withCount };
}

function parseLocale(value, defaultLocale) {
  if (value === undefined || value === "") return defaultLocale || null;
  if (typeof value !== "string" || !LOCALE.test(value)) throw validationError("Invalid locale.", ["locale"]);
  return value;
}

function checkCommon(query, allowed) {
  for (const key of Object.keys(query)) if (!allowed.has(key)) throw validationError(`Invalid query parameter "${key}".`, [key]);
  if (query.status !== undefined && query.status !== "published") {
    throw validationError("Only published content is delivered; drafts need a preview token.", ["status"]);
  }
}

export function parseListQuery(search, type, { defaultLocale = null } = {}) {
  const query = parseQueryString(search);
  checkCommon(query, LIST_PARAMS);
  const where = query.filters === undefined ? null : parseFilterNode(query.filters, type, ["filters"], { conditions: 0 }, 0);
  return {
    where,
    sort: parseSort(query.sort, type),
    fields: parseFields(query.fields, type),
    populate: parsePopulate(query.populate, type),
    pagination: parsePagination(query.pagination),
    locale: parseLocale(query.locale, defaultLocale),
  };
}

export function parseSingleQuery(search, type) {
  const query = parseQueryString(search);
  checkCommon(query, SINGLE_PARAMS);
  return {
    fields: parseFields(query.fields, type),
    populate: parsePopulate(query.populate, type),
    locale: query.locale === undefined ? null : parseLocale(query.locale, null),
  };
}

export const isUuid = (value) => typeof value === "string" && UUID.test(value);
