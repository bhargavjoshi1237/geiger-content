import { isUuid } from "../vector/auth.mjs";

export function publicFetchOptions({ projectId, entryId } = {}) {
  // Publication changes must be visible immediately, including a previously missing page.
  if (entryId) return { cache: "no-store" };
  return {
    cache: "force-cache",
    next: { revalidate: 60, tags: ["content-public", ...(projectId ? [`content-project:${projectId}`] : [])] },
  };
}

export function publicEntryPath(entry, basePath = "") {
  if (!isUuid(entry?.id) || entry.status !== "Published" || entry.deleted_at || entry.deletedAt
    || entry.visibility === "private" || entry.metadata?.visibility === "private") return null;
  return `${basePath}/c/${entry.id}`;
}

export function publicScope({ projectId, slotKey } = {}) {
  return isUuid(projectId) && typeof slotKey === "string" && slotKey.trim().length > 0 && slotKey.length <= 200;
}

export function eligibleVariants(variants, entries, projectId) {
  const live = new Set(entries.filter((entry) => entry.project_id === projectId && entry.status === "Published" && !entry.deleted_at && entry.metadata?.visibility !== "private").map((entry) => entry.id));
  return variants.filter((variant) => variant.project_id === projectId && variant.status === "Active" && !variant.deleted_at && live.has(variant.entry_id));
}

export function safeDecisionContext(context = {}) {
  const result = {};
  for (const key of ["locale", "device"]) {
    const value = context?.[key];
    if (typeof value === "string" && /^[a-zA-Z0-9_-]{1,32}$/.test(value)) result[key] = value;
  }
  return result;
}
