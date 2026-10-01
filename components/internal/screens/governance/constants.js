// Lookups & formatters for the Governance area. Config only — never row data.
// Row data lives behind lib/supabase/{rbac,audit,policies}.js; screens start
// empty + loading.

export const GRANT_STATUS_MAP = {
  active: { label: "Active", variant: "success", dotClass: "bg-emerald-400" },
  invited: { label: "Invited", variant: "info", dotClass: "bg-sky-400" },
  suspended: {
    label: "Suspended",
    variant: "neutral",
    dotClass: "bg-[#737373]",
  },
};

export const ENFORCED_MAP = {
  Enforced: { label: "Enforced", variant: "success", dotClass: "bg-emerald-400" },
  Disabled: { label: "Disabled", variant: "neutral", dotClass: "bg-[#737373]" },
};

export const ACTION_MAP = {
  create: { label: "Create", variant: "success" },
  update: { label: "Update", variant: "info" },
  delete: { label: "Delete", variant: "destructive" },
  publish: { label: "Publish", variant: "purple" },
};

export const RETENTION_ACTION_OPTIONS = [
  { value: "archive", label: "Archive" },
  { value: "soft_delete", label: "Soft delete" },
  { value: "purge", label: "Purge" },
];

export const RETENTION_SCOPE_OPTIONS = [
  { value: "entries", label: "Entries" },
  { value: "collections", label: "Collections" },
  { value: "assets", label: "Assets" },
  { value: "slots", label: "Content slots" },
  { value: "audit_log", label: "Audit log" },
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
  const date = formatDate(iso);
  const time = String(iso).slice(11, 16);
  return time ? `${date} · ${time}` : date;
}

export function shortId(id) {
  const s = String(id || "");
  return s.length > 13 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s || "—";
}

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
