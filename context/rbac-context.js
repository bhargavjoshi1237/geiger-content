"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { can as rbacCan, evaluate as rbacEvaluate, resolveGrants } from "@geiger/rbac";

import rbacConfig from "@/geiger-rbac.config";
import { useOptionalProject } from "@/context/project-context";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { getUser } from "@/lib/supabase/user";
import {
  ensureMembership,
  ensureSystemRoles,
  listRoles,
  listUserGrants,
} from "@/lib/supabase/rbac";
import {
  usePaintFromShellCache,
  writeShellCache,
} from "@/lib/workspace/shell_cache";

// What the signed-in user may do in the active project.
//
// The provider loads (roles, my grants) once per (project, user), flattens them
// with @geiger/rbac, and exposes an explainable decision to every surface.
//
// ENFORCEMENT IS STRICT. Once the rows are in hand the engine's answer stands:
// holding no grant means seeing nothing. The safety net is not a permissive
// default — it is the bootstrap in load(), which gives every person who can
// reach the project a role *before* the first decision is made, so "strict"
// never means "blank sidebar". Someone whose grant was deliberately revoked is
// the one case that stays denied, which is the point.
//
// The only permissive window left is the load itself, so the shell doesn't
// flash empty on a project switch. Real denial of *data* is the per-table RLS
// policies; this provider gates UI.

const ALLOW_WHILE_LOADING = true;

const UNLOADED = Symbol("rbac:unloaded");

const CACHE = "rbac-grants";

const RbacContext = createContext(null);

const PERMISSIVE = Object.freeze({
  roles: Object.freeze([]),
  grants: Object.freeze([]),
  resolved: null,
  loading: false,
  available: false,
  userId: null,
  isOwner: false,
  can: () => true,
  decide: () => ({
    allowed: true,
    code: "no_provider",
    reason: "Authorization is not loaded on this surface.",
    via: null,
  }),
  refresh: async () => {},
});

export function RbacProvider({ children }) {
  const project = useOptionalProject();
  // The route carries the project id synchronously; the project record itself is
  // a fetch away, and the cached grants need a key on the first frame.
  const { projectId: routeProjectId } = useWorkspaceUrl();
  const projectId = routeProjectId || project?.projectId || null;

  const [userId, setUserId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loadedFor, setLoadedFor] = useState(UNLOADED);

  // Paint the last known decision set before the browser paints, so gated nav
  // doesn't appear and then vanish once the real grants land.
  usePaintFromShellCache(CACHE, projectId, (entry) => {
    if (!entry.value) return;
    setUserId(entry.userId ?? null);
    setRoles(entry.value.roles || []);
    setGrants(entry.value.grants || []);
    setLoadedFor(projectId);
  });

  const load = useCallback(async () => {
    const user = await getUser();
    const uid = user?.id ?? null;
    if (!projectId || !uid) {
      return { uid, roleRows: [], grantRows: [] };
    }
    let [roleRows, grantRows] = await Promise.all([
      listRoles(projectId),
      listUserGrants(projectId, uid),
    ]);

    // Nobody should meet a strict UI with no grant. When this project holds none
    // for them, seed its roles from the catalog and let the RPC decide whether
    // they earn one — it re-checks org membership in the database and refuses to
    // revive a grant somebody revoked. Only runs on the empty case, so the
    // steady-state load stays two reads.
    if (grantRows && grantRows.length === 0) {
      const seeded = await ensureSystemRoles(projectId, uid);
      if (seeded?.length) roleRows = seeded;
      const fallback = (roleRows || []).find((r) => r.key === "writer") || null;
      if (await ensureMembership(projectId, fallback?.id ?? null)) {
        grantRows = (await listUserGrants(projectId, uid)) ?? grantRows;
      }
    }

    return { uid, roleRows, grantRows };
  }, [projectId]);

  const apply = useCallback(
    ({ uid, roleRows, grantRows }) => {
      setUserId(uid);
      setLoadedFor(projectId);
      if (!roleRows || !grantRows) return;
      setRoles(roleRows);
      setGrants(grantRows);
      if (projectId) {
        writeShellCache(CACHE, projectId, uid, {
          roles: roleRows,
          grants: grantRows,
        });
      }
    },
    [projectId],
  );

  useEffect(() => {
    let alive = true;
    load().then((result) => {
      if (!alive) return;
      apply(result);
    });
    return () => {
      alive = false;
    };
  }, [load, apply]);

  const refresh = useCallback(async () => {
    apply(await load());
  }, [load, apply]);

  // While a project switch is in flight the rows still describe the previous
  // project, so nothing is enforced until they catch up.
  const loading = loadedFor !== projectId;

  const available = !loading;

  // Flatten once per (roles, grants) rather than on every check.
  const resolved = useMemo(
    () => resolveGrants({ config: rbacConfig, roles, grants }),
    [roles, grants],
  );

  const value = useMemo(() => {
    const options = { config: rbacConfig, roles, grants, actorId: userId, resolved };

    const decide = (key, extra = {}) => {
      if (!available) {
        return {
          allowed: ALLOW_WHILE_LOADING,
          code: "loading",
          reason: "Still checking what you can do here.",
          via: null,
        };
      }
      return rbacEvaluate(key, { ...options, ...extra });
    };

    return {
      roles,
      grants,
      resolved,
      loading,
      available,
      userId,
      // The wildcard is what Owner holds; this backs the "you can't remove the
      // last owner" guard and the read-only states in the Settings screens.
      isOwner: roles.some(
        (r) =>
          grants.some((g) => g.roleId === r.id) &&
          (r.permissions || []).includes("*"),
      ),
      can: (key, extra) =>
        available ? rbacCan(key, { ...options, ...extra }) : ALLOW_WHILE_LOADING,
      decide,
      refresh,
    };
  }, [roles, grants, resolved, loading, available, userId, refresh]);

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
}

// Safe anywhere: returns a permissive stand-in outside the workspace.
export function useRbac() {
  return useContext(RbacContext) ?? PERMISSIVE;
}

// Convenience for a single gate.
export function useCan(key, extra) {
  const { can } = useRbac();
  return can(key, extra);
}
