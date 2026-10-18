-- Curation fleet workers
--
-- Lets many machines crawl the entertainment dataset at once: tasks carry a lease owner, and the
-- least-privilege feed_worker login (used by the bundled worker) can read/write the curation tables.

-- @up
alter table content.feed_dataset_tasks add column if not exists leased_by text;

grant select, update (status, worker_pid, heartbeat_at, updated_at) on content.feed_datasets to feed_worker;
grant select, update on content.feed_dataset_groups, content.feed_dataset_tasks to feed_worker;
grant select, insert, update on content.feed_dataset_candidates to feed_worker;
grant select, insert, delete on content.feed_dataset_items to feed_worker;
grant select on content.feed_image_embeddings to feed_worker;

drop policy if exists feed_datasets_worker on content.feed_datasets;
create policy feed_datasets_worker on content.feed_datasets for all to feed_worker using (true) with check (true);
drop policy if exists feed_dataset_groups_worker on content.feed_dataset_groups;
create policy feed_dataset_groups_worker on content.feed_dataset_groups for all to feed_worker using (true) with check (true);
drop policy if exists feed_dataset_tasks_worker on content.feed_dataset_tasks;
create policy feed_dataset_tasks_worker on content.feed_dataset_tasks for all to feed_worker using (true) with check (true);
drop policy if exists feed_dataset_candidates_worker on content.feed_dataset_candidates;
create policy feed_dataset_candidates_worker on content.feed_dataset_candidates for all to feed_worker using (true) with check (true);
drop policy if exists feed_dataset_items_worker on content.feed_dataset_items;
create policy feed_dataset_items_worker on content.feed_dataset_items for all to feed_worker using (true) with check (true);
drop policy if exists feed_image_embeddings_worker on content.feed_image_embeddings;
create policy feed_image_embeddings_worker on content.feed_image_embeddings for select to feed_worker using (true);

-- @down
drop policy if exists feed_image_embeddings_worker on content.feed_image_embeddings;
drop policy if exists feed_dataset_items_worker on content.feed_dataset_items;
drop policy if exists feed_dataset_candidates_worker on content.feed_dataset_candidates;
drop policy if exists feed_dataset_tasks_worker on content.feed_dataset_tasks;
drop policy if exists feed_dataset_groups_worker on content.feed_dataset_groups;
drop policy if exists feed_datasets_worker on content.feed_datasets;
revoke all on content.feed_datasets, content.feed_dataset_groups, content.feed_dataset_tasks, content.feed_dataset_candidates,
  content.feed_dataset_items, content.feed_image_embeddings from feed_worker;
alter table content.feed_dataset_tasks drop column if exists leased_by;
