// Live candidate assessment. Only synthetic data is written, in a unique collection
// deleted in finally. Supply QDRANT_URL and QDRANT_API_KEY as server-side env vars.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = process.env.QDRANT_URL?.replace(/\/$/, "");
const key = process.env.QDRANT_API_KEY;
if (!base || !key || new URL(base).protocol !== "https:")
  throw new Error("Set QDRANT_URL (HTTPS) and QDRANT_API_KEY.");
const name = `geiger_probe_${randomUUID().replaceAll("-", "")}`;
const path = `/collections/${name}`;
const report = { date: new Date().toISOString(), collection: name, synthetic: true, checks: [], latency: {} };
const check = (label, condition) => { assert.ok(condition, label); report.checks.push(label); };
const summary = (samples) => {
  const sorted = [...samples].sort((a, b) => a - b);
  return { n: sorted.length, minMs: +sorted[0].toFixed(2), medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(2), p95Ms: +sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * .95) - 1)].toFixed(2) };
};
async function request(route, method = "GET", body, expected = 200, auth = key) {
  const start = performance.now();
  const response = await fetch(base + route, {
    method, headers: { "Content-Type": "application/json", ...(auth ? { "api-key": auth } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => null);
  if (response.status !== expected)
    throw new Error(`${method} ${route}: HTTP ${response.status}, expected ${expected}; ${JSON.stringify(data?.status || {}).replaceAll(key, "[redacted]")}`);
  return { result: data?.result, data, ms: performance.now() - start, serverMs: (data?.time || 0) * 1000 };
}
let state = 0x87654321;
const rng = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
const unit = (v) => { const n = Math.hypot(...v); return v.map((x) => +(x / n).toFixed(6)); };
const centers = Array.from({ length: 16 }, () => unit(Array.from({ length: 768 }, () => rng() * 2 - 1)));
const points = Array.from({ length: 4096 }, (_, i) => ({
  id: i + 1,
  vector: unit(centers[i % 16].map((x) => x + (rng() * 2 - 1) * .025)),
  payload: { project_id: i % 2 ? "tenant_b" : "tenant_a", model: "synthetic-768-v1", active: true, source_kind: "asset", topic_id: `topic_${i % 16}`, post_id: `reddit_${i}`, record: { title: `Synthetic image ${i}`, imageUrl: `https://example.invalid/${i}.jpg`, body: "Synthetic content only", tags: ["test", "image"], details: { width: 1200, height: 800 } } },
}));
const filter = { must: [
  { key: "project_id", match: { value: "tenant_a" } },
  { key: "model", match: { value: "synthetic-768-v1" } },
  { key: "active", match: { value: true } },
] };
const query = (vector, exact = false, customFilter = filter) => request(`${path}/points/query`, "POST", { query: vector, filter: customFilter, limit: 10, with_payload: true, params: { exact, hnsw_ef: 256 } });
let created = false;
try {
  report.version = (await request("/")).data.version;
  for (const [label, auth] of [["Missing credential rejected", ""], ["Invalid credential rejected", "invalid-probe-key"]]) {
    const r = await fetch(base + "/collections", { headers: auth ? { "api-key": auth } : {}, signal: AbortSignal.timeout(15000) });
    check(label, [401, 403].includes(r.status));
    await r.arrayBuffer();
  }
  const telemetry = (await request("/telemetry?details_level=1")).result;
  report.resources = { system: telemetry.app.system, peers: telemetry.cluster.status.number_of_peers, memoryBefore: telemetry.memory };
  report.initialCollectionCount = (await request("/collections")).result.collections.length;
  await request(path, "PUT", { vectors: { size: 768, distance: "Cosine", datatype: "float16", on_disk: true }, on_disk_payload: true, hnsw_config: { m: 16, ef_construct: 100, full_scan_threshold: 10 }, optimizers_config: { indexing_threshold: 100 } });
  created = true;
  for (const [field_name, field_schema] of [["project_id", "keyword"], ["model", "keyword"], ["active", "bool"], ["topic_id", "keyword"], ["source_kind", "keyword"]])
    await request(`${path}/index?wait=true`, "PUT", { field_name, field_schema });
  const writes = [];
  const uploadStart = performance.now();
  for (let i = 0; i < points.length; i += 256)
    writes.push((await request(`${path}/points?wait=true`, "PUT", { points: points.slice(i, i + 256) })).ms);
  report.upload = { points: points.length, dimensions: 768, datatype: "float16", seconds: +((performance.now() - uploadStart) / 1000).toFixed(2), batchLatency: summary(writes) };
  check("4096 vectors stored", (await request(`${path}/points/count`, "POST", { exact: true })).result.count === points.length);
  await request(`${path}/points?wait=true`, "PUT", { points: [points[0]] });
  check("Upsert is idempotent", (await request(`${path}/points/count`, "POST", { exact: true })).result.count === points.length);
  const retrieved = (await request(`${path}/points`, "POST", { ids: [1], with_payload: true, with_vector: true })).result[0];
  check("Nested JSON content payload round-trips", JSON.stringify(retrieved.payload) === JSON.stringify(points[0].payload));
  check("768-dimensional vector round-trips", retrieved.vector.length === 768);
  report.float16MaxComponentError = Math.max(...retrieved.vector.map((x, i) => Math.abs(x - points[0].vector[i])));
  const self = await query(points[0].vector, true);
  check("Self-match has cosine score near 1", self.result.points[0].id === 1 && self.result.points[0].score > .999);
  await request(`${path}/points?wait=true`, "PUT", { points: [{ id: "reddit_non_uuid", vector: points[0].vector }] }, 400);
  report.checks.push("Non-UUID string ID rejected: post IDs need mapping");
  await request(`${path}/points?wait=true`, "PUT", { points: [{ id: 999999, vector: [1, 2, 3] }] }, 400);
  report.checks.push("Wrong vector dimension rejected");
  // Vectorless points can retain content that is awaiting an embedding.
  await request(`${path}/points?wait=true`, "PUT", { points: [{ id: 5000, vector: {}, payload: { record: { title: "Pending content" } } }] });
  check("Content can be stored before its embedding", (await request(`${path}/points`, "POST", { ids: [5000], with_payload: true })).result[0].payload.record.title === "Pending content");
  await request(`${path}/points/delete?wait=true`, "POST", { points: [5000] });
  let info;
  const deadline = Date.now() + 45000;
  do {
    info = (await request(path)).result;
    if (info.indexed_vectors_count >= points.length && info.status === "green") break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (Date.now() < deadline);
  report.index = { status: info.status, indexedVectors: info.indexed_vectors_count, segments: info.segments_count, vectors: info.config.params.vectors, replicationFactor: info.config.params.replication_factor };
  check("HNSW index built for all test vectors", info.indexed_vectors_count >= points.length);
  const sentinels = [
    { id: 6000, vector: points[0].vector, payload: { ...points[0].payload, project_id: "tenant_b" } },
    { id: 6001, vector: points[0].vector, payload: { ...points[0].payload, model: "incompatible-model" } },
    { id: 6002, vector: points[0].vector, payload: { ...points[0].payload, active: false } },
  ];
  await request(`${path}/points?wait=true`, "PUT", { points: sentinels });
  const unfiltered = await query(points[0].vector, true, undefined);
  // Pass an explicit empty filter because undefined uses query's default filter.
  const all = await query(points[0].vector, true, {});
  check("Unfiltered control exposes identical-vector sentinels", sentinels.every((s) => all.result.points.some((p) => p.id === s.id)));
  check("Tenant/model/active filters exclude identical-vector sentinels", unfiltered.result.points.every((p) => p.id < 6000));
  await request(`${path}/points/delete?wait=true`, "POST", { points: sentinels.map((p) => p.id) });
  const latencies = [], serverTimes = [], recalls = [], localRecalls = [];
  for (let i = 0; i < 20; i++) {
    const vector = unit(points[i * 100].vector.map((x) => x + (rng() * 2 - 1) * .01));
    const exact = await query(vector, true);
    const approx = await query(vector);
    latencies.push(approx.ms); serverTimes.push(approx.serverMs);
    check(`Tenant/model/active filters respected for query ${i + 1}`, approx.result.points.length === 10 && approx.result.points.every((p) => p.payload.project_id === "tenant_a" && p.payload.model === "synthetic-768-v1" && p.payload.active));
    const ids = new Set(exact.result.points.map((p) => p.id));
    recalls.push(approx.result.points.filter((p) => ids.has(p.id)).length / 10);
    const localIds = new Set(points.filter((p) => p.payload.project_id === "tenant_a").map((p) => ({ id: p.id, score: p.vector.reduce((sum, x, k) => sum + x * vector[k], 0) })).sort((a, b) => b.score - a.score).slice(0, 10).map((p) => p.id));
    localRecalls.push(exact.result.points.filter((p) => localIds.has(p.id)).length / 10);
  }
  report.recall = { queries: 20, k: 10, approximateVsQdrantExact: recalls.reduce((a, b) => a + b) / recalls.length, float16ExactVsLocalFloat32: localRecalls.reduce((a, b) => a + b) / localRecalls.length };
  report.latency.sequentialFilteredSearch = summary(latencies);
  report.latency.qdrantServerSearch = summary(serverTimes);
  const concurrent = [];
  const concurrentStart = performance.now();
  for (let i = 0; i < 4; i++) {
    const batch = await Promise.all(Array.from({ length: 6 }, (_, k) => query(points[(i * 6 + k) * 10].vector)));
    for (const r of batch) { check("Concurrent search returns 10 results", r.result.points.length === 10); concurrent.push(r.ms); }
  }
  report.latency.concurrencySixSearch = summary(concurrent);
  report.latency.concurrencySixSearch.elapsedSeconds = +((performance.now() - concurrentStart) / 1000).toFixed(2);
  const exclusion = await query(points[0].vector, false, { ...filter, must_not: [{ has_id: [1] }] });
  check("Seen/source ID exclusion works", exclusion.result.points.every((p) => p.id !== 1));
  const page = await request(`${path}/points/scroll`, "POST", { filter, limit: 7, with_payload: true, with_vector: false });
  const next = await request(`${path}/points/scroll`, "POST", { filter, limit: 7, offset: page.result.next_page_offset, with_payload: true, with_vector: false });
  check("Content scroll paginates without duplicates", next.result.points.length === 7 && !next.result.points.some((p) => page.result.points.some((a) => a.id === p.id)));
  await request(`${path}/points/payload?wait=true`, "POST", { points: [1], payload: { active: false, revision: 2 } });
  check("Soft deletion suppresses the point in search", !(await query(points[0].vector)).result.points.some((p) => p.id === 1));
  check("Payload update preserves content", (await request(`${path}/points`, "POST", { ids: [1], with_payload: true })).result[0].payload.record.title === points[0].payload.record.title);
  await request(`${path}/points/delete?wait=true`, "POST", { filter: { must: [{ key: "project_id", match: { value: "tenant_b" } }] } });
  check("Deletion by tenant filter removes only that tenant", (await request(`${path}/points/count`, "POST", { exact: true })).result.count === 2048);
  report.resources.memoryAfter = (await request("/telemetry?details_level=1")).result.memory;
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = error.message.replaceAll(key, "[redacted]");
  process.exitCode = 1;
} finally {
  if (created) {
    try {
      await request(path, "DELETE");
      await request(path, "GET", undefined, 404);
      report.cleanupConfirmed = true;
    } catch (error) {
      report.cleanupConfirmed = false;
      report.cleanupError = error.message.replaceAll(key, "[redacted]");
      process.exitCode = 1;
    }
  }
  console.log(JSON.stringify(report, null, 2));
}
