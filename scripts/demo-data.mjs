import { createHash } from "node:crypto";

export const DEMO_PROJECT = "ebcc7910-1a0e-4e91-8c3b-752f3c4292d3";
export const DEMO_TAG = "geiger-content-demonstrator-v1";
export function demoId(key) {
  const hex = createHash("sha256").update(`${DEMO_PROJECT}:${DEMO_TAG}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const articles = [
  ["Welcome to Geiger Content Studio", "Page", "Getting started", "Create, review, personalize, and deliver content from one connected workspace.", "Start with the editorial library. Each entry has an owner, a locale, an environment, and a clear publication state. The demo combines a product journal, a help center, and a campaign landing page so you can follow content from a draft to a measurable visitor experience."],
  ["Your first content project in fifteen minutes", "Guide", "Getting started", "A practical path from an empty workspace to a published page.", "Choose a default locale and create an Article content type. Add a short excerpt, a reading time, and a featured flag. Write a clear title and two useful sections, invite a reviewer, and publish the approved version. Open the delivery URL and compare the saved snapshot with your next edit."],
  ["A launch page for teams that move together", "Page", "Launch planning", "Bring your launch story, supporting guides, and next action into one page.", "A successful launch page gives visitors a reason to care, shows how the product works, and offers one next step. Use a reusable hero block for the headline and a call to action block for the trial link. Connect the page to onboarding guides through entry references rather than copying the same text."],
  ["Model once, publish everywhere", "Article", "Content modeling", "Use structured fields to keep websites, campaigns, and apps consistent.", "Structured content separates the information from the presentation. Editors enter validated values and designers decide how those values appear on each channel. Begin with the fields your team actually needs: summary, reading time, featured status, and a related guide. Localize the summary and reuse the related guide by reference."],
  ["The editorial review checklist", "Guide", "Editorial operations", "Make approval predictable with a short, repeatable review routine.", "Check the title for clarity, the excerpt for usefulness, the cover for descriptive alternative text, and every reference for relevance. Ask the assigned reviewer to resolve factual questions in comments. Record the approved version before publication so the team can see exactly what changed later."],
  ["Publish with confidence across environments", "Doc", "Delivery", "Use production, staging, and sandbox to separate live content from experiments.", "Production holds the public experience. Staging is for stakeholder preview and sandbox is for trying new models. Choose the environment before creating a delivery site. Verify that the fallback entry is published and that a targeted variant belongs to the same project. Keep drafts out of public delivery."],
  ["Personalization that starts with consent", "Article", "Personalization", "Respect visitor choices while still delivering useful default content.", "A visitor can accept analytics while declining personalization. Store each purpose independently and use a published fallback when personalization is denied. Profiles in this demonstration include granted, pending, and denied choices. You can test each scenario without using a real customer's identity."],
  ["Build a useful returning-reader experience", "Guide", "Personalization", "Turn repeat visits into a clearer path through your library.", "Start with a segment for readers who viewed at least three articles. Offer an advanced guide when their topic stage is engaged and a beginner guide when they are curious. Cap repeated impressions so a promotional card does not dominate the experience. Keep a default option for people who do not match a rule."],
  ["Test a headline without losing the story", "Article", "Experimentation", "Compare two promises while keeping the audience and goal consistent.", "A headline test should change one meaningful idea. The control emphasizes faster publishing and the challenger emphasizes team confidence. Split eligible traffic evenly, reserve a small holdout, and measure trial starts. Review exposures and conversions together before calling a winner."],
  ["Read the metrics behind a launch", "Guide", "Analytics", "Understand reach, engagement, and conversion across thirty days.", "Views tell you how many times content was seen; conversions show whether the next step happened. Compare a rising week with the previous week and inspect the entry behind each spike. The synthetic events in this demo are rolled up into matching daily metrics, so the charts and event stream tell the same story."],
  ["Localize a help center with fallback languages", "Guide", "Localization", "Give translators a stable source and readers a useful fallback.", "Publish the English source before creating Hindi and French editions. Localize the summary and body while retaining references to the same conceptual guide. Set English as the fallback language and review translated snapshots before release. A missing translation should never become an empty help page."],
  ["Reusable blocks for a consistent brand", "Doc", "Content modeling", "Compose pages from hero, quote, feature, and call to action blocks.", "Blocks keep repeated content patterns consistent. A hero carries a headline and supporting line, a feature block explains a benefit, and a quote adds evidence. Instances store entry-specific values and an explicit position. Editors can reorder those instances while the schema remains reusable."],
  ["Launching the autumn product journal", "Article", "Launch planning", "A connected release story for a distributed editorial team.", "The autumn journal brings together product updates, practical tutorials, and customer stories. The first release focuses on structured content and the second introduces audience journeys. Review the launch collection in order, check cover assets, and use the homepage hero slot to direct readers to the most relevant introduction."],
  ["API delivery quickstart", "Doc", "Delivery", "Read published content through REST and GraphQL.", "Request the entries endpoint with an explicit project ID and inspect the returned title, excerpt, and body. GraphQL lets a client choose the fields it needs. Delivery excludes drafts and private entries. Use the collect endpoint to record a page view only after analytics consent is granted."],
  ["Taxonomy that readers can navigate", "Article", "Content modeling", "Build a small topic hierarchy instead of an unbounded tag list.", "Group editorial operations and launch planning under Team practice. Group delivery and modeling under Platform. Use terms to connect related guides and expose a readable browsing path. Prefer a few well-defined topics over synonyms that split the same audience across multiple labels."],
  ["Version history as an editorial safety net", "Guide", "Editorial operations", "Compare, explain, and recover important content changes.", "Every publish snapshot preserves the complete entry payload. Compare the first introduction with the revised introduction to see changes in title, excerpt, and typed data. A rollback restores a reviewed snapshot and creates a traceable new decision. Keep unresolved comments attached to the entry rather than hiding the discussion."],
  ["A homepage for first-time readers", "Page", "Getting started", "Offer a short explanation and a clear first guide.", "Welcome new readers with a plain-language promise: create useful content and deliver it confidently. The introductory homepage variant links to the first-project guide. Returning readers can receive an advanced workflow variant, while a consent-denied reader receives this safe default."],
  ["A homepage for growing editorial teams", "Page", "Editorial operations", "Lead with collaboration, approvals, and reusable publishing routines.", "Growing teams need a shared way to decide what is ready. Assign a reviewer, give each article a due date, and track progress through Draft, In review, and Published. This page highlights those routines and directs experienced readers to the review checklist."],
  ["Faster publishing, fewer handoffs", "Page", "Experimentation", "The control page for the launch headline experiment.", "Create a reusable content model, write once, and deliver the same story across channels. The control headline leads with speed. Its call to action invites the visitor to start a content project. Compare its conversion rate with the confidence-focused challenger in the experiment report."],
  ["Give your team confidence to publish", "Page", "Experimentation", "The challenger page for the launch headline experiment.", "Make every publication a team decision you can explain. Structured fields, review comments, and version history show what changed and who approved it. The challenger headline leads with confidence and keeps the same trial action as the control."],
  ["Managing media without duplicate uploads", "Guide", "Media operations", "Keep a usable asset library with folders, alternative text, and checksums.", "Name a cover for its purpose and place it in a campaign folder. Use a checksum to spot byte-identical uploads and review visually similar covers before deleting anything. The demo includes one intentional duplicate cover so the duplicate inspection screen has a concrete example."],
  ["Designing fair frequency caps", "Article", "Personalization", "Limit repetition while keeping recommendations relevant.", "A frequency cap limits the impressions a visitor receives within a defined window. Apply a short cap to campaign calls to action and a longer window to onboarding prompts. Check the visitor history before delivery and retain a fallback when the eligible set becomes empty."],
  ["Governance for a small content team", "Doc", "Editorial operations", "Make permissions, retention, and editorial standards visible.", "Writers can edit drafts, publishers can approve delivery, and analysts can inspect aggregated results. Editorial policies describe the team's standards; retention rules describe what happens to old data. Demo credentials are revoked and integrations are paused so their records can be inspected without connecting outside services."],
  ["Connecting a product catalog to editorial content", "Doc", "Content modeling", "Represent external sources without duplicating the source of truth.", "An external source records its type, endpoint, status, and mapping. Reference catalog items from an entry and keep the source credentials on the server. This demonstration includes disconnected API, RSS, CSV, and CMS configurations with example endpoints and seeded mapping metadata."],
];

const pipeline = [
  ["A writer's guide to clearer excerpts", "Draft", "Article", "Editorial operations"],
  ["Planning the winter editorial calendar", "Draft", "Guide", "Launch planning"],
  ["A new customer story: the Northstar team", "Draft", "Article", "Editorial operations"],
  ["Campaign brief: a better first week", "Draft", "Page", "Getting started"],
  ["Documenting the block library", "Draft", "Doc", "Content modeling"],
  ["Trial-start measurement notes", "Draft", "Doc", "Analytics"],
  ["The accessibility review routine", "In review", "Guide", "Editorial operations"],
  ["Launching a multilingual product update", "In review", "Article", "Localization"],
  ["Personalized onboarding: reviewer edition", "In review", "Page", "Personalization"],
  ["REST delivery examples for reviewers", "In review", "Doc", "Delivery"],
  ["The next release of Content Studio", "Scheduled", "Article", "Launch planning"],
  ["Advanced workflow office hours", "Scheduled", "Guide", "Editorial operations"],
  ["A new guide to consent-aware journeys", "Scheduled", "Guide", "Personalization"],
  ["Release notes: October improvements", "Scheduled", "Doc", "Delivery"],
  ["Summer launch landing page", "Archived", "Page", "Launch planning"],
  ["Legacy CSV import instructions", "Archived", "Doc", "Content modeling"],
  ["Old onboarding checklist", "Archived", "Guide", "Getting started"],
  ["Previous homepage announcement", "Archived", "Article", "Launch planning"],
];

export function buildDemo({ ownerId, columns, assetFiles, now = new Date() }) {
  const tables = new Map();
  const stamp = (days, hours = 10) => {
    const date = new Date(now); date.setUTCDate(date.getUTCDate() + days); date.setUTCHours(hours, 0, 0, 0); return date.toISOString();
  };
  const add = (table, key, payload) => {
    const names = new Set(columns.filter(c => c.table_schema === "content" && c.table_name === table).map(c => c.column_name));
    const row = { id: demoId(`${table}:${key}`), ...payload };
    if (names.has("project_id")) row.project_id = DEMO_PROJECT;
    if (names.has("created_by")) row.created_by = ownerId;
    if (names.has("metadata")) row.metadata = { ...row.metadata, demoSeed: DEMO_TAG, synthetic: true };
    if (names.has("created_at") && !row.created_at) row.created_at = stamp(-35);
    if (names.has("updated_at") && !row.updated_at) row.updated_at = row.created_at || stamp(-1);
    for (const name of Object.keys(row)) if (!names.has(name)) throw new Error(`Unknown seed column ${table}.${name}`);
    if (!tables.has(table)) tables.set(table, []);
    tables.get(table).push(row); return row;
  };

  const production = add("environments", "production", { key: "demo-production", name: "Demo Production", is_default: true });
  const staging = add("environments", "staging", { key: "demo-staging", name: "Demo Staging" });
  add("environments", "sandbox", { key: "demo-sandbox", name: "Demo Sandbox" });
  add("project_settings", "settings", { default_locale: "en", timezone: "Asia/Calcutta", brand_name: "Geiger Content Studio", metadata: { branding: { tagline: "Create useful content. Deliver it confidently.", logoUrl: assetFiles[0].url, supportEmail: "studio@example.test" }, demoGuide: "docs/demonstrator-account.md" } });
  for (const [code, label, fallback] of [["en", "English", ""], ["hi", "Hindi", "en"], ["fr", "French", "en"]]) add("locales", code, { code, label, fallback_code: fallback, is_default: code === "en" });
  for (const [i, label] of ["Draft", "In review", "Approved", "Published", "Archived"].entries()) add("workflow_states", label, { key: `demo-${label.toLowerCase().replaceAll(" ", "-")}`, label, position: i, is_terminal: i >= 3 });

  const types = {};
  for (const name of ["Article", "Page", "Guide", "Doc"]) {
    types[name] = add("content_types", name, { key: `demo-${name.toLowerCase()}`, name, icon: name === "Page" ? "Layout" : "FileText", metadata: { description: `Structured ${name.toLowerCase()} for the Content Studio demonstration` } });
    const fields = [["summary", "Summary", "text", true], ["reading_minutes", "Reading time", "number", false], ["featured", "Featured", "boolean", false], ["review_date", "Review date", "date", false], ["related_guide", "Related guide", "reference", false]];
    fields.forEach(([key, label, data_type, localized], position) => add("fields", `${name}:${key}`, { type_id: types[name].id, key, label, data_type, localized, position, validation: key === "summary" ? { required: true, minLength: 25, maxLength: 300 } : key === "reading_minutes" ? { min: 1, max: 60 } : {} }));
  }
  const topicTax = add("taxonomies", "topics", { key: "demo-topics", name: "Demo Topics", hierarchical: true });
  const journeyTax = add("taxonomies", "journey", { key: "demo-journey", name: "Reader Journey", hierarchical: false });
  const root = add("terms", "platform", { taxonomy_id: topicTax.id, slug: "platform", label: "Platform" });
  const team = add("terms", "team", { taxonomy_id: topicTax.id, slug: "team-practice", label: "Team practice" });
  const topics = [...new Set([...articles.map(a => a[2]), ...pipeline.map(a => a[3])])];
  const terms = {};
  topics.forEach(topic => { terms[topic] = add("terms", topic, { taxonomy_id: topicTax.id, slug: topic.toLowerCase().replaceAll(" ", "-"), label: topic, parent_id: ["Editorial operations", "Launch planning", "Getting started"].includes(topic) ? team.id : root.id }); });
  ["Discover", "Learn", "Adopt"].forEach(label => add("terms", `journey:${label}`, { taxonomy_id: journeyTax.id, slug: label.toLowerCase(), label }));

  const blocks = [
    ["hero", "Hero", { headline: { type: "text", required: true }, subtitle: { type: "text" } }],
    ["feature", "Feature", { title: { type: "text" }, description: { type: "text" } }],
    ["quote", "Customer quote", { text: { type: "text" }, attribution: { type: "text" } }],
    ["cta", "Call to action", { label: { type: "text" }, href: { type: "text" } }],
  ].map(([key, name, schema]) => add("blocks", key, { key: `demo-${key}`, name, schema }));

  const entries = articles.map(([title, type, topic, excerpt, detail], i) => add("entries", `published:${i}`, {
    title, type, slug: `demo-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`, status: "Published", excerpt,
    body: JSON.stringify({ blocks: [{ type: "heading", text: title }, { type: "paragraph", text: excerpt }, { type: "heading", text: "Put it into practice" }, { type: "paragraph", text: detail }, { type: "paragraph", text: "Try this in the demonstration workspace: inspect the linked records, compare a saved version, and follow the related guide. All audience and performance examples are synthetic." }] }),
    author: ["Maya Patel", "Alex Morgan", "Priya Shah", "Noah Kim"][i % 4], locale: "en", environment_id: production.id, cover_url: assetFiles[i % 12].url,
    published_at: stamp(-34 + Math.floor(i / 3)), created_at: stamp(-45 + Math.floor(i / 3)), updated_at: stamp(-4 + i % 4),
    data: { summary: excerpt, reading_minutes: 3 + i % 5, featured: i % 6 === 0, review_date: stamp(14).slice(0, 10), related_guide: demoId("entries:published:1") },
    metadata: { topics: [topic], tags: [topic], visibility: "public", campaign: "Autumn product journal", seoTitle: title, seoDescription: excerpt },
  }));
  pipeline.forEach(([title, status, type, topic], i) => entries.push(add("entries", `pipeline:${i}`, {
    title, status, type, slug: `demo-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`,
    excerpt: `${title}: practical guidance prepared for the next Content Studio editorial cycle.`,
    body: JSON.stringify({ blocks: [{ type: "heading", text: title }, { type: "paragraph", text: `This ${type.toLowerCase()} explains ${topic.toLowerCase()} for an editorial team. Start by documenting the reader's question, connect the relevant guide, and check the proposed call to action with the reviewer.` }, { type: "paragraph", text: status === "In review" ? "Review request: confirm the examples and resolve the open comment before publication." : "Next step: add a concrete example and compare it with the approved content model." }] }),
    author: ["Maya Patel", "Alex Morgan", "Priya Shah"][i % 3], environment_id: status === "Draft" ? staging.id : production.id, cover_url: assetFiles[i % 12].url,
    scheduled_at: status === "Scheduled" ? stamp(1 + i % 7) : null, published_at: status === "Archived" ? stamp(-90) : null,
    data: { summary: `${title}: practical guidance prepared for the next Content Studio editorial cycle.`, reading_minutes: 4, featured: false, review_date: stamp(7).slice(0, 10), related_guide: entries[1].id },
    metadata: { topics: [topic], visibility: "public", campaign: "Autumn product journal" }, created_at: stamp(-12 + i % 10),
  })));
  const translations = [
    ["hi", "Geiger Content Studio में आपका स्वागत है", "एक ही कार्यक्षेत्र से सामग्री बनाएँ, समीक्षा करें और प्रकाशित करें।", "यह प्रदर्शन परियोजना सामग्री की योजना, टीम समीक्षा और प्रकाशन का पूरा प्रवाह दिखाती है। पहले गाइड को खोलें, सामग्री मॉडल देखें और प्रकाशित संस्करण से तुलना करें।"],
    ["fr", "Bienvenue dans Geiger Content Studio", "Créez, révisez et publiez du contenu depuis un espace partagé.", "Ce projet de démonstration relie les modèles de contenu, la révision éditoriale et la publication. Consultez le premier guide, explorez les champs structurés et comparez les versions enregistrées."],
  ];
  for (const [locale, title, excerpt, body] of translations) entries.push(add("entries", `translation:${locale}`, { title, type: "Page", slug: `demo-welcome-${locale}`, status: "Published", locale, excerpt, body: JSON.stringify({ blocks: [{ type: "heading", text: title }, { type: "paragraph", text: body }] }), author: "Priya Shah", environment_id: production.id, cover_url: assetFiles[0].url, published_at: stamp(-15), data: { ...entries[0].data, summary: excerpt }, metadata: { topics: ["Localization"], visibility: "public", translationOf: entries[0].id } }));
  entries.push(add("entries", "private", { title: "Internal launch risk register", type: "Doc", slug: "demo-internal-launch-risks", status: "Published", excerpt: "Private editorial planning example for delivery access checks.", body: "Internal demonstration record. Verify that anonymous public delivery returns no content for this entry.", author: "Maya Patel", environment_id: production.id, published_at: stamp(-10), data: { summary: "Private editorial planning example for delivery access checks.", reading_minutes: 2, featured: false }, metadata: { topics: ["Launch planning"], visibility: "private" } }));

  for (const [i, entry] of entries.entries()) {
    const topic = entry.metadata.topics[0];
    add("entry_terms", `${i}:topic`, { entry_id: entry.id, term_id: terms[topic].id });
    add("entry_references", `${i}:guide`, { from_entry_id: entry.id, to_entry_id: entries[i === 1 ? 4 : 1].id, field_key: "related_guide" });
    if (entry.type === "Page") blocks.forEach((block, position) => add("block_instances", `${i}:${position}`, { block_id: block.id, entry_id: entry.id, position, data: position === 0 ? { headline: entry.title, subtitle: entry.excerpt } : position === 1 ? { title: "One connected workspace", description: "Model, review, and deliver your next story." } : position === 2 ? { text: "Our demo team can explain every publishing decision.", attribution: "Maya Patel, fictional editorial lead" } : { label: "Read the first guide", href: `/c/${entries[1].id}` } }));
    for (let version = 1; version <= (i < 6 ? 3 : 1); version++) add("entry_versions", `${i}:${version}`, { entry_id: entry.id, version, published_at: entry.status === "Published" ? stamp(-25 + version) : null, payload: { ...entry, title: version === 1 && i < 6 ? `${entry.title} — first edition` : entry.title, data: { ...entry.data, featured: version > 1 && entry.data.featured } }, metadata: { locale: entry.locale || "en", note: version === 1 ? "Initial editorial snapshot" : "Approved editorial revision" }, created_at: stamp(-25 + version) });
    add("audit_log", `entry:${i}`, { actor: ownerId, action: entry.status === "Published" ? "publish" : "create", entity: "entry", entity_id: entry.id, diff: { title: entry.title, status: entry.status, synthetic: true }, at: stamp(-8 + i % 8) });
  }
  const groups = [
    ["Start here", [0, 1, 4, 6, 14, 15]], ["Autumn launch", [2, 12, 16, 18, 19]], ["Developer handbook", [5, 11, 13, 23]], ["Audience journeys", [6, 7, 8, 9, 21]], ["Editorial playbook", [4, 15, 17, 22]], ["Translation desk", [10, 42, 43]],
  ];
  groups.forEach(([name, members], i) => {
    const collection = add("collections", i, { name, slug: `demo-${name.toLowerCase().replaceAll(" ", "-")}`, description: `An ordered demonstration collection for ${name.toLowerCase()}.`, status: "Published", cover_url: assetFiles[i].url });
    members.forEach((index, position) => add("collection_items", `${i}:${index}`, { collection_id: collection.id, entry_id: entries[index].id, position }));
  });
  assetFiles.forEach((file, i) => add("assets", i, { ...file, name: file.name, folder: i < 12 ? "Demo / Autumn journal" : "Demo / Playbooks", status: "Ready", metadata: { ...file.metadata, entry_id: entries[i % 24].id, topics: entries[i % 24].metadata.topics } }));
  entries.filter(e => ["Draft", "In review", "Scheduled"].includes(e.status)).forEach((entry, i) => {
    add("assignments", i, { entry_id: entry.id, assignee: ["Maya Patel", "Alex Morgan", "Priya Shah"][i % 3], due_at: stamp(i % 8 - 2), status: i % 5 === 0 ? "Done" : i % 3 === 0 ? "In progress" : "Open", priority: i % 3 === 0 ? "High" : "Normal", metadata: { note: "Fictional team assignment for the editorial demonstration" } });
    add("comments", `${i}:question`, { entry_id: entry.id, field_key: "body", thread_id: `demo-thread-${i}`, body: "Could we add a concrete example and link the related guide before the next review?", mentions: [], resolved: i % 3 === 0, created_at: stamp(-3) });
    add("comments", `${i}:reply`, { entry_id: entry.id, field_key: "body", thread_id: `demo-thread-${i}`, body: i % 3 === 0 ? "The example and reference have been checked. Resolving this discussion." : "The reference is ready. I will bring the revised example to the next review.", resolved: i % 3 === 0, created_at: stamp(-2) });
  });

  const profiles = Array.from({ length: 40 }, (_, i) => add("profiles", i, { primary_identifier: `reader${String(i + 1).padStart(2, "0")}@example.test`, identifiers: [`demo-reader-${i + 1}`], metadata: { name: ["Aarav", "Emma", "Lina", "Mateo", "Nora", "Rohan", "Sofia", "Theo"][i % 8] + ` ${i + 1}`, synthetic: true, country: ["IN", "GB", "US", "FR"][i % 4] }, created_at: stamp(-35 + i % 12) }));
  profiles.forEach((profile, i) => {
    const traits = { plan: ["free", "team", "enterprise"][i % 3], country: ["IN", "GB", "US", "FR"][i % 4], locale: ["en", "en", "hi", "fr"][i % 4], role: ["writer", "developer", "marketer"][i % 3], visits: 2 + i % 15, lifecycle: i < 10 ? "new" : "returning" };
    Object.entries(traits).forEach(([key, value]) => add("profile_traits", `${i}:${key}`, { profile_id: profile.id, key, value }));
    ["analytics", "personalization", "marketing"].forEach(purpose => add("consent_state", `${i}:${purpose}`, { profile_id: profile.id, purpose, status: i >= 36 ? "denied" : i >= 32 ? "pending" : purpose === "marketing" && i % 3 === 0 ? "denied" : "granted" }));
    ["Getting started", "Editorial operations", "Personalization"].forEach((topic, j) => add("topic_stages", `${i}:${j}`, { profile_id: profile.id, term_id: terms[topic].id, topic_label: topic, stage: ["unaware", "curious", "engaged", "advocate"][(i + j) % 4], score: [0.1, 0.35, 0.68, 0.92][(i + j) % 4] }));
    if (i < 8) add("profile_knowledge", i, { profile_id: profile.id, owner_id: ownerId, title: "Editorial learning goals", body: `I want to improve ${i % 2 ? "review workflows and reusable content modeling" : "consent-aware personalization and audience analytics"}. My next step is to complete the first-project guide and compare two published versions.`, topic_label: i % 2 ? "Editorial operations" : "Personalization", evidence: "Synthetic self-declared demo learning goal", kind: "self_declared", confidence: 0.9 });
  });
  const segmentRules = [
    ["Returning readers", { op: "and", conditions: [{ field: "trait.visits", op: "gte", value: 3 }] }],
    ["Team subscribers", { op: "and", conditions: [{ field: "trait.plan", op: "eq", value: "team" }] }],
    ["India audience", { op: "and", conditions: [{ field: "trait.country", op: "eq", value: "IN" }] }],
    ["Developer audience", { op: "and", conditions: [{ field: "trait.role", op: "eq", value: "developer" }] }],
    ["Engaged launch readers", { op: "and", conditions: [{ field: "events.page_view", op: "gte", value: 5 }, { field: "trait.lifecycle", op: "eq", value: "returning" }] }],
  ];
  segmentRules.forEach(([name, rule], i) => {
    rule.conditions = rule.conditions.map(({ op, ...condition }) => ({ ...condition, operator: op === "eq" ? "equals" : op }));
    add("segments", i, { name, rule });
  });

  const slots = [["homepage-hero", "Homepage hero", 16], ["onboarding-next", "Onboarding next step", 1], ["article-related", "Related article", 4], ["campaign-cta", "Launch call to action", 18]].map(([key, name, fallback], i) => add("slots", i, { key: `demo-${key}`, name, description: "Published defaults and targeted variants for the demonstration experience.", status: "Active", fallback_entry_id: entries[fallback].id }));
  const variants = [];
  slots.forEach((slot, i) => {
    variants.push(add("variants", `${i}:default`, { slot_id: slot.id, entry_id: slot.fallback_entry_id, rules: {}, priority: 0, weight: 1, status: "Active", metadata: { name: "Default experience" } }));
    variants.push(add("variants", `${i}:returning`, { slot_id: slot.id, entry_id: entries[[17, 7, 15, 19][i]].id, rules: { all: [{ field: "lifecycle", op: "equals", value: "returning" }] }, priority: 20, weight: 1, status: "Active", metadata: { name: "Returning-reader experience" } }));
    variants.push(add("variants", `${i}:locale`, { slot_id: slot.id, entry_id: entries[42].id, rules: { all: [{ field: "locale", op: "equals", value: "hi" }] }, priority: 30, weight: 1, status: "Active", metadata: { name: "Hindi welcome" } }));
    add("frequency_caps", i, { slot_id: slot.id, max_impressions: i === 3 ? 2 : 4, window_hours: 24, status: "Active" });
  });
  add("ranking_rules", "boost", { rule_type: "boost", entry_id: entries[12].id, weight: 1.35, reason: "Prioritize the current autumn journal", status: "Active" });
  add("ranking_rules", "pin", { rule_type: "boost", entry_id: entries[1].id, weight: 2, reason: "Keep the onboarding guide easy to find", status: "Active" });
  add("ranking_rules", "demote", { rule_type: "boost", entry_id: entries[23].id, weight: 0.6, reason: "Prefer practical guides over connector reference material", status: "Active" });

  // Metrics are derived from these exact synthetic events, never invented separately.
  const metrics = new Map();
  for (let day = -29; day <= 0; day++) {
    for (let entryIndex = 0; entryIndex < 24; entryIndex++) {
      if (stamp(day).slice(0, 10) < entries[entryIndex].published_at.slice(0, 10)) continue;
      const count = 3 + (entryIndex * 7 + day + 30) % 7 + Math.floor((day + 29) / 7);
      const key = `${day}:${entryIndex}`;
      metrics.set(key, { views: 0, conversions: 0 });
      for (let n = 0; n < count; n++) {
        const profileIndex = (entryIndex * 3 + n + day + 30) % 32;
        const at = stamp(day, 1 + n % 10);
        const payload = { entry_id: entries[entryIndex].id, anonymous_id: profiles[profileIndex].identifiers[0], type: "page_view", at, created_at: at, context: { locale: "en", device: n % 3 ? "desktop" : "mobile", campaign: "autumn-journal", synthetic: true } };
        add("events", `${key}:${n}:view`, payload); metrics.get(key).views++;
        if ((n + entryIndex + day + 30) % 7 === 0) { add("events", `${key}:${n}:conversion`, { ...payload, type: "conversion" }); metrics.get(key).conversions++; }
      }
    }
  }
  metrics.forEach((counts, key) => { const [day, entryIndex] = key.split(":").map(Number); add("metrics_daily", key, { date: stamp(day).slice(0, 10), entry_id: entries[entryIndex].id, ...counts }); });

  ["Launch headline", "Onboarding next step", "Locale welcome", "Sidebar call to action"].forEach((name, i) => {
    const experiment = add("experiments", i, { name, status: ["Running", "Completed", "Paused", "Draft"][i], traffic_split: { control: 50, challenger: 50 }, goal_metric: "conversion", holdout_pct: 5, starts_at: stamp(i === 3 ? 7 : -21), ends_at: stamp(i === 1 ? -2 : 14), metadata: { hypothesis: "A clearer next step improves reader conversion", synthetic: true } });
    const options = [0, 1].map(j => add("experiment_variants", `${i}:${j}`, { experiment_id: experiment.id, entry_id: entries[i === 0 ? 18 + j : i === 1 ? 1 + j * 6 : 16 + j].id, name: j ? "Challenger" : "Control", weight: 50 }));
    if (i < 3) for (let n = 0; n < 160; n++) add("experiment_exposures", `${i}:${n}`, { experiment_id: experiment.id, variant_id: options[n % 2].id, profile_id: profiles[n % 32].id, converted: n % (n % 2 ? 5 : 8) === 0, at: stamp(-20 + n % (i === 1 ? 18 : 20)), metadata: { synthetic: true } });
  });
  for (let i = 0; i < 64; i++) add("decision_traces", i, { slot_id: slots[i % 4].id, entry_id: variants[(i % 4) * 3 + i % 2].entry_id, variant_id: variants[(i % 4) * 3 + i % 2].id, reason: i % 2 ? "Synthetic demo: matched returning-reader rule with priority 20." : "Synthetic demo: selected the default published experience.", context: { locale: "en", device: i % 2 ? "mobile" : "desktop" }, created_at: stamp(-7 + i % 8) });

  ["Product journal", "Help center", "Staging preview"].forEach((name, i) => add("sites", i, { name, hostname: ["journal.example.test", "help.example.test", "preview.example.test"][i], brand_name: "Geiger Content Studio", environment_id: i === 2 ? staging.id : production.id, status: i === 2 ? "Draft" : "Active" }));
  ["API", "RSS", "CSV", "CMS"].forEach((type, i) => add("external_sources", i, { name: `Demo ${type} source`, type, url: `https://sources.example.test/${type.toLowerCase()}`, status: "Disconnected", metadata: { mapping: { title: "title", excerpt: "summary" }, description: "Seeded configuration; connect your own source for live synchronization" } }));
  ["webhook", "crm", "warehouse"].forEach((type, i) => add("data_connections", i, { name: ["Demo event collector", "Demo CRM traits", "Demo warehouse export"][i], type, status: "Paused", metadata: { endpoint: "https://integrations.example.test/ingest", lastSync: stamp(-3), rowsSynced: [220, 40, 720][i], synthetic: true } }));
  ["Editorial notifications", "Delivery cache refresh"].forEach((name, i) => {
    const hook = add("webhooks", i, { name, url: `https://hooks.example.test/${i ? "cache" : "editorial"}`, events: ["entry.published", "entry.updated"], status: "Paused" });
    for (let n = 0; n < 4; n++) add("webhook_deliveries", `${i}:${n}`, { webhook_id: hook.id, event: "entry.published", payload: { projectId: DEMO_PROJECT, entryId: entries[n].id, synthetic: true }, status: ["Delivered", "Delivered", "Failed", "Pending"][n], attempts: n === 2 ? 3 : 1, response_code: n === 2 ? 503 : n === 3 ? null : 200, response_body: n === 2 ? "Synthetic response: demo endpoint unavailable" : "Synthetic delivery example", created_at: stamp(-4 + n) });
  });
  for (let i = 0; i < 3; i++) add("api_tokens", i, { name: ["Demo delivery reader (revoked)", "Demo preview client (revoked)", "Demo analytics exporter (expired)"][i], token_hash: createHash("sha256").update(`unusable-demo:${DEMO_PROJECT}:${i}`).digest("hex"), scopes: [i === 2 ? "analytics:read" : "entries:read"], revoked_at: stamp(-2), expires_at: stamp(-1), last_used_at: stamp(-5), metadata: { usable: false, note: "Display-only credential record; create a new token to use the API" } });
  ["Delivery reader", "Analytics exporter"].forEach((name, i) => add("service_accounts", i, { name: `Demo ${name}`, role: "viewer", metadata: { description: "Seeded service-account configuration" } }));
  [
    ["Clear editorial introductions", { requiredFields: ["title", "excerpt", "author"], maxExcerptLength: 300 }, true],
    ["Descriptive cover text", { requireAltText: true, allowedTypes: ["image", "document"] }, true],
    ["Review before publishing", { reviewRequired: true, minimumReviewers: 1 }, true],
    ["Consent-aware journeys", { personalizationRequiresConsent: true, analyticsRequiresConsent: true }, true],
    ["Experimental title guidance", { maxTitleLength: 80 }, false],
  ].forEach(([name, rules, enforced], i) => add("policies", i, { name, rules, enforced }));
  [["entries", 730, "archive"], ["collections", 365, "archive"], ["assets", 365, "soft_delete"], ["audit_log", 730, "archive"]].forEach(([scope, days, action], i) => add("retention_policies", i, { scope, days, action }));
  [
    ["Suggest a clearer introduction for the first-project guide.", "Lead with the result: publish a useful page in fifteen minutes. Then explain the three steps: model your content, review the draft, and verify delivery."],
    ["Help plan a review for the launch page.", "Check the headline, the supporting example, the next action, and the related guides. Assign a reviewer and resolve open comments before approval."],
    ["Summarize the consent scenarios in this demonstration.", "The synthetic profiles cover granted, pending, and denied consent for analytics, personalization, and marketing. Use a published fallback when personalization is denied."],
  ].forEach(([prompt, response], i) => add("assistant_messages", i, { prompt, response, model: "seeded-demonstration", entry_id: entries[i].id, metadata: { note: "Illustrative assistant conversation; no AI request was made for this record" }, created_at: stamp(-2 + i) }));
  return { tables, entries, profiles, slots, ownerId };
}

export function renderSeed(tables) {
  const statements = [
    `-- Project-scoped demonstrator generated by scripts/seed-demonstrator.mjs.\n-- Synthetic records; existing records are preserved; safe to rerun.\n-- Target: ${DEMO_PROJECT}`,
    `select pg_advisory_xact_lock(hashtext('${DEMO_TAG}:${DEMO_PROJECT}'));`,
    `do $$ begin if not exists (select 1 from public.projects where id='${DEMO_PROJECT}' and deleted_at is null) then raise exception 'Demo target project is missing'; end if; end $$;`,
  ];
  for (const [table, rows] of tables) {
    // Group optional shapes so omitted database defaults keep their defaults.
    const groups = new Map();
    for (const row of rows) { const signature = Object.keys(row).sort().join(","); if (!groups.has(signature)) groups.set(signature, []); groups.get(signature).push(row); }
    for (const [signature, group] of groups) {
      const columns = signature.split(",").map(c => `"${c}"`).join(",");
      const json = JSON.stringify(group);
      const delimiter = `$seed_${createHash("sha256").update(json).digest("hex").slice(0, 12)}$`;
      statements.push(`-- ${table}: ${group.length} records\ninsert into content.${table} (${columns})\nselect ${columns} from jsonb_populate_recordset(null::content.${table}, ${delimiter}${json}${delimiter}::jsonb)\non conflict do nothing;`);
    }
  }
  // Correct the initial demonstration vocabulary while preserving valid edits.
  statements.push(`update content.ranking_rules set rule_type='boost' where project_id='${DEMO_PROJECT}' and metadata->>'demoSeed'='${DEMO_TAG}' and rule_type in ('pin','demote');`);
  statements.push(`update content.retention_policies set scope=case scope when 'events' then 'collections' when 'profiles' then 'assets' else scope end,action=case action when 'delete' then 'archive' when 'anonymize' then 'soft_delete' else action end where project_id='${DEMO_PROJECT}' and metadata->>'demoSeed'='${DEMO_TAG}' and (scope in ('events','profiles') or action in ('delete','anonymize'));`);
  return statements.join("\n\n") + "\n";
}
