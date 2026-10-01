-- @up
create extension if not exists vector with schema public;
create schema if not exists content;
create table if not exists content.vectors (
  id uuid primary key default gen_random_uuid(), project_id uuid not null,
  source_kind text not null check (source_kind in ('entry', 'asset')), source_id uuid not null,
  revision text not null, chunk_index integer not null default 0,
  embedding public.vector(768) not null, model text not null default 'gemini-embedding-2',
  preprocessing text not null default 'retrieval-v1', active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (project_id, source_kind, source_id, revision, chunk_index), check (public.vector_norm(embedding) > 0)
);
create index if not exists vectors_source_idx on content.vectors (project_id, source_kind, source_id) where deleted_at is null;
create index if not exists vectors_hnsw_idx on content.vectors using hnsw (embedding public.vector_cosine_ops) with (m = 16, ef_construction = 64) where active and deleted_at is null;
create table if not exists content.profile_vectors (
  id uuid primary key default gen_random_uuid(), project_id uuid not null, profile_id uuid not null,
  purpose text not null default 'interest', topic_label text not null default '',
  embedding public.vector(768) not null, revision text not null,
  model text not null default 'gemini-embedding-2', preprocessing text not null default 'retrieval-v1',
  metadata jsonb not null default '{}'::jsonb, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (project_id, profile_id, purpose, topic_label), check (public.vector_norm(embedding) > 0)
);
create table if not exists content.knowledge_vectors (
  id uuid primary key default gen_random_uuid(), project_id uuid not null, profile_id uuid not null,
  owner_id uuid not null, source_id uuid not null, revision text not null,
  embedding public.vector(768) not null, model text not null default 'gemini-embedding-2',
  preprocessing text not null default 'retrieval-v1', metadata jsonb not null default '{}'::jsonb, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (project_id, owner_id, source_id), check (public.vector_norm(embedding) > 0)
);
create index if not exists knowledge_vectors_owner_idx on content.knowledge_vectors (project_id, owner_id) where deleted_at is null;
create table if not exists content.embedding_jobs (
  id uuid primary key default gen_random_uuid(), project_id uuid not null,
  source_kind text not null check (source_kind in ('entry', 'asset', 'profile', 'knowledge')), source_id uuid not null,
  revision text not null, status text not null default 'queued' check (status in ('queued','processing','retry','completed','failed')),
  attempts integer not null default 0, lease_token uuid, lease_until timestamptz,
  available_at timestamptz not null default now(), error_code text, error_message text,
  metadata jsonb not null default '{}'::jsonb, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (project_id, source_kind, source_id, revision)
);
create index if not exists embedding_jobs_ready_idx on content.embedding_jobs (available_at, created_at) where deleted_at is null and status in ('queued','retry','processing');
create table if not exists content.vector_settings (
  id uuid primary key default gen_random_uuid(), project_id uuid not null unique,
  config jsonb not null default '{}'::jsonb, sync_cursor jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists content.embedding_usage (
  scope text not null, period text not null check (period in ('day','minute')), bucket text not null,
  requests integer not null default 0, primary key (scope, period, bucket)
);
create table if not exists content.provider_state (
  model text primary key, blocked_until timestamptz, error_code text, updated_at timestamptz not null default now()
);
create table if not exists content.query_vectors (
  project_id uuid not null, owner_id uuid not null, cache_key text not null,
  embedding public.vector(768) not null, expires_at timestamptz not null,
  primary key (project_id, owner_id, cache_key)
);
alter table content.vectors enable row level security;
alter table content.profile_vectors enable row level security;
alter table content.knowledge_vectors enable row level security;
alter table content.embedding_jobs enable row level security;
alter table content.vector_settings enable row level security;
alter table content.embedding_usage enable row level security;
alter table content.provider_state enable row level security;
alter table content.query_vectors enable row level security;
revoke all on content.vectors, content.profile_vectors, content.knowledge_vectors, content.embedding_jobs, content.vector_settings, content.embedding_usage, content.provider_state, content.query_vectors from public;
-- @down
drop table if exists content.query_vectors;
drop table if exists content.provider_state;
drop table if exists content.embedding_usage;
drop table if exists content.vector_settings;
drop table if exists content.embedding_jobs;
drop table if exists content.knowledge_vectors;
drop table if exists content.profile_vectors;
drop table if exists content.vectors;

