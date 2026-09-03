// Lookups & formatters for the Content area. Config only — never row data.
// Row data lives behind lib/supabase/*.js; screens start empty + loading.

export const CONTENT_STATUS_MAP = {
  Published: { label: "Published", variant: "success", dotClass: "bg-emerald-400" },
  "In review": { label: "In review", variant: "info", dotClass: "bg-sky-400" },
  Draft: { label: "Draft", variant: "neutral", dotClass: "bg-[#737373]" },
  Scheduled: { label: "Scheduled", variant: "purple", dotClass: "bg-violet-300" },
  Archived: { label: "Archived", variant: "outline", dotClass: "bg-[#525252]" },
};

export const CONTENT_TYPE_MAP = {
  Article: { label: "Article", variant: "neutral" },
  Page: { label: "Page", variant: "info" },
  Guide: { label: "Guide", variant: "purple" },
  Doc: { label: "Doc", variant: "success" },
};

export const CONTENT_TYPES = Object.keys(CONTENT_TYPE_MAP);
export const CONTENT_STATUSES = Object.keys(CONTENT_STATUS_MAP);

export const CONTENT_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...CONTENT_STATUSES.map((s) => ({ value: s, label: s })),
];

export const CONTENT_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  ...CONTENT_TYPES.map((t) => ({ value: t, label: t })),
];

export const COLLECTION_STATUS_MAP = {
  Published: { label: "Published", variant: "success", dotClass: "bg-emerald-400" },
  Draft: { label: "Draft", variant: "neutral", dotClass: "bg-[#737373]" },
  Archived: { label: "Archived", variant: "outline", dotClass: "bg-[#525252]" },
};

export const ASSET_TYPE_MAP = {
  image: { label: "Image", variant: "success" },
  video: { label: "Video", variant: "info" },
  document: { label: "Document", variant: "neutral" },
  audio: { label: "Audio", variant: "purple" },
  other: { label: "Other", variant: "outline" },
};

export const ASSET_TYPES = Object.keys(ASSET_TYPE_MAP);

export const ASSET_STATUS_MAP = {
  Ready: { label: "Ready", variant: "success", dotClass: "bg-emerald-400" },
  Processing: { label: "Processing", variant: "info", dotClass: "bg-sky-400" },
  Archived: { label: "Archived", variant: "outline", dotClass: "bg-[#525252]" },
};

export const SLOT_STATUS_MAP = {
  Active: { label: "Active", variant: "success", dotClass: "bg-emerald-400" },
  Paused: { label: "Paused", variant: "neutral", dotClass: "bg-[#737373]" },
  Archived: { label: "Archived", variant: "outline", dotClass: "bg-[#525252]" },
};

export function formatDate(iso) {
  if (!iso) return "";
  // Accepts YYYY-MM-DD or full ISO timestamps.
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return "";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[u]}`;
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

export const newContentId = newId;

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slotKeyify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
