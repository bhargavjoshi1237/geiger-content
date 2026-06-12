# Geiger Content

Geiger Content is a Content OS for creating, governing, personalizing, and delivering structured content across websites, applications, and other channels.

## Core Product

- Structured content models, reusable blocks, pages, and collections
- Draft, review, approval, scheduling, publishing, and version history
- Roles, permissions, audit logs, preview, and environment separation
- REST or GraphQL delivery with fast edge caching
- Content variants, audience targeting, and controlled experiments

## Audience Intelligence

Content can be tagged by topic, intent, audience, format, campaign, and journey stage. The platform maintains profiles for known and anonymous users using minimal identifiers, consent settings, traits, and behavioral events.

Journey stage belongs to the relationship between a user and a topic:

`User -> Topic -> Stage -> Recommended Content`

Suggested stages:

1. No Signal
2. Discovered
3. Curious
4. Learning
5. Repeated Interest
6. Problem Aware
7. Solution Aware
8. Evaluating
9. High Intent
10. Converted
11. Activated
12. Retained
13. Expanding
14. Advocate
15. Dormant
16. Not Interested

## Delivery Model

Applications request content using a slot, user key, segments, context, and consent flags. A decision engine selects an approved variant using rules and precomputed signals. Heavy semantic or recommendation processing runs in the background, keeping SSR delivery fast.

## Build Order

1. Content modeling, editorial workflow, publishing, and API delivery
2. Tags, audience segments, slots, and rule-based targeting
3. Event tracking, topic profiles, and reporting
4. A/B testing, goals, holdouts, and winner selection
5. Semantic tagging, embeddings, similar content, and topic clustering
6. Ranked recommendations and knowledge-graph relationships

## Product Position

Geiger Content is a composable Content OS with audience intelligence, experimentation, personalization, and edge delivery. Editorial teams control the content and rules while developers control the rendering components.
