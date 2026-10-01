import test from "node:test";
import assert from "node:assert/strict";
import {
  validateVector,
  chunkText,
  weightedInterest,
  imageStoragePath,
  nextPacificReset,
  fingerprint,
  filterCandidates,
  journeyCandidates,
} from "../lib/vector/core.mjs";
import { embedContent, ProviderError } from "../lib/vector/provider.mjs";

const vector = (index = 0) =>
  Array.from({ length: 768 }, (_, i) => (i === index ? 1 : 0));

test("vectors require the configured dimension, finite values and nonzero norm", () => {
  assert.equal(validateVector(vector()).length, 768);
  for (const value of [
    [1],
    vector().fill(0),
    vector().fill(Infinity),
    vector().fill("1"),
  ]) {
    assert.throws(() => validateVector(value));
  }
});

test("chunking preserves Unicode text and bounds each request conservatively", () => {
  const input = "Helpful content 🌍 ".repeat(1300);
  const chunks = chunkText(input, 3000, 0);
  assert.equal(chunks.join(" "), input.trim());
  assert.ok(chunks.every((chunk) => Buffer.byteLength(chunk) <= 3000));
});

test("interest aggregates stronger recent actions and excludes negative signals", () => {
  const now = Date.parse("2026-09-30T00:00:00Z");
  const events = [
    {
      id: "1",
      sourceId: "a",
      type: "page_view",
      at: new Date(now).toISOString(),
      embedding: vector(0),
    },
    {
      id: "2",
      sourceId: "b",
      type: "like",
      at: new Date(now).toISOString(),
      embedding: vector(1),
    },
    {
      id: "3",
      sourceId: "c",
      type: "not_interested",
      at: new Date(now).toISOString(),
      embedding: vector(2),
    },
  ];
  const result = weightedInterest(events, { now });
  assert.ok(result.embedding[1] > result.embedding[0]);
  assert.equal(result.embedding[2], 0);
  assert.deepEqual(result.excluded, ["c"]);
  assert.deepEqual(weightedInterest([...events, events[1]], { now }), result);
  assert.equal(weightedInterest([], { now }).embedding, null);
});

test("image fetching accepts only the owned content storage prefix", () => {
  const base = "https://example.supabase.co";
  assert.equal(
    imageStoragePath(
      `${base}/storage/v1/object/public/content/assets/p/a/photo.jpg`,
      "p",
      "a",
      base,
    ),
    "assets/p/a/photo.jpg",
  );
  for (const url of [
    "http://127.0.0.1/a",
    `${base}/storage/v1/object/public/content/assets/other/a/x.jpg`,
    `${base}/storage/v1/object/public/content/assets/p/b/x.jpg`,
  ]) {
    assert.throws(() => imageStoragePath(url, "p", "a", base));
  }
});

test("daily budget reset respects Pacific daylight saving time", () => {
  assert.equal(
    nextPacificReset(new Date("2026-09-30T06:00:00Z")).toISOString(),
    "2026-09-30T07:00:00.000Z",
  );
  assert.equal(
    nextPacificReset(new Date("2026-12-30T07:00:00Z")).toISOString(),
    "2026-12-30T08:00:00.000Z",
  );
});

test("content fingerprints change with source content and preprocessing", () => {
  assert.equal(
    fingerprint({ body: "same", title: "x" }),
    fingerprint({ title: "x", body: "same" }),
  );
  assert.notEqual(
    fingerprint({ body: "same" }),
    fingerprint({ body: "changed" }),
  );
});

test("provider requests 768 dimensions and retrieval prefixes without taskType", async () => {
  let request;
  const result = await embedContent({
    text: "dogs",
    purpose: "query",
    apiKey: "test",
    fetcher: async (_url, init) => {
      request = JSON.parse(init.body);
      return Response.json({ embedding: { values: vector() } });
    },
  });
  assert.equal(result.length, 768);
  assert.equal(request.outputDimensionality, 768);
  assert.equal(
    request.content.parts[0].text,
    "task: search result | query: dogs",
  );
  assert.equal(request.taskType, undefined);
});

test("provider exposes daily 429 exhaustion and retry time without leaking its message", async () => {
  await assert.rejects(
    embedContent({
      text: "dogs",
      apiKey: "private-secret",
      fetcher: async () =>
        Response.json(
          {
            error: {
              status: "RESOURCE_EXHAUSTED",
              message: "private-secret",
              details: [
                {
                  "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                  violations: [
                    { quotaId: "GenerateContentRequestsPerDayPerProject" },
                  ],
                },
              ],
            },
          },
          { status: 429 },
        ),
    }),
    (error) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.status, 429);
      assert.equal(error.code, "daily_quota_exhausted");
      assert.ok(error.retryAt > Date.now());
      assert.ok(!error.message.includes("private-secret"));
      return true;
    },
  );
});

test("candidate reranking applies exclusions and editorial boosts", () => {
  const rows = [
    { sourceId: "a", score: 0.8 },
    { sourceId: "b", score: 0.7 },
  ];
  assert.deepEqual(
    filterCandidates(rows, [
      { entry_id: "a", rule_type: "exclude", status: "Active" },
    ]).map((x) => x.sourceId),
    ["b"],
  );
  assert.equal(
    filterCandidates(rows, [
      { entry_id: "b", rule_type: "boost", weight: 2, status: "Active" },
    ])[0].sourceId,
    "b",
  );
});

test("structured topic stages constrain targeting and difficulty without inferring expertise", () => {
  const rows = [
    { sourceId: "a", score: 0.9, topics: ["SQL"], difficulty: "advanced" },
    { sourceId: "b", score: 0.7, topics: ["SQL"], difficulty: "beginner" },
    { sourceId: "c", score: 0.8, topics: ["Gardening"] },
    { sourceId: "d", score: 0.6, topics: ["SQL"], targetStages: ["curious"] },
  ];
  assert.deepEqual(
    journeyCandidates(rows, [
      { topic_label: "SQL", stage: "curious" },
      { topic_label: "Gardening", stage: "not interested" },
    ]).map((row) => row.sourceId),
    ["b", "d"],
  );
  assert.equal(
    journeyCandidates(rows, []).some((row) => row.sourceId === "a"),
    false,
  );
  assert.equal(
    journeyCandidates(rows, [{ topic_label: "SQL", stage: "advocate" }]).some(
      (row) => row.sourceId === "a",
    ),
    true,
  );
});
