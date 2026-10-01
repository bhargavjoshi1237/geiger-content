import rbacConfig, { navPermissionKey, navSlug } from "@/geiger-rbac.config";

// Expose the shared permission catalog; the RBAC context evaluates signed-in grants.

export { navPermissionKey, navSlug };

// { key, label, group } entries, exactly the shape the settings screens expect.
export const WORKSPACE_PERMISSIONS = rbacConfig.permissions.map((p) => ({
  key: p.key,
  label: p.label,
  group: p.group,
  scopeBy: p.scopeBy,
  conditionText: p.conditionText,
}));

export const ALL_PERMISSION_KEYS = WORKSPACE_PERMISSIONS.map((p) => p.key);

// The system-role templates, for screens that offer "clone a system role".
export const SYSTEM_ROLE_SEED = rbacConfig.systemRoles;

// Slug used for role keys and nav-derived permission keys.
export function normalizeRoleId(value) {
  return navSlug(value);
}

// Map exact sidebar titles to their permission keys.
export function tabPermissionKey(title) {
  return navPermissionKey(title);
}

export function getRoleById(roles, roleId) {
  return roles?.find((role) => role.id === roleId) || null;
}
