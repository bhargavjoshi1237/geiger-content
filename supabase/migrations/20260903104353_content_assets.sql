-- Content assets
--
-- Owns content.assets. The media library behind the Assets screen (images,
-- video, documents used by entries). Self-contained: creates the schema, the
-- shared updated_at trigger function, the table, its indexes and RLS.

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

create table if not exists content.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null default 'Untitled asset',
  folder text not null default '',
  file_type text not null default 'image',
  mime text not null default '',
  size_bytes bigint not null default 0,
  url text not null default '',
  alt text not null default '',
  status text not null default 'Ready',
  -- Expansion bag: transformations, rights, usage refs live here until promoted.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.assets add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.assets add column if not exists name text not null default 'Untitled asset';
alter table content.assets add column if not exists folder text not null default '';
alter table content.assets add column if not exists file_type text not null default 'image';
alter table content.assets add column if not exists mime text not null default '';
alter table content.assets add column if not exists size_bytes bigint not null default 0;
alter table content.assets add column if not exists url text not null default '';
alter table content.assets add column if not exists alt text not null default '';
alter table content.assets add column if not exists status text not null default 'Ready';
alter table content.assets add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.assets add column if not exists created_by uuid;
alter table content.assets add column if not exists created_at timestamptz not null default now();
alter table content.assets add column if not exists updated_at timestamptz not null default now();
alter table content.assets add column if not exists deleted_at timestamptz;

create index if not exists assets_project_idx
  on content.assets (project_id) where deleted_at is null;
create index if not exists assets_folder_idx
  on content.assets (folder) where deleted_at is null;
create index if not exists assets_file_type_idx
  on content.assets (file_type) where deleted_at is null;
create index if not exists assets_status_idx
  on content.assets (status) where deleted_at is null;
create index if not exists assets_created_at_idx
  on content.assets (created_at desc);

drop trigger if exists assets_touch_updated_at on content.assets;
create trigger assets_touch_updated_at
before update on content.assets
for each row execute function content.touch_updated_at();

-- Demo-open RLS (the dashboard runs unauthenticated). Tighten once auth lands.
alter table content.assets enable row level security;

drop policy if exists assets_demo_all on content.assets;
create policy assets_demo_all on content.assets
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- @down
drop table if exists content.assets cascade;
