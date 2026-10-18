import test from "node:test";
import assert from "node:assert/strict";
import { calibration, createStated, nextProbe, recordAnswer, recordAsked, recordDismiss, STATED_CONFIG } from "../lib/feed/stated.mjs";

const NOW = Date.parse("2026-10-01");
const H = 3600000;
const subject = (id, extra = {}) => ({ id, name: id.toUpperCase(), lift: 1.6, evidence: 5, theta: 0, n: 3, postId: `p-${id}`, ...extra });

test("probes wait for the impression cadence", () => {
  const stated = createStated();
  const subjects = [subject("a/x")];
  assert.equal(nextProbe(stated, { subjects, shown: 29, now: NOW }), null);
  const probe = nextProbe(stated, { subjects, shown: 30, now: NOW });
  assert.ok(probe);
  recordAsked(stated, probe, { now: NOW, shown: 30 });
  const others = [subject("b/y")];
  assert.equal(nextProbe(stated, { subjects: others, shown: 59, now: NOW + 60000 }), null);
  assert.equal(nextProbe(stated, { subjects: others, shown: 60, now: NOW + 60000 })?.sub, "b/y");
});

test("an interest probe has the expected shape", () => {
  const probe = nextProbe(createStated(), { subjects: [subject("a/x")], shown: 30, now: NOW });
  assert.deepEqual(probe, {
    id: "interest:a/x:30",
    kind: "interest",
    sub: "a/x",
    subName: "A/X",
    postId: "p-a/x",
    question: "Want more of A/X?",
    options: [{ value: "more", label: "More" }, { value: "same", label: "About the same" }, { value: "less", label: "Less" }],
  });
});

test("kind selection: knowledge for a liked subject with little knowledge evidence, else interest", () => {
  const k = nextProbe(createStated(), { subjects: [subject("a/x", { n: 1 })], shown: 30, now: NOW });
  assert.equal(k.kind, "knowledge");
  assert.equal(k.question, "How well do you know A/X?");
  assert.deepEqual(k.options.map((o) => o.value), ["new", "some", "know"]);
  assert.equal(nextProbe(createStated(), { subjects: [subject("a/x", { n: undefined })], shown: 30, now: NOW }).kind, "knowledge");
  assert.equal(nextProbe(createStated(), { subjects: [subject("a/x", { n: 2 })], shown: 30, now: NOW }).kind, "interest");
});

test("candidates need enough lift and evidence; the highest lift wins", () => {
  const stated = createStated();
  assert.equal(nextProbe(stated, { subjects: [subject("a/x", { lift: 1.2 })], shown: 30, now: NOW }), null);
  assert.equal(nextProbe(stated, { subjects: [subject("a/x", { evidence: 2 })], shown: 30, now: NOW }), null);
  const picked = nextProbe(stated, { subjects: [subject("a/x", { lift: 1.4 }), subject("b/y", { lift: 2 }), subject("c/z", { lift: 1.2 })], shown: 30, now: NOW });
  assert.equal(picked.sub, "b/y");
});

test("a subject cools down for 48h after being asked and 24h after a dismissal", () => {
  const stated = createStated();
  const subjects = [subject("a/x")];
  recordAsked(stated, nextProbe(stated, { subjects, shown: 30, now: NOW }), { now: NOW, shown: 30 });
  assert.equal(nextProbe(stated, { subjects, shown: 100, now: NOW + 47 * H }), null);
  assert.equal(nextProbe(stated, { subjects, shown: 100, now: NOW + STATED_CONFIG.subGapMs })?.sub, "a/x");

  const other = createStated();
  recordDismiss(other, "a/x", NOW);
  assert.equal(nextProbe(other, { subjects, shown: 30, now: NOW + 23 * H }), null);
  assert.equal(nextProbe(other, { subjects, shown: 30, now: NOW + 24 * H })?.sub, "a/x");
});

test("at most two probes per session; a new session after an idle gap resets the count", () => {
  const stated = createStated();
  const subjects = [subject("a/x"), subject("b/y", { lift: 1.5 }), subject("c/z", { lift: 1.4 })];
  let now = NOW;
  for (const shown of [30, 60]) {
    const probe = nextProbe(stated, { subjects, shown, now });
    assert.ok(probe, `probe at ${shown}`);
    recordAsked(stated, probe, { now, shown });
    now += 5 * 60000;
  }
  assert.equal(stated.session, 2);
  assert.equal(nextProbe(stated, { subjects, shown: 90, now }), null, "session cap");
  const later = now + STATED_CONFIG.sessionGapMs + 1;
  const next = nextProbe(stated, { subjects, shown: 90, now: later });
  assert.equal(next?.sub, "c/z");
  recordAsked(stated, next, { now: later, shown: 90 });
  assert.equal(stated.session, 1);
  assert.equal(stated.lastShown, 90);
});

test("answers are capped at 50 and invalid answers are ignored", () => {
  const stated = createStated();
  recordAnswer(stated, { sub: "a/x", probe: "interest", answer: "know", lift: 2, now: NOW });
  recordAnswer(stated, { sub: "a/x", probe: "bogus", answer: "more", lift: 2, now: NOW });
  assert.equal(stated.answers.length, 0);
  for (let i = 0; i < 60; i += 1) recordAnswer(stated, { sub: `s/${i}`, probe: "interest", answer: "more", lift: 1.23456, now: NOW + i });
  assert.equal(stated.answers.length, 50);
  assert.equal(stated.answers[0].sub, "s/10");
  assert.deepEqual(stated.answers.at(-1), { sub: "s/59", probe: "interest", answer: "more", at: NOW + 59, lift: 1.235 });
});

test("calibration: agreement is the share of more/less answers consistent with lift", () => {
  assert.deepEqual(calibration(createStated()), { answered: 0, agreement: null });
  assert.deepEqual(calibration(undefined), { answered: 0, agreement: null });
  const stated = createStated();
  const add = (probe, answer, lift) => recordAnswer(stated, { sub: "a/x", probe, answer, lift, now: NOW });
  add("interest", "more", 1.5); // agrees
  add("interest", "more", 1.15); // agrees (boundary)
  add("interest", "more", 1.1); // disagrees
  add("interest", "less", 0.8); // agrees
  add("interest", "less", 1); // disagrees (boundary)
  add("interest", "same", 2); // neutral
  add("knowledge", "know", 2); // not an interest answer
  add("interest", "more", null); // no inferred lift
  assert.deepEqual(calibration(stated), { answered: 8, agreement: 0.6 });
});

test("recorders tolerate a partial stored blob", () => {
  const stated = { lastShown: 10 };
  recordDismiss(stated, "a/x", NOW);
  recordAsked(stated, { sub: "b/y" }, { now: NOW, shown: 40 });
  recordAnswer(stated, { sub: "b/y", probe: "knowledge", answer: "some", now: NOW });
  assert.deepEqual(stated, { lastShown: 40, asked: { "b/y": NOW }, dismissed: { "a/x": NOW }, answers: [{ sub: "b/y", probe: "knowledge", answer: "some", at: NOW, lift: null }], session: 1 });
});
