// Emotion buckets: learned reader affinity, item emotion inference and the ranking multiplier. Pure; no I/O.

// Valence (-1..1) and arousal (0..1) per bucket.
export const EMOTIONS = {
  amused: { valence: 0.8, arousal: 0.5 },
  amazed: { valence: 0.9, arousal: 0.8 },
  moved: { valence: 0.6, arousal: 0.5 },
  curious: { valence: 0.4, arousal: 0.4 },
  sad: { valence: -0.6, arousal: 0.3 },
  angry: { valence: -0.8, arousal: 0.9 },
  disgusted: { valence: -0.7, arousal: 0.7 },
};

export const EMOTION_IDS = Object.keys(EMOTIONS);

export const EMOTION_CONFIG = {
  halfLifeMs: 14 * 24 * 3600000,
  priorStrength: 2,
  rejectionWeight: 1.5,
  dialStrength: 0.7,
  rankStrength: 0.5,
  minMult: 0.35,
  maxMult: 2.2,
  engageScale: 0.25,
  // Upper bound on learned affinity, so outrage engagement never boosts anger.
  affinityCap: { angry: 0, disgusted: 0, sad: 0.2 },
};

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const resolve = (config) => (config && config !== EMOTION_CONFIG ? { ...EMOTION_CONFIG, ...config } : EMOTION_CONFIG);
const finiteNow = (now) => (Number.isFinite(now) ? now : Date.now());

export function isNegativeArousal(bucket) {
  const e = EMOTIONS[bucket];
  return Boolean(e && e.valence < 0 && e.arousal >= 0.6);
}

export function createEmotion() {
  return { b: {}, n: 0 };
}

// Counts { rx, rej } decayed to `now` by the half-life (read-only).
function decayedCounts(entry, now, config) {
  if (!entry) return { rx: 0, rej: 0 };
  const k = Math.pow(0.5, Math.max(0, now - (entry.at ?? now)) / config.halfLifeMs);
  return { rx: (entry.rx || 0) * k, rej: (entry.rej || 0) * k };
}

// Folds one react/reject/engage into a bucket; a negative amount subtracts (undo). Mutates and returns `emotion`.
export function recordEmotion(emotion, bucket, { kind, amount = 1, now = Date.now(), config = EMOTION_CONFIG } = {}) {
  if (!emotion || !EMOTIONS[bucket] || !Number.isFinite(amount) || amount === 0) return emotion;
  const cfg = resolve(config);
  const t = finiteNow(now);
  emotion.b ||= {};
  const { rx, rej } = decayedCounts(emotion.b[bucket], t, cfg);
  const next = { rx, rej, at: t };
  if (kind === "react") next.rx = rx + amount;
  else if (kind === "reject") next.rej = rej + amount;
  else if (kind === "engage") next.rx = rx + amount * cfg.engageScale;
  else return emotion;
  next.rx = +Math.max(0, next.rx).toFixed(6);
  next.rej = +Math.max(0, next.rej).toFixed(6);
  emotion.b[bucket] = next;
  emotion.n = Math.max(0, (emotion.n || 0) + Math.sign(amount));
  return emotion;
}

// Learned preference for a bucket in [-1, 1], shrunk toward 0 by a prior and capped per bucket.
export function emotionAffinity(emotion, bucket, now = Date.now(), config = EMOTION_CONFIG) {
  if (!EMOTIONS[bucket]) return 0;
  const cfg = resolve(config);
  const { rx, rej } = decayedCounts(emotion?.b?.[bucket], finiteNow(now), cfg);
  const raw = (rx - cfg.rejectionWeight * rej) / (rx + rej + cfg.priorStrength);
  const cap = cfg.affinityCap?.[bucket] ?? 1;
  return clamp(Math.min(raw, cap), -1, 1);
}

// One row per bucket (stable order) for the summary and the UI.
export function emotionProfile(emotion, now = Date.now(), config = EMOTION_CONFIG) {
  const cfg = resolve(config);
  const t = finiteNow(now);
  return EMOTION_IDS.map((bucket) => {
    const { rx, rej } = decayedCounts(emotion?.b?.[bucket], t, cfg);
    return {
      bucket,
      valence: EMOTIONS[bucket].valence,
      arousal: EMOTIONS[bucket].arousal,
      affinity: +emotionAffinity(emotion, bucket, t, cfg).toFixed(3),
      evidence: +(rx + rej).toFixed(2),
    };
  });
}

// Whole-word keyword patterns (optional plural "s"), checked over tags and description.
const KEYWORDS = {
  amused: ["funny", "meme", "joke", "lol", "lmao", "hilarious", "humor", "humour", "comedy", "parody"],
  amazed: ["stunning", "epic", "breathtaking", "incredible", "amazing", "awesome", "mind-blowing", "spectacular", "majestic"],
  moved: ["wholesome", "heartwarming", "tribute", "touching", "kindness", "grateful", "reunion"],
  curious: ["mystery", "weird", "explained", "diagram", "explainer", "til", "fact", "unusual", "how it works"],
  sad: ["sad", "tragic", "tragedy", "rip", "grief", "mourning", "heartbreaking"],
  angry: ["outrage", "outrageous", "scandal", "controversy", "controversial", "furious", "infuriating", "rage"],
  disgusted: ["gross", "gore", "cursed", "rotten", "disgusting", "nasty", "vile"],
};
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const KEYWORD_RE = Object.fromEntries(
  Object.entries(KEYWORDS).map(([bucket, words]) => [bucket, new RegExp(`(?<![a-z0-9])(?:${words.map(escape).join("|")})s?(?![a-z0-9])`, "g")]),
);

// Content type fallback: bucket and confidence.
const TYPE_EMOTION = {
  meme: { bucket: "amused", confidence: 0.4 },
  highlight: { bucket: "amazed", confidence: 0.4 },
  art: { bucket: "amazed", confidence: 0.3 },
  analysis: { bucket: "curious", confidence: 0.3 },
  discussion: { bucket: "curious", confidence: 0.3 },
};

const NONE = Object.freeze({ bucket: null, intensity: 0, confidence: 0, source: null });
const strings = (list) => (Array.isArray(list) ? list.filter((x) => typeof x === "string") : []);

// Item emotion: an LLM label wins (confidence 1), then keywords (.5), then content type (.3-.4).
export function inferItemEmotion(item) {
  if (!item || typeof item !== "object") return { ...NONE };
  const label = item.emotion;
  if (label && typeof label === "object" && (EMOTIONS[label.bucket] || label.bucket === "neutral")) {
    const intensity = Number.isFinite(label.intensity) ? clamp(label.intensity, 0, 1) : 0.5;
    return { bucket: EMOTIONS[label.bucket] ? label.bucket : null, intensity, confidence: 1, source: "label" };
  }
  const text = [...strings(item.tags), typeof item.description === "string" ? item.description : ""].join(" ").toLowerCase();
  if (text.trim()) {
    let best = null;
    let bestHits = 0;
    for (const bucket of EMOTION_IDS) {
      const hits = text.match(KEYWORD_RE[bucket])?.length || 0;
      if (hits > bestHits) [best, bestHits] = [bucket, hits];
    }
    if (best) return { bucket: best, intensity: 0.5, confidence: 0.5, source: "tags" };
  }
  let type = null;
  for (const t of [...strings(item.contentTypes), ...strings(item.tags)]) {
    const hit = TYPE_EMOTION[t.toLowerCase()];
    if (hit && (!type || hit.confidence > type.confidence)) type = hit;
  }
  if (type) return { bucket: type.bucket, intensity: 0.3, confidence: type.confidence, source: "type" };
  return { ...NONE };
}

// Ranking multiplier from the reader's dial and learned affinity for the item's bucket, scaled by confidence.
export function itemEmotionMultiplier(item, emotion, { dials, now = Date.now(), config = EMOTION_CONFIG, inferred } = {}) {
  const cfg = resolve(config);
  const { bucket, confidence } = inferred || inferItemEmotion(item);
  if (!EMOTIONS[bucket] || !confidence) return 1;
  const dial = Number.isFinite(dials?.[bucket]) ? clamp(dials[bucket], -1, 1) : 0;
  const affinity = emotion ? emotionAffinity(emotion, bucket, now, cfg) : 0;
  const mult = Math.exp((cfg.dialStrength * dial + cfg.rankStrength * affinity) * confidence);
  return Number.isFinite(mult) ? clamp(mult, cfg.minMult, cfg.maxMult) : 1;
}
