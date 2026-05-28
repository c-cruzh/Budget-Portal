import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const KEY = "tasks-board";
const META_KEY = "tasks-board-meta";

const LinkedBudgetItemSchema = z.object({
  id: z.string().max(128),
  label: z.string().max(500),
  evento: z.string().max(200).optional(),
  area: z.string().max(300).optional(),
  centroCosto: z.string().max(200).optional(),
});

const TaskSchema = z.object({
  id: z.string().min(1).max(128),
  title: z.string().max(500),
  notes: z.string().max(5000),
  status: z.enum(["todo", "doing", "done"]),
  priority: z.enum(["low", "med", "high"]),
  assignee: z.string().max(200),
  dueDate: z.string().max(20),
  createdAt: z.string().max(64),
  updatedAt: z.string().max(64),
  linkedBudgetItem: LinkedBudgetItemSchema.optional(),
});
const StateSchema = z.object({ tasks: z.array(TaskSchema).max(2000) });

function requireAuth(req: any, res: any): { userName: string; userOrg: string; userEmail: string } | null {
  const session = req.session;
  const userId = session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return {
    userName: session?.userName || "Unknown",
    userOrg: session?.userOrg || "",
    userEmail: session?.userEmail || "",
  };
}

router.get("/tasks-board", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const [row, metaRow] = await withRetry(() => Promise.all([
      db.select().from(appState).where(eq(appState.key, KEY)).limit(1),
      db.select().from(appState).where(eq(appState.key, META_KEY)).limit(1),
    ]));
    const meta = metaRow.length > 0 ? metaRow[0].value : null;
    res.json({ state: row.length === 0 ? null : row[0].value, meta });
  } catch (err) {
    console.error("Failed to load tasks board:", err);
    res.status(500).json({ error: "Failed to load tasks board" });
  }
});

router.put("/tasks-board", async (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  try {
    const parsed = StateSchema.safeParse(req.body?.state);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid state payload", issues: parsed.error.issues });
      return;
    }
    const state = parsed.data;

    const meta = {
      lastEditedBy: auth.userName,
      lastEditedByEmail: auth.userEmail,
      lastEditedByOrg: auth.userOrg,
      lastEditedAt: new Date().toISOString(),
    };

    await Promise.all([
      db.insert(appState)
        .values({ key: KEY, value: state, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: state, updatedAt: new Date() } }),
      db.insert(appState)
        .values({ key: META_KEY, value: meta as any, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: meta as any, updatedAt: new Date() } }),
    ]);

    res.json({ ok: true, meta });
  } catch (err) {
    console.error("Failed to save tasks board:", err);
    res.status(500).json({ error: "Failed to save tasks board" });
  }
});

export default router;
