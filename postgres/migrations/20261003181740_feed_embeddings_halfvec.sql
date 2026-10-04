-- Feed embeddings: store as halfvec
--
-- content.feed_image_embeddings.embedding becomes public.halfvec(768): 1.5 KB per image instead of 3 KB,
-- small enough to stay inline instead of in TOAST, and the HNSW index halves with it. Cosine similarity at
-- half precision is effectively unchanged for ranking. Owns the new feed_image_embeddings_hnsw_idx.

-- @up
create extension if not exists vector with schema public;
drop index if exists content.feed_image_embeddings_hnsw_idx;
alter table content.feed_image_embeddings
  alter column embedding type public.halfvec(768) using embedding::public.halfvec(768);
create index if not exists feed_image_embeddings_hnsw_idx on content.feed_image_embeddings
  using hnsw (embedding public.halfvec_cosine_ops) with (m = 16, ef_construction = 64)
  where status = 'done' and deleted_at is null;

-- @down
drop index if exists content.feed_image_embeddings_hnsw_idx;
alter table content.feed_image_embeddings
  alter column embedding type public.vector(768) using embedding::public.vector(768);
