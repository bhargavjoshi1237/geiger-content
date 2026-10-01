import { vectorPool } from "./connection.mjs";
import * as core from "./core.mjs";
import { hydratedCandidates } from "./sources.mjs";
import { VectorError, isUuid } from "./auth.mjs";

const PAGE_SIZE = 100;
const versions = () => core.READABLE_PREPROCESSING || [core.PREPROCESSING];
const keyOf = (row) => `${row.sourceKind}:${row.sourceId}`;
const candidate = (id, kind = "entry") => ({ source_id: id, source_kind: kind, score: 1 });
const fraction = (value, fallback) => Number.isFinite(Number(value)) && value != null ? Math.max(0, Math.min(1, Number(value))) : fallback;
const offsetOf = (input) => Math.max(0, Math.min(50000, Math.floor(Number(input.offset) || 0)));

function requireContext(ctx) {
  if (!isUuid(ctx?.projectId) || !ctx?.user?.id || !ctx?.content)
    throw new VectorError("unauthorized", "Sign in and choose a project to view intelligence.", 401);
}

async function read(query, message) {
  const { data, error } = await query;
  if (error) throw new VectorError("insights_unavailable", message, 503);
  return data || [];
}

async function rankingRules(ctx) {
  return read(ctx.content.from("ranking_rules").select("*").eq("project_id", ctx.projectId).is("deleted_at", null), "Could not verify editorial eligibility.");
}

async function hydrate(ctx, candidates, rules, deps) {
  const visible = [];
  for (let i = 0; i < candidates.length; i += 100)
    visible.push(...await (deps.hydrate || hydratedCandidates)(ctx, candidates.slice(i, i + 100), rules, { includeTopics: false }));
  return visible;
}

async function library(ctx, input, deps) {
  requireContext(ctx);
  const pool = deps.pool || vectorPool();
  const offset = offsetOf(input);
  const { rows } = await pool.query(
    `select distinct source_kind,source_id from content.vectors
     where project_id=$1 and active and deleted_at is null and model=$2
       and preprocessing=any($3::text[]) and source_kind='entry'
     order by source_kind,source_id limit $4 offset $5`,
    [ctx.projectId, core.MODEL, versions(), PAGE_SIZE + 1, offset],
  );
  const rules = await rankingRules(ctx);
  const visible = await hydrate(ctx, rows.slice(0, PAGE_SIZE).map((r) => candidate(r.source_id, r.source_kind)), rules, deps);
  return { pool, rules, visible, scanned: Math.min(rows.length, PAGE_SIZE), nextOffset: rows.length > PAGE_SIZE ? offset + PAGE_SIZE : null };
}

async function neighbours(ctx, lib) {
  if (!lib.visible.length) return [];
  const { rows } = await lib.pool.query(
    `select seeds.source_id as from_id,near.source_id as to_id,max(near.score)::float8 as score
     from content.vectors seeds cross join lateral (
       select source_id,1-(embedding <=> seeds.embedding) as score from content.vectors
       where project_id=$1 and active and deleted_at is null and model=$2
         and preprocessing=any($3::text[]) and source_kind='entry' and source_id<>seeds.source_id
       order by embedding <=> seeds.embedding limit 16
     ) near
     where seeds.project_id=$1 and seeds.active and seeds.deleted_at is null and seeds.model=$2
       and seeds.preprocessing=any($3::text[]) and seeds.source_kind='entry' and seeds.source_id=any($4::uuid[])
     group by seeds.source_id,near.source_id order by score desc limit 1600`,
    [ctx.projectId, core.MODEL, versions(), lib.visible.map((r) => r.sourceId)],
  );
  return rows;
}

async function visibleNeighbours(ctx, lib, deps) {
  const edges = await neighbours(ctx, lib);
  const ids = [...new Set(edges.flatMap((r) => [r.from_id, r.to_id]))];
  const visible = ids.length ? await hydrate(ctx, ids.map((id) => candidate(id)), lib.rules, deps) : lib.visible;
  const records = new Map(visible.map((r) => [r.sourceId, r]));
  return { records, edges: edges.filter((r) => records.has(r.from_id) && records.has(r.to_id)) };
}

export function duplicatePairs(edges, records, threshold = 0.9) {
  const pairs = new Map();
  for (const edge of edges) {
    const score = Number(edge.score);
    if (edge.from_id === edge.to_id || !Number.isFinite(score) || score < threshold || !records.has(edge.from_id) || !records.has(edge.to_id)) continue;
    const [a, b] = [edge.from_id, edge.to_id].sort();
    const id = `${a}:${b}`;
    if ((pairs.get(id)?.score ?? -Infinity) >= score) continue;
    pairs.set(id, { id, fromId: a, toId: b, from: records.get(a).title, to: records.get(b).title, score });
  }
  return [...pairs.values()].sort((a, b) => b.score - a.score);
}

export async function duplicates(ctx, input = {}, deps = {}) {
  const lib = await library(ctx, input, deps);
  const { edges, records } = await visibleNeighbours(ctx, lib, deps);
  const threshold = fraction(input.threshold, 0.9);
  return { rows: duplicatePairs(edges, records, threshold), threshold, indexedSources: lib.visible.length, scanned: lib.scanned, nextOffset: lib.nextOffset };
}

async function taxonomy(ctx, ids = null) {
  const terms = await read(ctx.content.from("terms").select("id,label,taxonomy_id,parent_id,taxonomies!inner(id,name,project_id,deleted_at)").eq("taxonomies.project_id", ctx.projectId).is("taxonomies.deleted_at", null).is("deleted_at", null).order("id").limit(501), "Could not load project taxonomies.");
  const active = terms.slice(0, 500);
  const links = [];
  let truncated = terms.length > 500;
  if (active.length && ids?.length) for (let i = 0; i < ids.length && links.length < 10000; i += 100) {
    const batch = await read(ctx.content.from("entry_terms").select("entry_id,term_id").in("entry_id", ids.slice(i, i + 100)).is("deleted_at", null).limit(1000), "Could not load taxonomy assignments.");
    links.push(...batch);
    if (batch.length === 1000) truncated = true;
  }
  return { terms: active, links, truncated: truncated || links.length >= 10000 };
}

export function tagSuggestions(edges, records, terms, links, threshold = 0.65) {
  const termsById = new Map(terms.map((r) => [r.id, r]));
  const assignments = new Map();
  for (const link of links) {
    if (!records.has(link.entry_id) || !termsById.has(link.term_id)) continue;
    if (!assignments.has(link.entry_id)) assignments.set(link.entry_id, new Set());
    assignments.get(link.entry_id).add(link.term_id);
  }
  const suggestions = new Map();
  for (const edge of edges) {
    if (edge.from_id === edge.to_id || !records.has(edge.from_id) || !records.has(edge.to_id) || !Number.isFinite(Number(edge.score)) || Number(edge.score) < threshold) continue;
    for (const termId of assignments.get(edge.to_id) || []) {
      if (assignments.get(edge.from_id)?.has(termId)) continue;
      const id = `${edge.from_id}:${termId}`;
      const term = termsById.get(termId);
      if (!suggestions.has(id)) suggestions.set(id, { id, entryId: edge.from_id, content: records.get(edge.from_id).title, termId, tag: term.label, taxonomy: term.taxonomies?.name || "Taxonomy", score: 0, evidence: [] });
      const suggestion = suggestions.get(id);
      suggestion.score = Math.max(suggestion.score, Number(edge.score));
      if (!suggestion.evidence.some((r) => r.id === edge.to_id)) suggestion.evidence.push({ id: edge.to_id, title: records.get(edge.to_id).title });
    }
  }
  return [...suggestions.values()].sort((a, b) => b.score - a.score);
}

export async function tags(ctx, input = {}, deps = {}) {
  const lib = await library(ctx, input, deps);
  const { edges, records } = await visibleNeighbours(ctx, lib, deps);
  const vocab = await taxonomy(ctx, [...records.keys()]);
  const seeds = new Set(lib.visible.map((r) => r.sourceId));
  return { rows: tagSuggestions(edges.filter((r) => seeds.has(r.from_id)), records, vocab.terms, vocab.links, fraction(input.threshold, 0.65)), scanned: lib.scanned, nextOffset: lib.nextOffset, truncated: vocab.truncated };
}

export function topicCoverage(terms, links, records, minimum = 3) {
  return terms.map((term) => {
    const ids = [...new Set(links.filter((r) => r.term_id === term.id && records.has(r.entry_id)).map((r) => r.entry_id))];
    return { id: term.id, topic: term.label, taxonomy: term.taxonomies?.name || "Taxonomy", coverage: ids.length, minimum, shortfall: Math.max(0, minimum - ids.length), sources: ids.map((id) => records.get(id).title) };
  }).filter((r) => r.shortfall > 0).sort((a, b) => b.shortfall - a.shortfall || a.topic.localeCompare(b.topic));
}

export async function gaps(ctx, input = {}, deps = {}) {
  requireContext(ctx);
  const pool = deps.pool || vectorPool();
  const { rows } = await pool.query(
    `select distinct source_id from content.vectors where project_id=$1 and source_kind='entry'
       and active and deleted_at is null and model=$2 and preprocessing=any($3::text[]) order by source_id limit 5001`,
    [ctx.projectId, core.MODEL, versions()],
  );
  const rules = await rankingRules(ctx);
  const visible = [];
  for (let i = 0; i < Math.min(rows.length, 5000); i += 500) visible.push(...await hydrate(ctx, rows.slice(i, Math.min(i + 500, 5000)).map((r) => candidate(r.source_id)), rules, deps));
  const records = new Map(visible.map((r) => [r.sourceId, r]));
  const vocab = await taxonomy(ctx, [...records.keys()]);
  const minimum = Math.min(20, Math.max(1, Math.floor(Number(input.minimum) || 3)));
  return { rows: topicCoverage(vocab.terms, vocab.links, records, minimum), topics: vocab.terms.length, indexedSources: records.size, truncated: rows.length > 5000 || vocab.truncated, minimum };
}

export function buildGraph(records, references, terms, links, similarities, threshold = 0.75) {
  const nodes = new Map([...records.values()].map((r) => [keyOf(r), { id: keyOf(r), label: r.title, kind: "entry", sourceId: r.sourceId }]));
  const edges = [];
  for (const r of references) if (records.has(r.from_entry_id) && records.has(r.to_entry_id)) edges.push({ id: `ref:${r.id}`, fromId: `entry:${r.from_entry_id}`, toId: `entry:${r.to_entry_id}`, relation: r.field_key || "reference", score: 1 });
  const termMap = new Map(terms.map((r) => [r.id, r]));
  for (const link of links) {
    const term = termMap.get(link.term_id);
    if (!records.has(link.entry_id) || !term) continue;
    nodes.set(`term:${term.id}`, { id: `term:${term.id}`, label: term.label, kind: "term" });
    nodes.set(`taxonomy:${term.taxonomy_id}`, { id: `taxonomy:${term.taxonomy_id}`, label: term.taxonomies?.name || "Taxonomy", kind: "taxonomy" });
    edges.push({ id: `tag:${link.entry_id}:${term.id}`, fromId: `entry:${link.entry_id}`, toId: `term:${term.id}`, relation: "tagged", score: 1 });
    edges.push({ id: `vocab:${term.id}`, fromId: `term:${term.id}`, toId: `taxonomy:${term.taxonomy_id}`, relation: "taxonomy", score: 1 });
  }
  for (const pair of duplicatePairs(similarities, records, threshold)) edges.push({ id: `similar:${pair.id}`, fromId: `entry:${pair.fromId}`, toId: `entry:${pair.toId}`, relation: "similar", score: pair.score });
  const unique = [...new Map(edges.map((r) => [r.id, r])).values()];
  return { nodes: [...nodes.values()], rows: unique.map((r) => ({ ...r, from: nodes.get(r.fromId).label, to: nodes.get(r.toId).label })) };
}

export async function graph(ctx, input = {}, deps = {}) {
  const lib = await library(ctx, input, deps);
  const { records, edges } = await visibleNeighbours(ctx, lib, deps);
  const ids = [...records.keys()];
  const vocab = await taxonomy(ctx, ids);
  const references = [];
  let truncated = vocab.truncated;
  for (let i = 0; i < ids.length && references.length < 2000; i += 100) {
    const batch = await read(ctx.content.from("entry_references").select("id,from_entry_id,to_entry_id,field_key").in("from_entry_id", ids.slice(i, i + 100)).is("deleted_at", null).limit(1000), "Could not load entry references.");
    references.push(...batch);
    if (batch.length === 1000) truncated = true;
  }
  return { ...buildGraph(records, references.slice(0, 2000), vocab.terms, vocab.links, edges, fraction(input.threshold, 0.75)), scanned: lib.scanned, nextOffset: lib.nextOffset, truncated: truncated || references.length >= 2000 };
}

export function explainDecisions(traces, experiments, variants, exposures) {
  const experimentsById = new Map(experiments.map((r) => [r.id, r]));
  const variantsById = new Map(variants.map((r) => [r.id, r]));
  const decisions = traces.map((r) => ({ id: `decision:${r.id}`, kind: "Decision", decision: r.entry_id || "No content selected", reason: r.reason, at: r.created_at, slotId: r.slot_id, variantId: r.variant_id }));
  const allocations = exposures.flatMap((r) => {
    const experiment = experimentsById.get(r.experiment_id);
    const variant = variantsById.get(r.variant_id);
    if (!experiment || (r.variant_id && (!variant || variant.experiment_id !== experiment.id))) return [];
    return [{ id: `exposure:${r.id}`, kind: "Experiment", decision: `${experiment.name} · ${variant?.name || "Holdout"} (current labels)`, reason: `Recorded ${r.variant_id ? `variant assignment ${r.variant_id}` : "holdout assignment"}; ${r.converted ? "conversion recorded" : "no conversion recorded"}.`, at: r.at, experimentId: experiment.id, variantId: r.variant_id || null, converted: Boolean(r.converted) }];
  });
  return [...decisions, ...allocations].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export async function decisions(ctx, input = {}) {
  requireContext(ctx);
  const days = Math.min(365, Math.max(1, Math.floor(Number(input.days) || 30)));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const query = (table, fields) => ctx.content.from(table).select(fields).eq("project_id", ctx.projectId);
  const [traces, experiments, variants, exposures] = await Promise.all([
    read(query("decision_traces", "id,slot_id,entry_id,variant_id,reason,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(200), "Could not load saved decision traces."),
    read(query("experiments", "id,name,status").is("deleted_at", null).limit(1000), "Could not load experiments."),
    read(query("experiment_variants", "id,experiment_id,name").is("deleted_at", null).limit(2000), "Could not load experiment variants."),
    read(query("experiment_exposures", "id,experiment_id,variant_id,converted,at").is("deleted_at", null).gte("at", since).order("at", { ascending: false }).limit(200), "Could not load experiment allocations."),
  ]);
  return { rows: explainDecisions(traces, experiments, variants, exposures), days, decisions: traces.length, experiments: experiments.length, exposures: exposures.length, truncated: traces.length === 200 || exposures.length === 200 };
}
