// The semantic service (/api/vector/*) for the playground. The real one embeds the library with a
// hosted model into pgvector; here a deterministic bag-of-words similarity over titles, excerpts and
// topics stands in for the embeddings, so Embeddings, Semantic Search, Similar Content and the
// Intelligence insight screens all read the seed. Response shapes follow lib/vector/{service,insights}.mjs.
import { json } from "./intercept_fetch.js";
import { getPlaygroundDb, PLAYGROUND_USER } from "./db.js";
import { daysAgo, hoursAgo, noise } from "./seed/helpers.js";

const MODEL = "gemini-embedding-2";
const STOP = new Set("a an and are as at be by for from how in into is it its of on or the this to with your you our we".split(" "));

const table = (name) => getPlaygroundDb().table(`content.${name}`);
const live = (row) => row.deleted_at == null;
const now = () => new Date().toISOString();

let settings = {
  enabled: true, indexImages: true, indexText: true, audienceEnabled: true,
  topicLimit: 8, halfLifeDays: 30, ingestionDailyLimit: 500, maxVectors: 20000,
};

function words(text) {
  return String(text || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
}

function termLabels(entryId) {
  const terms = table("terms");
  return table("entry_terms").filter((l) => l.entry_id === entryId && live(l)).map((l) => terms.find((t) => t.id === l.term_id)?.label).filter(Boolean);
}

function topicsOf(entry) {
  const meta = entry.metadata || {};
  return [...new Set([...(meta.topics || []), ...(meta.tags || []), ...termLabels(entry.id)])].slice(0, 10);
}

// A sparse "embedding": word counts, topics weighted like a strong signal.
function vectorOf(text, topics = []) {
  const v = new Map();
  for (const w of words(text)) v.set(w, (v.get(w) || 0) + 1);
  for (const t of topics) {
    v.set(`#${t.toLowerCase()}`, (v.get(`#${t.toLowerCase()}`) || 0) + 4);
    for (const w of words(t)) v.set(w, (v.get(w) || 0) + 1);
  }
  return v;
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, x] of a) {
    na += x * x;
    if (b.has(k)) dot += x * b.get(k);
  }
  for (const y of b.values()) nb += y * y;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

// Cosine over this sparse space runs low; spread it into the range a dense model reports.
const semantic = (c, salt = 0) => Math.min(0.99, 0.25 + 0.72 * Math.sqrt(c) + noise(salt) * 0.02);

function sources() {
  const entries = table("entries").filter((e) => live(e) && e.status === "Published");
  const assets = table("assets").filter((a) => live(a) && a.file_type === "image" && a.status === "Ready");
  const rules = table("ranking_rules").filter((r) => live(r) && r.status === "Active");
  return [
    ...entries.map((e) => {
      const topics = topicsOf(e);
      return { row: e, kind: "entry", id: e.id, title: e.title, excerpt: e.excerpt || "", url: "", topics, vector: vectorOf(`${e.title} ${e.title} ${e.excerpt}`, topics) };
    }),
    ...assets.map((a) => {
      const topics = a.metadata?.topics || [];
      return { row: a, kind: "asset", id: a.id, title: a.name, excerpt: a.alt || "", url: a.url || "", topics, vector: vectorOf(`${a.name} ${a.alt}`, topics) };
    }),
  ].filter((s) => !rules.some((r) => r.rule_type === "exclude" && r.entry_id === s.id));
}

// hydratedCandidates(): the result row every semantic screen renders.
function result(source, score) {
  const boost = table("ranking_rules").find((r) => live(r) && r.status === "Active" && r.rule_type === "boost" && r.entry_id === source.id);
  const e = source.kind === "entry" ? source.row : null;
  return {
    sourceKind: source.kind,
    parentEntryId: source.kind === "asset" ? source.row.metadata?.entry_id ?? null : null,
    sourceId: source.id,
    title: source.title,
    excerpt: source.excerpt,
    url: source.url,
    score: Number((boost ? score * Number(boost.weight) : score).toFixed(4)),
    topics: source.topics,
    targetStages: e?.metadata?.targetStages || [],
    difficulty: e?.data?.difficulty ?? null,
    boosted: Boolean(boost),
    entry: e ? { id: e.id, title: e.title, slug: e.slug, type: e.type, status: e.status, excerpt: e.excerpt || "", createdAt: e.created_at } : null,
  };
}

function rank(vector, { kind = "all", exclude = null, limit = 12 } = {}) {
  return sources()
    .filter((s) => s.id !== exclude && (kind === "all" || s.kind === kind))
    .map((s, i) => result(s, semantic(cosine(vector, s.vector), i)))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function search({ body }) {
  const input = body || {};
  const kind = ["all", "entry", "asset"].includes(input.kind) ? input.kind : "all";
  const limit = Math.min(30, Math.max(1, Number(input.limit) || 12));
  if (input.referenceId) {
    const reference = sources().find((s) => s.id === input.referenceId);
    if (!reference) return json({ error: "The reference must be an eligible source in this project.", code: "reference_unavailable" }, 404);
    return { results: rank(reference.vector, { kind, exclude: reference.id, limit }), method: "semantic", model: MODEL };
  }
  const query = String(input.query || "").trim();
  if (!query) return json({ error: "Enter a search query.", code: "invalid_query" }, 400);
  return { results: rank(vectorOf(query, []), { kind, limit }), method: "semantic", model: MODEL };
}

function status() {
  const list = sources();
  const chunks = (s) => (s.kind === "asset" ? 1 : Math.max(1, Math.ceil(String(s.row.body || "").length / 900)));
  const jobs = list.slice(0, 14).map((s, i) => ({
    id: `job-${s.id}`, sourceKind: s.kind, sourceId: s.id, status: i === 0 ? "processing" : i === 1 ? "queued" : "completed",
    attempts: i < 2 ? 0 : 1, errorCode: null, error: null, retryAt: null, updatedAt: hoursAgo(i * 3 + 1),
  }));
  const contentVectors = list.reduce((n, s) => n + chunks(s), 0);
  return {
    settings: { ...settings, cursor: {}, checkedAt: hoursAgo(1) },
    model: MODEL,
    dimensions: 768,
    providerConfigured: true,
    databaseConfigured: true,
    extension: "0.8.0",
    sources: list.map((s, i) => ({ sourceKind: s.kind, sourceId: s.id, title: s.title, chunks: chunks(s), updatedAt: hoursAgo(6 + i * 5) })),
    jobs,
    totals: { contentVectors, profileVectors: 18, knowledgeVectors: table("profile_knowledge").filter(live).length, databaseBytes: 48_300_000, tableBytes: contentVectors * 3_400 },
    quota: { used: 37, dailyLimit: settings.ingestionDailyLimit, rpmLimit: 60, blockedUntil: null, errorCode: null, resetAt: daysAgo(-1) },
  };
}

// The visitor's own audience profile: the reader record their knowledge notes hang off.
function ownProfile() {
  const note = table("profile_knowledge").find((k) => k.owner_id === PLAYGROUND_USER.id);
  return table("profiles").find((p) => p.id === note?.profile_id) ?? table("profiles")[0] ?? null;
}

function consentOf(profileId) {
  return table("consent_state").find((c) => c.profile_id === profileId && c.purpose === "personalization" && live(c))?.status ?? "pending";
}

function knowledgeOf(profileId) {
  return table("profile_knowledge")
    .filter((k) => live(k) && k.profile_id === profileId && k.owner_id === PLAYGROUND_USER.id)
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

function interestsOf(profileId) {
  return table("topic_stages")
    .filter((t) => t.profile_id === profileId && live(t))
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, settings.topicLimit)
    .map((t, i) => ({ topic: t.topic_label || "All interests", signals: Math.round(Number(t.score || 0) * 40) + 2 + (i % 3), updatedAt: t.updated_at }));
}

function audience() {
  const profile = ownProfile();
  if (!profile) return { profileId: null, consent: "pending", interests: [], knowledge: [] };
  const consent = consentOf(profile.id) === "granted" ? "granted" : "denied";
  return {
    profileId: profile.id,
    consent,
    interests: consent === "granted" ? interestsOf(profile.id) : [],
    knowledge: knowledgeOf(profile.id).map((k) => ({
      id: k.id, title: k.title, body: k.body, topic: k.topic_label, evidence: k.evidence, kind: k.kind, confidence: Number(k.confidence), updatedAt: k.updated_at,
    })),
  };
}

function updateAudience({ body }) {
  const profile = ownProfile();
  if (!profile) return json({ error: "No audience profile.", code: "profile_unavailable" }, 404);
  if (body?.consent !== undefined) {
    if (!["granted", "denied"].includes(body.consent)) return json({ error: "Choose whether to allow personalization.", code: "invalid_consent" }, 400);
    const rows = table("consent_state");
    const row = rows.find((c) => c.profile_id === profile.id && c.purpose === "personalization" && live(c));
    if (row) Object.assign(row, { status: body.consent, updated_at: now() });
    else rows.unshift({ id: crypto.randomUUID(), profile_id: profile.id, purpose: "personalization", status: body.consent, created_at: now(), updated_at: now() });
  }
  if (body?.action === "refresh" && consentOf(profile.id) !== "granted") {
    return json({ error: "Enable personalization before refreshing your interests.", code: "consent_required" }, 403);
  }
  return audience();
}

function searchKnowledge({ query }) {
  const profile = ownProfile();
  if (!profile || consentOf(profile.id) !== "granted") return json({ error: "Allow personalization to search your notes.", code: "consent_required" }, 403);
  const q = String(query.query || "").trim();
  if (!q) return json({ error: "Enter a search query.", code: "invalid_query" }, 400);
  const v = vectorOf(q);
  const results = knowledgeOf(profile.id)
    .map((k, i) => ({ id: k.id, title: k.title, body: k.body, topic: k.topic_label, kind: k.kind, confidence: Number(k.confidence), score: Number(semantic(cosine(v, vectorOf(`${k.title} ${k.body} ${k.topic_label}`)), i).toFixed(4)) }))
    .sort((a, b) => b.score - a.score);
  return { results };
}

function saveKnowledge({ body }) {
  const rows = table("profile_knowledge");
  if (body?.action === "remove") {
    const row = rows.find((k) => k.id === body.id && k.owner_id === PLAYGROUND_USER.id);
    if (row) row.deleted_at = now();
    return { removed: true };
  }
  const profile = ownProfile();
  const title = String(body?.title || "").trim();
  const text = String(body?.body || "").trim();
  if (!profile || !title || !text) return json({ error: "Give the note a title and some text.", code: "invalid_knowledge" }, 400);
  const existing = body.id ? rows.find((k) => k.id === body.id && k.owner_id === PLAYGROUND_USER.id) : null;
  const patch = { title, body: text, topic_label: body.topic || null, evidence: body.evidence || "Self-declared in the workspace", updated_at: now() };
  if (existing) Object.assign(existing, patch);
  else {
    const row = { id: crypto.randomUUID(), project_id: profile.project_id, profile_id: profile.id, owner_id: PLAYGROUND_USER.id, created_by: PLAYGROUND_USER.id, kind: "self_declared", confidence: 0.9, metadata: {}, created_at: now(), ...patch };
    rows.unshift(row);
    return { id: row.id };
  }
  return { id: existing.id };
}

function recommend() {
  const profile = ownProfile();
  if (!profile || consentOf(profile.id) !== "granted") return json({ error: "Allow personalization to get recommendations.", code: "consent_required" }, 403);
  const stages = table("topic_stages").filter((t) => t.profile_id === profile.id && live(t));
  const v = new Map(stages.map((t) => [`#${String(t.topic_label).toLowerCase()}`, 1 + Number(t.score || 0) * 6]));
  const results = rank(v, { kind: "entry", limit: 12 }).map((r) => ({
    ...r,
    journeyStages: stages.filter((t) => r.topics.includes(t.topic_label)).map((t) => ({ topic: t.topic_label, stage: t.stage })),
    reason: "Similar to content you engaged with",
  }));
  return { results, method: "interest" };
}

function activity({ body }) {
  if (!["like", "save", "click", "dismiss", "not_interested"].includes(body?.type)) return json({ error: "Choose a valid activity.", code: "invalid_activity" }, 400);
  table("events").unshift({
    id: body.eventId || crypto.randomUUID(), project_id: ownProfile()?.project_id, entry_id: body.sourceKind === "entry" ? body.sourceId : null,
    anonymous_id: null, type: body.type, context: { source: "semantic" }, at: now(), created_at: now(),
  });
  return { recorded: true };
}

// Pairwise similarity across the indexed entries, for the insight screens.
function edges() {
  const list = sources().filter((s) => s.kind === "entry");
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      out.push({ a: list[i], b: list[j], score: Number(semantic(cosine(list[i].vector, list[j].vector), i * 97 + j).toFixed(4)) });
    }
  }
  return { list, edges: out.sort((x, y) => y.score - x.score) };
}

function duplicates({ query }) {
  const threshold = Math.max(0, Math.min(1, Number(query.threshold) || 0.9));
  const { list, edges: all } = edges();
  const rows = all.filter((e) => e.score >= threshold).map(({ a, b, score }) => {
    const [from, to] = a.id < b.id ? [a, b] : [b, a];
    return { id: `${from.id}:${to.id}`, fromId: from.id, toId: to.id, from: from.title, to: to.title, score };
  });
  return { rows, threshold, indexedSources: list.length, scanned: list.length, nextOffset: null };
}

function gaps({ query }) {
  const minimum = Math.max(1, Math.floor(Number(query.minimum) || 3));
  const published = new Set(table("entries").filter((e) => live(e) && e.status === "Published").map((e) => e.id));
  const taxonomies = table("taxonomies").filter(live);
  const rows = table("terms").filter(live).map((term) => {
    const linked = table("entry_terms").filter((l) => l.term_id === term.id && live(l) && published.has(l.entry_id));
    const titles = linked.map((l) => table("entries").find((e) => e.id === l.entry_id)?.title).filter(Boolean);
    return {
      id: term.id, topic: term.label, taxonomy: taxonomies.find((t) => t.id === term.taxonomy_id)?.name ?? "",
      coverage: linked.length, minimum, shortfall: Math.max(0, minimum - linked.length), sources: titles.slice(0, 5),
    };
  }).filter((r) => r.shortfall > 0).sort((a, b) => b.shortfall - a.shortfall || a.topic.localeCompare(b.topic));
  return { rows, topics: table("terms").filter(live).length, indexedSources: published.size, truncated: false, minimum };
}

function graph() {
  const { list, edges: all } = edges();
  const terms = table("terms").filter(live);
  const taxonomies = table("taxonomies").filter(live);
  const ids = new Set(list.map((s) => s.id));
  const nodes = [
    ...list.map((s) => ({ id: `entry:${s.id}`, label: s.title, kind: "entry", sourceId: s.id })),
    ...terms.map((t) => ({ id: `term:${t.id}`, label: t.label, kind: "term", sourceId: t.id })),
    ...taxonomies.map((t) => ({ id: `taxonomy:${t.id}`, label: t.name, kind: "taxonomy", sourceId: t.id })),
  ];
  const label = new Map(nodes.map((n) => [n.id, n.label]));
  const edge = (id, fromId, toId, relation, score) => ({ id, fromId, toId, relation, score, from: label.get(fromId), to: label.get(toId) });
  const rows = [
    ...table("entry_references").filter((r) => live(r) && ids.has(r.from_entry_id) && ids.has(r.to_entry_id))
      .map((r) => edge(r.id, `entry:${r.from_entry_id}`, `entry:${r.to_entry_id}`, r.field_key || "reference", 1)),
    ...table("entry_terms").filter((l) => live(l) && ids.has(l.entry_id))
      .map((l) => edge(l.id, `entry:${l.entry_id}`, `term:${l.term_id}`, "tagged", 1)),
    ...terms.filter((t) => t.taxonomy_id).map((t) => edge(`tx:${t.id}`, `term:${t.id}`, `taxonomy:${t.taxonomy_id}`, "taxonomy", 1)),
    ...all.slice(0, 40).map(({ a, b, score }) => edge(`sim:${a.id}:${b.id}`, `entry:${a.id}`, `entry:${b.id}`, "similar", score)),
  ].filter((r) => r.from && r.to);
  return { nodes, rows, scanned: list.length, nextOffset: null, truncated: false };
}

// Topics an entry's nearest neighbours carry that it doesn't, as tag suggestions.
function tags() {
  const { list, edges: all } = edges();
  const terms = table("terms").filter(live);
  const taxonomies = table("taxonomies").filter(live);
  const rows = [];
  for (const source of list) {
    const own = new Set(table("entry_terms").filter((l) => l.entry_id === source.id && live(l)).map((l) => l.term_id));
    const near = all.filter((e) => e.a.id === source.id || e.b.id === source.id).slice(0, 6).map((e) => ({ other: e.a.id === source.id ? e.b : e.a, score: e.score }));
    const votes = new Map();
    for (const { other, score } of near) {
      for (const l of table("entry_terms").filter((x) => x.entry_id === other.id && live(x) && !own.has(x.term_id))) {
        const v = votes.get(l.term_id) ?? { score: 0, evidence: [] };
        v.score = Math.max(v.score, score);
        v.evidence.push({ id: other.id, title: other.title });
        votes.set(l.term_id, v);
      }
    }
    for (const [termId, v] of votes) {
      if (v.score < 0.5) continue;
      const term = terms.find((t) => t.id === termId);
      if (!term) continue;
      rows.push({
        id: `${source.id}:${termId}`, entryId: source.id, content: source.title, termId, tag: term.label,
        taxonomy: taxonomies.find((t) => t.id === term.taxonomy_id)?.name ?? "", score: v.score, evidence: v.evidence.slice(0, 3),
      });
    }
  }
  rows.sort((a, b) => b.score - a.score);
  return { rows: rows.slice(0, 100), scanned: list.length, nextOffset: null, truncated: rows.length > 100 };
}

function decisions({ query }) {
  const days = Math.max(1, Math.min(365, Number(query.days) || 30));
  const since = daysAgo(days);
  const entries = table("entries");
  const title = (id) => entries.find((e) => e.id === id)?.title;
  const traces = table("decision_traces").filter((t) => String(t.created_at) >= since);
  const experiments = table("experiments").filter(live);
  const variants = table("experiment_variants");
  const exposures = table("experiment_exposures").filter((x) => String(x.at) >= since);
  const rows = [
    ...traces.map((t) => ({ id: `decision:${t.id}`, kind: "Decision", decision: title(t.entry_id) || t.entry_id || "No content selected", reason: t.reason, at: t.created_at, slotId: t.slot_id, variantId: t.variant_id })),
    ...exposures.slice(0, 200).map((x) => {
      const variant = variants.find((v) => v.id === x.variant_id);
      const experiment = experiments.find((e) => e.id === x.experiment_id);
      return {
        id: `exposure:${x.id}`, kind: "Experiment", decision: `${experiment?.name ?? "Experiment"} · ${variant?.name ?? "Variant"}`,
        reason: `Assigned by the ${experiment?.traffic_split ? "traffic split" : "experiment"}${x.converted ? "; converted" : ""}.`,
        at: x.at, experimentId: x.experiment_id, variantId: x.variant_id, converted: Boolean(x.converted),
      };
    }),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return { rows: rows.slice(0, 300), days, decisions: traces.length, experiments: experiments.length, exposures: exposures.length, truncated: rows.length > 300 };
}

function saveSettings({ body }) {
  const pick = (key, fallback) => (body && key in body ? body[key] : fallback);
  settings = {
    enabled: Boolean(pick("enabled", settings.enabled)), indexImages: Boolean(pick("indexImages", settings.indexImages)),
    indexText: Boolean(pick("indexText", settings.indexText)), audienceEnabled: Boolean(pick("audienceEnabled", settings.audienceEnabled)),
    topicLimit: Number(pick("topicLimit", settings.topicLimit)) || settings.topicLimit, halfLifeDays: Number(pick("halfLifeDays", settings.halfLifeDays)) || settings.halfLifeDays,
    ingestionDailyLimit: Number(pick("ingestionDailyLimit", settings.ingestionDailyLimit)) || settings.ingestionDailyLimit,
    maxVectors: Number(pick("maxVectors", settings.maxVectors)) || settings.maxVectors,
  };
  return settings;
}

const vector = (op) => `/api/vector/${op}`;

export const vectorRoutes = [
  ["GET", vector("status"), status],
  ["GET", vector("audience"), audience],
  ["POST", vector("audience"), updateAudience],
  ["GET", vector("knowledge"), searchKnowledge],
  ["POST", vector("knowledge"), saveKnowledge],
  ["POST", vector("search"), search],
  ["POST", vector("similar"), search],
  ["POST", vector("recommend"), recommend],
  ["POST", vector("activity"), activity],
  ["GET", vector("duplicates"), duplicates],
  ["GET", vector("gaps"), gaps],
  ["GET", vector("graph"), graph],
  ["GET", vector("tags"), tags],
  ["GET", vector("decisions"), decisions],
  ["POST", vector("settings"), saveSettings],
  ["POST", vector("sync"), () => ({ queued: sources().length, scanned: sources().length })],
  ["POST", vector("worker"), () => ({ queued: 0, completed: 2, failed: 0, deferred: 0 })],
  ["POST", vector("retry"), () => ({ retried: 0 })],
];
