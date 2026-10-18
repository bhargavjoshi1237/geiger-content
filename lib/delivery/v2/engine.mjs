// Delivery reads over an injected service-role client. Every entry query goes through scopedEntries(), which pins project, publication and visibility.
import { buildRegistry } from "./schema.mjs";
import { compileOrder, compileWhere } from "./compile.mjs";
import { mediaIds, paginationMeta, serializeEntry, serializeMedia } from "./serialize.mjs";
import { isUuid } from "./parse.mjs";
import { DeliveryError, notFoundError } from "./errors.mjs";

const FIELD_COLUMNS = "id, type_id, key, label, data_type, validation, localized, position, metadata, deleted_at";

function failure(scope, error) {
  console.error(`[delivery.v2.${scope}]`, error?.message || error);
  return new DeliveryError(500, "ApplicationError", "Couldn't load content.");
}

export async function loadProject(sb, projectId) {
  const [types, settings, locales] = await Promise.all([
    sb.from("content_types")
      .select(`id, key, name, api_id, api_plural, deleted_at, fields(${FIELD_COLUMNS})`)
      .eq("project_id", projectId)
      .is("deleted_at", null),
    sb.from("project_settings").select("default_locale, metadata").eq("project_id", projectId).maybeSingle(),
    sb.from("locales").select("code").eq("project_id", projectId).eq("is_default", true).is("deleted_at", null).limit(1),
  ]);
  if (types.error) throw failure("schema", types.error);
  if (settings.error) console.error("[delivery.v2.settings]", settings.error.message);
  if (locales.error) console.error("[delivery.v2.locales]", locales.error.message);
  const meta = settings.data?.metadata && typeof settings.data.metadata === "object" ? settings.data.metadata : {};
  const delivery = meta.delivery && typeof meta.delivery === "object" ? meta.delivery : {};
  return {
    registry: buildRegistry(types.data || [], (types.data || []).flatMap((t) => t.fields || [])),
    defaultLocale: locales.data?.[0]?.code || settings.data?.default_locale || null,
    publicDelivery: delivery.public !== false,
    publicSchema: delivery.publicSchema === true,
  };
}

export function canReadPrivate(caller) {
  return caller.scopes.has("delivery:read");
}

function scopedEntries(query, { projectId, caller }) {
  const scoped = query.eq("project_id", projectId).eq("status", "Published").is("deleted_at", null);
  return canReadPrivate(caller) ? scoped : scoped.or("metadata->>visibility.is.null,metadata->>visibility.neq.private");
}

async function loadMedia(sb, projectId, ids) {
  const unique = [...new Set(ids)].filter(isUuid);
  if (!unique.length) return new Map();
  const { data, error } = await sb
    .from("assets")
    .select("id, url, name, mime, alt, metadata")
    .eq("project_id", projectId)
    .in("id", unique)
    .is("deleted_at", null);
  if (error) throw failure("media", error);
  return new Map((data || []).map((asset) => [asset.id, serializeMedia(asset)]));
}

const refValues = (raw) => (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((v) => typeof v === "string" && v);

// Reference targets per (row, field): entry_references rows win; a bare id or slug stored in `data` is the fallback.
async function loadReferenceTargets(sb, ctx, rows, keys) {
  const { data, error } = await sb
    .from("entry_references")
    .select("from_entry_id, to_entry_id, field_key")
    .in("from_entry_id", rows.map((r) => r.id))
    .in("field_key", keys)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw failure("references", error);
  const links = new Map();
  for (const ref of data || []) {
    const id = `${ref.from_entry_id}:${ref.field_key}`;
    if (!links.has(id)) links.set(id, []);
    links.get(id).push(ref.to_entry_id);
  }
  for (const row of rows) {
    for (const key of keys) {
      const id = `${row.id}:${key}`;
      if (!links.has(id)) links.set(id, refValues(row.data?.[key]));
    }
  }
  const all = [...links.values()].flat();
  const ids = [...new Set(all.filter(isUuid))];
  const slugs = [...new Set(all.filter((v) => !isUuid(v) && v.length <= 200))];
  const lookups = [];
  if (ids.length) lookups.push(scopedEntries(sb.from("entries").select("*"), ctx).in("id", ids));
  if (slugs.length) lookups.push(scopedEntries(sb.from("entries").select("*"), ctx).in("slug", slugs));
  const results = await Promise.all(lookups);
  const targets = new Map();
  for (const result of results) {
    if (result.error) throw failure("references", result.error);
    for (const row of result.data || []) {
      targets.set(row.id, row);
      if (row.slug) targets.set(row.slug, row);
    }
  }
  return { links, targets };
}

// Rows -> delivered entries: one query for references, up to two for their targets, one for media.
async function hydrate(sb, ctx, rows, type, { fields, populate }) {
  if (!rows.length) return [];
  const { registry } = ctx.project;
  const wanted = (key) => !fields || fields.has(key);
  const keys = [...populate.keys()].filter(wanted);
  const { links, targets } = keys.length ? await loadReferenceTargets(sb, ctx, rows, keys) : { links: new Map(), targets: new Map() };
  const targetRows = [...new Set(targets.values())].filter((row) => registry.byId.has(row.type_id));
  const media = await loadMedia(sb, ctx.projectId, [
    ...rows.flatMap((row) => mediaIds(row, type)),
    ...targetRows.flatMap((row) => mediaIds(row, registry.byId.get(row.type_id))),
  ]);
  return rows.map((row) => {
    const populated = new Map();
    for (const key of keys) {
      const field = type.fields.find((f) => f.key === key);
      const items = (links.get(`${row.id}:${key}`) || [])
        .map((ref) => targets.get(ref))
        .filter((target) => target && registry.byId.has(target.type_id))
        .map((target) => serializeEntry(target, registry.byId.get(target.type_id), { fields: populate.get(key).fields, media }));
      populated.set(key, field.multiple ? items : items[0] ?? null);
    }
    return serializeEntry(row, type, { fields, media, populated });
  });
}

export async function findEntries(sb, ctx, type, ir) {
  const where = compileWhere(ir.where);
  const build = (columns, options) => {
    let query = scopedEntries(sb.from("entries").select(columns, options), ctx).eq("type_id", type.id);
    if (ir.locale) query = query.eq("locale", ir.locale);
    return where ? query.or(where) : query;
  };
  const { offset, limit, withCount } = ir.pagination;
  let query = build("*", withCount ? { count: "exact" } : undefined);
  for (const order of compileOrder(ir.sort)) query = query.order(order.column, { ascending: order.ascending, nullsFirst: false });
  const result = await query.range(offset, offset + limit - 1);
  let rows = result.data || [];
  let total = withCount ? result.count : null;
  if (result.error) {
    // PGRST103: the requested page starts past the last row.
    if (result.error.code !== "PGRST103") throw failure("list", result.error);
    rows = [];
    if (withCount) {
      const head = await build("id", { count: "exact", head: true });
      if (head.error) throw failure("count", head.error);
      total = head.count;
    }
  }
  const data = await hydrate(sb, ctx, rows, type, ir);
  return { data, meta: { pagination: paginationMeta(ir.pagination, withCount ? total ?? 0 : null, data.length) } };
}

export async function findEntry(sb, ctx, type, idOrSlug, ir) {
  if (!idOrSlug || idOrSlug.length > 200) throw notFoundError("Entry not found.");
  let query = scopedEntries(sb.from("entries").select("*"), ctx).eq("type_id", type.id);
  query = isUuid(idOrSlug) ? query.eq("id", idOrSlug.toLowerCase()) : query.eq("slug", idOrSlug);
  if (ir.locale) query = query.eq("locale", ir.locale);
  const { data, error } = await query.limit(1);
  if (error) throw failure("single", error);
  if (!data?.length) throw notFoundError("Entry not found.");
  const [entry] = await hydrate(sb, ctx, data, type, ir);
  return { data: entry, meta: {} };
}
