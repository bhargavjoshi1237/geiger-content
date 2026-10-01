-- Reusable blocks and block instances
--
-- Owns content.blocks + content.block_instances. A block is a reusable
-- structured chunk (hero, quote, CTA…); an instance pins one to an entry at a
-- position with its own data payload. Self-contained + idempotent.

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

create table if not exists content.blocks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  key text not null default '',
  name text not null default 'Untitled block',
  schema jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.blocks add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.blocks add column if not exists key text not null default '';
alter table content.blocks add column if not exists name text not null default 'Untitled block';
alter table content.blocks add column if not exists schema jsonb not null default '{}'::jsonb;
alter table content.blocks add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.blocks add column if not exists created_by uuid;
alter table content.blocks add column if not exists created_at timestamptz not null default now();
alter table content.blocks add column if not exists updated_at timestamptz not null default now();
alter table content.blocks add column if not exists deleted_at timestamptz;

create table if not exists content.block_instances (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references content.blocks(id) on delete cascade,
  entry_id uuid references content.entries(id) on delete cascade,
  position integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.block_instances add column if not exists block_id uuid references content.blocks(id) on delete cascade;
alter table content.block_instances add column if not exists entry_id uuid references content.entries(id) on delete cascade;
alter table content.block_instances add column if not exists position integer not null default 0;
alter table content.block_instances add column if not exists data jsonb not null default '{}'::jsonb;
alter table content.block_instances add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.block_instances add column if not exists created_by uuid;
alter table content.block_instances add column if not exists created_at timestamptz not null default now();
alter table content.block_instances add column if not exists updated_at timestamptz not null default now();
alter table content.block_instances add column if not exists deleted_at timestamptz;

create unique index if not exists blocks_project_key_uniq
  on content.blocks (project_id, key) where deleted_at is null and key <> '';
create index if not exists blocks_project_idx
  on content.blocks (project_id) where deleted_at is null;
create index if not exists block_instances_entry_idx
  on content.block_instances (entry_id, position) where deleted_at is null;
create index if not exists block_instances_block_idx
  on content.block_instances (block_id) where deleted_at is null;

drop trigger if exists blocks_touch_updated_at on content.blocks;
create trigger blocks_touch_updated_at
before update on content.blocks
for each row execute function content.touch_updated_at();

drop trigger if exists block_instances_touch_updated_at on content.block_instances;
create trigger block_instances_touch_updated_at
before update on content.block_instances
for each row execute function content.touch_updated_at();

alter table content.blocks enable row level security;
drop policy if exists blocks_demo_all on content.blocks;
create policy blocks_demo_all on content.blocks
  for all to anon, authenticated using (true) with check (true);

alter table content.block_instances enable row level security;
drop policy if exists block_instances_demo_all on content.block_instances;
create policy block_instances_demo_all on content.block_instances
  for all to anon, authenticated using (true) with check (true);

-- @down
drop policy if exists block_instances_demo_all on content.block_instances;
drop policy if exists blocks_demo_all on content.blocks;
drop trigger if exists block_instances_touch_updated_at on content.block_instances;
drop trigger if exists blocks_touch_updated_at on content.blocks;
drop index if exists content.block_instances_block_idx;
drop index if exists content.block_instances_entry_idx;
drop index if exists content.blocks_project_idx;
drop index if exists content.blocks_project_key_uniq;
drop table if exists content.block_instances cascade;
drop table if exists content.blocks cascade;
