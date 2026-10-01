import test from "node:test";
import assert from "node:assert/strict";
import { assistantInput, invalidationInput, operationBody } from "../lib/operations_validation.mjs";

test("assistant rejects empty, oversized and cross-format entry inputs", () => {
  assert.throws(() => assistantInput({ prompt: " " }));
  assert.throws(() => assistantInput({ prompt: "a".repeat(4001) }));
  assert.throws(() => assistantInput({ prompt: "Rewrite", entryId: "/c/elsewhere" }));
  assert.deepEqual(assistantInput({ prompt: " Rewrite " }), { prompt: "Rewrite", entryId: null });
});

test("invalidation accepts an entry identity, never caller-selected paths", () => {
  assert.throws(() => invalidationInput({ path: "/" }));
  const entryId = "00000000-0000-4000-8000-000000000001";
  assert.deepEqual(invalidationInput({ entryId, path: "/" }), { entryId });
});

test("operation JSON rejects scalar bodies and caps request bytes", async () => {
  await assert.rejects(operationBody(new Request("https://example.com", { method: "POST", body: "null" })));
  await assert.rejects(operationBody(new Request("https://example.com", { method: "POST", body: JSON.stringify({ prompt: "a".repeat(20001) }) })));
  assert.deepEqual(await operationBody(new Request("https://example.com", { method: "POST", body: "{}" })), {});
});
