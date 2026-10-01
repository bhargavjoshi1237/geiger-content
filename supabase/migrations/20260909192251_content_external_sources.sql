-- External sources
--
-- Owns content.external_sources. Connection-string rows behind the External
-- Sources screen: named feeds/APIs content can be imported from, with a
-- tracked sync status. Self-contained + idempotent.

-- @up
create extension if not exists pgcrypto;

create schema if not exists content;
grant usage on schema content to anon, authenticated, service_role;

create or replace function content.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists content.external_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null default 'Untitled source',
  type text not null default 'API',
  url text not null default '',
  status text not null default 'Disconnected',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.external_sources add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.external_sources add column if not exists name text not null default 'Untitled source';
alter table content.external_sources add column if not exists type text not null default 'API';
alter table content.external_sources add column if not exists url text not null default '';
alter table content.external_sources add column if not exists status text not null default 'Disconnected';
alter table content.external_sources add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.external_sources add column if not exists created_by uuid;
alter table content.external_sources add column if not exists created_at timestamptz not null default now();
alter table content.external_sources add column if not exists updated_at timestamptz not null default now();
alter table content.external_sources add column if not exists deleted_at timestamptz;

create index if not exists external_sources_project_idx
  on content.external_sources (project_id) where deleted_at is null;
create index if not exists external_sources_status_idx
  on content.external_sources (status) where deleted_at is null;

drop trigger if exists external_sources_touch_updated_at on content.external_sources;
create trigger external_sources_touch_updated_at
before update on content.external_sources
for each row execute function content.touch_updated_at();

alter table content.external_sources enable row level security;
drop policy if exists external_sources_demo_all on content.external_sources;
create policy external_sources_demo_all on content.external_sources
  for all to anon, authenticated using (true) with check (true);

-- @down
drop policy if exists external_sources_demo_all on content.external_sources;
drop trigger if exists external_sources_touch_updated_at on content.external_sources;
drop index if exists content.external_sources_status_idx;
drop index if exists content.external_sources_project_idx;
drop table if exists content.external_sources cascade;
