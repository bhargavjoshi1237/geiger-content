-- Feed crawl head sweeps
--
-- Adds the recurring 'head' task kind to content.feed_crawl_tasks (newest-first sweeps down to a per-subreddit
-- watermark, so the corpus keeps up with new posts) and owns content.feed_crawl_ingest_fresh(): like
-- feed_crawl_ingest, but a full horizontal takes a newer post by soft-deleting its oldest image.

-- @up
alter table content.feed_crawl_tasks add column if not exists watermark timestamptz;
alter table content.feed_crawl_tasks add column if not exists sweep_top timestamptz;
alter table content.feed_crawl_tasks drop constraint if exists feed_crawl_tasks_kind_check;
alter table content.feed_crawl_tasks add constraint feed_crawl_tasks_kind_check check (kind in ('scan', 'search', 'head'));

-- Oldest live image per horizontal, for replacement.
create index if not exists feed_crawl_images_path_posted_idx on content.feed_crawl_images (path, posted_at) where deleted_at is null;

-- Stores records up to p_per per path; on a full path a record newer than the path's oldest live image replaces it,
-- if that image is at least p_replace_after_days old. Returns each stored path and the image it replaced (or null).
create or replace function content.feed_crawl_ingest_fresh(p_records jsonb, p_per integer, p_worker text, p_replace_after_days integer)
returns table (stored_path text, replaced_id uuid) language plpgsql as $$
declare
  r jsonb;
  have integer;
  posted timestamptz;
  victim_id uuid;
  victim_posted timestamptz;
begin
  -- Path order keeps concurrent callers locking count rows in the same order (no deadlocks).
  for r in select value from jsonb_array_elements(p_records) order by value->>'path' loop
    posted := (r->>'createdAt')::timestamptz;
    insert into content.feed_crawl_counts (path) values (r->>'path') on conflict (path) do nothing;
    select c.n into have from content.feed_crawl_counts c where c.path = r->>'path' for update;
    if have < p_per then
      insert into content.feed_crawl_images (post_id, image_url, path, topic_id, depth, posted_at, record, worker)
      values (r->>'id', r->'image'->>'url', r->>'path', r->>'topicId', (r->>'depth')::integer, posted, r, p_worker)
      on conflict do nothing;
      if found then
        update content.feed_crawl_counts c set n = c.n + 1, updated_at = now() where c.path = r->>'path';
        stored_path := r->>'path';
        replaced_id := null;
        return next;
      end if;
      continue;
    end if;
    victim_id := null;
    select i.id, i.posted_at into victim_id, victim_posted from content.feed_crawl_images i
    where i.path = r->>'path' and i.deleted_at is null
    order by i.posted_at asc nulls first, i.id limit 1 for update;
    continue when victim_id is null
      or coalesce(victim_posted >= posted, false)
      or coalesce(victim_posted > now() - make_interval(days => p_replace_after_days), false);
    insert into content.feed_crawl_images (post_id, image_url, path, topic_id, depth, posted_at, record, worker)
    values (r->>'id', r->'image'->>'url', r->>'path', r->>'topicId', (r->>'depth')::integer, posted, r, p_worker)
    on conflict do nothing;
    if found then
      update content.feed_crawl_images i
      set deleted_at = now(), updated_at = now(), metadata = i.metadata || jsonb_build_object('replacedBy', r->>'id', 'replacedReason', 'head-sweep')
      where i.id = victim_id;
      stored_path := r->>'path';
      replaced_id := victim_id;
      return next;
    end if;
  end loop;
end $$;

grant execute on function content.feed_crawl_ingest_fresh(jsonb, integer, text, integer) to feed_worker;

-- @down
drop function if exists content.feed_crawl_ingest_fresh(jsonb, integer, text, integer);
drop index if exists content.feed_crawl_images_path_posted_idx;
delete from content.feed_crawl_tasks where kind = 'head';
alter table content.feed_crawl_tasks drop constraint if exists feed_crawl_tasks_kind_check;
alter table content.feed_crawl_tasks add constraint feed_crawl_tasks_kind_check check (kind in ('scan', 'search'));
alter table content.feed_crawl_tasks drop column if exists sweep_top;
alter table content.feed_crawl_tasks drop column if exists watermark;
