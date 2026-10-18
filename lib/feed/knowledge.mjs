// Per-(reader, subject) knowledge ability θ on an Elo/IRT scale, per-item difficulty b, and the
// Goldilocks weighting that keeps items near σ(θ−b) ≈ 0.70–0.85 while suppressing basics for experts. Pure; no I/O.

const DAY_MS = 24 * 3600000;
const ENTERTAINMENT_V2 = "entertainment-v2";

export const KNOWLEDGE_CONFIG = {
  theta0: 0,
  thetaMin: -3,
  thetaMax: 3,
  kBase: 0.8,
  nHalf: 4,
  // "Knew this" = the reader would succeed with ≥ band.pHigh, so θ ≥ b + logit(.85) ≈ 1.7 (.2 left experts near average, so basics suppression never fired).
  knewFloorMargin: 1.7,
  forgetHalfLifeMs: 90 * DAY_MS,
  band: { pLow: 0.7, pHigh: 0.85 },
  levelScale: 1,
  minEvidence: 2,
  basics: { minTheta: 1.5, minN: 3, gap: 2, penalty: 0.15 },
  targetShift: { gentle: -0.5, balanced: 0, deep: 0.7 },
  outsideSigma: 1,
  minWeight: 0.25,
  labels: { proficient: 0.75, mastered: 1.75 },
};

// Content-type base levels and tag nudges for the heuristic difficulty.
const TYPE_LEVELS = { meme: 1, highlight: 1.5, art: 2, announcement: 2, collection: 2, general: 2, discussion: 3, analysis: 4 };
const HARD_TAGS = new Set(["diagram", "technical", "explained", "tutorial", "breakdown", "stats", "theory"]);
const LIGHT_TAGS = new Set(["meme", "funny", "reaction"]);

// Partial overrides merge over the defaults, one level deep for the nested groups.
const conf = (config) => {
  if (!config || config === KNOWLEDGE_CONFIG) return KNOWLEDGE_CONFIG;
  const out = { ...KNOWLEDGE_CONFIG, ...config };
  for (const key of ["band", "basics", "targetShift", "labels"]) out[key] = { ...KNOWLEDGE_CONFIG[key], ...config[key] };
  return out;
};

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const finite = (x) => typeof x === "number" && Number.isFinite(x);
const round = (x, dp) => Math.round(x * 10 ** dp) / 10 ** dp;
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const logit = (p) => Math.log(p / (1 - p));

export const levelToB = (level, config = KNOWLEDGE_CONFIG) => (level - 3) * conf(config).levelScale;

export const thetaToLevel = (theta, config = KNOWLEDGE_CONFIG) => clamp(theta / conf(config).levelScale + 3, 1, 5);

export const predictedSuccess = (theta, b) => sigmoid(theta - b);

// Level 1-5 → engine depth 1-3.
const levelToDepth = (level) => {
  const r = Math.round(level);
  return r <= 2 ? 1 : r <= 4 ? 2 : 3;
};

const subKey = (item) => item.subjectPath || (item.topicId && item.subtopicId ? `${item.topicId}/${item.subtopicId}` : null);

function heuristicLevel(item) {
  const types = (item.contentTypes || []).filter((t) => t in TYPE_LEVELS);
  let level = types.length ? Math.max(...types.map((t) => TYPE_LEVELS[t])) : TYPE_LEVELS.general;
  const tags = new Set([...(item.tags || []), ...(item.contentTypes || [])].map((t) => String(t).toLowerCase()));
  if ([...tags].some((t) => HARD_TAGS.has(t))) level += 1;
  if ([...tags].some((t) => LIGHT_TAGS.has(t))) level -= 0.5;
  return clamp(level, 1, 5);
}

// Item difficulty from an LLM label (number or {level}) when present, otherwise from content type and tags.
export function estimateDifficulty(item = {}, { config = KNOWLEDGE_CONFIG } = {}) {
  const d = item.difficulty;
  const labelled = finite(d) ? d : d && typeof d === "object" && finite(d.level) ? d.level : null;
  if (labelled != null) {
    const level = clamp(labelled, 1, 5);
    const source = d?.source === "heuristic" ? "heuristic" : "label";
    return { level, b: levelToB(level, config), source };
  }
  const level = heuristicLevel(item);
  return { level, b: levelToB(level, config), source: "heuristic" };
}

// Attaches difficulty; labelled entertainment-v2 items also get a virtual depth (heuristics never change depth).
export function withDifficulty(item, { virtualDepth = true, config = KNOWLEDGE_CONFIG } = {}) {
  const difficulty = estimateDifficulty(item, { config });
  const out = { ...item, difficulty };
  if (difficulty.source === "label" && item.taxonomyVersion === ENTERTAINMENT_V2 && virtualDepth) {
    out.depth = levelToDepth(difficulty.level);
    out.stepId = `level-${out.depth}`;
  }
  return out;
}

export function createKnowledge() {
  return { subjects: {} };
}

// θ with forgetting toward theta0 since the last update.
export function thetaOf(knowledge, sub, now = Date.now(), config = KNOWLEDGE_CONFIG) {
  const c = conf(config);
  const rec = knowledge?.subjects?.[sub];
  if (!rec || !finite(rec.theta)) return c.theta0;
  const age = Math.max(0, now - (rec.at || now));
  return c.theta0 + (rec.theta - c.theta0) * 0.5 ** (age / c.forgetHalfLifeMs);
}

// One Elo step on a pseudo-outcome; `floor` (knew this) keeps θ at least just above b. Mutates; returns the actual change.
export function updateKnowledge(knowledge, sub, { outcome, strength = 1, itemB, floor = false, now = Date.now(), config = KNOWLEDGE_CONFIG } = {}) {
  const c = conf(config);
  knowledge.subjects ||= {};
  const rec = knowledge.subjects[sub];
  const nBefore = rec?.n || 0;
  const before = thetaOf(knowledge, sub, now, c);
  if (!sub || !finite(outcome) || !finite(itemB) || !finite(strength)) return { delta: 0, nBefore, theta: before };
  const p = sigmoid(before - itemB);
  const k = (strength * c.kBase) / Math.sqrt(1 + nBefore / c.nHalf);
  let theta = before + k * (clamp(outcome, 0, 1) - p);
  if (floor) theta = Math.max(theta, itemB + c.knewFloorMargin);
  theta = clamp(theta, c.thetaMin, c.thetaMax);
  knowledge.subjects[sub] = { theta, n: nBefore + 1, at: now };
  return { delta: theta - before, nBefore, theta };
}

// Undo a journalled update: subtract its delta and drop one unit of evidence (the record goes at n 0).
export function revertKnowledge(knowledge, sub, { delta = 0, config = KNOWLEDGE_CONFIG } = {}) {
  const c = conf(config);
  const rec = knowledge?.subjects?.[sub];
  if (!rec) return knowledge;
  const n = (rec.n || 0) - 1;
  if (n <= 0) delete knowledge.subjects[sub];
  else knowledge.subjects[sub] = { ...rec, theta: clamp(rec.theta - (finite(delta) ? delta : 0), c.thetaMin, c.thetaMax), n };
  return knowledge;
}

// Khan-style revisable label; null until the subject has minEvidence.
export function knowledgeLabel(theta, n, config = KNOWLEDGE_CONFIG) {
  const c = conf(config);
  if (!(n >= c.minEvidence)) return null;
  if (theta >= c.labels.mastered) return "Mastered";
  if (theta >= c.labels.proficient) return "Proficient";
  return "Familiar";
}

// Target band of b for a reader at θ, shifted by the depth target.
function bandB(theta, target, c) {
  const shift = c.targetShift[target] ?? 0;
  return { lo: theta + shift - logit(c.band.pHigh), hi: theta + shift - logit(c.band.pLow) };
}

// Soft weight: 1 inside the Goldilocks band, Gaussian falloff outside (floored), times the basics penalty for experts.
export function itemKnowledgeMultiplier(item, knowledge, { target = "balanced", basicsSuppression = true, now = Date.now(), config = KNOWLEDGE_CONFIG } = {}) {
  const c = conf(config);
  const sub = item && subKey(item);
  const rec = sub && knowledge?.subjects?.[sub];
  if (!rec || !(rec.n >= c.minEvidence) || item.difficulty == null) return 1;
  const d = estimateDifficulty(item, { config: c });
  const b = finite(item.difficulty?.b) ? item.difficulty.b : d.b;
  const theta = thetaOf(knowledge, sub, now, c);
  const { lo, hi } = bandB(theta, target, c);
  const dist = b < lo ? lo - b : b > hi ? b - hi : 0;
  let m = dist === 0 ? 1 : Math.max(c.minWeight, Math.exp(-((dist / c.outsideSigma) ** 2)));
  if (basicsSuppression && theta >= c.basics.minTheta && rec.n >= c.basics.minN && b <= theta - c.basics.gap) m *= c.basics.penalty;
  return finite(m) ? m : 1;
}

// Engine frontier (1-3) implied by θ: the depth of the hardest comfortable (in-band) item.
export function thetaToFrontier(theta, config = KNOWLEDGE_CONFIG) {
  const c = conf(config);
  if (!finite(theta)) return 1;
  return levelToDepth(thetaToLevel(bandB(theta, "balanced", c).hi, c));
}

// Top subjects by evidence for the insights panel; band is in level units (1-5).
export function knowledgeSummary(knowledge, { now = Date.now(), config = KNOWLEDGE_CONFIG, top = 8, target = "balanced" } = {}) {
  const c = conf(config);
  return Object.entries(knowledge?.subjects || {})
    .filter(([, rec]) => rec && finite(rec.theta))
    .sort((a, b) => (b[1].n || 0) - (a[1].n || 0) || a[0].localeCompare(b[0]))
    .slice(0, top)
    .map(([id, rec]) => {
      const theta = thetaOf(knowledge, id, now, c);
      const band = bandB(theta, target, c);
      return {
        id,
        theta: round(theta, 2),
        level: round(thetaToLevel(theta, c), 1),
        label: knowledgeLabel(theta, rec.n || 0, c),
        n: rec.n || 0,
        band: { lo: round(thetaToLevel(band.lo, c), 1), hi: round(thetaToLevel(band.hi, c), 1) },
      };
    });
}
