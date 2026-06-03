import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

export const SPACES_KEY = "spaces";
const BUDGET_KEY = "budget-items";

export type DayKey = "dia-1" | "dia-2";

export interface SpacesCatalog {
  "dia-1": string[];
  "dia-2": string[];
}

const FALLBACK_SPACES: string[] = [
  "Lobby",
  "Auditorio / Main Stage",
  "Backstage",
  "Terraza",
  "Área de Registro",
];

const ORG_PERMISSIONS: Record<string, { canEdit: boolean }> = {
  "C2 LABS": { canEdit: true },
  "OPINNO": { canEdit: false },
  "AURORA360": { canEdit: false },
};

function normalizeList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of input) {
    const name = String(v ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function normalizeCatalog(value: any): SpacesCatalog {
  return {
    "dia-1": normalizeList(value?.["dia-1"]),
    "dia-2": normalizeList(value?.["dia-2"]),
  };
}

async function deriveSeedFromAreas(): Promise<string[]> {
  const row = await db.select().from(appState).where(eq(appState.key, BUDGET_KEY)).limit(1);
  if (row.length === 0 || !Array.isArray(row[0].value)) return [...FALLBACK_SPACES];
  const items = row[0].value as any[];
  const list = normalizeList(items.map(it => (it && typeof it === "object" ? it.area : "")));
  if (list.length === 0) return [...FALLBACK_SPACES];
  return list.sort((a, b) => a.localeCompare(b));
}

export async function ensureSpacesDefaults(): Promise<SpacesCatalog> {
  const row = await db.select().from(appState).where(eq(appState.key, SPACES_KEY)).limit(1);
  if (row.length > 0 && row[0].value && typeof row[0].value === "object" && !Array.isArray(row[0].value)) {
    return normalizeCatalog(row[0].value);
  }
  const seed = await deriveSeedFromAreas();
  const catalog: SpacesCatalog = { "dia-1": [...seed], "dia-2": [...seed] };
  await db.insert(appState)
    .values({ key: SPACES_KEY, value: catalog as any, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appState.key,
      set: { value: catalog as any, updatedAt: new Date() },
    });
  return catalog;
}

router.get("/spaces", async (_req, res) => {
  try {
    const spaces = await withRetry(() => ensureSpacesDefaults());
    res.json({ spaces });
  } catch (err) {
    console.error("Failed to load spaces:", err);
    res.status(500).json({ error: "Failed to load spaces" });
  }
});

router.put("/spaces", async (req, res) => {
  try {
    const session = req.session as any;
    const userOrg = session?.userOrg || "";
    const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false };
    if (!perms.canEdit) {
      res.status(403).json({ error: "You do not have permission to edit spaces" });
      return;
    }
    const { spaces } = req.body;
    if (!spaces || typeof spaces !== "object" || Array.isArray(spaces)) {
      res.status(400).json({ error: "spaces must be an object with dia-1 and dia-2 arrays" });
      return;
    }
    const normalized = normalizeCatalog(spaces);
    await db.insert(appState)
      .values({ key: SPACES_KEY, value: normalized as any, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appState.key,
        set: { value: normalized as any, updatedAt: new Date() },
      });
    res.json({ ok: true, spaces: normalized });
  } catch (err) {
    console.error("Failed to save spaces:", err);
    res.status(500).json({ error: "Failed to save spaces" });
  }
});

export default router;
