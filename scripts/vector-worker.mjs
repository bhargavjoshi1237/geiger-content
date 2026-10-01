import nextEnv from "@next/env";
import { runWorker } from "../lib/vector/ingestion.mjs";
import { vectorPool } from "../lib/vector/connection.mjs";
import { runWorkerLoop } from "../lib/vector/worker-loop.mjs";
nextEnv.loadEnvConfig(process.cwd());
const controller = new AbortController();
const stop = () => controller.abort();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
try {
  if (process.argv.includes("--watch")) {
    const intervalMs = Math.min(300000, Math.max(15000, Number(process.env.VECTOR_WORKER_INTERVAL_MS) || 60000));
    console.log(JSON.stringify({ status: "watching", intervalMs }));
    await runWorkerLoop({
      run: () => runWorker(),
      signal: controller.signal,
      intervalMs,
      report: result => console.log(JSON.stringify(result)),
      onError: result => console.error(JSON.stringify(result)),
    });
  } else console.log(JSON.stringify(await runWorker()));
} catch (error) {
  console.error(
    JSON.stringify({
      code: error.code || "worker_failed",
      error:
        "Vector worker could not complete. Check source configuration and database migrations.",
    }),
  );
  process.exitCode = 1;
} finally {
  process.off("SIGINT", stop);
  process.off("SIGTERM", stop);
  if (globalThis.geigerVectorPool) await vectorPool().end();
}
