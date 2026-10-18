import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmotion,
  EMOTION_CONFIG,
  EMOTION_IDS,
  EMOTIONS,
  emotionAffinity,
  emotionProfile,
  inferItemEmotion,
  isNegativeArousal,
  itemEmotionMultiplier,
  recordEmotion,
} from "../lib/feed/emotion.mjs";

const now = Date.parse("2026-09-01");
const DAY = 24 * 3600000;

test("buckets carry valence/arousal and negative arousal flags angry and disgusted only", () => {
  assert.deepEqual(EMOTION_IDS, ["amused", "amazed", "moved", "curious", "sad", "angry", "disgusted"]);
  assert.deepEqual(EMOTIONS.angry, { valence: -0.8, arousal: 0.9 });
  assert.deepEqual(EMOTION_IDS.filter(isNegativeArousal), ["angry", "disgusted"]);
  assert.equal(isNegativeArousal("nope"), false);
  assert.deepEqual(createEmotion(), { b: {}, n: 0 });
});

test("an angry reaction never raises affinity above 0", () => {
  const emotion = createEmotion();
  for (let k = 0; k < 20; k += 1) recordEmotion(emotion, "angry", { kind: "react", now });
  for (let k = 0; k < 20; k += 1) recordEmotion(emotion, "angry", { kind: "engage", amount: 3, now });
  assert.equal(emotionAffinity(emotion, "angry", now), 0);
  assert.equal(emotionAffinity(emotion, "disgusted", now), 0);
  for (let k = 0; k < 20; k += 1) recordEmotion(emotion, "sad", { kind: "react", now });
  assert.ok(emotionAffinity(emotion, "sad", now) <= EMOTION_CONFIG.affinityCap.sad);
  for (let k = 0; k < 5; k += 1) recordEmotion(emotion, "amused", { kind: "react", now });
  assert.ok(emotionAffinity(emotion, "amused", now) > 0.5, "positive buckets are uncapped");
});

test("an upsetting reject lowers the bucket", () => {
  const emotion = createEmotion();
  assert.equal(emotionAffinity(emotion, "amazed", now), 0);
  recordEmotion(emotion, "amazed", { kind: "reject", now });
  const once = emotionAffinity(emotion, "amazed", now);
  assert.ok(once < 0);
  for (let k = 0; k < 50; k += 1) recordEmotion(emotion, "amazed", { kind: "reject", now });
  const many = emotionAffinity(emotion, "amazed", now);
  assert.ok(many < once && many >= -1, `bounded at -1 (${many})`);
});

test("engage counts a fraction of a reaction", () => {
  const emotion = createEmotion();
  recordEmotion(emotion, "curious", { kind: "engage", now });
  assert.equal(emotion.b.curious.rx, EMOTION_CONFIG.engageScale);
  assert.equal(emotion.n, 1);
});

test("undo restores the bucket and never goes below zero", () => {
  const emotion = createEmotion();
  recordEmotion(emotion, "moved", { kind: "react", now });
  const before = emotionAffinity(emotion, "moved", now);
  recordEmotion(emotion, "moved", { kind: "react", now });
  recordEmotion(emotion, "moved", { kind: "react", amount: -1, now });
  assert.equal(emotionAffinity(emotion, "moved", now), before);
  assert.equal(emotion.n, 1);
  recordEmotion(emotion, "moved", { kind: "reject", amount: -5, now });
  assert.equal(emotion.b.moved.rej, 0);
  recordEmotion(emotion, "moved", { kind: "react", amount: -5, now });
  assert.equal(emotion.b.moved.rx, 0);
  assert.equal(emotionAffinity(emotion, "moved", now), 0);
});

test("unknown buckets and kinds are ignored", () => {
  const emotion = createEmotion();
  assert.equal(recordEmotion(emotion, "bored", { kind: "react", now }), emotion);
  recordEmotion(emotion, "amused", { kind: "wat", now });
  assert.deepEqual(emotion, createEmotion());
  assert.equal(emotionAffinity(emotion, "bored", now), 0);
});

test("counts decay with the half-life", () => {
  const emotion = createEmotion();
  for (let k = 0; k < 4; k += 1) recordEmotion(emotion, "amused", { kind: "react", now });
  const fresh = emotionAffinity(emotion, "amused", now);
  const later = now + EMOTION_CONFIG.halfLifeMs;
  assert.equal(emotionProfile(emotion, later).find((r) => r.bucket === "amused").evidence, 2);
  assert.ok(emotionAffinity(emotion, "amused", later) < fresh);
  assert.ok(emotionAffinity(emotion, "amused", now + 365 * DAY) < 0.01);
  recordEmotion(emotion, "amused", { kind: "react", now: later });
  assert.equal(emotion.b.amused.rx, 3, "decays on touch then adds");
  assert.equal(emotion.b.amused.at, later);
});

test("profile lists every bucket in a stable order", () => {
  const emotion = createEmotion();
  recordEmotion(emotion, "curious", { kind: "react", now });
  const profile = emotionProfile(emotion, now);
  assert.deepEqual(profile.map((r) => r.bucket), EMOTION_IDS);
  const curious = profile.find((r) => r.bucket === "curious");
  assert.deepEqual(curious, { bucket: "curious", valence: 0.4, arousal: 0.4, affinity: 0.333, evidence: 1 });
  assert.equal(emotionProfile(undefined, now).every((r) => r.affinity === 0 && r.evidence === 0), true);
});

test("keyword and type fallbacks", () => {
  assert.deepEqual(inferItemEmotion({ tags: ["funny"], description: "a joke about cats" }), { bucket: "amused", intensity: 0.5, confidence: 0.5, source: "tags" });
  assert.equal(inferItemEmotion({ description: "The outrage over the scandal grows" }).bucket, "angry");
  assert.equal(inferItemEmotion({ description: "Cursed rotten sandwich" }).bucket, "disgusted");
  assert.equal(inferItemEmotion({ description: "RIP to a legend, so tragic" }).bucket, "sad");
  assert.equal(inferItemEmotion({ description: "A wholesome tribute" }).bucket, "moved");
  assert.equal(inferItemEmotion({ tags: ["diagram"], description: "Engine explained" }).bucket, "curious");
  assert.equal(inferItemEmotion({ description: "Breathtaking epic view" }).bucket, "amazed");
  assert.equal(inferItemEmotion({ description: "a trip to the ripe orchard" }).bucket, null, "whole words only");
  assert.deepEqual(inferItemEmotion({ contentTypes: ["art"] }), { bucket: "amazed", intensity: 0.3, confidence: 0.3, source: "type" });
  assert.equal(inferItemEmotion({ contentTypes: ["highlight"] }).confidence, 0.4);
  assert.equal(inferItemEmotion({ contentTypes: ["analysis"] }).bucket, "curious");
  assert.equal(inferItemEmotion({ contentTypes: ["discussion"] }).bucket, "curious");
  assert.equal(inferItemEmotion({ contentTypes: ["art", "highlight"] }).confidence, 0.4, "most confident type wins");
  assert.deepEqual(inferItemEmotion({ contentTypes: ["general"], tags: ["general"], description: "a chair" }), { bucket: null, intensity: 0, confidence: 0, source: null });
  assert.equal(inferItemEmotion(null).bucket, null);
});

test("a label beats tags beats type", () => {
  const item = { emotion: { bucket: "moved", intensity: 0.8 }, tags: ["funny"], contentTypes: ["art"] };
  assert.deepEqual(inferItemEmotion(item), { bucket: "moved", intensity: 0.8, confidence: 1, source: "label" });
  assert.equal(inferItemEmotion({ ...item, emotion: null }).source, "tags");
  assert.equal(inferItemEmotion({ ...item, emotion: null }).bucket, "amused");
  assert.equal(inferItemEmotion({ ...item, emotion: null, tags: [] }).source, "type");
  assert.equal(inferItemEmotion({ emotion: { bucket: "bogus" }, contentTypes: ["art"] }).source, "type", "an invalid label falls through");
  assert.deepEqual(inferItemEmotion({ emotion: { bucket: "neutral", intensity: 0.2 }, tags: ["funny"] }), { bucket: null, intensity: 0.2, confidence: 1, source: "label" });
  assert.equal(inferItemEmotion({ emotion: { bucket: "amused", intensity: 7 } }).intensity, 1);
});

test("a dial of -1 on angry gives a multiplier below 1", () => {
  const angry = { emotion: { bucket: "angry", intensity: 1 } };
  const m = itemEmotionMultiplier(angry, createEmotion(), { dials: { angry: -1 }, now });
  assert.ok(m < 1);
  assert.equal(m, Math.exp(-EMOTION_CONFIG.dialStrength));
  assert.ok(itemEmotionMultiplier(angry, createEmotion(), { dials: { amused: 1 }, now }) === 1, "other dials do not apply");
  assert.ok(itemEmotionMultiplier({ emotion: { bucket: "amused", intensity: 1 } }, createEmotion(), { dials: { amused: 1 }, now }) > 1);
});

test("multiplier scales with confidence, learns affinity and stays clamped", () => {
  const emotion = createEmotion();
  for (let k = 0; k < 10; k += 1) recordEmotion(emotion, "amused", { kind: "react", now });
  const labelled = itemEmotionMultiplier({ emotion: { bucket: "amused", intensity: 1 } }, emotion, { now });
  const typed = itemEmotionMultiplier({ contentTypes: ["meme"] }, emotion, { now });
  assert.ok(labelled > typed && typed > 1);
  const strong = { ...EMOTION_CONFIG, dialStrength: 50 };
  assert.equal(itemEmotionMultiplier({ emotion: { bucket: "sad" } }, null, { dials: { sad: -1 }, now, config: strong }), EMOTION_CONFIG.minMult);
  assert.equal(itemEmotionMultiplier({ emotion: { bucket: "sad" } }, null, { dials: { sad: 1 }, now, config: strong }), EMOTION_CONFIG.maxMult);
  assert.equal(itemEmotionMultiplier({ description: "a chair" }, emotion, { dials: { amused: 1 }, now }), 1, "unknown bucket returns 1");
  assert.equal(itemEmotionMultiplier({ emotion: { bucket: "amused" } }, emotion, { dials: { amused: Number.NaN }, now }), labelled);
});

test("determinism", () => {
  const run = () => {
    const emotion = createEmotion();
    EMOTION_IDS.forEach((bucket, k) => {
      recordEmotion(emotion, bucket, { kind: k % 2 ? "reject" : "react", amount: k + 1, now: now + k * DAY });
      recordEmotion(emotion, bucket, { kind: "engage", now: now + k * DAY + 1 });
    });
    const items = [{ contentTypes: ["meme"] }, { description: "stunning gore" }, { emotion: { bucket: "angry", intensity: 0.9 } }];
    return {
      emotion,
      profile: emotionProfile(emotion, now + 10 * DAY),
      inferred: items.map(inferItemEmotion),
      mults: items.map((item) => itemEmotionMultiplier(item, emotion, { dials: { amused: 0.5, angry: -1 }, now: now + 10 * DAY })),
    };
  };
  assert.deepEqual(run(), run());
});
