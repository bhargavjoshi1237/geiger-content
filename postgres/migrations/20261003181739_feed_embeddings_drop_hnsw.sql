-- Feed embeddings: drop the full-precision HNSW index
--
-- Step 1 of the halfvec switch (see 20261003181740_feed_embeddings_halfvec.sql). Dropping the 200 MB index
-- in its own migration commits and frees that disk before the column rewrite needs space — the Aiven
-- service went read-only at ~620 MB of data.

-- @up
drop index if exists content.feed_image_embeddings_hnsw_idx;

-- @down
create index if not exists feed_image_embeddings_hnsw_idx on content.feed_image_embeddings
  using hnsw (embedding public.vector_cosine_ops) with (m = 16, ef_construction = 64)
  where status = 'done' and deleted_at is null;
