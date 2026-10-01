import pg from "pg";
import nextEnv from "@next/env";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function verificationOutcome(passed, { baseline = false, security = false, missing = false } = {}) {
  return missing && baseline ? "SKIP" : passed ? "PASS" : baseline && security ? "LEGACY" : "FAIL";
}

export async function runRlsVerification(db, { baseline = false, report = console.log } = {}) {
  const totals = { PASS: 0, LEGACY: 0, SKIP: 0, FAIL: 0 };
  const ids = Object.fromEntries(["organization", "project", "foreignProject", "ownerRole", "writerRole", "viewerRole", "foreignRole", "draft", "published", "privateEntry", "foreignEntry", "taxonomy", "foreignTaxonomy", "term", "foreignTerm", "profile", "writerProfile", "foreignProfile", "knowledge", "writerKnowledge", "foreignKnowledge", "assistant", "writerAssistant"].map(key => [key, randomUUID()]));
  let began = false;
  async function check(label, operation, { security = false, missing = false } = {}) {
    if (missing) {
      const outcome = verificationOutcome(false, { baseline, missing });
      totals[outcome]++; report(`${outcome} ${label}`); return;
    }
    await db.query("savepoint verification_check");
    let passed = false, code = "";
    try { passed = await operation(); }
    catch (error) { code = /^[A-Z0-9]{5}$/.test(error.code || "") ? error.code : "unavailable"; }
    finally {
      await db.query("rollback to savepoint verification_check");
      await db.query("release savepoint verification_check");
    }
    const outcome = code ? "FAIL" : verificationOutcome(passed === true, { baseline, security });
    totals[outcome]++; report(`${outcome} ${label}${code ? ` (${code})` : ""}`);
  }
  async function identity(role, user = null) {
    await db.query("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true),set_config('request.jwt.claims',$3,true)", [user || "", role, JSON.stringify({ role, ...(user ? { sub: user } : {}) })]);
    await db.query(role === "anon" ? "set local role anon" : "set local role authenticated");
  }
  async function denied(sql, params) {
    try { return (await db.query(sql, params)).rowCount === 0; }
    catch (error) { if (error.code === "42501") return true; throw error; }
  }
  try {
    await db.query("begin"); began = true;
    const users = (await db.query("select id from auth.users order by created_at,id limit 5")).rows.map(row => row.id);
    if (users.length < 5) throw Object.assign(new Error("Insufficient verification identities"), { code: "SETUP" });
    const [owner, foreignOwner, writer, viewer, bootstrap] = users;
    const available = (await db.query("select to_regclass('content.assistant_messages') is not null as history,to_regprocedure('content.reserve_assistant_request(uuid)') is not null as reservation")).rows[0];
    await db.query("insert into public.organizations(id,name,created_by,owner) values($1,'RLS verification',$2,$2)", [ids.organization, owner]);
    await db.query("insert into public.organization_users(organization,\"user\") values($1,$2),($1,$3),($1,$4),($1,$5)", [ids.organization, owner, writer, viewer, bootstrap]);
    await db.query("insert into public.projects(id,name,slug,created_by,organization_id) values($1::uuid,'RLS verification',$1::uuid::text,$2,$3),($4::uuid,'RLS verification foreign',$4::uuid::text,$5,null)", [ids.project, owner, ids.organization, ids.foreignProject, foreignOwner]);
    await db.query("insert into public.roles(id,project_id,key,name,permissions) values($1,$2,'owner','Owner',array['*']),($3,$2,'writer','Writer',array['content.content.view','content.entry.edit']),($4,$2,'viewer','Viewer',array['content.content.view']),($5,$6,'owner','Owner',array['*'])", [ids.ownerRole, ids.project, ids.writerRole, ids.viewerRole, ids.foreignRole, ids.foreignProject]);
    await db.query("insert into content.role_grants(project_id,user_id,role_id) values($1,$2,$3),($1,$4,$5),($1,$6,$7),($8,$9,$10)", [ids.project, owner, ids.ownerRole, writer, ids.writerRole, viewer, ids.viewerRole, ids.foreignProject, foreignOwner, ids.foreignRole]);
    await db.query("insert into content.entries(id,project_id,title,status,metadata,created_by) values($1,$2,'Draft fixture','Draft','{}',$3),($4,$2,'Public fixture','Published','{}',$3),($5,$2,'Private fixture','Published','{\"visibility\":\"private\"}',$3),($6,$7,'Foreign fixture','Draft','{}',$8)", [ids.draft, ids.project, owner, ids.published, ids.privateEntry, ids.foreignEntry, ids.foreignProject, foreignOwner]);
    await db.query("insert into content.taxonomies(id,project_id,key,name,created_by) values($1,$2,'verification','Fixture taxonomy',$3),($4,$5,'verification','Fixture taxonomy',$6)", [ids.taxonomy, ids.project, owner, ids.foreignTaxonomy, ids.foreignProject, foreignOwner]);
    await db.query("insert into content.terms(id,taxonomy_id,label,created_by) values($1,$2,'Fixture term',$3),($4,$5,'Foreign term',$6)", [ids.term, ids.taxonomy, owner, ids.foreignTerm, ids.foreignTaxonomy, foreignOwner]);
    await db.query("insert into content.profiles(id,project_id,primary_identifier,identifiers,created_by) values($1,$2,$3::uuid::text,array[$3::uuid::text],$3::uuid),($4,$2,$5::uuid::text,array[$5::uuid::text],$5::uuid),($6,$7,$3::uuid::text,array[$3::uuid::text],$8)", [ids.profile, ids.project, owner, ids.writerProfile, writer, ids.foreignProfile, ids.foreignProject, foreignOwner]);
    await db.query("insert into content.consent_state(profile_id,purpose,status) values($1,'personalization','granted')", [ids.profile]);
    await db.query("insert into content.profile_knowledge(id,project_id,profile_id,owner_id,title,body) values($1,$2,$3,$4,'Private fixture','Fixture'),($5,$2,$6,$7,'Private fixture','Fixture'),($8,$9,$10,$4,'Private fixture','Fixture')", [ids.knowledge, ids.project, ids.profile, owner, ids.writerKnowledge, ids.writerProfile, writer, ids.foreignKnowledge, ids.foreignProject, ids.foreignProfile]);
    if (available.history) await db.query("insert into content.assistant_messages(id,project_id,created_by,prompt,response,model) values($1,$2,$3,'Fixture','Fixture','verification'),($4,$2,$5,'Fixture','Fixture','verification')", [ids.assistant, ids.project, owner, ids.writerAssistant, writer]);

    await identity("authenticated", owner);
    await check("owner workspace draft read", async () => (await db.query("select id from content.entries where id=$1", [ids.draft])).rowCount === 1);
    await check("owner workspace draft write", async () => (await db.query("update content.entries set title='Edited fixture' where id=$1 returning id", [ids.draft])).rowCount === 1);
    await check("owner workspace draft create", async () => (await db.query("insert into content.entries(project_id,title,status,created_by) values($1,'Created fixture','Draft',$2) returning id", [ids.project, owner])).rowCount === 1);
    await check("owner publish allowed", async () => (await db.query("update content.entries set status='Published' where id=$1 returning id", [ids.draft])).rowCount === 1);
    await check("foreign project read denied", async () => (await db.query("select id from content.entries where id=$1", [ids.foreignEntry])).rowCount === 0, { security: true });
    await check("foreign project write denied", () => denied("update content.entries set title='Forbidden fixture' where id=$1 returning id", [ids.foreignEntry]), { security: true });
    await check("cross-project taxonomy parent denied", () => denied("insert into content.terms(taxonomy_id,label,parent_id,created_by) values($1,'Forbidden parent',$2,$3) returning id", [ids.taxonomy, ids.foreignTerm, owner]), { security: true });
    await check("cross-project taxonomy link denied", () => denied("insert into content.entry_terms(entry_id,term_id,created_by) values($1,$2,$3) returning id", [ids.draft, ids.foreignTerm, owner]), { security: true });
    await check("cross-project entry reference denied", () => denied("insert into content.entry_references(from_entry_id,to_entry_id,created_by) values($1,$2,$3) returning id", [ids.draft, ids.foreignEntry, owner]), { security: true });
    await check("same-project taxonomy link allowed", async () => (await db.query("insert into content.entry_terms(entry_id,term_id,created_by) values($1,$2,$3) returning id", [ids.draft, ids.term, owner])).rowCount === 1);
    await check("direct consent mutation denied", () => denied("update content.consent_state set status='denied' where profile_id=$1 and purpose='personalization' returning id", [ids.profile]), { security: true });
    await check("private knowledge isolation", async () => (await db.query("select id from content.profile_knowledge where id=any($1::uuid[])", [[ids.knowledge, ids.writerKnowledge, ids.foreignKnowledge]])).rowCount === 1, { security: true });
    await check("private assistant history isolation", async () => (await db.query("select id from content.assistant_messages where id=any($1::uuid[])", [[ids.assistant, ids.writerAssistant]])).rowCount === 1, { security: true, missing: !available.history });
    await check("assistant history identity spoof denied", () => denied("insert into content.assistant_messages(project_id,created_by,prompt,response,model) values($1,$2,'Fixture','Fixture','verification') returning id", [ids.project, writer]), { security: true, missing: !available.history });
    await check("assistant reservation bounded", async () => {
      const results = [];
      for (let i = 0; i < 6; i++) results.push((await db.query("select content.reserve_assistant_request($1) as allowed", [ids.project])).rows[0].allowed);
      return results.slice(0, 5).every(value => value === true) && results[5] === false;
    }, { missing: !available.reservation });

    await identity("authenticated", writer);
    await check("writer workspace draft read", async () => (await db.query("select id from content.entries where id=$1", [ids.draft])).rowCount === 1);
    await check("writer draft edit allowed", async () => (await db.query("update content.entries set title='Writer fixture' where id=$1 returning id", [ids.draft])).rowCount === 1);
    await check("writer draft create allowed", async () => (await db.query("insert into content.entries(project_id,title,status,created_by) values($1,'Writer fixture','Draft',$2) returning id", [ids.project, writer])).rowCount === 1);
    await check("writer publish denied", () => denied("update content.entries set status='Published' where id=$1 returning id", [ids.draft]), { security: true });
    await check("writer published create denied", () => denied("insert into content.entries(project_id,title,status,created_by) values($1,'Forbidden published fixture','Published',$2) returning id", [ids.project, writer]), { security: true });
    await check("writer published content edit denied", () => denied("update content.entries set title='Forbidden published fixture' where id=$1 returning id", [ids.published]), { security: true });
    await check("writer soft deletion denied", () => denied("update content.entries set deleted_at=now() where id=$1 returning id", [ids.draft]), { security: true });
    await check("writer hard deletion denied", () => denied("delete from content.entries where id=$1 returning id", [ids.draft]), { security: true });

    await identity("authenticated", viewer);
    await check("viewer workspace draft read", async () => (await db.query("select id from content.entries where id=$1", [ids.draft])).rowCount === 1);
    await check("viewer draft edit denied", () => denied("update content.entries set title='Forbidden viewer fixture' where id=$1 returning id", [ids.draft]), { security: true });

    await identity("authenticated", bootstrap);
    await check("membership bootstrap refuses foreign wildcard default", async () => {
      const result = await db.query("select content.rbac_ensure_membership($1,$2) as role", [ids.project, ids.foreignRole]);
      const permission = await db.query("select content.rbac_allows('content.entry.publish',$1) as allowed", [ids.project]);
      return result.rows[0].role === ids.writerRole && permission.rows[0].allowed === false;
    }, { security: true });
    await check("foreign membership bootstrap denied", async () => (await db.query("select content.rbac_ensure_membership($1,$2) as role", [ids.foreignProject, ids.foreignRole])).rows[0].role === null, { security: true });

    await identity("anon");
    await check("anonymous published nonprivate read only", async () => {
      const result = await db.query("select id from content.entries where id=any($1::uuid[])", [[ids.draft, ids.published, ids.privateEntry, ids.foreignEntry]]);
      return result.rowCount === 1 && result.rows[0].id === ids.published;
    }, { security: true });
    await check("anonymous content write denied", () => denied("update content.entries set title='Forbidden anonymous fixture' where id=$1 returning id", [ids.published]), { security: true });
    await db.query("reset role");
    await check("workspace truncate grants removed", async () => !(await db.query("select exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='content' and c.relkind='r' and (has_table_privilege('anon',c.oid,'TRUNCATE') or has_table_privilege('authenticated',c.oid,'TRUNCATE'))) as unsafe")).rows[0].unsafe, { security: true });
  } finally {
    if (began) await db.query("rollback");
  }
  report(`TOTAL pass=${totals.PASS} legacy=${totals.LEGACY} skip=${totals.SKIP} fail=${totals.FAIL}`);
  return totals;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  nextEnv.loadEnvConfig(process.cwd());
  const db = new pg.Client({ connectionString: process.env.STRING_URI, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
  try {
    if (!process.env.STRING_URI) throw Object.assign(new Error("Unavailable verification connection"), { code: "SETUP" });
    await db.connect();
    const totals = await runRlsVerification(db, { baseline: process.argv.includes("--baseline") });
    process.exitCode = totals.FAIL ? 1 : 0;
  } catch (error) {
    console.error(`FAIL verification setup (${/^[A-Z0-9]{5}$/.test(error.code || "") ? error.code : "unavailable"})`);
    process.exitCode = 1;
  } finally { await db.end().catch(() => {}); }
}
