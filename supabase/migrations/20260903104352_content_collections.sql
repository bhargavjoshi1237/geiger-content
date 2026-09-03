-- Content collections
--
-- Owns content.collections + content.collection_items. Grouped, orderable sets
-- of entries behind the Collections screen. Self-contained: creates the schema,
-- the shared updated_at trigger function, tables, indexes and RLS.

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

create table if not exists content.collections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null default 'Untitled collection',
  slug text not null default '',
  description text not null default '',
  status text not null default 'Draft',
  cover_url text not null default '',
  -- Expansion bag: delivery settings, rules, destinations live here until
  -- promoted to real columns.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.collections add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.collections add column if not exists name text not null default 'Untitled collection';
alter table content.collections add column if not exists slug text not null default '';
alter table content.collections add column if not exists description text not null default '';
alter table content.collections add column if not exists status text not null default 'Draft';
alter table content.collections add column if not exists cover_url text not null default '';
alter table content.collections add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.collections add column if not exists created_by uuid;
alter table content.collections add column if not exists created_at timestamptz not null default now();
alter table content.collections add column if not exists updated_at timestamptz not null default now();
alter table content.collections add column if not exists deleted_at timestamptz;

create table if not exists content.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references content.collections(id) on delete cascade,
  entry_id uuid not null references content.entries(id) on delete cascade,
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table content.collection_items add column if not exists collection_id uuid not null references content.collections(id) on delete cascade;
alter table content.collection_items add column if not exists entry_id uuid not null references content.entries(id) on delete cascade;
alter table content.collection_items add column if not exists position integer not null default 0;
alter table content.collection_items add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.collection_items add column if not exists created_at timestamptz not null default now();

create index if not exists collections_project_idx
  on content.collections (project_id) where deleted_at is null;
create index if not exists collections_status_idx
  on content.collections (status) where deleted_at is null;
create index if not exists collections_created_at_idx
  on content.collections (created_at desc);
create unique index if not exists collections_project_slug_uniq
  on content.collections (project_id, slug) where deleted_at is null and slug <> '';

create index if not exists collection_items_collection_idx
  on content.collection_items (collection_id);
create index if not exists collection_items_entry_idx
  on content.collection_items (entry_id);
create unique index if not exists collection_items_uniq
  on content.collection_items (collection_id, entry_id);

drop trigger if exists collections_touch_updated_at on content.collections;
create trigger collections_touch_updated_at
before update on content.collections
for each row execute function content.touch_updated_at();

-- Demo-open RLS (the dashboard runs unauthenticated). Tighten once auth lands.
alter table content.collections enable row level security;

drop policy if exists collections_demo_all on content.collections;
create policy collections_demo_all on content.collections
  for all
  to anon, authenticated
  using (true)
  with check (true);

alter table content.collection_items enable row level security;

drop policy if exists collection_items_demo_all on content.collection_items;
create policy collection_items_demo_all on content.collection_items
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- @down
drop table if exists content.collection_items cascade;
drop table if exists content.collections cascade;
