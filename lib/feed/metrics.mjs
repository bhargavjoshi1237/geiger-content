// Funnel health metrics for the summary and simulator: circling, entropy, runs, churn, exploration yield,
// per-subject depth and sensitive/intense exposure. Pure, no I/O.

import * as engine from "./engine.mjs";

const WINDOW = 50;
const CHURN_WINDOW = 25;
// Negative-valence buckets and the intense threshold (mirrors governor.mjs; kept local to avoid a cross-module import).
const NEGATIVE = new Set(["sad", "angry", "disgusted"]);
const INTENSE_INTENSITY = 0.75;

const round = (x, dp = 3) => +Number(x).toFixed(dp);
const slotKeyOf = (slot) => (typeof engine.slotKey === "function" ? engine.slotKey(slot) : `__slot__:${slot}`);

// Node counts decayed by age and event distance, mirroring engine.mjs `decayed`.
function decayedCounts(node, now, config, events) {
  if (!node) return { s: 0, f: 0 };
  const k = Math.pow(0.5, Math.max(0, now - (node.at ?? now)) / config.halfLifeMs) * Math.pow(config.eventDecay, Math.max(0, events - (node.ev ?? events)));
  return { s: (Number(node.s) || 0) * k, f: (Number(node.f) || 0) * k };
}

// Longest consecutive same-topic run.
function longestRun(recent) {
  let best = 0;
  let run = 0;
  let prev;
  for (const h of recent) {
    run = h.topic === prev ? run + 1 : 1;
    prev = h.topic;
    if (run > best) best = run;
  }
  return best;
}

// Jaccard distance between the topic sets of the two most recent windows (0 until both are full).
function churn(history) {
  if (history.length < CHURN_WINDOW * 2) return 0;
  const recent = history.slice(-CHURN_WINDOW * 2);
  const a = new Set(recent.slice(0, CHURN_WINDOW).map((h) => h.topic));
  const b = new Set(recent.slice(CHURN_WINDOW).map((h) => h.topic));
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let both = 0;
  for (const t of a) if (b.has(t)) both += 1;
  return 1 - both / union.size;
}

// Decayed success rate of the explore and adjacent slots combined, or null without evidence.
function explorationYield(state, now, config) {
  const nodes = state?.nodes || {};
  const events = state?.events ?? 0;
  let s = 0;
  let f = 0;
  for (const slot of ["explore", "adjacent"]) {
    const n = decayedCounts(nodes[slotKeyOf(slot)], now, config, events);
    s += n.s;
    f += n.f;
  }
  return s + f > 0 ? s / (s + f) : null;
}

export function funnelMetrics({ history = [], state = null, now = Date.now(), config = {}, governor = null, frontier = null } = {}) {
  const cfg = { ...engine.DEFAULT_CONFIG, ...config };
  const hist = Array.isArray(history) ? history.filter(Boolean) : [];
  const recent = hist.slice(-WINDOW);
  const front = frontier || state?.frontier || {};
  const start = governor?.startFrontier;
  const intenseAt = Number(cfg.intenseIntensity) || INTENSE_INTENSITY;
  const share = (pred) => (recent.length ? round(recent.filter(pred).length / recent.length) : 0);
  const yieldRate = explorationYield(state, now, cfg);
  const depthPerSubject = Object.entries(front)
    .map(([id, d]) => ({ id, depth: Number(d) || 1 }))
    .filter((s) => s.depth > 1)
    .map((s) => ({ ...s, sessionDescent: start ? Math.max(0, s.depth - (Number(start[s.id]) || 1)) : 0 }))
    .sort((x, y) => y.depth - x.depth || x.id.localeCompare(y.id));
  return {
    circlingIndex: round(engine.circlingIndex(hist, WINDOW)),
    entropy: recent.length ? round(engine.topicEntropy(hist, WINDOW)) : 0,
    maxRun: longestRun(recent),
    topicChurn: round(churn(hist)),
    explorationYield: yieldRate === null ? null : round(yieldRate),
    depthPerSubject,
    sensitiveShare: share((h) => Array.isArray(h.sens) && h.sens.length > 0),
    intenseShare: share((h) => NEGATIVE.has(h.emo) && Number(h.int) >= intenseAt),
  };
}
