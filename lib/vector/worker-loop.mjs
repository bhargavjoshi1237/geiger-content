import { setTimeout } from "node:timers/promises";

export async function runWorkerLoop({ run, signal, intervalMs = 60000, report = () => {}, onError = () => {} }) {
  while (!signal.aborted) {
    try {
      report(await run());
    } catch (error) {
      onError({ code: error.code || "worker_failed", error: "Background indexing could not complete. The next run will retry." });
    }
    if (signal.aborted) break;
    try {
      await setTimeout(intervalMs, undefined, { signal });
    } catch (error) {
      if (error.name !== "AbortError") throw error;
    }
  }
}
