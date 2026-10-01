# Aiven image search and audience embeddings with Gemini Embedding 2

Status: proposed design for review. Application code and database schema have not been changed.

## Purpose and confirmed choices

Implement the semantic layer described in `Mds/ProductBrief.md` and `Aim.md`: background processing creates content embeddings, and search and recommendations retrieve candidates by meaning. Preserve the existing Supabase content, authentication, editorial controls, and delivery APIs. Aiven stores vectors and the operational state needed to compute and refresh them.

The user confirmed Aiven for vectors and Supabase for the application. The proposed embedding provider is Gemini Embedding 2, with 768 output dimensions. The user supplied free-tier quota research; the implementation must treat those measured limits as configurable planning values, not guaranteed account quotas.

The updated scope includes image embeddings and derived user interests, preferences, and knowledge representations. Original image files remain in object storage, while Supabase owns their asset records. Supabase also retains exact behavioral events, explicit preferences, knowledge evidence, and topic journey stages. Aiven stores their derived semantic representations. Embeddings cannot reconstruct the original image or replace an auditable event history.

## Existing implementation

- `lib/supabase/recommend.js` stores embeddings as JSON arrays in Supabase and provides keyword-based similarity.
- `components/internal/screens/recommendations/similar.jsx` and `content_rank.jsx` use that keyword ranking.
- The semantic-search and embeddings intelligence screens currently display sample data.
- Supabase migrations depend on Supabase roles and shared tables, so they cannot be applied wholesale to Aiven.
- The migration convention requires timestamped SQL with `@up` and `@down`, applied through `@geiger/orm`.
- The checkout has existing uncommitted work. Preserve it and limit modifications to vector integration.

## Proposed architecture

### Connections and migrations

Use a server-only, bounded PostgreSQL connection pool for Aiven. Keep its URL in an ignored environment file under a dedicated variable such as `VECTOR_DATABASE_URL`; preserve the existing `STRING_URI` used for Supabase migrations. Support the provider CA certificate for TLS verification. Never return credentials, database errors containing connection details, or raw vectors to the browser.

Use a separate Aiven config and migration directory with `@geiger/orm`, retaining the product schema `content` and its migration ledger on that database. Do not run the Supabase migration directory against Aiven. The new migrations enable pgvector and create vector-specific tables, indexes, and job state without Supabase roles or cross-database foreign keys.

### Embeddings and index

Store a `vector(768)` per independently searchable text chunk or image, associated with project ID, source kind, source ID, optional parent entry ID, chunk position, content hash, model, preprocessing version, timestamps, and soft-delete state. Use the Supabase asset ID as the image source ID; allow independent assets as well as images attached to entries. Preserve standard metadata and audit columns where applicable. Source identifiers refer to Supabase records without cross-database foreign keys.

Keep shared content vectors, derived profile vectors, and private knowledge vectors in distinct tables. A content search must never return a user's profile or private knowledge as a shared asset. Explicitly record vector purpose and compatible preprocessing; matching dimensions alone do not establish compatibility.

Create an HNSW cosine index using `vector_cosine_ops`, plus indexes supporting project, entry, and active-version lookup. Queries order directly by cosine distance and have a bounded limit. Require the same model, dimension, and preprocessing version for comparable embeddings. Never mix the legacy JSON vectors into the new index without validating their provenance; regenerate incompatible or unknown vectors.

Determine the installed pgvector version before using iterative HNSW scans. Where supported, use transaction-local iterative scans to improve recall under project filtering. Verify filtered retrieval against exact search on a controlled test dataset.

### Background ingestion

Use a durable Aiven job queue, keyed by project, source kind, source ID, and target revision, with queued, processing, retry, completed, and failed states. Supported source kinds include entries, image assets, profiles, and private knowledge items. Claim jobs atomically with bounded leases so concurrent workers cannot process the same job and interrupted jobs can be recovered. Coalesce repeated profile updates instead of scheduling one external embedding request per event.

Fetch source content from Supabase on the server. Extract text from the current structured content format, preserving title and useful metadata. Split long content into bounded chunks rather than silently truncating it. Embed each chunk independently, explicitly requesting 768 dimensions. Validate returned vector length and finite, nonzero values.

Use Google's documented retrieval formatting for text documents and search queries. Do not send the `taskType` field used by Gemini Embedding 001 to Embedding 2.

For image assets, fetch the authorized object using the server storage integration, validate the actual format, enforce bounded byte and pixel limits, and embed PNG or JPEG data with `outputDimensionality: 768`. Convert other accepted source formats to a supported representation in a bounded worker or return an actionable unsupported-format state. Restrict fetches to configured storage origins and validate redirects; do not fetch arbitrary caller-supplied URLs.

The initial image path sends one image per embedding operation and creates one independently addressable vector per asset. Multiple image parts in one content object produce a combined representation, which must not be presented as separate image vectors. If separate-content batching is introduced later, verify the API response mapping and actual quota accounting. Do not assume six images in a request always means six independently searchable vectors or a sixfold increase in free-tier throughput.

An image-only vector supports visual similarity and text-to-image retrieval. Metadata remains searchable as structured fields. A combined image-and-caption representation is a distinct, versioned preprocessing choice, not a silent replacement. Use the provider's multimodal formatting guidance and test it with representative queries before switching. Asset replacement, deletion, permission changes, and parent publication changes enqueue refresh or invalidation work.

Hash the content and preprocessing configuration so unchanged entries reuse their vectors. Publish a completed embedding revision atomically; partially processed revisions must not replace the last complete revision. Re-check source state before activation, and retire embeddings for deleted or unpublished content as appropriate to the retrieval surface.

Configure request budgets and concurrency. Retry transient failures with bounded backoff and respect provider retry guidance. A daily quota exhaustion must defer jobs rather than busy-retrying. Reserve capacity for interactive queries. Persist shared ingestion budget state so multiple workers do not each assume the full quota is available.

### Search and similar content

Provide authenticated, project-authorized server endpoints. Browser data helpers call these endpoints; PostgreSQL and Gemini calls remain on the server. Derive project authorization from the existing Supabase membership model rather than trusting a caller-supplied project ID.

Text search embeds the query with the same model and dimension, retrieves candidate entry or asset IDs from Aiven, aggregates chunk results per entry, and loads the matching records from Supabase. Support source-kind filters for entries, images, or both. Recheck permissions, project, environment, publication, and deletion state in Supabase before returning results. Return authorized storage URLs or issue short-lived signed URLs for private images. Search-query caching must include model, dimension, preprocessing, and authorization scope and must have bounded retention.

Similar-content retrieval reuses the reference entry's stored vectors. It makes no Gemini call for each lookup. Retrieve a bounded candidate pool, deduplicate entries, apply existing editorial boosts and exclusions, and return explainable scores. Keep the source of the ranking visible when keyword fallback is used because vectors are unavailable.

Image-to-image retrieval likewise reuses a stored asset vector. Searching with a new uploaded image requires validation and one new embedding operation; it must not persist the upload or its vector without an explicit retention purpose.

### User behavior, interests, and knowledge

Preserve the research relationship `User -> Topic -> Stage -> Recommended Content`. Supabase remains the source of truth for event timestamps, content and asset references, likes, saves, dismissals, explicit preferences, and topic-stage evidence. Add any missing source fields or entities through new Supabase migrations rather than moving the application database into Aiven. Resolve anonymous and known identities through the existing profile layer before aggregation.

Create derived 768-dimensional interest vectors in Aiven, keyed by project, canonical profile, purpose, and optional topic. Start with one global interest vector and a configurable cap of five active topic-interest vectors per user. Keep additional topic scores in Supabase. This cap is a capacity control, not a limit on how many interests the user may have.

Calculate interest vectors from a normalized weighted average of compatible content or image vectors involved in positive interactions. Weights are configurable by action strength, engagement, and recency. Deduplicate events, cap repeated interactions with the same source, decay older signals, and recompute from a bounded aggregation window so replay and correction are deterministic. If no eligible vector remains or the aggregate norm is zero, mark the profile as having no semantic signal and use the structured cold-start fallback. Treat weighted averaging as an initial heuristic and evaluate recommendation quality before tuning it.

Retain dislikes, dismissals, and explicit exclusions as structured filtering and reranking signals. Do not encode them only as negative vector weights. Fetch a bounded candidate pool using the profile vector, then enforce negative preferences, topic stage, consent, content eligibility, diversity, freshness, and editorial rules. Similarity indicates semantic affinity, not proven intent, conversion likelihood, or expertise.

Keep user-declared interests and knowledge evidence as editable, attributed source records in Supabase. Embed relevant declarations or private knowledge items only when their content changes, under a separate vector purpose. Knowledge embeddings assist semantic retrieval; a user's competence or journey stage must remain structured, with evidence and confidence. Viewing advanced content alone is not proof of knowledge.

Private knowledge embeddings are scoped to the owning profile and project and excluded from shared content search. Use declared skill/topic records and observed learning signals to select suitable difficulty; do not concatenate arbitrary private knowledge into every content-retrieval query. Any use of knowledge vectors to adjust shared-content ranking requires a separate evaluation of relevance and permission boundaries.

Behavior-based centroid updates reuse already-stored vectors and require no Gemini call per click, like, or view. New explicit-interest text and knowledge items may require provider calls when changed. Keep their budgets separate from image ingestion and interactive query reservations.

Personalized endpoints must resolve the profile from a trusted session or the application's validated anonymous identity mechanism; a caller cannot request another user's profile by supplying its ID. Profile jobs check the personalization-purpose consent policy before both processing and activation. The current helper allows missing or pending consent; the new pipeline requires an explicit configured policy and defaults to requiring granted personalization consent. This change applies to the new semantic personalization flow, not all existing analytics behavior.

Consent withdrawal, profile deletion, identity merges, source removal, and model changes enqueue cross-database invalidation or rebuild work. Serve no personalized result while authorization or consent cannot be verified. Limit revisions and private knowledge retention through documented policies; soft-delete state alone does not reclaim disk or complete an erasure workflow. The retention implementation must account for deletion across live vectors, jobs, caches, original records, and the provider's backup policies.

### Capacity budget for a 1 GB database

Interpret the user's 1 GB as decimal disk capacity (1,000,000,000 bytes), not RAM. The actual Aiven plan's available storage and system usage still need verification.

For a single `vector(768)`, pgvector's documented payload size is `4 * 768 + 8 = 3,080 bytes`. Image file size does not affect that fixed vector payload. A 3 MB image remains a 3 MB object-storage item; its embedding is a lossy semantic representation of roughly 3 KB.

| Storage scenario | Calculated capacity | Meaning |
| --- | --- | --- |
| Original 3 MB image files inside 1 GB | About 333 images | Payload-only arithmetic, before PostgreSQL overhead; not the proposed architecture |
| 768-dimensional vectors only | About 324,675 vectors | Theoretical payload-only arithmetic; excludes table, TOAST, metadata, and every index |
| Illustrative operational budget | About 57,000-85,000 vectors | Assumes 8-12 KiB total per vector including overhead/index allowance and reserves 30% of disk |

The operational estimate is a provisional budgeting assumption, not a measured pgvector capacity guarantee. HNSW parameters, PostgreSQL page and TOAST storage, updates and bloat, metadata, auxiliary tables, and instance resources affect both capacity and performance. A disk capacity estimate is not a throughput or latency guarantee.

Images, text chunks, private knowledge items, cached query vectors, and user-interest vectors share the same budget. There is no separate 57,000-85,000 allowance for each category. For example, 10,000 image vectors plus 5,000 users with one global and five topic vectors each consumes 40,000 vector payloads before text chunks, private knowledge, caches, and revision overhead. The original image objects in this example require about 30 GB outside Aiven.

Do not create an HNSW index on profile vectors unless user-to-user similarity becomes an explicit feature. They serve as query inputs to the content index and need project/profile lookup indexes. This saves space relative to indexing every vector category. Bound query caches and job history; coalesce profile jobs; retain only necessary revisions.

Before setting a production maximum, load a representative staging sample and measure `pg_total_relation_size` for each table, its TOAST data, and all indexes. Include a steady-state update/rebuild workload, baseline database usage, job/cache growth, and maintenance headroom. Monitor actual database/disk usage and reject or defer new indexing work before exhausting reserved space. Benchmark recommendation accuracy and latency at the expected project filter selectivity.

### Updated implementation sequence

1. Establish the Aiven connection, isolated migrations, pgvector content index, and storage/quota instrumentation.
2. Implement durable image and text ingestion with revision handling, independent asset vectors, and shared provider budgeting.
3. Connect semantic text-to-image search, image similarity, and existing content recommendation screens to authorized live retrieval.
4. Extend the existing Supabase profile/event/topic sources as needed and build background global/topic-interest aggregation in Aiven.
5. Add attributed knowledge records and owner-scoped embeddings, then integrate structured journey stage and preference reranking into personalized delivery.
6. Validate quality, tenant and profile isolation, consent lifecycle, quota behavior, and measured capacity before increasing indexing limits.

Replace relevant sample UI with real loading, empty, unavailable, and result states. Video, audio, and PDF ingestion remain subsequent extensions with their own segmentation and file-processing requirements. Graph learning and a complete experiment-driven optimization engine remain separate from this vector implementation.

## Validation and prerequisites

Before product code changes, read the relevant installed Next.js route-handler and server/client-boundary guides as required by `AGENTS.md`. The checkout currently has no `node_modules`, so those bundled guides are unavailable until dependencies are installed.

Validate migration status before and after applying Aiven migrations. Test provider request formatting and response validation; image format and fetch restrictions; one-vector-per-asset mapping; idempotent indexing; job recovery; quota deferral; model isolation; project and profile authorization; unpublished/deleted source suppression; query caching; and HNSW query plans and retrieval accuracy on controlled data. Test recency-weighted profile aggregation, event deduplication, negative signals, sparse/zero-vector fallback, topic-stage evidence, identity merges, consent withdrawal, and knowledge ownership. Measure disk growth with representative images, profile refreshes, and index maintenance. Verify the browser flow and run checks appropriate to modified files.

Live Gemini verification requires `GEMINI_API_KEY` in the local ignored environment file. No Gemini key was found during the environment-variable-name check. Confirm the project's actual limits in AI Studio before relying on a throughput target. No live Aiven connectivity or extension-version verification has been performed yet.

## Official references

- Gemini model: https://ai.google.dev/gemini-api/docs/models/gemini-embedding-2
- Gemini embeddings, retrieval formatting, and multimodal limits: https://ai.google.dev/gemini-api/docs/embeddings
- Project-specific quotas: https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing#gemini-embedding-2
- Aiven pgvector support: https://aiven.io/docs/products/postgresql/howto/use-pgvector
- pgvector HNSW limits, filtering, and operators: https://github.com/pgvector/pgvector
