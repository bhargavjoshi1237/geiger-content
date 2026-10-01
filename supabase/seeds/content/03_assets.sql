-- Seed: media library rows.
--
-- project_id is NULL on purpose (see 01_entries.sql): adopt with
--   update content.assets set project_id = '<project-uuid>' where project_id is null;
--
-- Re-runnable: stable UUIDs + on conflict (id) do nothing. Data only, no DDL.

insert into content.assets
  (id, project_id, name, folder, file_type, mime, size_bytes, url, alt, status)
values
  (
    'c0ffee00-0031-4000-8000-000000000031', null,
    'Homepage hero banner', 'marketing', 'image', 'image/jpeg', 184320,
    'https://cdn.example.com/assets/hero-banner.jpg',
    'Product hero banner', 'Ready'
  ),
  (
    'c0ffee00-0032-4000-8000-000000000032', null,
    'Team photo', 'marketing', 'image', 'image/png', 926540,
    'https://cdn.example.com/assets/team-photo.png',
    'Content team group photo', 'Ready'
  ),
  (
    'c0ffee00-0033-4000-8000-000000000033', null,
    'Product walkthrough', 'docs', 'video', 'video/mp4', 48234567,
    'https://cdn.example.com/assets/product-walkthrough.mp4',
    'Five minute product tour', 'Ready'
  ),
  (
    'c0ffee00-0034-4000-8000-000000000034', null,
    'Brand guidelines', 'brand', 'document', 'application/pdf', 892145,
    'https://cdn.example.com/assets/brand-guidelines.pdf',
    'Logo and color usage', 'Ready'
  )
on conflict (id) do nothing;
