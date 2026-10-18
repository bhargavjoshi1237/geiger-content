// Stated-interest probes: occasionally asks the reader about a subject the feed thinks they like,
// and tracks how often their answers agree with the inferred lift. Pure, no I/O.

const H = 3600000;

export const STATED_CONFIG = {
  everyShown: 30,
  minEvidence: 3,
  minLift: 1.3,
  subGapMs: 48 * H,
  dismissGapMs: 24 * H,
  maxPerSession: 2,
  // Idle gap after the last probe that starts a new probe session (matches the governor's session gap).
  sessionGapMs: 30 * 60000,
};

// Lift thresholds an interest answer is checked against in `calibration`.
const AGREE_MORE_LIFT = 1.15;
const AGREE_LESS_LIFT = 1;
const MAX_ANSWERS = 50;

export const PROBE_OPTIONS = {
  interest: [{ value: "more", label: "More" }, { value: "same", label: "About the same" }, { value: "less", label: "Less" }],
  knowledge: [{ value: "new", label: "New to me" }, { value: "some", label: "Know some" }, { value: "know", label: "Know it well" }],
};

const cfg = (config) => (config && config !== STATED_CONFIG ? { ...STATED_CONFIG, ...config } : STATED_CONFIG);
const num = (x, fallback = 0) => (Number.isFinite(Number(x)) ? Number(x) : fallback);

export function createStated() {
  return { asked: {}, dismissed: {}, answers: [], lastShown: 0, session: 0 };
}

// Fills missing fields on a stored blob in place.
function ensure(stated) {
  stated.asked ||= {};
  stated.dismissed ||= {};
  if (!Array.isArray(stated.answers)) stated.answers = [];
  stated.lastShown = num(stated.lastShown);
  stated.session = num(stated.session);
  return stated;
}

const lastAskedAt = (stated) => Math.max(0, ...Object.values(stated.asked || {}).map((t) => num(t)));

// Probes asked in the current session; resets once the last probe is older than the session gap.
function sessionCount(stated, now, c) {
  const last = lastAskedAt(stated);
  return last && now - last <= c.sessionGapMs ? num(stated.session) : 0;
}

const coolingDown = (stated, sub, now, c) =>
  (stated.asked?.[sub] != null && now - num(stated.asked[sub]) < c.subGapMs) ||
  (stated.dismissed?.[sub] != null && now - num(stated.dismissed[sub]) < c.dismissGapMs);

// Next probe to show, or null when the cadence, session cap or cooldowns forbid one.
export function nextProbe(stated, { subjects = [], shown = 0, now = Date.now(), config } = {}) {
  const c = cfg(config);
  const st = stated || createStated();
  if (num(shown) - num(st.lastShown) < c.everyShown) return null;
  if (sessionCount(st, now, c) >= c.maxPerSession) return null;
  const pick = (subjects || [])
    .filter((s) => s && s.id && num(s.evidence) >= c.minEvidence && num(s.lift) >= c.minLift && !coolingDown(st, s.id, now, c))
    .sort((x, y) => num(y.lift) - num(x.lift) || num(y.evidence) - num(x.evidence) || String(x.id).localeCompare(String(y.id)))[0];
  if (!pick) return null;
  const kind = num(pick.n) < 2 ? "knowledge" : "interest";
  const name = pick.name || pick.id;
  return {
    id: `${kind}:${pick.id}:${num(shown)}`,
    kind,
    sub: pick.id,
    subName: name,
    postId: pick.postId ?? null,
    question: kind === "knowledge" ? `How well do you know ${name}?` : `Want more of ${name}?`,
    options: PROBE_OPTIONS[kind].map((o) => ({ ...o })),
  };
}

export function recordAsked(stated, probe, { now = Date.now(), shown = 0, config } = {}) {
  const c = cfg(config);
  ensure(stated);
  if (!probe?.sub) return stated;
  stated.session = sessionCount(stated, now, c) + 1;
  stated.asked[probe.sub] = now;
  stated.lastShown = num(shown);
  return stated;
}

export function recordAnswer(stated, { sub, probe, answer, lift = null, now = Date.now() } = {}) {
  ensure(stated);
  const valid = PROBE_OPTIONS[probe]?.some((o) => o.value === answer);
  if (!sub || !valid) return stated;
  stated.answers.push({ sub, probe, answer, at: now, lift: Number.isFinite(Number(lift)) && lift !== null ? +Number(lift).toFixed(3) : null });
  if (stated.answers.length > MAX_ANSWERS) stated.answers.splice(0, stated.answers.length - MAX_ANSWERS);
  return stated;
}

export function recordDismiss(stated, sub, now = Date.now()) {
  ensure(stated);
  if (sub) stated.dismissed[sub] = now;
  return stated;
}

// Answer count, and the share of more/less interest answers consistent with the inferred lift (`same` is neutral).
export function calibration(stated) {
  const answers = Array.isArray(stated?.answers) ? stated.answers : [];
  const judged = answers.filter((a) => a.probe === "interest" && (a.answer === "more" || a.answer === "less") && a.lift !== null && Number.isFinite(Number(a.lift)));
  if (!judged.length) return { answered: answers.length, agreement: null };
  const agree = judged.filter((a) => (a.answer === "more" ? Number(a.lift) >= AGREE_MORE_LIFT : Number(a.lift) < AGREE_LESS_LIFT)).length;
  return { answered: answers.length, agreement: +(agree / judged.length).toFixed(3) };
}
