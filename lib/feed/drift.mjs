// Interest drift: a fast and a slow Beta rate per topic/subject node plus per-session tallies, labelled emerging / spike / fading / rested / steady. Pure; no I/O.

const DAY = 24 * 3600000;

export const DRIFT_CONFIG = {
  fastHalfLifeMs: DAY,
  slowHalfLifeMs: 14 * DAY,
  prior: { a: 1, b: 3 },
  sessionGapMs: 30 * 60000,
  maxSessions: 8,
  emergeRatio: 1.3,
  emergeSessions: 3,
  spikeRatio: 1.8,
  fadeRatio: 0.7,
  fadeSessions: 3,
  minEvidence: { emerge: 4, fade: 5, spike: 3 },
  // Rested (satiation) needs heavy recent exposure: a third of the 30-impression window for an area, so a fading area still shown at its normal share reads as fading.
  restedExposure: 10,
  shiftDivergence: 0.45,
  boostShown: 20,
  // Subject overrides: subjects get a few events per session, so the last two judged sessions both rising marks emergence (any 2 of 4 floods on noise); there are many, so three impressions are already heavy.
  subject: { emergeSessions: 2, emergeWindow: 2, restedExposure: 3 },
};

// Sessions considered by the emerging/fading window.
const WINDOW = 4;
const EXPOSURE_WINDOW = 30;

const conf = (config) => (config === DRIFT_CONFIG ? config : { ...DRIFT_CONFIG, ...config, minEvidence: { ...DRIFT_CONFIG.minEvidence, ...config?.minEvidence }, subject: { ...DRIFT_CONFIG.subject, ...config?.subject } });
// Config for one node: subject keys ("area/subject") apply the subject overrides.
const scoped = (c, key) => (String(key).includes("/") && c.subject ? { ...c, ...c.subject, minEvidence: { ...c.minEvidence, ...c.subject.minEvidence } } : c);
const round = (x, dp = 4) => +x.toFixed(dp);
const priorMean = ({ prior }) => prior.a / (prior.a + prior.b);
const priorStrength = ({ prior }) => prior.a + prior.b;

export function createDrift() {
  return { nodes: {}, shifted: false, boostUntilShown: 0 };
}

const newNode = () => ({ fast: null, slow: null, sessions: [], cur: null, expo: 0 });

// Beta counts { s, f, at } decayed by age only.
function decayed(counts, now, halfLifeMs) {
  if (!counts) return { s: 0, f: 0, at: now };
  const k = Math.pow(0.5, Math.max(0, now - counts.at) / halfLifeMs);
  return { s: counts.s * k, f: counts.f * k, at: now };
}

const slowRate = (slow, config) => (slow.s + config.prior.a) / (slow.s + slow.f + config.prior.a + config.prior.b);

// Rate shrunk toward a baseline, so a session or window with little evidence reads as "no change".
const shrunkRate = (s, f, base, config) => (s + priorStrength(config) * base) / (s + f + priorStrength(config));

// The current global session (shared by every node) is the most recently active `cur`.
function latestSession(drift) {
  let best = null;
  for (const node of Object.values(drift?.nodes || {})) if (node?.cur && (!best || node.cur.at > best.at)) best = node.cur;
  return best;
}

// Folds one interest signal into a node, rolling its session when the reader's session changed.
export function recordDrift(drift, key, { success = 0, weight = 0 } = {}, { now = Date.now(), config = DRIFT_CONFIG } = {}) {
  if (!drift || !key || !(weight > 0)) return drift;
  const c = conf(config);
  drift.nodes ||= {};
  const latest = latestSession(drift);
  const sessionId = latest && now - latest.at <= c.sessionGapMs ? latest.id : now;
  const node = drift.nodes[key] || (drift.nodes[key] = newNode());
  const slow = decayed(node.slow, now, c.slowHalfLifeMs);
  if (node.cur && node.cur.id !== sessionId) {
    node.sessions.push({ id: node.cur.id, s: node.cur.s, f: node.cur.f, b: node.cur.b });
    if (node.sessions.length > c.maxSessions) node.sessions.splice(0, node.sessions.length - c.maxSessions);
    node.cur = null;
  }
  // b is the slow rate going into the session, the baseline the session is judged against.
  node.cur ||= { id: sessionId, s: 0, f: 0, at: now, b: round(slowRate(slow, c)) };
  const ds = success * weight;
  const df = (1 - success) * weight;
  node.cur = { ...node.cur, s: round(node.cur.s + ds), f: round(node.cur.f + df), at: now };
  const fast = decayed(node.fast, now, c.fastHalfLifeMs);
  node.fast = { s: round(fast.s + ds), f: round(fast.f + df), at: now };
  node.slow = { s: round(slow.s + ds), f: round(slow.f + df), at: now };
  return drift;
}

// Stores recent impressions of a node (used by classifyDrift when no exposure is passed).
export function noteExposure(drift, key, count) {
  const node = drift?.nodes?.[key];
  if (node) node.expo = Math.max(0, Number(count) || 0);
  return drift;
}

const evidenceOf = (r) => r.s + r.f;
const hasEarlierSession = (drift, id) => Object.values(drift.nodes).some((n) => n?.sessions?.some((r) => r.id < id) || n?.cur?.id < id);
const relOf = (r, config) => {
  const base = r.b ?? priorMean(config);
  return base > 0 ? shrunkRate(r.s, r.f, base, config) / base : 1;
};

export function classifyDrift(drift, key, { now = Date.now(), exposure, config = DRIFT_CONFIG } = {}) {
  const c = scoped(conf(config), key);
  const node = drift?.nodes?.[key];
  const steady = (extra = {}) => ({ label: "steady", ratio: 1, fast: round(priorMean(c), 3), slow: round(priorMean(c), 3), sessions: 0, ...extra });
  if (!node?.slow) return steady();
  const slow = decayed(node.slow, now, c.slowHalfLifeMs);
  const fast = decayed(node.fast, now, c.fastHalfLifeMs);
  const slowR = slowRate(slow, c);
  const fastR = shrunkRate(fast.s, fast.f, slowR, c);
  const all = [...node.sessions, ...(node.cur ? [node.cur] : [])];
  const base = { ratio: round(fastR / slowR, 3), fast: round(fastR, 3), slow: round(slowR, 3), sessions: all.length };
  // Sessions too thin to judge are left out, so a boundary's first event doesn't shift the window.
  const window = all.filter((r) => evidenceOf(r) >= c.minEvidence.spike).slice(-WINDOW).map((r) => ({ ...r, rel: relOf(r, c) }));
  const last = window[window.length - 1];
  const above = window.slice(-(c.emergeWindow ?? WINDOW)).filter((r) => r.rel >= c.emergeRatio);
  if (last && last.rel > 1 && above.length >= c.emergeSessions && fast.s + fast.f >= c.minEvidence.emerge) return { label: "emerging", ...base };
  const cur = node.cur;
  // A spike needs a reader with earlier sessions; on a brand-new profile every topic would read as one.
  if (cur && evidenceOf(cur) >= c.minEvidence.spike && relOf(cur, c) >= c.spikeRatio && hasEarlierSession(drift, cur.id)) {
    const earlier = all.slice(0, -1).filter((r) => evidenceOf(r) >= c.minEvidence.spike).slice(-(WINDOW - 1)).map((r) => relOf(r, c));
    if (!earlier.some((rel) => rel >= c.spikeRatio) && earlier.filter((rel) => rel >= c.emergeRatio).length < 2) return { label: "spike", ...base };
  }
  // Fading needs an interest that was there: only sessions entered with a better-than-prior baseline count.
  const below = window.filter((r) => r.rel <= c.fadeRatio && (r.b ?? 0) > priorMean(c));
  const fadeEvidence = below.reduce((sum, r) => sum + evidenceOf(r), 0);
  if (last && last.rel < 1 && below.length >= c.fadeSessions && fadeEvidence >= c.minEvidence.fade) {
    const seen = exposure ?? node.expo ?? 0;
    return { label: seen >= c.restedExposure ? "rested" : "fading", ...base };
  }
  return steady(base);
}

// Non-steady labels for every node, strongest change first; exposure counts the node in the last 30 impressions.
export function classifyAll(drift, { history = [], now = Date.now(), config = DRIFT_CONFIG, includeSteady = false, limit = 8 } = {}) {
  const recent = (history || []).slice(-EXPOSURE_WINDOW);
  const out = [];
  for (const id of Object.keys(drift?.nodes || {})) {
    const scope = id.includes("/") ? "subject" : "topic";
    const exposure = recent.filter((h) => (scope === "topic" ? h.topic === id : h.sub === id)).length;
    const { label, ratio, fast, slow } = classifyDrift(drift, id, { now, exposure, config });
    if (includeSteady || label !== "steady") out.push({ id, scope, label, ratio, fast, slow });
  }
  out.sort((a, b) => Math.abs(Math.log(b.ratio || 1)) - Math.abs(Math.log(a.ratio || 1)) || a.id.localeCompare(b.id));
  return limit == null ? out : out.slice(0, limit);
}

// Jensen-Shannon divergence (log2, 0..1) of two mass maps.
export function jsDivergence(p, q) {
  const keys = new Set([...Object.keys(p), ...Object.keys(q)]);
  const tp = Object.values(p).reduce((a, b) => a + b, 0);
  const tq = Object.values(q).reduce((a, b) => a + b, 0);
  if (!(tp > 0) || !(tq > 0)) return 0;
  let sum = 0;
  for (const k of keys) {
    const a = (p[k] || 0) / tp;
    const b = (q[k] || 0) / tq;
    const m = (a + b) / 2;
    if (a > 0) sum += 0.5 * a * Math.log2(a / m);
    if (b > 0) sum += 0.5 * b * Math.log2(b / m);
  }
  return Math.max(0, Math.min(1, sum));
}

// True when the engaged-topic mix of the last two sessions diverges past shiftDivergence.
export function regimeShift(drift, { config = DRIFT_CONFIG } = {}) {
  const c = conf(config);
  const topics = Object.entries(drift?.nodes || {}).filter(([id]) => !id.includes("/"));
  const ids = new Set();
  for (const [, node] of topics) for (const r of [...(node.sessions || []), ...(node.cur ? [node.cur] : [])]) ids.add(r.id);
  const mass = (sid) => {
    const out = {};
    for (const [id, node] of topics) {
      const r = node.cur?.id === sid ? node.cur : (node.sessions || []).find((x) => x.id === sid);
      if (r?.s > 0) out[id] = r.s;
    }
    return out;
  };
  const total = (m) => Object.values(m).reduce((a, b) => a + b, 0);
  // Thin sessions (e.g. one just opened) are skipped so the flag holds across a boundary.
  const [q, p] = [...ids].sort((a, b) => b - a).map(mass).filter((m) => total(m) >= c.minEvidence.spike).slice(0, 2);
  return Boolean(p && q) && jsDivergence(p, q) > c.shiftDivergence;
}

// Updates drift.shifted; on a rising edge stamps boostUntilShown, and returns the boost while it lasts and is enabled.
export function explorationBoost(drift, { shown = 0, driftBoostEnabled = false, config = DRIFT_CONFIG, exploreBoost = 0.6 } = {}) {
  if (!drift) return null;
  const c = conf(config);
  const shifted = regimeShift(drift, { config: c });
  if (shifted && !drift.shifted) drift.boostUntilShown = shown + c.boostShown;
  drift.shifted = shifted;
  return driftBoostEnabled && shifted && shown < (drift.boostUntilShown || 0) ? { exploreBoost } : null;
}
