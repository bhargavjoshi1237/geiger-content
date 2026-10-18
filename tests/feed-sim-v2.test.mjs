import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildTopicLinks, indexCatalog } from "../lib/feed/engine.mjs";
import { FeedSettingsError } from "../lib/feed/settings.mjs";
import { LEGACY_PERSONAS, runAcrossSeeds, runSimulation, SETTINGS_VARIANTS, SIMULATION_START, syntheticCatalog, V2_PERSONAS } from "../lib/feed/simulator.mjs";
import { loadLegacyTaxonomy, loadTaxonomy } from "../lib/feed/taxonomy/index.mjs";

// Persona metrics are bimodal by seed, so every behavioural check aggregates over several seeds.
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const ent = loadTaxonomy();
const catalog = syntheticCatalog(ent, { perHorizontal: 12, now: SIMULATION_START, levels: true });
const index = indexCatalog(catalog, { topicLinks: buildTopicLinks(ent) });
const persona = (id) => V2_PERSONAS.find((p) => p.id === id);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const runs = (id, options = {}, seeds = SEEDS) => runAcrossSeeds({ persona: persona(id), index, batches: 60, ...options }, seeds).map((r) => r.metrics);

test("legacy runs are bit-identical: v2 options default off and settings defaults are inert", () => {
  const legacy = loadLegacyTaxonomy().filter((t) => t.pool === "main");
  const legacyIndex = indexCatalog(syntheticCatalog(legacy, { perHorizontal: 6, now: Date.parse("2026-09-30") }), { topicLinks: buildTopicLinks(legacy) });
  const foodie = LEGACY_PERSONAS.find((p) => p.id === "casual-foodie");
  const fingerprint = (r) => createHash("sha1").update(JSON.stringify(r.timeline.map((t) => [t.topics, t.slots, t.depths, t.engaged]))).digest("hex").slice(0, 16);
  // Snapshot taken before the v2 simulator landed, under the skip tuning of that time: everything but the skip defaults is unchanged.
  const oldSkip = { skipRunWindowEvents: 30, skipSpread: { horizontal: 1, step: 0.9, sub: 0.5, topic: 0, all: 1 } };
  assert.equal(fingerprint(runSimulation({ persona: foodie, index: legacyIndex, batches: 40, seed: 3, config: oldSkip })), "72a513be44c19447");
  const plain = runSimulation({ persona: foodie, index: legacyIndex, batches: 40, seed: 3 });
  // Current defaults (skip sub .7, run window 100, tuned to recover focus depth).
  assert.equal(fingerprint(plain), "f6f148af35d3f290");
  assert.ok(!("v2" in plain.metrics), "no v2 metrics on a legacy run");
  const withDefaults = runSimulation({ persona: foodie, index: legacyIndex, batches: 40, seed: 3, settings: {} });
  assert.deepEqual(withDefaults.timeline, plain.timeline);
  assert.deepEqual(withDefaults.metrics, plain.metrics);
});

test("a levels catalog labels every item deterministically and gives entertainment items virtual depth", () => {
  const plain = syntheticCatalog(ent, { perHorizontal: 12, now: SIMULATION_START });
  assert.deepEqual(catalog.map((i) => [i.id, i.createdAt, i.score]), plain.map((i) => [i.id, i.createdAt, i.score]), "labels never move the rng");
  assert.deepEqual(syntheticCatalog(ent, { perHorizontal: 12, now: SIMULATION_START, levels: true }), catalog);
  assert.ok(catalog.every((i) => i.difficulty?.source === "label" && i.emotion?.bucket && i.depth >= 1 && i.depth <= 3));
  assert.deepEqual([...new Set(catalog.map((i) => i.depth))].sort(), [1, 2, 3]);
  assert.ok(catalog.filter((i) => i.sensitive).every((i) => ["sad", "angry", "disgusted"].includes(i.emotion.bucket) && i.emotion.intensity >= 0.6));
  const horror = catalog.filter((i) => i.subjectPath === "movies-tv/horror");
  assert.ok(horror.filter((i) => i.emotion.bucket === "disgusted").length / horror.length > 0.5, "horror leans disgusted");
  assert.ok(catalog.some((i) => i.emotion.bucket === "angry") && catalog.some((i) => i.emotion.bucket === "neutral"));
});

test("v2 readers send the whole new vocabulary and the run reports v2 metrics", () => {
  const events = {};
  for (const id of ["outrage-prone", "expert-mixed", "drift-gamer-to-f1"])
    for (const m of runs(id, { signals: true }, [1, 2])) for (const [k, n] of Object.entries(m.v2.events)) events[k] = (events[k] || 0) + n;
  for (const key of ["react:angry", "react:disgusted", "share", "knew_this", "learned", "explore_click", "hide:upsetting", "hide:seen_it", "hide:this_topic"])
    assert.ok(events[key] > 0, `${key} sent (${JSON.stringify(events)})`);
  assert.ok(Object.keys(events).some((k) => k.startsWith("probe_answer:knowledge:")) && Object.keys(events).some((k) => k.startsWith("probe_answer:interest:")), "both probe kinds answered");
  const [m] = runs("expert-mixed", { signals: true }, [1]);
  for (const key of ["emotionMix", "angryShare", "knowledge", "depth", "drift", "funnel", "governor", "stated"]) assert.ok(key in m.v2, key);
  assert.ok(m.v2.stated.answered > 0 && m.v2.funnel.entropy > 0);
});

test("anger rule: angry reactions teach the feed less anger (30%+), and the angry dial cuts further", () => {
  const seeds = Array.from({ length: 16 }, (_, i) => i + 1);
  const angry = (options) => runs("outrage-prone", options, seeds);
  const off = angry({});
  const on = angry({ signals: true });
  const dial = angry({ signals: true, settings: SETTINGS_VARIANTS.noAnger });
  assert.ok(on.every((m) => m.v2.gated > 0), "negative reactions gate engagement");
  const share = (ms) => mean(ms.map((m) => m.v2.angryShare.all));
  // Angry reactions now reject the bucket (affinity < 0) and that weighs topics/subjects too, so learning alone cuts anger 30%+;
  // the dial then stacks on the same bucket (the multiplier floor limits the stack), so its extra cut is smaller than before.
  assert.ok(share(on) <= share(off) * 0.7, `learning lowers angry share 30%+ (${share(off).toFixed(3)} → ${share(on).toFixed(3)})`);
  assert.ok(share(dial) <= share(on) * 0.85, `angry dial −1 cuts further: ${share(on).toFixed(3)} → ${share(dial).toFixed(3)}`);
  assert.ok(share(dial) <= share(off) * 0.5, `dial + learning vs no learning: ${share(off).toFixed(3)} → ${share(dial).toFixed(3)}`);
  assert.ok(on.every((m) => m.v2.emotion.find((r) => r.bucket === "angry").affinity < 0), "angry reactions earn anger a negative affinity");
});

test("knew_this and learned walk an expert off the basics, unlike the legacy signals", () => {
  const on = runs("expert-mixed", { signals: true });
  const off = runs("expert-mixed");
  const basics = (ms, part) => mean(ms.map((m) => m.v2.knowledge.basics[part].share ?? 0));
  assert.ok(basics(on, "late") < basics(on, "early") - 0.2, `basics ${basics(on, "early").toFixed(2)} → ${basics(on, "late").toFixed(2)}`);
  assert.ok(basics(on, "late") < basics(off, "late") - 0.15, `late basics on ${basics(on, "late").toFixed(2)} vs off ${basics(off, "late").toFixed(2)}`);
  const hit = (ms) => mean(ms.map((m) => m.v2.knowledge.hitRate.late));
  assert.ok(hit(on) > hit(off), `comfort-band hit rate ${hit(off).toFixed(2)} → ${hit(on).toFixed(2)}`);
  const cs = on.map((m) => m.v2.knowledge.subjects.find((s) => s.id === "gaming/counter-strike")).filter(Boolean);
  const cricket = on.map((m) => m.v2.knowledge.subjects.find((s) => s.id === "sports/cricket")).filter(Boolean);
  // knew_this floors θ at b + logit(pHigh), so the expert (true θ 2) is estimated near their level and their basics are suppressed.
  // (fewer basics served means fewer knowledge events, so CS is in the top-8 summary in fewer runs than before).
  assert.ok(cs.length >= 4 && mean(cs.map((s) => s.theta)) > 1.5, `the expert subject is estimated near the reader's level (${mean(cs.map((s) => s.theta)).toFixed(2)})`);
  assert.ok(basics(on, "late") < 0.15, `late basics ${basics(on, "late").toFixed(2)}`);
  if (cricket.length) assert.ok(mean(cricket.map((s) => s.theta)) < mean(cs.map((s) => s.theta)), "the novice subject stays below the expert one");
});

test("the governor caps rabbit-hole descent per session; uncapped runs descend faster", () => {
  const off = runs("rabbit-hole-descender");
  assert.ok(off.some((m) => m.v2.depth.maxSessionDescent > 1), "without the governor a session can descend two levels");
  for (const [variant, max] of [["default", 1], ["rabbitHole", 1], ["deepRabbitHole", 3]]) {
    const ms = runs("rabbit-hole-descender", { signals: true, settings: SETTINGS_VARIANTS[variant] });
    for (const m of ms) for (const s of m.v2.depth.sessions) assert.ok(Object.values(s.descent).every((d) => d <= max), `${variant} session ${s.session}: ${JSON.stringify(s.descent)}`);
    assert.ok(mean(ms.map((m) => m.focusDepthReached)) >= 2.5, `${variant} still descends across sessions`);
  }
});

test("the intensity cap throttles sensitive and intense items for a sensitive rabbit hole", () => {
  const variant = (cap) => runs("rabbit-hole-descender", { signals: true, settings: { ...SETTINGS_VARIANTS.deepRabbitHole, intensityCap: cap } });
  const any = variant("any");
  const moderate = variant("moderate");
  const calm = variant("calm");
  const share = (ms, key) => mean(ms.map((m) => m.v2[key].all));
  // Moderate used to equal any (its caps sat above what a reader ever sees in 30 impressions).
  for (const key of ["sensitiveShare", "intenseShare"]) assert.ok(share(moderate, key) < share(any, key) * 0.9, `moderate ${key} ${share(any, key).toFixed(3)} → ${share(moderate, key).toFixed(3)}`);
  assert.ok(share(calm, "sensitiveShare") < share(any, "sensitiveShare") * 0.7, `sensitive ${share(any, "sensitiveShare").toFixed(3)} → ${share(calm, "sensitiveShare").toFixed(3)}`);
  assert.ok(share(calm, "intenseShare") < share(any, "intenseShare") * 0.5, `intense ${share(any, "intenseShare").toFixed(3)} → ${share(calm, "intenseShare").toFixed(3)}`);
});

test("a gamer drifting to F1 over daily sessions reads as sports emerging and gaming fading, with sports subjects emerging", () => {
  const ms = runs("drift-gamer-to-f1", { signals: true });
  const labels = ms.map((m) => Object.fromEntries(m.v2.drift.labels.map((r) => [r.id, r.label])));
  assert.ok(labels.filter((l) => l.sports === "emerging").length >= SEEDS.length / 2, JSON.stringify(labels));
  // Gaming is still shown at about its share of six areas, which is fading, not satiation (it read "rested" in every run before).
  assert.ok(labels.filter((l) => l.gaming === "fading").length >= SEEDS.length * 0.75, JSON.stringify(labels));
  // Subject-level emergence: some sports subject emerges in most runs, and only sports subjects do.
  const subjects = ms.map((m) => m.v2.drift.labels.filter((r) => r.scope === "subject" && r.label === "emerging").map((r) => r.id));
  assert.ok(subjects.filter((ids) => ids.some((id) => id.startsWith("sports/"))).length >= SEEDS.length * 0.75, JSON.stringify(subjects));
  assert.ok(subjects.flat().every((id) => !id.startsWith("gaming/")), JSON.stringify(subjects));
  assert.ok(labels.every((l) => !["emerging", "spike"].includes(l.gaming) && !["fading", "rested"].includes(l.sports)), "never the wrong direction");
  // Readers whose taste never shifts get at most a couple of emerging subjects per run (no flood).
  const steady = runs("outrage-prone", { signals: true }).map((m) => m.v2.drift.labels.filter((r) => r.scope === "subject" && r.label === "emerging").length);
  assert.ok(mean(steady) <= 1.5, `steady reader emerging subjects per run ${mean(steady)}`);
  // Before the shift (end of session 3) nothing has drifted yet.
  assert.ok(ms.every((m) => m.v2.drift.timeline[2].labels.sports !== "emerging" && !["fading", "rested"].includes(m.v2.drift.timeline[2].labels.gaming)));
});

test("non-profiled settings learn nothing and serve only fresh items", () => {
  const [m] = runs("expert-mixed", { signals: true, settings: SETTINGS_VARIANTS.nonProfiled }, [1]);
  assert.equal(m.profile.events, 0);
  assert.deepEqual(Object.keys(m.profile.recentSlots), ["fresh"]);
  assert.deepEqual(m.v2.events, {});
  assert.deepEqual(m.v2.knowledge.subjects, []);
});

test("invalid settings are rejected up front", () => {
  assert.throws(() => runSimulation({ persona: persona("expert-mixed"), index, batches: 1, settings: { exploration: "wild" } }), FeedSettingsError);
});
