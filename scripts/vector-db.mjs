import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const pkg = JSON.parse(
  readFileSync(resolve("node_modules/@geiger/orm/package.json"), "utf8"),
);
const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin["geiger-orm"];
const result = spawnSync(
  process.execPath,
  [resolve("node_modules/@geiger/orm", bin), ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: { ...process.env, GEIGER_VECTOR_DB: "1" },
  },
);
process.exit(result.status ?? 1);
