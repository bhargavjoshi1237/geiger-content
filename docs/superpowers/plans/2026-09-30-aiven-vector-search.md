# Aiven image and audience vector implementation plan

**Goal:** Implement Gemini image/text ingestion, Aiven HNSW retrieval, and consent-aware audience vectors with live workspace screens.

**Architecture:** Supabase owns application records and authorization. A server-only Aiven layer owns vectors, jobs, settings, and shared quota state. Background workers embed changed sources; search hydrates authorized Supabase records.

**Tech stack:** Next.js 16 App Router, node-postgres, pgvector, Gemini REST API, sharp, Supabase, @geiger/orm, @geiger/ui, Node test runner.

**Spec:** ../specs/2026-09-30-aiven-vector-search-design.md

**Execution:** The user approved the updated direction and explicitly requested implementation on 2026-09-30. Execute inline in this session; preserve all pre-existing changes. Use branch `codex/aiven-vector-search` in the current checkout because the existing uncommitted application flows are dependencies of this work.

## Global constraints

- Gemini Embedding 2 with 768 dimensions; no billing setup, paid Batch API, or provider fallback.
- Independent vectors for each image; originals remain in object storage.
- Keep credentials server-only and use parameterized SQL.
- New schema changes use scaffolded @geiger/orm migrations with up/down.
- Project authorization and resource permissions precede vector access; user knowledge is owner-scoped.
- Exact events and topic stages remain structured. Derived interest vectors reuse existing content vectors.
- Shared quotas are configurable estimates; expose 429 and defer jobs on exhaustion.
- Follow Geiger Events ScreenHeader, StatsBar, EditorSections, SectionCard, and live data patterns.
- Installed Next.js route-handler, route.js, server/client-boundary, and data-security documentation was read before code changes.

## Review focus

- A user supplied project/profile ID never grants access to another tenant or audience profile.
- A 429 is not silently converted to success, and repeated workers share budgets.
- Jobs cannot activate stale revisions or partial text embeddings.
- Deleted/private resources and denied consent suppress retrieval and profile aggregation.
- Index disk growth, query caches, source counts, and profile refreshes remain bounded.

## Tasks

### 1. Provider and vector core

- [x] Write and run failing Node tests for vector validation, chunking, recency weighting, negative signals, image origin checks, and Gemini 429 classification.
- [x] Implement `lib/vector/core.mjs`, `provider.mjs`, and `connection.mjs` with dependency injection for provider tests.
- [x] Confirm 768-dimensional responses, explicit request formatting, timeout, retry delay, daily-reset handling, and secret-free errors.

### 2. Isolated ledgered Aiven schema

- [x] Add vector migration commands and a conditional @geiger/orm config without changing Supabase's default target.
- [x] Scaffold a migration using the CLI for content vectors, profiles, private knowledge, durable jobs, quota counters, caches, and project settings.
- [x] Check status, dry run, apply through the ORM, and check status again.
- [x] Run controlled live tests in a transaction for HNSW retrieval, project filtering, job leases, and quota counters.

### 3. Authorized ingestion and retrieval services

- [x] Add a server Supabase client with verified sessions and `can_access_project` plus operation permission checks.
- [x] Implement bounded source sync, image validation, text chunk ingestion, coalesced profile jobs, atomic activation, and quota-aware failure handling.
- [x] Implement text and reference-source search with bounded candidate hydration, deduplication, eligibility, and editorial ranking.
- [x] Add protected cron worker and authenticated workspace APIs with explicit unavailable/quota responses.

### 4. Audience interests and private knowledge

- [x] Implement consent-gated weighted global and topic centroids using compatible existing vectors, idempotent event replay, negative preferences, and cold-start fallback.
- [x] Store attributed knowledge source records and independently addressable owner-scoped knowledge vectors; embedding is not an expertise score.
- [x] Implement owner-only personalized retrieval and invalidation for consent/source changes.

### 5. Workspace UI following Geiger Events

- [x] Replace sample Embeddings with live coverage, jobs, storage, quota, and source status; use EditorSections for settings.
- [x] Replace sample Semantic Search with entry/image results, filters, errors, and loading/empty states.
- [x] Connect Similar Content and Content-based Ranking to semantic candidates with a visibly labelled keyword fallback.
- [x] Add audience-vector/private-knowledge controls through the same registered screen layout and API data layer.

### 6. Verification and handoff

- [x] Run Node tests and controlled live integration tests; lint changed files and build the application.
- [x] Verify unsigned vector/cron 401 rejection and browser loading, missing-project, and empty states.
- [x] Verify authenticated results and real image embeddings after a Gemini key and signed-in project are available.
- [x] Review all new code for tenant isolation, quotas, stale jobs, and source deletion handling; repair actionable findings.
- [x] Document environment variables, scheduled worker operation, measured database setup, and any live-provider verification blocked by a missing Gemini key.

## Progress

- Dependencies installed; direct `pg`, `server-only`, and `sharp` dependencies declared.
- Geiger Events settings and shared screen patterns inspected; its default database uses schema `events` and @geiger/orm.
- Google confirms free standard embedding access and 429 quota errors. Actual project quotas require AI Studio verification.

- Aiven pgvector 0.8.6 is active; one Aiven migration and 30 Supabase migrations are applied with zero pending.
- Eighteen tests pass, including six live Aiven integration tests. Lint and production build pass.
- Review repairs cover stale revisions, reverse job order, expired leases, consent locks, private knowledge recovery, stage targeting, image parent visibility, and retention.
- Setup and remaining live checks: ../../aiven-vector-setup.md.

### Authorized live ingestion follow-up

- Configured the supplied Gemini key in ignored `.env.local`; restarted Content and started the suite dashboard for proper browser login.
- Applied `20260930115117_content_vector_grant_reads.sql` to repair scoped authenticated role reads; no write privileges added. Verified own/foreign grant isolation with a rolled-back transaction.
- Reproduced and repaired Next's internal localhost/public-host origin mismatch without allowing foreign origins.
- Uploaded the synthetic image through the authenticated asset UI, completed actual Gemini ingestion, and verified one active 768-dimensional Aiven vector and text-to-image search with score 0.782.
- Repeated query used the cache; repeated source sync queued zero jobs.
- Added continuous local `vector:watch` with bounded scan/batch operation, recovery, and graceful shutdown tests. Production scheduling remains an operator deployment step.
- Verified automatic ingestion of an edited asset with the continuous worker; both revision jobs completed on the first attempt.
- Final verification: 22 tests passed with no skips; scoped lint and production build passed. Aiven 1 applied / 0 pending, Supabase 31 applied / 0 pending.
