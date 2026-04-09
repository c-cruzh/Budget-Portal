import { Router, type IRouter } from "express";
import { db, appState } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const BUDGET_KEY = "budget-items";

router.get("/budget-items", async (_req, res) => {
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

router.put("/budget-items", async (req, res) => {
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

export default router;
