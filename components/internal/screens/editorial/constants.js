// Lookups & formatters for the Editorial area. Config only — never row data.
// Row data lives behind lib/supabase/*.js; screens start empty + loading.

export const ASSIGNMENT_STATUS_MAP = {
  Open: { label: "Open", variant: "neutral", dotClass: "bg-text-tertiary" },
  "In progress": {
    label: "In progress",
    variant: "info",
    dotClass: "bg-sky-400",
  },
  Done: { label: "Done", variant: "success", dotClass: "bg-emerald-400" },
};

export const ASSIGNMENT_STATUSES = Object.keys(ASSIGNMENT_STATUS_MAP);

export const ASSIGNMENT_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...ASSIGNMENT_STATUSES.map((s) => ({ value: s, label: s })),
];

export const ASSIGNMENT_PRIORITY_MAP = {
  Low: { label: "Low", variant: "neutral" },
  Normal: { label: "Normal", variant: "info" },
  High: { label: "High", variant: "purple" },
  Urgent: { label: "Urgent", variant: "danger" },
};

export const ASSIGNMENT_PRIORITIES = Object.keys(ASSIGNMENT_PRIORITY_MAP);

export function formatDate(iso) {
  if (!iso) return "—";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return "—";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDate(iso)} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Naive JSON diff: walks two payload objects and reports added / removed /
// changed leaf paths. Enough for Compare & Rollback; not a merge engine.
export function diffPayloads(before, after, prefix = "") {
  const rows = [];
  const a = before && typeof before === "object" ? before : {};
  const b = after && typeof after === "object" ? after : {};
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const av = a[key];
    const bv = b[key];
    const aObj = av && typeof av === "object";
    const bObj = bv && typeof bv === "object";
    if (aObj && bObj) {
      rows.push(...diffPayloads(av, bv, path));
    } else if (JSON.stringify(av) !== JSON.stringify(bv)) {
      rows.push({
        path,
        kind: av === undefined ? "added" : bv === undefined ? "removed" : "changed",
        before: av === undefined ? "—" : JSON.stringify(av),
        after: bv === undefined ? "—" : JSON.stringify(bv),
      });
    }
  }
  return rows;
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
