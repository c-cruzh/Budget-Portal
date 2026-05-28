import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const STATE_KEY = "networking-cocktail-d2";
const META_KEY = "networking-cocktail-d2-meta";

router.get("/networking-cocktail-d2", async (_req, res) => {
  try {
    const [row, metaRow] = await withRetry(() => Promise.all([
      db.select().from(appState).where(eq(appState.key, STATE_KEY)).limit(1),
      db.select().from(appState).where(eq(appState.key, META_KEY)).limit(1),
    ]));
    const meta = metaRow.length > 0 ? metaRow[0].value : null;
    res.json({ state: row.length === 0 ? null : row[0].value, meta });
  } catch (err) {
    console.error("Failed to load networking cocktail state:", err);
    res.status(500).json({ error: "Failed to load networking cocktail state" });
  }
});

router.put("/networking-cocktail-d2", async (req, res) => {
  try {
    const session = req.session as any;
    const userId = session?.userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const userOrg = session?.userOrg || "";
    const userName = session?.userName || "Unknown";
    const userEmail = session?.userEmail || "";

    const { state } = req.body;
    if (!state || typeof state !== "object") {
      res.status(400).json({ error: "state object is required" });
      return;
    }

    const meta = {
      lastEditedBy: userName,
      lastEditedByEmail: userEmail,
      lastEditedByOrg: userOrg,
      lastEditedAt: new Date().toISOString(),
    };

    await Promise.all([
      db.insert(appState)
        .values({ key: STATE_KEY, value: state, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: state, updatedAt: new Date() } }),
      db.insert(appState)
        .values({ key: META_KEY, value: meta as any, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: meta as any, updatedAt: new Date() } }),
    ]);

    res.json({ ok: true, meta });
  } catch (err) {
    console.error("Failed to save networking cocktail state:", err);
    res.status(500).json({ error: "Failed to save networking cocktail state" });
  }
});

export default router;
