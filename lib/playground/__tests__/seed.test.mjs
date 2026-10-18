// Seed integrity: the playground only convinces if its data hangs together.
// Run from the app root:
//   node --import ./lib/playground/__tests__/register.mjs --test lib/playground/__tests__/seed.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

import { getPlaygroundDb } from "../db.js";
import { PLAYGROUND_PROJECT } from "../mode.js";
import { PEOPLE } from "../cast.js";

// Tables every seeded screen reads; each must have rows.
const REQUIRED_TABLES = [
  "projects",
  "roles",
  "content.entries",
  "content.entry_versions",
  "content.collections",
  "content.collection_items",
  "content.assets",
  "content.slots",
  "content.variants",
  "content.content_types",
  "content.fields",
  "content.blocks",
  "content.taxonomies",
  "content.terms",
  "content.locales",
  "content.comments",
  "content.assignments",
  "content.workflow_states",
  "content.environments",
  "content.sites",
  "content.webhooks",
  "content.webhook_deliveries",
  "content.role_grants",
  "content.audit_log",
  "content.api_tokens",
  "content.profiles",
  "content.profile_traits",
  "content.consent_state",
  "content.segments",
  "content.events",
  "content.metrics_daily",
  "content.experiments",
  "content.experiment_variants",
  "content.experiment_exposures",
  "content.decision_traces",
  "content.topic_stages",
  "content.project_settings",
];

// `<column>` or `<table>.<column>` -> table, for FK columns whose target isn't the
// plural of the column stem. `null` skips the column (it points outside the seed).
const FK_TARGETS = {
  "content.experiment_exposures.variant_id": "content.experiment_variants",
  "content.decision_traces.variant_id": "content.variants",
  from_entry_id: "content.entries",
  to_entry_id: "content.entries",
  fallback_entry_id: "content.entries",
  type_id: "content.content_types",
  parent_id: "content.terms",
  entity_id: null,
  thread_id: null,
  anonymous_id: null,
  user_id: null,
  owner_id: null,
};

// Columns that hold a person's id; every one must be someone in the cast.
const PERSON_COLUMNS = ["created_by", "user_id", "owner_id", "actor", "granted_by"];

// Tables whose rows legitimately belong to no project (lookups, users, ...).
const PROJECTLESS_OK = true;

function plural(word) {
  if (/[^aeiou]y$/.test(word)) return word.replace(/y$/, "ies");
  if (/(s|x|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
}

const db = getPlaygroundDb();
const tableNames = db.tableNames();
const castIds = new Set(PEOPLE.map((p) => p.id));

function fkTarget(table, column) {
  if (`${table}.${column}` in FK_TARGETS) return FK_TARGETS[`${table}.${column}`];
  if (column in FK_TARGETS) return FK_TARGETS[column];
  const stem = column.replace(/_id$/, "");
  return [plural(stem), stem].flatMap((t) => [`content.${t}`, t]).find((t) => db.has(t));
}

test("required tables are seeded", () => {
  for (const name of REQUIRED_TABLES) {
    assert.ok(db.table(name).length > 0, `${name} has no rows`);
  }
});

test("ids are unique per table", () => {
  for (const name of tableNames) {
    const ids = db.table(name).map((r) => r.id).filter((id) => id != null);
    assert.equal(new Set(ids).size, ids.length, `duplicate ids in ${name}`);
  }
});

test("foreign keys resolve inside the seed", () => {
  const problems = [];
  for (const name of tableNames) {
    for (const row of db.table(name)) {
      for (const [column, value] of Object.entries(row)) {
        if (!column.endsWith("_id") || value == null || column === "project_id") continue;
        const target = fkTarget(name, column);
        if (!target) continue;
        if (!db.table(target).some((r) => String(r.id) === String(value))) {
          problems.push(`${name}.${column}=${value} -> ${target} (row ${row.id ?? "?"})`);
        }
      }
    }
  }
  assert.deepEqual(problems.slice(0, 20), [], `${problems.length} dangling references`);
});

test("project-owned rows belong to the playground project", () => {
  for (const name of tableNames) {
    for (const row of db.table(name)) {
      if (!("project_id" in row)) continue;
      if (row.project_id == null && PROJECTLESS_OK) continue;
      assert.equal(row.project_id, PLAYGROUND_PROJECT.id, `${name} row ${row.id} has project_id ${row.project_id}`);
    }
  }
});

test("people are the Halcyon Studio cast", () => {
  const problems = [];
  for (const name of tableNames) {
    for (const row of db.table(name)) {
      for (const column of PERSON_COLUMNS) {
        if (row[column] != null && !castIds.has(row[column])) problems.push(`${name}.${column}=${row[column]}`);
      }
    }
  }
  assert.deepEqual(problems.slice(0, 20), [], `${problems.length} people outside the cast`);
  for (const person of PEOPLE) {
    assert.ok(db.table("content.role_grants").some((g) => g.user_id === person.id), `${person.name} holds no role`);
  }
});

test("nothing still carries the demonstrator brand or real storage", () => {
  const text = JSON.stringify(tableNames.map((name) => db.table(name)));
  for (const leftover of ["Geiger", "example.test", "supabase.co", "Maya Patel", "Alex Morgan"]) {
    assert.ok(!text.includes(leftover), `seed still mentions "${leftover}"`);
  }
});

test("timestamps parse", () => {
  for (const name of tableNames) {
    for (const row of db.table(name)) {
      for (const [column, value] of Object.entries(row)) {
        if (!column.endsWith("_at") || value == null) continue;
        assert.ok(!Number.isNaN(Date.parse(value)), `${name}.${column} is not a date: ${value}`);
      }
    }
  }
});

test("dates are relative to today", () => {
  const today = new Date().toISOString().slice(0, 10);
  const newest = db.table("content.metrics_daily").reduce((max, row) => (row.date > max ? row.date : max), "");
  assert.equal(newest, today, "the newest metrics day should be today");
});
