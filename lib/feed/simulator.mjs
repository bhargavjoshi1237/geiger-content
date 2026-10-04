// Persona simulator for the feed engine: synthetic users with hidden tastes and knowledge
// scroll the feed; we measure whether it finds them, walks them deeper, and stays blended.
import { DEFAULT_CONFIG, circlingIndex, composeFeed, createRng, createUserState, indexCatalog, markShown, profileSummary, recordEvent, topicEntropy } from "./engine.mjs";
import { createTaste, nearestInMemory, normalize, recordTaste, similarCandidates, tasteQuery, tasteSearches } from "./taste.mjs";

// ------------------------------------------------------------------------------------------------
// Catalogs.

// Deterministic stand-in catalog: `perHorizontal` items for every horizontal in the tree.
export function syntheticCatalog(topics, { perHorizontal = 12, seed = 7, now = Date.now(), from = Date.parse("2025-01-01") } = {}) {
  const rng = createRng(seed);
  const items = [];
  let n = 0;
  for (const topic of topics)
    for (const subtopic of topic.subtopics)
      for (const step of subtopic.steps)
        for (const horizontal of step.horizontals)
          for (let i = 0; i < perHorizontal; i += 1) {
            n += 1;
            items.push({
              id: `syn-${n}`,
              title: `${horizontal.name} #${i + 1}`,
              topicId: topic.id,
              subtopicId: subtopic.id,
              stepId: step.id,
              depth: step.depth,
              horizontalId: horizontal.id,
              createdAt: new Date(from + rng.next() ** 0.6 * (now - from)).toISOString(),
              score: Math.round(Math.exp(rng.next() * 7)),
            });
          }
  return items;
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

export const PERSONAS = [
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

function personaTaste(persona, batch) {
  return persona.later && batch >= persona.shiftAt ? persona.later : persona.interests;
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
function* simulation({ persona, index, batches = 60, seed = 42, start = Date.parse("2026-09-01T08:00:00Z"), config = {}, withTaste = false }) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rng = createRng(seed);
  const state = createUserState();
  const taste = createTaste();
  const knowledge = { ...persona.knowledge };
  const timeline = [];
  let now = start;
  let engaged = 0;
  let shown = 0;
  const probes = { shown: 0, accepted: 0 };
  const similar = { shown: 0, accepted: 0 };
  for (let b = 0; b < batches; b += 1) {
    // Sessions of 10 batches separated by a 6-hour gap.
    if (b && b % 10 === 0) now += 6 * 3600000;
    const similarOption = withTaste ? yield { need: "similar", taste, state, now } : null;
    const batch = composeFeed(state, index, { now, rng, config: cfg, similar: similarOption });
    const vectors = withTaste ? yield { need: "embeddings", ids: batch.map((e) => e.item.id) } : null;
    markShown(state, batch, { now, config: cfg });
    let batchEngaged = 0;
    for (const entry of batch) {
      now += 6000;
      shown += 1;
      const p = engagementProbability(persona, entry.item, knowledge, b);
      const r = rng.next();
      let event;
      if (r < p) {
        const kind = rng.next();
        event = kind < 0.6 ? { type: "like" } : kind < 0.8 ? { type: "save" } : { type: "dwell", dwellMs: 6000 };
        engaged += 1;
        batchEngaged += 1;
        const sub = `${entry.item.topicId}/${entry.item.subtopicId}`;
        // Getting hooked: enjoying the step past what you know teaches you it.
        if ((entry.item.depth || 1) === (knowledge[sub] || 1) + 1) knowledge[sub] = entry.item.depth;
      } else event = r < p + 0.15 ? { type: "dwell", dwellMs: 1500 } : { type: "skip" };
      if (entry.slot === "probe") {
        probes.shown += 1;
        if (r < p) probes.accepted += 1;
      }
      if (entry.slot === "similar") {
        similar.shown += 1;
        if (r < p) similar.accepted += 1;
      }
      recordEvent(state, entry.item, event, { now, config: cfg });
      if (vectors) recordTaste(taste, vectors.get(entry.item.id), event, { topicId: entry.item.topicId, now });
    }
    timeline.push({
      batch: b,
      topics: batch.map((e) => e.item.topicId),
      slots: batch.map((e) => e.slot),
      depths: batch.map((e) => e.item.depth || 1),
      engaged: batchEngaged,
      focusDepth: persona.focus ? state.frontier[persona.focus] || 1 : null,
    });
  }
  return { persona, state, taste, timeline, metrics: measure(persona, state, timeline, { engaged, shown, probes, similar, index, now, config: cfg }) };
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
export function measure(persona, state, timeline, { engaged, shown, probes, similar = { shown: 0, accepted: 0 }, index, now, config }) {
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
    sameHorizontalBackToBack,
    crowdedWindows,
    probes,
    similar,
    focusDepthReached: persona.focus ? (state.frontier[persona.focus] || 1) : null,
    batchesToDepth: persona.focus ? { 2: reachedDepth(2), 3: reachedDepth(3), 4: reachedDepth(4) } : null,
    profile: profileSummary(state, index, { now, config }),
  };
}
