-- Phase 6: variants + ranking rules + frequency caps
--
-- Owns content.variants (slot_id FK, entry_id FK, rules jsonb, priority,
-- weight, status), content.ranking_rules (rule_type boost|exclude, entry_id
-- FK, weight) and content.frequency_caps (per-slot impression caps).
-- Self-contained: creates the schema, the shared updated_at trigger function,
-- the tables, their indexes, grants and RLS.

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

-- Slot variants: candidate entries a slot may resolve to, each with targeting
-- rules (segment/locale/device equals), a priority and a weight.
create table if not exists content.variants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  slot_id uuid references content.slots(id) on delete cascade,
  entry_id uuid references content.entries(id) on delete set null,
  rules jsonb not null default '{}'::jsonb,
  priority int not null default 0,
  weight numeric not null default 1,
  status text not null default 'Active',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.variants add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.variants add column if not exists slot_id uuid references content.slots(id) on delete cascade;
alter table content.variants add column if not exists entry_id uuid references content.entries(id) on delete set null;
alter table content.variants add column if not exists rules jsonb not null default '{}'::jsonb;
alter table content.variants add column if not exists priority int not null default 0;
alter table content.variants add column if not exists weight numeric not null default 1;
alter table content.variants add column if not exists status text not null default 'Active';
alter table content.variants add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.variants add column if not exists created_by uuid;
alter table content.variants add column if not exists created_at timestamptz not null default now();
alter table content.variants add column if not exists updated_at timestamptz not null default now();
alter table content.variants add column if not exists deleted_at timestamptz;

create index if not exists variants_slot_idx
  on content.variants (slot_id) where deleted_at is null;
create index if not exists variants_entry_idx
  on content.variants (entry_id) where deleted_at is null;
create index if not exists variants_project_idx
  on content.variants (project_id) where deleted_at is null;
create index if not exists variants_status_idx
  on content.variants (status) where deleted_at is null;

drop trigger if exists variants_touch_updated_at on content.variants;
create trigger variants_touch_updated_at
before update on content.variants
for each row execute function content.touch_updated_at();

alter table content.variants enable row level security;

drop policy if exists variants_demo_all on content.variants;
create policy variants_demo_all on content.variants
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Editorial ranking rules: boost or exclude an entry in recommendation
-- ranking, with a weight multiplier (boost) or reason (exclude).
create table if not exists content.ranking_rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  rule_type text not null default 'boost',
  entry_id uuid references content.entries(id) on delete cascade,
  weight numeric not null default 1,
  reason text not null default '',
  status text not null default 'Active',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.ranking_rules add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.ranking_rules add column if not exists rule_type text not null default 'boost';
alter table content.ranking_rules add column if not exists entry_id uuid references content.entries(id) on delete cascade;
alter table content.ranking_rules add column if not exists weight numeric not null default 1;
alter table content.ranking_rules add column if not exists reason text not null default '';
alter table content.ranking_rules add column if not exists status text not null default 'Active';
alter table content.ranking_rules add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.ranking_rules add column if not exists created_by uuid;
alter table content.ranking_rules add column if not exists created_at timestamptz not null default now();
alter table content.ranking_rules add column if not exists updated_at timestamptz not null default now();
alter table content.ranking_rules add column if not exists deleted_at timestamptz;

create index if not exists ranking_rules_project_idx
  on content.ranking_rules (project_id) where deleted_at is null;
create index if not exists ranking_rules_entry_idx
  on content.ranking_rules (entry_id) where deleted_at is null;
create index if not exists ranking_rules_type_idx
  on content.ranking_rules (rule_type) where deleted_at is null;

drop trigger if exists ranking_rules_touch_updated_at on content.ranking_rules;
create trigger ranking_rules_touch_updated_at
before update on content.ranking_rules
for each row execute function content.touch_updated_at();

alter table content.ranking_rules enable row level security;

drop policy if exists ranking_rules_demo_all on content.ranking_rules;
create policy ranking_rules_demo_all on content.ranking_rules
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Frequency caps: max impressions of a slot per profile per window.
create table if not exists content.frequency_caps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  slot_id uuid references content.slots(id) on delete cascade,
  max_impressions int not null default 3,
  window_hours int not null default 24,
  status text not null default 'Active',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.frequency_caps add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.frequency_caps add column if not exists slot_id uuid references content.slots(id) on delete cascade;
alter table content.frequency_caps add column if not exists max_impressions int not null default 3;
alter table content.frequency_caps add column if not exists window_hours int not null default 24;
alter table content.frequency_caps add column if not exists status text not null default 'Active';
alter table content.frequency_caps add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.frequency_caps add column if not exists created_by uuid;
alter table content.frequency_caps add column if not exists created_at timestamptz not null default now();
alter table content.frequency_caps add column if not exists updated_at timestamptz not null default now();
alter table content.frequency_caps add column if not exists deleted_at timestamptz;

create index if not exists frequency_caps_slot_idx
  on content.frequency_caps (slot_id) where deleted_at is null;
create index if not exists frequency_caps_project_idx
  on content.frequency_caps (project_id) where deleted_at is null;

drop trigger if exists frequency_caps_touch_updated_at on content.frequency_caps;
create trigger frequency_caps_touch_updated_at
before update on content.frequency_caps
for each row execute function content.touch_updated_at();

alter table content.frequency_caps enable row level security;

drop policy if exists frequency_caps_demo_all on content.frequency_caps;
create policy frequency_caps_demo_all on content.frequency_caps
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on table content.variants to anon, authenticated, service_role;
grant all on table content.ranking_rules to anon, authenticated, service_role;
grant all on table content.frequency_caps to anon, authenticated, service_role;

-- @down
revoke all on table content.frequency_caps from anon, authenticated, service_role;
revoke all on table content.ranking_rules from anon, authenticated, service_role;
revoke all on table content.variants from anon, authenticated, service_role;
drop table if exists content.frequency_caps cascade;
drop table if exists content.ranking_rules cascade;
drop table if exists content.variants cascade;
