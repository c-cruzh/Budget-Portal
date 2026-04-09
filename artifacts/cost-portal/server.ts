import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: "10mb" }));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const BUDGET_KEY = "budget-items";

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/budget-items", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT value FROM app_state WHERE key = $1 LIMIT 1",
      [BUDGET_KEY]
    );
    if (result.rows.length === 0) {
      res.json({ items: null });
      return;
    }
    res.json({ items: result.rows[0].value });
  } catch (err) {
    console.error("Failed to load budget items:", err);
    res.status(500).json({ error: "Failed to load budget items" });
  }
});

app.put("/api/budget-items", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "items must be an array" });
      return;
    }
    await pool.query(
      `INSERT INTO app_state (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [BUDGET_KEY, JSON.stringify(items)]
    );
    res.json({ ok: true, count: items.length });
  } catch (err) {
    console.error("Failed to save budget items:", err);
    res.status(500).json({ error: "Failed to save budget items" });
  }
});

const staticDir = path.resolve(__dirname, "public");
app.use(express.static(staticDir));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

const port = Number(process.env.PORT) || 18761;
app.listen(port, "0.0.0.0", () => {
  console.log(`Production server listening on port ${port}`);
});
