// The app's own /api/* routes, answered in the browser from the playground's in-memory database (see
// ./intercept_fetch.js). Each handler mirrors its server route in app/api/** closely enough for the screens
// to read it unchanged; services that need a server (embeddings, the generation provider) answer from
// the seed instead.
import { decideOverVariants, normalizeVariant } from "@/lib/decide-core";
import { eligibleVariants, safeDecisionContext } from "@/lib/delivery/core.mjs";
import { json } from "./intercept_fetch.js";
import { getPlaygroundDb, PLAYGROUND_USER } from "./db.js";
import { PLAYGROUND_PROJECT } from "./mode.js";
import { vectorRoutes } from "./vector_routes.js";

const table = (name) => getPlaygroundDb().table(`content.${name}`);
const live = (row) => row.deleted_at == null;
const now = () => new Date().toISOString();
const byNewest = (key) => (a, b) => String(b[key] ?? "").localeCompare(String(a[key] ?? ""));

function isPublished(entry, projectId) {
  return live(entry) && entry.status === "Published" && entry.project_id === projectId;
}

// app/api/content/v1/entries/route.js normalize().
function deliveryEntry(row) {
  return {
    id: row.id,
    title: row.title ?? "",
    slug: row.slug ?? "",
    status: row.status ?? "Published",
    type: row.type ?? "Article",
    excerpt: row.excerpt ?? "",
    body: row.body ?? "",
    author: row.author ?? "",
    locale: row.locale ?? "en",
    coverUrl: row.cover_url ?? "",
    environmentId: row.environment_id ?? null,
    projectId: row.project_id ?? null,
    scheduledAt: row.scheduled_at ?? null,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

function listEntries({ query }) {
  const project = query.project || query.projectId;
  if (!project) return json({ error: "Pass ?project=<project id>." }, 400);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
  return table("entries")
    .filter((e) => isPublished(e, project) && (!query.type || e.type === query.type))
    .sort(byNewest("published_at"))
    .slice(0, limit)
    .map(deliveryEntry);
}

function entryBySlug({ params, query }) {
  const project = query.project || query.projectId;
  if (!project) return json({ error: "Pass ?project=<project id>." }, 400);
  const row = table("entries").find((e) => e.slug === params.slug && isPublished(e, project));
  return row ? deliveryEntry(row) : json({ error: "Not found." }, 404);
}

// app/api/content/v1/graphql/route.js: the same bounded subset of selection syntax.
const GRAPHQL_FIELDS = new Map([
  ["id", "id"], ["title", "title"], ["slug", "slug"], ["status", "status"], ["type", "type"],
  ["excerpt", "excerpt"], ["body", "body"], ["author", "author"], ["locale", "locale"],
  ["coverUrl", "cover_url"], ["cover_url", "cover_url"], ["publishedAt", "published_at"], ["published_at", "published_at"],
]);
const UNSUPPORTED = "Unsupported query. Try `{ entries(projectId: \"<project id>\") { id title slug status } }` or `{ entry(slug: \"…\", projectId: \"<project id>\") { id title slug status } }`.";

function graphql({ body, query }) {
  const source = body?.query ?? query.query;
  const fail = (messages, status = 400) =>
    json({ data: null, errors: messages.map((message) => ({ message })), extensions: { geigerGraphql: "v1-placeholder" } }, status);
  if (!source || typeof source !== "string") return fail(["`query` must be a non-empty string."]);
  const names = source.match(/\{([^{}]*)\}\s*\}?\s*$/)?.[1].trim().split(/[\s,]+/).filter((n) => GRAPHQL_FIELDS.has(n));
  if (!names?.length) return fail([UNSUPPORTED]);
  const pick = (row) => Object.fromEntries(names.map((n) => [n, row[GRAPHQL_FIELDS.get(n)] ?? null]));
  const argument = (args, name) => String(args || "").match(new RegExp(`\\b${name}\\s*:\\s*"([^"]+)"`))?.[1] || null;
  const single = source.match(/\bentry\s*\(([^)]*)\)/);
  if (single) {
    const slug = argument(single[1], "slug");
    const projectId = argument(single[1], "projectId");
    if (!slug || !projectId) return fail(['Use `{ entry(slug: "…", projectId: "<project id>") { … } }`.']);
    const row = table("entries").find((e) => e.slug === slug && isPublished(e, projectId));
    return { data: { entry: row ? pick(row) : null }, extensions: { geigerGraphql: "v1-placeholder" } };
  }
  if (/\bentries\b/.test(source)) {
    const projectId = argument(source.match(/\bentries\s*\(([^)]*)\)/)?.[1], "projectId");
    if (!projectId) return fail(['Use `{ entries(projectId: "<project id>") { … } }`.']);
    const rows = table("entries").filter((e) => isPublished(e, projectId)).sort(byNewest("published_at")).slice(0, 50);
    return { data: { entries: rows.map(pick) }, extensions: { geigerGraphql: "v1-placeholder" } };
  }
  return fail([UNSUPPORTED]);
}

// app/api/decide/route.js; the workspace inspector sends no project id, so it decides for the playground's.
function decide({ body }) {
  const { slotKey, profile = {}, context = {} } = body || {};
  const projectId = body?.projectId || PLAYGROUND_PROJECT.id;
  if (typeof slotKey !== "string" || !slotKey.trim()) return json({ error: "A valid projectId and slotKey are required." }, 400);
  const slot = table("slots").find((s) => live(s) && s.project_id === projectId && s.key === slotKey);
  if (!slot) return json({ error: "Slot not found." }, 404);
  const entries = table("entries").filter((e) => isPublished(e, projectId));
  const variants = eligibleVariants(
    table("variants").filter((v) => v.slot_id === slot.id).sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0)),
    entries,
    projectId,
  ).map(normalizeVariant);
  const decision = decideOverVariants(variants, { profile, context });
  if (!decision.entryId && entries.some((e) => e.id === slot.fallback_entry_id && e.metadata?.visibility !== "private")) {
    decision.entryId = slot.fallback_entry_id;
    decision.variantId = null;
    decision.reason = "No eligible targeted variant matched; selected the published slot fallback.";
  }
  table("decision_traces").unshift({
    id: crypto.randomUUID(), project_id: projectId, slot_id: slot.id, entry_id: decision.entryId, variant_id: decision.variantId,
    reason: decision.reason, context: safeDecisionContext(context), created_at: now(),
  });
  return decision;
}

// The collect beacon: page views land in the event stream.
function collect({ body }) {
  const events = Array.isArray(body?.events) ? body.events : body ? [body] : [];
  for (const event of events) {
    table("events").unshift({
      id: crypto.randomUUID(), project_id: event.projectId || PLAYGROUND_PROJECT.id, entry_id: event.entryId ?? null,
      anonymous_id: event.anonymousId ?? null, type: event.type || "page_view", context: event.context || {}, at: now(), metadata: {}, created_at: now(),
    });
  }
  return json({ accepted: events.length }, 202);
}

// app/api/consent/route.js -> lib/vector/consent.mjs saveConsent: one row per profile + purpose.
function saveConsent({ body }) {
  const { profileId, purpose, status } = body || {};
  if (!["analytics", "personalization", "marketing"].includes(purpose) || !["granted", "denied", "pending"].includes(status)) {
    return json({ error: "Choose a valid profile, purpose and consent status." }, 400);
  }
  const rows = table("consent_state");
  let row = rows.find((r) => r.profile_id === profileId && r.purpose === purpose && live(r));
  if (row) Object.assign(row, { status, updated_at: now() });
  else {
    row = { id: crypto.randomUUID(), profile_id: profileId, purpose, status, created_at: now(), updated_at: now() };
    rows.unshift(row);
  }
  return { id: row.id, profile_id: row.profile_id, purpose: row.purpose, status: row.status, updated_at: row.updated_at };
}

// app/api/cache-invalidation/route.js
function invalidations({ query }) {
  const projectId = query.projectId;
  const entries = table("entries").filter((e) => isPublished(e, projectId)).slice(0, 100).map((e) => ({ id: e.id, title: e.title }));
  const history = table("audit_log")
    .filter((r) => r.project_id === projectId && r.action === "cache.invalidated")
    .sort(byNewest("at"))
    .slice(0, 100)
    .map((row) => ({ id: row.id, path: row.diff?.path || `/c/${row.entity_id}`, at: row.at, status: "Revalidation requested" }));
  return { entries, history };
}

function invalidate({ query, body }) {
  const projectId = query.projectId;
  const entry = table("entries").find((e) => e.id === body?.entryId && isPublished(e, projectId));
  if (!entry) return json({ error: "Choose a published entry in this project." }, 404);
  const path = `/c/${entry.id}`;
  table("audit_log").unshift({
    id: crypto.randomUUID(), project_id: projectId, actor: PLAYGROUND_USER.id, action: "cache.invalidated", entity: "entry",
    entity_id: entry.id, diff: { path, scope: "next_delivery_cache" }, at: now(),
  });
  return { path, status: "Revalidation requested" };
}

// app/api/assistant/route.js; the playground has no generation provider, so answers come from a small
// editorial playbook keyed on the request, saved to history like the real thing.
function assistantHistory({ query }) {
  const history = table("assistant_messages")
    .filter((m) => m.project_id === query.projectId && m.created_by === PLAYGROUND_USER.id)
    .sort(byNewest("created_at"))
    .slice(0, 20)
    .map(({ id, prompt, response, entry_id, created_at }) => ({ id, prompt, response, entry_id, created_at }));
  const entries = table("entries")
    .filter((e) => live(e) && e.project_id === query.projectId)
    .sort(byNewest("updated_at"))
    .slice(0, 100)
    .map(({ id, title }) => ({ id, title }));
  return { configured: true, history, entries };
}

function suggest(prompt, entry) {
  const subject = entry ? `“${entry.title}”` : "this piece";
  const ask = String(prompt).toLowerCase();
  if (/headline|title/.test(ask)) {
    return `Three options for ${subject}:\n1. Lead with the outcome the reader gets.\n2. Name the audience in the first four words.\n3. Swap the abstract noun for a concrete verb.\nKeep it under 60 characters so it survives search snippets.`;
  }
  if (/summar|excerpt|intro/.test(ask)) {
    return `Open ${subject} with the result, then the one step that gets the reader there. ${entry?.excerpt ? `A tighter excerpt: “${String(entry.excerpt).split(/[.!?]/)[0].trim()}.”` : ""}`.trim();
  }
  if (/seo|search/.test(ask)) {
    return `For ${subject}: put the primary phrase in the title and first paragraph, write a 150-character description that promises a result, and link two related guides from the body.`;
  }
  return `For ${subject}: cut the first paragraph to two sentences, move the strongest example up, and end with a single next step. Flag any claim that needs a source before review.`;
}

function askAssistant({ query, body }) {
  const prompt = String(body?.prompt || "").trim();
  if (!prompt) return json({ error: "Write a request first." }, 400);
  const entry = body?.entryId ? table("entries").find((e) => e.id === body.entryId && live(e)) : null;
  const row = {
    id: crypto.randomUUID(), project_id: query.projectId, created_by: PLAYGROUND_USER.id, prompt,
    response: suggest(prompt, entry), model: "playground", entry_id: entry?.id ?? null, created_at: now(),
  };
  table("assistant_messages").unshift(row);
  return { id: row.id, prompt: row.prompt, response: row.response, entry_id: row.entry_id, created_at: row.created_at };
}

export const apiRoutes = [
  ["GET", "/api/content/v1/entries", listEntries],
  ["GET", "/api/content/v1/entries/:slug", entryBySlug],
  ["POST", "/api/content/v1/graphql", graphql],
  ["GET", "/api/content/v1/graphql", graphql],
  ["POST", "/api/content/v1/collect", collect],
  ["POST", "/api/decide", decide],
  ["POST", "/api/consent", saveConsent],
  ["GET", "/api/cache-invalidation", invalidations],
  ["POST", "/api/cache-invalidation", invalidate],
  ["GET", "/api/assistant", assistantHistory],
  ["POST", "/api/assistant", askAssistant],
  ...vectorRoutes,
];
