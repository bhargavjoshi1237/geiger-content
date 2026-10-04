// Fixture store behind the demo client: the demonstrator project (fixtures.json, built by
// `npm run demo:fixtures`), keyed "<schema>.<table>" in DB column names, exactly as PostgREST returns rows.
import fixtureFile from "./fixtures.json";
import { warnDemoGap } from "./demo-mode.js";

const DAY = 86400000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/;

// Shift every date by whole days so the seed's "today" (anchor) lands on the visitor's today.
const shiftDays = Math.round((Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(fixtureFile.anchor)) / DAY);

function shift(value) {
  if (typeof value === "string" && ISO_DATE.test(value)) {
    const moved = new Date(Date.parse(value) + shiftDays * DAY).toISOString();
    return value.length === 10 ? moved.slice(0, 10) : moved;
  }
  if (Array.isArray(value)) return value.map(shift);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shift(v)]));
  return value;
}

const tables = shiftDays ? shift(fixtureFile.tables) : fixtureFile.tables;
const reported = new Set();

export const DEMO_PROJECT_ID = fixtureFile.projectId;
export const DEMO_PROJECT = tables["public.projects"][0];

// A table with no fixtures is a legitimate "no rows"; report each once so a typo isn't silent.
export function listRows(schema, table) {
  const rows = tables[`${schema}.${table}`];
  if (rows) return rows;
  const key = `${schema}.${table}`;
  if (!reported.has(key)) {
    reported.add(key);
    warnDemoGap("no fixtures for table", key);
  }
  return [];
}

// The reader the demo acts as (the project owner in the fixtures); shape matches parseSession() in lib/supabase/user.js.
export const DEMO_USER = {
  id: fixtureFile.user.id,
  email: fixtureFile.user.email,
  aud: "authenticated",
  role: "authenticated",
  user_metadata: { full_name: fixtureFile.user.name, avatar_url: null },
  app_metadata: {},
};

export const DEMO_SESSION = { access_token: "demo", token_type: "bearer", user: DEMO_USER };
