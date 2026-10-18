// The playground's /api/* stand-ins answer the shapes the screens read.
// Run from the app root (see the test:playground script).
import test from "node:test";
import assert from "node:assert/strict";

import { playgroundRoutes } from "../handlers.js";
import { PLAYGROUND_PROJECT } from "../mode.js";

const projectId = PLAYGROUND_PROJECT.id;

async function call(method, path, { query = {}, body = null } = {}) {
  const route = playgroundRoutes.find(([m, p]) => m === method && p === path);
  assert.ok(route, `no route for ${method} ${path}`);
  const out = await route[2]({ params: {}, query: { projectId, ...query }, body });
  if (out instanceof Response) return { status: out.status, data: await out.json() };
  return { status: 200, data: out };
}

test("delivery list and graphql return published entries", async () => {
  const list = await call("GET", "/api/content/v1/entries", { query: { project: projectId, limit: "5" } });
  assert.equal(list.data.length, 5);
  assert.ok(list.data.every((e) => e.status === "Published" && e.title));
  const gql = await call("POST", "/api/content/v1/graphql", { body: { query: `{ entries(projectId: "${projectId}") { id title slug status } }` } });
  assert.ok(gql.data.data.entries.length > 10);
});

test("decide picks content for a seeded slot", async () => {
  const { data: slots } = { data: (await import("../db.js")).getPlaygroundDb().table("content.slots") };
  const out = await call("POST", "/api/decide", { body: { slotKey: slots[0].key, profile: {}, context: { locale: "en" } } });
  assert.equal(out.status, 200);
  assert.ok(out.data.entryId, out.data.reason);
});

test("semantic status, search and similar read the seed", async () => {
  const status = await call("GET", "/api/vector/status");
  assert.ok(status.data.sources.length > 10 && status.data.totals && status.data.quota);
  const search = await call("POST", "/api/vector/search", { body: { query: "personalization consent", kind: "all" } });
  assert.ok(search.data.results.length > 0);
  assert.match(search.data.results[0].title, /consent|personaliz/i);
  const ref = search.data.results.find((r) => r.sourceKind === "entry");
  const similar = await call("POST", "/api/vector/similar", { body: { referenceId: ref.sourceId, referenceKind: "entry", kind: "entry", limit: 8 } });
  assert.equal(similar.data.results.length, 8);
  assert.ok(similar.data.results.every((r) => r.entry && typeof r.score === "number"));
});

test("every insight screen has rows", async () => {
  for (const [op, query] of [["duplicates", { threshold: "0.8" }], ["gaps", { minimum: "3" }], ["graph", {}], ["tags", {}], ["decisions", { days: "30" }]]) {
    const out = await call("GET", `/api/vector/${op}`, { query });
    assert.equal(out.status, 200, op);
    assert.ok(out.data.rows.length > 0, `${op} has no rows`);
  }
});

test("audience, knowledge and recommendations work for the visitor", async () => {
  const audience = await call("GET", "/api/vector/audience");
  assert.ok(audience.data.profileId);
  assert.ok(audience.data.knowledge.length > 0);
  await call("POST", "/api/vector/audience", { body: { consent: "granted" } });
  const recs = await call("POST", "/api/vector/recommend", { body: {} });
  assert.ok(recs.data.results.length > 0);
  const notes = await call("GET", "/api/vector/knowledge", { query: { query: "personalization" } });
  assert.ok(notes.data.results.length > 0);
});

test("assistant, consent and cache invalidation write to memory", async () => {
  const history = await call("GET", "/api/assistant");
  assert.equal(history.data.configured, true);
  const asked = await call("POST", "/api/assistant", { body: { prompt: "Suggest a headline", entryId: history.data.entries[0].id } });
  assert.ok(asked.data.response);
  const cache = await call("GET", "/api/cache-invalidation");
  const done = await call("POST", "/api/cache-invalidation", { body: { entryId: cache.data.entries[0].id } });
  assert.equal(done.data.status, "Revalidation requested");
  assert.equal((await call("GET", "/api/cache-invalidation")).data.history.length, cache.data.history.length + 1);
});
