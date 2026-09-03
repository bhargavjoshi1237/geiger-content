export const CONTENT_PERFORMANCE = {
  stats: [
    { label: "Total views", value: "184,203", delta: "+12.4%", trend: "up", footer: "Across all entries" },
    { label: "Engagement rate", value: "64.8%", delta: "+3.1%", trend: "up", footer: "Scroll + interaction" },
    { label: "Conversions", value: "9,412", delta: "+8.6%", trend: "up", footer: "Attributed outcomes" },
    { label: "Avg. time on page", value: "3m 42s", delta: "-0.4%", trend: "down", footer: "Per session" },
  ],
  trend: [
    { date: "Mar 3", views: 4200, engaged: 2600, conversions: 210 },
    { date: "Mar 6", views: 5100, engaged: 3200, conversions: 260 },
    { date: "Mar 9", views: 4800, engaged: 3050, conversions: 244 },
    { date: "Mar 12", views: 6200, engaged: 4100, conversions: 330 },
    { date: "Mar 15", views: 5900, engaged: 3900, conversions: 312 },
    { date: "Mar 18", views: 7100, engaged: 4700, conversions: 402 },
    { date: "Mar 21", views: 6800, engaged: 4500, conversions: 388 },
    { date: "Mar 24", views: 7900, engaged: 5300, conversions: 452 },
    { date: "Mar 27", views: 8300, engaged: 5600, conversions: 488 },
    { date: "Mar 30", views: 9100, engaged: 6100, conversions: 540 },
    { date: "Apr 2", views: 8800, engaged: 5900, conversions: 522 },
    { date: "Apr 5", views: 9600, engaged: 6500, conversions: 585 },
  ],
  byType: [
    { type: "Articles", views: 68400, engagement: 62 },
    { type: "Guides", views: 48200, engagement: 74 },
    { type: "Pages", views: 39800, engagement: 55 },
    { type: "Docs", views: 21400, engagement: 81 },
    { type: "Landing", views: 16800, engagement: 48 },
  ],
  channels: [
    { name: "Organic search", value: 68400 },
    { name: "Direct", value: 41200 },
    { name: "Social", value: 28800 },
    { name: "Referral", value: 19600 },
    { name: "Email", value: 14200 },
  ],
  top: [
    { title: "Getting started guide", type: "Guide", views: "24,810", rate: "78%", conv: "1,204", trend: "up" },
    { title: "AI product videos", type: "Article", views: "19,402", rate: "71%", conv: "986", trend: "up" },
    { title: "Pricing overview", type: "Page", views: "17,118", rate: "52%", conv: "1,540", trend: "up" },
    { title: "API quickstart", type: "Doc", views: "14,904", rate: "84%", conv: "712", trend: "up" },
    { title: "Campaign templates", type: "Article", views: "11,377", rate: "63%", conv: "488", trend: "down" },
    { title: "Changelog — March", type: "Page", views: "9,812", rate: "44%", conv: "196", trend: "down" },
  ],
};

export const AUDIENCE_PERFORMANCE = {
  stats: [
    { label: "Active profiles", value: "48,210", delta: "+6.2%", trend: "up", footer: "Known + anonymous" },
    { label: "Avg. conversion", value: "5.1%", delta: "+0.6%", trend: "up", footer: "Across segments" },
    { label: "Returning rate", value: "38.4%", delta: "+2.2%", trend: "up", footer: "Repeat visitors" },
    { label: "Unsubscribed", value: "312", delta: "-4.1%", trend: "up", footer: "Suppressed profiles" },
  ],
  trend: [
    { date: "Mar 3", marketers: 1200, developers: 800, ecommerce: 640 },
    { date: "Mar 9", developers: 950, ecommerce: 720, marketers: 1380 },
    { date: "Mar 15", marketers: 1520, developers: 1100, ecommerce: 880 },
    { date: "Mar 21", marketers: 1680, developers: 1240, ecommerce: 1020 },
    { date: "Mar 27", marketers: 1840, developers: 1380, ecommerce: 1180 },
    { date: "Apr 2", marketers: 2010, developers: 1520, ecommerce: 1310 },
    { date: "Apr 5", marketers: 2180, developers: 1640, ecommerce: 1440 },
  ],
  segments: [
    { segment: "Marketers", reach: 18240, engagement: 68, conversion: 6.4 },
    { segment: "Developers", reach: 12480, engagement: 74, conversion: 5.8 },
    { segment: "Ecommerce", reach: 9610, engagement: 61, conversion: 7.2 },
    { segment: "Enterprise", reach: 4820, engagement: 55, conversion: 4.1 },
    { segment: "Education", reach: 3060, engagement: 71, conversion: 3.4 },
  ],
  stages: [
    { name: "Discovered", value: 14200 },
    { name: "Learning", value: 10800 },
    { name: "Evaluating", value: 6400 },
    { name: "Converted", value: 3800 },
    { name: "Retained", value: 5200 },
  ],
  rows: [
    { segment: "AI video interest", profiles: "12,480", engagement: "72%", conv: "6.8%", growth: "+9.2%" },
    { segment: "Ecommerce ops", profiles: "9,610", engagement: "64%", conv: "7.2%", growth: "+6.4%" },
    { segment: "Docs power users", profiles: "7,204", engagement: "81%", conv: "5.1%", growth: "+4.8%" },
    { segment: "New visitors", profiles: "14,200", engagement: "42%", conv: "1.8%", growth: "+12.1%" },
    { segment: "Dormant 30d", profiles: "4,716", engagement: "18%", conv: "0.6%", growth: "-3.2%" },
  ],
};

export const FUNNELS_JOURNEYS = {
  stats: [
    { label: "Journey entries", value: "62,400", delta: "+9.4%", trend: "up", footer: "Started a funnel" },
    { label: "End-to-end conv.", value: "8.2%", delta: "+1.1%", trend: "up", footer: "Visit to outcome" },
    { label: "Median time to convert", value: "4.2d", delta: "-0.6d", trend: "up", footer: "Across funnels" },
    { label: "Drop-off hotspot", value: "Step 3", delta: "31%", trend: "down", footer: "Solution to eval" },
  ],
  funnel: [
    { name: "Visited content", value: 62400, fill: "var(--chart-1)" },
    { name: "Engaged 50%+", value: 38100, fill: "var(--chart-2)" },
    { name: "Viewed solution", value: 21400, fill: "var(--chart-3)" },
    { name: "Started trial", value: 9800, fill: "var(--chart-4)" },
    { name: "Converted", value: 5120, fill: "var(--chart-5)" },
  ],
  weekly: [
    { week: "W9", entered: 9200, converted: 640 },
    { week: "W10", entered: 10400, converted: 780 },
    { week: "W11", entered: 11800, converted: 920 },
    { week: "W12", entered: 11200, converted: 880 },
    { week: "W13", entered: 12600, converted: 1040 },
    { week: "W14", entered: 13400, converted: 1180 },
  ],
  paths: [
    { path: "Guide → Pricing → Trial", users: "4,820", conv: "18.2%", time: "2.1d" },
    { path: "Article → Guide → Demo", users: "3,140", conv: "12.4%", time: "3.8d" },
    { path: "Docs → API → Trial", users: "2,680", conv: "22.6%", time: "1.4d" },
    { path: "Landing → Pricing → Trial", users: "2,104", conv: "9.8%", time: "0.9d" },
    { path: "Search → Article → Signup", users: "1,880", conv: "7.2%", time: "5.2d" },
  ],
};

export const TOPIC_INTEREST = {
  stats: [
    { label: "Tracked topics", value: "128", delta: "+8", trend: "up", footer: "Active taxonomy" },
    { label: "High-intent topics", value: "24", delta: "+4", trend: "up", footer: "Eval or later" },
    { label: "Emerging topics", value: "11", delta: "+3", trend: "up", footer: "Fast momentum" },
    { label: "Declining topics", value: "6", delta: "-2", trend: "up", footer: "Needs refresh" },
  ],
  trend: [
    { date: "Mar 3", aiVideo: 3200, contentOS: 1800, automation: 1400 },
    { date: "Mar 10", aiVideo: 3800, contentOS: 2100, automation: 1600 },
    { date: "Mar 17", aiVideo: 4400, contentOS: 2400, automation: 1500 },
    { date: "Mar 24", aiVideo: 5200, contentOS: 2600, automation: 1900 },
    { date: "Mar 31", aiVideo: 6100, contentOS: 3100, automation: 2200 },
    { date: "Apr 5", aiVideo: 6800, contentOS: 3400, automation: 2500 },
  ],
  stages: [
    { topic: "AI video", discovered: 4200, learning: 3100, evaluating: 1800, converted: 920 },
    { topic: "Content OS", discovered: 2800, learning: 1900, evaluating: 980, converted: 410 },
    { topic: "Automation", discovered: 2400, learning: 1600, evaluating: 720, converted: 280 },
    { topic: "Personalization", discovered: 1900, learning: 1200, evaluating: 540, converted: 190 },
    { topic: "Analytics", discovered: 1500, learning: 900, evaluating: 380, converted: 140 },
  ],
  rows: [
    { topic: "AI product videos", interest: 94, momentum: "+18%", stage: "Expanding", content: 42 },
    { topic: "Content OS", interest: 82, momentum: "+11%", stage: "Evaluating", content: 36 },
    { topic: "Workflow automation", interest: 76, momentum: "+9%", stage: "Learning", content: 28 },
    { topic: "Personalization", interest: 68, momentum: "+6%", stage: "Learning", content: 22 },
    { topic: "Edge delivery", interest: 54, momentum: "-2%", stage: "Dormant", content: 14 },
    { topic: "Legacy imports", interest: 31, momentum: "-8%", stage: "Negative", content: 9 },
  ],
};

export const SEMANTIC_SEARCH = {
  stats: [
    { label: "Total queries", value: "28,410", delta: "+14.2%", trend: "up", footer: "Semantic searches" },
    { label: "Zero-result rate", value: "4.2%", delta: "-1.1%", trend: "up", footer: "No good match" },
    { label: "CTR on results", value: "58.6%", delta: "+2.4%", trend: "up", footer: "Clicked top 5" },
    { label: "Avg. latency", value: "184ms", delta: "-22ms", trend: "up", footer: "P95 320ms" },
  ],
  volume: [
    { date: "Mar 3", queries: 1800, noResult: 120 },
    { date: "Mar 10", queries: 2100, noResult: 110 },
    { date: "Mar 17", queries: 2400, noResult: 98 },
    { date: "Mar 24", queries: 2600, noResult: 88 },
    { date: "Mar 31", queries: 2900, noResult: 76 },
    { date: "Apr 5", queries: 3200, noResult: 64 },
  ],
  intents: [
    { name: "How-to", value: 9200 },
    { name: "Comparison", value: 6100 },
    { name: "Pricing", value: 4800 },
    { name: "Troubleshooting", value: 3900 },
    { name: "Concept", value: 3100 },
  ],
  rows: [
    { query: "automate product videos", count: "2,410", ctr: "72%", noResult: "1.2%", action: "Covered" },
    { query: "content os vs cms", count: "1,880", ctr: "66%", noResult: "0.8%", action: "Covered" },
    { query: "edge cache purge", count: "1,204", ctr: "61%", noResult: "2.4%", action: "Improve" },
    { query: "tiktok feed ranking", count: "986", ctr: "48%", noResult: "8.2%", action: "Gap" },
    { query: "scim provisioning", count: "742", ctr: "52%", noResult: "5.6%", action: "Gap" },
    { query: "webhook retries", count: "688", ctr: "64%", noResult: "1.8%", action: "Covered" },
  ],
};

export const AI_TAG_SUGGESTIONS = {
  stats: [
    { label: "Suggestions", value: "3,842", delta: "+18.4%", trend: "up", footer: "Generated" },
    { label: "Approval rate", value: "78.2%", delta: "+4.2%", trend: "up", footer: "Accepted by editors" },
    { label: "Pending review", value: "412", delta: "+28", trend: "down", footer: "In queue" },
    { label: "Avg. confidence", value: "0.84", delta: "+0.03", trend: "up", footer: "Model score" },
  ],
  confidence: [
    { bucket: "0.5–0.6", count: 180 },
    { bucket: "0.6–0.7", count: 340 },
    { bucket: "0.7–0.8", count: 720 },
    { bucket: "0.8–0.9", count: 1480 },
    { bucket: "0.9–1.0", count: 1122 },
  ],
  outcome: [
    { name: "Accepted", value: 3004 },
    { name: "Edited", value: 428 },
    { name: "Rejected", value: 410 },
  ],
  rows: [
    { content: "Getting started guide", tag: "onboarding", conf: "0.96", status: "Accepted" },
    { content: "AI product videos", tag: "ai-video", conf: "0.94", status: "Accepted" },
    { content: "Pricing overview", tag: "purchase-intent", conf: "0.88", status: "Edited" },
    { content: "API quickstart", tag: "developers", conf: "0.91", status: "Accepted" },
    { content: "Changelog — March", tag: "release-notes", conf: "0.72", status: "Pending" },
    { content: "Legacy import doc", tag: "migration", conf: "0.61", status: "Rejected" },
  ],
};

export const EMBEDDINGS = {
  stats: [
    { label: "Vectors indexed", value: "24,810", delta: "+1,204", trend: "up", footer: "Live embeddings" },
    { label: "Coverage", value: "96.4%", delta: "+1.2%", trend: "up", footer: "Content with vectors" },
    { label: "Avg. quality", value: "0.91", delta: "+0.02", trend: "up", footer: "Coherence score" },
    { label: "Stale vectors", value: "312", delta: "-48", trend: "up", footer: "Needs refresh" },
  ],
  scatter: [
    { x: 12, y: 84, z: 420, topic: "AI video" },
    { x: 18, y: 78, z: 380, topic: "AI video" },
    { x: 24, y: 72, z: 310, topic: "Automation" },
    { x: 32, y: 66, z: 280, topic: "Automation" },
    { x: 44, y: 58, z: 240, topic: "Content OS" },
    { x: 52, y: 62, z: 260, topic: "Content OS" },
    { x: 61, y: 48, z: 190, topic: "Personalization" },
    { x: 68, y: 54, z: 210, topic: "Personalization" },
    { x: 76, y: 38, z: 150, topic: "Edge" },
    { x: 84, y: 44, z: 170, topic: "Edge" },
    { x: 38, y: 74, z: 340, topic: "Analytics" },
    { x: 58, y: 52, z: 200, topic: "Analytics" },
  ],
  models: [
    { model: "v3-large", vectors: 14800, quality: 0.93, latency: 142 },
    { model: "v3-small", vectors: 7200, quality: 0.88, latency: 96 },
    { model: "v2-legacy", vectors: 2810, quality: 0.81, latency: 118 },
  ],
  rows: [
    { scope: "Articles", coverage: "98%", quality: "0.93", refreshed: "2h ago", status: "Healthy" },
    { scope: "Guides", coverage: "97%", quality: "0.92", refreshed: "4h ago", status: "Healthy" },
    { scope: "Docs", coverage: "95%", quality: "0.9", refreshed: "1d ago", status: "Healthy" },
    { scope: "Pages", coverage: "93%", quality: "0.87", refreshed: "2d ago", status: "Refreshing" },
    { scope: "Assets", coverage: "88%", quality: "0.82", refreshed: "5d ago", status: "Stale" },
  ],
};

export const DUPLICATE_DETECTION = {
  stats: [
    { label: "Similarity groups", value: "48", delta: "-6", trend: "up", footer: "Open clusters" },
    { label: "Duplicates found", value: "132", delta: "-18", trend: "up", footer: "Above threshold" },
    { label: "Merged this period", value: "36", delta: "+8", trend: "up", footer: "Canonicalized" },
    { label: "Avg. similarity", value: "0.87", delta: "+0.01", trend: "down", footer: "In groups" },
  ],
  buckets: [
    { bucket: "0.70–0.75", count: 42 },
    { bucket: "0.75–0.80", count: 36 },
    { bucket: "0.80–0.85", count: 28 },
    { bucket: "0.85–0.90", count: 16 },
    { bucket: "0.90–1.00", count: 10 },
  ],
  outcome: [
    { name: "Unique", value: 1840 },
    { name: "Near-duplicate", value: 96 },
    { name: "Exact duplicate", value: 36 },
  ],
  rows: [
    { group: "Onboarding guides (4)", similarity: "0.94", canonical: "Getting started guide", action: "Merge" },
    { group: "Pricing pages (3)", similarity: "0.91", canonical: "Pricing overview", action: "Review" },
    { group: "API intros (3)", similarity: "0.88", canonical: "API quickstart", action: "Review" },
    { group: "Release notes (5)", similarity: "0.82", canonical: "Changelog — March", action: "Keep" },
    { group: "Template lists (2)", similarity: "0.78", canonical: "Campaign templates", action: "Keep" },
    { group: "Migration docs (2)", similarity: "0.74", canonical: "Legacy import doc", action: "Ignore" },
  ],
};

export const CONTENT_GAPS = {
  stats: [
    { label: "Open gaps", value: "36", delta: "-4", trend: "up", footer: "Unmet demand" },
    { label: "High opportunity", value: "9", delta: "+2", trend: "down", footer: "Score 80+" },
    { label: "Searches w/o content", value: "1,842", delta: "-212", trend: "up", footer: "Last period" },
    { label: "Gaps closed", value: "14", delta: "+5", trend: "up", footer: "Published" },
  ],
  demand: [
    { topic: "AI video", demand: 92, supply: 48 },
    { topic: "Content OS", demand: 78, supply: 52 },
    { topic: "Automation", demand: 71, supply: 38 },
    { topic: "Personalization", demand: 64, supply: 30 },
    { topic: "Edge", demand: 52, supply: 34 },
    { topic: "SCIM/SSO", demand: 48, supply: 12 },
  ],
  opportunity: [
    { topic: "SCIM provisioning", score: 92 },
    { topic: "Feed ranking", score: 88 },
    { topic: "Video automation", score: 84 },
    { topic: "A/B targeting", score: 76 },
    { topic: "Cache purge", score: 68 },
  ],
  rows: [
    { gap: "SCIM provisioning guide", demand: "742 searches", supply: "0 pieces", score: 92, owner: "Docs" },
    { gap: "Feed ranking explainer", demand: "986 searches", supply: "1 piece", score: 88, owner: "Editorial" },
    { gap: "Video automation playbook", demand: "1,204 searches", supply: "2 pieces", score: 84, owner: "Growth" },
    { gap: "A/B targeting deep-dive", demand: "688 searches", supply: "1 piece", score: 76, owner: "Product" },
    { gap: "Cache purge runbook", demand: "540 searches", supply: "1 piece", score: 68, owner: "Docs" },
  ],
};

export const KNOWLEDGE_GRAPH = {
  stats: [
    { label: "Entities", value: "8,412", delta: "+486", trend: "up", footer: "Content + topics + users" },
    { label: "Relationships", value: "42,180", delta: "+3.2k", trend: "up", footer: "Typed edges" },
    { label: "Graph density", value: "0.68", delta: "+0.04", trend: "up", footer: "Connectivity" },
    { label: "Orphan nodes", value: "184", delta: "-24", trend: "up", footer: "No edges" },
  ],
  entities: [
    { type: "Content", count: 3840 },
    { type: "Topics", count: 1280 },
    { type: "Segments", count: 1840 },
    { type: "Experiments", count: 720 },
    { type: "Outcomes", count: 732 },
  ],
  relations: [
    { relation: "covers topic", count: 12400 },
    { relation: "interested in", count: 18200 },
    { relation: "recommends", count: 6400 },
    { relation: "converts to", count: 3180 },
    { relation: "similar to", count: 2000 },
  ],
  nodes: [
    { id: "AI Video", kind: "topic", x: 50, y: 22, size: 22 },
    { id: "Getting started", kind: "content", x: 24, y: 44, size: 16 },
    { id: "API quickstart", kind: "content", x: 76, y: 44, size: 15 },
    { id: "Marketers", kind: "segment", x: 18, y: 72, size: 17 },
    { id: "Developers", kind: "segment", x: 82, y: 72, size: 16 },
    { id: "Trial start", kind: "outcome", x: 50, y: 90, size: 14 },
    { id: "Content OS", kind: "topic", x: 50, y: 54, size: 18 },
  ],
  edges: [
    [0, 1],
    [0, 2],
    [0, 6],
    [1, 3],
    [2, 4],
    [6, 1],
    [6, 2],
    [3, 5],
    [4, 5],
    [6, 5],
  ],
  rows: [
    { from: "AI Video", relation: "recommends", to: "Campaign templates", strength: "0.92" },
    { from: "Marketers", relation: "interested in", to: "AI Video", strength: "0.88" },
    { from: "API quickstart", relation: "converts to", to: "Trial start", strength: "0.84" },
    { from: "Getting started", relation: "similar to", to: "API quickstart", strength: "0.78" },
    { from: "Content OS", relation: "covers topic", to: "Personalization", strength: "0.74" },
  ],
};

export const DECISION_EXPLANATIONS = {
  stats: [
    { label: "Decisions traced", value: "182,400", delta: "+12.1%", trend: "up", footer: "Edge decisions" },
    { label: "Rule-matched", value: "72.4%", delta: "+2.1%", trend: "up", footer: "Explainable path" },
    { label: "Fallback rate", value: "3.8%", delta: "-0.6%", trend: "up", footer: "Default content" },
    { label: "Avg. decision time", value: "42ms", delta: "-6ms", trend: "up", footer: "P95 88ms" },
  ],
  breakdown: [
    { name: "Targeting rule", value: 98400 },
    { name: "Experiment", value: 34200 },
    { name: "Recommendation", value: 28800 },
    { name: "Fallback", value: 6900 },
    { name: "Boost/exclusion", value: 14100 },
  ],
  latency: [
    { date: "Mar 3", p50: 38, p95: 92 },
    { date: "Mar 10", p50: 36, p95: 88 },
    { date: "Mar 17", p50: 41, p95: 96 },
    { date: "Mar 24", p50: 39, p95: 90 },
    { date: "Mar 31", p50: 44, p95: 94 },
    { date: "Apr 5", p50: 42, p95: 88 },
  ],
  rows: [
    { request: "homepage_hero · marketer", decision: "hero_ai_video_v2", reason: "Segment + high intent", conf: "0.94", time: "38ms" },
    { request: "docs_feed · developer", decision: "api_quickstart", reason: "Behavior + affinity", conf: "0.91", time: "41ms" },
    { request: "pricing_slot · ecommerce", decision: "pricing_variant_b", reason: "A/B test bucket", conf: "0.88", time: "36ms" },
    { request: "dashboard_feed · new", decision: "getting_started", reason: "Fallback — no signal", conf: "0.52", time: "28ms" },
    { request: "blog_rail · dormant", decision: "reengagement_pack", reason: "Boost rule", conf: "0.79", time: "44ms" },
  ],
};
