import test from "node:test";
import assert from "node:assert/strict";
import * as core from "../lib/vector/core.mjs";
const { chunkText } = core;
import { sourceRevision, hydratedCandidates } from "../lib/vector/sources.mjs";
import * as repo from "../lib/vector/repository.mjs";
import { profileRevision } from "../lib/vector/ingestion.mjs";
import { cronAuthorized } from "../lib/vector/cron.mjs";
import { readFile } from "node:fs/promises";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("entry revisions ignore editorial metadata and hash only embedded text and title", () => {
  const row = { title: "Title", body: '{"blocks":[{"text":"Body"}]}', updated_at: "yesterday" };
  assert.equal(sourceRevision("entry", row), sourceRevision("entry", { ...row, updated_at: "today", metadata: { tags: ["new"] }, status: "Draft" }));
  assert.equal(sourceRevision("entry", row), sourceRevision("entry", { ...row, body: "Body" }));
  assert.notEqual(sourceRevision("entry", row), sourceRevision("entry", { ...row, title: "Changed" }));
});

test("asset revisions ignore labels but change when image content identity changes", () => {
  const row = { id: id(1), url: "https://storage.test/image.jpg", size_bytes: 100, metadata: { content_hash: "a" } };
  assert.equal(sourceRevision("asset", row), sourceRevision("asset", { ...row, name: "Rename", updated_at: "today", alt: "Accessible description" }));
  assert.notEqual(sourceRevision("asset", row), sourceRevision("asset", { ...row, metadata: { content_hash: "b" } }));
});

test("profile revisions do not expire each hour and include activity/source signatures", () => {
  const original = Date.now;
  try {
    const row = { id: id(1), primary_identifier: id(2) };
    Date.now = () => 0;
    const first = sourceRevision("profile", row, { activity: ["event-1"], sources: ["revision-a"] });
    Date.now = () => 7200000;
    assert.equal(sourceRevision("profile", row, { activity: ["event-1"], sources: ["revision-a"] }), first);
    assert.notEqual(sourceRevision("profile", row, { activity: ["event-2"], sources: ["revision-a"] }), first);
    assert.notEqual(sourceRevision("profile", row, { activity: ["event-1"], sources: ["revision-b"] }), first);
  } finally { Date.now = original; }
});

test("chunks prefer sentence boundaries and overlap complete words without exceeding bytes", () => {
  const chunks = chunkText("First sentence here. Second sentence here. Third sentence here. Fourth sentence here.", 49, 23);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => Buffer.byteLength(chunk) <= 49 && /\.$/.test(chunk)));
  assert.equal(chunks[0], "First sentence here. Second sentence here.");
  assert.ok(chunks[1].startsWith("Second sentence here."));
});

test("a word that fits the request remains whole even when it exceeds the overlap fragment", () => {
  const word = "a".repeat(28);
  const chunks = chunkText(`Intro words ${word} final words`, 32, 8);
  assert.ok(chunks.some(chunk => chunk.includes(word)));
  assert.ok(chunks.every(chunk => Buffer.byteLength(chunk) <= 32));
});

test("hydration batches topics for only ranked returned rows and filters before limiting", async () => {
  const rows = Array.from({ length: 40 }, (_, i) => ({ id: id(i + 1), status: "Published", title: `Entry ${i}`, metadata: {} }));
  const topicQueries = [];
  const content = { from(table) {
    let ids;
    const builder = { select: () => builder, eq: () => builder, is: () => builder, limit: () => builder,
      in: (_column, value) => { ids = value; if (table === "entry_terms") topicQueries.push(value); return builder; },
      then(resolve) { return Promise.resolve({ data: table === "entries" ? rows.filter(row => ids.includes(row.id)) : ids.map(entry_id => ({ entry_id, terms: { label: "Topic", taxonomies: { project_id: id(99) } } })), error: null }).then(resolve); }
    };
    return builder;
  } };
  const candidates = rows.map((row, i) => ({ source_kind: "entry", source_id: row.id, score: 1 - i / 100 }));
  const result = await hydratedCandidates({ content, projectId: id(99), user: { id: id(98) } }, candidates, [{ entry_id: id(1), status: "Active", rule_type: "exclude" }], { limit: 12 });
  assert.equal(result.length, 12);
  assert.equal(result[0].sourceId, id(2));
  assert.deepEqual(result[0].topics, ["Topic"]);
  assert.equal(topicQueries.length, 1);
  assert.equal(topicQueries[0].length, 12);
});

test("stale source jobs complete without surfacing a failure", async () => {
  const calls = [];
  const previous = globalThis.geigerVectorPool;
  globalThis.geigerVectorPool = { query: async (_sql, args) => { calls.push(args); return { rowCount: 1 }; } };
  try {
    await repo.finishJob({ id: id(1), lease_token: id(2), attempts: 1 }, { code: "stale_source", message: "Changed", status: 409 });
    assert.equal(calls[0][2], "completed");
    assert.equal(calls[0][3], null);
    assert.equal(calls[0][4], null);
  } finally { globalThis.geigerVectorPool = previous; }
});

test("profile signatures deduplicate activity and refresh when source content, vectors or topics change", async () => {
  const row = { id: id(1), primary_identifier: id(2), identifiers: [id(2)] };
  let events = [{ id: id(4), entry_id: id(3), type: "save", at: "2026-10-01T00:00:00Z", created_by: id(2), context: { profileId: id(1) } }];
  let vectors = [{ source_kind: "entry", source_id: id(3), revision: "first" }];
  let source = { id: id(3), status: "Published", body: "First body", title: "Title", metadata: {} };
  let terms = [];
  const admin = { schema: () => admin, from: (table) => {
    const data = () => table === "events" ? events : table === "entry_terms" ? terms : [source];
    const builder = { select: () => builder, eq: () => builder, in: () => builder, is: () => builder, gte: () => builder, order: () => builder,
      limit: async () => ({ data: data(), error: null }),
      then: (resolve) => Promise.resolve({ data: data(), error: null }).then(resolve) };
    return builder;
  } };
  const previous = globalThis.geigerVectorPool;
  globalThis.geigerVectorPool = { query: async () => ({ rows: vectors }) };
  try {
    const first = await profileRevision(id(99), row, {}, admin);
    assert.equal(await profileRevision(id(99), row, {}, admin), first);
    source = { ...source, updated_at: "today" };
    assert.equal(await profileRevision(id(99), row, {}, admin), first);
    source = { ...source, body: "Second body" };
    const contentChanged = await profileRevision(id(99), row, {}, admin);
    assert.notEqual(contentChanged, first);
    terms = [{ entry_id: id(3), terms: { label: "Fresh topic", taxonomies: { project_id: id(99) } } }];
    assert.notEqual(await profileRevision(id(99), row, {}, admin), contentChanged);
    vectors = [{ ...vectors[0], revision: "second" }];
    assert.notEqual(await profileRevision(id(99), row, {}, admin), first);
    events = [...events, { ...events[0], id: id(5), type: "not_interested" }];
    assert.notEqual(await profileRevision(id(99), row, {}, admin), first);
  } finally { globalThis.geigerVectorPool = previous; }
});

test("unchanged profiles without signals do not requeue after completion", async () => {
  const previous = globalThis.geigerVectorPool;
  const client = { query: async (sql) => {
    if (sql.includes("pg_database_size")) return { rows: [{ bytes: 1 }] };
    if (sql.includes("source_kind='profile'")) return { rows: [{ exists: true }], rowCount: 1 };
    if (sql.startsWith("insert")) assert.fail("An unchanged completed profile must not be queued again");
    return { rows: [], rowCount: 0 };
  }, release() {} };
  globalThis.geigerVectorPool = { connect: async () => client };
  try { assert.equal(await repo.enqueue(id(99), "profile", id(1), "same"), 0); }
  finally { globalThis.geigerVectorPool = previous; }
});

test("retrying jobs returns the repository result for the requested project", async () => {
  const previous = globalThis.geigerVectorPool;
  globalThis.geigerVectorPool = { query: async (_sql, args) => {
    assert.deepEqual(args, [id(99)]);
    return { rowCount: 3 };
  } };
  try { assert.deepEqual(await repo.retryJobs(id(99)), { retried: 3 }); }
  finally { globalThis.geigerVectorPool = previous; }
});

test("chunk hashes reuse identical inputs after movement but invalidate altered title or model", () => {
  assert.equal(typeof core.chunkFingerprint, "function");
  const first = core.chunkFingerprint({ title: "Title", text: "Same text", chunkIndex: 0 });
  assert.equal(core.chunkFingerprint({ title: "Title", text: "Same text", chunkIndex: 3 }), first);
  assert.notEqual(core.chunkFingerprint({ title: "New title", text: "Same text" }), first);
  assert.notEqual(core.chunkFingerprint({ title: "Title", text: "Same text" }, "next-model"), first);
});

test("cron authentication rejects missing configuration and malformed bearer tokens", () => {
  const request = (value) => new Request("https://example.test/api/cron/embeddings", { headers: value ? { authorization: value } : {} });
  assert.equal(cronAuthorized(request(), ""), false);
  assert.equal(cronAuthorized(request("Bearer fixture"), ""), false);
  assert.equal(cronAuthorized(request(), "fixture"), false);
  assert.equal(cronAuthorized(request("Bearer other"), "fixture"), false);
  assert.equal(cronAuthorized(request("Bearer fixture"), "fixture"), true);
});

test("publishing and rollup cron routes reject unauthenticated calls before accessing service data", async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "";
  try {
    for (const route of ["publish-due", "rollups"]) {
      const source = (await readFile(new URL(`../app/api/cron/${route}/route.js`, import.meta.url), "utf8"))
        .replaceAll(/@\/lib\/vector\/([^"']+)/g, (_match, name) => new URL(`../lib/vector/${name}`, import.meta.url).href);
      const handler = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
      const response = await handler.GET(new Request(`https://example.test/api/cron/${route}`));
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: "Unauthorized." });
    }
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("production cron schedules target the configured application base path", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const { default: configuration } = await import(new URL(`../next.config.mjs?cron-verification=${Date.now()}`, import.meta.url));
    const deployment = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
    const expected = ["embeddings", "publish-due", "rollups"].map(operation => `${configuration.basePath}/api/cron/${operation}`).sort();
    assert.deepEqual(deployment.crons.map(cron => cron.path).sort(), expected);
    assert.ok(deployment.crons.every(cron => typeof cron.schedule === "string" && cron.schedule.trim().split(/\s+/).length === 5));
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
