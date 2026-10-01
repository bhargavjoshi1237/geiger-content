-- Content project settings
--
-- Owns content.project_settings. Per-project General / Workspace preferences
-- (default locale, timezone, brand name) behind the Settings screens.
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

create table if not exists content.project_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid unique references public.projects(id) on delete cascade,
  default_locale text not null default 'en',
  timezone text not null default 'UTC',
  brand_name text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.project_settings add column if not exists project_id uuid unique references public.projects(id) on delete cascade;
alter table content.project_settings add column if not exists default_locale text not null default 'en';
alter table content.project_settings add column if not exists timezone text not null default 'UTC';
alter table content.project_settings add column if not exists brand_name text not null default '';
alter table content.project_settings add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.project_settings add column if not exists created_by uuid;
alter table content.project_settings add column if not exists created_at timestamptz not null default now();
alter table content.project_settings add column if not exists updated_at timestamptz not null default now();
alter table content.project_settings add column if not exists deleted_at timestamptz;

create index if not exists project_settings_project_idx
  on content.project_settings (project_id) where deleted_at is null;

drop trigger if exists project_settings_touch_updated_at on content.project_settings;
create trigger project_settings_touch_updated_at
before update on content.project_settings
for each row execute function content.touch_updated_at();

-- Demo-open RLS (the dashboard runs unauthenticated). Tighten once auth lands.
alter table content.project_settings enable row level security;

drop policy if exists project_settings_demo_all on content.project_settings;
create policy project_settings_demo_all on content.project_settings
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on table content.project_settings to anon, authenticated, service_role;

-- @down
drop table if exists content.project_settings cascade;
