import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { db, appState } from "@workspace/db";
import { eq } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const BUDGET_KEY = "budget-items";

app.get("/api/budget-items", async (_req, res) => {
  try {
    const row = await db
      .select()
      .from(appState)
      .where(eq(appState.key, BUDGET_KEY))
      .limit(1);
    if (row.length === 0) {
      res.json({ items: null });
      return;
    }
    res.json({ items: row[0].value });
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
    await db
      .insert(appState)
      .values({ key: BUDGET_KEY, value: items, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appState.key,
        set: { value: items, updatedAt: new Date() },
      });
    res.json({ ok: true, count: items.length });
  } catch (err) {
    console.error("Failed to save budget items:", err);
    res.status(500).json({ error: "Failed to save budget items" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const staticDir = path.resolve(__dirname, "dist/public");
app.use(express.static(staticDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

const port = Number(process.env.PORT) || 8081;
app.listen(port, "0.0.0.0", () => {
  console.log(`Production server listening on port ${port}`);
});
