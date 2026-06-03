import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const MONTAJE_KEY = "montaje-entries";
const MONTAJE_META_KEY = "montaje-meta";

const ORG_PERMISSIONS: Record<string, { canEdit: boolean }> = {
  "C2 LABS": { canEdit: true },
  "OPINNO": { canEdit: false },
  "AURORA360": { canEdit: false },
};

type Dia = "dia-1" | "dia-2" | "ambos";
type Fase = "montaje" | "desmontaje";

function normDia(v: unknown): Dia {
  return v === "dia-1" || v === "dia-2" || v === "ambos" ? v : "dia-1";
}

function normFase(v: unknown): Fase {
  return v === "desmontaje" ? "desmontaje" : "montaje";
}

function normStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function normPersonas(input: unknown): any[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(p => p && typeof p === "object")
    .map((p: any, i: number) => ({
      id: typeof p.id === "string" && p.id ? p.id : `per-${i}`,
      nombre: normStr(p.nombre),
      rol: normStr(p.rol),
      identificacion: normStr(p.identificacion),
    }));
}

function normItemIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of input) {
    const id = String(v ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function normalizeEntries(input: unknown): any[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(e => e && typeof e === "object")
    .map((e: any, i: number) => ({
      id: typeof e.id === "string" && e.id ? e.id : `mtj-${i}`,
      empresa: normStr(e.empresa),
      dia: normDia(e.dia),
      fase: normFase(e.fase),
      horaIngreso: normStr(e.horaIngreso),
      horaSalida: normStr(e.horaSalida),
      lineamientos: normStr(e.lineamientos),
      personas: normPersonas(e.personas),
      itemIds: normItemIds(e.itemIds),
    }));
}

router.get("/montaje-entries", async (_req, res) => {
  try {
    const [row, metaRow] = await withRetry(() => Promise.all([
      db.select().from(appState).where(eq(appState.key, MONTAJE_KEY)).limit(1),
      db.select().from(appState).where(eq(appState.key, MONTAJE_META_KEY)).limit(1),
    ]));
    const meta = metaRow.length > 0 ? metaRow[0].value : null;
    const entries = row.length === 0 ? [] : normalizeEntries((row[0].value as any)?.entries);
    res.json({ state: { entries }, meta });
  } catch (err) {
    console.error("Failed to load montaje entries:", err);
    res.status(500).json({ error: "Failed to load montaje entries" });
  }
});

router.put("/montaje-entries", async (req, res) => {
  try {
    const session = req.session as any;
    const userOrg = session?.userOrg || "";
    const userName = session?.userName || "Unknown";
    const userEmail = session?.userEmail || "";

    const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false };
    if (!perms.canEdit) {
      res.status(403).json({ error: "You do not have permission to edit montaje" });
      return;
    }

    const { state } = req.body;
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      res.status(400).json({ error: "state must be an object with an entries array" });
      return;
    }

    const normalized = { entries: normalizeEntries(state.entries) };

    const meta = {
      lastEditedBy: userName,
      lastEditedByEmail: userEmail,
      lastEditedByOrg: userOrg,
      lastEditedAt: new Date().toISOString(),
    };

    await Promise.all([
      db.insert(appState)
        .values({ key: MONTAJE_KEY, value: normalized as any, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: normalized as any, updatedAt: new Date() } }),
      db.insert(appState)
        .values({ key: MONTAJE_META_KEY, value: meta as any, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: meta as any, updatedAt: new Date() } }),
    ]);

    res.json({ ok: true, state: normalized, meta });
  } catch (err) {
    console.error("Failed to save montaje entries:", err);
    res.status(500).json({ error: "Failed to save montaje entries" });
  }
});

export default router;
