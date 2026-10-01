-- Taxonomies, terms and entry-term links
--
-- Owns content.taxonomies + content.terms + content.entry_terms. Hierarchical
-- or flat vocabularies (topics, tags…) attached to entries. Prerequisite for
-- Phase 6 topic stages. Self-contained + idempotent.

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

create table if not exists content.taxonomies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  key text not null default '',
  name text not null default 'Untitled taxonomy',
  hierarchical boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.taxonomies add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.taxonomies add column if not exists key text not null default '';
alter table content.taxonomies add column if not exists name text not null default 'Untitled taxonomy';
alter table content.taxonomies add column if not exists hierarchical boolean not null default false;
alter table content.taxonomies add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.taxonomies add column if not exists created_by uuid;
alter table content.taxonomies add column if not exists created_at timestamptz not null default now();
alter table content.taxonomies add column if not exists updated_at timestamptz not null default now();
alter table content.taxonomies add column if not exists deleted_at timestamptz;

create table if not exists content.terms (
  id uuid primary key default gen_random_uuid(),
  taxonomy_id uuid references content.taxonomies(id) on delete cascade,
  slug text not null default '',
  label text not null default '',
  parent_id uuid references content.terms(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.terms add column if not exists taxonomy_id uuid references content.taxonomies(id) on delete cascade;
alter table content.terms add column if not exists slug text not null default '';
alter table content.terms add column if not exists label text not null default '';
alter table content.terms add column if not exists parent_id uuid references content.terms(id) on delete set null;
alter table content.terms add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.terms add column if not exists created_by uuid;
alter table content.terms add column if not exists created_at timestamptz not null default now();
alter table content.terms add column if not exists updated_at timestamptz not null default now();
alter table content.terms add column if not exists deleted_at timestamptz;

create table if not exists content.entry_terms (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references content.entries(id) on delete cascade,
  term_id uuid references content.terms(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.entry_terms add column if not exists entry_id uuid references content.entries(id) on delete cascade;
alter table content.entry_terms add column if not exists term_id uuid references content.terms(id) on delete cascade;
alter table content.entry_terms add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.entry_terms add column if not exists created_by uuid;
alter table content.entry_terms add column if not exists created_at timestamptz not null default now();
alter table content.entry_terms add column if not exists updated_at timestamptz not null default now();
alter table content.entry_terms add column if not exists deleted_at timestamptz;

create unique index if not exists taxonomies_project_key_uniq
  on content.taxonomies (project_id, key) where deleted_at is null and key <> '';
create index if not exists taxonomies_project_idx
  on content.taxonomies (project_id) where deleted_at is null;
create index if not exists terms_taxonomy_idx
  on content.terms (taxonomy_id) where deleted_at is null;
create unique index if not exists terms_taxonomy_slug_uniq
  on content.terms (taxonomy_id, slug) where deleted_at is null and slug <> '';
create index if not exists terms_parent_idx
  on content.terms (parent_id) where deleted_at is null;
create index if not exists entry_terms_entry_idx
  on content.entry_terms (entry_id) where deleted_at is null;
create index if not exists entry_terms_term_idx
  on content.entry_terms (term_id) where deleted_at is null;
create unique index if not exists entry_terms_pair_uniq
  on content.entry_terms (entry_id, term_id) where deleted_at is null;

drop trigger if exists taxonomies_touch_updated_at on content.taxonomies;
create trigger taxonomies_touch_updated_at
before update on content.taxonomies
for each row execute function content.touch_updated_at();

drop trigger if exists terms_touch_updated_at on content.terms;
create trigger terms_touch_updated_at
before update on content.terms
for each row execute function content.touch_updated_at();

drop trigger if exists entry_terms_touch_updated_at on content.entry_terms;
create trigger entry_terms_touch_updated_at
before update on content.entry_terms
for each row execute function content.touch_updated_at();

alter table content.taxonomies enable row level security;
drop policy if exists taxonomies_demo_all on content.taxonomies;
create policy taxonomies_demo_all on content.taxonomies
  for all to anon, authenticated using (true) with check (true);

alter table content.terms enable row level security;
drop policy if exists terms_demo_all on content.terms;
create policy terms_demo_all on content.terms
  for all to anon, authenticated using (true) with check (true);

alter table content.entry_terms enable row level security;
drop policy if exists entry_terms_demo_all on content.entry_terms;
create policy entry_terms_demo_all on content.entry_terms
  for all to anon, authenticated using (true) with check (true);

-- @down
drop policy if exists entry_terms_demo_all on content.entry_terms;
drop policy if exists terms_demo_all on content.terms;
drop policy if exists taxonomies_demo_all on content.taxonomies;
drop trigger if exists entry_terms_touch_updated_at on content.entry_terms;
drop trigger if exists terms_touch_updated_at on content.terms;
drop trigger if exists taxonomies_touch_updated_at on content.taxonomies;
drop index if exists content.entry_terms_pair_uniq;
drop index if exists content.entry_terms_term_idx;
drop index if exists content.entry_terms_entry_idx;
drop index if exists content.terms_parent_idx;
drop index if exists content.terms_taxonomy_slug_uniq;
drop index if exists content.terms_taxonomy_idx;
drop index if exists content.taxonomies_project_idx;
drop index if exists content.taxonomies_project_key_uniq;
drop table if exists content.entry_terms cascade;
drop table if exists content.terms cascade;
drop table if exists content.taxonomies cascade;
