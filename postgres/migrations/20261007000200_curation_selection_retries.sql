-- @up
alter table content.feed_dataset_groups drop constraint feed_dataset_groups_status_check;
alter table content.feed_dataset_groups add constraint feed_dataset_groups_status_check check(status in ('pending','done','failed'));
alter table content.feed_dataset_groups add column attempts integer not null default 0;
alter table content.feed_dataset_groups add column available_at timestamptz not null default now();
alter table content.feed_dataset_groups add column error text;

-- @down
update content.feed_dataset_groups set status='pending' where status='failed';
alter table content.feed_dataset_groups drop constraint feed_dataset_groups_status_check;
alter table content.feed_dataset_groups add constraint feed_dataset_groups_status_check check(status in ('pending','done'));
alter table content.feed_dataset_groups drop column attempts,drop column available_at,drop column error;
