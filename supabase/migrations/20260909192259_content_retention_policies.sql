-- Content retention policies
--
-- Owns content.retention_policies. Per-scope retention rules (scope, days,
-- action) read by the Governance → Retention Policies screen through
-- lib/supabase/policies.js. scope names what the rule covers (e.g.
-- "entries", "assets", "audit_log"), days how long rows are kept, action what
-- happens when they age out (e.g. "archive", "soft_delete", "purge").

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

create table if not exists content.retention_policies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  scope text not null default '',
  days integer not null default 365,
  action text not null default 'archive',
  -- Expansion bag: keep not-yet-promoted config here, promote to a real column
  -- once it needs indexing, constraints or its own RLS.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Tolerate older copies of the table by back-filling any missing columns.
alter table content.retention_policies add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.retention_policies add column if not exists scope text not null default '';
alter table content.retention_policies add column if not exists days integer not null default 365;
alter table content.retention_policies add column if not exists action text not null default 'archive';
alter table content.retention_policies add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.retention_policies add column if not exists created_by uuid;
alter table content.retention_policies add column if not exists created_at timestamptz not null default now();
alter table content.retention_policies add column if not exists updated_at timestamptz not null default now();
alter table content.retention_policies add column if not exists deleted_at timestamptz;

create index if not exists retention_policies_project_idx
  on content.retention_policies (project_id) where deleted_at is null;

drop trigger if exists retention_policies_touch_updated_at on content.retention_policies;
create trigger retention_policies_touch_updated_at
before update on content.retention_policies
for each row execute function content.touch_updated_at();

-- Demo-open RLS (the dashboard runs unauthenticated). Tighten once auth lands.
alter table content.retention_policies enable row level security;

drop policy if exists retention_policies_demo_all on content.retention_policies;
create policy retention_policies_demo_all on content.retention_policies
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- @down
drop table if exists content.retention_policies cascade;
