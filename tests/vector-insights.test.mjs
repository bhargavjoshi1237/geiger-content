import test from "node:test";
import assert from "node:assert/strict";
import { duplicatePairs, tagSuggestions, topicCoverage, buildGraph, explainDecisions, duplicates, gaps, tags, decisions } from "../lib/vector/insights.mjs";

const projectId = "00000000-0000-0000-0000-000000000001";
const records = new Map(["a", "b", "c"].map((id) => [id, { sourceId: id, sourceKind: "entry", title: `Entry ${id}` }]));
const terms = [{ id: "t1", label: "Research", taxonomy_id: "tax1", taxonomies: { name: "Topics" } }, { id: "t2", label: "Delivery", taxonomy_id: "tax1", taxonomies: { name: "Topics" } }];

function fakeContext(tables = {}, failure = null) {
  const calls = [];
  const content = { from(table) {
    const methods = [];
    calls.push({ table, methods });
    const query = {
      then(resolve, reject) { return Promise.resolve({ data: tables[table] || [], error: failure }).then(resolve, reject); },
    };
    for (const method of ["select", "eq", "is", "in", "gte", "limit", "order"]) query[method] = (...args) => { methods.push([method, ...args]); return query; };
    return query;
  } };
  return { ctx: { projectId, user: { id: "viewer" }, content }, calls };
}

test("duplicate pairs collapse reciprocal and multi-chunk matches and retain highest score", () => {
  const edges = [{ from_id: "a", to_id: "b", score: 0.91 }, { from_id: "b", to_id: "a", score: 0.95 }, { from_id: "a", to_id: "c", score: 0.89 }, { from_id: "a", to_id: "a", score: 1 }, { from_id: "a", to_id: "hidden", score: 1 }];
  assert.deepEqual(duplicatePairs(edges, records).map((r) => [r.id, r.score]), [["a:b", 0.95]]);
});

test("duplicate threshold is inclusive and non-finite scores are ignored", () => {
  assert.equal(duplicatePairs([{ from_id: "a", to_id: "b", score: 0.9 }], records).length, 1);
  assert.equal(duplicatePairs([{ from_id: "a", to_id: "b", score: NaN }], records).length, 0);
});

test("suggestions inherit only real neighbour terms not already assigned and preserve evidence", () => {
  const edges = [{ from_id: "a", to_id: "b", score: 0.85 }, { from_id: "a", to_id: "c", score: 0.91 }, { from_id: "a", to_id: "hidden", score: 1 }];
  const links = [{ entry_id: "a", term_id: "t2" }, { entry_id: "b", term_id: "t1" }, { entry_id: "b", term_id: "t2" }, { entry_id: "c", term_id: "t1" }, { entry_id: "b", term_id: "foreign" }];
  const rows = tagSuggestions(edges, records, terms, links);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].termId, "t1");
  assert.equal(rows[0].score, 0.91);
  assert.deepEqual(rows[0].evidence.map((r) => r.id), ["b", "c"]);
});

test("tag suggestions reject malformed similarity and same-source evidence", () => {
  const links = [{ entry_id: "b", term_id: "t1" }];
  assert.deepEqual(tagSuggestions([{ from_id: "a", to_id: "b", score: "invalid" }], records, terms, links), []);
});

test("gap coverage counts unique eligible indexed sources and retains uncovered taxonomy topics", () => {
  const links = [{ entry_id: "a", term_id: "t1" }, { entry_id: "a", term_id: "t1" }, { entry_id: "hidden", term_id: "t1" }];
  const rows = topicCoverage(terms, links, records);
  assert.deepEqual(rows.map((r) => [r.topic, r.coverage, r.shortfall]), [["Delivery", 0, 3], ["Research", 1, 2]]);
  assert.equal(topicCoverage(terms.slice(0, 1), links, records, 1).length, 0);
});

test("graph combines safe references, taxonomy membership and reciprocal-deduped semantic edges", () => {
  const refs = [{ id: "r1", from_entry_id: "a", to_entry_id: "b", field_key: "related" }, { id: "r2", from_entry_id: "a", to_entry_id: "hidden" }];
  const links = [{ entry_id: "a", term_id: "t1" }, { entry_id: "b", term_id: "t1" }, { entry_id: "hidden", term_id: "t2" }];
  const edges = [{ from_id: "a", to_id: "b", score: 0.85 }, { from_id: "b", to_id: "a", score: 0.9 }];
  const graph = buildGraph(records, refs, terms, links, edges);
  assert.equal(graph.rows.filter((r) => r.relation === "similar").length, 1);
  assert.equal(graph.rows.filter((r) => r.relation === "taxonomy").length, 1);
  assert.equal(graph.rows.length, 5);
  assert.equal(graph.nodes.some((r) => r.id.includes("hidden")), false);
  assert.equal(graph.nodes.some((r) => r.id === "term:t2"), false);
});

test("real traces keep their historical reason; experiment exposures explain assignments and holdouts", () => {
  const rows = explainDecisions([{ id: "trace", entry_id: "a", reason: "Matched at decision time", created_at: "2026-10-01T00:00:00Z" }], [{ id: "exp", name: "Headline", holdout_pct: 10, goal_metric: "conversion" }], [{ id: "v", experiment_id: "exp", name: "Short", weight: 2 }], [{ id: "e", experiment_id: "exp", variant_id: "v", converted: true, at: "2026-10-01T01:00:00Z" }, { id: "h", experiment_id: "exp", variant_id: null, converted: false, at: "2026-09-30T00:00:00Z" }, { id: "bad", experiment_id: "foreign", variant_id: null, at: "2026-10-01T01:00:00Z" }]);
  assert.deepEqual(rows.map((r) => r.id), ["exposure:e", "decision:trace", "exposure:h"]);
  assert.match(rows[0].reason, /variant assignment v.*conversion recorded/);
  assert.equal(rows[1].reason, "Matched at decision time");
  assert.match(rows[2].reason, /holdout assignment.*no conversion recorded/);
  assert.equal(rows.some((r) => "profileId" in r), false);
});

test("editing current experiment parameters cannot rewrite historical allocation reasons", () => {
  const exposures = [{ id: "e", experiment_id: "exp", variant_id: "v", converted: true, at: "2026-10-01T01:00:00Z" }, { id: "h", experiment_id: "exp", variant_id: null, converted: false, at: "2026-09-30T00:00:00Z" }];
  const before = explainDecisions([], [{ id: "exp", name: "Headline", holdout_pct: 10, goal_metric: "conversion" }], [{ id: "v", experiment_id: "exp", name: "Short", weight: 2 }], exposures);
  const after = explainDecisions([], [{ id: "exp", name: "Renamed", holdout_pct: 90, goal_metric: "click" }], [{ id: "v", experiment_id: "exp", name: "Renamed variant", weight: 99 }], exposures);
  assert.deepEqual(after.map((r) => r.reason), before.map((r) => r.reason));
  assert.ok(after.every((r) => r.decision.includes("current labels")));
  assert.equal(after[0].variantId, "v");
  assert.equal(after[1].variantId, null);
  assert.equal(after[0].converted, true);
  assert.equal(after[1].converted, false);
});

test("duplicate server operation scopes both index queries and rechecks both endpoint visibility", async () => {
  const { ctx, calls } = fakeContext();
  const queries = [];
  const pool = { async query(sql, params) {
    queries.push({ sql, params });
    return { rows: queries.length === 1 ? [{ source_id: "a", source_kind: "entry" }, { source_id: "hidden", source_kind: "entry" }] : [{ from_id: "a", to_id: "b", score: 0.93 }, { from_id: "a", to_id: "hidden", score: 1 }] };
  } };
  const hydrate = async (_ctx, candidates) => candidates.filter((r) => records.has(r.source_id)).map((r) => records.get(r.source_id));
  const result = await duplicates(ctx, {}, { pool, hydrate });
  assert.equal(result.rows.length, 1);
  assert.equal(result.indexedSources, 1);
  for (const q of queries) {
    assert.equal(q.params[0], projectId);
    assert.match(q.sql, /active and deleted_at is null/);
    assert.match(q.sql, /preprocessing=any/);
    assert.ok(q.params[2].includes("retrieval-v1"));
  }
  assert.match(queries[1].sql, /order by embedding <=> seeds.embedding/);
  assert.deepEqual(queries[1].params[3], ["a"]);
  assert.ok(calls[0].methods.some((r) => r[0] === "eq" && r[1] === "project_id" && r[2] === projectId));
});

test("server operations refuse unverified contexts before any database work", async () => {
  for (const operation of [duplicates, gaps, tags, decisions]) await assert.rejects(operation({ projectId }), (e) => e.status === 401);
});

test("source and taxonomy failures become unavailable rather than fake empty states", async () => {
  const { ctx } = fakeContext({}, { message: "failure" });
  const pool = { async query() { return { rows: [] }; } };
  await assert.rejects(gaps(ctx, {}, { pool }), (e) => e.code === "insights_unavailable" && e.status === 503);
});

test("decision data reads are project scoped and return actual empty results", async () => {
  const { ctx, calls } = fakeContext();
  const result = await decisions(ctx, { days: 7 });
  assert.deepEqual(result.rows, []);
  assert.equal(result.days, 7);
  for (const call of calls) assert.ok(call.methods.some((r) => r[0] === "eq" && r[1] === "project_id" && r[2] === projectId));
  assert.ok(calls.filter((r) => ["decision_traces", "experiment_exposures"].includes(r.table)).every((r) => r.methods.some((m) => m[0] === "gte")));
});
