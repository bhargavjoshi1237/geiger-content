// Row -> delivered entry, driven only by the type's field schema; keys outside the schema never leave.
import { BUILTIN_ATTRIBUTES } from "./schema.mjs";

export function castValue(field, raw) {
  if (raw === undefined || raw === null) return null;
  if (raw === "" && field.type !== "text" && field.type !== "richtext") return null;
  switch (field.type) {
    case "number": {
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    case "boolean":
      if (raw === true || raw === "true") return true;
      if (raw === false || raw === "false") return false;
      return null;
    case "date":
      return typeof raw === "string" ? raw : null;
    case "enum": {
      const value = String(raw);
      return !field.options?.length || field.options.includes(value) ? value : null;
    }
    case "json":
    case "richtext":
      return raw;
    default:
      return typeof raw === "string" ? raw : typeof raw === "object" ? JSON.stringify(raw) : String(raw);
  }
}

const idsOf = (raw) => (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((v) => typeof v === "string" && v);

// Asset ids referenced by an entry's media fields.
export function mediaIds(row, type) {
  return type.fields.filter((f) => f.type === "media").flatMap((f) => idsOf(row.data?.[f.key]));
}

function mediaValue(field, raw, media) {
  const items = idsOf(raw).map((id) => media.get(id)).filter(Boolean);
  return field.multiple ? items : items[0] ?? null;
}

export function serializeMedia(asset) {
  const meta = asset.metadata && typeof asset.metadata === "object" ? asset.metadata : {};
  const dimension = (v) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : null);
  return {
    id: asset.id,
    url: asset.url || "",
    name: asset.name || "",
    mime: asset.mime || "",
    width: dimension(meta.width),
    height: dimension(meta.height),
    alt: asset.alt || "",
  };
}

// `populated` maps reference field key -> already-serialized target(s); unpopulated references are left out.
export function serializeEntry(row, type, { fields = null, media = new Map(), populated = new Map() } = {}) {
  const wanted = (key) => !fields || fields.has(key);
  const out = {
    id: row.id,
    slug: row.slug ?? "",
    locale: row.locale ?? "",
    type: type.apiId,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
  for (const [key, attr] of Object.entries(BUILTIN_ATTRIBUTES)) {
    if (type.attributes.get(key)?.builtin && wanted(key)) out[key] = row[attr.column] ?? "";
  }
  const data = row.data && typeof row.data === "object" ? row.data : {};
  for (const field of type.fields) {
    if (!wanted(field.key)) continue;
    if (field.type === "reference") {
      if (populated.has(field.key)) out[field.key] = populated.get(field.key);
    } else if (field.type === "media") {
      out[field.key] = mediaValue(field, data[field.key], media);
    } else {
      out[field.key] = castValue(field, data[field.key]);
    }
  }
  return out;
}

export function paginationMeta(pagination, total, rowCount) {
  const known = Number.isInteger(total);
  if (pagination.mode === "offset") {
    return { start: pagination.start, limit: pagination.limit, ...(known ? { total } : {}) };
  }
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(known ? { pageCount: Math.ceil(total / pagination.pageSize), total } : { count: rowCount }),
  };
}
