import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SPONSORS_KEY = "sponsors";
const SCENARIO_KEY = "sponsors-scenario";

const ORG_PERMISSIONS: Record<string, { canEdit: boolean }> = {
  "C2 LABS": { canEdit: true },
  "OPINNO": { canEdit: false },
  "AURORA360": { canEdit: false },
};

router.get("/sponsors", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userOrg) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const [row, scenarioRow] = await withRetry(() => Promise.all([
      db.select().from(appState).where(eq(appState.key, SPONSORS_KEY)).limit(1),
      db.select().from(appState).where(eq(appState.key, SCENARIO_KEY)).limit(1),
    ]));
    res.json({
      sponsors: row.length > 0 ? row[0].value : [],
      scenario: scenarioRow.length > 0 ? scenarioRow[0].value : null,
    });
  } catch (err) {
    console.error("Failed to load sponsors:", err);
    res.status(500).json({ error: "Failed to load sponsors" });
  }
});

router.put("/sponsors", async (req, res) => {
  try {
    const session = req.session as any;
    const userOrg = session?.userOrg || "";
    const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false };
    if (!perms.canEdit) {
      res.status(403).json({ error: "You do not have permission to edit sponsors" });
      return;
    }
    const { sponsors } = req.body;
    if (!Array.isArray(sponsors)) {
      res.status(400).json({ error: "sponsors must be an array" });
      return;
    }
    await db.insert(appState)
      .values({ key: SPONSORS_KEY, value: sponsors, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appState.key,
        set: { value: sponsors, updatedAt: new Date() },
      });
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save sponsors:", err);
    res.status(500).json({ error: "Failed to save sponsors" });
  }
});

router.put("/sponsors/scenario", async (req, res) => {
  try {
    const session = req.session as any;
    const userOrg = session?.userOrg || "";
    const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false };
    if (!perms.canEdit) {
      res.status(403).json({ error: "You do not have permission to edit scenario" });
      return;
    }
    const scenario = req.body;
    await db.insert(appState)
      .values({ key: SCENARIO_KEY, value: scenario, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appState.key,
        set: { value: scenario, updatedAt: new Date() },
      });
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save scenario:", err);
    res.status(500).json({ error: "Failed to save scenario" });
  }
});

export default router;
