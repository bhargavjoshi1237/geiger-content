# Current feed recommendation implementation (Geiger Content codebase audit)

All paths are relative to `C:/Pro/geiger-content`. Line numbers are from the working tree as of 2026-10-14 (branch `master`, uncommitted changes present). "Source" links point at file + line range.

## Q1. What files make up the feed?

### Takeaway
The live feed is a small, self-contained stack: a full-screen Shorts-style page → a client hook → one `/api/feed/[operation]` route → `lib/feed/live.mjs` (service), which wraps a pure ranking engine (`engine.mjs`), an embedding "taste" model (`taste.mjs`), and a pgvector store (`vectors.mjs`) on a separate Postgres (Aiven) database whose DDL lives in `postgres/migrations/`, not `supabase/migrations/`. The "Recommendations", "Personalization", "Experiments → Bandits" and "Intelligence" workspace screens mostly **do not** drive the shorts feed. They work on CMS content entries. The one exception is Feed Lab, which runs the same engine against simulated readers.

### Cited Findings
- Route: `/project/feed/<projectId>` renders `FeedShortsScreen` full-screen with no workspace sidebar. Source: [app/project/feed/[projectId]/page.js:7-16](app/project/feed/[projectId]/page.js)
- UI: `components/internal/screens/feed/shorts_feed.jsx` (230 lines) holds the 9:16 scroll-snap short, the action rail and the nav buttons. Source: [shorts_feed.jsx:21-147](components/internal/screens/feed/shorts_feed.jsx)
- Client state/behaviour: `use_live_feed.js` (208 lines) handles batches, the engagement queue, per-item view timing, similarity search, recency and reader switching. Source: [use_live_feed.js:71-208](components/internal/screens/feed/use_live_feed.js)
- Side panel: `insights_panel.jsx` (128 lines). Source: [insights_panel.jsx:34-125](components/internal/screens/feed/insights_panel.jsx)
- API: `app/api/feed/[operation]/route.js` takes GET `status` and `profile`, and POST `next`, `events`, `reset`, `settings`, `similar` and `search`. It is gated by the `content.recommendations.view` / `content.intelligence.view` permissions, checks same-origin on POST, and caps bodies at 20 KB. Source: [route.js:11, 28-44, 46-74](app/api/feed/[operation]/route.js)
- Service: `lib/feed/live.mjs` combines "the topic-tree engine plus pgvector 'more like this' candidates from the reader's taste vectors". It keeps one catalog cache per process with a 10-minute TTL. Source: [lib/feed/live.mjs:1-2, 9, 63-85](lib/feed/live.mjs); [route.js:13-18](app/api/feed/[operation]/route.js)
- Engine: `lib/feed/engine.mjs` (588 lines) is a "Blended interest-discovery feed … Pure; no I/O". Source: [lib/feed/engine.mjs:1-5](lib/feed/engine.mjs)
- Taste vectors: `lib/feed/taste.mjs` (134 lines). Source: [lib/feed/taste.mjs:1-3](lib/feed/taste.mjs)
- DB access: `lib/feed/vectors.mjs` handles "Aiven access for the live test feed: the crawled catalog, image embeddings (content.feed_image_embeddings, halfvec), pgvector nearest neighbours, reader profiles (content.feed_profiles) and the behaviour log (content.feed_events)". Source: [lib/feed/vectors.mjs:1-2](lib/feed/vectors.mjs)
- Text→vector for search: `lib/feed/query-text.mjs`. Source: [live.mjs:4, 181-185](lib/feed/live.mjs)
- Simulator, personas and metrics: `lib/feed/simulator.mjs` (311 lines). Source: [simulator.mjs:155-161, 265-311](lib/feed/simulator.mjs)
- Taxonomy: `lib/feed/taxonomy/*.mjs` (12 legacy DSL files plus `entertainment.mjs`, `index.mjs` and `parse.mjs`). Source: [taxonomy/index.mjs:1-26](lib/feed/taxonomy/index.mjs)
- Feed Lab screen (Recommendations area) lazy-loads the taxonomy, engine and simulator and runs simulated readers. Source: [recommendations/feed_lab.jsx:42-66](components/internal/screens/recommendations/feed_lab.jsx)
- Shared lookups: `FEED_SLOT_MAP`, `FEED_RECENCY_MAP` and `formatPostAge`. Source: [recommendations/constants.js:3-32](components/internal/screens/recommendations/constants.js)
- Offline enrichment: `scripts/kaggle/feed_enrich.py` produces Nomic image embeddings and Qwen vision captions. `scripts/feed-embed.mjs` and `scripts/feed-simulate.mjs` are CLIs (`npm run feed:embed`, `feed:simulate`), and tests run via `npm run test:feed`. Source: package.json `feed:simulate`/`feed:embed`/`test:feed` scripts; [docs/feed-recommendation-design.md:364-368](docs/feed-recommendation-design.md)
- Tests: `tests/feed-engine.test.mjs`, `feed-live.test.mjs`, `feed-taste.test.mjs`, `feed-taxonomy.test.mjs` (directory listing).
- Feed DDL lives in `postgres/migrations/` (13 files, 20260930–20261009), including `20261002234213_feed_embeddings.sql`, `20261003062535_feed_captions.sql` and `20261007000100_entertainment_corpus.sql` (directory listing).
- Design doc: `docs/feed-recommendation-design.md` (381 lines) covers the taxonomy, the corpus, the engine, measurement, embeddings, the live feed and next steps. Source: [docs/feed-recommendation-design.md:1-10, 372-381](docs/feed-recommendation-design.md)
- **The non-feed "recommendation" screens run on CMS content, not the shorts feed:**
  - Diversity Controls is a "live demo over similarity ranking. No stored config yet — caps apply to this demo." It uses `listContent`/`similarContent`. Source: [recommendations/diversity.jsx:25-30, 97](components/internal/screens/recommendations/diversity.jsx)
  - Real-time Ranking is a "session re-rank demo … nothing persists past reload". Source: [recommendations/realtime.jsx:17-23](components/internal/screens/recommendations/realtime.jsx)
  - Models screen says collaborative ranking is "currently a session-based demo". Source: [recommendations/models.jsx:20](components/internal/screens/recommendations/models.jsx)
  - Affinity, collab, content, context, trending, similar and business screens import `@/lib/supabase/content|recommend|topics|variants|decide`. Source: grep of imports in each file (e.g. [affinity.jsx:17-19](components/internal/screens/recommendations/affinity.jsx), [context_rank.jsx:18-21](components/internal/screens/recommendations/context_rank.jsx))
  - Experiments → Bandits is "epsilon-greedy re-weighting from observed rates; Apply writes weights back to the arms". It applies to CMS experiments (`@/lib/supabase/experiments`) with an epsilon slider from 0 to 0.5. Source: [experiments/bandits.jsx:26-37, 130, 156-166](components/internal/screens/experiments/bandits.jsx)

### Inferences
- When the report says "the feed", it means the `lib/feed/*` stack plus the three `screens/feed/*` files and Feed Lab. Bandits, diversity caps and the other Recommendations screens are separate CMS-personalisation demos and should not be counted as feed features.
- `docs/feed-recommendation-design.md` lists crawler files (`lib/feed/crawl/arctic.mjs`, `classify.mjs`, `media.mjs`, `store.mjs`, `crawler.mjs`, `fleet.mjs`, `scripts/feed-crawl.mjs`, `scripts/feed-fleet.mjs`, `scripts/feed-worker.mjs`) [design doc:353-359, 366](docs/feed-recommendation-design.md). None of them appear in `git ls-files` or in the `lib/feed/` directory listing.

### Gaps
- I could not inspect the crawler/curation code (post → step/horizontal/content-type classification) because it is missing from this checkout. How `contentTypes` and `depth` get assigned to records is therefore unverified.
- I did not read `lib/supabase/feed_live.js` (client fetch wrappers), `query-text.mjs` internals, the halfvec migrations, or the test files in detail.

## Q2. What user signals are captured, and how are they stored?

### Takeaway
The feed captures seven event types server-side: like, save, share, comment, dwell, skip and hide. The shorts UI emits only five of them (like, "Not for me"/hide, save, and dwell/skip derived from time on screen). Events are stored raw in `content.feed_events` and folded into JSON state on `content.feed_profiles`. Share, comment, rewatch, scroll velocity, partial-view, unlike/undo, reaction types and clicks on Similar/Reddit/search results are not captured as learning signals.

### Cited Findings
- Server whitelist: `EVENT_TYPES = ["like", "save", "share", "comment", "dwell", "skip", "hide"]`. Each request takes at most 50 events, and `dwellMs` is clamped to 0–600000. Source: [live.mjs:8, 10, 147-151](lib/feed/live.mjs)
- The UI action rail has Like, "Not for me" (hide), Save, Similar, Reddit (opens the permalink) and Insights. There are no share or comment buttons. Source: [shorts_feed.jsx:197-220](components/internal/screens/feed/shorts_feed.jsx)
- Explicit actions count once per item and type, deduplicated by an `item.id:type` set, so they cannot be toggled off. A hide also ends the item's view timing. Source: [use_live_feed.js:22-29, 151-154](components/internal/screens/feed/use_live_feed.js)
- Implicit signals: when the active short changes, the previous one is finalised once as `dwell` if it was on screen for ≥1 s (`SKIP_UNDER_MS = 1000`) and otherwise as `skip`, with `dwellMs` attached. The clock pauses while the tab is hidden. Source: [use_live_feed.js:9-10, 36-57, 140-146](components/internal/screens/feed/use_live_feed.js)
- The active short is the one ≥60% in view (IntersectionObserver threshold 0.6). Source: [shorts_feed.jsx:34-43](components/internal/screens/feed/shorts_feed.jsx)
- Flushing: events are flushed every 3 s and before each next batch is fetched ("Learn from what was just seen before composing the next batch"). The next batch is prefetched when 4 shorts remain. Source: [use_live_feed.js:8, 87-103](components/internal/screens/feed/use_live_feed.js); [shorts_feed.jsx:16-17, 47-49](components/internal/screens/feed/shorts_feed.jsx)
- Each event records the slot (why the item was shown) it came from. Source: [use_live_feed.js:26, 43](components/internal/screens/feed/use_live_feed.js)
- Storage: `content.feed_events(id, profile_id → feed_profiles, post_id text, type text, dwell_ms integer, slot text, metadata jsonb, created_by, created_at, updated_at, deleted_at)`, indexed on `(profile_id, created_at)`. Its stated purpose is "so profiles can be replayed after engine changes". `type` has no check constraint. Source: [postgres/migrations/20261002234213_feed_embeddings.sql:61-75](postgres/migrations/20261002234213_feed_embeddings.sql)
- Insert path: `logEvents` writes post_id, type, dwell_ms, slot and created_at. Source: [vectors.mjs:175-183](lib/feed/vectors.mjs)
- Reader state: `content.feed_profiles(project_id, owner_id, name, state jsonb, taste vector(768), events int, …)`, unique on `(project_id, owner_id, name)`. The table comment reads "engine state (interest tree, frontier, history, taste sums) and the blended taste vector". Source: [feed_embeddings.sql:41-56](postgres/migrations/20261002234213_feed_embeddings.sql)
- Updates run under a row lock (`select … for update`), and both `state` and `taste` are saved. Source: [vectors.mjs:153-173](lib/feed/vectors.mjs)
- Signal → learning weights (`engagementSignal`) as success/weight pairs:

  | Event | Success | Weight |
  |---|---|---|
  | save, share | 1 | 1.6 |
  | like | 1 | 1.2 |
  | comment | 0.9 | 1.2 |
  | hide | 0 | 2.5 |
  | skip | 0 | 0.8 |
  | dwell ≥2500 ms | min(0.85, 0.45 + ms/20000) | 0.7 |
  | dwell <2500 ms | 0.1 | 0.5 |
  | anything else | 0.2 | 0.2 |

  Source: [engine.mjs:212-225](lib/feed/engine.mjs)
- Taste-vector signal: the positive pull is `weight·(success−0.5)·2` when success > 0.5. The negative push is 2.5 for a hide, 0.3 for a skip, and 0 otherwise. Source: [taste.mjs:50-56](lib/feed/taste.mjs)
- Reset soft-deletes the reader's `feed_events` and wipes `state`/`taste`/`events`, but keeps `state.settings`. Source: [vectors.mjs:185-189](lib/feed/vectors.mjs)
- "Similar" and text search only populate the panel (`setExplore`). Clicking a result calls `showSimilar` again and records no event. Source: [use_live_feed.js:156-170](components/internal/screens/feed/use_live_feed.js); [insights_panel.jsx:101](components/internal/screens/feed/insights_panel.jsx)

### Inferences
- Supported: like, save, "not interested" (hide), dwell time and fast skip. Share and comment are accepted by the backend but the UI never emits them, so they are partial.
- Missing: rewatch/loop counts (items are deduplicated and never re-shown, see Q4), scroll velocity, partial visibility, unlike/undo hide, emotion or reaction types, explicit "more like this" as a learning signal, profile clicks, and outbound clicks (the Reddit button is not logged).
- Dwell is a raw ms value with no normalisation for media length. Every item is a still image, so this is reasonable here but would need rework for video.

### Gaps
- I did not verify whether any analytics read `feed_events` beyond replay intent. Grep found no other consumer in `lib/feed`.

## Q3. How is the user's interest profile modelled?

### Takeaway
There are two parallel models. (1) A Bayesian (Beta posterior) interest score per node of the topic tree (topic › subtopic › step › horizontal), with time and per-event decay, a "knowledge depth" frontier per subtopic, and probe bookkeeping. (2) Embedding "taste" channels: up to 8 long-term per-topic vectors (14-day half-life), a short-term "right now" vector (45-minute half-life) and a negative vector (3-day half-life) built from hides and skips. Short-term vs long-term, decay, drift tolerance and negative feedback all exist. Emotion modelling and explicit user-editable interests do not.

### Cited Findings
- User state shape: `{ nodes, frontier, probes, history, seen, events, shown, shownAt }`. Source: [engine.mjs:168-170](lib/feed/engine.mjs)
- Learning spreads up the tree on every event with weights horizontal 1, step 0.9, subtopic 0.8, topic 0.6, plus a global `__all__` node. Source: [engine.mjs:227-237](lib/feed/engine.mjs)
- Interest is relative. Each node's Beta posterior is shrunk toward the user's own global rate (`priorStrength: 3`, `globalPrior {a:1,b:4}`), and `lift = mean/global`. Source: [engine.mjs:38-44, 190-210](lib/feed/engine.mjs)
- Decay has two parts. Time decay uses `halfLifeMs: 5 days`. Per-event forgetting uses `eventDecay: 0.994`, described as "so a shift in taste shows up within a session, not days later". Source: [engine.mjs:34-37, 182-188](lib/feed/engine.mjs)
- Per-slot performance is tracked as `__slot__:<slot>` nodes, i.e. how well each source (similar/core/explore…) earns engagement. Source: [engine.mjs:238-243](lib/feed/engine.mjs)
- Knowledge depth / funnel: `frontier[subtopic]` is the deepest known step. Engaging (success ≥0.6) with something deeper than the frontier advances it (`advanceOnProbeLikes: 1`). A miss sets a cooldown of `probeCooldownShown 12 × misses (cap 3)` impressions. Source: [engine.mjs:25-33, 244-261](lib/feed/engine.mjs)
- Taste config: long-term half-life 14 d (eventDecay 0.998), short-term 45 min (0.88), negative 3 d (0.99), `readyWeight 8`, `maxTopics 8`, `queryTopics 3`, `minTopicWeight 1.5`, `negativeBlend 0.2`. Each long-term vector is per topic "so two loves don't average into neither". Source: [taste.mjs:6-17](lib/feed/taste.mjs)
- Recording taste: a positive event adds the item's embedding to its topic's long-term channel and to the short-term channel. If more than 8 topics exist, the weakest is evicted. A negative event adds to the negative channel. Source: [taste.mjs:59-76](lib/feed/taste.mjs)
- Query vectors: the top 3 topic channels by decayed weight, each pushed away from the negative vector, plus a `recent` short-term vector. Readiness = min(1, total weight / 8). Source: [taste.mjs:80-97](lib/feed/taste.mjs)
- The blended user embedding (weighted sum of interest vectors) is stored in `feed_profiles.taste`. Source: [live.mjs:36-42, 164](lib/feed/live.mjs); [vectors.mjs:162](lib/feed/vectors.mjs)
- Profile summary exposed to the client contains:
  - top topics (interest, lift, evidence)
  - top subtopics (interest, lift, `knowledgeDepth`)
  - `circlingIndex`, `entropy`, and `recentSlots` over the last 50
  - taste readiness, interests, and a `recent` flag

  Source: [engine.mjs:576-588](lib/feed/engine.mjs); [live.mjs:99-107](lib/feed/live.mjs)
- Multiple named readers ("personas") are supported per user and project. The name is capped at 40 chars, and each reader has its own interests, taste vectors and history. Source: [route.js:20](app/api/feed/[operation]/route.js); [vectors.mjs:134-151](lib/feed/vectors.mjs); [insights_panel.jsx:114-121](components/internal/screens/feed/insights_panel.jsx)
- Interest drift is tested in simulation, not detected live. The simulator has drifting personas (`shiftAt`/`later`), e.g. "Gamer whose interest shifts to Formula 1" at batch 25. Source: [simulator.mjs:87-90, 160, 163-165](lib/feed/simulator.mjs)
- Rabbit holes: the legacy "edgy" pool comment says "Steps run mild → edgy, so depth doubles as intensity". There is a legacy persona "Opens one cursed meme and keeps going deeper" and one "Hooked on rage bait, then tires of it and drifts into home improvement". Source: [taxonomy/edgy.mjs:1-3](lib/feed/taxonomy/edgy.mjs); [simulator.mjs:135-152](lib/feed/simulator.mjs)
- The **active** taxonomy (`entertainment-v2`) flattens every subject to a single step at `depth: 1`: "Content types are independent tags, not levels of expertise". Validation enforces "subjects cannot be an expertise ladder". Source: [taxonomy/entertainment.mjs:1-3, 64-65](lib/feed/taxonomy/entertainment.mjs); [taxonomy/index.mjs:98](lib/feed/taxonomy/index.mjs)
- The live feed loads `loadTaxonomy()`, which returns the entertainment tree, not `loadLegacyTaxonomy()`. Source: [live.mjs:6, 80-81](lib/feed/live.mjs); [taxonomy/index.mjs:43-54](lib/feed/taxonomy/index.mjs)
- Feed Lab's own impression hint reads "Entertainment subjects are equally accessible". Source: [feed_lab.jsx:113](components/internal/screens/recommendations/feed_lab.jsx)

### Inferences
- Short-term vs long-term interest: **supported**. Decay / interest drift adaptation: **supported implicitly** through decay and the 45-minute short-term channel. There is no explicit drift detector and no user-facing drift control.
- Knowledge depth / funnel ("walk one step deeper"): **implemented in the engine but inert in the live feed**. With entertainment-v2 every subtopic has `maxDepth = 1`, so the probe-target condition `frontier >= sub.maxDepth` always skips ([engine.mjs:449-450](lib/feed/engine.mjs)). The depth funnel only works with the legacy 4-step tree (simulator/legacy personas).
- Rabbit-hole / intensity escalation: exists only as legacy taxonomy and simulator personas. The live corpus has no intensity dimension.
- Emotion / reaction-type modelling: **missing**. There is no event type or item attribute for tone or emotion (see Q5).
- Users cannot view or edit their interests directly beyond reset. There is no "follow topic" and no "mute topic"; the only per-item way to suppress content is hide.

### Gaps
- The real distribution of profile states in production (`feed_profiles`) was not queried. This audit is read-only.

## Q4. How is ranking computed? What knobs, bandits, diversity and novelty exist?

### Takeaway
Each batch of 10 is slot-based. Slot quotas (core/adjacent/explore/fresh plus an embedding "similar" slot) blend from a cold mix to a warm mix as evidence grows. Candidates come from Thompson sampling over the topic tree, optimistic upper-bound exploration, topic-graph "bridges", a freshness pool and pgvector nearest neighbours. A constraint-based arranger then enforces spacing and diversity. About 40 parameters exist in `DEFAULT_CONFIG`, but the only end-user knob is **recency** (balanced/fresh/latest).

### Cited Findings
- Batch size is 10. `warmMix {core .5, adjacent .25, explore .15, fresh .1}` and `coldMix {core .15, adjacent .15, explore .6, fresh .1}`, with ±0.06 `mixJitter`. The mix warms after 40 events and once the interest pool has 8 units of evidence. Source: [engine.mjs:7-17, 288-301](lib/feed/engine.mjs)
- Similar slot: share 0.45 (up to 0.6 max), scaled by taste readiness and by "similar trust" (how the similar slot performs vs the reader's overall rate once it has ≥4 evidence, clamped 0.25–1.2). Source: [engine.mjs:59-65, 434-437](lib/feed/engine.mjs)
- Similar candidates come from pgvector cosine HNSW search: 150 neighbours per interest vector, 40 for the recent vector, excluding the last 500 seen. Source: [live.mjs:11-12, 87-97](lib/feed/live.mjs); [taste.mjs:101-106](lib/feed/taste.mjs); [vectors.mjs:16-38](lib/feed/vectors.mjs)
- `pickSimilar` filters out items past the reader's depth frontier and subtopics the reader avoids (evidence ≥3 and lift <0.6). It samples with a softmax on similarity (temperature 0.04) × fatigue, capped at 1 per horizontal and 2 per subtopic. Source: [engine.mjs:395-419](lib/feed/engine.mjs)
- Core slot uses **Thompson sampling** (Beta draws) over the interest pool, damped by fatigue: "Thompson sampling over a topic pool, damped by fatigue". The interest pool contains topics with lift ≥1.15 and evidence ≥2, up to 6 topics. Source: [engine.mjs:356-371, 430-433, 456-467](lib/feed/engine.mjs)
- Probes: with probability `probeRate·2` per core draw, the engine picks one step deeper in a subtopic whose lower confidence bound beats baseline × 1.35. Probes must be at least 4 positions apart. Source: [engine.mjs:26-29, 40-41, 445-461, 532-535](lib/feed/engine.mjs)
- Adjacent ("bridge") slot: picks a neighbour of an interest topic via `topicLinks`, kept at depth ≤2. Links come from authored `related` lists (weight 1 forward, 0.6 back) plus optional crawled edges. Live passes no crawled edges. Source: [engine.mjs:151-163, 468-478](lib/feed/engine.mjs); [live.mjs:81](lib/feed/live.mjs)
- Explore slot is optimistic (upper bound `optimismZ 1.5`): weight `(upper/global)^3 / (1+0.3·evidence) × fatigue² × 0.25^(already in batch)`. Source: [engine.mjs:42-43, 479-490](lib/feed/engine.mjs)
- Fresh slot draws the newest unseen items, depth ≤`freshMaxDepth`, with an optional age cap and a bias toward the newest. Source: [engine.mjs:47-56, 491-498](lib/feed/engine.mjs)
- Within-horizontal item score is `freshness·0.6 + log-popularity·0.4 + jitter·0.25`, where freshness has a 45-day half-life and popularity is the Reddit `score`. Source: [engine.mjs:47-49, 57, 311-329](lib/feed/engine.mjs)
- Horizontal rotation prefers horizontals that are least recently shown (ramp over 20 min), weighted by interest and fatigue. Source: [engine.mjs:331-342](lib/feed/engine.mjs)
- Diversity / anti-circling rules:
  - never the same horizontal back-to-back
  - a 6-item window allows ≤3 per topic and ≤2 per subtopic
  - max run of 2 for the same topic
  - ≤3 of one topic per batch
  - fatigue `exp(−0.18·count in last 30)`
  - reserve picks from topics outside the recent window
  - the arranger relaxes topic caps only as a last resort, and never the back-to-back rule

  Source: [engine.mjs:18-24, 45-46, 282-286, 499-555](lib/feed/engine.mjs)
- Dedupe: `seen` keeps up to 5000 IDs, and seen items are never picked again. Source: [engine.mjs:265-277, 319-329](lib/feed/engine.mjs)
- Diversity analytics: `circlingIndex` (share of the top 3 topics in the last 50 impressions) and `topicEntropy`. Source: [engine.mjs:557-574](lib/feed/engine.mjs)
- Seeded RNG makes simulations reproducible. The live feed seeds with `now`. Source: [engine.mjs:78-117](lib/feed/engine.mjs); [live.mjs:126](lib/feed/live.mjs)
- Explanations: each item carries a `slot` and a human `reason`, e.g. "quiet probe one step deeper…", "bridge from X to Y", "close to images you engage with (87% similar)", "fresh — posted 3d ago". Source: [engine.mjs:380-387](lib/feed/engine.mjs); [live.mjs:130](lib/feed/live.mjs)
- Recency presets (the only user setting):
  - `balanced: {}`
  - `fresh` = freshShare 0.25, 20-day half-life, max age 30 d
  - `latest` = freshShare 0.45, 7-day half-life, max age 7 d, freshMaxDepth 3

  Source: [engine.mjs:68-76](lib/feed/engine.mjs)
- `cleanSettings` accepts only `recency`, and unknown modes throw `FeedSettingsError` (HTTP 400). Settings survive reset. Source: [live.mjs:44-56, 135-144](lib/feed/live.mjs); [route.js:24, 64](app/api/feed/[operation]/route.js); [vectors.mjs:187-188](lib/feed/vectors.mjs)
- Changing recency is optimistic in the UI. It truncates the unviewed shorts after the current one and loads a new batch in the new mode. Source: [use_live_feed.js:172-189](components/internal/screens/feed/use_live_feed.js)
- Feed Lab exposes reader persona, recency, batches and seed as simulation inputs. Source: [feed_lab.jsx:163-186](components/internal/screens/recommendations/feed_lab.jsx)

### Inferences
- Bandits: **supported internally** through Thompson sampling over topics and subtopics, UCB-style optimistic exploration, and adaptive similar-slot share from per-slot performance. None of it is user-tunable. The Experiments → Bandits screen (epsilon-greedy) is unrelated to the feed.
- Exploration vs exploitation: **supported internally** (cold→warm mix, explore slot, probes). There is no user-facing "explore more / less" slider. Only `recency` is plumbed through `settings`, but `composeFeed` already accepts arbitrary config overrides ([engine.mjs:424-427](lib/feed/engine.mjs)). Exposing more knobs (similarShare, mixes, fatigueStrength, probeRate) would mainly mean extending `cleanSettings`, adding presets, and adding UI.
- Diversity and novelty: strong built-in controls, all hard-coded. Freshness/recency is the only one exposed.
- Missing: per-topic boost or mute, a "serendipity" level, a session-intent mode (e.g. "learn" vs "relax"), time-of-day context, and a user-controlled depth/difficulty preference.

### Gaps
- Tuned values have not been validated on real reader data. The design doc lists "tune `similarShare` / taste half-lives from the live feed's `feed_events`" as a next step. Source: [design doc:374-375](docs/feed-recommendation-design.md)

## Q5. What is the content corpus and taxonomy? What metadata exists per item?

### Takeaway
The corpus is Reddit image posts (internal test data only, fetched from the Arctic Shift archive). The active taxonomy is `entertainment-v2`: 6 areas → 37 subjects (each mapped to subreddits) × 8 content-type "horizontals" (announcement, meme, art, discussion, analysis, highlight, collection, general), all at depth 1. A legacy 78-topic tree (topic › 5 subtopics › 4 depth steps › 5 horizontals, including "personal" and "edgy" pools) is still in the repo but is not used by the live feed. Per-item metadata covers topic, subject, content type, subreddit, title, Reddit score, timestamps, a 768-d Nomic image embedding, and a VLM caption (description, tags, subjects, setting, style, visible text). There are no difficulty, tone or emotion fields.

### Cited Findings
- Purpose: "Buyers bring their own content. The Reddit corpus described here is **internal test data**… not shipped or redistributed." Source: [design doc:8-9](docs/feed-recommendation-design.md)
- Source and rules:
  - collected from the Arctic Shift archive
  - image posts only
  - "videos, NSFW, spoilers, crossposts, deleted authors and removed posts are skipped"
  - links and metadata only, no image bytes
  - legacy target was 25 images per horizontal → 150,000

  Source: [design doc:44-61](docs/feed-recommendation-design.md)
- Active taxonomy `TAXONOMY_VERSION = "entertainment-v2"`, with `CONTENT_TYPES = ["announcement","meme","art","discussion","analysis","highlight","collection","general"]`. Source: [taxonomy/entertainment.mjs:2-3](lib/feed/taxonomy/entertainment.mjs)
- Areas and subjects:
  - Movies & TV (6): Marvel, Star Wars, DC, Horror, Television, Indian Cinema
  - Anime & Manga (7): Classroom of the Elite, One Piece, Naruto, Dragon Ball, JJK, Demon Slayer, Anime Community
  - Gaming (7): Minecraft, GTA, Counter-Strike, Pokemon, Fortnite, Valorant, Elden Ring
  - Music (6): Pop, Hip-Hop, K-Pop, Rock & Alt, Taylor Swift, Indian Music
  - Sports (6): Football, Basketball, Cricket, F1, Tennis, Wrestling
  - Creators & Internet Culture (5): Internet Humor, Streaming, YouTube, Pop Culture, Cosplay

  Each area lists `related` areas, and each subject lists its subreddits. Source: [taxonomy/entertainment.mjs:4-54](lib/feed/taxonomy/entertainment.mjs)
- Each subject is projected to one step `content` (depth 1) with 8 content-type horizontals. Source: [taxonomy/entertainment.mjs:56-70](lib/feed/taxonomy/entertainment.mjs)
- Dataset versioning: `content.feed_datasets` has a taxonomy_version, a date window limited to 2026-08-01…2026-11-01, `per_subject_month`, and a single `active` flag. `feed_taxonomy_nodes` holds area and subject kinds. Selected items go to `feed_dataset_items` (record jsonb). The `content.feed_active_images` view overlays the active dataset's labels and falls back to legacy images when no dataset is active. Source: [postgres/migrations/20261007000100_entertainment_corpus.sql:3-73](postgres/migrations/20261007000100_entertainment_corpus.sql)
- Legacy tree: "60 core + 8 personal-interest + 10 edgy topics", `LEGACY_SHAPE {topics 78, subtopics 5, steps 4, horizontals 5}`. The edgy pool is smaller (3×4×3, capped at 10 images). Pools are main, personal and edgy. Source: [taxonomy/index.mjs:17-26](lib/feed/taxonomy/index.mjs)
- Legacy DSL: `# Topic {id} > related @subs`, `## Subtopic @subs`, `- Step @sub @!dedicated ~ keywords`, `Horizontal: kw, flair=…`. Step depth is its position (1–4). Source: [taxonomy/parse.mjs:1-6, 57-71](lib/feed/taxonomy/parse.mjs)
- First legacy crawl (2026-10-01→02): 955 subreddits checked, 549 topic-bridge edges, 9,085 images across 60 topics with depth split 3,035 / 2,531 / 1,551 / 1,968. Source: [design doc:163-173](docs/feed-recommendation-design.md)
- Raw crawl table: `content.feed_crawl_images(post_id unique, image_url unique, path, topic_id, depth, posted_at, record jsonb, …)`. Source: [postgres/migrations/20261002051849_feed_crawl_fleet.sql:43-61](postgres/migrations/20261002051849_feed_crawl_fleet.sql)
- Catalog item fields mapped from the record: id, title, imageUrl, subreddit, topicId, subtopicId, subjectPath, contentTypes, taxonomyVersion, datasetId, stepId, depth, horizontalId, createdAt, score. Source: [simulator.mjs:66-84](lib/feed/simulator.mjs)
- At load time the catalog adds `embedded`, caption `description`, `tags` (contentTypes ∪ caption tags), topic/subtopic/horizontal names and permalink. Items deleted on Reddit (embedding 404/410) are excluded. Source: [vectors.mjs:48-80](lib/feed/vectors.mjs)
- Client-facing item view: id, imageUrl, title, subreddit, permalink, topic/subtopic IDs and names, horizontalName, depth, createdAt, embedded, description, tags, subjectPath, contentTypes, taxonomyVersion. Source: [live.mjs:14-34](lib/feed/live.mjs)
- Embeddings: model `nomic-embed-vision-v1.5` with aligned text model `nomic-embed-text-v1.5`, 768 dimensions. Stored in `content.feed_image_embeddings` (vector(768), HNSW cosine index; later migrations switch to halfvec). Source: [vectors.mjs:5-8](lib/feed/vectors.mjs); [feed_embeddings.sql:16-36](postgres/migrations/20261002234213_feed_embeddings.sql); migration filenames `20261003181739_feed_embeddings_drop_hnsw.sql`, `20261003181740_feed_embeddings_halfvec.sql`
- Captions: a Qwen vision LLM is prompted to return `description`, 5–10 `tags`, `subjects`, `setting`, `style` (photo | screenshot | meme | artwork | diagram | other) and readable `text`. These are stored in `content.feed_image_captions(description, tags text[], data jsonb)`. Source: [scripts/kaggle/feed_enrich.py:333-347](scripts/kaggle/feed_enrich.py); [feed_captions.sql:1-33](postgres/migrations/20261003062535_feed_captions.sql)
- Only the caption `description` and `tags` are loaded into the catalog. `data` (subjects/setting/style/text) is not selected. Source: [vectors.mjs:54-59, 70-72](lib/feed/vectors.mjs)

### Inferences
- Topic/subtopic metadata: **present**. Format/content-type: **present** (8 types as horizontals plus the caption `style`).
- Depth/difficulty: **absent in the active corpus**; it was present in the legacy tree.
- Tone/emotion/intensity: **absent**. The closest proxies are the legacy "edgy" pool and content types like "meme". Caption `style`/`subjects` exist in the DB but the ranker ignores them.
- The corpus is image-only and sourced from Reddit. Video-specific signals such as completion rate and rewatch don't apply yet.

### Gaps
- Active dataset size and per-subject counts are not in the code. They would require querying `feed_datasets`/`feed_active_images` (`vectors.status()` returns them at runtime, [vectors.mjs:104-132](lib/feed/vectors.mjs)).
- How `contentTypes` are assigned to a post is unverified because the classifier code is not in the checkout.

## Q6. What does the insights panel display to the user?

### Takeaway
The panel is a transparency and testing surface. It shows session stats, a recency switch (the only tuning control), the learned taste-interest weights and the top subtopics by lift, text/image similarity exploration, and reader-persona switching and reset. The shorts themselves show a slot badge with the reason, depth, post age, topic and content type.

### Cited Findings
- "This session" stats:
  - Events learned (with N shown)
  - Taste readiness % (with N interest vectors)
  - Similar share (similar-slot share of the last 50 shown)
  - Embedded images of the total

  Source: [insights_panel.jsx:52-60](components/internal/screens/feed/insights_panel.jsx)
- "Recency": `SegmentedTabs` for Balanced / Fresh / Latest with a description ("How strongly this reader's feed favours the newest posts."). Source: [insights_panel.jsx:62-67](components/internal/screens/feed/insights_panel.jsx); [constants.js:15-22](components/internal/screens/recommendations/constants.js)
- "What it's learning" ("Taste vectors pull the similar items; the topic tree drives the rest.") shows:
  - a bar per taste interest topic with its weight
  - up to 6 subtopics with "N.NN× interest" lift
  - empty-state copy: "Like, save, linger on or skip a few images and the profile appears here."

  Source: [insights_panel.jsx:68-87](components/internal/screens/feed/insights_panel.jsx)
- "Explore by similarity": a free-text query (text → image search over the shared Nomic space) and "Similar" (image → image). Results appear as a 3-column grid with a similarity % per result. Source: [insights_panel.jsx:88-113](components/internal/screens/feed/insights_panel.jsx); [live.mjs:171-185](lib/feed/live.mjs)
- "Reader": a name field ("Switch to test another persona."), Open, and Reset. Source: [insights_panel.jsx:114-122](components/internal/screens/feed/insights_panel.jsx)
- On-card transparency:
  - slot badge (Similar / Interest / Probe / Bridge / Explore / Fresh) with the reason as tooltip
  - "depth N · Xd ago"
  - subreddit and topic chip
  - caption description and hashtags
  - footer line "subtopic · content type — reason"

  Source: [shorts_feed.jsx:149-186](components/internal/screens/feed/shorts_feed.jsx); [constants.js:3-11](components/internal/screens/recommendations/constants.js)
- A hidden item shows the overlay "Hidden — the feed will show less like this." Source: [shorts_feed.jsx:166-168](components/internal/screens/feed/shorts_feed.jsx)
- The header shows the "Live test" badge, the reader name and the embedded-image count. Source: [shorts_feed.jsx:87-91](components/internal/screens/feed/shorts_feed.jsx)
- Feed Lab (workspace screen, simulation only) shows:
  - engagement early→late
  - interest share
  - circling index
  - topics per batch
  - impressions
  - median post age
  - an engagement-over-time chart
  - slot mix
  - a colour-coded feed timeline
  - the learned profile table

  Source: [feed_lab.jsx:109-115, 192-245](components/internal/screens/recommendations/feed_lab.jsx)

### Inferences
- The panel does not show data the summary already returns: tree `topics` (interest/lift/evidence), `circlingIndex`, `entropy`, subtopic `knowledgeDepth`, or the taste `recent` flag ([engine.mjs:577-587](lib/feed/engine.mjs); [live.mjs:105](lib/feed/live.mjs)). These are cheap additions for a "your algorithm" view.
- The panel is read-only apart from recency, reader and reset. Users cannot edit or remove a learned interest, pin a topic, or adjust exploration, diversity or similar share. Search and Similar results do not feed back into the profile.
- The panel is hidden below the `md` breakpoint (`hidden … md:block`), so there is no mobile insights view. Source: [shorts_feed.jsx:139-143](components/internal/screens/feed/shorts_feed.jsx)

### Gaps
- None material. The panel's behaviour is fully visible in the three feed component files.
