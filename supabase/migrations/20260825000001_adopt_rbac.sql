-- Adopt @geiger/rbac
--
-- Storage for the suite authorization engine, seeded for Geiger Content.
--
-- Owns:
--   public.roles                    shared role definitions (suite-wide)
--   content.role_grants             this product's assignments
--   public.rbac_key_matches(...)    wildcard matching, mirrors @geiger/rbac keys.js
--   content.rbac_allows(...)        the predicate RLS policies call
--   content.can_access_project(..)  org-membership access check
--   content.rbac_ensure_membership  the caller's own grant bootstrap
--
-- The storage shape matches what @geiger/rbac's migrationSql("content")
-- generates — do not hand-edit it; regenerate from the package if the format
-- changes.
--
-- NOTE ON ENFORCEMENT. This migration only creates and populates the
-- authorization tables. It does NOT replace any product table's demo policy —
-- flipping those is a separate, deliberate migration per table, because a
-- missing grant becomes a blank screen rather than a hidden button the moment
-- it lands.

-- @up
create extension if not exists pgcrypto;
create schema if not exists content;
grant usage on schema content to anon, authenticated, service_role;

-- Shared updated_at trigger for the authorization tables. Declared here (rather
-- than depending on a product's own touch_updated_at) so this block stands alone
-- whichever product runs it first.
create or replace function public.rbac_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Wildcard permission matching. Mirrors keys.js: "*" matches everything,
-- "<product>.*" and "<product>.<resource>.*" match by prefix, anything else is
-- an exact match.
create or replace function public.rbac_key_matches(p_patterns text[], p_key text)
returns boolean
language sql
immutable
as $$
  select exists (
    select 1
    from unnest(coalesce(p_patterns, '{}'::text[])) as pat
    where pat = '*'
       or pat = p_key
       or (
         right(pat, 2) = '.*'
         and left(p_key, length(pat) - 1) = left(pat, length(pat) - 1)
       )
  );
$$;

-- Shared role definitions (suite-wide). Already created by the first product
-- that adopted RBAC; these statements are idempotent so this migration can run
-- in any order against a fresh database too.
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  key text,
  name text not null default 'Untitled role',
  description text not null default '',
  color text not null default 'slate',
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  sort integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.roles add column if not exists key text;
alter table public.roles add column if not exists permissions text[] not null default '{}';
alter table public.roles add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.roles add column if not exists deleted_at timestamptz;

create index if not exists roles_project_idx
  on public.roles (project_id) where deleted_at is null;
create unique index if not exists roles_project_key_uniq
  on public.roles (project_id, key) where key is not null and deleted_at is null;

drop trigger if exists roles_touch_updated_at on public.roles;
create trigger roles_touch_updated_at
before update on public.roles
for each row execute function public.rbac_touch_updated_at();

-- Per-product assignment. One row per (user, role) in a project. scope narrows
-- the grant to specific resources; an empty scope applies everywhere in the
-- project.
create table if not exists content.role_grants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid not null,
  role_id uuid not null references public.roles(id) on delete cascade,
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  granted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists content_role_grants_lookup_idx
  on content.role_grants (user_id, project_id) where deleted_at is null;
create index if not exists content_role_grants_role_idx
  on content.role_grants (role_id) where deleted_at is null;
create unique index if not exists content_role_grants_uniq
  on content.role_grants (project_id, user_id, role_id) where deleted_at is null;

drop trigger if exists role_grants_touch_updated_at on content.role_grants;
create trigger role_grants_touch_updated_at
before update on content.role_grants
for each row execute function public.rbac_touch_updated_at();

-- The predicate every gated policy calls.
--
-- SECURITY DEFINER so a user can be authorized by grant rows they cannot
-- themselves select. STABLE so Postgres may cache it within a statement.
--
-- p_scope_type null  -> the permission is unscopeable; grants apply everywhere.
-- grant has no entry for p_scope_type -> that grant is unscoped.
create or replace function content.rbac_allows(
  p_permission text,
  p_project uuid default null,
  p_scope_type text default null,
  p_scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, content
as $$
  select exists (
    select 1
    from content.role_grants g
    join public.roles r on r.id = g.role_id
    where g.user_id = auth.uid()
      and g.status = 'active'
      and g.deleted_at is null
      and r.deleted_at is null
      and (p_project is null or g.project_id = p_project)
      and public.rbac_key_matches(r.permissions, p_permission)
      and (
        p_scope_type is null
        or not jsonb_exists(g.scope, p_scope_type)
        or (
          p_scope_id is not null
          and jsonb_exists(g.scope -> p_scope_type, p_scope_id::text)
        )
      )
  );
$$;

grant execute on function content.rbac_allows(text, uuid, text, uuid) to anon, authenticated;
grant execute on function public.rbac_key_matches(text[], text) to anon, authenticated;

alter table public.roles enable row level security;

drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles
  for select to anon, authenticated using (deleted_at is null);

drop policy if exists roles_write on public.roles;
create policy roles_write on public.roles
  for all to authenticated using (true) with check (true);

alter table content.role_grants enable row level security;

drop policy if exists role_grants_read on content.role_grants;
create policy role_grants_read on content.role_grants
  for select to anon, authenticated using (deleted_at is null);

drop policy if exists role_grants_write on content.role_grants;
create policy role_grants_write on content.role_grants
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Bootstrap: owner roles and creator grants for every Content project.
-- ---------------------------------------------------------------------------

-- Every project gets an Owner role. Only Owner is seeded here: its permission
-- list is the stable wildcard, whereas the other system roles are defined in
-- geiger-rbac.config.js and are seeded by the app (ensureSystemRoles) so the
-- catalog stays the single source of truth for them.
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

-- The project's creator is its Owner, guaranteeing every project has at least
-- one account that can administer roles once enforcement switches on.
insert into content.role_grants (project_id, user_id, role_id, status)
select p.id, p.created_by, r.id, 'active'
from public.projects p
join public.roles r
  on r.project_id = p.id and r.key = 'owner' and r.deleted_at is null
where p.deleted_at is null
  and p.created_by is not null
on conflict (project_id, user_id, role_id) where deleted_at is null do nothing;

-- ---------------------------------------------------------------------------
-- Membership bootstrap RPC.
-- ---------------------------------------------------------------------------

-- Org-membership access check, matching how the suite scopes projects: a member
-- of the project's organization can reach it, as can its creator.
create or replace function content.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, content
as $$
  select exists (
    select 1
    from public.projects p
    left join public.organization_users ou
      on ou."organization" = p.organization_id
     and ou."user" = auth.uid()
    where p.id = p_project_id
      and p.deleted_at is null
      and (p.organization_id is null or ou."user" is not null or p.created_by = auth.uid())
  );
$$;

-- Make sure the signed-in user holds a role in this project, minting one when
-- they have never held any.
--
-- SECURITY DEFINER: the org-membership check happens in the database, so a
-- caller cannot grant themselves access to a project they can't already reach,
-- and a grant that was revoked is never handed back.
--
-- Returns the role id they hold afterwards, or null when they should not have
-- one (no access, or every grant they ever held was revoked).
create or replace function content.rbac_ensure_membership(
  p_project_id uuid,
  p_default_role uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, content, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_creator uuid;
  v_role uuid;
  v_existing uuid;
  v_ever integer;
begin
  if p_project_id is null or v_uid is null then
    return null;
  end if;

  -- Membership is org membership: the same check every table's RLS makes, so a
  -- grant can never be minted for somebody who could not already reach the
  -- project's rows.
  if not content.can_access_project(p_project_id) then
    return null;
  end if;

  select role_id into v_existing
    from content.role_grants
   where project_id = p_project_id
     and user_id = v_uid
     and deleted_at is null
     and status = 'active'
   limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  -- A revoked grant is a decision, not a gap. Never hand one back.
  select count(*) into v_ever
    from content.role_grants
   where project_id = p_project_id
     and user_id = v_uid;

  if v_ever > 0 then
    return null;
  end if;

  select created_by into v_creator from public.projects where id = p_project_id;

  -- Owner for the project's creator — and for the first person into a project
  -- that has no active grant at all, so an ownerless workspace can always be
  -- claimed by someone who can already read it.
  select count(*) into v_ever
    from content.role_grants
   where project_id = p_project_id
     and deleted_at is null
     and status = 'active';

  if v_creator = v_uid or v_ever = 0 then
    select r.id into v_role from public.roles r
     where r.project_id = p_project_id and r.key = 'owner' and r.deleted_at is null
     limit 1;
  end if;

  if v_role is null then
    select coalesce(
             p_default_role,
             (select r.id from public.roles r
               where r.project_id = p_project_id
                 and r.key = 'writer'
                 and r.deleted_at is null
               limit 1)
           )
      into v_role;
  end if;

  if v_role is null then
    return null;   -- roles not seeded yet; the next pass picks it up
  end if;

  insert into content.role_grants (project_id, user_id, role_id, status)
  values (p_project_id, v_uid, v_role, 'active')
  on conflict do nothing;

  return v_role;
end;
$$;

grant execute on function content.rbac_ensure_membership(uuid, uuid) to anon, authenticated;
grant execute on function content.can_access_project(uuid) to anon, authenticated;

-- @down
drop function if exists content.rbac_ensure_membership(uuid, uuid);
drop function if exists content.can_access_project(uuid);
drop function if exists content.rbac_allows(text, uuid, text, uuid);

drop policy if exists role_grants_read on content.role_grants;
drop policy if exists role_grants_write on content.role_grants;
drop table if exists content.role_grants cascade;

-- public.roles, public.rbac_key_matches and public.rbac_touch_updated_at are
-- shared across the suite and are intentionally left in place — dropping them
-- would delete another product's role definitions. Seeded rows are left too.
