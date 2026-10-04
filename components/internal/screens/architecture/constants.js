// Lookups & formatters for the Architecture area. Config only — never row data.
// Row data lives behind lib/supabase/*.js; screens start empty + loading.

export const DATA_TYPE_MAP = {
  text: { label: "Text", variant: "neutral" },
  number: { label: "Number", variant: "info" },
  boolean: { label: "Boolean", variant: "success" },
  date: { label: "Date", variant: "purple" },
  reference: { label: "Reference", variant: "info" },
  richtext: { label: "Rich text", variant: "purple" },
};

export const DATA_TYPES = Object.keys(DATA_TYPE_MAP);

export const DATA_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Data Types" },
  ...DATA_TYPES.map((t) => ({ value: t, label: DATA_TYPE_MAP[t].label })),
];

export const SOURCE_TYPE_MAP = {
  API: { label: "API", variant: "info" },
  RSS: { label: "RSS", variant: "success" },
  CSV: { label: "CSV", variant: "neutral" },
  CMS: { label: "CMS", variant: "purple" },
};

export const SOURCE_TYPES = Object.keys(SOURCE_TYPE_MAP);

export const SOURCE_STATUS_MAP = {
  Connected: {
    label: "Connected",
    variant: "success",
    dotClass: "bg-emerald-400",
  },
  Syncing: { label: "Syncing", variant: "info", dotClass: "bg-sky-400" },
  Disconnected: {
    label: "Disconnected",
    variant: "neutral",
    dotClass: "bg-text-tertiary",
  },
  Error: { label: "Error", variant: "danger", dotClass: "bg-red-400" },
};

export const SOURCE_STATUSES = Object.keys(SOURCE_STATUS_MAP);

export const SOURCE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...SOURCE_STATUSES.map((s) => ({ value: s, label: s })),
];

// Validate one typed value against a field definition. Returns an error
// string, or "" when the value passes. Mirrors the `validation` jsonb shape
// ({ required, minLength, maxLength, min, max, pattern }).
export function validateFieldValue(field, value) {
  const rules =
    field?.validation && typeof field.validation === "object"
      ? field.validation
      : {};
  const label = field?.label || field?.key || "Field";
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  if (rules.required && empty) return `${label} is required.`;
  if (empty) return "";
  const type = field?.dataType || "text";
  if (type === "number") {
    const n = Number(value);
    if (Number.isNaN(n)) return `${label} must be a number.`;
    if (rules.min !== undefined && n < Number(rules.min))
      return `${label} must be at least ${rules.min}.`;
    if (rules.max !== undefined && n > Number(rules.max))
      return `${label} must be at most ${rules.max}.`;
    return "";
  }
  if (type === "boolean") {
    if (value !== true && value !== false && value !== "true" && value !== "false")
      return `${label} must be true or false.`;
    return "";
  }
  const s = String(value);
  if (rules.minLength !== undefined && s.length < Number(rules.minLength))
    return `${label} needs at least ${rules.minLength} characters.`;
  if (rules.maxLength !== undefined && s.length > Number(rules.maxLength))
    return `${label} must be at most ${rules.maxLength} characters.`;
  if (rules.pattern) {
    try {
      if (!new RegExp(rules.pattern).test(s))
        return `${label} does not match the required pattern.`;
    } catch {
      // A bad pattern in the schema never fails the value itself.
    }
  }
  return "";
}

// Validate a whole `entries.data` object against a field list.
export function validateEntryData(fields, data) {
  const errors = [];
  for (const field of fields || []) {
    const message = validateFieldValue(field, data?.[field.key]);
    if (message) errors.push({ key: field.key, message });
  }
  return errors;
}

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function keyify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
