# Qdrant candidate assessment

Tested 4 October 2026, approximately 04:05 IST, from the development machine.

**Verdict: viable for embedding storage and search, with an adapter; not a direct replacement for the current Aiven PostgreSQL database.** The application configuration was not changed, no existing data was migrated, and the supplied credential was not saved in files.

## Live results

The supplied eu-central-1 endpoint authenticated successfully, reported Qdrant 1.19.1, and had no collections before testing. Missing and invalid credentials were rejected. Health and readiness endpoints returned HTTP 200.

The final probe created `geiger_probe_1d26b6282b1f406086aa65bcc64dd269`, populated it with synthetic data only, and deleted it in `finally`. A subsequent collection lookup returned HTTP 404, confirming cleanup.

| Check | Result |
| --- | --- |
| Dense cosine embeddings | 4,096 vectors, 768 dimensions, float16, on-disk vectors |
| Content payload | Nested JSON records, titles, body text, tags, and image URLs round-tripped |
| Content awaiting embedding | Vectorless point accepted and retrieved |
| Upserts | Repeating the same point ID did not increase the count |
| Indexing | All 4,096 vectors indexed; green collection; HNSW m=16, ef_construct=100 |
| Filters | Tenant, model, and active filters excluded even identical-vector sentinel points |
| Seen-item exclusion | Source point excluded from similarity results |
| Content pagination | Scroll cursor returned distinct successive pages |
| Updates and deletion | Payload update preserved content; inactive point suppressed; tenant deletion retained the other tenant |
| Validation | Wrong dimensions and arbitrary non-UUID string IDs rejected |
| Upload | 4.61 seconds for 4,096 points in batches of 256; includes ongoing indexing |
| Filtered ANN search, 20 requests | Median 147.11 ms; p95 149.43 ms, client wall-clock |
| Qdrant-reported processing | Median 0.82 ms; p95 1.08 ms |
| Search at concurrency 6, 24 requests | Median 145.21 ms; p95 434.00 ms, including new connection setup |
| Recall@10, ANN vs Qdrant exact | 100%, averaged over 20 synthetic queries, hnsw_ef=256 |
| Recall@10, float16 exact vs local full-precision ranking | 99%, averaged over the same queries |

These are small synthetic tests, not an application capacity, semantic relevance, or production throughput benchmark. Six simultaneous searches succeeded, but the tail latency and small sample do not establish a sustained service-level target. The process resident-memory reading increased from about 65 MB to 104 MB during the final probe; this is process memory, not complete disk or memory capacity accounting.

Telemetry reported one peer and the test collection had replication_factor=1. It reported 1,195,376 KiB effective RAM and a 4,046,560 KiB storage filesystem (about 1.14 GiB RAM and 3.86 GiB disk). The units are confirmed in [Qdrant 1.19.1 telemetry source](https://github.com/qdrant/qdrant/blob/v1.19.1/src/common/telemetry_ops/app_telemetry.rs). These are runtime observations, not verification of the subscription, CPU entitlement, available disk space, backup configuration, or SLA.

## Current Aiven baseline

Read-only checks found PostgreSQL 18.6, pgvector 0.8.6, and database size 424,572,607 bytes (about 424.6 MB). Feed embeddings had 52,559 completed and 8,450 failed rows at measurement time. Workers may change these counts.

The feed embedding relation occupied about 223.7 MB, including its indexes. Its halfvec cosine HNSW index occupied about 107.9 MB. Crawled image records occupied about 118.3 MB and captions about 49.4 MB. These figures show that the database stores considerable non-vector content as well.

The existing direct SQL feed query returned 10 neighbors with median 23.48 ms over 10 requests; its sampled EXPLAIN ANALYZE showed the HNSW index used and 1.35 ms server execution. The actual `createFeedVectors().nearest()` method, with BEGIN, transaction-local ef_search=100, the search/join, and COMMIT, measured median 97.51 ms and p95 102.57 ms over 20 requests.

Qdrant's measured client latency was higher despite its smaller test dataset. The much smaller Qdrant server time suggests that network/request overhead dominates this endpoint from the development machine. The corpora, filters, clients, search settings, and transactions differ, so this is not a controlled engine comparison. Measure again from the production hosting region and with representative data before selecting a provider for speed.

## Why the connection URL cannot simply be swapped

`lib/vector/connection.mjs` accepts only PostgreSQL URLs and instantiates a `pg.Pool`. Qdrant exposes HTTP/gRPC APIs and collections of points, rather than that PostgreSQL connection contract. See [Qdrant overview](https://qdrant.tech/documentation/overview/) and [API reference](https://api.qdrant.tech/).

Current Aiven dependencies include:

- Feed crawl records, captions, crawl counts, tasks, and worker records.
- Feed image embeddings, profile taste vectors, and application content/profile/knowledge/query vectors.
- Embedding jobs, provider quota counters, settings, and enrichment leases.
- Reader profile state and exact behavior events.
- SQL joins, foreign keys, unique constraints, roles/RLS, migrations, atomic counters, row locks, and transactional profile/event updates.

Examples are `lib/feed/vectors.mjs` (`loadCatalog`, `nearest`, `withProfile`, `logEvents`), `lib/feed/crawl/fleet.mjs`, `lib/vector/repository.mjs`, `lib/vector/ingestion.mjs`, and `scripts/kaggle/feed_enrich.py`. Jobs claim work with `FOR UPDATE SKIP LOCKED`; profile updates lock a row and commit the behavior log and state together. Replacing these database calls with point upserts would change their correctness guarantees and require redesign.

## Fit for content and embeddings

Qdrant can store an embedding together with JSON content metadata, captions, body text, and source URLs; the probe verified that directly. This makes it useful as a denormalized search document store. Keep original image/video files in object storage and store their URLs/IDs in payloads. See [Qdrant payload documentation](https://qdrant.tech/documentation/manage-data/payload/).

For this application, keep canonical content, permissions, profiles, events, jobs, and leases in PostgreSQL (Aiven or Supabase). Use Qdrant for retrievable embeddings and the payload fields needed to filter them. If the goal is to eliminate Aiven completely, first move its relational tables and worker coordination to another PostgreSQL database; Supabase capacity and access policies would need separate assessment.

Existing vectors can be copied without generating embeddings again, preserving model identity and preprocessing metadata. Gemini and Nomic embeddings share a dimension count but must remain in separate model scopes. The tested float16 datatype corresponds to the feed's current halfvec storage precision, with small rounding differences. Real-corpus recall remains unmeasured.

An integration would need:

1. A server-only REST/SDK client with `QDRANT_URL` and `QDRANT_API_KEY`.
2. Collection configuration, payload indexes, and adapters for vector reads, nearest-neighbor searches, and writes. The feed's existing facade can keep its caller-facing interface while relational methods remain in PostgreSQL.
3. Stable UUID/integer point IDs. Existing UUID IDs are usable; Reddit post IDs such as `abc123` need a deterministic mapping and a `post_id` payload field. Preserve model/revision/chunk uniqueness explicitly.
4. Mandatory tenant/model/preprocessing/active filters and the existing application permission/publication rechecks. Payload filtering is not a substitute for authorization.
5. An outbox/retry process for PostgreSQL-to-Qdrant synchronization, revision changes, and deletions. Writes across the two services do not share a PostgreSQL transaction.
6. Changes to ingestion, insights, audience vectors, status/quota instrumentation, and notebook workers that currently issue direct SQL. Backfill and compare representative searches before switching reads; retain a rollback path.

Recommendation: use this endpoint for a vector-only pilot if additional vector capacity is the priority. Keep Aiven as the relational store initially. There is no measured latency advantage from this machine, and a 4,096-vector test does not verify performance at the current 52,000+ embedding count.

The plan tier was not verified. If it is a free cluster, [Qdrant's documented free-cluster limitations](https://qdrant.tech/documentation/cloud/create-cluster/) include a single node, manual snapshots, suspension after one unused week, and deletion after four inactive weeks if not reactivated. These matter if the endpoint is to become durable application infrastructure.

## Repeat the probe

Set `QDRANT_URL` and `QDRANT_API_KEY` in the process environment or a local ignored env file, then run:

```powershell
node --env-file-if-exists=.env.local scripts/qdrant-probe.mjs
```

The script prints a credential-free JSON report and only modifies its uniquely named synthetic collection. It deletes that collection and verifies the deletion. It exits unsuccessfully if a check or cleanup fails. Syntax checking and scoped ESLint both passed. No application build was needed because application code was not changed.
