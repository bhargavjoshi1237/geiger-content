import { defineRbacConfig, defineRole } from "@geiger/rbac";

// The @geiger/rbac catalog for Geiger Content.
//
// This is the TRUSTED half of authorization: permission keys, what each one is
// scoped by, and the conditions attached to it are all declared here, in
// versioned code. The database only ever stores which roles exist, which keys
// they carry, and who holds them — customers compose roles and narrow grants,
// they never author a predicate.
//
// Keys are "<product>.<resource>.<action>". Nav keys gate a sidebar section;
// operation keys gate a button and compile to an RLS policy.
//
// Titles below must match components/internal/sidebar/sidebar_nav.jsx exactly —
// navPermissionKey() derives a key from a nav title, so a renamed section needs
// its key renamed here too (and a migration to rewrite stored role rows).

export function navSlug(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function navPermissionKey(title) {
  return `content.${navSlug(title)}.view`;
}

const NAV_SECTIONS = [
  "Overview",
  "Content",
  "Architecture",
  "Editorial",
  "Publishing",
  "Governance",
  "Developers",
  "Audiences",
  "Personalization",
  "Experiments",
  "Recommendations",
  "Intelligence",
  "Settings",
];

const navPermissions = NAV_SECTIONS.map((title) => ({
  key: navPermissionKey(title),
  label: title,
  group: "Workspace views",
}));

const operationPermissions = [
  {
    key: "content.entry.edit",
    label: "Edit an entry or page",
    group: "Content",
  },
  {
    key: "content.entry.publish",
    label: "Publish an entry or page",
    group: "Content",
  },
  {
    key: "content.entry.approve",
    label: "Approve entries and bulk-approve low-risk types",
    group: "Content",
  },
  {
    key: "content.entry.delete",
    label: "Delete an entry or page",
    group: "Content",
  },
  {
    key: "content.collection.view",
    label: "View collections",
    group: "Content",
  },
  {
    key: "content.collection.manage",
    label: "Create, edit and delete collections",
    group: "Content",
  },
  {
    key: "content.asset.view",
    label: "View the asset library",
    group: "Content",
  },
  {
    key: "content.asset.upload",
    label: "Upload assets",
    group: "Content",
  },
  {
    key: "content.asset.delete",
    label: "Delete assets",
    group: "Content",
  },
  {
    key: "content.type.manage",
    label: "Manage content types, fields and blocks",
    group: "Architecture",
  },
  {
    key: "content.token.manage",
    label: "Create and revoke delivery tokens",
    group: "Developers",
  },
  {
    key: "content.team.invite",
    label: "Invite Members",
    group: "Team Control",
  },
  {
    key: "content.team.assign",
    label: "Assign roles",
    group: "Team Control",
  },
  {
    key: "content.role.manage",
    label: "Create and edit roles",
    group: "Team Control",
  },
  {
    key: "content.billing.manage",
    label: "Manage billing",
    group: "Administration",
  },
  {
    key: "content.settings.manage",
    label: "Manage settings",
    group: "Administration",
  },
  {
    key: "content.policy.override",
    label: "Edit fields restricted by content policies",
    group: "Administration",
  },
  {
    key: "content.trait.reveal",
    label: "Reveal sensitive trait values",
    group: "Audiences",
  },
  {
    key: "content.consent.override",
    label: "Override a profile's consent state",
    group: "Audiences",
  },
];

const permissions = [...navPermissions, ...operationPermissions];

const uniquePermissions = Array.from(
  new Map(permissions.map((p) => [p.key, p])).values(),
);

const viewKeys = uniquePermissions
  .filter((p) => p.key.endsWith(".view"))
  .map((p) => p.key);

const systemRoles = [
  defineRole({
    key: "owner",
    name: "Owner",
    description: "Full access to everything, including billing.",
    color: "violet",
    permissions: ["*"],
    sort: 0,
  }),
  defineRole({
    key: "admin",
    name: "Admin",
    description:
      "Manage the workspace, team and roles — no billing control.",
    color: "blue",
    permissions: [
      ...viewKeys,
      "content.entry.edit",
      "content.entry.publish",
      "content.entry.delete",
      "content.type.manage",
      "content.token.manage",
      "content.team.invite",
      "content.team.assign",
      "content.role.manage",
      "content.settings.manage",
      "content.policy.override",
      "content.trait.reveal",
      "content.consent.override",
    ],
    sort: 1,
  }),
  defineRole({
    key: "editor",
    name: "Editor",
    description: "Write, review, approve and publish content.",
    color: "emerald",
    permissions: [
      ...viewKeys,
      "content.entry.edit",
      "content.entry.publish",
      "content.entry.delete",
    ],
    sort: 2,
  }),
  defineRole({
    key: "writer",
    name: "Writer",
    description: "Day-to-day drafting access to the workspace.",
    color: "amber",
    permissions: [
      "content.overview.view",
      "content.content.view",
      "content.architecture.view",
      "content.editorial.view",
      "content.entry.edit",
    ],
    sort: 3,
  }),
  defineRole({
    key: "viewer",
    name: "Viewer",
    description: "Read-only access to content and reports.",
    color: "slate",
    permissions: ["content.overview.view", "content.intelligence.view"],
    sort: 4,
  }),
];

export default defineRbacConfig({
  product: "content",
  permissions: uniquePermissions,
  systemRoles,
});
