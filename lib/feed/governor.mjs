// Session governor: caps rabbit-hole descent per session and throttles sensitive or intense content.
// Pure, no I/O. Mutators change the passed object in place and return it (engine.mjs idiom).

export const GOVERNOR_CONFIG = {
  sessionGapMs: 30 * 60 * 1000,
  defaultMaxLevels: 1,
  window: 30,
  caps: {
    any: { themes: Infinity, intense: Infinity },
    // Per 30-impression window. Readers naturally see ~1-2 of each per window, so 4/8 never bit; moderate now allows one item per theme and two intense negatives.
    moderate: { themes: 1, intense: 2 },
    calm: { themes: 1, intense: 1 },
  },
  minorFactor: 0.5,
  intenseIntensity: 0.75,
  // Item weight of an intense negative while its cap is reached (soft: it only loses ties inside a horizontal).
  intenseThrottle: 0.2,
  calmArousalCeiling: 0.7,
};

// Negative-valence buckets (mirrors EMOTIONS in emotion.mjs; kept local to avoid a cross-module import).
const NEGATIVE = new Set(["sad", "angry", "disgusted"]);
const CALM_BLOCKED = new Set(["angry", "disgusted"]);

const cfg = (config) => (config && config !== GOVERNOR_CONFIG ? { ...GOVERNOR_CONFIG, ...config } : GOVERNOR_CONFIG);
const depthOf = (frontier, sub) => Number(frontier?.[sub]) || 1;

export function createGovernor() {
  return { sessionId: 0, sessionStart: 0, lastAt: 0, startFrontier: {}, sensitiveSeen: {} };
}

// Starts a new session on first use or after an idle gap, snapshotting the frontier as the descent base.
export function rollSession(gov, { now = Date.now(), frontier = {}, config } = {}) {
  const c = cfg(config);
  if (!gov.startFrontier) gov.startFrontier = {};
  if (!gov.sensitiveSeen) gov.sensitiveSeen = {};
  if (!gov.sessionStart || now - (gov.lastAt || 0) > c.sessionGapMs) {
    gov.sessionId = (Number(gov.sessionId) || 0) + 1;
    gov.sessionStart = now;
    gov.startFrontier = { ...frontier };
    gov.sensitiveSeen = {};
  }
  gov.lastAt = Math.max(gov.lastAt || 0, now);
  return gov;
}

// Levels a reader may descend per session; minors are always held to one.
function levelsFor({ maxLevels, minor, config }) {
  if (minor) return 1;
  const n = Math.floor(Number(maxLevels ?? cfg(config).defaultMaxLevels));
  return Number.isFinite(n) ? Math.max(0, n) : cfg(config).defaultMaxLevels;
}

export function maxAllowedFrontier(gov, sub, { maxLevels, minor = false, config } = {}) {
  return depthOf(gov?.startFrontier, sub) + levelsFor({ maxLevels, minor, config });
}

// Clamps frontier entries that ran past this session's allowance; returns the changed keys.
export function capFrontier(gov, frontier, { maxLevels, minor = false, config } = {}) {
  // No session snapshot yet means no safe base, so leave the frontier untouched.
  if (!gov?.sessionStart || !frontier) return [];
  const changed = [];
  for (const sub of Object.keys(frontier)) {
    const max = maxAllowedFrontier(gov, sub, { maxLevels, minor, config });
    if (frontier[sub] > max) { frontier[sub] = max; changed.push(sub); }
  }
  return changed;
}

// Levels descended this session per subject (positive only).
export function levelsUsed(gov, frontier = {}) {
  const used = {};
  for (const sub of Object.keys(frontier || {})) {
    const n = depthOf(frontier, sub) - depthOf(gov?.startFrontier, sub);
    if (n > 0) used[sub] = n;
  }
  return used;
}

const isIntenseNegative = (bucket, intensity, c) => NEGATIVE.has(bucket) && Number(intensity) >= c.intenseIntensity;

// Sensitive-theme and intense-negative counts over the last `window` impressions.
export function sensitiveCounts(history = [], { config } = {}) {
  const c = cfg(config);
  const themes = {};
  let intense = 0;
  for (const h of (history || []).slice(-c.window)) {
    if (!h) continue;
    for (const t of new Set(Array.isArray(h.sens) ? h.sens : [])) themes[t] = (themes[t] || 0) + 1;
    if (isIntenseNegative(h.emo, h.int, c)) intense += 1;
  }
  return { themes, intense };
}

// Caps for an intensity setting; minors halve them (min 1) and never get the uncapped tier.
function capsFor(intensityCap, minor, c) {
  const key = c.caps[intensityCap] ? intensityCap : "moderate";
  const base = minor && key === "any" ? c.caps.moderate : c.caps[key];
  if (!minor) return base;
  const scale = (n) => Math.max(1, Math.floor(n * c.minorFactor));
  return { themes: scale(base.themes), intense: scale(base.intense) };
}

// Themes at or over their cap in the recent window, and whether intense negatives are throttled.
export function blockedThemes(history = [], { intensityCap = "moderate", minor = false, config } = {}) {
  const c = cfg(config);
  const caps = capsFor(intensityCap, minor, c);
  const counts = sensitiveCounts(history, { config: c });
  const themes = new Set(Object.keys(counts.themes).filter((t) => counts.themes[t] >= caps.themes));
  return { themes, blockIntense: counts.intense >= caps.intense };
}

// Item weight multiplier: 0 for a blocked theme, intenseThrottle for a throttled intense negative, else 1.
export function intensityWeight(item, { blocked = null, intensityCap = "moderate", config } = {}) {
  const c = cfg(config);
  const themes = blocked?.themes;
  if (themes?.size && Array.isArray(item?.sensitive) && item.sensitive.some((t) => themes.has(t))) return 0;
  const bucket = item?.emotion?.bucket;
  const intensity = Number(item?.emotion?.intensity);
  if (!bucket || !Number.isFinite(intensity)) return 1;
  if (intensityCap === "calm" && CALM_BLOCKED.has(bucket) && intensity >= c.calmArousalCeiling) return 0;
  if (blocked?.blockIntense && isIntenseNegative(bucket, intensity, c)) return c.intenseThrottle;
  return 1;
}
