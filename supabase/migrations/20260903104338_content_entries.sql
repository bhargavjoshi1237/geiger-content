-- Content entries
--
-- Owns content.entries. The core editorial record behind All Content, Drafts,
-- Pages, Scheduled and Archived (those screens are status/type-filtered views
-- over this table). Self-contained: creates the schema, the shared updated_at
-- trigger function, the table, its indexes and RLS.

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

create table if not exists content.entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null default '',
  slug text not null default '',
  status text not null default 'Draft',
  type text not null default 'Article',
  excerpt text not null default '',
  body text not null default '',
  author text not null default '',
  locale text not null default 'en',
  cover_url text not null default '',
  scheduled_at timestamptz,
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
alter table content.entries add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.entries add column if not exists title text not null default '';
alter table content.entries add column if not exists slug text not null default '';
alter table content.entries add column if not exists status text not null default 'Draft';
alter table content.entries add column if not exists type text not null default 'Article';
alter table content.entries add column if not exists excerpt text not null default '';
alter table content.entries add column if not exists body text not null default '';
alter table content.entries add column if not exists author text not null default '';
alter table content.entries add column if not exists locale text not null default 'en';
alter table content.entries add column if not exists cover_url text not null default '';
alter table content.entries add column if not exists scheduled_at timestamptz;
alter table content.entries add column if not exists published_at timestamptz;
alter table content.entries add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.entries add column if not exists created_by uuid;
alter table content.entries add column if not exists created_at timestamptz not null default now();
alter table content.entries add column if not exists updated_at timestamptz not null default now();
alter table content.entries add column if not exists deleted_at timestamptz;

create index if not exists entries_project_idx
  on content.entries (project_id) where deleted_at is null;
create index if not exists entries_status_idx
  on content.entries (status) where deleted_at is null;
create index if not exists entries_type_idx
  on content.entries (type) where deleted_at is null;
create index if not exists entries_scheduled_idx
  on content.entries (scheduled_at) where deleted_at is null;
create index if not exists entries_created_at_idx
  on content.entries (created_at desc);
create unique index if not exists entries_project_slug_uniq
  on content.entries (project_id, slug) where deleted_at is null and slug <> '';

create index if not exists entries_live_idx
  on content.entries (id)
  where deleted_at is null;

drop trigger if exists entries_touch_updated_at on content.entries;
create trigger entries_touch_updated_at
before update on content.entries
for each row execute function content.touch_updated_at();

-- Demo-open RLS (the dashboard runs unauthenticated). Tighten once auth lands.
alter table content.entries enable row level security;

drop policy if exists entries_demo_all on content.entries;
create policy entries_demo_all on content.entries
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- @down
drop table if exists content.entries cascade;
