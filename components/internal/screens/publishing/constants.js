// Publishing lookups & formatters — config only; row data comes from lib/supabase/*.

export const QUEUE_STATUS_MAP = {
  Scheduled: { label: "Scheduled", variant: "purple", dotClass: "bg-violet-300" },
  "In review": { label: "In review", variant: "info", dotClass: "bg-sky-400" },
  Published: { label: "Published", variant: "success", dotClass: "bg-emerald-400" },
  Draft: { label: "Draft", variant: "neutral", dotClass: "bg-text-tertiary" },
};

export const QUEUE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "In review", label: "In review" },
  { value: "Published", label: "Published" },
];

export const WEBHOOK_STATUS_MAP = {
  Active: { label: "Active", variant: "success", dotClass: "bg-emerald-400" },
  Paused: { label: "Paused", variant: "warning", dotClass: "bg-amber-400" },
  Disabled: { label: "Disabled", variant: "outline", dotClass: "bg-text-tertiary" },
};

export const DELIVERY_STATUS_MAP = {
  Delivered: { label: "Delivered", variant: "success", dotClass: "bg-emerald-400" },
  Failed: { label: "Failed", variant: "danger", dotClass: "bg-red-400" },
  Pending: { label: "Pending", variant: "neutral", dotClass: "bg-text-tertiary" },
};

export const SITE_STATUS_MAP = {
  Active: { label: "Active", variant: "success", dotClass: "bg-emerald-400" },
  Paused: { label: "Paused", variant: "warning", dotClass: "bg-amber-400" },
  Draft: { label: "Draft", variant: "neutral", dotClass: "bg-text-tertiary" },
};

export const INVALIDATION_STATUS_MAP = {
  "Revalidation requested": { label: "Requested", variant: "info", dotClass: "bg-sky-400" },
};

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
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

export function envKeyify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
