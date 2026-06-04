import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuditUser, writeAuditEntries, diffSubEvents } from "../lib/audit";

const router: IRouter = Router();

export const SUB_EVENTS_KEY = "sub-events";
const BUDGET_KEY = "budget-items";

export interface SubEventRecord {
  id: string;
  name: string;
  order: number;
  color?: string;
}

// The 7 event phases. The "Día" field in the budget is unified with these
// sub-events (single source of truth). Keep ids in sync with the frontend
// EVENT_PHASES in artifacts/cost-portal/src/data/budgetData.ts.
const DEFAULT_SUB_EVENTS: SubEventRecord[] = [
  { id: "lanzamiento", name: "Lanzamiento", order: 0, color: "#a78bfa" },
  { id: "dia-1", name: "Main Event Día 1", order: 1, color: "#60a5fa" },
  { id: "dia-2", name: "Main Event Día 2", order: 2, color: "#34d399" },
  { id: "cena-vip", name: "Cena VIP", order: 3, color: "#fbbf24" },
  { id: "cena-ania", name: "Cena VIP Ania", order: 4, color: "#f472b6" },
  { id: "arrivals", name: "Day of Arrivals (16–17 Nov)", order: 5, color: "#22d3ee" },
  { id: "departures", name: "Day of Departures (20 Nov)", order: 6, color: "#fb923c" },
];

const ORG_PERMISSIONS: Record<string, { canEdit: boolean }> = {
  "C2 LABS": { canEdit: true },
  "OPINNO": { canEdit: false },
  "AURORA360": { canEdit: false },
};

export async function ensureSubEventDefaults(): Promise<SubEventRecord[]> {
  const row = await db.select().from(appState).where(eq(appState.key, SUB_EVENTS_KEY)).limit(1);
  if (row.length > 0 && Array.isArray(row[0].value) && (row[0].value as any[]).length > 0) {
    const existing = row[0].value as SubEventRecord[];
    // Additive merge: existing DBs (e.g. the original 5-phase setup) gain any
    // newly-introduced default phases (arrivals, departures) without touching
    // user-renamed entries. Never rename, reorder, or remove existing data.
    const existingIds = new Set(existing.map(s => s.id));
    const missing = DEFAULT_SUB_EVENTS.filter(d => !existingIds.has(d.id));
    if (missing.length === 0) return existing;

    const maxOrder = existing.reduce((m, s) => Math.max(m, typeof s.order === "number" ? s.order : 0), -1);
    const appended = missing.map((d, i) => ({ ...d, order: maxOrder + 1 + i }));
    const merged = [...existing, ...appended];

    await db.insert(appState)
      .values({ key: SUB_EVENTS_KEY, value: merged as any, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appState.key,
        set: { value: merged as any, updatedAt: new Date() },
      });
    try {
      await writeAuditEntries(appended.map(s => ({
        userName: "Sistema",
        userEmail: "system@cost-portal",
        userOrg: "SYSTEM",
        entityType: "sub-event",
        entityId: s.id,
        entityLabel: s.name,
        action: "CREATE",
        summary: `Fase de evento agregada "${s.name}"`,
      })));
    } catch (err) {
      console.error("Failed to log sub-event backfill:", err);
    }
    return merged;
  }
  await db.insert(appState)
    .values({ key: SUB_EVENTS_KEY, value: DEFAULT_SUB_EVENTS as any, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appState.key,
      set: { value: DEFAULT_SUB_EVENTS as any, updatedAt: new Date() },
    });
  try {
    await writeAuditEntries(DEFAULT_SUB_EVENTS.map(s => ({
      userName: "Sistema",
      userEmail: "system@cost-portal",
      userOrg: "SYSTEM",
      entityType: "sub-event",
      entityId: s.id,
      entityLabel: s.name,
      action: "CREATE",
      summary: `Sub-evento sembrado "${s.name}"`,
    })));
  } catch (err) {
    console.error("Failed to log sub-event seeding:", err);
  }
  return DEFAULT_SUB_EVENTS;
}

router.get("/sub-events", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const list = await withRetry(() => ensureSubEventDefaults());
    res.json({ subEvents: list });
  } catch (err) {
    console.error("Failed to load sub-events:", err);
    res.status(500).json({ error: "Failed to load sub-events" });
  }
});

router.put("/sub-events", async (req, res) => {
  try {
    const session = req.session as any;
    const userOrg = session?.userOrg || "";
    const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false };
    if (!perms.canEdit) {
      res.status(403).json({ error: "You do not have permission to edit sub-events" });
      return;
    }
    const { subEvents } = req.body;
    if (!Array.isArray(subEvents)) {
      res.status(400).json({ error: "subEvents must be an array" });
      return;
    }
    const ids = new Set<string>();
    for (const s of subEvents) {
      if (!s || typeof s !== "object") {
        res.status(400).json({ error: "Each sub-event must be an object" });
        return;
      }
      if (typeof s.id !== "string" || !s.id.trim()) {
        res.status(400).json({ error: "Each sub-event needs a non-empty id" });
        return;
      }
      if (typeof s.name !== "string" || !s.name.trim()) {
        res.status(400).json({ error: `Sub-evento "${s.id}" needs a non-empty name` });
        return;
      }
      if (ids.has(s.id)) {
        res.status(400).json({ error: `Duplicate sub-event id "${s.id}"` });
        return;
      }
      ids.add(s.id);
    }

    const existing = await db.select().from(appState).where(eq(appState.key, SUB_EVENTS_KEY)).limit(1);
    const oldList = existing.length > 0 ? (existing[0].value as SubEventRecord[]) : [];

    // Reject deletion of an id still referenced
    const removed = oldList.filter(o => !ids.has(o.id));
    if (removed.length > 0) {
      const budgetRow = await db.select().from(appState).where(eq(appState.key, BUDGET_KEY)).limit(1);
      const items = budgetRow.length > 0 && Array.isArray(budgetRow[0].value)
        ? (budgetRow[0].value as any[])
        : [];
      const counts: Record<string, number> = {};
      for (const it of items) {
        if (it && typeof it === "object" && it.subEventId) {
          counts[it.subEventId] = (counts[it.subEventId] || 0) + 1;
        }
      }
      const blocked = removed.find(r => (counts[r.id] || 0) > 0);
      if (blocked) {
        res.status(409).json({
          error: `${counts[blocked.id]} items aún apuntan a "${blocked.name}", reasigna primero`,
          subEventId: blocked.id,
          count: counts[blocked.id],
        });
        return;
      }
    }

    const normalized: SubEventRecord[] = subEvents.map((s: any, i: number) => ({
      id: String(s.id).trim(),
      name: String(s.name).trim(),
      order: typeof s.order === "number" ? s.order : i,
      color: typeof s.color === "string" && s.color.trim() ? s.color.trim() : undefined,
    }));

    await db.insert(appState)
      .values({ key: SUB_EVENTS_KEY, value: normalized as any, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appState.key,
        set: { value: normalized as any, updatedAt: new Date() },
      });

    const auditUser = getAuditUser(req);
    if (auditUser) {
      const entries = diffSubEvents(auditUser, oldList, normalized);
      if (entries.length) await writeAuditEntries(entries);
    }

    res.json({ ok: true, subEvents: normalized });
  } catch (err) {
    console.error("Failed to save sub-events:", err);
    res.status(500).json({ error: "Failed to save sub-events" });
  }
});

export default router;
