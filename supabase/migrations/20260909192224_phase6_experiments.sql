-- Phase 6: experiments
--
-- Owns content.experiments (name, status, traffic_split jsonb, goal_metric,
-- holdout_pct, starts_at, ends_at, project_id),
-- content.experiment_variants (experiment_id FK, entry_id FK nullable,
-- weight) and content.experiment_exposures (experiment_id FK, variant_id FK,
-- profile_id text, converted bool, at). Self-contained: creates the schema,
-- the shared updated_at trigger function, the tables, their indexes, grants
-- and RLS.

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

create table if not exists content.experiments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null default 'Untitled experiment',
  status text not null default 'Draft',
  traffic_split jsonb not null default '{}'::jsonb,
  goal_metric text not null default 'conversion',
  holdout_pct numeric not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.experiments add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.experiments add column if not exists name text not null default 'Untitled experiment';
alter table content.experiments add column if not exists status text not null default 'Draft';
alter table content.experiments add column if not exists traffic_split jsonb not null default '{}'::jsonb;
alter table content.experiments add column if not exists goal_metric text not null default 'conversion';
alter table content.experiments add column if not exists holdout_pct numeric not null default 0;
alter table content.experiments add column if not exists starts_at timestamptz;
alter table content.experiments add column if not exists ends_at timestamptz;
alter table content.experiments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.experiments add column if not exists created_by uuid;
alter table content.experiments add column if not exists created_at timestamptz not null default now();
alter table content.experiments add column if not exists updated_at timestamptz not null default now();
alter table content.experiments add column if not exists deleted_at timestamptz;

create index if not exists experiments_project_idx
  on content.experiments (project_id) where deleted_at is null;
create index if not exists experiments_status_idx
  on content.experiments (status) where deleted_at is null;

drop trigger if exists experiments_touch_updated_at on content.experiments;
create trigger experiments_touch_updated_at
before update on content.experiments
for each row execute function content.touch_updated_at();

alter table content.experiments enable row level security;

drop policy if exists experiments_demo_all on content.experiments;
create policy experiments_demo_all on content.experiments
  for all
  to anon, authenticated
  using (true)
  with check (true);

create table if not exists content.experiment_variants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  experiment_id uuid references content.experiments(id) on delete cascade,
  entry_id uuid references content.entries(id) on delete set null,
  name text not null default 'Variant',
  weight numeric not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.experiment_variants add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.experiment_variants add column if not exists experiment_id uuid references content.experiments(id) on delete cascade;
alter table content.experiment_variants add column if not exists entry_id uuid references content.entries(id) on delete set null;
alter table content.experiment_variants add column if not exists name text not null default 'Variant';
alter table content.experiment_variants add column if not exists weight numeric not null default 1;
alter table content.experiment_variants add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.experiment_variants add column if not exists created_by uuid;
alter table content.experiment_variants add column if not exists created_at timestamptz not null default now();
alter table content.experiment_variants add column if not exists updated_at timestamptz not null default now();
alter table content.experiment_variants add column if not exists deleted_at timestamptz;

create index if not exists experiment_variants_experiment_idx
  on content.experiment_variants (experiment_id) where deleted_at is null;
create index if not exists experiment_variants_entry_idx
  on content.experiment_variants (entry_id) where deleted_at is null;

drop trigger if exists experiment_variants_touch_updated_at on content.experiment_variants;
create trigger experiment_variants_touch_updated_at
before update on content.experiment_variants
for each row execute function content.touch_updated_at();

alter table content.experiment_variants enable row level security;

drop policy if exists experiment_variants_demo_all on content.experiment_variants;
create policy experiment_variants_demo_all on content.experiment_variants
  for all
  to anon, authenticated
  using (true)
  with check (true);

create table if not exists content.experiment_exposures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  experiment_id uuid references content.experiments(id) on delete cascade,
  variant_id uuid references content.experiment_variants(id) on delete cascade,
  profile_id text not null default '',
  converted bool not null default false,
  at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.experiment_exposures add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.experiment_exposures add column if not exists experiment_id uuid references content.experiments(id) on delete cascade;
alter table content.experiment_exposures add column if not exists variant_id uuid references content.experiment_variants(id) on delete cascade;
alter table content.experiment_exposures add column if not exists profile_id text not null default '';
alter table content.experiment_exposures add column if not exists converted bool not null default false;
alter table content.experiment_exposures add column if not exists at timestamptz not null default now();
alter table content.experiment_exposures add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.experiment_exposures add column if not exists created_by uuid;
alter table content.experiment_exposures add column if not exists created_at timestamptz not null default now();
alter table content.experiment_exposures add column if not exists updated_at timestamptz not null default now();
alter table content.experiment_exposures add column if not exists deleted_at timestamptz;

create index if not exists experiment_exposures_experiment_idx
  on content.experiment_exposures (experiment_id) where deleted_at is null;
create index if not exists experiment_exposures_variant_idx
  on content.experiment_exposures (variant_id) where deleted_at is null;
create index if not exists experiment_exposures_profile_idx
  on content.experiment_exposures (profile_id) where deleted_at is null;

drop trigger if exists experiment_exposures_touch_updated_at on content.experiment_exposures;
create trigger experiment_exposures_touch_updated_at
before update on content.experiment_exposures
for each row execute function content.touch_updated_at();

alter table content.experiment_exposures enable row level security;

drop policy if exists experiment_exposures_demo_all on content.experiment_exposures;
create policy experiment_exposures_demo_all on content.experiment_exposures
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on table content.experiments to anon, authenticated, service_role;
grant all on table content.experiment_variants to anon, authenticated, service_role;
grant all on table content.experiment_exposures to anon, authenticated, service_role;

-- @down
revoke all on table content.experiment_exposures from anon, authenticated, service_role;
revoke all on table content.experiment_variants from anon, authenticated, service_role;
revoke all on table content.experiments from anon, authenticated, service_role;
drop table if exists content.experiment_exposures cascade;
drop table if exists content.experiment_variants cascade;
drop table if exists content.experiments cascade;
