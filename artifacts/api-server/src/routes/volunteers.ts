import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { VOLUNTEER_ROLE_SEEDS } from "../data/volunteerRolesSeed";
import type { VolunteerRole, VolunteerRoster } from "../data/volunteersTypes";

const router: IRouter = Router();

export const VOLUNTEERS_KEY = "volunteers-roster";
const VOLUNTEERS_META_KEY = "volunteers-roster-meta";
const BUDGET_KEY = "budget-items";

const ORG_PERMISSIONS: Record<string, { canEdit: boolean }> = {
  "C2 LABS": { canEdit: true },
  "OPINNO": { canEdit: false },
  "AURORA360": { canEdit: false },
};

const EXCLUDED_CENTROS = new Set(["ELECTRONICOS", "BADGES & LANDYARD"]);

/**
 * Identifies the unpaid, in-kind PERSONA staffing slots ("volunteer roles")
 * that belong in the Voluntarios roster rather than the budget. Money/goods
 * volunteer items (laptops under ELECTRONICOS, badges, food) are excluded and
 * remain in the budget. All matching rows are $0, so removing them never
 * changes any cost total.
 */
export function isVolunteerRole(it: any): boolean {
  if (!it || typeof it !== "object") return false;
  const centro = String(it.centroCosto || "").trim().toUpperCase();
  if (EXCLUDED_CENTROS.has(centro)) return false;
  const zero = (Number(it.precioUnitario) || 0) === 0 && (Number(it.total) || 0) === 0;
  if (!zero) return false;
  if (centro === "VOLUNTARIOS") return true;
  const uom = String(it.uom || "").trim().toUpperCase();
  const cot = String(it.cotizacion || "").trim().toUpperCase();
  if (cot === "VOLUNTARIO" && uom === "PERSONA") return true;
  return false;
}

function buildSeedRoster(): VolunteerRoster {
  const now = new Date().toISOString();
  const roles: VolunteerRole[] = VOLUNTEER_ROLE_SEEDS.map(s => ({
    ...s,
    assignments: [],
    createdAt: now,
    updatedAt: now,
  }));
  return { roles };
}

/**
 * Seeds the roster on first load (from the static seed of former budget
 * volunteer rows) and idempotently strips volunteer-role rows out of the
 * budget array so they live in exactly one place. Both steps are safe to run
 * repeatedly and are invoked by both the budget and volunteers GET handlers so
 * ordering between them never loses data.
 */
export async function ensureVolunteersExtracted(): Promise<VolunteerRoster> {
  const [rosterRow, budgetRow] = await Promise.all([
    db.select().from(appState).where(eq(appState.key, VOLUNTEERS_KEY)).limit(1),
    db.select().from(appState).where(eq(appState.key, BUDGET_KEY)).limit(1),
  ]);

  let roster: VolunteerRoster;
  const hasRoster =
    rosterRow.length > 0 &&
    rosterRow[0].value &&
    typeof rosterRow[0].value === "object" &&
    Array.isArray((rosterRow[0].value as any).roles);

  if (hasRoster) {
    roster = rosterRow[0].value as VolunteerRoster;
  } else {
    roster = buildSeedRoster();
    const now = new Date().toISOString();
    await db.insert(appState)
      .values({ key: VOLUNTEERS_KEY, value: roster as any, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appState.key, set: { value: roster as any, updatedAt: new Date() } });
    await db.insert(appState)
      .values({ key: VOLUNTEERS_META_KEY, value: { lastEditedBy: "Sistema (seed)", lastEditedByEmail: "system@cost-portal", lastEditedByOrg: "SYSTEM", lastEditedAt: now } as any, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appState.key, set: { value: { lastEditedBy: "Sistema (seed)", lastEditedByEmail: "system@cost-portal", lastEditedByOrg: "SYSTEM", lastEditedAt: now } as any, updatedAt: new Date() } });
  }

  // Strip volunteer roles out of the budget array if any remain.
  if (budgetRow.length > 0 && Array.isArray(budgetRow[0].value)) {
    const items = budgetRow[0].value as any[];
    const cleaned = items.filter(it => !isVolunteerRole(it));
    if (cleaned.length !== items.length) {
      await db.insert(appState)
        .values({ key: BUDGET_KEY, value: cleaned, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: cleaned, updatedAt: new Date() } });
    }
  }

  return roster;
}

const AssignmentSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().max(200),
  status: z.enum(["open", "confirmed"]),
});

const RoleSchema = z.object({
  id: z.string().min(1).max(128),
  space: z.string().max(300),
  dia: z.enum(["dia-1", "dia-2", "ambos"]),
  headcount: z.number().int().min(0).max(100000),
  role: z.string().max(500),
  horarios: z.string().max(2000),
  jobDescription: z.string().max(5000),
  dos: z.string().max(5000),
  donts: z.string().max(5000),
  guidelines: z.string().max(5000),
  cotizacion: z.string().max(64).optional(),
  sourceBudgetId: z.string().max(64).optional(),
  assignments: z.array(AssignmentSchema).max(1000).optional(),
  createdAt: z.string().max(64).optional(),
  updatedAt: z.string().max(64).optional(),
});

const RosterSchema = z.object({ roles: z.array(RoleSchema).max(2000) });

router.get("/volunteers", async (_req, res) => {
  try {
    const [roster, metaRow] = await withRetry(() => Promise.all([
      ensureVolunteersExtracted(),
      db.select().from(appState).where(eq(appState.key, VOLUNTEERS_META_KEY)).limit(1),
    ]));
    const meta = metaRow.length > 0 ? metaRow[0].value : null;
    res.json({ roster, meta });
  } catch (err) {
    console.error("Failed to load volunteers roster:", err);
    res.status(500).json({ error: "Failed to load volunteers roster" });
  }
});

router.put("/volunteers", async (req, res) => {
  try {
    const session = req.session as any;
    const userOrg = session?.userOrg || "";
    const userName = session?.userName || "Unknown";
    const userEmail = session?.userEmail || "";
    const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false };
    if (!perms.canEdit) {
      res.status(403).json({ error: "You do not have permission to edit volunteers" });
      return;
    }

    const parsed = RosterSchema.safeParse(req.body?.roster);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid roster payload", issues: parsed.error.issues });
      return;
    }
    const roster = parsed.data;
    const ids = new Set<string>();
    for (const r of roster.roles) {
      if (ids.has(r.id)) {
        res.status(400).json({ error: `Duplicate role id "${r.id}"` });
        return;
      }
      ids.add(r.id);
    }

    const meta = {
      lastEditedBy: userName,
      lastEditedByEmail: userEmail,
      lastEditedByOrg: userOrg,
      lastEditedAt: new Date().toISOString(),
    };

    await Promise.all([
      db.insert(appState)
        .values({ key: VOLUNTEERS_KEY, value: roster as any, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: roster as any, updatedAt: new Date() } }),
      db.insert(appState)
        .values({ key: VOLUNTEERS_META_KEY, value: meta as any, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: meta as any, updatedAt: new Date() } }),
    ]);

    res.json({ ok: true, roster, meta });
  } catch (err) {
    console.error("Failed to save volunteers roster:", err);
    res.status(500).json({ error: "Failed to save volunteers roster" });
  }
});

export default router;
