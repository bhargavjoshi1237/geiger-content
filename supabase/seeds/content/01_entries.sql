-- Seed: core content entries.
--
-- project_id is NULL on purpose: seeds must load on a fresh database without
-- depending on a public.projects row (project_id is nullable). Project-scoped
-- screens filter by project_id, so adopt these rows into a real project with:
--   update content.entries set project_id = '<project-uuid>' where project_id is null;
--
-- Re-runnable: stable UUIDs + on conflict (id) do nothing. Data only, no DDL.

insert into content.entries
  (id, project_id, title, slug, status, type, excerpt, body, author, locale, cover_url, scheduled_at, published_at)
values
  (
    'c0ffee00-0001-4000-8000-000000000001', null,
    'Getting started guide', 'getting-started-guide', 'Published', 'Guide',
    'Model, write, and publish your first entry in ten minutes.',
    'Welcome to Geiger Content. This guide walks through creating an entry, editing it, and publishing it to delivery.',
    'Geiger Team', 'en', '',
    null, '2026-08-20T09:00:00Z'
  ),
  (
    'c0ffee00-0002-4000-8000-000000000002', null,
    'September release notes', 'september-release-notes', 'Published', 'Article',
    'Collections, slots, and a faster editorial workflow.',
    'This month we shipped reusable collections, named content slots for delivery, and a review queue that keeps publishing unblocked.',
    'Release Bot', 'en', '',
    null, '2026-09-02T09:00:00Z'
  ),
  (
    'c0ffee00-0003-4000-8000-000000000003', null,
    'Homepage', 'home', 'Published', 'Page',
    'The marketing site homepage.',
    'Hero, proof points, and the call to action that starts every trial.',
    'Marketing', 'en', '',
    null, '2026-08-25T09:00:00Z'
  ),
  (
    'c0ffee00-0004-4000-8000-000000000004', null,
    'Pricing', 'pricing', 'Draft', 'Page',
    'Plans, seats, and usage limits.',
    'Draft of the new pricing page. Still waiting on final seat tiers from finance.',
    'Marketing', 'en', '',
    null, null
  ),
  (
    'c0ffee00-0005-4000-8000-000000000005', null,
    'Production migration checklist', 'migration-checklist', 'In review', 'Doc',
    'Steps for moving an existing site onto Geiger Content.',
    'Inventory content, map types, import, verify redirects, then cut over delivery. Currently with engineering for review.',
    'Docs Team', 'en', '',
    null, null
  ),
  (
    'c0ffee00-0006-4000-8000-000000000006', null,
    'Winter campaign landing', 'winter-campaign', 'Scheduled', 'Article',
    'Seasonal campaign page, goes live December first.',
    'Campaign creative and offer details. Scheduled to publish ahead of the winter launch.',
    'Marketing', 'en', '',
    '2026-12-01T09:00:00Z', null
  )
on conflict (id) do nothing;
