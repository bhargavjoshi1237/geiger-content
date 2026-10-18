// Persona simulator for the feed engine: synthetic users with hidden tastes and knowledge
// scroll the feed; we measure whether it finds them, walks them deeper, and stays blended.
// With `signals` on, v2 readers also react, mark knew-this/learned, hide with reasons, click to explore and answer
// probes, learning through the Phase A stores (emotion, knowledge, drift, governor, stated) as live learning does.
import { DEFAULT_CONFIG, applyRoute, circlingIndex, composeFeed, createRng, createUserState, interest, markShown, profileSummary, recordEvent, skipEscalationFor, topicEntropy } from "./engine.mjs";
import { createTaste, mergeTasteConfig, nearestInMemory, normalize, recordTaste, similarCandidates, tasteQuery, tasteSearches } from "./taste.mjs";
import { routeEvent } from "./signals.mjs";
import { createEmotion, emotionProfile, inferItemEmotion, isNegativeArousal, itemEmotionMultiplier, recordEmotion } from "./emotion.mjs";
import { createKnowledge, itemKnowledgeMultiplier, knowledgeSummary, levelToB, thetaOf, thetaToFrontier, updateKnowledge, withDifficulty } from "./knowledge.mjs";
import { classifyAll, createDrift, explorationBoost, recordDrift } from "./drift.mjs";
import { cleanSettings, resolveSettings } from "./settings.mjs";
import { emotionNodeWeights } from "./bias.mjs";
import { blockedThemes, capFrontier, createGovernor, intensityWeight, levelsUsed, maxAllowedFrontier, rollSession } from "./governor.mjs";
import { funnelMetrics } from "./metrics.mjs";
import { calibration, createStated, nextProbe, recordAnswer, recordAsked } from "./stated.mjs";

// ------------------------------------------------------------------------------------------------
// Catalogs.

// Hash of a string to [0, 1); drives catalog labels without touching any rng stream.
function hash01(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

// Emotion mix of an unflavoured horizontal, and the sensitive theme an intense negative item may carry.
const EMOTION_MIX = [["neutral", 0.24], ["amused", 0.2], ["amazed", 0.15], ["curious", 0.15], ["moved", 0.08], ["sad", 0.06], ["angry", 0.08], ["disgusted", 0.04]];
const NEGATIVE_BUCKETS = new Set(["sad", "angry", "disgusted"]);
const THEMES = { angry: "violence", disgusted: "gore", sad: "tragedy" };

// Subjects/topics whose items lean to one emotion (entertainment and legacy edgy ids).
export const DEFAULT_MOODS = {
  "movies-tv/horror": "disgusted",
  "creators-culture/pop-culture": "angry",
  "sports/wrestling": "angry",
  "creators-culture/internet-humor": "amused",
  "dark-humor": "disgusted",
  "rage-bait": "angry",
  horror: "disgusted",
};

function pickMix(u) {
  let r = u;
  for (const [bucket, share] of EMOTION_MIX) { r -= share; if (r < 0) return bucket; }
  return "neutral";
}

// LLM-style labels by hash: each horizontal leans to one emotion, items mix around it; difficulty
// is uniform on entertainment-v2 (virtual depth via withDifficulty) and tracks the step on legacy trees.
export function labelSyntheticItem(item, { moods = DEFAULT_MOODS } = {}) {
  const sub = `${item.topicId}/${item.subtopicId}`;
  const u = (salt) => hash01(`${item.id}|${salt}`);
  const mood = moods[sub] ?? moods[item.topicId] ?? null;
  const lean = mood ?? pickMix(hash01(`${sub}/${item.stepId}/${item.horizontalId}|lean`));
  const bucket = u("emo") < (mood ? 0.65 : 0.55) ? lean : pickMix(u("mix"));
  const intensity = +(0.2 + 0.8 * (mood ? Math.sqrt(u("int")) : u("int"))).toFixed(2);
  const sensitive = NEGATIVE_BUCKETS.has(bucket) && intensity >= 0.6 && u("sens") < 0.6 ? [THEMES[bucket]] : null;
  const level = item.taxonomyVersion === "entertainment-v2" ? 1 + Math.floor(u("lvl") * 5) : Math.min(5, Math.max(1, (item.depth || 1) + (u("lvl") < 0.5 ? 0 : 1)));
  return withDifficulty({ ...item, emotion: { bucket, intensity }, difficulty: { level }, ...(sensitive ? { sensitive } : {}) });
}

// Deterministic stand-in catalog: `perHorizontal` items for every horizontal in the tree.
// `levels: true` adds hashed emotion, difficulty and sensitive labels (see labelSyntheticItem).
export function syntheticCatalog(topics, { perHorizontal = 12, seed = 7, now = Date.now(), from = Date.parse("2025-01-01"), levels = false, moods = DEFAULT_MOODS } = {}) {
  const rng = createRng(seed);
  const items = [];
  let n = 0;
  for (const topic of topics)
    for (const subtopic of topic.subtopics)
      for (const step of subtopic.steps)
        for (const horizontal of step.horizontals)
          for (let i = 0; i < perHorizontal; i += 1) {
            n += 1;
            const earliest = topic.version === "entertainment-v2" ? Math.max(from, Date.parse("2026-08-01")) : from;
            items.push({
              id: `syn-${n}`,
              title: `${horizontal.name} #${i + 1}`,
              topicId: topic.id,
              subtopicId: subtopic.id,
              subjectPath: topic.version === "entertainment-v2" ? subtopic.path : undefined,
              taxonomyVersion: topic.version,
              stepId: step.id,
              depth: step.depth,
              horizontalId: horizontal.id,
              createdAt: new Date(earliest + rng.next() ** 0.6 * (now - earliest)).toISOString(),
              score: Math.round(Math.exp(rng.next() * 7)),
            });
          }
  return levels ? items.map((item) => labelSyntheticItem(item, { moods })) : items;
}

// Stand-in image embeddings: unit vectors clustered by topic → subtopic → horizontal, plus noise,
// so nearest neighbours behave like a real visual model would on a labelled catalog.
export function syntheticEmbeddings(items, { dims = 32, seed = 9, noise = 0.35 } = {}) {
  const rng = createRng(seed);
  const centroids = new Map();
  const centroid = (key, scale) => {
    if (!centroids.has(key)) centroids.set(key, Array.from({ length: dims }, () => (rng.next() * 2 - 1) * scale));
    return centroids.get(key);
  };
  const out = new Map();
  for (const item of items) {
    const t = centroid(item.topicId, 1);
    const s = centroid(`${item.topicId}/${item.subtopicId}`, 0.6);
    const h = centroid(`${item.topicId}/${item.subtopicId}/${item.stepId}/${item.horizontalId}`, 0.35);
    out.set(item.id, normalize(t.map((x, i) => x + s[i] + h[i] + (rng.next() * 2 - 1) * noise)));
  }
  return out;
}

// Nearest neighbours of the reader's taste among unseen items, as composeFeed's `similar` option.
export function similarFromMemory(taste, embeddings, state, index, now) {
  const q = tasteQuery(taste, { now });
  if (!q.interests.length) return null;
  const exclude = new Set(state.seen);
  const lists = Object.fromEntries(Object.entries(tasteSearches(q)).map(([source, s]) => [source, nearestInMemory(s.vector, embeddings, { limit: s.limit, exclude })]));
  return { candidates: similarCandidates(lists, index.byId), readiness: q.readiness };
}

export function catalogFromManifest(records) {
  return records.map((r) => ({
    id: r.id,
    title: r.title,
    imageUrl: r.image?.url,
    subreddit: r.subreddit,
    topicId: r.topicId,
    subtopicId: r.subtopicId,
    subjectPath: r.subjectPath,
    contentTypes: r.contentTypes || [],
    taxonomyVersion: r.taxonomyVersion,
    datasetId: r.datasetId,
    stepId: r.stepId,
    depth: r.depth,
    horizontalId: r.horizontalId,
    createdAt: r.createdAt,
    score: r.score,
  }));
}

// ------------------------------------------------------------------------------------------------
// Personas. `interests` weight topics ("pc-building") and subtopics ("pc-building/cooling");
// `knowledge` is the deepest step (1-4) a persona already knows per subtopic; `curiosity` is
// how much they enjoy the step just past what they know; `shiftAt` swaps in `later` tastes.

export const LEGACY_PERSONAS = [
  {
    id: "aio-to-custom-loops",
    label: "Owns an AIO, has only heard of custom loops",
    interests: { "pc-building": 0.9, "pc-building/cooling": 1, "pc-building/cases-and-aesthetics": 0.6, gaming: 0.45, "desk-setups": 0.35 },
    knowledge: { "pc-building/cooling": 2 },
    curiosity: 0.8,
    focus: "pc-building/cooling",
  },
  {
    id: "casual-foodie",
    label: "Cooks at home, likes baking and coffee",
    interests: { "home-cooking": 0.75, baking: 0.6, coffee: 0.5, "world-cuisines": 0.4, travel: 0.25 },
    knowledge: {},
    curiosity: 0.45,
    focus: "baking/bread",
  },
  {
    id: "outdoor-dog-owner",
    label: "Hikes with their dog, some camping and photography",
    interests: { dogs: 0.8, hiking: 0.75, camping: 0.5, photography: 0.3, "dogs/dog-adventures": 1 },
    knowledge: { "hiking/day-hikes": 2 },
    curiosity: 0.6,
    focus: "dogs/dog-adventures",
  },
  {
    id: "wide-explorer",
    label: "No strong interests yet",
    interests: {},
    knowledge: {},
    curiosity: 0.3,
    baseline: 0.12,
    focus: null,
  },
  {
    id: "shifting-taste",
    label: "Gym regular who drifts into running",
    interests: { fitness: 0.9, "fitness/strength-sports": 1, "home-cooking": 0.3 },
    later: { running: 0.9, "running/trail-and-ultra": 1, fitness: 0.25, cycling: 0.4 },
    shiftAt: 30,
    knowledge: { "fitness/strength-sports": 2 },
    curiosity: 0.6,
    focus: "running/trail-and-ultra",
  },
  {
    id: "edgy-rabbit-hole",
    label: "Opens one cursed meme and keeps going deeper",
    interests: { "dark-humor": 0.9, "dark-humor/cursed-images": 1, "dark-humor/meme-spiral": 0.7, horror: 0.4, gaming: 0.25 },
    knowledge: {},
    curiosity: 0.95,
    focus: "dark-humor/cursed-images",
  },
  {
    id: "edgy-drift-out",
    label: "Hooked on rage bait, then tires of it and drifts into home improvement",
    interests: { "rage-bait": 0.9, "rage-bait/everyday-annoyances": 1, "dark-humor": 0.3 },
    later: { "home-improvement": 0.85, "home-improvement/renovations": 1, "interior-design": 0.45, "rage-bait": 0.05 },
    shiftAt: 30,
    knowledge: {},
    curiosity: 0.6,
    focus: "home-improvement/renovations",
  },
];

export const PERSONAS = [
  { id: "anime-fan", label: "Anime fan discovering related games", interests: { "anime-manga": 0.9, "anime-manga/classroom-of-the-elite": 1, gaming: 0.4 }, knowledge: {}, curiosity: 0.5, focus: "anime-manga/classroom-of-the-elite" },
  { id: "sports-and-music", label: "Cricket and music fan", interests: { sports: 0.85, "sports/cricket": 1, music: 0.8, "music/indian-music": 1 }, knowledge: {}, curiosity: 0.5, focus: "sports/cricket" },
  { id: "gamer", label: "Competitive gamer", interests: { gaming: 0.95, "gaming/counter-strike": 1, "gaming/valorant": 0.9, "creators-culture": 0.4 }, knowledge: {}, curiosity: 0.5, focus: "gaming/counter-strike" },
  { id: "movie-fan", label: "Film and television fan", interests: { "movies-tv": 0.95, "movies-tv/indian-cinema": 1, "movies-tv/marvel": 0.8, music: 0.3 }, knowledge: {}, curiosity: 0.5, focus: "movies-tv/indian-cinema" },
  { id: "entertainment-drift", label: "Gamer whose interest shifts to Formula 1", interests: { gaming: 0.95, sports: 0.1 }, later: { sports: 0.95, "sports/formula-1": 1, gaming: 0.1 }, shiftAt: 25, knowledge: {}, curiosity: 0.5, focus: "sports/formula-1" },
];

const DAY_MS = 24 * 3600000;

// v2 readers (entertainment tree, run on a `levels: true` catalog). Extra fields, all optional:
// `knowledgeLevel` true θ per subject (`defaultTheta` elsewhere), `deeper` enjoys items above their level, `growth` θ
// gained per stretching item, `emotion` reaction probability per bucket, `hooks` topic-free pull of an emotion (× intensity),
// `outrageShare` chance an angry reaction is shared, `knewThis`/`learned`/`exploreClick` per-item chances, `hideReasons`
// chance per context (upsetting, seen_it, this_topic, this_item), `sessionGapMs` time between sessions.
export const V2_PERSONAS = [
  {
    id: "outrage-prone",
    v2: true,
    label: "Football fan who can't look away from outrage",
    interests: { sports: 0.8, "sports/football": 1, "movies-tv": 0.5, "creators-culture": 0.3 },
    knowledge: {},
    curiosity: 0.5,
    emotion: { angry: 0.75, disgusted: 0.5, amused: 0.2 },
    reactUnengaged: 0.5,
    hooks: { angry: 0.5, disgusted: 0.2 },
    outrageShare: 0.3,
    hideReasons: { upsetting: 0.12, this_item: 0.02 },
    exploreClick: 0.03,
    focus: "sports/football",
  },
  {
    id: "expert-mixed",
    v2: true,
    label: "Counter-Strike veteran who is new to cricket",
    interests: { gaming: 0.9, "gaming/counter-strike": 1, "gaming/valorant": 0.6, sports: 0.7, "sports/cricket": 1 },
    knowledge: {},
    knowledgeLevel: { "gaming/counter-strike": 2, "gaming/valorant": 1.5, "sports/cricket": -1.5 },
    curiosity: 0.5,
    emotion: { amazed: 0.25, curious: 0.3 },
    knewThis: 0.6,
    learned: 0.45,
    hideReasons: { seen_it: 0.15 },
    exploreClick: 0.05,
    focus: "gaming/counter-strike",
  },
  {
    id: "rabbit-hole-descender",
    v2: true,
    label: "Horror fan who keeps going one level deeper",
    interests: { "movies-tv": 0.95, "movies-tv/horror": 1, gaming: 0.3 },
    knowledge: {},
    knowledgeLevel: { "movies-tv/horror": -0.5 },
    curiosity: 0.95,
    deeper: true,
    growth: 0.3,
    emotion: { disgusted: 0.3, amazed: 0.2 },
    hooks: { disgusted: 0.15 },
    hideReasons: { upsetting: 0.05 },
    focus: "movies-tv/horror",
  },
  {
    // The entertainment-drift reader on daily sessions, so drift labels have time-spaced sessions to read.
    ...PERSONAS.find((p) => p.id === "entertainment-drift"),
    id: "drift-gamer-to-f1",
    v2: true,
    label: "Gamer whose interest shifts to Formula 1 over a week",
    shiftAt: 30,
    sessionGapMs: DAY_MS,
    emotion: { amazed: 0.3, amused: 0.2 },
    hideReasons: { this_topic: 0.2 },
    exploreClick: 0.08,
  },
];

// Settings patches (schema v1) for v2 runs; each passes cleanSettings.
export const SETTINGS_VARIANTS = {
  default: {},
  noAnger: { emotionDials: { angry: -1 } },
  calmEmotions: { emotionDials: { angry: -1, disgusted: -1 } },
  rabbitHole: { rabbitHole: { enabled: true, maxLevelsPerSession: 1 } },
  deepRabbitHole: { rabbitHole: { enabled: true, maxLevelsPerSession: 3 } },
  calm: { intensityCap: "calm" },
  uncapped: { intensityCap: "any" },
  nonProfiled: { nonProfiled: true },
  driftBoost: { driftBoost: true },
  deepDepth: { depth: { target: "deep" } },
};

function personaTaste(persona, batch) {
  return persona.later && batch >= persona.shiftAt ? persona.later : persona.interests;
}

// How much a persona likes an item's topic/subject right now (0..1), before depth and emotion.
function tasteScore(taste, item) {
  const topicW = taste[item.topicId] ?? 0;
  const subW = taste[`${item.topicId}/${item.subtopicId}`] ?? (topicW ? 0.65 : 0);
  return topicW * Math.max(subW, 0.3);
}

// Labelled difficulty level (1-5) of an item, or null.
const labelLevel = (item) => (item?.difficulty?.source === "label" && Number.isFinite(item.difficulty.level) ? item.difficulty.level : null);
const emotionOf = (item) => (item?.emotion && typeof item.emotion === "object" && item.emotion.bucket !== "neutral" ? item.emotion.bucket ?? null : null);
const thetaFor = (persona, mind, sub) => mind.theta[sub] ?? persona.defaultTheta ?? 0;

// Engagement factor from the gap between item difficulty and the reader's true θ (b − θ).
function knowledgeFit(gap, persona) {
  if (gap < -2) return 0.2;
  if (gap < -0.75) return 0.55;
  if (gap <= 1) return 1;
  if (gap <= 2) return persona.deeper ? 0.95 : 0.45;
  return 0.15;
}

// v2 engagement: labelled items use the knowledge gap instead of step depth, and emotional hooks pull regardless of topic.
export function engagementProbabilityV2(persona, item, mind, batch = 0) {
  const sub = `${item.topicId}/${item.subtopicId}`;
  const level = labelLevel(item);
  let fit;
  if (level != null) fit = knowledgeFit(levelToB(level) - thetaFor(persona, mind, sub), persona);
  else {
    const known = mind.knowledge[sub] || 1;
    const depth = item.depth || 1;
    fit = depth <= known ? 0.8 : depth === known + 1 ? 0.6 + persona.curiosity * 0.5 : 0.2;
  }
  const bucket = emotionOf(item);
  const hook = (persona.hooks?.[bucket] ?? 0) * (Number(item.emotion?.intensity) || 0.5);
  return Math.min(0.95, (persona.baseline ?? 0.05) + tasteScore(personaTaste(persona, batch), item) * fit * 0.85 + hook);
}

// Probability a persona engages with an item, given what they currently know.
export function engagementProbability(persona, item, knowledge, batch = 0) {
  const taste = personaTaste(persona, batch);
  const sub = `${item.topicId}/${item.subtopicId}`;
  const topicW = taste[item.topicId] ?? 0;
  const subW = taste[sub] ?? (topicW ? 0.65 : 0);
  const known = knowledge[sub] || 1;
  const depth = item.depth || 1;
  const depthFactor = depth <= known ? 0.8 : depth === known + 1 ? 0.6 + persona.curiosity * 0.5 : 0.2;
  return Math.min(0.95, (persona.baseline ?? 0.05) + topicW * Math.max(subW, 0.3) * depthFactor * 0.85);
}

// ------------------------------------------------------------------------------------------------
// Simulation.

// One simulated reader as a generator. With `withTaste` it yields { need: "similar", taste, state, now }
// before each batch and { need: "embeddings", ids } after it, so the caller can answer from memory
// (runSimulation) or from pgvector (runSimulationAsync).
// Simulated time starts here; build synthetic catalogs with `now: SIMULATION_START` so item ages are meaningful.
export const SIMULATION_START = Date.parse("2026-09-01T08:00:00Z");

// Sessions of `sessionEvery` batches separated by this gap (v2 personas may space theirs further).
const SESSION_GAP_MS = 6 * 3600000;
// Event types the pre-signals engine understood; with `signals` off, v2 readers are reduced to these.
const LEGACY_TYPES = new Set(["like", "save", "share", "comment", "dwell", "skip", "hide"]);

const subOf = (item) => `${item.topicId}/${item.subtopicId}`;
const eventKey = (e) => (e.type === "hide" && e.reason ? `hide:${e.reason}` : e.type === "react" ? `react:${e.emotion}` : e.type === "probe_answer" ? `probe_answer:${e.probe}:${e.answer}` : e.type);

// True when a shifting persona used to like this topic and no longer does.
function wasDropped(persona, item, batch) {
  return Boolean(persona.later) && batch >= persona.shiftAt && (persona.interests[item.topicId] ?? 0) >= 0.5 && (persona.later[item.topicId] ?? 0) < 0.2;
}

// Hide reason for an unengaged item by context, drawn on the signal stream; null = no hide.
function hideReason(persona, item, { gap, bucket, batch, rng2 }) {
  const chances = persona.hideReasons;
  if (!chances) return null;
  let reason = "this_item";
  if (chances.upsetting && NEGATIVE_BUCKETS.has(bucket) && Number(item.emotion?.intensity) >= 0.6) reason = "upsetting";
  else if (chances.seen_it && gap != null && gap <= -1.5) reason = "seen_it";
  else if (chances.this_topic && wasDropped(persona, item, batch)) reason = "this_topic";
  const chance = chances[reason] ?? 0;
  return chance > 0 && rng2.next() < chance ? reason : null;
}

// A reader's events for one impression. Main-stream draws (engage, kind) match the legacy loop; extras use rng2.
function respond(persona, item, mind, batch, { rng, rng2 }) {
  const sub = subOf(item);
  const level = labelLevel(item);
  const p = persona.v2 ? engagementProbabilityV2(persona, item, mind, batch) : engagementProbability(persona, item, mind.knowledge, batch);
  const gap = level != null ? levelToB(level) - thetaFor(persona, mind, sub) : null;
  const bucket = emotionOf(item);
  const events = [];
  const r = rng.next();
  const engaged = r < p;
  // React first, so a negative reaction gates the engagement that follows (signals rule 1).
  const reactChance = (persona.emotion?.[bucket] ?? 0) * (engaged ? 1 : persona.reactUnengaged ?? 0.25);
  const reaction = reactChance > 0 && rng2.next() < reactChance ? bucket : null;
  if (reaction) events.push({ type: "react", emotion: reaction });
  if (engaged) {
    const kind = rng.next();
    let event = kind < 0.6 ? { type: "like" } : kind < 0.8 ? { type: "save" } : { type: "dwell", dwellMs: 6000 };
    if (reaction && isNegativeArousal(reaction) && persona.outrageShare && rng2.next() < persona.outrageShare) event = { type: "share", emotion: reaction };
    events.push(event);
    if (gap != null && gap >= 0.5 && persona.learned && rng2.next() < persona.learned) events.push({ type: "learned" });
    if (persona.exploreClick && rng2.next() < persona.exploreClick) events.push({ type: "explore_click", source: "similar" });
    // Getting hooked: enjoying the step past what you know teaches you it.
    if ((item.depth || 1) === (mind.knowledge[sub] || 1) + 1) mind.knowledge[sub] = item.depth;
    if (gap != null && gap > 0.25 && persona.growth) mind.theta[sub] = Math.min(3, thetaFor(persona, mind, sub) + persona.growth);
  } else {
    const hide = hideReason(persona, item, { gap, bucket, batch, rng2 });
    if (hide) events.push({ type: "hide", reason: hide });
    else {
      if (gap != null && gap <= -0.75 && persona.knewThis && rng2.next() < persona.knewThis) events.push({ type: "knew_this" });
      events.push(r < p + 0.15 ? { type: "dwell", dwellMs: 1500 } : { type: "skip" });
    }
  }
  return { events, engaged };
}

// The reader's answer to a stated-interest or knowledge probe, from their hidden taste and θ.
function probeAnswer(persona, probe, mind, batch) {
  if (probe.kind === "knowledge") {
    const theta = thetaFor(persona, mind, probe.sub);
    return theta >= 1.5 ? "know" : theta >= -0.5 ? "some" : "new";
  }
  const [topicId, subtopicId] = probe.sub.split("/");
  const score = tasteScore(personaTaste(persona, batch), { topicId, subtopicId });
  return score >= 0.6 ? "more" : score < 0.2 ? "less" : "same";
}

// Subjects the reader has evidence on, as nextProbe candidates.
function subjectRows(state, knowledge, now, config) {
  return Object.keys(state.nodes)
    .filter((k) => k.split("/").length === 2)
    .map((k) => {
      const it = interest(state, k, now, config);
      return { id: k, evidence: it.evidence, lift: it.mean / it.global, n: knowledge.subjects?.[k]?.n || 0 };
    });
}

// Composition bias from resolved settings and learned stores (mirrors live: emotion × knowledge × governor weights, emotion-composition topic/subject weights, mutes, boosts, depth cap).
function simBias(state, stores, resolved, now, index) {
  const blocked = blockedThemes(state.history, { intensityCap: resolved.intensityCap, minor: resolved.minor });
  const split = (set) => [[...set].filter((id) => !id.includes("/")), [...set].filter((id) => id.includes("/"))];
  const [muteTopics, muteSubs] = split(resolved.topics.mute);
  const [boostTopics, boostSubs] = split(resolved.topics.boost);
  return {
    excludeTopics: muteTopics,
    excludeSubs: muteSubs,
    boostTopics,
    boostSubs,
    ...(emotionNodeWeights(index, { emotion: stores.emotion, dials: resolved.emotionDials, now }) || {}),
    itemWeight: (item) =>
      itemEmotionMultiplier(item, stores.emotion, { dials: resolved.emotionDials, now }) *
      itemKnowledgeMultiplier(item, stores.knowledge, { target: resolved.depth.target, basicsSuppression: resolved.depth.basicsSuppression, now }) *
      intensityWeight(item, { blocked, intensityCap: resolved.intensityCap }),
    maxDepthFor: (sub) => maxAllowedFrontier(stores.governor, sub, { maxLevels: resolved.rabbitHole.maxLevels, minor: resolved.minor }),
  };
}

// `signals` turns on the v2 event vocabulary and learning stores; `settings` (a schema v1 patch) is resolved into the
// config each batch. Both default off, and every signal draw uses its own rng stream, so legacy runs are unchanged.
function* simulation({ persona, index, batches = 60, seed = 42, start = SIMULATION_START, config = {}, withTaste = false, signals = false, settings = null, sessionEvery = 10, sessionGapMs = persona.sessionGapMs ?? SESSION_GAP_MS }) {
  const patch = settings == null ? null : cleanSettings(settings);
  const useSettings = signals || patch !== null;
  const track = signals || Boolean(persona.v2);
  const baseCfg = { ...DEFAULT_CONFIG, ...config };
  let cfg = baseCfg;
  let resolved = null;
  let tasteCfg = mergeTasteConfig(null);
  const rng = createRng(seed);
  const rng2 = createRng(seed + 1);
  const state = createUserState();
  const taste = createTaste();
  const stores = { emotion: createEmotion(), knowledge: createKnowledge(), drift: createDrift(), governor: createGovernor(), stated: createStated(), reactions: new Map() };
  const mind = { knowledge: { ...persona.knowledge }, theta: { ...persona.knowledgeLevel } };
  const counters = { events: {}, gated: 0, escalated: 0, probesAsked: 0 };
  const sessions = [];
  const driftTimeline = [];
  let sessionFrontier = {};
  const timeline = [];
  let now = start;
  let engaged = 0;
  let shown = 0;
  let vectors = null;
  const probes = { shown: 0, accepted: 0 };
  const similar = { shown: 0, accepted: 0 };

  // Learns one event: the legacy recordEvent path with signals off, else route → engine, taste, emotion, knowledge, drift, governor.
  const learn = (event, item) => {
    if (track) counters.events[eventKey(event)] = (counters.events[eventKey(event)] || 0) + 1;
    const sub = subOf(item);
    const topicId = item.subjectPath || item.topicId;
    if (!signals) {
      if (track && event.type === "skip" && skipEscalationFor(state, item, { config: cfg }).escalate) counters.escalated += 1;
      recordEvent(state, item, event, { now, config: cfg });
      if (vectors) recordTaste(taste, vectors.get(item.id), event, { topicId, now, config: tasteCfg });
      return;
    }
    // Excluded topics are logged but never learned.
    if (resolved.topics.exclude.has(item.topicId) || resolved.topics.exclude.has(sub)) return;
    const reaction = stores.reactions.get(item.id) ?? null;
    const escalateSkip = event.type === "skip" && skipEscalationFor(state, item, { config: cfg }).escalate;
    if (escalateSkip) counters.escalated += 1;
    const it = interest(state, sub, now, cfg);
    const route = routeEvent(event, { item, config: cfg, itemEmotion: inferItemEmotion(item), negativeReaction: reaction && isNegativeArousal(reaction) ? reaction : false, subLiked: it.mean / it.global >= cfg.interestLift, escalateSkip, reaction });
    if (route.flags.gated) counters.gated += 1;
    applyRoute(state, item, route, { now, config: cfg });
    if (vectors) recordTaste(taste, vectors.get(item.id), event, { topicId, now, config: tasteCfg, liking: route.liking });
    if (route.emotion) recordEmotion(stores.emotion, route.emotion.bucket, { kind: route.emotion.kind, amount: route.emotion.amount, now });
    if (route.knowledge) {
      const k = route.knowledge;
      updateKnowledge(stores.knowledge, k.sub, { outcome: k.outcome, strength: k.strength, itemB: Number.isFinite(item.difficulty?.b) ? item.difficulty.b : 0, floor: Boolean(k.floor), now });
      // θ seeds the frontier upward only, and only where depth is the virtual (labelled) one.
      if (item.taxonomyVersion === "entertainment-v2" && labelLevel(item) != null) {
        const seeded = thetaToFrontier(thetaOf(stores.knowledge, k.sub, now));
        if (seeded > (state.frontier[k.sub] || 1)) state.frontier[k.sub] = seeded;
      }
    }
    if (route.interest) {
      recordDrift(stores.drift, item.topicId, route.interest, { now });
      recordDrift(stores.drift, sub, route.interest, { now });
    }
    if (event.type === "react") stores.reactions.set(item.id, event.emotion);
    capFrontier(stores.governor, state.frontier, { maxLevels: resolved.rabbitHole.maxLevels, minor: resolved.minor });
  };

  for (let b = 0; b < batches; b += 1) {
    // Sessions of `sessionEvery` batches separated by `sessionGapMs`.
    if (b && b % sessionEvery === 0) now += sessionGapMs;
    if (track && b % sessionEvery === 0) sessionFrontier = { ...state.frontier };
    if (signals) {
      explorationBoost(stores.drift, { shown: state.shown, driftBoostEnabled: Boolean(patch?.driftBoost) });
      rollSession(stores.governor, { now, frontier: state.frontier });
    }
    if (useSettings) {
      resolved = resolveSettings(patch || {}, { drift: stores.drift, shown: state.shown });
      cfg = { ...baseCfg, ...resolved.config };
      tasteCfg = mergeTasteConfig(resolved.tasteConfig);
    }
    const nonProfiled = Boolean(resolved?.nonProfiled);
    const similarAnswer = withTaste ? yield { need: "similar", taste, state, now } : null;
    const batch = composeFeed(state, index, { now, rng, config: cfg, similar: nonProfiled ? null : similarAnswer, bias: signals ? simBias(state, stores, resolved, now, index) : null });
    vectors = withTaste ? yield { need: "embeddings", ids: batch.map((e) => e.item.id) } : null;
    markShown(state, batch, { now, config: cfg });
    let batchEngaged = 0;
    const extra = track ? { subs: [], emotions: [], levels: [], gaps: [], sensitive: [], intense: [] } : null;
    for (const entry of batch) {
      now += 6000;
      shown += 1;
      const { item } = entry;
      if (extra) {
        const level = labelLevel(item);
        extra.subs.push(subOf(item));
        extra.emotions.push(emotionOf(item));
        extra.levels.push(level);
        extra.gaps.push(level != null ? +(levelToB(level) - thetaFor(persona, mind, subOf(item))).toFixed(2) : null);
        extra.sensitive.push(Array.isArray(item.sensitive) && item.sensitive.length > 0);
        extra.intense.push(NEGATIVE_BUCKETS.has(emotionOf(item)) && Number(item.emotion?.intensity) >= 0.75);
      }
      const res = respond(persona, item, mind, b, { rng, rng2 });
      if (res.engaged) {
        engaged += 1;
        batchEngaged += 1;
      }
      if (entry.slot === "probe") {
        probes.shown += 1;
        if (res.engaged) probes.accepted += 1;
      }
      if (entry.slot === "similar") {
        similar.shown += 1;
        if (res.engaged) similar.accepted += 1;
      }
      // Non-profiled readers are never learned from.
      if (nonProfiled) continue;
      for (const event of res.events) {
        if (signals) learn(event, item);
        else if (LEGACY_TYPES.has(event.type)) learn(event.type === "hide" || event.type === "share" ? { type: event.type } : event, item);
      }
    }
    // Stated-interest and knowledge probes, answered from the reader's hidden taste and θ.
    if (signals && !nonProfiled) {
      const probe = nextProbe(stores.stated, { subjects: subjectRows(state, stores.knowledge, now, cfg), shown: state.shown, now });
      if (probe) {
        counters.probesAsked += 1;
        recordAsked(stores.stated, probe, { now, shown: state.shown });
        const answer = probeAnswer(persona, probe, mind, b);
        const it = interest(state, probe.sub, now, cfg);
        recordAnswer(stores.stated, { sub: probe.sub, probe: probe.kind, answer, lift: it.mean / it.global, now });
        const last = state.history.findLast((h) => h.sub === probe.sub);
        const rep = last && index.byId.get(last.id);
        if (rep) learn({ type: "probe_answer", probe: probe.kind, answer, sub: probe.sub, postId: rep.id }, rep);
      }
    }
    timeline.push({
      batch: b,
      topics: batch.map((e) => e.item.topicId),
      slots: batch.map((e) => e.slot),
      depths: batch.map((e) => e.item.depth || 1),
      ages: batch.map((e) => Math.max(0, (now - Date.parse(e.item.createdAt || now)) / 86400000)),
      engaged: batchEngaged,
      focusDepth: persona.focus ? state.frontier[persona.focus] || 1 : null,
      ...(extra || {}),
    });
    // Session end: per-subject descent against the session's starting frontier, and the drift labels so far.
    if (track && (b % sessionEvery === sessionEvery - 1 || b === batches - 1)) {
      const descent = {};
      for (const [sub, d] of Object.entries(state.frontier)) if (d > (sessionFrontier[sub] || 1)) descent[sub] = d - (sessionFrontier[sub] || 1);
      sessions.push({ session: sessions.length, lastBatch: b, descent, maxDescent: Math.max(0, ...Object.values(descent)) });
      if (signals) driftTimeline.push({ session: driftTimeline.length, labels: Object.fromEntries(classifyAll(stores.drift, { history: state.history, now }).map((r) => [r.id, r.label])) });
    }
  }
  const v2 = track ? { signals, stores, counters, sessions, driftTimeline, resolved, mind } : undefined;
  return { persona, state, taste, timeline, ...(track ? { stores } : {}), metrics: measure(persona, state, timeline, { engaged, shown, probes, similar, index, now, config: cfg, v2 }) };
}

// `embeddings` (Map id → unit vector) turns on the taste vectors and the similar slot.
export function runSimulation({ embeddings = null, ...options }) {
  const run = simulation({ ...options, withTaste: Boolean(embeddings) });
  let step = run.next();
  while (!step.done)
    step = run.next(step.value.need === "similar" ? similarFromMemory(step.value.taste, embeddings, step.value.state, options.index, step.value.now) : embeddings);
  return step.value;
}

// Same reader, answered by async callbacks: similarFor({ taste, state, now }) and embeddingsFor(ids) → Map.
export async function runSimulationAsync({ similarFor, embeddingsFor, ...options }) {
  const run = simulation({ ...options, withTaste: true });
  let step = run.next();
  while (!step.done) step = run.next(step.value.need === "similar" ? await similarFor(step.value) : await embeddingsFor(step.value.ids));
  return step.value;
}

// Spacing violations, blend, interest capture, and how fast the focus subtopic deepened.
// `v2` (set by v2/signal runs) adds metrics.v2.
export function measure(persona, state, timeline, { engaged, shown, probes, similar = { shown: 0, accepted: 0 }, index, now, config, v2 = null }) {
  const flat = timeline.flatMap((t) => t.topics);
  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < flat.length; i += 1) {
    run = flat[i] === flat[i - 1] ? run + 1 : 1;
    maxRun = Math.max(maxRun, run);
  }
  let sameHorizontalBackToBack = 0;
  for (let i = 1; i < state.history.length; i += 1) if (state.history[i].horizontal === state.history[i - 1].horizontal) sameHorizontalBackToBack += 1;
  let crowdedWindows = 0;
  for (let i = 0; i + config.window <= flat.length; i += 1) {
    const counts = {};
    for (const t of flat.slice(i, i + config.window)) counts[t] = (counts[t] || 0) + 1;
    if (Math.max(...Object.values(counts)) > config.maxTopicPerWindow) crowdedWindows += 1;
  }
  const liked = Object.keys(personaTaste(persona, timeline.length)).filter((k) => !k.includes("/"));
  const share = (rows) => {
    const topics = rows.flatMap((t) => t.topics);
    return topics.length ? topics.filter((t) => liked.includes(t)).length / topics.length : 0;
  };
  const tenth = Math.max(1, Math.floor(timeline.length / 10));
  const engagementRate = (rows) => rows.reduce((a, t) => a + t.engaged, 0) / Math.max(1, rows.reduce((a, t) => a + t.topics.length, 0));
  const reachedDepth = (d) => { const hit = timeline.find((t) => (t.focusDepth || 0) >= d); return hit ? hit.batch : null; };
  const ages = timeline.flatMap((t) => t.ages || []).sort((a, b) => a - b);
  return {
    impressions: shown,
    engagementRate: +(engaged / Math.max(1, shown)).toFixed(3),
    engagementEarly: +engagementRate(timeline.slice(0, tenth * 2)).toFixed(3),
    engagementLate: +engagementRate(timeline.slice(-tenth * 2)).toFixed(3),
    interestShareEarly: +share(timeline.slice(0, tenth * 2)).toFixed(3),
    interestShareLate: +share(timeline.slice(-tenth * 2)).toFixed(3),
    circlingIndex: +circlingIndex(state.history, 50).toFixed(3),
    entropyBits: +topicEntropy(state.history, 50).toFixed(2),
    distinctTopicsPerBatch: +(timeline.reduce((a, t) => a + new Set(t.topics).size, 0) / timeline.length).toFixed(2),
    maxSameTopicRun: maxRun,
    medianAgeDays: ages.length ? +ages[Math.floor(ages.length / 2)].toFixed(1) : null,
    shareLastWeek: ages.length ? +(ages.filter((a) => a <= 7).length / ages.length).toFixed(3) : 0,
    sameHorizontalBackToBack,
    crowdedWindows,
    probes,
    similar,
    focusDepthReached: persona.focus ? (state.frontier[persona.focus] || 1) : null,
    batchesToDepth: persona.focus ? { 2: reachedDepth(2), 3: reachedDepth(3), 4: reachedDepth(4) } : null,
    profile: profileSummary(state, index, { now, config }),
    ...(v2 ? { v2: v2Metrics(persona, state, timeline, { now, config, ...v2 }) } : {}),
  };
}

const round3 = (x) => +x.toFixed(3);
// Share of a timeline field's values matching `pred` across rows (nulls count unless `skipNull`).
function fieldShare(rows, key, pred, { skipNull = false } = {}) {
  const values = rows.flatMap((t) => t[key] || []).filter((v) => !skipNull || v != null);
  return values.length ? round3(values.filter(pred).length / values.length) : 0;
}

// Emotion mix, anger, knowledge fit, per-session descent, drift labels, funnel and governor health for a v2 run.
function v2Metrics(persona, state, timeline, { now, config, signals, stores, counters, sessions, driftTimeline, resolved, mind }) {
  const tenth = Math.max(1, Math.floor(timeline.length / 10));
  const parts = { all: timeline, early: timeline.slice(0, tenth * 2), late: timeline.slice(-tenth * 2) };
  const byPart = (key, pred, opts) => Object.fromEntries(Object.entries(parts).map(([k, rows]) => [k, fieldShare(rows, key, pred, opts)]));
  const mix = {};
  const emotions = timeline.flatMap((t) => t.emotions || []);
  for (const e of emotions) mix[e ?? "none"] = (mix[e ?? "none"] || 0) + 1;
  // Basics: impressions ≥ 1.75 levels below the reader's true θ in subjects they start as experts in (≥ 1.5).
  const expertSubs = new Set(Object.entries(persona.knowledgeLevel || {}).filter(([, th]) => th >= 1.5).map(([id]) => id));
  const basics = (rows) => {
    const gaps = rows.flatMap((t) => (t.subs || []).map((s, i) => (expertSubs.has(s) ? t.gaps[i] : null))).filter((g) => g != null);
    return { share: gaps.length ? round3(gaps.filter((g) => g <= -1.75).length / gaps.length) : null, n: gaps.length };
  };
  const half = Math.floor(timeline.length / 2);
  const cap = { intensityCap: resolved?.intensityCap ?? "moderate", minor: Boolean(resolved?.minor) };
  return {
    signals,
    emotionMix: Object.fromEntries(Object.entries(mix).map(([k, n]) => [k, round3(n / Math.max(1, emotions.length))])),
    angryShare: byPart("emotions", (e) => e === "angry"),
    negativeShare: byPart("emotions", (e) => NEGATIVE_BUCKETS.has(e)),
    sensitiveShare: byPart("sensitive", Boolean),
    intenseShare: byPart("intense", Boolean),
    knowledge: {
      // Labelled impressions whose difficulty sits in the reader's comfort band (−0.75 ≤ b − θ ≤ 1).
      hitRate: byPart("gaps", (g) => g >= -0.75 && g <= 1, { skipNull: true }),
      basics: { early: basics(timeline.slice(0, half)), late: basics(timeline.slice(half)) },
      subjects: knowledgeSummary(stores.knowledge, { now }).map((s) => ({ ...s, trueTheta: +thetaFor(persona, mind, s.id).toFixed(2) })),
    },
    depth: {
      sessions: sessions.map((s) => ({ session: s.session, descent: s.descent })),
      maxSessionDescent: Math.max(0, ...sessions.map((s) => s.maxDescent)),
      maxLevels: resolved?.rabbitHole?.maxLevels ?? null,
    },
    drift: { labels: classifyAll(stores.drift, { history: state.history, now }), timeline: driftTimeline },
    funnel: funnelMetrics({ history: state.history, state, now, config, governor: stores.governor }),
    governor: { levelsUsed: levelsUsed(stores.governor, state.frontier), blockedThemes: [...blockedThemes(state.history, cap).themes], ...cap },
    stated: { ...calibration(stores.stated), asked: counters.probesAsked },
    events: counters.events,
    gated: counters.gated,
    skipEscalations: counters.escalated,
    emotion: emotionProfile(stores.emotion, now).filter((r) => r.evidence > 0),
  };
}

// The same run over several seeds (persona metrics are bimodal by seed, so compare aggregates).
export function runAcrossSeeds(options, seeds = [1, 2, 3, 4, 5, 6]) {
  return seeds.map((seed) => runSimulation({ ...options, seed }));
}
