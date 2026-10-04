-- Owner grants: give named accounts the Owner role ("*") in every project.
--
-- Owner's wildcard matches every content.<section>.view key, so these accounts
-- see every screen. Pure data, idempotent: ensures each project has an Owner
-- role, reactivates a suspended Owner grant, and inserts one only when no live
-- grant exists. Data reads still need org membership (RLS).

-- Every live project needs an Owner role to grant.
insert into public.roles (project_id, key, name, description, color, permissions, is_system, sort)
select p.id, 'owner', 'Owner',
       'Full access to everything, including billing.', 'violet',
       array['*'], true, 0
from public.projects p
where p.deleted_at is null
  and not exists (
    select 1 from public.roles r
    where r.project_id = p.id and r.key = 'owner' and r.deleted_at is null
  );

-- Reactivate a live-but-suspended Owner grant (the insert below skips it).
update content.role_grants g
set status = 'active'
from public.roles r
where r.id = g.role_id
  and r.key = 'owner'
  and g.user_id in ('39149c4b-526f-445b-8a8c-ea3898e9c50c')
  and g.deleted_at is null
  and g.status <> 'active';

-- Revoked rows (deleted_at set) stay as history; a fresh active row is added.

insert into content.role_grants (project_id, user_id, role_id, status)
select p.id, u.user_id, r.id, 'active'
from public.projects p
join public.roles r
  on r.project_id = p.id and r.key = 'owner' and r.deleted_at is null
cross join (values ('39149c4b-526f-445b-8a8c-ea3898e9c50c'::uuid)) as u(user_id)
where p.deleted_at is null
on conflict (project_id, user_id, role_id) where deleted_at is null do nothing;
