import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router: IRouter = Router();

export const PROVEEDORES_KEY = "proveedores";
export const CENTROS_COSTO_KEY = "centros-costo";
const BUDGET_KEYS = ["budget-items", "budget-items-final"];

const ORG_PERMISSIONS: Record<string, { canEdit: boolean }> = {
  "C2 LABS": { canEdit: true },
  "OPINNO": { canEdit: false },
  "AURORA360": { canEdit: false },
};

/** Case-insensitive de-dupe, keeping first-seen casing, trimmed, non-empty, sorted. */
function dedupeNames(values: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = String(raw ?? "").trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

/** Collects the distinct proveedor / centroCosto values used across both budgets. */
async function collectUsedValues(): Promise<{ proveedores: string[]; centros: string[] }> {
  const rows = await db.select().from(appState).where(inArray(appState.key, BUDGET_KEYS));
  const proveedores: string[] = [];
  const centros: string[] = [];
  for (const row of rows) {
    const items = Array.isArray(row.value) ? (row.value as any[]) : [];
    for (const it of items) {
      if (!it || typeof it !== "object") continue;
      if (it.proveedor) proveedores.push(String(it.proveedor));
      if (it.centroCosto) centros.push(String(it.centroCosto));
    }
  }
  return { proveedores, centros };
}

/**
 * Returns the catalog stored under `key`, seeding it on first access from the
 * distinct values already present in the budgets so nothing disappears from the
 * dropdowns. `seedValues` are the live values for that catalog.
 */
async function ensureCatalog(key: string, seedValues: string[]): Promise<string[]> {
  const row = await db.select().from(appState).where(eq(appState.key, key)).limit(1);
  if (row.length > 0 && Array.isArray(row[0].value)) {
    return dedupeNames(row[0].value as unknown[]);
  }
  const seeded = dedupeNames(seedValues);
  await db.insert(appState)
    .values({ key, value: seeded as any, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appState.key, set: { value: seeded as any, updatedAt: new Date() } });
  return seeded;
}

router.get("/catalogs", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { proveedores: usedProv, centros: usedCentros } = await withRetry(() => collectUsedValues());
    const [proveedores, centrosCosto] = await withRetry(() => Promise.all([
      ensureCatalog(PROVEEDORES_KEY, usedProv),
      ensureCatalog(CENTROS_COSTO_KEY, usedCentros),
    ]));
    res.json({ proveedores, centrosCosto });
  } catch (err) {
    req.log?.error({ err }, "Failed to load catalogs");
    res.status(500).json({ error: "Failed to load catalogs" });
  }
});

async function saveCatalog(key: string, values: string[]): Promise<string[]> {
  const normalized = dedupeNames(values);
  await db.insert(appState)
    .values({ key, value: normalized as any, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appState.key, set: { value: normalized as any, updatedAt: new Date() } });
  return normalized;
}

router.put("/catalogs", async (req, res) => {
  try {
    const session = req.session as any;
    const userOrg = session?.userOrg || "";
    const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false };
    if (!perms.canEdit) {
      res.status(403).json({ error: "You do not have permission to edit catalogs" });
      return;
    }
    const { proveedores, centrosCosto } = req.body ?? {};
    if (proveedores !== undefined && !Array.isArray(proveedores)) {
      res.status(400).json({ error: "proveedores must be an array" });
      return;
    }
    if (centrosCosto !== undefined && !Array.isArray(centrosCosto)) {
      res.status(400).json({ error: "centrosCosto must be an array" });
      return;
    }

    const result: { proveedores?: string[]; centrosCosto?: string[] } = {};
    if (proveedores !== undefined) {
      result.proveedores = await withRetry(() => saveCatalog(PROVEEDORES_KEY, proveedores));
    }
    if (centrosCosto !== undefined) {
      result.centrosCosto = await withRetry(() => saveCatalog(CENTROS_COSTO_KEY, centrosCosto));
    }
    res.json({ ok: true, ...result });
  } catch (err) {
    req.log?.error({ err }, "Failed to save catalogs");
    res.status(500).json({ error: "Failed to save catalogs" });
  }
});

export default router;
