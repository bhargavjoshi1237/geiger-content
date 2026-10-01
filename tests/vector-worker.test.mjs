import test from "node:test";
import assert from "node:assert/strict";
import { runWorkerLoop } from "../lib/vector/worker-loop.mjs";

test("a continuous worker recovers from a failed run and stops on shutdown", async () => {
  const controller = new AbortController(), reports = [], failures = [];
  let calls = 0;
  await runWorkerLoop({
    intervalMs: 1,
    signal: controller.signal,
    run: async () => {
      calls++;
      if (calls === 1) throw Object.assign(new Error("private connection detail"), { code: "ECONNRESET" });
      controller.abort();
      return { completed: 1 };
    },
    report: result => reports.push(result),
    onError: result => failures.push(result),
  });
  assert.equal(calls, 2);
  assert.deepEqual(reports, [{ completed: 1 }]);
  assert.equal(failures[0].code, "ECONNRESET");
  assert.ok(!JSON.stringify(failures).includes("private connection detail"));
});

test("shutdown interrupts the interval without starting another run", async () => {
  const controller = new AbortController();
  let calls = 0;
  const loop = runWorkerLoop({
    intervalMs: 60000,
    signal: controller.signal,
    run: async () => { calls++; return {}; },
    report: () => setTimeout(() => controller.abort(), 5),
  });
  await loop;
  assert.equal(calls, 1);
});
