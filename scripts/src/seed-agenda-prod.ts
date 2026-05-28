import pg from "pg";

const { Client } = pg;

const KEYS = ["agenda-evento-dia-1", "agenda-evento-dia-2"] as const;

async function main() {
  const devUrl = process.env.DEV_DATABASE_URL ?? process.env.DATABASE_URL;
  const prodUrl = process.env.PROD_DATABASE_URL;

  if (!devUrl) {
    throw new Error("DEV_DATABASE_URL (or DATABASE_URL) must be set");
  }
  if (!prodUrl) {
    throw new Error("PROD_DATABASE_URL must be set");
  }
  if (devUrl === prodUrl) {
    throw new Error(
      "DEV_DATABASE_URL and PROD_DATABASE_URL are identical; refusing to run",
    );
  }

  const devClient = new Client({ connectionString: devUrl });
  const prodClient = new Client({ connectionString: prodUrl });

  await devClient.connect();
  await prodClient.connect();

  const summary: { key: string; rows: number | null }[] = [];

  try {
    for (const key of KEYS) {
      const res = await devClient.query<{ value: unknown }>(
        "SELECT value FROM app_state WHERE key = $1",
        [key],
      );
      if (res.rowCount === 0) {
        console.warn(`[seed-prod] dev DB has no row for key "${key}"; skipping`);
        summary.push({ key, rows: null });
        continue;
      }
      const value = res.rows[0].value;
      const count = Array.isArray(value) ? value.length : -1;

      await prodClient.query(
        `INSERT INTO app_state(key, value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, JSON.stringify(value)],
      );
      console.log(`[seed-prod] Seeded ${key} with ${count} rows`);
      summary.push({ key, rows: count });
    }
  } finally {
    await devClient.end();
    await prodClient.end();
  }

  console.log("\n[seed-prod] Summary:");
  for (const s of summary) {
    console.log(`  ${s.key}: ${s.rows === null ? "missing in dev" : `${s.rows} rows`}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
