-- Workflow states and assignments
--
-- Owns content.workflow_states + content.assignments. Approval gates
-- (Draft -> In review -> Published) and per-entry editorial ownership with
-- due dates. Self-contained + idempotent.

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

create table if not exists content.workflow_states (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  key text not null default '',
  label text not null default '',
  position integer not null default 0,
  is_terminal boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.workflow_states add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.workflow_states add column if not exists key text not null default '';
alter table content.workflow_states add column if not exists label text not null default '';
alter table content.workflow_states add column if not exists position integer not null default 0;
alter table content.workflow_states add column if not exists is_terminal boolean not null default false;
alter table content.workflow_states add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.workflow_states add column if not exists created_by uuid;
alter table content.workflow_states add column if not exists created_at timestamptz not null default now();
alter table content.workflow_states add column if not exists updated_at timestamptz not null default now();
alter table content.workflow_states add column if not exists deleted_at timestamptz;

create table if not exists content.assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  entry_id uuid references content.entries(id) on delete cascade,
  assignee text not null default '',
  due_at timestamptz,
  status text not null default 'Open',
  priority text not null default 'Normal',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.assignments add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.assignments add column if not exists entry_id uuid references content.entries(id) on delete cascade;
alter table content.assignments add column if not exists assignee text not null default '';
alter table content.assignments add column if not exists due_at timestamptz;
alter table content.assignments add column if not exists status text not null default 'Open';
alter table content.assignments add column if not exists priority text not null default 'Normal';
alter table content.assignments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.assignments add column if not exists created_by uuid;
alter table content.assignments add column if not exists created_at timestamptz not null default now();
alter table content.assignments add column if not exists updated_at timestamptz not null default now();
alter table content.assignments add column if not exists deleted_at timestamptz;

create unique index if not exists workflow_states_project_key_uniq
  on content.workflow_states (project_id, key) where deleted_at is null and key <> '';
create index if not exists workflow_states_project_idx
  on content.workflow_states (project_id, position) where deleted_at is null;
create index if not exists assignments_project_idx
  on content.assignments (project_id) where deleted_at is null;
create index if not exists assignments_entry_idx
  on content.assignments (entry_id) where deleted_at is null;
create index if not exists assignments_status_idx
  on content.assignments (status) where deleted_at is null;
create index if not exists assignments_due_idx
  on content.assignments (due_at) where deleted_at is null;

drop trigger if exists workflow_states_touch_updated_at on content.workflow_states;
create trigger workflow_states_touch_updated_at
before update on content.workflow_states
for each row execute function content.touch_updated_at();

drop trigger if exists assignments_touch_updated_at on content.assignments;
create trigger assignments_touch_updated_at
before update on content.assignments
for each row execute function content.touch_updated_at();

alter table content.workflow_states enable row level security;
drop policy if exists workflow_states_demo_all on content.workflow_states;
create policy workflow_states_demo_all on content.workflow_states
  for all to anon, authenticated using (true) with check (true);

alter table content.assignments enable row level security;
drop policy if exists assignments_demo_all on content.assignments;
create policy assignments_demo_all on content.assignments
  for all to anon, authenticated using (true) with check (true);

-- @down
drop policy if exists assignments_demo_all on content.assignments;
drop policy if exists workflow_states_demo_all on content.workflow_states;
drop trigger if exists assignments_touch_updated_at on content.assignments;
drop trigger if exists workflow_states_touch_updated_at on content.workflow_states;
drop index if exists content.assignments_due_idx;
drop index if exists content.assignments_status_idx;
drop index if exists content.assignments_entry_idx;
drop index if exists content.assignments_project_idx;
drop index if exists content.workflow_states_project_idx;
drop index if exists content.workflow_states_project_key_uniq;
drop table if exists content.assignments cascade;
drop table if exists content.workflow_states cascade;
