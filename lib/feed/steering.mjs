// Time-boxed steering: embedded free-text requests searched as `steer:<id>` similar sources until they expire; pure, no I/O.

export const STEERING_CONFIG = {
  maxActive: 6,
  ttlMs: 3 * 24 * 3600000,
  weight: 0.6,
  minWeight: 0.2,
  maxWeight: 1,
  minLen: 3,
  maxLen: 200,
  // Minimum similar share of a batch while any request is active.
  minShare: 0.2,
  // Candidate score multiplier the engine applies to `steer:` sources.
  priority: 2,
};

const STATUS = { steering_invalid: 400, steering_limit: 409 };

export class FeedSteeringError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FeedSteeringError";
    this.code = code;
    this.status = STATUS[code] || 400;
  }
}

const PREFIX = "steer:";
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const requestsOf = (steering) => (Array.isArray(steering?.requests) ? steering.requests : []);
const isActive = (request, now) => Number(request?.expiresAt) > now;
const textKey = (text) => String(text).toLowerCase();

// Trims and collapses whitespace; throws steering_invalid when empty, too short or too long.
export function cleanSteeringText(text, config = STEERING_CONFIG) {
  if (typeof text !== "string") throw new FeedSteeringError("steering_invalid", "Steering text must be a string.");
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) throw new FeedSteeringError("steering_invalid", "Steering text is empty.");
  if (clean.length < config.minLen) throw new FeedSteeringError("steering_invalid", `Steering text needs at least ${config.minLen} characters.`);
  if (clean.length > config.maxLen) throw new FeedSteeringError("steering_invalid", `Steering text is limited to ${config.maxLen} characters.`);
  return clean;
}

export function createSteering() {
  return { requests: [] };
}

// Small deterministic hash so a request without a caller id still gets a stable one.
function hashId(text, now) {
  let h = 0x811c9dc5;
  for (const ch of `${text}|${now}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return `s${h.toString(36)}`;
}

// Builds a validated request; the vector is rounded to 4 dp and the weight clamped to [minWeight, maxWeight].
export function createSteeringRequest({ id, text, vector, now = Date.now(), ttlMs, weight, config = STEERING_CONFIG } = {}) {
  const clean = cleanSteeringText(text, config);
  if (!Array.isArray(vector) && !ArrayBuffer.isView(vector)) throw new FeedSteeringError("steering_invalid", "Steering request has no embedding.");
  const rounded = Array.from(vector, (x) => +Number(x).toFixed(4));
  if (!rounded.length || rounded.some((x) => !Number.isFinite(x))) throw new FeedSteeringError("steering_invalid", "Steering embedding is invalid.");
  const ttl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : config.ttlMs;
  const w = Number.isFinite(weight) ? clamp(weight, config.minWeight, config.maxWeight) : config.weight;
  return {
    id: String(id || hashId(clean, now)).slice(0, 40),
    text: clean,
    createdAt: now,
    expiresAt: now + ttl,
    weight: w,
    vector: rounded,
  };
}

// Drops expired requests in place.
export function pruneSteering(steering, now = Date.now()) {
  steering.requests = requestsOf(steering).filter((r) => isActive(r, now));
  return steering;
}

// Adds a request after pruning; a duplicate text refreshes the existing expiry, a full list throws steering_limit.
export function addSteering(steering, request, { now = Date.now(), config = STEERING_CONFIG } = {}) {
  pruneSteering(steering, now);
  const key = textKey(request.text);
  const existing = steering.requests.find((r) => textKey(r.text) === key);
  if (existing) {
    existing.expiresAt = request.expiresAt;
    return steering;
  }
  if (steering.requests.length >= config.maxActive) {
    throw new FeedSteeringError("steering_limit", `At most ${config.maxActive} steering requests can be active.`);
  }
  steering.requests.push(request);
  return steering;
}

export function removeSteering(steering, id) {
  steering.requests = requestsOf(steering).filter((r) => r.id !== id);
  return steering;
}

// Unexpired requests; reads never mutate, so expired ones vanish here even before a prune.
export function activeSteering(steering, now = Date.now()) {
  return requestsOf(steering).filter((r) => isActive(r, now));
}

// Nearest-neighbour searches keyed `steer:<id>`, in the same shape as tasteSearches.
export function steeringSearches(steering, { now = Date.now(), limit = 40 } = {}) {
  const out = {};
  for (const r of activeSteering(steering, now)) out[PREFIX + r.id] = { vector: r.vector, limit };
  return out;
}

// Source key to request text, for "matches your request" reasons.
export function steeringLabels(steering) {
  const out = {};
  for (const r of requestsOf(steering)) out[PREFIX + r.id] = r.text;
  return out;
}

export function steeringViews(steering, now = Date.now()) {
  return activeSteering(steering, now).map((r) => ({
    id: r.id,
    text: r.text,
    expiresAt: r.expiresAt,
    remainingMs: Math.max(0, r.expiresAt - now),
    weight: r.weight,
  }));
}

// Minimum similar share for the batch: 0 with nothing active, else config.minShare.
export function steeringShare(steering, now = Date.now(), config = STEERING_CONFIG) {
  return activeSteering(steering, now).length ? config.minShare : 0;
}
