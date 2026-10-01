-- Content vector grant reads
--
-- Add `-- @no-transaction` above @up only if this migration needs to run
-- outside a transaction (e.g. create index concurrently).

-- @up
create policy role_grants_visibility on content.role_grants
as restrictive for select to authenticated
using (
  content.can_access_project(project_id)
  and (
    user_id = (select auth.uid())
    or content.rbac_allows('content.team.assign', project_id)
  )
);

grant select on content.role_grants to authenticated;


-- @down
revoke select on content.role_grants from authenticated;
drop policy if exists role_grants_visibility on content.role_grants;

