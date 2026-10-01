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
   subreddits are scanned deeper (150 pages) than shared ones (20 pages).
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
  batch. Rules relax only when nothing else fits — never the same-horizontal rule.
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

Synthetic catalog, 60 batches × 10, taxonomy bridges, 8 seeds:

| Reader | Interest share (late) | Circling | Topics / batch | Spacing violations | Focus depth |
|---|---|---:|---:|---:|---|
| AIO owner → custom loops | 0.45–0.57 | 0.46–0.60 | ~7.3 | 0 | 4 in 8/8 seeds |
| Casual foodie | 0.06–0.72 (found in 7/8) | 0.44–0.66 | ~7.2 | 0 | stays broad (by design) |
| Outdoor dog owner | 0.45–0.58 | 0.46–0.58 | ~7.3 | 0 | 3–4 in 7/8 seeds |
| Wide explorer (no interests) | — | 0.40–0.54 | ~7.9 | 0 | — |
| Shifting taste (gym → running) | 0.27–0.60 | 0.38–0.62 | ~7.3 | 0 | 1–4 (taste changes mid-run) |

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
| `lib/feed/engine.mjs` | feed engine (pure) |
| `lib/feed/simulator.mjs` | personas, synthetic catalog, metrics |
| `scripts/feed-crawl.mjs`, `scripts/feed-simulate.mjs` | CLIs |
| `components/internal/screens/recommendations/feed_lab.jsx` | Feed Lab screen |
| `tests/feed-*.test.mjs` | `npm run test:feed` |
| `data/feed-corpus/` | crawl output (git-ignored) |

## 6. Next steps

- **Ingestion.** The manifest is ready to import as content assets, but the current vector
  budget (800 ingestion requests/day per project) means ~150k images take months to embed;
  batch-import a balanced subset first, or raise the budget.
- **Persist reader state.** The engine state (`createUserState`) is plain JSON; storing it
  per profile (with consent) and calling `composeFeed`/`recordEvent` from a delivery route
  turns the lab into the live feed.
- **Bridges from embeddings.** Once images are embedded, add visual-similarity bridges
  between horizontals alongside the subreddit graph.
- **Short horizontals.** After the crawl, `report.md` lists horizontals under 25 inside the
  2025+ window; widen their keywords or subreddits in the DSL and re-run (cursors resume).
