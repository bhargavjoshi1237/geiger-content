// Lookups & formatters for the Audiences area. Config only — never row data.
// Row data lives behind lib/supabase/{events,profiles,segments,consent,
// metrics,data_connections}.js; screens start empty + loading.

export const EVENT_TYPE_MAP = {
  page_view: { label: "Page view", variant: "info", dotClass: "bg-sky-400" },
  conversion: {
    label: "Conversion",
    variant: "success",
    dotClass: "bg-emerald-400",
  },
  session_start: {
    label: "Session start",
    variant: "neutral",
    dotClass: "bg-text-tertiary",
  },
  click: { label: "Click", variant: "purple", dotClass: "bg-violet-300" },
  signup: { label: "Signup", variant: "success", dotClass: "bg-emerald-400" },
};

export const EVENT_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  ...Object.keys(EVENT_TYPE_MAP).map((t) => ({
    value: t,
    label: EVENT_TYPE_MAP[t].label,
  })),
];

export const CONSENT_STATUS_MAP = {
  granted: { label: "Granted", variant: "success", dotClass: "bg-emerald-400" },
  denied: { label: "Denied", variant: "danger", dotClass: "bg-red-400" },
  pending: { label: "Pending", variant: "neutral", dotClass: "bg-text-tertiary" },
};

export const CONSENT_PURPOSES = ["analytics", "personalization", "marketing"];

export const CONNECTION_TYPE_MAP = {
  webhook: { label: "Webhook", variant: "info" },
  warehouse: { label: "Warehouse", variant: "purple" },
  cdp: { label: "CDP", variant: "success" },
  csv: { label: "CSV import", variant: "neutral" },
  api: { label: "API", variant: "info" },
};

export const CONNECTION_TYPES = Object.keys(CONNECTION_TYPE_MAP);

export const CONNECTION_STATUS_MAP = {
  Active: { label: "Active", variant: "success", dotClass: "bg-emerald-400" },
  Paused: { label: "Paused", variant: "neutral", dotClass: "bg-text-tertiary" },
  Error: { label: "Error", variant: "danger", dotClass: "bg-red-400" },
};

export const SEGMENT_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "exists",
  "not_exists",
];

export function formatDate(iso) {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return "";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
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

export function isAnonymousProfile(p) {
  return (p?.identifiers || []).length <= 1;
}
