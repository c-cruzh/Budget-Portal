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

interface BudgetMetaValue {
  lastEditedBy: string;
  lastEditedByEmail: string;
  lastEditedByOrg: string;
  lastEditedAt: string;
  /** Monotonic revision counter, bumped on every write. Used for conflict
   * detection and live (polling) refresh between concurrent editors. */
  rev: number;
}

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

function getSessionUser(req: any) {
  const session = req.session as any;
  return {
    userOrg: session?.userOrg || "",
    userName: session?.userName || "Unknown",
    userEmail: session?.userEmail || "",
  };
}

function buildMeta(req: any, rev: number): BudgetMetaValue {
  const { userOrg, userName, userEmail } = getSessionUser(req);
  return {
    lastEditedBy: userName,
    lastEditedByEmail: userEmail,
    lastEditedByOrg: userOrg,
    lastEditedAt: new Date().toISOString(),
    rev,
  };
}

function metaRev(meta: any): number {
  return meta && typeof meta.rev === "number" ? meta.rev : 0;
}

/**
 * Apply a batch of structural changes (deletes / sets / adds) to the current
 * items array. Pure: returns a new array. Order is delete → set → add so that
 * a split (delete original + add replacements) and replace-by-id compose
 * predictably. Sets and adds are keyed by `id`; sets to a missing id are
 * ignored (the row was deleted by someone else), and adds with an existing id
 * are skipped (idempotent).
 */
function applyOps(
  current: any[],
  ops: { deletes?: unknown[]; sets?: any[]; adds?: any[] },
): any[] {
  let next = Array.isArray(current) ? current.slice() : [];

  if (Array.isArray(ops.deletes) && ops.deletes.length) {
    const del = new Set(ops.deletes.map((d) => String(d)));
    next = next.filter((it) => !del.has(String(it?.id)));
  }

  if (Array.isArray(ops.sets) && ops.sets.length) {
    const setMap = new Map<string, any>();
    for (const it of ops.sets) if (it && it.id != null) setMap.set(String(it.id), it);
    next = next.map((it) => {
      const repl = setMap.get(String(it?.id));
      return repl !== undefined ? repl : it;
    });
  }

  if (Array.isArray(ops.adds) && ops.adds.length) {
    const existing = new Set(next.map((it) => String(it?.id)));
    for (const it of ops.adds) {
      if (it && it.id != null && !existing.has(String(it.id))) {
        next.push(it);
        existing.add(String(it.id));
      }
    }
  }

  return next;
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

  // Lightweight endpoint for live-refresh polling: returns just the current
  // revision + last-editor metadata, with no backfills or item payload.
  router.get(`${path}/rev`, async (_req, res) => {
    try {
      const metaRow = await withRetry(() =>
        db.select().from(appState).where(eq(appState.key, metaKey)).limit(1)
      );
      const meta = metaRow.length > 0 ? metaRow[0].value : null;
      res.json({ rev: metaRev(meta), meta });
    } catch (err) {
      console.error(`Failed to load budget rev (${metaKey}):`, err);
      res.status(500).json({ error: "Failed to load budget rev" });
    }
  });

  // Full-list replace. Guarded by optimistic locking: if the client sends a
  // baseRev that no longer matches the server's revision, reject with 409 and
  // return the latest items so the client can reload instead of overwriting.
  // Reserved for whole-document rewrites (one-shot migration, seeding).
  router.put(path, async (req, res) => {
    try {
      const { userOrg } = getSessionUser(req);
      const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false, canComment: false };

      if (!perms.canEdit && !perms.canComment) {
        res.status(403).json({ error: "You do not have permission to make changes" });
        return;
      }

      const { items, commentOnly, baseRev } = req.body;
      if (!Array.isArray(items)) {
        res.status(400).json({ error: "items must be an array" });
        return;
      }

      if (!perms.canEdit && !commentOnly) {
        res.status(403).json({ error: "You only have comment permissions. Value edits are not allowed." });
        return;
      }

      const result = await withRetry(() => db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${itemsKey}))`);

        const [itemsRow, metaRow] = await Promise.all([
          tx.select().from(appState).where(eq(appState.key, itemsKey)).limit(1),
          tx.select().from(appState).where(eq(appState.key, metaKey)).limit(1),
        ]);

        const oldItems = itemsRow.length > 0 ? (itemsRow[0].value as any[]) : null;
        const curRev = metaRev(metaRow.length > 0 ? metaRow[0].value : null);

        // Optimistic-lock check (only when the client supplies a base revision).
        if (typeof baseRev === "number" && baseRev !== curRev) {
          return { conflict: true as const, items: oldItems, meta: metaRow.length > 0 ? metaRow[0].value : null, curRev };
        }

        const newMeta = buildMeta(req, curRev + 1);
        await Promise.all([
          tx.insert(appState)
            .values({ key: itemsKey, value: items, updatedAt: new Date() })
            .onConflictDoUpdate({ target: appState.key, set: { value: items, updatedAt: new Date() } }),
          tx.insert(appState)
            .values({ key: metaKey, value: newMeta as any, updatedAt: new Date() })
            .onConflictDoUpdate({ target: appState.key, set: { value: newMeta as any, updatedAt: new Date() } }),
        ]);

        return { conflict: false as const, oldItems, meta: newMeta };
      }));

      if (result.conflict) {
        res.status(409).json({ error: "conflict", items: result.items, meta: result.meta });
        return;
      }

      const auditUser = getAuditUser(req);
      if (auditUser) {
        const entries = diffBudgetItems(auditUser, result.oldItems, items, entityType);
        if (entries.length) await writeAuditEntries(entries);
      }

      res.json({ ok: true, count: items.length, meta: result.meta });
    } catch (err) {
      console.error(`Failed to save budget items (${itemsKey}):`, err);
      res.status(500).json({ error: "Failed to save budget items" });
    }
  });

  // Atomic granular batch: apply deletes / sets / adds against the server's
  // current array under a row lock (read-modify-write). Two editors touching
  // different items compose their changes without clobbering each other. Each
  // batch bumps the revision. Edit-level permission required.
  router.post(`${path}/batch`, async (req, res) => {
    try {
      const { userOrg } = getSessionUser(req);
      const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false, canComment: false };

      if (!perms.canEdit) {
        res.status(403).json({ error: "You do not have permission to make changes" });
        return;
      }

      const { adds, deletes, sets } = req.body || {};
      const hasOps =
        (Array.isArray(adds) && adds.length) ||
        (Array.isArray(deletes) && deletes.length) ||
        (Array.isArray(sets) && sets.length);
      if (!hasOps) {
        res.status(400).json({ error: "batch requires at least one of adds/deletes/sets" });
        return;
      }

      const result = await withRetry(() => db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${itemsKey}))`);

        const [itemsRow, metaRow] = await Promise.all([
          tx.select().from(appState).where(eq(appState.key, itemsKey)).limit(1),
          tx.select().from(appState).where(eq(appState.key, metaKey)).limit(1),
        ]);

        const oldItems = itemsRow.length > 0 ? (itemsRow[0].value as any[]) : [];
        const curRev = metaRev(metaRow.length > 0 ? metaRow[0].value : null);

        const next = applyOps(oldItems, { adds, deletes, sets });
        const newMeta = buildMeta(req, curRev + 1);

        await Promise.all([
          tx.insert(appState)
            .values({ key: itemsKey, value: next, updatedAt: new Date() })
            .onConflictDoUpdate({ target: appState.key, set: { value: next, updatedAt: new Date() } }),
          tx.insert(appState)
            .values({ key: metaKey, value: newMeta as any, updatedAt: new Date() })
            .onConflictDoUpdate({ target: appState.key, set: { value: newMeta as any, updatedAt: new Date() } }),
        ]);

        return { oldItems, next, meta: newMeta };
      }));

      const auditUser = getAuditUser(req);
      if (auditUser) {
        const entries = diffBudgetItems(auditUser, result.oldItems, result.next, entityType);
        if (entries.length) await writeAuditEntries(entries);
      }

      res.json({ ok: true, count: result.next.length, items: result.next, meta: result.meta });
    } catch (err) {
      console.error(`Failed to apply budget batch (${itemsKey}):`, err);
      res.status(500).json({ error: "Failed to apply budget batch" });
    }
  });

  router.patch(path, async (req, res) => {
    try {
      const { userOrg, userName } = getSessionUser(req);
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

      const valueJson = JSON.stringify(value);
      const fieldPath = `{${field}}`;

      const result = await withRetry(() => db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${itemsKey}))`);

        const [itemsRow, metaRow] = await Promise.all([
          tx.select().from(appState).where(eq(appState.key, itemsKey)).limit(1),
          tx.select().from(appState).where(eq(appState.key, metaKey)).limit(1),
        ]);

        const oldItems = itemsRow.length > 0 ? (itemsRow[0].value as any[]) : [];
        const oldItem = oldItems.find((it: any) => it?.id === id);
        if (!oldItem) {
          return { notFound: true as const };
        }

        const updateResult = await tx.execute(sql`
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
        `);

        const rowsAffected = (updateResult as any)?.rowCount ?? (updateResult as any)?.rows?.length ?? 0;
        if (rowsAffected === 0) {
          return { notFound: true as const };
        }

        const curRev = metaRev(metaRow.length > 0 ? metaRow[0].value : null);
        const newMeta = buildMeta(req, curRev + 1);
        await tx.insert(appState)
          .values({ key: metaKey, value: newMeta as any, updatedAt: new Date() })
          .onConflictDoUpdate({ target: appState.key, set: { value: newMeta as any, updatedAt: new Date() } });

        return { notFound: false as const, oldItem, meta: newMeta };
      }));

      if (result.notFound) {
        res.status(404).json({ error: `Item ${id} not found` });
        return;
      }

      const auditUser = getAuditUser(req);
      const oldItem = result.oldItem;
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

      res.json({ ok: true, meta: result.meta });
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
