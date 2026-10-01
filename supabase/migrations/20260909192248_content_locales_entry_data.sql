-- Locales, entry data bag and entry versions
--
-- Owns content.locales; alters content.entries (+ data jsonb); owns
-- content.entry_versions (snapshotted payloads backing Version History and
-- Compare & Rollback; Phase 2's publish pipeline will write here too).
--
-- Localization model: per-locale variants are SEPARATE entries rows sharing a
-- slug root (e.g. `getting-started` + `getting-started--de`, or the same slug
-- with a different `locale`), never a (entry_id, locale) composite — the
-- entries table keeps its single-column PK. content.locales is the registry of
-- enabled locales and their fallbacks. Fixed entry columns are kept; typed
-- values move into entries.data validated against the type's field schema.

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

create table if not exists content.locales (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  code text not null default '',
  label text not null default '',
  fallback_code text not null default '',
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.locales add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.locales add column if not exists code text not null default '';
alter table content.locales add column if not exists label text not null default '';
alter table content.locales add column if not exists fallback_code text not null default '';
alter table content.locales add column if not exists is_default boolean not null default false;
alter table content.locales add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.locales add column if not exists created_by uuid;
alter table content.locales add column if not exists created_at timestamptz not null default now();
alter table content.locales add column if not exists updated_at timestamptz not null default now();
alter table content.locales add column if not exists deleted_at timestamptz;

-- Typed field values live here; fixed columns (title/slug/status/…) stay.
alter table content.entries add column if not exists data jsonb not null default '{}'::jsonb;

create table if not exists content.entry_versions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references content.entries(id) on delete cascade,
  version integer not null default 1,
  payload jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.entry_versions add column if not exists entry_id uuid references content.entries(id) on delete cascade;
alter table content.entry_versions add column if not exists version integer not null default 1;
alter table content.entry_versions add column if not exists payload jsonb not null default '{}'::jsonb;
alter table content.entry_versions add column if not exists published_at timestamptz;
alter table content.entry_versions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.entry_versions add column if not exists created_by uuid;
alter table content.entry_versions add column if not exists created_at timestamptz not null default now();
alter table content.entry_versions add column if not exists updated_at timestamptz not null default now();
alter table content.entry_versions add column if not exists deleted_at timestamptz;

create unique index if not exists locales_project_code_uniq
  on content.locales (project_id, code) where deleted_at is null and code <> '';
create index if not exists locales_project_idx
  on content.locales (project_id) where deleted_at is null;
create index if not exists entry_versions_entry_idx
  on content.entry_versions (entry_id, version desc) where deleted_at is null;
create unique index if not exists entry_versions_entry_version_uniq
  on content.entry_versions (entry_id, version) where deleted_at is null;

drop trigger if exists locales_touch_updated_at on content.locales;
create trigger locales_touch_updated_at
before update on content.locales
for each row execute function content.touch_updated_at();

drop trigger if exists entry_versions_touch_updated_at on content.entry_versions;
create trigger entry_versions_touch_updated_at
before update on content.entry_versions
for each row execute function content.touch_updated_at();

alter table content.locales enable row level security;
drop policy if exists locales_demo_all on content.locales;
create policy locales_demo_all on content.locales
  for all to anon, authenticated using (true) with check (true);

alter table content.entry_versions enable row level security;
drop policy if exists entry_versions_demo_all on content.entry_versions;
create policy entry_versions_demo_all on content.entry_versions
  for all to anon, authenticated using (true) with check (true);

-- @down
drop policy if exists entry_versions_demo_all on content.entry_versions;
drop policy if exists locales_demo_all on content.locales;
drop trigger if exists entry_versions_touch_updated_at on content.entry_versions;
drop trigger if exists locales_touch_updated_at on content.locales;
drop index if exists content.entry_versions_entry_version_uniq;
drop index if exists content.entry_versions_entry_idx;
drop index if exists content.locales_project_idx;
drop index if exists content.locales_project_code_uniq;
drop table if exists content.entry_versions cascade;
alter table content.entries drop column if exists data;
drop table if exists content.locales cascade;
