-- Content audiences analytics
--
-- Owns the Phase 5 tables: content.events, content.profiles,
-- content.profile_traits, content.segments, content.consent_state,
-- content.metrics_daily, content.data_connections. Event collection behind the
-- /api/content/v1/collect beacon, identity resolution, segment rules,
-- per-profile consent, nightly rollups for Intelligence, and data-connection
-- records. Self-contained: creates the schema, the shared updated_at trigger
-- function, the tables, their indexes, RLS and grants.

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

-- Raw behavior events. entry_id is nullable (site-wide events such as
-- "session_start" belong to no entry). `at` is the client-observed time;
-- created_at is when the row landed.
create table if not exists content.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  anonymous_id text,
  user_id text,
  entry_id uuid references content.entries(id) on delete set null,
  type text not null default 'page_view',
  context jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.events add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.events add column if not exists anonymous_id text;
alter table content.events add column if not exists user_id text;
alter table content.events add column if not exists entry_id uuid references content.entries(id) on delete set null;
alter table content.events add column if not exists type text not null default 'page_view';
alter table content.events add column if not exists context jsonb not null default '{}'::jsonb;
alter table content.events add column if not exists at timestamptz not null default now();
alter table content.events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.events add column if not exists created_by uuid;
alter table content.events add column if not exists created_at timestamptz not null default now();
alter table content.events add column if not exists updated_at timestamptz not null default now();
alter table content.events add column if not exists deleted_at timestamptz;

create index if not exists events_project_at_idx
  on content.events (project_id, at desc) where deleted_at is null;
create index if not exists events_entry_idx
  on content.events (entry_id) where deleted_at is null;
create index if not exists events_type_idx
  on content.events (type) where deleted_at is null;
create index if not exists events_anonymous_idx
  on content.events (anonymous_id) where deleted_at is null;

drop trigger if exists events_touch_updated_at on content.events;
create trigger events_touch_updated_at
before update on content.events
for each row execute function content.touch_updated_at();

alter table content.events enable row level security;

drop policy if exists events_demo_all on content.events;
create policy events_demo_all on content.events
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on table content.events to anon, authenticated, service_role;

-- Resolved audience profiles. primary_identifier is the canonical key
-- (user id, email hash…); identifiers keeps every alias ever seen so an
-- anonymous visitor can merge into a known profile on login.
create table if not exists content.profiles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  primary_identifier text not null default '',
  identifiers text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.profiles add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.profiles add column if not exists primary_identifier text not null default '';
alter table content.profiles add column if not exists identifiers text[] not null default '{}';
alter table content.profiles add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.profiles add column if not exists created_by uuid;
alter table content.profiles add column if not exists created_at timestamptz not null default now();
alter table content.profiles add column if not exists updated_at timestamptz not null default now();
alter table content.profiles add column if not exists deleted_at timestamptz;

create index if not exists profiles_project_idx
  on content.profiles (project_id) where deleted_at is null;
create index if not exists profiles_identifier_idx
  on content.profiles (primary_identifier) where deleted_at is null;

drop trigger if exists profiles_touch_updated_at on content.profiles;
create trigger profiles_touch_updated_at
before update on content.profiles
for each row execute function content.touch_updated_at();

alter table content.profiles enable row level security;

drop policy if exists profiles_demo_all on content.profiles;
create policy profiles_demo_all on content.profiles
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on table content.profiles to anon, authenticated, service_role;

-- Key/value traits per profile (plan, persona, lifecycle_stage…). One row per
-- (profile_id, key); value is jsonb so traits stay typed.
create table if not exists content.profile_traits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references content.profiles(id) on delete cascade,
  key text not null default '',
  value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table content.profile_traits add column if not exists profile_id uuid references content.profiles(id) on delete cascade;
alter table content.profile_traits add column if not exists key text not null default '';
alter table content.profile_traits add column if not exists value jsonb not null default 'null'::jsonb;
alter table content.profile_traits add column if not exists created_at timestamptz not null default now();
alter table content.profile_traits add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profile_traits_profile_key_uniq
  on content.profile_traits (profile_id, key);
create index if not exists profile_traits_profile_idx
  on content.profile_traits (profile_id);

drop trigger if exists profile_traits_touch_updated_at on content.profile_traits;
create trigger profile_traits_touch_updated_at
before update on content.profile_traits
for each row execute function content.touch_updated_at();

alter table content.profile_traits enable row level security;

drop policy if exists profile_traits_demo_all on content.profile_traits;
create policy profile_traits_demo_all on content.profile_traits
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on table content.profile_traits to anon, authenticated, service_role;

-- Named audience segments. rule is a stored AND/OR tree over traits and event
-- counts; the matcher lives in JS (lib/supabase/segments.js evaluateSegment),
-- so the DB only persists the tree.
create table if not exists content.segments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null default 'Untitled segment',
  rule jsonb not null default '{"op":"and","conditions":[]}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.segments add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.segments add column if not exists name text not null default 'Untitled segment';
alter table content.segments add column if not exists rule jsonb not null default '{"op":"and","conditions":[]}'::jsonb;
alter table content.segments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.segments add column if not exists created_by uuid;
alter table content.segments add column if not exists created_at timestamptz not null default now();
alter table content.segments add column if not exists updated_at timestamptz not null default now();
alter table content.segments add column if not exists deleted_at timestamptz;

create index if not exists segments_project_idx
  on content.segments (project_id) where deleted_at is null;

drop trigger if exists segments_touch_updated_at on content.segments;
create trigger segments_touch_updated_at
before update on content.segments
for each row execute function content.touch_updated_at();

alter table content.segments enable row level security;

drop policy if exists segments_demo_all on content.segments;
create policy segments_demo_all on content.segments
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on table content.segments to anon, authenticated, service_role;

-- Per-profile consent. One row per (profile_id, purpose); status is
-- granted | denied | pending. Every read path honours it via
-- lib/supabase/consent.js consentHonoured.
create table if not exists content.consent_state (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references content.profiles(id) on delete cascade,
  purpose text not null default 'analytics',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table content.consent_state add column if not exists profile_id uuid references content.profiles(id) on delete cascade;
alter table content.consent_state add column if not exists purpose text not null default 'analytics';
alter table content.consent_state add column if not exists status text not null default 'pending';
alter table content.consent_state add column if not exists created_at timestamptz not null default now();
alter table content.consent_state add column if not exists updated_at timestamptz not null default now();

create unique index if not exists consent_state_profile_purpose_uniq
  on content.consent_state (profile_id, purpose);
create index if not exists consent_state_profile_idx
  on content.consent_state (profile_id);

drop trigger if exists consent_state_touch_updated_at on content.consent_state;
create trigger consent_state_touch_updated_at
before update on content.consent_state
for each row execute function content.touch_updated_at();

alter table content.consent_state enable row level security;

drop policy if exists consent_state_demo_all on content.consent_state;
create policy consent_state_demo_all on content.consent_state
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on table content.consent_state to anon, authenticated, service_role;

-- Pre-computed daily rollups Intelligence reads instead of scanning events.
-- entry_id NULL = the site-wide rollup for that day. The unique index uses
-- coalesce so NULL entry_ids still collide correctly (plain unique
-- constraints treat NULLs as distinct).
create table if not exists content.metrics_daily (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  date date not null,
  entry_id uuid references content.entries(id) on delete set null,
  views integer not null default 0,
  conversions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table content.metrics_daily add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.metrics_daily add column if not exists date date;
alter table content.metrics_daily add column if not exists entry_id uuid references content.entries(id) on delete set null;
alter table content.metrics_daily add column if not exists views integer not null default 0;
alter table content.metrics_daily add column if not exists conversions integer not null default 0;
alter table content.metrics_daily add column if not exists created_at timestamptz not null default now();
alter table content.metrics_daily add column if not exists updated_at timestamptz not null default now();

create unique index if not exists metrics_daily_date_entry_project_uniq
  on content.metrics_daily (date, project_id, coalesce(entry_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists metrics_daily_project_date_idx
  on content.metrics_daily (project_id, date desc);
create index if not exists metrics_daily_entry_idx
  on content.metrics_daily (entry_id);

drop trigger if exists metrics_daily_touch_updated_at on content.metrics_daily;
create trigger metrics_daily_touch_updated_at
before update on content.metrics_daily
for each row execute function content.touch_updated_at();

alter table content.metrics_daily enable row level security;

drop policy if exists metrics_daily_demo_all on content.metrics_daily;
create policy metrics_daily_demo_all on content.metrics_daily
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on table content.metrics_daily to anon, authenticated, service_role;

-- External data connections feeding profiles/events (warehouse sync, CDP,
-- CSV import…). status is Active | Paused | Error.
create table if not exists content.data_connections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null default 'Untitled connection',
  type text not null default 'webhook',
  status text not null default 'Active',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.data_connections add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.data_connections add column if not exists name text not null default 'Untitled connection';
alter table content.data_connections add column if not exists type text not null default 'webhook';
alter table content.data_connections add column if not exists status text not null default 'Active';
alter table content.data_connections add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.data_connections add column if not exists created_by uuid;
alter table content.data_connections add column if not exists created_at timestamptz not null default now();
alter table content.data_connections add column if not exists updated_at timestamptz not null default now();
alter table content.data_connections add column if not exists deleted_at timestamptz;

create index if not exists data_connections_project_idx
  on content.data_connections (project_id) where deleted_at is null;
create index if not exists data_connections_status_idx
  on content.data_connections (status) where deleted_at is null;

drop trigger if exists data_connections_touch_updated_at on content.data_connections;
create trigger data_connections_touch_updated_at
before update on content.data_connections
for each row execute function content.touch_updated_at();

alter table content.data_connections enable row level security;

drop policy if exists data_connections_demo_all on content.data_connections;
create policy data_connections_demo_all on content.data_connections
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on table content.data_connections to anon, authenticated, service_role;

-- @down
drop table if exists content.data_connections cascade;
drop table if exists content.metrics_daily cascade;
drop table if exists content.consent_state cascade;
drop table if exists content.segments cascade;
drop table if exists content.profile_traits cascade;
drop table if exists content.profiles cascade;
drop table if exists content.events cascade;
