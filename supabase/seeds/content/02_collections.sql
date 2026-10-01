-- Seed: collections grouping the 01_entries rows.
--
-- project_id is NULL on purpose (see 01_entries.sql): adopt with
--   update content.collections set project_id = '<project-uuid>' where project_id is null;
--
-- Runs after 01_entries.sql in path order so the collection_items FKs resolve.
-- Re-runnable: stable UUIDs + on conflict (id) do nothing. Data only, no DDL.

insert into content.collections
  (id, project_id, name, slug, description, status, cover_url)
values
  (
    'c0ffee00-0011-4000-8000-000000000011', null,
    'Getting started', 'getting-started',
    'Everything a new editor needs: the guide plus the migration checklist.',
    'Published', ''
  ),
  (
    'c0ffee00-0012-4000-8000-000000000012', null,
    'Release notes', 'release-notes',
    'Monthly changelog entries, newest first.',
    'Draft', ''
  )
on conflict (id) do nothing;

insert into content.collection_items
  (id, collection_id, entry_id, position)
values
  (
    'c0ffee00-0021-4000-8000-000000000021',
    'c0ffee00-0011-4000-8000-000000000011',
    'c0ffee00-0001-4000-8000-000000000001', 0
  ),
  (
    'c0ffee00-0022-4000-8000-000000000022',
    'c0ffee00-0011-4000-8000-000000000011',
    'c0ffee00-0005-4000-8000-000000000005', 1
  ),
  (
    'c0ffee00-0023-4000-8000-000000000023',
    'c0ffee00-0012-4000-8000-000000000012',
    'c0ffee00-0002-4000-8000-000000000002', 0
  )
on conflict (id) do nothing;
