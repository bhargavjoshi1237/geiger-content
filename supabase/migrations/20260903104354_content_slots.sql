-- Content slots
--
-- Owns content.slots. Named delivery locations (e.g. homepage-hero) behind the
-- Content Slots screen, each resolving to eligible entries + a fallback.
-- Self-contained: creates the schema, the shared updated_at trigger function,
-- the table, its indexes and RLS.

-- @up
create extension if not exists pgcrypto;

create schema if not exists content;
grant usage on schema content to anon, authenticated, service_role;

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

create table if not exists content.slots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  key text not null default '',
  name text not null default 'Untitled slot',
  description text not null default '',
  status text not null default 'Active',
  fallback_entry_id uuid references content.entries(id) on delete set null,
  -- Expansion bag: eligible content, targeting rules, variants live here until
  -- promoted to real columns.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.slots add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.slots add column if not exists key text not null default '';
alter table content.slots add column if not exists name text not null default 'Untitled slot';
alter table content.slots add column if not exists description text not null default '';
alter table content.slots add column if not exists status text not null default 'Active';
alter table content.slots add column if not exists fallback_entry_id uuid references content.entries(id) on delete set null;
alter table content.slots add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.slots add column if not exists created_by uuid;
alter table content.slots add column if not exists created_at timestamptz not null default now();
alter table content.slots add column if not exists updated_at timestamptz not null default now();
alter table content.slots add column if not exists deleted_at timestamptz;

create index if not exists slots_project_idx
  on content.slots (project_id) where deleted_at is null;
create index if not exists slots_status_idx
  on content.slots (status) where deleted_at is null;
create index if not exists slots_created_at_idx
  on content.slots (created_at desc);
create unique index if not exists slots_project_key_uniq
  on content.slots (project_id, key) where deleted_at is null and key <> '';

drop trigger if exists slots_touch_updated_at on content.slots;
create trigger slots_touch_updated_at
before update on content.slots
for each row execute function content.touch_updated_at();

-- Demo-open RLS (the dashboard runs unauthenticated). Tighten once auth lands.
alter table content.slots enable row level security;

drop policy if exists slots_demo_all on content.slots;
create policy slots_demo_all on content.slots
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- @down
drop table if exists content.slots cascade;
