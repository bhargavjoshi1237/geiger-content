-- Content types and fields
--
-- Owns content.content_types + content.fields. Structured content modeling:
-- a type (Article, Page, …) declares its field schema; entries validate their
-- `data` jsonb against it. Self-contained + idempotent.

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

create table if not exists content.content_types (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  key text not null default '',
  name text not null default 'Untitled type',
  icon text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.content_types add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.content_types add column if not exists key text not null default '';
alter table content.content_types add column if not exists name text not null default 'Untitled type';
alter table content.content_types add column if not exists icon text not null default '';
alter table content.content_types add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.content_types add column if not exists created_by uuid;
alter table content.content_types add column if not exists created_at timestamptz not null default now();
alter table content.content_types add column if not exists updated_at timestamptz not null default now();
alter table content.content_types add column if not exists deleted_at timestamptz;

create table if not exists content.fields (
  id uuid primary key default gen_random_uuid(),
  type_id uuid references content.content_types(id) on delete cascade,
  key text not null default '',
  label text not null default '',
  data_type text not null default 'text',
  validation jsonb not null default '{}'::jsonb,
  localized boolean not null default false,
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.fields add column if not exists type_id uuid references content.content_types(id) on delete cascade;
alter table content.fields add column if not exists key text not null default '';
alter table content.fields add column if not exists label text not null default '';
alter table content.fields add column if not exists data_type text not null default 'text';
alter table content.fields add column if not exists validation jsonb not null default '{}'::jsonb;
alter table content.fields add column if not exists localized boolean not null default false;
alter table content.fields add column if not exists position integer not null default 0;
alter table content.fields add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.fields add column if not exists created_by uuid;
alter table content.fields add column if not exists created_at timestamptz not null default now();
alter table content.fields add column if not exists updated_at timestamptz not null default now();
alter table content.fields add column if not exists deleted_at timestamptz;

create unique index if not exists content_types_project_key_uniq
  on content.content_types (project_id, key) where deleted_at is null and key <> '';
create index if not exists content_types_project_idx
  on content.content_types (project_id) where deleted_at is null;
create index if not exists fields_type_idx
  on content.fields (type_id) where deleted_at is null;
create unique index if not exists fields_type_key_uniq
  on content.fields (type_id, key) where deleted_at is null and key <> '';
create index if not exists fields_type_position_idx
  on content.fields (type_id, position) where deleted_at is null;

drop trigger if exists content_types_touch_updated_at on content.content_types;
create trigger content_types_touch_updated_at
before update on content.content_types
for each row execute function content.touch_updated_at();

drop trigger if exists fields_touch_updated_at on content.fields;
create trigger fields_touch_updated_at
before update on content.fields
for each row execute function content.touch_updated_at();

alter table content.content_types enable row level security;
drop policy if exists content_types_demo_all on content.content_types;
create policy content_types_demo_all on content.content_types
  for all to anon, authenticated using (true) with check (true);

alter table content.fields enable row level security;
drop policy if exists fields_demo_all on content.fields;
create policy fields_demo_all on content.fields
  for all to anon, authenticated using (true) with check (true);

-- @down
drop policy if exists fields_demo_all on content.fields;
drop policy if exists content_types_demo_all on content.content_types;
drop trigger if exists fields_touch_updated_at on content.fields;
drop trigger if exists content_types_touch_updated_at on content.content_types;
drop index if exists content.fields_type_position_idx;
drop index if exists content.fields_type_key_uniq;
drop index if exists content.fields_type_idx;
drop index if exists content.content_types_project_idx;
drop index if exists content.content_types_project_key_uniq;
drop table if exists content.fields cascade;
drop table if exists content.content_types cascade;
