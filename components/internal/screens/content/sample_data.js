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

export const CONTENTS = [
  {
    id: "7b1c0e9a-4d2f-4a1b-9c3e-1f5a8d6b2c01",
    title: "Getting started with the Content OS",
    slug: "getting-started",
    status: "Published",
    type: "Guide",
    excerpt: "Model once, write anywhere — how entries, slots, and delivery fit together.",
    body: "",
    author: "Ava Mitchell",
    locale: "en",
    coverUrl: "",
    updatedAt: "2026-06-18",
  },
  {
    id: "a2d4f6e8-1b3c-4d5e-8f90-2a3b4c5d6e02",
    title: "Homepage hero copy",
    slug: "homepage-hero",
    status: "In review",
    type: "Page",
    excerpt: "Hero variants for the marketing site, pending brand approval.",
    body: "",
    author: "Marco Reyes",
    locale: "en",
    coverUrl: "",
    updatedAt: "2026-06-12",
  },
  {
    id: "c3e5079b-2c4d-4e6f-9a01-3b4c5d6e7f03",
    title: "Changelog — June release",
    slug: "changelog-june",
    status: "Draft",
    type: "Article",
    excerpt: "Draft notes for slots, targeting rules, and edge decisions.",
    body: "",
    author: "Priya Shah",
    locale: "en",
    coverUrl: "",
    updatedAt: "2026-06-20",
  },
  {
    id: "d4f618ac-3d5e-4f70-ab12-4c5d6e7f8004",
    title: "API authentication",
    slug: "api-auth",
    status: "Published",
    type: "Doc",
    excerpt: "Token scopes and preview URLs for delivery APIs.",
    body: "",
    author: "Lena Okafor",
    locale: "en",
    coverUrl: "",
    updatedAt: "2026-07-02",
  },
  {
    id: "e50729bd-4e6f-4081-bc23-5d6e7f809105",
    title: "Launch checklist",
    slug: "launch-checklist",
    status: "Scheduled",
    type: "Guide",
    excerpt: "Reviews, approvals, and release gating before publish.",
    body: "",
    author: "Marco Reyes",
    locale: "en",
    coverUrl: "",
    updatedAt: "2026-06-28",
  },
  {
    id: "f61830ce-5f70-4192-cd34-6e7f8091a206",
    title: "Brand voice guidelines",
    slug: "brand-voice",
    status: "Archived",
    type: "Page",
    excerpt: "Superseded tone doc — kept for history.",
    body: "",
    author: "Priya Shah",
    locale: "en",
    coverUrl: "",
    updatedAt: "2026-05-22",
  },
];

export function formatDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) return "";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
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
