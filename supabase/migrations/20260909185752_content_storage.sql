-- Content storage
--
-- Owns the public `content` storage bucket behind the Assets screen (D2).
-- Bucket holds assets/<projectId>/<assetId>/ objects; the public URL is
-- persisted in content.assets.url. Idempotent: safe to re-run.

-- @up
insert into storage.buckets (id, name, public)
values ('content', 'content', true)
on conflict (id) do nothing;

drop policy if exists "content public read" on storage.objects;
create policy "content public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'content');

drop policy if exists "content creator write" on storage.objects;
create policy "content creator write" on storage.objects
  for insert to authenticated with check (bucket_id = 'content');

drop policy if exists "content creator update" on storage.objects;
create policy "content creator update" on storage.objects
  for update to authenticated using (bucket_id = 'content');

drop policy if exists "content creator delete" on storage.objects;
create policy "content creator delete" on storage.objects
  for delete to authenticated using (bucket_id = 'content');

-- @down
drop policy if exists "content creator delete" on storage.objects;
drop policy if exists "content creator update" on storage.objects;
drop policy if exists "content creator write" on storage.objects;
drop policy if exists "content public read" on storage.objects;

