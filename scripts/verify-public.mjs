import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
const baseline = process.argv.includes("--baseline");
const base = process.env.DELIVERY_TEST_URL || "http://localhost:3000";
const client = new pg.Client({ connectionString: process.env.STRING_URI });
const project = randomUUID();
const published = randomUUID();
const draft = randomUUID();
const privateEntry = randomUUID();
const profile = randomUUID();
const deniedIdentifier = `verification-${randomUUID()}`;
let created = false;
let passed = 0;

async function check(label, test) {
  await test();
  passed += 1;
  console.log(`PASS ${label}`);
}

async function request(path, body) {
  return fetch(`${base}${path}`, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

try {
  await client.connect();
  const { rows: users } = await client.query("select id from auth.users limit 1");
  assert.ok(users.length, "Verification needs an existing workspace user");
  await client.query("begin");
  await client.query("insert into public.projects (id,name,created_by) values ($1,'Delivery verification fixture',$2)", [project, users[0].id]);
  await client.query("insert into content.entries (id,project_id,title,slug,status,body,metadata) values ($1::uuid,$4::uuid,'Delivery verification fixture',$1::text,'Published','Verification content','{}'),($2::uuid,$4::uuid,'Draft verification fixture',$2::text,'Draft','','{}'),($3::uuid,$4::uuid,'Private verification fixture',$3::text,'Published','','{\"visibility\":\"private\"}')", [published, draft, privateEntry, project]);
  await client.query("insert into content.profiles (id,project_id,primary_identifier) values ($1,$2,$3)", [profile, project, deniedIdentifier]);
  await client.query("insert into content.consent_state (profile_id,purpose,status) values ($1,'analytics','denied'),($1,'personalization','denied')", [profile]);
  const slot = randomUUID();
  await client.query("insert into content.slots (id,project_id,key,fallback_entry_id) values ($1,$2,'verification',$3)", [slot, project, published]);
  await client.query("insert into content.variants (project_id,slot_id,entry_id,rules) values ($1,$2,$3,'{}')", [project, slot, published]);
  await client.query("commit");
  created = true;

  await check("public REST returns published content", async () => {
    const response = await request(`/api/content/v1/entries?project=${project}`);
    assert.equal(response.status, 200);
    const rows = await response.json();
    assert.ok(rows.some((row) => row.id === published));
    assert.ok(!rows.some((row) => row.id === draft));
    if (!baseline) assert.ok(!rows.some((row) => row.id === privateEntry));
  });
  await check("public slug delivery works", async () => {
    const response = await request(`/api/content/v1/entries/${published}?project=${project}`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).id, published);
  });
  await check("published renderer works and rejects drafts", async () => {
    const live = await request(`/c/${published}`);
    assert.equal(live.status, 200);
    assert.ok((await live.text()).includes("Delivery verification fixture"));
    assert.equal((await request(`/c/${draft}`)).status, 404);
    if (!baseline) assert.equal((await request(`/c/${privateEntry}`)).status, 404);
  });
  await check("GraphQL delivery reads published content", async () => {
    const response = await request("/api/content/v1/graphql", { query: `{ entries(projectId: "${project}") { id title } }` });
    assert.equal(response.status, 200);
    const rows = (await response.json()).data.entries;
    assert.ok(rows.some((row) => row.id === published));
    assert.ok(!rows.some((row) => row.id === draft));
    if (!baseline) assert.ok(!rows.some((row) => row.id === privateEntry));
  });
  await check("collect beacon persists scoped events", async () => {
    const response = await request("/api/content/v1/collect", { projectId: project, entryId: published, anonymousId: "verification-visitor", type: "page_view" });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    const count = await client.query("select count(*)::int n from content.events where project_id=$1", [project]);
    assert.equal(count.rows[0].n, 1);
  });
  await check("both beacon identifiers enforce denied consent", async () => {
    const response = await request("/api/content/v1/collect", { projectId: project, entryId: published, anonymousId: deniedIdentifier, userId: "unmatched-verification-user" });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).suppressed, true);
    const count = await client.query("select count(*)::int n from content.events where project_id=$1", [project]);
    assert.equal(count.rows[0].n, 1);
  });
  await check("beacon rejects private entries and invalid scopes", async () => {
    assert.equal((await request("/api/content/v1/collect", { projectId: project, entryId: privateEntry, anonymousId: "verification" })).status, 404);
    assert.equal((await request("/api/content/v1/collect", { anonymousId: "verification" })).status, 400);
    assert.equal((await fetch(`${base}/api/content/v1/collect`, { method: "OPTIONS" })).status, 204);
  });
  await check("decisions preserve delivery with personalization denied", async () => {
    const response = await request("/api/decide", { projectId: project, slotKey: "verification", profile: { id: "unmatched-verification-user", anonymousId: deniedIdentifier } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).entryId, published);
  });
  if (!baseline) await check("real decisions are recorded without visitor identifiers", async () => {
    const response = await request("/api/decide", { projectId: project, slotKey: "verification", profile: { anonymousId: "verification-visitor" }, context: { locale: "en", email: "private@example.test" } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).entryId, published);
    const rows = await client.query("select context from content.decision_traces where project_id=$1", [project]);
    assert.equal(rows.rowCount, 1);
    assert.deepEqual(rows.rows[0].context, { locale: "en" });
  });
  await check("workspace operations and crons fail closed without authorization", async () => {
    for (const path of [`/api/vector/duplicates?projectId=${project}`, `/api/assistant?projectId=${project}`, `/api/cache-invalidation?projectId=${project}`]) {
      assert.equal((await request(path)).status, 401);
    }
    for (const path of ["embeddings", "publish-due", "rollups"]) {
      const status = (await request(`/api/cron/${path}`)).status;
      assert.ok(status === 401 || status === 503);
    }
  });
  console.log(`Public delivery verification: ${passed} passed (${baseline ? "before" : "after"} RLS tightening).`);
} catch (error) {
  console.error(`Public delivery verification failed: ${error.code || error.name || "unavailable"}`);
  process.exitCode = 1;
} finally {
  try {
    await client.query("rollback");
    if (created) {
      await client.query("begin");
      const trace = await client.query("select to_regclass('content.decision_traces') is not null present");
      if (trace.rows[0].present) await client.query("delete from content.decision_traces where project_id=$1", [project]);
      for (const table of ["events", "metrics_daily", "variants", "slots", "entries"]) await client.query(`delete from content.${table} where project_id=$1`, [project]);
      await client.query("delete from content.consent_state where profile_id=$1", [profile]);
      await client.query("delete from content.profiles where project_id=$1", [project]);
      await client.query("delete from public.projects where id=$1", [project]);
      await client.query("commit");
      console.log("Verification fixtures removed; existing workspace data was untouched.");
    }
  } catch (error) { console.error(`Fixture cleanup failed: ${error.code || "unavailable"}`); process.exitCode = 1; }
  await client.end();
}
