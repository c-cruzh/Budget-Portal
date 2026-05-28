import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const VALID_KEYS = new Set([
  "lanzamiento",
  "evento",
  "evento-dia-1",
  "evento-dia-2",
  "completa",
]);

const ORG_PERMISSIONS: Record<string, { canEdit: boolean }> = {
  "C2 LABS": { canEdit: true },
  "OPINNO": { canEdit: false },
  "AURORA360": { canEdit: false },
};

function storageKey(key: string) {
  return `agenda-${key}`;
}

router.get("/agenda/:key", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { key } = req.params;
    if (!VALID_KEYS.has(key)) {
      res.status(400).json({ error: "Invalid agenda key" });
      return;
    }
    const row = await withRetry(() =>
      db.select().from(appState).where(eq(appState.key, storageKey(key))).limit(1),
    );
    res.json({ rows: row.length > 0 ? row[0].value : [] });
  } catch (err) {
    console.error("Failed to load agenda:", err);
    res.status(500).json({ error: "Failed to load agenda" });
  }
});

router.put("/agenda/:key", async (req, res) => {
  try {
    const session = req.session as any;
    const userOrg = session?.userOrg || "";
    const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false };
    if (!perms.canEdit) {
      res.status(403).json({ error: "You do not have permission to edit agenda" });
      return;
    }
    const { key } = req.params;
    if (!VALID_KEYS.has(key)) {
      res.status(400).json({ error: "Invalid agenda key" });
      return;
    }
    const { rows } = req.body;
    if (!Array.isArray(rows)) {
      res.status(400).json({ error: "rows must be an array" });
      return;
    }
    await db.insert(appState)
      .values({ key: storageKey(key), value: rows, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appState.key,
        set: { value: rows, updatedAt: new Date() },
      });
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save agenda:", err);
    res.status(500).json({ error: "Failed to save agenda" });
  }
});

export default router;
