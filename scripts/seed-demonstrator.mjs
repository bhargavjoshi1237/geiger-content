import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";
import pg from "pg";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { buildDemo, renderSeed, demoId, DEMO_PROJECT, DEMO_TAG } from "./demo-data.mjs";

nextEnv.loadEnvConfig(process.cwd());
const db = new pg.Client({ connectionString: process.env.STRING_URI, connectionTimeoutMillis: 10000 });
const seedPath = "supabase/seeds/demonstrator/project.sql";
const reportPath = "docs/demonstrator-seed-report.json";
const verifyOnly = process.argv.includes("--verify");
const dryRun = process.argv.includes("--dry-run");
const indexOnly = process.argv.includes("--index");

async function media() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const titles = ["CONTENT STUDIO", "START HERE", "AUTUMN JOURNAL", "CONTENT MODELS", "EDITORIAL REVIEW", "DELIVERY GUIDE", "CONSENT FIRST", "READER JOURNEYS", "HEADLINE TEST", "LAUNCH METRICS", "LOCALIZATION", "CONTENT STUDIO"];
  const colors = ["#173e37", "#244768", "#633a24", "#423b65"];
  const files = [];
  let firstBytes;
  for (let i = 0; i < 16; i++) {
    const id = demoId(`assets:${i}`);
    let bytes, mime, filename, name, alt;
    if (i < 12) {
      const label = titles[i];
      const lines = label.split(" ");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720"><rect width="1200" height="720" fill="${colors[i % 4]}"/><circle cx="1060" cy="70" r="290" fill="#fff" opacity=".08"/><circle cx="1080" cy="650" r="310" fill="#fff" opacity=".05"/><path d="M72 140H1128" stroke="#fff" opacity=".28"/><text x="72" y="105" font-family="Arial" font-size="25" letter-spacing="5" fill="#dbe8da">GEIGER / DEMONSTRATION</text>${lines.map((line, n) => `<text x="72" y="${300 + n * 108}" font-family="Arial" font-weight="700" font-size="92" fill="#fff">${line}</text>`).join("")}<text x="72" y="660" font-family="Arial" font-size="25" fill="#dbe8da">Create useful content. Deliver it confidently.</text></svg>`;
      bytes = i === 11 ? firstBytes : await sharp(Buffer.from(svg)).png().toBuffer();
      if (i === 0) firstBytes = bytes;
      mime = "image/png"; filename = "cover.png";
      name = `${label.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}${i === 11 ? " — duplicate review example" : " — cover"}`;
      alt = `Geiger demonstration cover reading ${label.toLowerCase()}, with a geometric background.`;
    } else {
      name = ["Editorial review checklist", "REST delivery quickstart", "Consent scenario matrix", "Autumn launch brief"][i - 12];
      bytes = Buffer.from(`# ${name}\n\nSynthetic Geiger Content Studio demonstration document.\n\n- Inspect the related entry and its saved versions.\n- Verify project, environment, locale, and publication state.\n- Resolve review comments and verify the public fallback.\n- Use synthetic audience profiles to compare consent scenarios.\n\nProject: ${DEMO_PROJECT}\n`);
      mime = "text/markdown"; filename = "playbook.md"; alt = name;
    }
    const path = `assets/${DEMO_PROJECT}/${id}/${filename}`;
    const url = sb.storage.from("content").getPublicUrl(path).data.publicUrl;
    const existing = await db.query("select 1 from content.assets where id=$1 and project_id=$2", [id, DEMO_PROJECT]);
    if (!dryRun && !existing.rowCount) {
      const { error } = await sb.storage.from("content").upload(path, bytes, { contentType: mime, upsert: false });
      if (error && !/already exists|duplicate/i.test(error.message)) throw new Error(`Media upload failed (${i}): ${error.message}`);
    }
    files.push({ name, url, alt, mime, file_type: i < 12 ? "image" : "document", size_bytes: bytes.length, metadata: { content_hash: createHash("sha256").update(bytes).digest("hex"), ...(i === 11 ? { intentionalDuplicateOf: demoId("assets:0") } : {}) } });
  }
  return files;
}

async function verify(ownerId) {
  const counts = (await db.query(`select table_name from information_schema.columns where table_schema='content' and column_name='id' and table_name not in ('geiger_migrations','rls_tightening_backup') order by table_name`)).rows;
  const report = { projectId: DEMO_PROJECT, seed: DEMO_TAG, verifiedAt: new Date().toISOString(), counts: {}, checks: [] };
  const demoIds = [];
  for (const { table_name: table } of counts) {
    const info = await db.query("select column_name from information_schema.columns where table_schema='content' and table_name=$1", [table]);
    const names = info.rows.map(r => r.column_name);
    let condition;
    if (table === "role_grants") condition = "project_id=$2 and status='active' and deleted_at is null";
    else if (names.includes("metadata")) condition = "metadata->>'demoSeed'=$1";
    else if (table === "audit_log") condition = "diff->>'synthetic'='true' and project_id=$2";
    else if (table === "profile_traits" || table === "consent_state") condition = "profile_id in (select id from content.profiles where metadata->>'demoSeed'=$1 and project_id=$2)";
    else if (table === "metrics_daily" || table === "decision_traces") condition = "project_id=$2";
    else continue;
    const sql = `select id from content.${table} where ${condition}${names.includes("project_id") && !condition.includes("project_id=$2") ? " and project_id=$2" : ""}`;
    // Keep both placeholders typed even when a table only uses project_id.
    const result = await db.query(`with params as (select $1::text seed,$2::uuid project) ${sql}`, [DEMO_TAG, DEMO_PROJECT]);
    report.counts[table] = result.rowCount;
    demoIds.push({ table, ids: result.rows.map(r => r.id) });
  }
  const check = (name, condition) => { assert.ok(condition, name); report.checks.push(name); console.log(`PASS ${name}`); };
  check("Seeded feature tables contain records", Object.entries(report.counts).filter(([table]) => table !== "entry_embeddings").every(([, n]) => n > 0));
  const states = await db.query("select status,count(*)::int n from content.entries where project_id=$1 and metadata->>'demoSeed'=$2 group by status", [DEMO_PROJECT, DEMO_TAG]);
  check("Published, Draft, In review, Scheduled, Archived content is present", ["Published", "Draft", "In review", "Scheduled", "Archived"].every(s => states.rows.some(r => r.status === s && r.n > 0)));
  const mismatch = await db.query(`with raw as (select entry_id,(at at time zone 'UTC')::date date,count(*) filter(where type='page_view') views,count(*) filter(where type='conversion') conversions from content.events where project_id=$1 and metadata->>'demoSeed'=$2 group by entry_id,(at at time zone 'UTC')::date) select count(*)::int n from raw full join content.metrics_daily m on m.project_id=$1 and m.entry_id=raw.entry_id and m.date=raw.date where (raw.entry_id is not null or m.entry_id in(select id from content.entries where project_id=$1 and metadata->>'demoSeed'=$2)) and (coalesce(raw.views,0)<>coalesce(m.views,0) or coalesce(raw.conversions,0)<>coalesce(m.conversions,0))`, [DEMO_PROJECT, DEMO_TAG]);
  check("Daily analytics exactly match synthetic page views and conversions", mismatch.rows[0].n === 0);
  const denied = await db.query("select count(*)::int n from content.events e join content.profiles p on e.anonymous_id=any(p.identifiers) join content.consent_state c on c.profile_id=p.id and c.purpose='analytics' where e.project_id=$1 and e.metadata->>'demoSeed'=$2 and c.status<>'granted'", [DEMO_PROJECT, DEMO_TAG]);
  check("Pending and denied analytics profiles have no seeded tracking events", denied.rows[0].n === 0);
  const bad = await db.query("select count(*)::int n from content.variants v join content.entries e on e.id=v.entry_id join content.slots s on s.id=v.slot_id where v.project_id=$1 and v.metadata->>'demoSeed'=$2 and (e.project_id<>v.project_id or s.project_id<>v.project_id or e.status<>'Published' or e.metadata->>'visibility'='private')", [DEMO_PROJECT, DEMO_TAG]);
  check("All active delivery variants point to published public entries in this project", bad.rows[0].n === 0);
  for (let i = 0; i < 16; i++) {
    const assetId = demoId(`assets:${i}`);
    const asset = (await db.query("select url,size_bytes from content.assets where id=$1", [assetId])).rows[0];
    const response = await fetch(asset.url);
    check(`Stored media is readable (${assetId.slice(0, 8)})`, response.ok && (await response.arrayBuffer()).byteLength === Number(asset.size_bytes));
  }
  // Use the same authenticated role, claims, RLS and RPCs as the app. Mutating
  // membership/rate-limit function checks are rolled back after validation.
  await db.query("begin");
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claims',$2,true)", [ownerId, JSON.stringify({ sub: ownerId, role: "authenticated" })]);
    await db.query("set local role authenticated");
    const permissions = (await db.query("select content.can_access_project($1) access,content.is_project_owner($1) owner,content.rbac_allows('content.entry.edit',$1) edit,content.rbac_allows('content.entry.publish',$1) publish,content.rbac_ensure_membership($1) membership,content.reserve_assistant_request($1) assistant", [DEMO_PROJECT])).rows[0];
    check("Authenticated owner can access, edit, publish, ensure membership and reserve assistant requests", Object.values(permissions).every(Boolean));
    for (const { table, ids } of demoIds.filter(t => t.ids.length)) {
      const visible = await db.query(`select count(*)::int n from content.${table} where id=any($1::uuid[])`, [ids]);
      check(`Authenticated RLS reads ${table}`, visible.rows[0].n === ids.length);
    }
    const taxonomy = demoId("taxonomies:topics"), parent = demoId("terms:platform");
    check("Taxonomy parent scope function accepts the demo hierarchy", (await db.query("select content.term_parent_scoped($1,$2) ok", [taxonomy, parent])).rows[0].ok);
    const touch = await db.query("update content.entries set title=title where id=$1 returning updated_at > created_at as touched", [demoId("entries:published:0")]);
    check("Entry mutation guard and updated-at trigger work for the authenticated owner", touch.rows[0]?.touched);
  } finally { await db.query("rollback"); }
  await mkdir("docs", { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report.counts));
  return report;
}

async function indexDemo(ownerId) {
  const { vectorPool } = await import("../lib/vector/connection.mjs");
  const repo = await import("../lib/vector/repository.mjs");
  const { runWorker } = await import("../lib/vector/ingestion.mjs");
  try {
    const current = await repo.getSettings(DEMO_PROJECT);
    await repo.saveSettings(DEMO_PROJECT, { ...current, enabled: true, indexImages: true, indexText: true, audienceEnabled: true }, ownerId);
    let idle = 0;
    for (let turn = 0; turn < 100 && idle < 3; turn++) {
      const result = await runWorker({ projectId: DEMO_PROJECT, limit: 5 });
      console.log("INDEX", JSON.stringify(result));
      const pending = (await vectorPool().query("select status,count(*)::int n from content.embedding_jobs where project_id=$1 and deleted_at is null group by status", [DEMO_PROJECT])).rows;
      console.log("JOBS", JSON.stringify(pending));
      if (result.failed || result.deferred) break;
      idle = result.completed || result.queued ? 0 : idle + 1;
    }
    const vectors = (await vectorPool().query("select source_kind,count(*)::int n from content.vectors where project_id=$1 and active and deleted_at is null group by source_kind", [DEMO_PROJECT])).rows;
    console.log("VECTORS", JSON.stringify(vectors));
    // Preserve real provider output for the older embedding inspection table.
    const embeddings = (await vectorPool().query("select distinct on(source_id) source_id,embedding::text embedding,model from content.vectors where project_id=$1 and source_kind='entry' and active and deleted_at is null order by source_id,chunk_index", [DEMO_PROJECT])).rows;
    for (const row of embeddings) await db.query("insert into content.entry_embeddings(id,project_id,entry_id,embedding,model,metadata,created_by) select $1,$2,e.id,$3::jsonb,$4,$5::jsonb,$6 from content.entries e where e.id=$7 and e.project_id=$2 and e.metadata->>'demoSeed'=$8 on conflict do nothing", [demoId(`embedding:${row.source_id}`), DEMO_PROJECT, row.embedding, row.model, JSON.stringify({ demoSeed: DEMO_TAG, provider: "Gemini", realEmbedding: true }), ownerId, row.source_id, DEMO_TAG]);
    const jobs = (await vectorPool().query("select status,count(*)::int n from content.embedding_jobs where project_id=$1 and deleted_at is null group by status", [DEMO_PROJECT])).rows;
    await writeFile("docs/demonstrator-vector-report.json", JSON.stringify({ projectId: DEMO_PROJECT, verifiedAt: new Date().toISOString(), vectors, jobs }, null, 2) + "\n");
    if (jobs.some(row => row.status !== "completed" && row.n > 0)) {
      console.error("Semantic indexing remains incomplete; inspect the project job queue before rerunning.");
      process.exitCode = 1;
    }
  } finally { await vectorPool().end(); }
}

try {
  await db.connect();
  const project = (await db.query("select id,name,created_by from public.projects where id=$1 and deleted_at is null", [DEMO_PROJECT])).rows[0];
  assert.ok(project, "Target project must already exist");
  const ownerId = (await db.query("select g.user_id from content.role_grants g join public.roles r on r.id=g.role_id join auth.users u on u.id=g.user_id where g.project_id=$1 and r.key='owner' and g.status='active' and g.deleted_at is null and r.deleted_at is null order by g.created_at desc limit 1", [DEMO_PROJECT])).rows[0]?.user_id;
  assert.ok(ownerId, "Target project must already have an authenticated owner");
  console.log(`Target: ${project.name} (${project.id})`);
  if (!verifyOnly && !indexOnly) {
    const columns = (await db.query("select table_schema,table_name,column_name from information_schema.columns where table_schema='content' order by table_name,ordinal_position")).rows;
    const demo = buildDemo({ ownerId, columns, assetFiles: await media() });
    await mkdir("supabase/seeds/demonstrator", { recursive: true });
    await writeFile(seedPath, renderSeed(demo.tables));
    console.log("PLAN", JSON.stringify(Object.fromEntries([...demo.tables].map(([table, rows]) => [table, rows.length]))));
    if (!dryRun) {
      // Apply only this file through the project's transactional seed runner.
      execFileSync(process.execPath, ["node_modules/@geiger/orm/bin/geiger-orm.js", "seed", "demonstrator/project.sql"], { stdio: "inherit", env: { ...process.env, GEIGER_VECTOR_DB: "0" } });
      // A second run proves that the seed does not duplicate its records.
      execFileSync(process.execPath, ["node_modules/@geiger/orm/bin/geiger-orm.js", "seed", "demonstrator/project.sql"], { stdio: "inherit", env: { ...process.env, GEIGER_VECTOR_DB: "0" } });
    }
  }
  if (indexOnly) await indexDemo(ownerId);
  if (!dryRun) await verify(ownerId);
} catch (error) {
  console.error(`Demonstrator failed: ${error.code || error.name}: ${error.message}`);
  process.exitCode = 1;
} finally { await db.end(); }
