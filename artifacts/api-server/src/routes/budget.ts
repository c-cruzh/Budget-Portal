import { Router, type IRouter } from "express";
import { db, appState } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const BUDGET_KEY = "budget-items";
const BUDGET_META_KEY = "budget-meta";

const ORG_PERMISSIONS: Record<string, { canEdit: boolean; canComment: boolean }> = {
  "C2 LABS": { canEdit: true, canComment: true },
  "OPINNO": { canEdit: false, canComment: true },
  "AURORA360": { canEdit: false, canComment: false },
};

router.get("/budget-items", async (_req, res) => {
  try {
    const [row, metaRow] = await Promise.all([
      db.select().from(appState).where(eq(appState.key, BUDGET_KEY)).limit(1),
      db.select().from(appState).where(eq(appState.key, BUDGET_META_KEY)).limit(1),
    ]);

    const meta = metaRow.length > 0 ? metaRow[0].value : null;

    if (row.length === 0) {
      res.json({ items: null, meta });
      return;
    }
    res.json({ items: row[0].value, meta });
  } catch (err) {
    console.error("Failed to load budget items:", err);
    res.status(500).json({ error: "Failed to load budget items" });
  }
});

router.put("/budget-items", async (req, res) => {
  try {
    const session = req.session as any;
    const userOrg = session?.userOrg || "";
    const userName = session?.userName || "Unknown";
    const userEmail = session?.userEmail || "";

    const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false, canComment: false };

    if (!perms.canEdit && !perms.canComment) {
      res.status(403).json({ error: "You do not have permission to make changes" });
      return;
    }

    const { items, commentOnly } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "items must be an array" });
      return;
    }

    if (!perms.canEdit && !commentOnly) {
      res.status(403).json({ error: "You only have comment permissions. Value edits are not allowed." });
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
        .values({ key: BUDGET_KEY, value: items, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appState.key,
          set: { value: items, updatedAt: new Date() },
        }),
      db.insert(appState)
        .values({ key: BUDGET_META_KEY, value: meta as any, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appState.key,
          set: { value: meta as any, updatedAt: new Date() },
        }),
    ]);

    res.json({ ok: true, count: items.length, meta });
  } catch (err) {
    console.error("Failed to save budget items:", err);
    res.status(500).json({ error: "Failed to save budget items" });
  }
});

router.get("/users", async (_req, res) => {
  try {
    const allUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, organization: users.organization })
      .from(users)
      .where(eq(users.active, true));
    res.json({ users: allUsers });
  } catch (err) {
    console.error("Failed to load users:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

export default router;
