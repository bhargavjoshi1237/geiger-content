-- Feed crawl fleet
--
-- Owns content.feed_crawl_tasks / _images / _counts / _workers, content.feed_crawl_ingest() and the
-- feed_worker role: a shared queue so many crawler machines split the Reddit corpus crawl without overlap.

-- @up
create schema if not exists content;

-- One row per resumable walk (a subreddit scan or a keyword search); workers lease them.
create table if not exists content.feed_crawl_tasks (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  kind text not null check (kind in ('scan', 'search')),
  subreddit text not null,
  params jsonb not null default '{}'::jsonb,
  topic_id text not null,
  step_path text,
  horizontal_path text,
  priority integer not null default 0,
  round integer not null default 0,
  status text not null default 'queued' check (status in ('queued', 'leased', 'done', 'blocked', 'failed')),
  cursor_before timestamptz,
  pages integer not null default 0,
  images integer not null default 0,
  added integer not null default 0,
  last_added integer not null default 0,
  attempts integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  worker text,
  available_at timestamptz not null default now(),
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists feed_crawl_tasks_ready_idx on content.feed_crawl_tasks (round, kind, last_added desc, priority)
  where status in ('queued', 'leased') and deleted_at is null;
create index if not exists feed_crawl_tasks_subreddit_idx on content.feed_crawl_tasks (subreddit, kind);

-- Collected images: one per post and per image url, so two workers can never store the same one.
create table if not exists content.feed_crawl_images (
  id uuid primary key default gen_random_uuid(),
  post_id text not null unique,
  image_url text not null unique,
  path text not null,
  topic_id text not null,
  depth integer,
  posted_at timestamptz,
  record jsonb not null,
  worker text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists feed_crawl_images_path_idx on content.feed_crawl_images (path);
create index if not exists feed_crawl_images_created_idx on content.feed_crawl_images (created_at);

-- Images per horizontal path; locked row-by-row on ingest so the per-horizontal cap holds across workers.
create table if not exists content.feed_crawl_counts (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  n integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Worker heartbeats for the fleet status view.
create table if not exists content.feed_crawl_workers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  host text,
  version text,
  status text not null default 'running',
  current_task text,
  started_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  requests integer not null default 0,
  waits integer not null default 0,
  waited_seconds integer not null default 0,
  added integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Stores records up to p_per per path, skipping posts/images already stored; returns the stored paths.
create or replace function content.feed_crawl_ingest(p_records jsonb, p_per integer, p_worker text)
returns setof text language plpgsql as $$
declare
  r jsonb;
  have integer;
begin
  -- Path order keeps concurrent callers locking count rows in the same order (no deadlocks).
  for r in select value from jsonb_array_elements(p_records) order by value->>'path' loop
    insert into content.feed_crawl_counts (path) values (r->>'path') on conflict (path) do nothing;
    select n into have from content.feed_crawl_counts where path = r->>'path' for update;
    continue when have >= p_per;
    insert into content.feed_crawl_images (post_id, image_url, path, topic_id, depth, posted_at, record, worker)
    values (r->>'id', r->'image'->>'url', r->>'path', r->>'topicId', (r->>'depth')::integer, (r->>'createdAt')::timestamptz, r, p_worker)
    on conflict do nothing;
    if found then
      update content.feed_crawl_counts set n = n + 1, updated_at = now() where path = r->>'path';
      return next r->>'path';
    end if;
  end loop;
end $$;

-- Least-privilege login for crawler machines (password is set outside migrations by feed-fleet build).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'feed_worker') then
    create role feed_worker nologin;
  end if;
end $$;
grant usage on schema content to feed_worker;
revoke all on content.feed_crawl_tasks, content.feed_crawl_images, content.feed_crawl_counts, content.feed_crawl_workers from public;
grant select, insert, update on content.feed_crawl_tasks, content.feed_crawl_images, content.feed_crawl_counts, content.feed_crawl_workers to feed_worker;
grant execute on function content.feed_crawl_ingest(jsonb, integer, text) to feed_worker;

alter table content.feed_crawl_tasks enable row level security;
alter table content.feed_crawl_images enable row level security;
alter table content.feed_crawl_counts enable row level security;
alter table content.feed_crawl_workers enable row level security;
drop policy if exists feed_crawl_tasks_worker on content.feed_crawl_tasks;
create policy feed_crawl_tasks_worker on content.feed_crawl_tasks for all to feed_worker using (true) with check (true);
drop policy if exists feed_crawl_images_worker on content.feed_crawl_images;
create policy feed_crawl_images_worker on content.feed_crawl_images for all to feed_worker using (true) with check (true);
drop policy if exists feed_crawl_counts_worker on content.feed_crawl_counts;
create policy feed_crawl_counts_worker on content.feed_crawl_counts for all to feed_worker using (true) with check (true);
drop policy if exists feed_crawl_workers_worker on content.feed_crawl_workers;
create policy feed_crawl_workers_worker on content.feed_crawl_workers for all to feed_worker using (true) with check (true);

-- @down
drop function if exists content.feed_crawl_ingest(jsonb, integer, text);
drop table if exists content.feed_crawl_workers cascade;
drop table if exists content.feed_crawl_counts cascade;
drop table if exists content.feed_crawl_images cascade;
drop table if exists content.feed_crawl_tasks cascade;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'feed_worker') then
    revoke usage on schema content from feed_worker;
    drop role feed_worker;
  end if;
end $$;
