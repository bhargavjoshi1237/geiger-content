// Everything the playground swaps into the data layer while it is mounted (see
// ./mode.js and ./use_playground_mode.js): the in-memory Supabase client, the
// storage URL helper, and the fetch routes for the app's own /api/* calls.

import { createMemoryClient } from "./memory_client.js";
import { getPlaygroundDb, PLAYGROUND_USER } from "./db.js";
import { apiRoutes } from "./api_routes.js";

// One client for the whole session, so every createClient() call shares state.
let client = null;

// "content.*" / "content.entry.*" style patterns, as roles store them.
function permits(pattern, key) {
  if (pattern === "*" || pattern === key) return true;
  return pattern.endsWith(".*") && key.startsWith(pattern.slice(0, -1));
}

// content.rbac_evaluate: the first active grant whose role carries a matching pattern.
function evaluate({ db, args }) {
  const grants = db.table("content.role_grants").filter((g) =>
    g.project_id === args.p_project_id && g.user_id === args.p_user_id && g.status !== "revoked" && g.deleted_at == null);
  for (const grant of grants) {
    const role = db.table("roles").find((r) => r.id === grant.role_id && r.deleted_at == null);
    const matched = (role?.permissions || []).filter((p) => permits(p, args.p_permission));
    if (matched.length) {
      return [{ allowed: true, matched_role_id: role.id, matched_role_name: role.name, matched_patterns: matched, scope: grant.scope || {} }];
    }
  }
  return [{ allowed: false, matched_role_id: null, matched_role_name: null, matched_patterns: [], scope: {} }];
}

function createPlaygroundClient() {
  client ??= createMemoryClient({
    getDb: getPlaygroundDb,
    user: PLAYGROUND_USER,
    rpc: {
      can_access_project: () => true,
      rbac_allows: () => true,
      rbac_evaluate: evaluate,
      rbac_ensure_membership: ({ db, args, user }) =>
        db.table("content.role_grants").find((g) => g.project_id === args.p_project_id && g.user_id === user.id && g.deleted_at == null)?.role_id
        ?? args.p_default_role ?? null,
      flow_ensure_user_organization: () => null,
    },
  });
  return client;
}

export const playgroundHandlers = {
  createClient: createPlaygroundClient,
  // Uploaded media lives as an object URL for the session; see lib/supabase/storage.js.
  buildPublicUrl: (path) => createPlaygroundClient().storage.from("content").getPublicUrl(path).data.publicUrl,
};

// Routes for interceptFetch (see ./intercept_fetch.js).
export const playgroundRoutes = apiRoutes;
