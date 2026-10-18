-- Curation top candidates
--
-- Month-sized curation scans keep only each subject/month's top-scored candidates, so the
-- feed_worker login may delete the candidates that fall out of that ranking.

-- @up
grant delete on content.feed_dataset_candidates to feed_worker;

-- @down
revoke delete on content.feed_dataset_candidates from feed_worker;
