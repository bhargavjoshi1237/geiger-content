-- RLS hardening template (deliberately a no-op)
--
-- WHY THIS DOES NOTHING. Every product table still carries a demo-open
-- `*_demo_all` policy (`using (true)` / `with check (true)`) because the
-- dashboard runs unauthenticated today — replacing those policies now would
-- turn every screen blank for every user, since `content.rbac_allows()` keys
-- off `auth.uid()` and there is no signed-in user in the demo. The
-- `content.rbac_allows()` predicate and `content.can_access_project()` helper
-- already exist (see 20260825000001_adopt_rbac.sql); what is missing is the
-- authenticated traffic that makes them meaningful.
--
-- WHEN TO HARDEN. Once sign-in lands: copy the commented template below into a
-- NEW migration (one per table, never an edit to the table's original file),
-- replacing `<table>` / `<policy>` and dropping that table's demo policy. Each
-- hardening migration must be verified with a viewer-role user before the next
-- one ships — a missing grant becomes a blank screen, not a hidden button.
--
-- The guarded block below proves this migration is safe to push: it only acts
-- when auth.uid() is present, which is never in the demo, so db:push applies
-- it as a recorded no-op.

-- @up
do $$
begin
  -- No authenticated caller in the demo, so there is nothing to harden yet.
  -- When auth.uid() is not null the per-table hardening migrations (below)
  -- are what enforce project-scoped access.
  if auth.uid() is not null then
    raise notice 'rls_hardening_template: authenticated traffic present — apply the per-table hardening migrations';
  end if;
end
$$;

-- TEMPLATE (copy into a new per-table migration, do not uncomment here):
--
-- -- Replace the demo-open policy with a project-scoped one.
-- drop policy if exists <table>_demo_all on content.<table>;
-- create policy <table>_project_scoped on content.<table>
--   for all
--   to authenticated
--   using (
--     content.can_access_project(project_id)
--     and (
--       -- Reads need membership; writes additionally need the capability.
--       content.rbac_allows('<product>.<resource>.view', project_id)
--       or content.rbac_allows('<product>.<resource>.manage', project_id)
--     )
--   )
--   with check (
--     content.can_access_project(project_id)
--     and content.rbac_allows('<product>.<resource>.manage', project_id)
--   );
--
-- -- Anon keeps no access once hardened. If a public surface needs it (e.g. the
-- -- delivery API), give it a dedicated policy calling a dedicated predicate —
-- -- never re-add `using (true)`.

-- @down
-- No-op: this migration creates no objects, so there is nothing to revert.
do $$
begin
  null;
end
$$;
