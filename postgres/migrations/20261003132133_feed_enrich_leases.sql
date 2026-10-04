-- Feed enrich leases
--
-- Owns content.feed_enrich_leases: short claims on crawled images per enrich task ("embed:<model>",
-- "caption:<model>") so any number of notebooks (Kaggle, Colab, a local GPU) pull disjoint work from
-- one shared pool. A crashed worker's claims expire and are picked up again.

-- @up
create schema if not exists content;

create or replace function content.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists content.feed_enrich_leases (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references content.feed_crawl_images(id) on delete cascade,
  task text not null,
  worker text,
  lease_until timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (image_id, task)
);
create index if not exists feed_enrich_leases_task_idx on content.feed_enrich_leases (task, lease_until);
drop trigger if exists feed_enrich_leases_touch_updated_at on content.feed_enrich_leases;
create trigger feed_enrich_leases_touch_updated_at before update on content.feed_enrich_leases
for each row execute function content.touch_updated_at();

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'feed_embedder') then
    create role feed_embedder nologin;
  end if;
end $$;
revoke all on content.feed_enrich_leases from public;
grant usage on schema content to feed_embedder;
grant select, insert, update on content.feed_enrich_leases to feed_embedder;

alter table content.feed_enrich_leases enable row level security;
drop policy if exists feed_enrich_leases_embedder on content.feed_enrich_leases;
create policy feed_enrich_leases_embedder on content.feed_enrich_leases for all to feed_embedder
  using (true) with check (true);

-- @down
drop table if exists content.feed_enrich_leases cascade;
