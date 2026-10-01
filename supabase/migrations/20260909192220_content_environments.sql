-- Content environments
--
-- Owns content.environments. Named delivery targets (e.g. production, staging)
-- behind the Environments screen; content.entries.environment_id scopes reads
-- per environment. Self-contained: creates the schema, the shared updated_at
-- trigger function, the table, its indexes and RLS.

-- @up
create extension if not exists pgcrypto;

create schema if not exists content;
grant usage on schema content to anon, authenticated, service_role;

-- Table-level GRANTs (RLS policies alone don't allow reads/writes).

-- Shared "touch updated_at" trigger function (suite convention). Defined here
-- so this migration never depends on another having run first.
create or replace function content.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists content.environments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  key text not null default '',
  name text not null default 'Untitled environment',
  is_default boolean not null default false,
  -- Expansion bag: keep not-yet-promoted config here, promote to a real column
  -- once it needs indexing, constraints or its own RLS.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Tolerate older copies of the table by back-filling any missing columns.
alter table content.environments add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.environments add column if not exists key text not null default '';
alter table content.environments add column if not exists name text not null default 'Untitled environment';
alter table content.environments add column if not exists is_default boolean not null default false;
alter table content.environments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.environments add column if not exists created_by uuid;
alter table content.environments add column if not exists created_at timestamptz not null default now();
alter table content.environments add column if not exists updated_at timestamptz not null default now();
alter table content.environments add column if not exists deleted_at timestamptz;

create index if not exists environments_project_idx
  on content.environments (project_id) where deleted_at is null;
create index if not exists environments_created_at_idx
  on content.environments (created_at desc);
create unique index if not exists environments_project_key_uniq
  on content.environments (project_id, key) where deleted_at is null and key <> '';

drop trigger if exists environments_touch_updated_at on content.environments;
create trigger environments_touch_updated_at
before update on content.environments
for each row execute function content.touch_updated_at();

grant all on table content.environments to anon, authenticated, service_role;

-- Demo-open RLS (the dashboard runs unauthenticated). Tighten once auth lands.
alter table content.environments enable row level security;

drop policy if exists environments_demo_all on content.environments;
create policy environments_demo_all on content.environments
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- @down
drop table if exists content.environments cascade;
