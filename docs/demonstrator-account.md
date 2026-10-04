# Geiger Content demonstrator

The demo is seeded into project `ebcc7910-1a0e-4e91-8c3b-752f3c4292d3`. Its existing shared display name is **Geiger Notes**; the Content app scopes records to that project ID, rather than its separate `content_project_id` value. The content brand is **Geiger Content Studio**.

Open `/project/ebcc7910-1a0e-4e91-8c3b-752f3c4292d3` in the running app. Existing entries, slots, owners, role grants, and other projects are preserved. New demo records carry `metadata.demoSeed = geiger-content-demonstrator-v1` where the table supports metadata. IDs are deterministic and the SQL uses conflict guards.

## What to demonstrate

| Area | Seeded examples |
| --- | --- |
| Content library | 45 entries: 27 Published (including one private document), 6 Draft, 4 In review, 4 Scheduled, 4 Archived; Article, Page, Guide, and Doc |
| Collections and media | Six ordered collections; 12 real PNG covers and four downloadable Markdown playbooks in Supabase Storage; one intentional duplicate cover |
| Architecture | Four content types, 20 typed fields, four reusable blocks, 44 block instances, two taxonomies, 15 hierarchical/journey terms, references, and three locales |
| Editorial | 14 assignments with due dates and priorities, 28 threaded comments, five workflow states, and 57 version snapshots |
| Localization | English source content plus Hindi and French welcome pages, with English fallbacks |
| Audiences | 40 fictional profiles using `example.test` identifiers, 240 traits, five segments, 120 topic stages, 120 purpose-specific consent records, eight learning goals |
| Personalization | Four slots with public published fallbacks, 12 variants, frequency caps, ranking overrides, and 64 synthetic decision traces |
| Experiments | Four experiments across Running, Completed, Paused, and Draft states; eight variants and 480 synthetic exposures |
| Analytics | 6,181 synthetic events over 30 days and 711 daily metrics, calculated from those exact events; pending/denied analytics profiles are untracked |
| Delivery | Three example site configurations, public REST and GraphQL content, and rendered content pages |
| Governance and integrations | Five editorial policies, four retention policies, 45 demo audit records, four disconnected sources, three paused data connections, two paused webhooks, eight synthetic delivery histories, three revoked credentials, two service accounts |
| Assistant | Three clearly marked illustrative conversations; no AI requests were made to create these examples |
| Semantic intelligence | Real Gemini text/image embeddings in the configured vector database; mirrored provider vectors in the legacy embedding inspection table |

Start with **Welcome to Geiger Content Studio**, then open **Your first content project in fifteen minutes**. Inspect its model, topic, reference, version history, and collection membership. Review an **In review** entry and resolve a comment. Compare the two launch headline experiment pages. Finally test the `demo-homepage-hero` slot with `lifecycle: returning`, `locale: hi`, and a default visitor.

Profiles `reader01@example.test` through `reader32@example.test` grant analytics and personalization. Readers 33–36 have pending choices and readers 37–40 deny them. Marketing consent varies independently. These are audience records, not login accounts; sign in with an existing project owner.

The private **Internal launch risk register** must remain inaccessible through anonymous delivery. Example site and integration hostnames use `example.test`; they are configuration records, not deployed websites. Retention policies describe configuration and do not execute cleanup during seeding.

## Reproduce and verify

The scripts load the existing server environment with `@next/env`. Keep credentials in `.env` / `.env.local`.

```powershell
# Generate an inspectable, project-scoped SQL seed without uploads or DB writes.
node scripts/seed-demonstrator.mjs --dry-run

# Upload missing media, apply only the demo SQL through @geiger/orm,
# rerun it to check idempotency, and verify database access and data integrity.
node scripts/seed-demonstrator.mjs

# Reapply the saved SQL, preserving existing records and their timestamps.
npm run db:seed -- demonstrator/project.sql

# Verify authenticated RLS, database functions, media, delivery relationships,
# publication states, consent, and exact agreement between events and metrics.
node scripts/seed-demonstrator.mjs --verify

# Enable indexing for this project and process its actual sources.
node scripts/seed-demonstrator.mjs --index

# Seed recommendation readers from the existing real feed corpus and embeddings.
# Existing reader activity is preserved; this requires vector DB capacity.
node scripts/seed-demo-feed.mjs
```

Seed runs write their verification to `docs/demonstrator-seed-report.json` (and `docs/demonstrator-feed-report.json` for the feed seed); these are git-ignored.

## Current vector limitation

Text and image indexing produced real vectors and populated the legacy embedding table. The shared vector database subsequently exhausted its connection slots, interrupting indexing and preventing feed persona creation. Source data, stored media, database functions, and public delivery passed verification. Remaining indexing and feed seeding require available vector connections; no fake vectors or completion markers were inserted.

The ordinary unfiltered `npm run db:seed` also runs legacy seed files that adopt unassigned rows into the earliest project and manage owner grants across projects. Use the explicit `demonstrator/project.sql` pattern for this demo.
