-- Phase 6: topic stages + entry embeddings
--
-- Owns content.topic_stages (profile_id FK nullable, topic_label text, stage
-- text, score, updated_at; unique (profile_id, topic_label)) and
-- content.entry_embeddings (entry_id FK unique, embedding jsonb array, model,
-- updated_at).
--
-- NOTE on embeddings: vectors are stored as a plain jsonb number array and
-- cosine similarity is computed in JS (see lib/supabase/recommend.js).
-- Upgrading the column to pgvector `vector(1536)` is a deliberate later
-- migration once the extension is guaranteed in every environment — this
-- file intentionally avoids `create extension vector` so it always applies.
-- topic_id from the Phase 6 plan maps to `term_id` (content.terms does not
-- exist yet — Phase 3 taxonomies are unbuilt); topic_label is the stable
-- key until then.
-- Self-contained: creates the schema, the shared updated_at trigger
-- function, the tables, their indexes, grants and RLS.

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

-- User -> topic -> stage -> recommended content: where a profile sits on each
-- topic (e.g. unaware/curious/engaged/advocate) plus a score.
create table if not exists content.topic_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  profile_id text,
  term_id uuid,
  topic_label text not null default '',
  stage text not null default 'unaware',
  score numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.topic_stages add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.topic_stages add column if not exists profile_id text;
alter table content.topic_stages add column if not exists term_id uuid;
alter table content.topic_stages add column if not exists topic_label text not null default '';
alter table content.topic_stages add column if not exists stage text not null default 'unaware';
alter table content.topic_stages add column if not exists score numeric not null default 0;
alter table content.topic_stages add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.topic_stages add column if not exists created_by uuid;
alter table content.topic_stages add column if not exists created_at timestamptz not null default now();
alter table content.topic_stages add column if not exists updated_at timestamptz not null default now();
alter table content.topic_stages add column if not exists deleted_at timestamptz;

create unique index if not exists topic_stages_profile_topic_uniq
  on content.topic_stages (project_id, profile_id, topic_label)
  where deleted_at is null and profile_id is not null and topic_label <> '';
create index if not exists topic_stages_profile_idx
  on content.topic_stages (profile_id) where deleted_at is null;
create index if not exists topic_stages_topic_idx
  on content.topic_stages (topic_label) where deleted_at is null;
create index if not exists topic_stages_stage_idx
  on content.topic_stages (stage) where deleted_at is null;

drop trigger if exists topic_stages_touch_updated_at on content.topic_stages;
create trigger topic_stages_touch_updated_at
before update on content.topic_stages
for each row execute function content.touch_updated_at();

alter table content.topic_stages enable row level security;

drop policy if exists topic_stages_demo_all on content.topic_stages;
create policy topic_stages_demo_all on content.topic_stages
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Entry embeddings stored as a jsonb number array (see header note for why
-- this is jsonb instead of pgvector). One row per entry.
create table if not exists content.entry_embeddings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  entry_id uuid references content.entries(id) on delete cascade,
  embedding jsonb not null default '[]'::jsonb,
  model text not null default 'unassigned',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.entry_embeddings add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.entry_embeddings add column if not exists entry_id uuid references content.entries(id) on delete cascade;
alter table content.entry_embeddings add column if not exists embedding jsonb not null default '[]'::jsonb;
alter table content.entry_embeddings add column if not exists model text not null default 'unassigned';
alter table content.entry_embeddings add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.entry_embeddings add column if not exists created_by uuid;
alter table content.entry_embeddings add column if not exists created_at timestamptz not null default now();
alter table content.entry_embeddings add column if not exists updated_at timestamptz not null default now();
alter table content.entry_embeddings add column if not exists deleted_at timestamptz;

create unique index if not exists entry_embeddings_entry_uniq
  on content.entry_embeddings (entry_id) where deleted_at is null;
create index if not exists entry_embeddings_project_idx
  on content.entry_embeddings (project_id) where deleted_at is null;

drop trigger if exists entry_embeddings_touch_updated_at on content.entry_embeddings;
create trigger entry_embeddings_touch_updated_at
before update on content.entry_embeddings
for each row execute function content.touch_updated_at();

alter table content.entry_embeddings enable row level security;

drop policy if exists entry_embeddings_demo_all on content.entry_embeddings;
create policy entry_embeddings_demo_all on content.entry_embeddings
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on table content.topic_stages to anon, authenticated, service_role;
grant all on table content.entry_embeddings to anon, authenticated, service_role;

-- @down
revoke all on table content.entry_embeddings from anon, authenticated, service_role;
revoke all on table content.topic_stages from anon, authenticated, service_role;
drop table if exists content.entry_embeddings cascade;
drop table if exists content.topic_stages cascade;
