-- Seed: named delivery slots with published fallbacks.
--
-- project_id is NULL on purpose (see 01_entries.sql): adopt with
--   update content.slots set project_id = '<project-uuid>' where project_id is null;
--
-- Runs after 01_entries.sql in path order so fallback_entry_id FKs resolve.
-- Re-runnable: stable UUIDs + on conflict (id) do nothing. Data only, no DDL.

insert into content.slots
  (id, project_id, key, name, description, status, fallback_entry_id)
values
  (
    'c0ffee00-0041-4000-8000-000000000041', null,
    'homepage_hero', 'Homepage Hero',
    'Top of the marketing homepage. Falls back to the homepage entry.',
    'Active', 'c0ffee00-0003-4000-8000-000000000003'
  ),
  (
    'c0ffee00-0042-4000-8000-000000000042', null,
    'footer_promo', 'Footer Promo',
    'Seasonal promotion strip in the site footer. Paused until the campaign starts.',
    'Paused', 'c0ffee00-0002-4000-8000-000000000002'
  )
on conflict (id) do nothing;
