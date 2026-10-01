-- Editorial comments
--
-- Owns content.comments. Field-anchored threads on entries: one thread_id
-- groups replies, mentions is a text array of handles, resolved closes the
-- thread. Self-contained + idempotent.

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

create table if not exists content.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  entry_id uuid references content.entries(id) on delete cascade,
  field_key text not null default '',
  thread_id text not null default '',
  body text not null default '',
  mentions text[] not null default '{}',
  resolved boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.comments add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.comments add column if not exists entry_id uuid references content.entries(id) on delete cascade;
alter table content.comments add column if not exists field_key text not null default '';
alter table content.comments add column if not exists thread_id text not null default '';
alter table content.comments add column if not exists body text not null default '';
alter table content.comments add column if not exists mentions text[] not null default '{}';
alter table content.comments add column if not exists resolved boolean not null default false;
alter table content.comments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.comments add column if not exists created_by uuid;
alter table content.comments add column if not exists created_at timestamptz not null default now();
alter table content.comments add column if not exists updated_at timestamptz not null default now();
alter table content.comments add column if not exists deleted_at timestamptz;

create index if not exists comments_entry_idx
  on content.comments (entry_id) where deleted_at is null;
create index if not exists comments_thread_idx
  on content.comments (thread_id) where deleted_at is null;
create index if not exists comments_project_idx
  on content.comments (project_id) where deleted_at is null;
create index if not exists comments_open_idx
  on content.comments (entry_id) where deleted_at is null and resolved = false;

drop trigger if exists comments_touch_updated_at on content.comments;
create trigger comments_touch_updated_at
before update on content.comments
for each row execute function content.touch_updated_at();

alter table content.comments enable row level security;
drop policy if exists comments_demo_all on content.comments;
create policy comments_demo_all on content.comments
  for all to anon, authenticated using (true) with check (true);

-- @down
drop policy if exists comments_demo_all on content.comments;
drop trigger if exists comments_touch_updated_at on content.comments;
drop index if exists content.comments_open_idx;
drop index if exists content.comments_project_idx;
drop index if exists content.comments_thread_idx;
drop index if exists content.comments_entry_idx;
drop table if exists content.comments cascade;
