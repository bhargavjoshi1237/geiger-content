-- Feed embeddings
--
-- Owns content.feed_image_embeddings, content.feed_profiles, content.feed_events and the feed_embedder
-- role: crawled feed images embedded once (Kaggle, open model), per-reader feed state + taste vector,
-- and the raw behaviour log the live test feed learns from.

-- @up
create extension if not exists vector with schema public;
create schema if not exists content;

create or replace function content.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- One row per image and model: the embedding, or why the image could not be embedded.
create table if not exists content.feed_image_embeddings (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references content.feed_crawl_images(id) on delete cascade,
  model text not null,
  status text not null check (status in ('done', 'failed')),
  embedding public.vector(768),
  error text,
  attempts integer not null default 1,
  worker text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (image_id, model),
  check ((status = 'done') = (embedding is not null))
);
create index if not exists feed_image_embeddings_hnsw_idx on content.feed_image_embeddings
  using hnsw (embedding public.vector_cosine_ops) with (m = 16, ef_construction = 64)
  where status = 'done' and deleted_at is null;
drop trigger if exists feed_image_embeddings_touch_updated_at on content.feed_image_embeddings;
create trigger feed_image_embeddings_touch_updated_at before update on content.feed_image_embeddings
for each row execute function content.touch_updated_at();

-- A test reader's feed: engine state (interest tree, frontier, history, taste sums) and the blended taste vector.
create table if not exists content.feed_profiles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  owner_id uuid not null,
  name text not null default 'default',
  state jsonb not null default '{}'::jsonb,
  taste public.vector(768),
  events integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (project_id, owner_id, name)
);
drop trigger if exists feed_profiles_touch_updated_at on content.feed_profiles;
create trigger feed_profiles_touch_updated_at before update on content.feed_profiles
for each row execute function content.touch_updated_at();

-- Every impression outcome (like, save, dwell, skip, hide…) so profiles can be replayed after engine changes.
create table if not exists content.feed_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references content.feed_profiles(id) on delete cascade,
  post_id text not null,
  type text not null,
  dwell_ms integer,
  slot text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists feed_events_profile_idx on content.feed_events (profile_id, created_at);

-- Least-privilege login for the Kaggle embedding notebook (password is set by `npm run feed:embed -- build`).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'feed_embedder') then
    create role feed_embedder nologin;
  end if;
end $$;
grant usage on schema content to feed_embedder;
revoke all on content.feed_image_embeddings, content.feed_profiles, content.feed_events from public;
grant select on content.feed_crawl_images to feed_embedder;
grant select, insert, update on content.feed_image_embeddings to feed_embedder;

alter table content.feed_image_embeddings enable row level security;
alter table content.feed_profiles enable row level security;
alter table content.feed_events enable row level security;
drop policy if exists feed_crawl_images_embedder on content.feed_crawl_images;
create policy feed_crawl_images_embedder on content.feed_crawl_images for select to feed_embedder using (true);
drop policy if exists feed_image_embeddings_embedder on content.feed_image_embeddings;
create policy feed_image_embeddings_embedder on content.feed_image_embeddings for all to feed_embedder
  using (true) with check (true);

-- @down
drop policy if exists feed_crawl_images_embedder on content.feed_crawl_images;
drop table if exists content.feed_events cascade;
drop table if exists content.feed_profiles cascade;
drop table if exists content.feed_image_embeddings cascade;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'feed_embedder') then
    revoke select on content.feed_crawl_images from feed_embedder;
    revoke usage on schema content from feed_embedder;
    drop role feed_embedder;
  end if;
end $$;
