// A PostgREST-shaped stand-in for the Supabase client, used by the landing playground (ported from
// geiger-flow's supabase/demo/demo-client.js). Implements the query-builder slice the data layer uses,
// so screens keep calling list*/get* unchanged and get fixture rows back. Reads resolve from the demo
// store; writes resolve to an error because the playground is read-only. Unsupported shapes warn loudly.
import { notifyDemoWrite, warnDemoGap } from "./demo-mode.js";
import { listRows, DEMO_SESSION, DEMO_USER } from "./demo-store.js";

const READ_ONLY_ERROR = { message: "This is a read-only demo.", code: "demo_read_only", details: null, hint: null };

// The permission checks the app asks the database; the demo reader may do everything it can see.
const RPC_RESULTS = { can_access_project: true, rbac_allows: true, rbac_ensure_membership: true, rbac_evaluate: true };

// Postgres orders NULLs last on ASC and first on DESC unless told otherwise.
function compareValues(a, b, { ascending, nullsFirst }) {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
  if (aNull || bNull) {
    if (aNull && bNull) return 0;
    const nulls = nullsFirst ?? !ascending;
    return (aNull ? -1 : 1) * (nulls ? 1 : -1);
  }
  if (a === b) return 0;
  return (a > b ? 1 : -1) * (ascending ? 1 : -1);
}

const contains = (actual, value) => {
  if (Array.isArray(value)) return Array.isArray(actual) && value.every((v) => actual.includes(v));
  if (value && typeof value === "object") return actual && typeof actual === "object" && Object.entries(value).every(([k, v]) => actual[k] === v);
  return false;
};

function matchesFilter(row, { column, type, value }) {
  const actual = row[column];
  switch (type) {
    case "eq": return actual === value;
    case "neq": return actual !== value;
    case "gt": return actual != null && actual > value;
    case "gte": return actual != null && actual >= value;
    case "lt": return actual != null && actual < value;
    case "lte": return actual != null && actual <= value;
    case "in": return Array.isArray(value) && value.includes(actual);
    // Fixtures omit defaulted soft-delete columns, so a missing key reads as null.
    case "is": return value === null ? actual === null || actual === undefined : actual === value;
    case "cs":
    case "contains": return contains(actual, value);
    default:
      warnDemoGap("filter operator", { type, column });
      return true;
  }
}

// PostgREST's `or` string "a.eq.1,b.is.null": a row matches when any branch does.
function parseOrExpression(expression) {
  if (expression.includes("(")) {
    warnDemoGap("grouped or() expression", expression);
    return null;
  }
  return expression.split(",").map((branch) => {
    const [column, type, ...rest] = branch.split(".");
    const raw = rest.join(".");
    return { column, type, value: raw === "null" ? null : raw };
  });
}

class DemoQuery {
  constructor(schema, table) {
    this.schema = schema;
    this.table = table;
    this.op = "select";
    this.filters = [];
    this.orBranches = [];
    this.orders = [];
    this.offset = 0;
    this.maxRows = null;
    this.resultShape = "many";
  }

  // First call on a read, last call on a write (return the written row); both are the same to us.
  select() { return this; }
  insert() { this.op = "insert"; return this; }
  update() { this.op = "update"; return this; }
  upsert() { this.op = "upsert"; return this; }
  delete() { this.op = "delete"; return this; }

  filter(column, type, value) { this.filters.push({ column, type, value }); return this; }
  eq(column, value) { return this.filter(column, "eq", value); }
  neq(column, value) { return this.filter(column, "neq", value); }
  gt(column, value) { return this.filter(column, "gt", value); }
  gte(column, value) { return this.filter(column, "gte", value); }
  lt(column, value) { return this.filter(column, "lt", value); }
  lte(column, value) { return this.filter(column, "lte", value); }
  in(column, value) { return this.filter(column, "in", value); }
  is(column, value) { return this.filter(column, "is", value); }
  contains(column, value) { return this.filter(column, "contains", value); }
  match(query) { for (const [column, value] of Object.entries(query)) this.eq(column, value); return this; }
  or(expression) { this.orBranches.push(parseOrExpression(expression)); return this; }

  order(column, options = {}) {
    this.orders.push({ column, ascending: options.ascending ?? true, nullsFirst: options.nullsFirst });
    return this;
  }

  limit(count) { this.maxRows = count; return this; }
  range(from, to) { this.offset = from; this.maxRows = to - from + 1; return this; }
  single() { this.resultShape = "single"; return this; }
  maybeSingle() { this.resultShape = "maybeSingle"; return this; }

  run() {
    if (this.op !== "select") {
      notifyDemoWrite();
      return { data: null, error: READ_ONLY_ERROR };
    }
    let rows = listRows(this.schema, this.table).filter((row) => this.filters.every((f) => matchesFilter(row, f)));
    for (const branches of this.orBranches) if (branches) rows = rows.filter((row) => branches.some((b) => matchesFilter(row, b)));
    if (this.orders.length)
      rows = rows
        .map((row, index) => ({ row, index }))
        .sort((a, b) => {
          for (const order of this.orders) {
            const verdict = compareValues(a.row[order.column], b.row[order.column], order);
            if (verdict) return verdict;
          }
          return a.index - b.index;
        })
        .map(({ row }) => row);
    rows = rows.slice(this.offset, this.maxRows === null ? undefined : this.offset + this.maxRows);

    if (this.resultShape === "single")
      return rows.length === 1
        ? { data: rows[0], error: null }
        : { data: null, error: { message: `Expected a single row from ${this.table}, got ${rows.length}`, code: "PGRST116", details: null, hint: null } };
    if (this.resultShape === "maybeSingle") return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null, count: rows.length };
  }

  then(resolve, reject) {
    return Promise.resolve().then(() => this.run()).then(resolve, reject);
  }
}

const demoAuth = {
  getUser: async () => ({ data: { user: DEMO_USER }, error: null }),
  getSession: async () => ({ data: { session: DEMO_SESSION }, error: null }),
  signOut: async () => ({ error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  mfa: {
    getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null }),
    listFactors: async () => ({ data: { all: [], totp: [] }, error: null }),
  },
};

const readOnly = async () => {
  notifyDemoWrite();
  return { data: null, error: READ_ONLY_ERROR };
};

// Demo media already lives in the public bucket, so public URLs resolve to the real files.
const demoStorage = {
  from: (bucket) => ({
    getPublicUrl: (path) => ({ data: { publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL || ""}/storage/v1/object/public/${bucket}/${path ?? ""}` } }),
    upload: readOnly,
    remove: readOnly,
  }),
};

const demoChannel = { on() { return this; }, subscribe() { return this; }, unsubscribe: async () => "ok" };

class DemoClient {
  constructor(schema = "public") {
    this.schemaName = schema;
  }

  schema(name) { return new DemoClient(name); }
  from(table) { return new DemoQuery(this.schemaName, table); }

  rpc(name) {
    if (name in RPC_RESULTS) return Promise.resolve({ data: RPC_RESULTS[name], error: null });
    return readOnly();
  }

  get auth() { return demoAuth; }
  get storage() { return demoStorage; }
  channel() { return demoChannel; }
  removeChannel() { return Promise.resolve("ok"); }
}

export function createDemoClient() {
  return new DemoClient("public");
}
