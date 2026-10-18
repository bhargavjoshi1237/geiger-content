// Content-type registry for delivery: which attributes a type exposes and how each is stored.

export const FIELD_TYPES = ["text", "number", "boolean", "date", "enum", "json", "richtext", "media", "reference"];

// Keys the envelope owns; a field using one is never delivered.
export const RESERVED_KEYS = new Set([
  "id", "documentId", "slug", "locale", "type", "status", "publishedAt", "createdAt", "updatedAt", "meta", "localizations",
]);

// Field keys travel inside PostgREST filter paths, so only plain identifiers are deliverable.
export const FIELD_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

// System attributes: always delivered, filterable and sortable.
export const SYSTEM_ATTRIBUTES = {
  id: { column: "id", type: "id" },
  slug: { column: "slug", type: "text" },
  locale: { column: "locale", type: "text" },
  publishedAt: { column: "published_at", type: "datetime" },
  createdAt: { column: "created_at", type: "datetime" },
  updatedAt: { column: "updated_at", type: "datetime" },
};

// Built-in entry columns, delivered under these keys unless a typed field reuses the key.
export const BUILTIN_ATTRIBUTES = {
  title: { column: "title", type: "text" },
  excerpt: { column: "excerpt", type: "text" },
  body: { column: "body", type: "richtext" },
  author: { column: "author", type: "text" },
  coverUrl: { column: "cover_url", type: "text" },
};

export function isPrivateField(field) {
  return field?.metadata?.private === true;
}

export function isDeliverableField(field) {
  return Boolean(field) && !field.deleted_at && !isPrivateField(field)
    && FIELD_KEY_PATTERN.test(field.key || "") && !RESERVED_KEYS.has(field.key);
}

function fieldDescriptor(row) {
  const validation = row.validation && typeof row.validation === "object" ? row.validation : {};
  const type = FIELD_TYPES.includes(row.data_type) ? row.data_type : "text";
  const options = Array.isArray(validation.options) ? validation.options.map(String) : [];
  return {
    key: row.key,
    label: row.label || row.key,
    type,
    required: validation.required === true,
    multiple: (type === "media" || type === "reference") && validation.multiple === true,
    localized: Boolean(row.localized),
    ...(type === "enum" ? { options } : {}),
  };
}

// Builds the per-project registry from raw `content_types` and `fields` rows (snake_case).
export function buildRegistry(typeRows = [], fieldRows = []) {
  const fieldsByType = new Map();
  for (const row of [...fieldRows].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
    if (!isDeliverableField(row)) continue;
    if (!fieldsByType.has(row.type_id)) fieldsByType.set(row.type_id, []);
    fieldsByType.get(row.type_id).push(fieldDescriptor(row));
  }
  const types = typeRows
    .filter((row) => !row.deleted_at && row.api_id && row.api_plural)
    .map((row) => {
      const fields = fieldsByType.get(row.id) || [];
      const attributes = new Map();
      for (const [key, attr] of Object.entries(SYSTEM_ATTRIBUTES)) attributes.set(key, { key, source: "column", ...attr });
      for (const [key, attr] of Object.entries(BUILTIN_ATTRIBUTES)) attributes.set(key, { key, source: "column", builtin: true, ...attr });
      for (const field of fields) attributes.set(field.key, { key: field.key, source: "data", type: field.type, field });
      return { id: row.id, key: row.key, name: row.name, apiId: row.api_id, apiPlural: row.api_plural, fields, attributes };
    })
    .sort((a, b) => a.apiId.localeCompare(b.apiId));
  return {
    types,
    byPlural: new Map(types.map((t) => [t.apiPlural, t])),
    byId: new Map(types.map((t) => [t.id, t])),
  };
}

// The public `_schema` document; type generation reads this same shape.
export function schemaDocument(registry) {
  return {
    types: registry.types.map((t) => ({
      name: t.name,
      apiId: t.apiId,
      apiPlural: t.apiPlural,
      builtins: Object.keys(BUILTIN_ATTRIBUTES).filter((key) => t.attributes.get(key)?.builtin),
      fields: t.fields,
    })),
  };
}
