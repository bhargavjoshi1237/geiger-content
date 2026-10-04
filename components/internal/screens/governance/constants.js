// Governance lookups & formatters — config only; rows come from lib/supabase/{rbac,audit,policies}.js.

export const GRANT_STATUS_MAP = {
  active: { label: "Active", variant: "success", dotClass: "bg-emerald-400" },
  invited: { label: "Invited", variant: "info", dotClass: "bg-sky-400" },
  suspended: {
    label: "Suspended",
    variant: "neutral",
    dotClass: "bg-text-tertiary",
  },
};

export const ENFORCED_MAP = {
  Enforced: { label: "Enforced", variant: "success", dotClass: "bg-emerald-400" },
  Disabled: { label: "Disabled", variant: "neutral", dotClass: "bg-text-tertiary" },
};

export const ACTION_MAP = {
  create: { label: "Create", variant: "success" },
  update: { label: "Update", variant: "info" },
  delete: { label: "Delete", variant: "danger" },
  publish: { label: "Publish", variant: "purple" },
};

export const ROLE_TYPE_MAP = {
  system: { label: "System", variant: "info", dotClass: "bg-sky-400" },
  custom: { label: "Custom", variant: "neutral", dotClass: "bg-text-tertiary" },
};

export const RETENTION_ACTION_MAP = {
  archive: { label: "Archive", variant: "neutral", dotClass: "bg-text-tertiary" },
  soft_delete: { label: "Soft delete", variant: "warning", dotClass: "bg-amber-400" },
  purge: { label: "Purge", variant: "danger", dotClass: "bg-red-400" },
};

export const CONSENT_STATUS_MAP = {
  granted: { label: "Granted", variant: "success", dotClass: "bg-emerald-400" },
  denied: { label: "Denied", variant: "danger", dotClass: "bg-red-400" },
  pending: { label: "Pending", variant: "warning", dotClass: "bg-amber-400" },
};

export const PERMISSION_RESULT_MAP = {
  allowed: { label: "Allowed", variant: "success", dotClass: "bg-emerald-400" },
  denied: { label: "Denied", variant: "danger", dotClass: "bg-red-400" },
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
