# Entertainment Corpus Implementation Plan

> Implement inline with the executing-plans and test-driven-development skills; use an independent final reviewer.

**Goal:** Build and start a resumable August–October entertainment corpus, ready for user-run embeddings.
**Architecture:** Shallow taxonomy, separate metadata staging and ranked image selection, active dataset membership over the existing image/embedding tables, subject-specific taste vectors.
**Tech Stack:** Node ESM, node:test, Postgres, existing pgvector and Arctic client.
**Spec:** docs/superpowers/specs/2026-10-07-entertainment-corpus.md

## Global constraints

- Preserve existing uncommitted work and legacy corpus; no database deletion.
- August 1, 2026 inclusive; November 1, 2026 exclusive; no future posts.
- Six entertainment areas; no arbitrary expertise gating between subjects.
- No content embedding generation; prepare the existing notebook for the new dataset.
- User explicitly requested implementation now; execute without additional design approval cycles.

## Review focus

- Date-boundary posts and pagination ties must not cause unbounded loops or silent omissions.
- Failed/unfinished sources must not be marked complete; cursors and candidates must commit together.
- Duplicate URLs and unavailable images must not prevent filling the next ranked candidates.
- Active dataset restrictions must apply consistently to feed, nearest-neighbour search and embedding work.
- Distinct subject interests must survive profile serialization and avoid collapsing into one query vector.

## Task 1: Taxonomy and selection policy

- [x] Add failing tests in tests/feed-entertainment.test.mjs for six areas, variable subjects, flat depth, neutral-title labeling, date boundaries and ranking.
- [x] Add lib/feed/taxonomy/entertainment.mjs and lib/feed/crawl/curation.mjs.
- [x] Default loadTaxonomy to v2; expose loadLegacyTaxonomy for legacy crawlers and regression fixtures.
- [x] Run node --test tests/feed-entertainment.test.mjs tests/feed-taxonomy.test.mjs.

## Task 2: Database and resumable worker

- [x] Add additive migration for datasets, taxonomy nodes, day-window tasks, metadata candidates and image membership.
- [x] Implement lib/feed/crawl/curation-repo.mjs and scripts/feed-curate.mjs with seed, work, status and refresh commands.
- [x] Test paging, transaction checkpoints, source failures, final ranking, deduplication, and resumption.
- [x] Apply migration and seed only after local tests pass; launch one hidden worker and verify progress.

## Task 3: Feed and embeddings handoff

- [x] Filter catalog and vector queries to active dataset membership; apply same filter to notebook pending-image query.
- [x] Store taste by subject and query strongest interests separately; retain existing recent/negative behavior.
- [x] Update entertainment simulation personas and labels to remove expertise claims for v2.
- [x] Run feed tests, targeted lint and database integration verification; independently review changed files.

## Execution ledger

- Baseline: 50 feed tests passed, 1 opt-in DB test skipped. Existing user edits present and preserved.
- Database connection verified; current live crawl image count is zero.
- Migrations 20261007000100/000200 applied to the vector DB ledger; 37 subjects and 3,332 day-window tasks seeded; worker launched hidden.
- Final review fixed: deleted or gone (404/410) images no longer take a ranked slot; the live catalog cache revalidates the active dataset; status reports selection failures alongside scan failures.
- Verification: 61 feed tests pass (live vector test skipped: legacy corpus is empty); curation DB test passes with CURATION_LIVE_TESTS=1; eslint clean.
- Worker restarted on the fixed code before any group was selected. Embeddings stay manual once the dataset reports `ready`.
