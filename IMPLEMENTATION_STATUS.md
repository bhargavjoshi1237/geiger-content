# Geiger Content — Implementation Status & Build Plan

Audited: 2026-10-01 · Schemas: Supabase `content`, Aiven `content`
Workstreams A–C integrated, followed by D. Existing uncommitted work preserved; no commits or Git pushes.

This is the standing record of **what is built, what is not, and what has to
happen next**. It is scoped to non-UI work: data layers, migrations, delivery
APIs, and the screens that do not exist yet. UI polish on screens that already
exist is applied directly in code, not tracked here.

Companion docs: `Mds/MarketFeatureResearch.md` (the competitor/feature map this
is scored against), `Mds/ProductBrief.md` (the product definition and build
order), `MODULE_CONVENTIONS.md`, `SUPABASE_CONVENTIONS.md`,
`MIGRATION_CONVENTIONS.md`, `crafting.md`.

---

## 1. Scorecard

| Measure | Value |
|---|---|
| Nav destinations declared in `sidebar_nav.jsx` | **114** |
| Registered destinations | **111 / 114**; registry also retains the `Content` alias |
| Live data | All 111 implemented destinations; four analytics screens retain an explicitly labelled sample fallback |
| Demo-backed Intelligence remainder | **0**; Semantic Search and Embeddings were already live before this work |
| ComingSoon destinations | **3**: SSO & SCIM, Data Residency, Billing & Plans, intentionally skipped pending infrastructure decisions |
| Public delivery | REST list/slug, published renderer, collect beacon, scoped decide, bounded GraphQL placeholder |
| Supabase content tables | **51**, including migration ledger, private assistant usage, and private RLS rollback snapshot |

The requested implementation is complete. Production activation still requires deploying the code and configuring authenticated cron execution; indexing continues gradually within the shared embedding budget.

### Current workstream results

- **A — Vector engine:** candidate hydration uses one topic query for returned rows, with lightweight projections. Revisions hash embedded inputs instead of timestamps. Chunk hashes reuse stored vectors across revisions/positions. Stable profile signatures react to activity and source changes. Sentence/paragraph chunks overlap without cutting normal words. `retrieval-v2` writes coexist with legacy readable vectors during bounded reindexing. Superseded jobs complete without false failures; retries live in the repository. Production crons target `/content/api/cron/{embeddings,publish-due,rollups}` and reject missing/invalid bearer authorization.
- **B — Intelligence:** AI Tag Suggestions, Duplicate Detection, Content Gaps, Knowledge Graph and Decision Explanations use authenticated server operations and real data. Neighbour-based tags spend no generation quota. Duplicate endpoints and graph edges recheck both sources; taxonomy coverage gaps use the Aiven index. Views disclose scan limits and distinguish loading, empty, unavailable and filtered-empty states. Decisions use persisted reasons and actual exposures without inventing historical experiment settings.
- **C — Operations:** registered AI Assistant, Edge Delivery, Cache Invalidation, Sites & Brands, Consent & Privacy, Branding, Integrations and Security under their exact sidebar titles. Sites and private assistant history use new tables; existing settings/integrations/consent/security records supply the other data layers. Assistant configuration failures degrade cleanly and its five-per-minute request reservation is atomic. Consent saves share the profile lock and erase personal vectors before success. Public delivery caches carry invalidation tags; external CDN caches retain their own TTL.
- **D — RLS:** removed all `*_demo_all` policies and replaced open policies/grants with project membership, operation permissions and owner checks. Foreign parent links, role assignment escalation, private knowledge/history access, direct consent writes and TRUNCATE privileges are denied. Entry publishing and mutation of published/scheduled content require publish permission; soft/hard deletion requires delete permission. Public delivery uses anonymous published-only reads; scoped server beacons/decisions preserve consent. The ledgered down migration restores the captured previous policies, grants, function definitions and RLS flags.

### Migrations and verification (2026-10-01)

| Database | Result |
|---|---|
| Supabase | Applied `20261001075342_delivery_settings_and_decisions.sql` and `20261001081041_project_scoped_rls.sql` through `npm run db:push`; status checked before/after; **33 applied, 0 pending, no drift** |
| Aiven | No new schema changes needed; existing `20260930074245_vector_intelligence.sql` remains applied; **1 applied, 0 pending, no drift** |

- Before push: signed-in RLS fixtures **9 passed**, **18 expected legacy gaps**, **3 pending-infrastructure skips**, **0 failures**; public HTTP checks **9 passed**.
- After push: **30/30** strict RLS checks and **10/10** public HTTP checks passed, including owner/Writer/Viewer flows, foreign denial, public REST/renderer/GraphQL/beacon, consent and recorded decisions. Transactional RLS fixtures rolled back; isolated HTTP fixtures removed without changing existing workspace data.
- `npm run test:vector`: passing. Live gate `VECTOR_LIVE_TESTS=1 npm run test:vector`: **57/57 passed**, zero skips or provider calls.
- `npm run test:delivery`: delivery, operation-input and verifier tests; final run recorded below.
- ESLint ran across every changed source file, including existing uncommitted source: zero errors, three existing `<img>` optimization warnings in sidebar/topbar. Final file count/run recorded below.
- Browser verified registered AI Assistant and its no-project state; source/HTTP checks cover all thirteen new or converted screens. Signed-in authorization was verified against real database roles/JWT claims; no interactive signed-in browser session was available.
- Final production build: pending final verification.

### Activation and remaining decisions

Configure `CRON_SECRET` in the deployment environment; it is absent locally and all cron routes correctly fail closed. The sub-daily Vercel schedules require Pro/Enterprise ([Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)); no deployment, plan upgrade or environment-secret change was performed.

No full-library embedding run was performed. Existing entry vectors were absent during the read-only insights smoke check, so normal empty states are expected until enabled, quota-bounded indexing populates them. Old preprocessing remains readable during this rollout. External replacements of stored images should also update `metadata.content_hash`; application uploads now hash the actual uploaded image bytes.

SSO & SCIM, Data Residency, and Billing & Plans remain intentionally unimplemented. GraphQL remains the existing documented subset rather than a complete GraphQL implementation. External CDN purging and DNS/hosting remain provider-managed.

---

## 2. Sidebar coverage

| Section | Built / Total | State |
|---|---|---|
| Overview | 1 / 1 | **Live data** — KPIs + recent/attention from the four content layers |
| Content | 8 / 8 | **Live data**, full CRUD |
| Architecture | 8 / 8 | **Live data** — types, fields, blocks, references, validation, taxonomies, locales, sources |
| Editorial | 10 / 10 | **Live data**, including private AI Assistant history |
| Publishing | 9 / 9 | **Live data**, including Edge Delivery, Cache Invalidation and Sites & Brands |
| Governance | 7 / 9 | **Live data**, including Consent & Privacy; SSO and Residency intentionally skipped |
| Developers | 11 / 11 | **Live data** — explorer, REST/GraphQL docs, SDKs, types, preview, tokens, accounts, apps, logs, import/export |
| Audiences | 10 / 10 | **Live data** — profiles, identity, traits, events, segments, consent, history, connections |
| Personalization | 10 / 10 | **Live data** — variants, targeting ×5, edge inspector, caps, boosts, stages |
| Experiments | 11 / 11 | **Live data** — list, A/B, traffic, goals, holdouts, eligibility, schedule, results, winners, bandits, collisions |
| Recommendations | 10 / 10 | **Live data** — models, similar, affinity, trending, 3× ranking, diversity, business, realtime |
| Intelligence | 11 / 11 | All live; four analytics screens retain disclosed sample fallback |
| Settings | 5 / 6 | General, Workspace, Branding, Integrations and Security live; Billing intentionally skipped |

---

## 3. What actually works today

### Content (live)

`content.entries`, `content.collections` + `content.collection_items`,
`content.assets`, `content.slots` — all project-scoped, soft-deleted, RLS on.

- `components/internal/screens/content/entries_list.jsx` — one shared list
  behind **All Content, Drafts, Pages, Scheduled, Archived**; search, status and
  type filters, pagination, optimistic create/duplicate/delete/restore.
- `collections.jsx`, `assets.jsx`, `slots.jsx` — same rhythm, each with an
  `EditorShell` detail screen reached via `?collection=` / `?asset=` / `?slot=`.
- `content_detail.jsx` — 6-section editor (Overview, Basics, Body, Media,
  Visibility, Team).
- Data layers: `lib/supabase/{content,collections,assets,slots}.js`, all
  following the `normalize*` / `toRow` / tri-state-return contract.

### RBAC (workspace UI and database enforcement)

`supabase/migrations/20260825000001_adopt_rbac.sql` ships `public.roles`,
`content.role_grants`, and the `content.rbac_allows` / `can_access_project` /
`rbac_ensure_membership` functions. `lib/supabase/rbac.js` is a complete data
layer (roles, grants, membership, `evaluatePermission`). `context/rbac-context.js`
exposes `useRbac()` and `useCan()`.

Workspace controls and navigation consume the RBAC context. The 2026-10-01 tightening migration enforces project access and operation permissions in the database. Bootstrap grants safe Writer access to organization members and reloads both grants and any newly created role before rendering decisions.

### Intelligence (live data)

Semantic Search and Embeddings use the existing live vector engine. The five converted screens use `lib/vector/insights.mjs`; the remaining four analytics screens read events/rollups first and label their sample fallback. Public page views are collected through the scoped beacon. Semantic relationships are derived from references, taxonomies and stored Aiven vectors.

---

## 4. Defects to fix

Ranked by user impact. None of these are cosmetic.

| # | Defect | Evidence | Fix |
|---|---|---|---|
| D1 | ~~**"View page" always 404s.**~~ Fixed 2026-09-10: public renderer `app/c/[id]/page.js` ships; row action + live-view button resolve. | `app/c/[id]/page.js` | Phase 2 ✅ |
| D2 | **Assets cannot be uploaded.** ~~The create dialog collects a *File URL* string. No storage bucket, no `lib/supabase/storage.js`.~~ Fixed 2026-09-10: public `content` bucket + `lib/supabase/storage.js` + drop zone (URL kept secondary). | `assets.jsx` "File URL" field | Phase 1 ✅ |
| D3 | **Fixed:** workspace gating and project-scoped database RLS, operation permissions, owner checks and foreign-project denial verified 2026-10-01. | RBAC context and ledgered tightening migration | ✅ Done |
| D4 | **Scheduled publishing does not publish.** ~~`scheduled_at` is stored and displayed; nothing promotes an entry when the time passes.~~ Fixed 2026-09-10: `publishDue()` + `app/api/cron/publish-due` (Vercel Cron wiring documented). | `lib/supabase/publishing.js` | Phase 2 ✅ |
| D5 | **Fixed:** all Intelligence screens read live data; the four analytics fallbacks remain explicitly labelled. | `live_data.js`, vector engine and `insights.mjs` | ✅ Done |
| D6 | **No seeds.** ~~`MIGRATION_CONVENTIONS.md` §10 requires `supabase/seeds/`; the directory does not exist, so a fresh database has nothing to demo.~~ Fixed 2026-09-10: `supabase/seeds/content/*.sql` (entries, collections, assets, slots). | `supabase/` has only `migrations/` | Phase 1 ✅ |
| D7 | **Overview is a placeholder.** ~~The default landing tab shows "not built yet" as the first impression.~~ Fixed 2026-09-10: `content_overview.jsx` registered as `Overview`. | `registry.jsx` has no `Overview` key | Phase 1 ✅ |

---

## 5. Convention debt

Small, cheap, and worth clearing before the codebase multiplies.

- **No `schemaClient()` helper.** ~~`createClient().schema("content")` is repeated
  **24 times** across `lib/supabase/*`.~~ Fixed 2026-09-10:
  `supabase/components/content-client.js` exports `contentClient()` (+
  `publicClient()`); all 25 call sites collapsed onto it.
  `lib/supabase/config.js` remains as a re-export shim.
- **No `supabase/seeds/` directory** (see D6). Fixed 2026-09-10.
- **`app/pallet/` and `app/palletw/`** ~~are palette scratch pages shipped in the
  production route tree. Move them behind a dev-only guard or delete them.~~
  Fixed 2026-09-10: both return `notFound()` when `NODE_ENV === "production"`.
- **Entry body is a plain textarea.** Acceptable now; it becomes the blocker the
  moment Editorial (Phase 3) starts.

---

## 6. Phased build plan

The phase notes below are the preserved September implementation history. The current workstream results and database status above supersede their pending/deferred statements.

Ordered to match `Mds/ProductBrief.md` → *Build Order*. Each phase is shippable
on its own. Every new screen follows the checklist in §7.

### Phase 1 — Close the loop on what exists ✅ SHIPPED 2026-09-10

*Goal: the Content section is complete and trustworthy end to end.*

| Work | Detail | State |
|---|---|---|
| `contentClient()` helper | `supabase/components/content-client.js`; refactored all 25 call sites | ✅ Done |
| Asset storage | Public `content` bucket, `assets/<projectId>/<assetId>/` prefix; `lib/supabase/storage.js` with `uploadAsset` / `buildPublicUrl`; compress > ~500 KB; persist public URL in `assets.url`; creator-only write RLS | ✅ Done (migration `20260909185752_content_storage.sql`, pending `db:push`) |
| Asset upload UI | Drop zone in `assets.jsx`; URL entry kept as secondary path | ✅ Done |
| Overview screen | `components/internal/screens/overview/content_overview.jsx`; KPIs + recent/attention from the four data layers — no new tables | ✅ Done, registered |
| Seeds | `supabase/seeds/content/*.sql`, idempotent `on conflict (id) do nothing`, stable UUIDs (`project_id` NULL → adopt via documented `update … where project_id is null`) | ✅ Done |
| Settings — General / Workspace | `SettingsList` + `SettingRow`; default locale, timezone, brand name into `content.project_settings` | ✅ Done, registered |
| Pallet guard | `app/pallet`, `app/palletw` return `notFound()` in production | ✅ Done |

**Acceptance:** a fresh clone can `db:push`, `db:seed`, upload an image, and see
a populated Overview.

### Phase 2 — Publishing and delivery ✅ SHIPPED 2026-09-10

*Goal: content leaves the CMS. This is the single biggest gap in the product.*
Decisions locked: REST first, `environment_id` column, minimal status-flip publish (plain updates, no RPC).

Shipped: `environments` + `environment_id` on entries + `entry_versions` +
`webhooks`/`webhook_deliveries` migrations; `publishing.js`/`versions.js`/
`webhooks.js`/`environments.js`; REST `entries` + `entries/[slug]`
(published-only, `s-maxage=60`) + `cron/publish-due`; `app/c/[id]` renderer
(fixes **D1**); `publishDue` cron (fixes **D4**); 6 screens (Queue, Releases,
Environments, Delivery APIs, Webhooks, History). Edge Delivery, Cache
Invalidation, Sites & Brands remain placeholders.

| Work | Detail |
|---|---|
| Delivery API | `app/api/content/v1/entries/route.js` + `[slug]/route.js`; draft vs published views; `Cache-Control` + tag-based revalidation |
| Public renderer | `app/c/[id]/page.js` — SSR/SSG, fixes **D1** |
| Publish pipeline | `content.publish_entry(p_id)` RPC: sets `published_at`, snapshots to `content.entry_versions` |
| Versions | `content.entry_versions` (entry_id, version, payload jsonb, published_at, created_by) — backs Version History and Compare & Rollback |
| Scheduled publishing | Vercel Cron → route handler promoting entries where `scheduled_at <= now()`; fixes **D4** |
| Webhooks | `content.webhooks` + `content.webhook_deliveries`; fire on publish/unpublish with retry + delivery log |
| Environments | `content.environments`; add `environment_id` to `entries`; scope every read |
| Screens | Publishing Queue, Releases, Environments, Delivery APIs, Webhooks, Publishing History (6 of 9) |

**Acceptance:** an external `curl` returns published JSON; a scheduled entry goes
live unattended; a webhook fires and is logged.

### Phase 3 — Architecture and editorial ✅ SHIPPED 2026-09-10

*Goal: structured content instead of fixed columns; a real editorial workflow.*
Shipped: `content_types`/`fields`, `blocks`/`block_instances`,
`entry_references`, `taxonomies`/`terms`/`entry_terms`, `locales`,
`workflow_states`/`assignments`, `comments`, `external_sources` migrations +
`entries.data jsonb`; 8 libs; 8 Architecture + 9 Editorial screens (AI Assistant
deferred). Rich text stays a textarea holding a JSON string; `body` untouched
(portable-JSON decision still open).

| Work | Detail |
|---|---|
| Content types | `content.content_types` (key, name, icon) + `content.fields` (type_id, key, label, data_type, validation jsonb, localized bool, position) |
| Dynamic entries | Move typed values into `entries.data jsonb`, validated against the type's field schema; keep `title`/`slug`/`status` promoted |
| Reusable blocks | `content.blocks` + `content.block_instances` |
| References | `content.entry_references` (from_entry, to_entry, field_key) with reverse-link lookups |
| Taxonomies | `content.taxonomies` + `content.terms` + `content.entry_terms` — **prerequisite for topics in Phase 6** |
| Localization | `content.locales`; per-locale entry variants keyed by `(entry_id, locale)` |
| Rich-text editor | Replace the body textarea; store portable JSON, not HTML |
| Workflow | `content.workflow_states` + `content.assignments`; review queue and approval gates |
| Comments | `content.comments` (entry_id, field_key, thread_id, body, mentions) |
| Bulk editing | Multi-select on the shared list + a batch action bar |
| Screens | 8 Architecture + 9 of 10 Editorial |

**Acceptance:** a new content type can be defined in the UI and immediately
authored against, with review → approve → publish.

### Phase 4 — Governance ✅ SHIPPED 2026-09-10 (advisory gating; DB RLS tightening deferred)

*Goal: turn on the RBAC that is already written.*
Shipped: sidebar + create-button `useCan` gating, `audit_log` (insert-only) +
`policies` + `retention_policies` migrations, audit writes on entry/collection/
asset/slot mutations, 6 screens (Team, Roles, Permissions, Policies, Audit,
Retention). RLS replacement skipped deliberately — demo runs unauthenticated,
so hardened policies would blank every screen; a no-op hardening-template
migration documents the future path. SSO/SCIM + Data Residency deferred (infra).

| Work | Detail |
|---|---|
| Enforce permissions | Gate sidebar entries with `useCan(tabPermissionKey(title))`; gate create/delete controls |
| Tighten RLS | New migration replacing every `*_demo_all` policy with project-scoped `content.can_access_project(project_id)` |
| Audit logs | `content.audit_log` (actor, action, entity, entity_id, diff jsonb, at); write from every mutation path |
| Screens | Team & Members, Roles, Permissions, Audit Logs, Content Policies, Retention Policies |
| Deferred | SSO/SCIM and Data Residency need infra decisions — see §8 |

**Acceptance:** a viewer-role user sees a reduced sidebar and is refused writes
**by the database**, not just by hidden buttons.

### Phase 5 — Audiences and real analytics ✅ SHIPPED 2026-09-10 (4/11 Intelligence rewired)

*Goal: retire `demo_data.js`.*
Shipped: `events`/`profiles`/`profile_traits`/`segments`/`consent_state`/
`metrics_daily`/`data_connections` migration; 6 libs (naive segment matcher,
default-allow consent, best-effort rollups); `/api/content/v1/collect` beacon;
`trackPageView()` helper; Content/Audience Performance, Funnels, Topics read
live tables first with Sample-data fallback (**D5** partial); 10 Audiences
screens. 7 Intelligence screens still demo-backed.

| Work | Detail |
|---|---|
| Event collection | `content.events` (anonymous_id, user_id, entry_id, type, context jsonb, at); a `/api/content/v1/collect` beacon endpoint |
| Profiles | `content.profiles` + `content.profile_traits`; identity resolution merging anonymous → known on login |
| Segments | `content.segments` with a stored rule tree; a materializer job |
| Consent | `content.consent_state` per profile; every read path honours it |
| Rollups | Nightly aggregates into `content.metrics_daily` so Intelligence reads pre-computed rows |
| Rewire Intelligence | Point Content Performance, Audience Performance, Funnels & Journeys, Topic Interest at real tables; delete the demo arrays they use |
| Screens | 10 Audiences |

**Acceptance:** a page view on `/c/<id>` appears in Content Performance.

### Phase 6 — Personalization, experiments, recommendations ✅ SHIPPED 2026-09-10

*Goal: the differentiators from `Mds/MarketFeatureResearch.md`.*
Shipped: `variants`, `decide` engine (priority → deterministic weight, reason
strings = explainability), `topic_stages`, `experiments`/`variants`/`exposures`
(deterministic assignment, holdouts, max-rate winners), `ranking_rules`/
`frequency_caps`, `entry_embeddings` as **jsonb arrays** (pgvector deferred as
documented upgrade); `/api/decide`; 10 Personalization + 11 Experiments + 10
Recommendations screens. Nascent-model surfaces label scores as estimates.

| Work | Detail |
|---|---|
| Variants | `content.variants` (slot_id, entry_id, rules jsonb, priority, weight) |
| Decision engine | `content.decide(p_slot_key, p_profile, p_context)` returning the winning variant **plus its reason** — the explainability the research doc calls extremely rare |
| Topic stages | `content.topic_stages` (profile_id, topic_id, stage, score, updated_at) over Phase 3 taxonomies — the `User → Topic → Stage → Recommended Content` model |
| Experiments | `content.experiments`, `content.experiment_variants`, `content.experiment_exposures`; traffic allocation, goals, holdouts, significance |
| Recommendations | `pgvector` embeddings on entries; similar-content and affinity ranking with editorial boosts and exclusions |
| Screens | 10 Personalization + 11 Experiments + 10 Recommendations |

**Acceptance:** a slot returns a personalized entry with a human-readable reason,
and an A/B test reports a winner.

### Phase 7 — Developer surface ✅ SHIPPED 2026-09-10

Shipped: `api_tokens` (sha256-hashed, scoped, revocable) + `service_accounts`;
SubtleCrypto token minting; hand-rolled GraphQL-placeholder route (no
`pg_graphql` extension on the shared DB — documented); all 11 Developers
screens incl. JSON+CSV export/import. `types.jsx`/`logs.jsx` degrade gracefully
until sibling tables exist (they now do — post-push).

| Work | Detail |
|---|---|
| GraphQL | Expose via `pg_graphql` |
| API tokens | `content.api_tokens` (hashed, scoped, revocable) + service accounts |
| SDK / CLI / type generation | Generate types from `content.content_types` |
| Import / export | JSON + CSV round trip |
| Screens | 11 Developers |

---

## 7. Checklist for every new screen

Non-negotiable, from `MODULE_CONVENTIONS.md` and `crafting.md`:

1. **Use the authorized scope.** Resolve entity fields, state, filters, actions, permissions and persistence from the request and repository conventions; clarify only genuinely missing requirements.
2. **Migration** — `npm run db:new -- <name> --template table`. Schema-qualified
   `content.<table>`, standard columns, plain `created_by uuid`, `project_id`
   FK, `@up` **and** `@down`, RLS on. `db:push --dry-run` → `db:push` →
   `db:status`.
3. **Data layer** — `lib/supabase/<area>.js` via `contentClient()`;
   `normalize*` / `toRow`; `list/get/create/update/softDelete`; returns
   `null`/`[]`/`false`; `console.error` on failure; **never throws, never
   toasts**.
4. **Screen** — `components/internal/screens/<area>/<name>.jsx`, `"use client"`,
   `*Screen` export, `MainScreenWrapper` → `ScreenHeader` → `StatsBar` →
   `Toolbar` → `DataTable`. Registered in `registry.jsx` under the **exact**
   `sidebar_nav.jsx` title.
5. **States** — unnamed `LogoLoading` for section/page loads, `Loader2` on loading buttons, `EmptyState` when empty, a
   distinct filtered-empty message. Optimistic mutations with `crypto.randomUUID()`
   ids, persisted, rolled back and toasted on failure.
6. **UI** — direct `@geiger/ui` imports, including `@geiger/ui/screen-kit`. Semantic tokens
   only, never hardcoded hex. Lucide icons.
7. **Permissions** — add the `view.*` key and check it where the nav/control
   renders.
8. `npx eslint <changed files>` clean.

---

## 8. Open decisions

Only SSO & SCIM, Data Residency, and Billing & Plans need new infrastructure/product decisions for the requested scope. Production cron activation needs the secret and an eligible hosting plan. The table below preserves the earlier decision history; delivery, body, events and embeddings choices have since been implemented as described above.

These block specific work and need a product answer, not an engineering one.

| Decision | Blocks | Notes |
|---|---|---|
| Delivery API shape — REST first, or REST + GraphQL together? | Phase 2 | `pg_graphql` makes GraphQL cheap, but versioning/caching differ |
| Environments — separate rows, separate schemas, or separate projects? | Phase 2 | Cheapest is an `environment_id` column; least isolated too |
| Entry body format — portable JSON, MDX, or HTML? | Phase 3 | Determines every renderer downstream; hard to change later |
| Does structured content replace the fixed `entries` columns or sit beside them? | Phase 3 | Affects whether Phase 1–2 work needs migrating |
| Event collection — first-party endpoint or a CDP? | Phase 5 | The research doc positions first-party as a differentiator |
| Embeddings provider and where vectors live | Phase 6 | `pgvector` in-schema is the cheapest path |
| SSO/SCIM and data residency | Phase 4 | Enterprise-gated; may be deliberately out of scope |

---

## 9. Changelog

**2026-09-10** — Remainder closed + live-verified (2 workstreams + lead
verification): fixed sidebar RBAC gating (sub-items inherit parent section key —
`@geiger/rbac` fails closed on unknown keys, so per-screen keys emptied sections
even for Owners); portable-JSON body (`body_doc.js` parse/serialize, block
editor in Structured Editor + entry Body section, shared `BodyBlocks` renderer
in Visual Editor + public page; legacy plain text still renders); P5 loop closed
(`PageViewTracker` beacon on `/c/[id]`); nightly rollup cron route
(`/api/cron/rollups`); z-test significance in experiment results; `05_adopt.sql`
seed adoption (fresh clone now shows a populated Overview). Shared decision core
extracted to server-safe `lib/decide-core.js` after live testing caught the
`"use client"` import crash in `/api/decide` (500 → 200). Live-verified against
dev server + production DB, test artifacts removed afterwards: delivery API
serves published JSON, slug lookup 200, public page 200, collect beacon
`{ok:true}`, cron published a due Scheduled entry → served as Published, decide
returned entry + human-readable reason, rollups `{days:1,rows:1}`. Deliberately
NOT done: DB-level RLS tightening (demo runs unauthenticated — hardened
policies would blank every screen; template migration documents the path),
`pg_graphql` (no extension on shared DB), real-time upload smoke test (bucket
writes require an authenticated session; code + policies ship).
`registry.jsx` 22 → 103 destinations, `npx eslint` clean across all new code.
Resolved open decisions: REST-first delivery, `environment_id` column,
minimal status-flip publish, embeddings-as-jsonb, GraphQL placeholder, RLS
hardening deferred with template. Still open: entry body format (portable JSON
vs MDX vs HTML), structured-vs-fixed columns migration, event collection
(first-party beacon shipped; CDP question moot for now), embeddings provider
(jsonb now, pgvector later), SSO/SCIM + data residency (enterprise-gated).
Remaining placeholders (11): AI Assistant, Edge Delivery, Cache Invalidation,
Sites & Brands, Consent & Privacy, Data Residency, SSO & SCIM, Branding,
Integrations, Security, Billing & Plans. Operator notes: configure Vercel Cron
→ `/api/cron/publish-due`; adopt seeds into a real project if a scoped demo is
wanted (`update … where project_id is null`).

**2026-09-10** — Phase 1 shipped (4 parallel workstreams + registry wiring):
`contentClient()`/`publicClient()` helper + 25-site refactor; public `content`
bucket migration + `lib/supabase/storage.js` + Assets drop zone (D2 fixed);
`content_overview.jsx` registered as the default landing tab (D7 fixed);
`supabase/seeds/content/*.sql` (D6 fixed); `content.project_settings` migration
+ data layer + General/Workspace screens; `app/pallet*` production-guarded;
`registry.jsx` 19 → 22. `npx eslint` clean on all touched files. Pending operator
steps: `npm run db:push` (applies `20260909185752_content_storage.sql` +
`20260909185802_content_project_settings.sql`), `npm run db:seed`, adopt seeds
into a real project (`update … set project_id = '<uuid>' where project_id is
null`). Next: Phase 2 (delivery API + public renderer fixes D1; scheduled
publishing fixes D4).

**2026-09-09** — Initial audit. Alongside it, applied UI-only fixes (not tracked
above): migrated every import off the drifted `components/ui/*` forks onto
`@geiger/ui` and deleted them; rebuilt `ComingSoonScreen` on the shared
`ScreenHeader` with routing to screens that do exist; added
`shared/table_skeleton.jsx` and replaced the four bespoke spinners; wired the
previously inert ⌘K topbar search to the shared `CommandPalette` across all 114
destinations; marked unbuilt destinations in the sidebar.
