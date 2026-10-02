# Blended interest feed — design

How Geiger Content tests an Instagram-style recommendation feed: a reader is shown a
blended mix of topics, the engine quietly learns what they care about and how much they
already know, and walks them one step deeper at a time — without the feed ever feeling
like it is circling the same few topics.

Buyers bring their own content. The Reddit corpus described here is **internal test data**
for exercising the engine and its analytics; it is not shipped or redistributed.

## 1. The topic tree

`lib/feed/taxonomy/` defines the content space every item is placed in:

| Level | Count | Example |
|---|---:|---|
| Topic | 60 | PC Building |
| Subtopic | 5 per topic (300) | Cooling |
| Step (depth 1 → 4) | 4 per subtopic (1,200) | Air coolers → AIO liquid coolers → Custom loops → Hardline & exotic cooling |
| Horizontal | 5 per step (6,000) | Custom loops: First loops · Budget loops · High-end loops · Leaks & fails · Finished loops |

Steps are the **funnel**: depth 1 is what a newcomer recognises, depth 4 is enthusiast
territory. Horizontals are **angles on the same step** (cheap, fancy, fails, how-to…) so a
reader deep in one step still sees variety.

Topics cover tech & gaming, vehicles, food & drink, home, pets, outdoors, sports, arts &
crafts, style, and culture. Each topic lists `related` topics; these form the **bridge
graph** the feed uses to drift between neighbouring interests (PC Building ↔ Desk Setups ↔
Mechanical Keyboards). The crawl adds measured bridges from subreddit sidebars.

The tree is written in a small DSL (one line per step, its horizontals on the next):

```
# PC Building {pc-building} > gaming, desk-setups @buildapc @pcmasterrace
## Cooling @buildapc @watercooling
- Custom loops @!watercooling @pcmasterrace ~ custom loop, watercooled, loop
  First loops: first loop, first custom | Budget loops: budget, cheap, bykski | …
```

`@sub` is a source subreddit; `@!sub` means the whole subreddit is about that step (no step
keyword needed there); `~` lists step keywords; `flair=Text` matches a post flair.
`npm run feed:plan` and `tests/feed-taxonomy.test.mjs` enforce the exact 60×5×4×5 shape.

## 2. The test corpus (Reddit via Arctic Shift)

Target: **25 images per horizontal → 150,000 images**. Reddit's own API now requires manual
approval for every new app (Responsible Builder Policy), so the crawler reads the public
[Arctic Shift](https://github.com/ArthurHeitmann/arctic_shift) archive, which is near
real-time (newest posts are minutes old) and needs no key.

### Rules

- **Newest first, hard floor 2025-01-01.** Every query walks backwards from now; nothing
  older than 1 Jan 2025 is ever collected (`DATE_FLOOR`, enforced by `resolveFloor`). A
  horizontal that cannot reach 25 inside that window is reported as short, not back-filled.
- **Links and metadata only.** No image bytes are downloaded; each record stores the image
  URL (largest rendition ≤1080 px), gallery images, title, flair, score, author, permalink,
  timestamps and its full tree path. 150k records is a few hundred MB of JSONL.
- **Image posts only.** Direct `i.redd.it`/`i.imgur.com` images and galleries; videos, NSFW,
  spoilers, crossposts, deleted authors and removed posts are skipped. Text-only subreddits
  (`submission_type: "self"`, e.g. r/buildapc, r/Cooking) are detected from metadata and skipped.

### Phases (`scripts/feed-crawl.mjs`)

1. **graph** — subreddit metadata (subscribers, category, image permissions) and sidebar
   `r/` links for all ~955 subreddits; links between subreddits of different topics become
   weighted topic bridges in `graph.json`, plus suggested subreddits per topic.
2. **collect / scan** — page each subreddit newest-first (100 posts/request, light fields),
   classify every image post against the steps that use that subreddit, hydrate the matches
   (`/api/posts/ids`) for gallery/preview data, keep those with a usable image. Dedicated
   subreddits are scanned deeper (150 pages) than shared ones (20 pages). **Breadth first:**
   a subreddit pauses after `--dry-pages` (12) pages in a row that add nothing, so a rare
   horizontal can't drag one subreddit back to 2025 while other topics wait; `--deep`
   digs that long tail in a later part.
3. **collect / search** — for steps still short, keyword searches (`title=`/`link_flair_text=`)
   inside their subreddits. Keyword search is heavy for the archive: it is skipped on
   subreddits over 2M members, retried at most twice, and a subreddit that times out is
   marked blocked so later queries skip it.
4. **report** — `report.md`/`report.json`: images per topic and depth, horizontals at
   target, short horizontals, text-only and missing subreddits, run history.

**Classification** (`lib/feed/crawl/classify.mjs`): a post matches a step if its subreddit
is dedicated to the step or its title/flair contains a step keyword; it then goes to the
horizontal with the longest matching keyword. Keyword-matched steps beat dedicated-only
matches, then longer keywords, then deeper steps. Full horizontals are skipped so a post
lands in the next best match. Matching is whole-word with plurals (`loop` → `loops`, not
`loophole`). Every record keeps `matched` (e.g. `title:custom loop`, `flair:build complete`)
for auditing.

### Running it in parts

Everything is resumable: cursors live in `data/feed-corpus/state.json`, collected records
in `data/feed-corpus/manifest/part-*.jsonl` (the manifest is the source of truth for
counts). Stop at any time (Ctrl-C saves after the current request) and re-run the same
command to continue.

```bash
npm run feed:plan                                   # tree + target summary (offline)
npm run feed:graph                                  # subreddit metadata + bridges
npm run feed:crawl -- --max-minutes 120             # one 2-hour part
npm run feed:crawl -- --topics pc-building,coffee   # only some topics
npm run feed:crawl -- --phase search --max-requests 2000
npm run feed:report                                 # coverage report (offline)
```

**Rate limits.** The archive limits dynamically and answers `422 "Timeout. Maybe slow down
a bit"` with an `X-RateLimit-Reset` header. The client keeps ≥1.2 s between requests,
waits out the reset window (exponential fallback, capped at 2 min), and appends every wait
to `data/feed-corpus/ratelimit.log` so runs can be sized: observed so far, roughly one
~60 s wait per 25 metadata requests and frequent timeouts on keyword search in very large
subreddits. `--max-requests` and `--max-minutes` split a crawl into parts.

### Crawling from many machines (fleet)

Arctic Shift limits per IP, so parallel crawlers only help from different IPs. The fleet
moves the crawl state into a shared queue on the Aiven Postgres (`content.feed_crawl_*`,
migration `postgres/migrations/20261002051849_feed_crawl_fleet.sql`), so any number of
machines split the remaining work:

- **Tasks** — one row per walk (858 subreddit scans, 6,391 keyword searches), seeded from
  the topic tree plus the local cursors. A worker leases one task (`for update skip locked`,
  15-minute lease renewed every page), walks a slice (20 scan / 6 search pages, pausing after
  12 dry pages) from the saved cursor, then hands it back for a later round. Breadth first:
  lowest round, scans before searches, most productive first. A crashed worker's lease
  expires and the next worker resumes from the last saved page.
- **No double storage** — `content.feed_crawl_ingest()` stores an image only if its post and
  image URL are new and its horizontal is under 25, locking the per-path counter so the cap
  holds across workers.
- **Failures** — a failed scan page is retried 10 min later (`failed` after 8 tries); a
  keyword query that fails twice blocks keyword search on that subreddit. `requeue` resets both.
- **Worker login** — machines connect as `feed_worker`, which can only touch the crawl tables.

```bash
npm run vector:db:push               # once: queue tables + feed_worker role
npm run feed:fleet -- seed           # queue tasks, upload the local corpus + cursors (idempotent)
npm run feed:fleet -- build          # -> data/feed-fleet/feed-worker.mjs (one file, credentials baked in)
node feed-worker.mjs                 # on each machine (Node 18+, one per IP); --max-minutes, --name
npm run feed:fleet -- status         # images, queue, live workers and their rates
npm run feed:fleet -- pull           # copy fleet images into the local manifest for Feed Lab
npm run feed:fleet -- requeue        # retry blocked/failed tasks
```

First fleet test (one machine, 4 min): 360 images, 175 requests, no rate-limit waits.

### First crawl (2026-10-01 → 02)

| | |
|---|---|
| Subreddits checked | 955 — 869 usable, 56 text-only, 30 missing/private |
| Topic bridges measured | 549 weighted edges (e.g. camping→hiking 41, home-cooking↔world-cuisines 34) |
| Steps rewired | 24 steps whose only sources were text-only/missing now point at image subreddits |
| Images collected | **9,085** across all 60 topics (depth 1/2/3/4: 3,035 / 2,531 / 1,551 / 1,968), 4,507 galleries |
| Date range | 2025-01-03 → 2026-10-02 (floor held) |
| Requests / rate-limit waits | ~2,100 requests; 43 waits of ~50 s (all `422 Timeout`, one `520`) |
| Throughput | ~1,800 images/h on deep scans, ~6,700/h on a 1–3 page newest-posts sweep |

The first pass was deliberately shallow-and-wide: PC Building, Video Games and Retro Gaming
got a full scan, the other 57 topics a newest-posts sweep (1 page per shared subreddit,
3 per dedicated). Median topic: 117 images (thinnest: snow sports 26, overlanding 27,
travel 35). Next parts, from the same cursors:

```bash
npm run feed:crawl -- --phase scan --max-minutes 240          # deepen every topic
npm run feed:crawl -- --phase scan --deep --max-minutes 240   # long tail back to 2025-01
npm run feed:crawl -- --phase search --max-minutes 120        # keyword fill for short steps
```

## 3. The feed engine (`lib/feed/engine.mjs`)

Pure functions, no I/O: `composeFeed(state, index)` builds a batch; `markShown` records it;
`recordEvent(state, item, event)` learns from likes, saves, shares, comments, dwell, skips
and hides.

### What it learns

- **Interest per tree node** (topic, subtopic, step, horizontal) from engagement, spread up
  the path with diminishing weight (horizontal 1.0 → topic 0.6). Each node is shrunk toward
  **the reader's own overall engagement rate** (empirical Bayes), so interest is measured as
  **lift**: a topic engaged with at 30% by someone who engages with 8% of everything is a
  strong interest; one lucky like is not.
- **Forgetting.** Evidence decays with time (5-day half-life) and per event (0.994), so a
  shift in taste shows up within a session.
- **Knowledge depth per subtopic** (the *frontier*, 1–4): how deep the reader is known to be
  comfortable. It advances only when the reader engages with something one step deeper.

### How a batch is composed

Each batch of 10 mixes five slot types:

| Slot | Warm share | What it is |
|---|---:|---|
| Interest (core) | ~50% | Thompson-sampled from the reader's interest pool, at their frontier depth |
| Probe | inside core | one step past the frontier in a clearly liked subtopic |
| Bridge (adjacent) | ~25% | a neighbouring topic via the bridge graph, kept shallow (depth ≤ 2) |
| Explore | ~15% | optimistic re-testing: topics whose upper confidence bound looks good but lack evidence |
| Fresh | ~10% | newest unseen items anywhere, shallow |

The mix starts exploratory (60% explore) and warms only as fast as the interest pool gains
evidence, and the shares jitter ±6% every batch so there is no visible rhythm.

### Why it never feels like it is circling

- **Spacing rules** at assembly: never the same horizontal back to back; at most 2 items of
  one subtopic and 3 of one topic in any window of 6; at most 2 of a topic in a row and 3 per
  batch. A reserve of shallow picks from topics outside the recent window lets thin catalogs
  keep the rules; they relax only when nothing at all fits — never the same-horizontal rule.
- **Fatigue**: a topic/subtopic/horizontal shown a lot in the last 30 impressions is damped
  even if loved, then returns.
- **Bridges** move the feed between neighbouring topics instead of jumping.
- **Horizontal rotation** inside a step (least recently shown first, weighted by interest):
  deep interest in custom loops still alternates budget builds, fails, showcases, how-tos.
- **Quiet probes**: never closer than 4 items apart, only for subtopics whose *lower*
  confidence bound clears 1.35× lift; a skipped probe backs off for 12–36 impressions.
- **Jitter** on item scores (freshness 45-day half-life + popularity) so order is never fixed.

### The funnel, concretely

An AIO owner who has only heard of custom loops: the engine sees cooling engagement, probes
AIO content (depth 2) → accepted, frontier 2 → probes custom loops (depth 3) → the reader
lingers and saves → frontier 3, custom-loop horizontals rotate (budget, high-end, fails,
finished builds) → later probes hardline/exotic cooling (depth 4). A casual reader who
never engages past the basics is not pushed.

## 4. Measuring it

`lib/feed/simulator.mjs` runs synthetic readers with hidden tastes and knowledge through the
engine (`npm run feed:simulate`, and the **Recommendations → Feed Lab** screen). Metrics:
engagement and interest share early → late, circling index (share of the top 3 topics in
the last 50 impressions; lower is fresher), distinct topics per batch, longest same-topic
run, spacing violations, probes accepted, focus-subtopic depth and batches to reach it.

Synthetic catalog (12 items per horizontal), 60 batches × 10, 8 seeds:

| Reader | Interest share (late) | Found | Circling | Topics / batch | Spacing violations | Focus depth per seed |
|---|---|---:|---:|---:|---:|---|
| AIO owner → custom loops | 0.45–0.57 | 8/8 | 0.46–0.58 | 7.0–8.2 | 0 | 4 4 4 4 4 4 4 4 |
| Casual foodie | 0.60–0.68 | 8/8 | 0.48–0.62 | 6.8–7.5 | 0 | stays broad (by design) |
| Outdoor dog owner | 0.55–0.62 | 8/8 | 0.54–0.64 | 7.0–7.6 | 0 | 1 1 4 4 4 4 4 4 |
| Wide explorer (no interests) | — | — | 0.36–0.54 | 7.6–8.7 | 0 | — |
| Shifting taste (gym → running) | 0.53–0.62 | 8/8 | 0.50–0.64 | 7.0–7.8 | 0 | 4 2 4 1 4 4 4 2 |

On the **real crawled catalog** (9,085 items) the engine behaves the same where data is deep
— AIO owner 0.43–0.53 share, 8/8 found, depth 4 in 8/8 — and spacing never breaks (0
violations, max run 2). Readers whose topics are still thin in the first sweep (hiking 40,
dogs 92 images) exhaust the unseen items and can't be served more of what they like (dog
owner found in 1/8); that is corpus depth, fixed by the next crawl parts, not the engine.

`tests/feed-engine.test.mjs` locks these in: spacing never breaks, cold feeds are broad,
interests are found in ≥80% of seeded runs, depth advances one step at a time, probes stay
under 15% of impressions, and the same seed reproduces the same feed.

## 5. Files

| Path | Role |
|---|---|
| `lib/feed/taxonomy/*.mjs` | topic tree DSL (10 files), parser, validation, flatteners |
| `lib/feed/crawl/arctic.mjs` | archive client: throttle, retries, budgets, wait log |
| `lib/feed/crawl/classify.mjs` | post → step + horizontal |
| `lib/feed/crawl/media.mjs` | image detection, gallery/preview extraction |
| `lib/feed/crawl/store.mjs` | manifest parts, cursors, rate-limit log |
| `lib/feed/crawl/crawler.mjs` | graph, collect (scan + search), report |
| `lib/feed/crawl/fleet.mjs` | fleet queue: task plan, lease/ingest SQL, worker loop |
| `scripts/feed-fleet.mjs`, `scripts/feed-worker.mjs` | fleet coordinator + worker (bundled to one file) |
| `lib/feed/engine.mjs` | feed engine (pure) |
| `lib/feed/simulator.mjs` | personas, synthetic catalog, metrics |
| `scripts/feed-crawl.mjs`, `scripts/feed-simulate.mjs` | CLIs |
| `components/internal/screens/recommendations/feed_lab.jsx` | Feed Lab screen |
| `tests/feed-*.test.mjs` | `npm run test:feed` |
| `data/feed-corpus/` | crawl output (git-ignored) |
| `data/feed-fleet/` | built worker with credentials baked in (git-ignored) |

## 6. Next steps

- **Ingestion.** The manifest is ready to import as content assets, but the current vector
  budget (800 ingestion requests/day per project) means ~150k images take months to embed;
  batch-import a balanced subset first, or raise the budget.
- **Persist reader state.** The engine state (`createUserState`) is plain JSON; storing it
  per profile (with consent) and calling `composeFeed`/`recordEvent` from a delivery route
  turns the lab into the live feed.
- **Bridges from embeddings.** Once images are embedded, add visual-similarity bridges
  between horizontals alongside the subreddit graph.
- **Thin topics first.** `report.md` ranks topics by images; deepen the thinnest before the
  next simulation pass so every reader has enough unseen content.
- **Short horizontals.** After the crawl, `report.md` lists horizontals under 25 inside the
  2025+ window; widen their keywords or subreddits in the DSL and re-run (cursors resume).
