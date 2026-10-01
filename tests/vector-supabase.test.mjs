import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";
import { hydratedCandidates } from "../lib/vector/sources.mjs";

nextEnv.loadEnvConfig(process.cwd());

test("candidate hydration projects eligibility and display fields without content documents", async () => {
  const project = "00000000-0000-4000-8000-000000000001";
  const user = "00000000-0000-4000-8000-000000000002";
  const entryId = "00000000-0000-4000-8000-000000000003";
  const draftId = "00000000-0000-4000-8000-000000000004";
  const assetId = "00000000-0000-4000-8000-000000000005";
  const base = "https://fixture.supabase.co";
  const selected = [], topicIds = [];
  const tables = {
    entries: [{ id: entryId, project_id: project, title: "Published fixture", slug: "fixture", type: "Article", status: "Published", excerpt: "Summary", metadata: { topics: ["Existing"] }, created_by: user, created_at: "2026-10-01T00:00:00Z", body: "Large body", data: { blocks: ["large"] } }, { id: draftId, project_id: project, status: "Draft", body: "Excluded body", metadata: {} }],
    assets: [{ id: assetId, project_id: project, name: "Owned image", file_type: "image", mime: "image/jpeg", status: "Ready", alt: "Image description", url: `${base}/storage/v1/object/public/content/assets/${project}/${assetId}/photo.jpg`, metadata: { entry_id: entryId }, created_by: user }],
    entry_terms: [{ entry_id: entryId, terms: { label: "Taxonomy", taxonomies: { project_id: project } } }],
  };
  const content = { rpc: async () => ({ data: true, error: null }), from(table) {
    let columns, ids;
    const builder = {
      select(value) { columns = value; selected.push({ table, columns }); return builder; },
      eq: () => builder, is: () => builder,
      in(_column, value) { ids = value; if (table === "entry_terms") topicIds.push(value); return builder; },
      limit: () => builder,
      then(resolve) {
        const records = tables[table].filter(row => ids.includes(table === "entry_terms" ? row.entry_id : row.id));
        const data = table === "entry_terms" || columns === "*" ? records : records.map(row => Object.fromEntries(columns.split(",").map(column => [column, row[column]])));
        return Promise.resolve({ data, error: null }).then(resolve);
      },
    };
    return builder;
  } };
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = base;
  try {
    const results = await hydratedCandidates({ content, projectId: project, user: { id: user } }, [
      { source_kind: "entry", source_id: entryId, score: 1 },
      { source_kind: "entry", source_id: draftId, score: 0.9 },
      { source_kind: "asset", source_id: assetId, score: 0.8 },
    ]);
    assert.deepEqual(results.map(row => row.sourceId), [entryId, assetId]);
    assert.equal(results[0].entry.slug, "fixture");
    assert.equal(results[0].entry.createdAt, "2026-10-01T00:00:00Z");
    assert.equal(results[1].title, "Owned image");
    assert.equal(results[1].excerpt, "Image description");
    assert.deepEqual(results[0].topics, ["Existing", "Taxonomy"]);
    assert.deepEqual(results[1].topics, ["Taxonomy"]);
    assert.deepEqual(topicIds, [[entryId]]);
    for (const selection of selected.filter(item => ["entries", "assets"].includes(item.table))) {
      assert.ok(!selection.columns.split(",").some(column => ["*", "body", "data"].includes(column)), "Hydration must omit complete content documents");
    }
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
});

test("members read their own grants, project owners manage all grants, and outsiders are denied", { skip: process.env.VECTOR_LIVE_TESTS !== "1" }, async () => {
  const db = new pg.Client({ connectionString: process.env.STRING_URI });
  await db.connect();
  try {
    await db.query("begin");
    const users = (await db.query("select id from auth.users order by created_at,id limit 3")).rows;
    assert.equal(users.length, 3, "Live authorization verification needs three actual identities");
    const [ownerId, userId, outsiderId] = users.map(row => row.id);
    const projectId = randomUUID(), organizationId = randomUUID(), roleId = randomUUID();
    const mine = randomUUID(), foreign = randomUUID();
    await db.query("insert into public.organizations(id,name,created_by,owner) values($1,'Vector RLS fixture',$2,$2)", [organizationId, ownerId]);
    await db.query("insert into public.organization_users(organization,\"user\") values($1,$2),($1,$3)", [organizationId, ownerId, userId]);
    await db.query("insert into public.projects(id,name,slug,created_by,organization_id) values($1::uuid,'Vector RLS test',$1::uuid::text,$2,$3)", [projectId, ownerId, organizationId]);
    await db.query("insert into public.roles(id,project_id,name,permissions) values($1,$2,'Vector reader',array['content.intelligence.view'])", [roleId, projectId]);
    await db.query("insert into content.role_grants(id,project_id,user_id,role_id) values($1,$2,$3,$4),($5,$2,$6,$4)", [mine, projectId, userId, roleId, foreign, ownerId]);
    const setUser = (id) => db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claims',$2,true)", [id, JSON.stringify({ sub: id, role: "authenticated" })]);
    await setUser(userId);
    await db.query("set local role authenticated");
    const result = await db.query("select id from content.role_grants where project_id=$1", [projectId]);
    assert.deepEqual(result.rows.map(row => row.id), [mine]);
    const allowed = await db.query("select content.rbac_allows('content.intelligence.view',$1) as allowed", [projectId]);
    assert.equal(allowed.rows[0].allowed, true);
    await setUser(ownerId);
    const ownerGrants = await db.query("select id from content.role_grants where project_id=$1", [projectId]);
    assert.deepEqual(ownerGrants.rows.map(row => row.id).sort(), [mine, foreign].sort());
    await setUser(outsiderId);
    assert.equal((await db.query("select id from content.role_grants where project_id=$1", [projectId])).rowCount, 0);
  } finally {
    await db.query("rollback");
    await db.end();
  }
});
