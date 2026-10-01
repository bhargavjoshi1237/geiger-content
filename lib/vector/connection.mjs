import pg from "pg";
import { readFileSync } from "node:fs";

export function connectionOptions(env = process.env) {
  if (!env.VECTOR_DATABASE_URL)
    throw new Error("VECTOR_DATABASE_URL is not configured.");
  const url = new URL(env.VECTOR_DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("Invalid vector database configuration.");
  const mode = url.searchParams.get("sslmode") || "verify-full";
  url.searchParams.delete("sslmode");
  const ca = env.VECTOR_DATABASE_CA_PATH
    ? readFileSync(env.VECTOR_DATABASE_CA_PATH, "utf8")
    : env.VECTOR_DATABASE_CA?.replace(/\\n/g, "\n");
  return {
    connectionString: url.toString(),
    ssl: {
      rejectUnauthorized: Boolean(ca) || mode !== "require",
      ...(ca ? { ca } : {}),
    },
    max: 3,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 10000,
    statement_timeout: 15000,
  };
}

export function vectorPool() {
  if (!globalThis.geigerVectorPool) {
    globalThis.geigerVectorPool = new pg.Pool(connectionOptions());
    globalThis.geigerVectorPool.on("error", () => {});
  }
  return globalThis.geigerVectorPool;
}

export async function transaction(run) {
  const client = await vectorPool().connect();
  try {
    await client.query("begin");
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
