-- Content entry versions
--
-- Owns content.entry_versions. Immutable snapshots of an entry taken on every
-- publish, backing Version History and Compare & Rollback. Self-contained:
-- creates the schema, the shared updated_at trigger function, the table, its
-- indexes and RLS.

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

create table if not exists content.entry_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  entry_id uuid references content.entries(id) on delete cascade,
  version integer not null default 1,
  payload jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  -- Expansion bag: keep not-yet-promoted config here, promote to a real column
  -- once it needs indexing, constraints or its own RLS.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Tolerate older copies of the table by back-filling any missing columns.
alter table content.entry_versions add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.entry_versions add column if not exists entry_id uuid references content.entries(id) on delete cascade;
alter table content.entry_versions add column if not exists version integer not null default 1;
alter table content.entry_versions add column if not exists payload jsonb not null default '{}'::jsonb;
alter table content.entry_versions add column if not exists published_at timestamptz;
alter table content.entry_versions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.entry_versions add column if not exists created_by uuid;
alter table content.entry_versions add column if not exists created_at timestamptz not null default now();
alter table content.entry_versions add column if not exists updated_at timestamptz not null default now();
alter table content.entry_versions add column if not exists deleted_at timestamptz;

create index if not exists entry_versions_entry_idx
  on content.entry_versions (entry_id) where deleted_at is null;
create index if not exists entry_versions_project_idx
  on content.entry_versions (project_id) where deleted_at is null;
create index if not exists entry_versions_created_at_idx
  on content.entry_versions (created_at desc);
create unique index if not exists entry_versions_entry_version_uniq
  on content.entry_versions (entry_id, version) where deleted_at is null;

drop trigger if exists entry_versions_touch_updated_at on content.entry_versions;
create trigger entry_versions_touch_updated_at
before update on content.entry_versions
for each row execute function content.touch_updated_at();

grant all on table content.entry_versions to anon, authenticated, service_role;

-- Demo-open RLS (the dashboard runs unauthenticated). Tighten once auth lands.
alter table content.entry_versions enable row level security;

drop policy if exists entry_versions_demo_all on content.entry_versions;
create policy entry_versions_demo_all on content.entry_versions
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- @down
drop table if exists content.entry_versions cascade;
