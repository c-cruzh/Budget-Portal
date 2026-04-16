import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

pool.on("error", (err) => {
  console.error("[db pool] unexpected error", err);
});

export const db = drizzle(pool, { schema });

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; delayMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 4;
  const delayMs = opts.delayMs ?? 800;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient =
        /endpoint has been disabled|endpoint is disabled|Connection terminated|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up|terminating connection|Connection terminated unexpectedly/i.test(
          msg,
        );
      if (!transient || attempt === retries) throw err;
      const wait = delayMs * Math.pow(2, attempt);
      console.warn(
        `[db] transient error (attempt ${attempt + 1}/${retries + 1}): ${msg} — retrying in ${wait}ms`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export * from "./schema";
