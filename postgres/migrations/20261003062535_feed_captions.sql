-- Feed captions
--
-- Owns content.feed_image_captions: a description, tags and structured details per crawled feed image,
-- written by a small vision LLM (Qwen3-VL / Qwen3.5) in the Kaggle enrich notebook via the feed_embedder login.

-- @up
create schema if not exists content;

create or replace function content.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- One row per image and captioning model: the description, or why the image could not be captioned.
create table if not exists content.feed_image_captions (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references content.feed_crawl_images(id) on delete cascade,
  model text not null,
  status text not null check (status in ('done', 'failed')),
  description text,
  tags text[] not null default '{}',
  data jsonb not null default '{}'::jsonb,
  error text,
  attempts integer not null default 1,
  worker text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (image_id, model),
  check (status <> 'done' or description is not null)
);
drop trigger if exists feed_image_captions_touch_updated_at on content.feed_image_captions;
create trigger feed_image_captions_touch_updated_at before update on content.feed_image_captions
for each row execute function content.touch_updated_at();

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'feed_embedder') then
    create role feed_embedder nologin;
  end if;
end $$;
revoke all on content.feed_image_captions from public;
grant usage on schema content to feed_embedder;
grant select, insert, update on content.feed_image_captions to feed_embedder;

alter table content.feed_image_captions enable row level security;
drop policy if exists feed_image_captions_embedder on content.feed_image_captions;
create policy feed_image_captions_embedder on content.feed_image_captions for all to feed_embedder
  using (true) with check (true);

-- @down
drop table if exists content.feed_image_captions cascade;
