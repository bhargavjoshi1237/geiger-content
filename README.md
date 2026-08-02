<div align="center">

# Geiger Content

**Create and organize content.**

A headless CMS with structured modelling, editorial workflow, API delivery, and personalisation built in.

Part of the [Geiger](#the-geiger-suite) suite.

</div>

---

## Overview

Geiger Content is the content platform of the Geiger suite. It is a headless, API-first CMS: teams model their content once, author against that model, move entries through review and approval, and publish to any front end through REST, GraphQL, or edge delivery.

Where it goes further than a traditional CMS is what happens after publish. Content Slots, audience profiles, targeting rules, experiments, and recommendation models turn the same content library into a personalisation engine — so the delivered page can adapt to who is asking.

## Highlights

| Area | What it does |
| --- | --- |
| **Content** | All content, drafts, pages, collections, assets, content slots, scheduled, and archived. |
| **Architecture** | Content types, field schemas, reusable blocks, references, validation rules, taxonomies, localisation, and external sources. |
| **Editorial** | Structured and visual editors, comments and mentions, assignments, review queue, approval workflows, version history, compare and rollback, bulk editing, and an AI assistant. |
| **Publishing** | Publishing queue, releases, environments, delivery APIs, webhooks, edge delivery, cache invalidation, publishing history, and multi-site/brand support. |
| **Governance** | Team and members, roles and permissions, content policies, consent and privacy, audit logs, data residency, retention policies, and SSO/SCIM. |
| **Developers** | API explorer, REST and GraphQL APIs, SDKs and CLI, type generation, preview tools, API tokens, service accounts, apps and plugins, logs and usage, and import/export. |
| **Audiences** | Profiles, anonymous visitors, identity resolution, traits, calculated attributes, behaviour events, segments, consent state, profile history, and data connections. |
| **Personalisation** | Content variants, targeting by segment, context, component, and behaviour, edge decisions, frequency caps, boosts and exclusions, and journey stages. |
| **Experiments** | A/B tests, traffic allocation, goals and metrics, holdout groups, eligibility rules, scheduling, results, winner suggestions, multi-armed bandits, and collision control. |
| **Recommendations** | Recommendation models, similar content, user affinity, trending, content-based, collaborative and context-aware ranking, diversity controls, business rules, and real-time ranking. |
| **Intelligence** | Content and audience performance, funnels and journeys, topic interest, semantic search, AI tag suggestions, embeddings, duplicate detection, content gaps, a knowledge graph, and decision explanations. |

## Status

The workspace shell and the full navigation for every area above are in place, each screen carrying its scoped description and intent. Screens are being implemented progressively against the suite's shared screen kit and data-layer conventions.

## Tech stack

- **Framework** — Next.js 16 (App Router, SSR/SSG) and React 19
- **Styling** — Tailwind CSS v4 and shadcn/ui, with the shared [`@geiger/ui`](https://github.com/bhargavjoshi1237/geiger-ui) component library
- **Icons** — Lucide
- **Backend** — Supabase (Postgres, Auth, Storage)

## Getting started

### Prerequisites

- Node.js 20 or later
- A Supabase project (the shared Geiger project)

### Installation

```bash
npm install
```

### Environment

Create a `.env` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key      # server-only
```

### Develop

```bash
npm run dev
```

Local routes:

- `/` and `/project/[projectId]` — the content workspace
- `/pallet` — dark palette reference
- `/palletw` — light palette reference

Production builds use the `/content` base path. The Vercel deployment is served at `https://geigercontent.vercel.app/content` and proxied by `geiger-dash` without stripping the prefix.

## Project structure

```
app/
  project/[projectId]/   Content workspace
  pallet/, palletw/      Dark and light palette references
components/
  internal/screens/      Screen registry and per-screen definitions
  internal/sidebar/      Navigation — titles are the registry keys
  internal/shared/       Shared screen kit (headers, tables, stats, dialogs)
  ui/                    shadcn primitives
lib/supabase/            Supabase client, config, user, and activity tracking
```

## Conventions

This codebase follows a consistent set of patterns. Read these before contributing:

- [`AGENTS.md`](AGENTS.md) — working notes for this Next.js version
- [`MODULE_CONVENTIONS.md`](MODULE_CONVENTIONS.md) — how to build a workspace screen
- [`SUPABASE_CONVENTIONS.md`](SUPABASE_CONVENTIONS.md) — the data-layer playbook
- [`MIGRATION_CONVENTIONS.md`](MIGRATION_CONVENTIONS.md) — schema changes and `@geiger/orm`
- [`crafting.md`](crafting.md) — UI craft and quality bar

## The Geiger suite

Geiger Content is one application in the broader Geiger suite, alongside Geiger Campaign, Geiger Flow, and Geiger Events. Every product shares one Supabase project, a common design language, and the [`@geiger/ui`](https://github.com/bhargavjoshi1237/geiger-ui) component library, so each app feels native to the whole.

## License

Private and unpublished. All rights reserved.
