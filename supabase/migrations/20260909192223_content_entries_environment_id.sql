-- Content entries environment scope
--
-- Adds content.entries.environment_id so reads can be scoped per delivery
-- environment (see content.environments). Nullable: existing rows stay
-- unscoped until assigned. The FK uses SET NULL so deleting an environment
-- never deletes entries.

-- @up
alter table content.entries
  add column if not exists environment_id uuid references content.environments(id) on delete set null;

create index if not exists entries_environment_idx
  on content.entries (environment_id) where deleted_at is null;

-- @down
drop index if exists content.entries_environment_idx;
alter table content.entries drop column if exists environment_id;
