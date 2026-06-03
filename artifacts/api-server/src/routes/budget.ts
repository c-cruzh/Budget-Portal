import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuditUser, writeAuditEntries, diffBudgetItems } from "../lib/audit";
import { ensureVolunteersExtracted } from "./volunteers";

const router: IRouter = Router();

const ORG_PERMISSIONS: Record<string, { canEdit: boolean; canComment: boolean }> = {
  "C2 LABS": { canEdit: true, canComment: true },
  "OPINNO": { canEdit: false, canComment: true },
  "AURORA360": { canEdit: false, canComment: false },
};

interface BudgetRouteConfig {
  /** Route path, e.g. "/budget-items" */
  path: string;
  /** app_state key for the items array */
  itemsKey: string;
  /** app_state key for the last-editor metadata */
  metaKey: string;
  /** entityType used for audit-log entries */
  entityType: string;
  /** Run subEvent + volunteer backfills on GET (only for the legacy budget) */
  runBackfills: boolean;
}

function registerBudgetRoutes(cfg: BudgetRouteConfig) {
  const { path, itemsKey, metaKey, entityType, runBackfills } = cfg;

  router.get(path, async (_req, res) => {
    try {
      if (runBackfills) {
        try { await ensureVolunteersExtracted(); } catch (e) { console.error("volunteer extraction failed:", e); }
      }
      const [row, metaRow] = await withRetry(() => Promise.all([
        db.select().from(appState).where(eq(appState.key, itemsKey)).limit(1),
        db.select().from(appState).where(eq(appState.key, metaKey)).limit(1),
      ]));

      const meta = metaRow.length > 0 ? metaRow[0].value : null;

      if (row.length === 0) {
        res.json({ items: null, meta });
        return;
      }
      res.json({ items: row[0].value, meta });
    } catch (err) {
      console.error(`Failed to load budget items (${itemsKey}):`, err);
      res.status(500).json({ error: "Failed to load budget items" });
    }
  });

  router.put(path, async (req, res) => {
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

      const existing = await db.select().from(appState).where(eq(appState.key, itemsKey)).limit(1);
      const oldItems = existing.length > 0 ? (existing[0].value as any[]) : null;

      await Promise.all([
        db.insert(appState)
          .values({ key: itemsKey, value: items, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: appState.key,
            set: { value: items, updatedAt: new Date() },
          }),
        db.insert(appState)
          .values({ key: metaKey, value: meta as any, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: appState.key,
            set: { value: meta as any, updatedAt: new Date() },
          }),
      ]);

      const auditUser = getAuditUser(req);
      if (auditUser) {
        const entries = diffBudgetItems(auditUser, oldItems, items, entityType);
        if (entries.length) await writeAuditEntries(entries);
      }

      res.json({ ok: true, count: items.length, meta });
    } catch (err) {
      console.error(`Failed to save budget items (${itemsKey}):`, err);
      res.status(500).json({ error: "Failed to save budget items" });
    }
  });

  router.patch(path, async (req, res) => {
    try {
      const session = req.session as any;
      const userOrg = session?.userOrg || "";
      const userName = session?.userName || "Unknown";
      const userEmail = session?.userEmail || "";

      const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false, canComment: false };

      const { id, field, value, commentOnly } = req.body;
      if (!id || !field) {
        res.status(400).json({ error: "id and field are required" });
        return;
      }

      if (!perms.canEdit && !perms.canComment) {
        res.status(403).json({ error: "You do not have permission to make changes" });
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

      const valueJson = JSON.stringify(value);
      const fieldPath = `{${field}}`;

      const existing = await db.select().from(appState).where(eq(appState.key, itemsKey)).limit(1);
      const oldItems = existing.length > 0 ? (existing[0].value as any[]) : [];
      const oldItem = oldItems.find((it: any) => it?.id === id);

      const [updateResult] = await Promise.all([
        db.execute(sql`
          UPDATE app_state
          SET value = (
            SELECT jsonb_agg(
              CASE
                WHEN elem->>'id' = ${id}
                THEN jsonb_set(elem, ${fieldPath}::text[], ${valueJson}::jsonb, true)
                ELSE elem
              END
            )
            FROM jsonb_array_elements(value) AS elem
          ),
          updated_at = now()
          WHERE key = ${itemsKey}
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(value) AS elem
              WHERE elem->>'id' = ${id}
            )
          RETURNING 1
        `),
        db.insert(appState)
          .values({ key: metaKey, value: meta as any, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: appState.key,
            set: { value: meta as any, updatedAt: new Date() },
          }),
      ]);

      const rowsAffected = (updateResult as any)?.rowCount ?? (updateResult as any)?.rows?.length ?? 0;
      if (rowsAffected === 0) {
        res.status(404).json({ error: `Item ${id} not found` });
        return;
      }

      const auditUser = getAuditUser(req);
      if (auditUser && oldItem && JSON.stringify(oldItem[field]) !== JSON.stringify(value)) {
        await writeAuditEntries([{
          ...auditUser,
          entityType,
          entityId: id,
          entityLabel: oldItem.item || oldItem.descripcion || id,
          action: "UPDATE",
          field,
          oldValue: (oldItem[field] ?? null) as any,
          newValue: (value ?? null) as any,
          summary: `Editó ${field} en "${oldItem.item || id}"`,
        }]);
      }

      res.json({ ok: true, meta });
    } catch (err) {
      console.error(`Failed to patch budget item (${itemsKey}):`, err);
      res.status(500).json({ error: "Failed to patch budget item" });
    }
  });
}

// Legacy budget (deprecated, C2 LABS only in the UI). Runs backfills.
registerBudgetRoutes({
  path: "/budget-items",
  itemsKey: "budget-items",
  metaKey: "budget-meta",
  entityType: "budget-item",
  runBackfills: true,
});

// Final budget (new source of truth). Independent storage, starts empty, no backfills.
registerBudgetRoutes({
  path: "/budget-items-final",
  itemsKey: "budget-items-final",
  metaKey: "budget-meta-final",
  entityType: "budget-item-final",
  runBackfills: false,
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
