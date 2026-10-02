-- Feed crawl pools
--
-- Adds content.feed_crawl_tasks.pool so topic sets crawl from separate queues ("main" = the 60 core
-- topics, "personal" = personal-interest topics). The feed_worker login only sees the main pool, so
-- workers bundled with an older topic tree never lease tasks for topics they don't know.

-- @up
alter table content.feed_crawl_tasks add column if not exists pool text not null default 'main';
create index if not exists feed_crawl_tasks_pool_ready_idx on content.feed_crawl_tasks (pool, round, kind, last_added desc, priority)
  where status in ('queued', 'leased') and deleted_at is null;

drop policy if exists feed_crawl_tasks_worker on content.feed_crawl_tasks;
create policy feed_crawl_tasks_worker on content.feed_crawl_tasks for all to feed_worker
  using (pool = 'main') with check (pool = 'main');

-- @down
drop policy if exists feed_crawl_tasks_worker on content.feed_crawl_tasks;
create policy feed_crawl_tasks_worker on content.feed_crawl_tasks for all to feed_worker using (true) with check (true);
drop index if exists content.feed_crawl_tasks_pool_ready_idx;
alter table content.feed_crawl_tasks drop column if exists pool;
