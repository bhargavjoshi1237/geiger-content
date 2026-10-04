// Builds supabase/demo/fixtures.json for the landing playground from the demonstrator seed
// (supabase/seeds/demonstrator/project.sql, written by scripts/seed-demonstrator.mjs), so the
// playground shows exactly the demonstrator project. Run: npm run demo:fixtures
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import rbacConfig from "../geiger-rbac.config.js";
import { DEMO_PROJECT, demoId } from "./demo-data.mjs";

const SEED = "supabase/seeds/demonstrator/project.sql";
const OUT = "supabase/demo/fixtures.json";
// Raw events are ~75% of the seed; screens chart metrics_daily, so keep only the latest days of the stream.
const EVENT_DAYS = 3;

const sql = readFileSync(SEED, "utf8");
const insert = /insert into content\.([a-z_]+) [^\n]*\nselect [^\n]* jsonb_populate_recordset\(null::content\.[a-z_]+, (\$seed_[0-9a-f]+\$)([\s\S]*?)\2::jsonb\)/g;
const tables = {};
for (const [, table, , json] of sql.matchAll(insert)) (tables[`content.${table}`] ||= []).push(...JSON.parse(json));
if (!tables["content.entries"]?.length) throw new Error(`No entries parsed from ${SEED}`);

// The seed's "today": the newest metrics day. The store shifts every date by (today - anchor) at load.
const anchor = tables["content.metrics_daily"].reduce((max, row) => (row.date > max ? row.date : max), "");
const cutoff = new Date(Date.parse(anchor) - (EVENT_DAYS - 1) * 86400000).toISOString().slice(0, 10);
tables["content.events"] = tables["content.events"].filter((row) => row.at.slice(0, 10) >= cutoff);

const settings = tables["content.project_settings"][0];
tables["public.projects"] = [{ id: DEMO_PROJECT, name: settings?.brand_name || "Geiger Content Studio", slug: "content-studio-demo", status: "active", created_at: settings?.created_at, deleted_at: null }];

// The seed only targets lifecycle/locale; add segment and behaviour variants so every targeting screen has examples.
const [slotVariant] = tables["content.variants"];
const published = tables["content.entries"].filter((e) => e.status === "Published" && e.metadata?.visibility !== "private");
[
  ["Developer audience", { all: [{ field: "segment", op: "equals", value: "Developer audience" }] }],
  ["Team subscribers", { all: [{ field: "segment", op: "equals", value: "Team subscribers" }] }],
  ["Frequent visitors", { all: [{ field: "visits", op: "gt", value: 5 }] }],
  ["Engaged readers", { all: [{ field: "stage", op: "equals", value: "engaged" }, { field: "topic", op: "equals", value: "Personalization" }] }],
].forEach(([name, rules], i) => tables["content.variants"].push({
  ...slotVariant, id: demoId(`variants:playground:${i}`), slot_id: tables["content.slots"][i % 4].id, entry_id: published[3 + i * 4].id,
  rules, priority: 25, metadata: { ...slotVariant.metadata, name },
}));

// RBAC isn't part of the content seed: the app's system roles (as ensureSystemRoles inserts them) and a
// team of the seed's authors. The first member is the demo reader and owns the project.
const team = [["Maya Patel", "owner"], ["Alex Morgan", "admin"], ["Priya Shah", "editor"], ["Noah Kim", "writer"], ["Lena Ortiz", "viewer"]]
  .map(([name, role]) => ({ id: demoId(`users:${name}`), name, role, email: `${name.toLowerCase().replace(" ", ".")}@example.test` }));
const created_at = settings?.created_at || `${anchor}T10:00:00.000Z`;
tables["public.roles"] = rbacConfig.systemRoles.map((role) => ({
  id: demoId(`roles:${role.key}`), project_id: DEMO_PROJECT, key: role.key, name: role.name, description: role.description, color: role.color,
  permissions: [...role.permissions], is_system: true, sort: role.sort, created_by: team[0].id, metadata: { key: role.key }, created_at, deleted_at: null,
}));
tables["content.role_grants"] = team.map((member) => ({
  id: demoId(`role_grants:${member.id}`), project_id: DEMO_PROJECT, user_id: member.id, role_id: demoId(`roles:${member.role}`), scope: {},
  status: "active", granted_by: team[0].id, metadata: { name: member.name, email: member.email }, created_at, deleted_at: null,
}));
const user = { id: team[0].id, name: team[0].name, email: team[0].email };

mkdirSync("supabase/demo", { recursive: true });
const ordered = Object.fromEntries(Object.keys(tables).sort().map((key) => [key, tables[key]]));
writeFileSync(OUT, JSON.stringify({ anchor, projectId: DEMO_PROJECT, user, tables: ordered }) + "\n");
const size = Buffer.byteLength(readFileSync(OUT));
console.log(`${OUT}: ${Object.keys(ordered).length} tables, ${Object.values(ordered).reduce((n, rows) => n + rows.length, 0)} rows, ${Math.round(size / 1024)} KB (anchor ${anchor})`);
