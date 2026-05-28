import { Router, type IRouter } from "express";
import { db, auditLog } from "@workspace/db";
import { desc, eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/audit-log", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userOrg) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const limit = Math.min(parseInt(String(req.query.limit ?? "200"), 10) || 200, 1000);
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : null;

    const conds = [];
    if (entityType) conds.push(eq(auditLog.entityType, entityType));

    const rows = await db
      .select({
        id: auditLog.id,
        createdAt: auditLog.createdAt,
        userName: auditLog.userName,
        userOrg: auditLog.userOrg,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        entityLabel: auditLog.entityLabel,
        action: auditLog.action,
        field: auditLog.field,
        oldValue: auditLog.oldValue,
        newValue: auditLog.newValue,
        summary: auditLog.summary,
      })
      .from(auditLog)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);

    res.json({ entries: rows, returned: rows.length });
  } catch (err) {
    console.error("Failed to load audit log:", err);
    res.status(500).json({ error: "Failed to load audit log" });
  }
});

export default router;
