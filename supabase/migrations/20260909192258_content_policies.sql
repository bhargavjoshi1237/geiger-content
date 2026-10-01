-- Content policies
--
-- Owns content.policies. Named editorial guardrails (name, rules jsonb,
-- enforced bool) read by the Governance → Content Policies screen through
-- lib/supabase/policies.js. Rules stay a jsonb bag until individual rule
-- shapes need indexing or their own RLS — then they get promoted to columns.

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

create table if not exists content.policies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null default '',
  rules jsonb not null default '{}'::jsonb,
  enforced boolean not null default true,
  -- Expansion bag: keep not-yet-promoted config here, promote to a real column
  -- once it needs indexing, constraints or its own RLS.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Tolerate older copies of the table by back-filling any missing columns.
alter table content.policies add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.policies add column if not exists name text not null default '';
alter table content.policies add column if not exists rules jsonb not null default '{}'::jsonb;
alter table content.policies add column if not exists enforced boolean not null default true;
alter table content.policies add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.policies add column if not exists created_by uuid;
alter table content.policies add column if not exists created_at timestamptz not null default now();
alter table content.policies add column if not exists updated_at timestamptz not null default now();
alter table content.policies add column if not exists deleted_at timestamptz;

create index if not exists policies_project_idx
  on content.policies (project_id) where deleted_at is null;

drop trigger if exists policies_touch_updated_at on content.policies;
create trigger policies_touch_updated_at
before update on content.policies
for each row execute function content.touch_updated_at();

-- Demo-open RLS (the dashboard runs unauthenticated). Tighten once auth lands.
alter table content.policies enable row level security;

drop policy if exists policies_demo_all on content.policies;
create policy policies_demo_all on content.policies
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- @down
drop table if exists content.policies cascade;
