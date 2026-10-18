-- Versioned entertainment dataset; legacy images and embeddings remain intact.
-- @up
create table content.feed_datasets (
  id text primary key,
  taxonomy_version text not null,
  date_from timestamptz not null,
  date_until timestamptz not null,
  per_subject_month integer not null check (per_subject_month > 0),
  active boolean not null default false,
  status text not null default 'crawling' check (status in ('crawling','ready','needs_attention')),
  worker_pid integer,
  heartbeat_at timestamptz,
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_from >= '2026-08-01T00:00:00Z' and date_until <= '2026-11-01T00:00:00Z' and date_until > date_from)
);
create unique index feed_datasets_active_idx on content.feed_datasets (active) where active;
create table content.feed_taxonomy_nodes (
  dataset_id text not null references content.feed_datasets(id),
  path text not null, parent_path text, kind text not null check (kind in ('area','subject')),
  name text not null, data jsonb not null, primary key (dataset_id,path),
  foreign key (dataset_id,parent_path) references content.feed_taxonomy_nodes(dataset_id,path)
);
create table content.feed_dataset_groups (
  dataset_id text not null references content.feed_datasets(id), subject_path text not null,
  month text not null check (month in ('2026-08','2026-09','2026-10')),
  status text not null default 'pending' check (status in ('pending','done')),
  selected integer not null default 0, updated_at timestamptz not null default now(),
  primary key (dataset_id,subject_path,month),
  foreign key (dataset_id,subject_path) references content.feed_taxonomy_nodes(dataset_id,path)
);
create table content.feed_dataset_tasks (
  id bigint generated always as identity primary key,
  dataset_id text not null references content.feed_datasets(id), subject_path text not null, subreddit text not null,
  month text not null, window_start timestamptz not null, window_end timestamptz not null,
  cursor_before timestamptz, status text not null default 'queued' check (status in ('queued','done','failed')),
  pages integer not null default 0, candidates integer not null default 0, attempts integer not null default 0,
  available_at timestamptz not null default now(), error text, updated_at timestamptz not null default now(),
  unique(dataset_id,subject_path,subreddit,window_start,window_end),
  foreign key (dataset_id,subject_path,month) references content.feed_dataset_groups(dataset_id,subject_path,month),
  check (window_start >= '2026-08-01T00:00:00Z' and window_end <= '2026-11-01T00:00:00Z' and window_end > window_start)
);
create index feed_dataset_tasks_queue_idx on content.feed_dataset_tasks(dataset_id,available_at,pages,window_start desc) where status = 'queued';
create index feed_dataset_tasks_group_idx on content.feed_dataset_tasks(dataset_id,subject_path,month,status);
create table content.feed_dataset_candidates (
  dataset_id text not null, subject_path text not null, month text not null, post_id text not null,
  score integer not null, posted_at timestamptz not null, post jsonb not null, fetched_at timestamptz not null default now(),
  primary key(dataset_id,subject_path,post_id),
  foreign key(dataset_id,subject_path,month) references content.feed_dataset_groups(dataset_id,subject_path,month),
  check(posted_at >= '2026-08-01T00:00:00Z' and posted_at < '2026-11-01T00:00:00Z')
);
create index feed_dataset_candidates_rank_idx on content.feed_dataset_candidates(dataset_id,subject_path,month,score desc,posted_at desc,post_id);
create table content.feed_dataset_items (
  dataset_id text not null references content.feed_datasets(id),
  image_id uuid not null references content.feed_crawl_images(id),
  subject_path text not null, month text not null, record jsonb not null,
  selected_at timestamptz not null default now(), primary key(dataset_id,image_id),
  foreign key(dataset_id,subject_path,month) references content.feed_dataset_groups(dataset_id,subject_path,month)
);
create index feed_dataset_items_image_idx on content.feed_dataset_items(image_id);
create index feed_dataset_items_group_idx on content.feed_dataset_items(dataset_id,subject_path,month);

-- Overlay dataset labels on shared immutable image identities. No active dataset retains legacy behavior.
create view content.feed_active_images with (security_invoker = true) as
select i.id, i.post_id, i.image_url, coalesce(m.record->>'path',i.path) as path,
  coalesce(m.record->>'topicId',i.topic_id) as topic_id,
  coalesce((m.record->>'depth')::integer,i.depth) as depth,
  coalesce((m.record->>'createdAt')::timestamptz,i.posted_at) as posted_at,
  coalesce(m.record,i.record) as record, i.deleted_at, i.created_at, i.updated_at
from content.feed_crawl_images i
left join content.feed_dataset_items m on m.image_id=i.id and m.dataset_id=(select id from content.feed_datasets where active)
where i.deleted_at is null and (m.image_id is not null or not exists(select 1 from content.feed_datasets where active));

alter table content.feed_datasets enable row level security;
alter table content.feed_taxonomy_nodes enable row level security;
alter table content.feed_dataset_groups enable row level security;
alter table content.feed_dataset_tasks enable row level security;
alter table content.feed_dataset_candidates enable row level security;
alter table content.feed_dataset_items enable row level security;
revoke all on content.feed_datasets,content.feed_taxonomy_nodes,content.feed_dataset_groups,content.feed_dataset_tasks,content.feed_dataset_candidates,content.feed_dataset_items,content.feed_active_images from public;
grant select on content.feed_datasets,content.feed_dataset_items,content.feed_active_images to feed_embedder;
create policy feed_datasets_embedder on content.feed_datasets for select to feed_embedder using (true);
create policy feed_dataset_items_embedder on content.feed_dataset_items for select to feed_embedder using (true);

-- @down
drop view content.feed_active_images;
drop table content.feed_dataset_items;
drop table content.feed_dataset_candidates;
drop table content.feed_dataset_tasks;
drop table content.feed_dataset_groups;
drop table content.feed_taxonomy_nodes;
drop table content.feed_datasets;
