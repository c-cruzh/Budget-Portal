import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { FLAGGED_RRV_SEEDS, FLAGGED_RRV_SOURCE_TYPE, flaggedSourceKey } from "../data/flaggedItemsSeed";

const router: IRouter = Router();

const KEY = "tasks-board";
const META_KEY = "tasks-board-meta";
const BUDGET_KEY = "budget-items";

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter(t => t.length >= 3));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

interface BudgetItemLike {
  id: string;
  area?: string;
  centroCosto?: string;
  item?: string;
  descripcion?: string;
  evento?: string;
  notas?: string;
}

function findBestMatch(seed: { area: string; centroCosto: string; descripcion: string }, items: BudgetItemLike[]) {
  const seedArea = normalize(seed.area);
  const seedCentro = normalize(seed.centroCosto);
  const seedDescTokens = tokenSet(`${seed.descripcion} ${seed.centroCosto}`);

  let best: { item: BudgetItemLike; score: number } | null = null;
  for (const it of items) {
    const itArea = normalize(it.area || "");
    if (itArea !== seedArea) continue;
    const itCentro = normalize(it.centroCosto || "");
    const centroBonus = itCentro === seedCentro ? 0.2 : 0;
    const itDescTokens = tokenSet(`${it.item || ""} ${it.descripcion || ""}`);
    const score = jaccard(seedDescTokens, itDescTokens) + centroBonus;
    if (!best || score > best.score) best = { item: it, score };
  }
  if (best && best.score >= 0.35) return best;
  return null;
}

interface UrgentSeed {
  budgetId: string;
  area: string;
  categoria: string;
  item: string;
  action: string;
  matchNote?: string;
}

const URGENT_VALIDATION_SEEDS: UrgentSeed[] = [
  {
    budgetId: "43",
    area: "BACKSTAGE",
    categoria: "MANTELERIA",
    item: "MANTEL PARA MESA (6 ft) PARA BACKSTAGE",
    action: "dimensiones, cantidad, costo y disponibilidad del mantel hecho a medida",
  },
  {
    budgetId: "52",
    area: "AUDITORIO/MAIN STAGE",
    categoria: "PRODUCCIÓN Y MONTAJE",
    item: "MOBILIARIO ESCENOGRAFICO - SILLAS PARA PONENTES",
    action: "modelo, cantidad (7), costo unitario y disponibilidad (cotización está PENDING)",
  },
  {
    budgetId: "66",
    area: "AUDITORIO/MAIN STAGE",
    categoria: "MANTELERIA",
    item: "MANTEL PARA MESA PARA AV SET UP",
    action: "dimensiones, cantidad y costo del mantel hecho a medida",
  },
  {
    budgetId: "87",
    area: "LIVING SPACE (CAFETERIA)",
    categoria: "MOBILIARIO",
    item: "JUEGOS ALTOS MESA RENDONDA + 4 STOOLS NEGROS DELIBAQUETES SIN MANTEL",
    action: "cantidad (30 juegos), costo unitario, montaje y disponibilidad con Delibanquetes",
    matchNote: "Match por area + categoría + texto principal. El nombre en el Budget tiene typos (\"RENDONDA\", \"DELIBAQUETES\") vs el original del organizador (\"REDONDA\", \"DELIBANQUETES\").",
  },
  {
    budgetId: "89",
    area: "LIVING SPACE (CAFETERIA)",
    categoria: "MANTELERIA",
    item: "MANTEL PARA MESA METAL ESEN (DIMENSIONES TBD)",
    action: "DIMENSIONES (TBD), cantidad (15), costo del mantel hecho a medida y disponibilidad",
  },
];

function buildUrgentTask(seed: UrgentSeed, now: string) {
  const notes = [
    "**URGENT TO VALIDATE**",
    "",
    `Area: ${seed.area}`,
    `Categoría: ${seed.categoria}`,
    `Ítem: ${seed.item}`,
    `Budget row id: ${seed.budgetId}`,
    "",
    `Acción requerida: validar con el proveedor ${seed.action}.`,
    seed.matchNote ? `\nNota de matching: ${seed.matchNote}` : "",
  ].filter(Boolean).join("\n");
  return {
    id: `urgent-validate-${seed.budgetId}`,
    title: `URGENT TO VALIDATE: ${seed.item} (${seed.area})`,
    notes,
    status: "todo" as const,
    priority: "high" as const,
    assignee: "",
    dueDate: "",
    createdAt: now,
    updatedAt: now,
    linkedBudgetItem: {
      id: seed.budgetId,
      label: seed.item,
      evento: "MAIN EVENT",
      area: seed.area,
      centroCosto: seed.categoria,
    },
  };
}

export async function ensureUrgentValidationTasks(): Promise<void> {
  const row = await db.select().from(appState).where(eq(appState.key, KEY)).limit(1);
  const existing = row.length > 0 && row[0].value && Array.isArray((row[0].value as any).tasks)
    ? ((row[0].value as any).tasks as Array<{ id: string }>)
    : [];
  const existingIds = new Set(existing.map(t => t.id));
  const now = new Date().toISOString();
  const toAdd = URGENT_VALIDATION_SEEDS
    .filter(s => !existingIds.has(`urgent-validate-${s.budgetId}`))
    .map(s => buildUrgentTask(s, now));
  if (toAdd.length === 0) return;
  const nextTasks = [...existing, ...toAdd];
  const state = { tasks: nextTasks };
  const meta = {
    lastEditedBy: "Sistema (URGENT TO VALIDATE seed)",
    lastEditedByEmail: "system@cost-portal",
    lastEditedByOrg: "SYSTEM",
    lastEditedAt: now,
  };
  await Promise.all([
    db.insert(appState)
      .values({ key: KEY, value: state as any, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appState.key, set: { value: state as any, updatedAt: new Date() } }),
    db.insert(appState)
      .values({ key: META_KEY, value: meta as any, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appState.key, set: { value: meta as any, updatedAt: new Date() } }),
  ]);
}

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
  sourceKey: z.string().max(200).optional(),
  sourceType: z.string().max(64).optional(),
  unmatched: z.boolean().optional(),
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
    try { await ensureUrgentValidationTasks(); } catch (e) { console.error("urgent-validate seed failed:", e); }
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

router.post("/tasks-board/seed-flagged-items", async (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  try {
    const [stateRow, budgetRow] = await withRetry(() => Promise.all([
      db.select().from(appState).where(eq(appState.key, KEY)).limit(1),
      db.select().from(appState).where(eq(appState.key, BUDGET_KEY)).limit(1),
    ]));

    const existing = (stateRow.length > 0 ? (stateRow[0].value as any) : null) || { tasks: [] };
    const tasks: any[] = Array.isArray(existing.tasks) ? existing.tasks : [];
    const budgetItems: BudgetItemLike[] = Array.isArray(budgetRow[0]?.value) ? (budgetRow[0]!.value as any[]) : [];

    const existingKeys = new Set(tasks.filter(t => typeof t?.sourceKey === "string").map(t => t.sourceKey));
    const now = new Date().toISOString();

    let created = 0;
    let skipped = 0;
    let matched = 0;
    let unmatched = 0;
    const newTasks: any[] = [];
    const report: Array<{ index: number; area: string; descripcion: string; status: "created" | "skipped"; matched: boolean; budgetItemId?: string }> = [];

    FLAGGED_RRV_SEEDS.forEach((seed, idx) => {
      const sourceKey = flaggedSourceKey(idx);
      if (existingKeys.has(sourceKey)) {
        skipped++;
        report.push({ index: idx, area: seed.area, descripcion: seed.descripcion, status: "skipped", matched: false });
        return;
      }
      const match = findBestMatch(seed, budgetItems);
      const isMatched = !!match;
      if (isMatched) matched++; else unmatched++;

      const shortDesc = seed.descripcion.length > 80 ? seed.descripcion.slice(0, 80) + "…" : seed.descripcion;
      const title = `${seed.area} — ${shortDesc}`;
      const notes = [
        `Acción requerida (elegir UNA): Resize · Rescope · Validate`,
        ``,
        `Área: ${seed.area}`,
        `Categoría: ${seed.centroCosto}`,
        `Descripción: ${seed.descripcion}`,
        ``,
        isMatched
          ? `Ítem del Budget vinculado: #${match!.item.id} — ${match!.item.item || match!.item.descripcion || ""}`
          : `⚠ No se pudo vincular automáticamente a un ítem del Budget. Vincular manualmente.`,
      ].join("\n");

      const task: any = {
        id: (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function")
          ? globalThis.crypto.randomUUID()
          : `rrv-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        title: title.slice(0, 500),
        notes: notes.slice(0, 5000),
        status: "todo",
        priority: "high",
        assignee: "",
        dueDate: "",
        createdAt: now,
        updatedAt: now,
        sourceKey,
        sourceType: FLAGGED_RRV_SOURCE_TYPE,
      };
      if (isMatched && match) {
        const it = match.item;
        task.linkedBudgetItem = {
          id: String(it.id),
          label: (it.item || it.descripcion || "").slice(0, 500),
          evento: it.evento,
          area: it.area,
          centroCosto: it.centroCosto,
        };
      } else {
        task.unmatched = true;
      }
      newTasks.push(task);
      created++;
      report.push({
        index: idx,
        area: seed.area,
        descripcion: seed.descripcion,
        status: "created",
        matched: isMatched,
        budgetItemId: isMatched ? String(match!.item.id) : undefined,
      });
    });

    if (created > 0) {
      const nextState = { tasks: [...tasks, ...newTasks] };
      const meta = {
        lastEditedBy: auth.userName,
        lastEditedByEmail: auth.userEmail,
        lastEditedByOrg: auth.userOrg,
        lastEditedAt: now,
      };
      await Promise.all([
        db.insert(appState)
          .values({ key: KEY, value: nextState, updatedAt: new Date() })
          .onConflictDoUpdate({ target: appState.key, set: { value: nextState, updatedAt: new Date() } }),
        db.insert(appState)
          .values({ key: META_KEY, value: meta as any, updatedAt: new Date() })
          .onConflictDoUpdate({ target: appState.key, set: { value: meta as any, updatedAt: new Date() } }),
      ]);
    }

    res.json({
      ok: true,
      total: FLAGGED_RRV_SEEDS.length,
      created,
      skipped,
      matched,
      unmatched,
      report,
    });
  } catch (err) {
    console.error("Failed to seed flagged items:", err);
    res.status(500).json({ error: "Failed to seed flagged items" });
  }
});

const MULTIDAY_SEED: Array<{ area: string; centroCosto: string; descripcion: string }> = [
  { area: "LOBBY", centroCosto: "BOOTHS/STANDS", descripcion: "C2 LABS" },
  { area: "LOBBY", centroCosto: "BOOTHS/STANDS", descripcion: "OPINNO" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", descripcion: "Escenografía: tarima 12.20 x 3.66 x 0.30 con charol negro y gradas lateral derecho (POV hacia público)" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "ILUMINACIÓN", descripcion: "Escenografía: barras de luz para bañar fondo/pared principal auditorio" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", descripcion: "Tarima para 2 cámaras a los laterales (1.20 x 1.20 x 0.50 m)" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "ILUMINACIÓN", descripcion: "Iluminación main stage para ponentes y participantes" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "AUDIO", descripcion: "Monitor para prensa" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "COMUNICACIÓN", descripcion: "Auriculares" },
  { area: "LIVING SPACE (CAFETERIA)", centroCosto: "BOOTHS/STANDS", descripcion: "Booth Silver" },
  { area: "TRANSPORTE DE EQUIPO Y/O ELEMENTOS DE PRODUCCIÓN & MONTAJE", centroCosto: "TRANSPORTE MOBILIARIO Y EQUIPO", descripcion: "Cubos acrílicos" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN AUDIOVISUAL", descripcion: "Blackmagic Design Studio 6K Pro + lentes montura EF" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN AUDIOVISUAL", descripcion: "Cámaras Sony a7S III + lentes montura E" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN AUDIOVISUAL", descripcion: "Cámaras PTZ OBSBOT + controlador" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN AUDIOVISUAL", descripcion: "Switcher Blackmagic ATEM Television Studio 4K SDI" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN AUDIOVISUAL", descripcion: "Computadora de alto rendimiento para gráficos y streaming" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN AUDIOVISUAL", descripcion: "Consola de audio RODECaster Pro" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN AUDIOVISUAL", descripcion: "Costos operativos, montaje técnico, transporte, logística y accesorios" },
  { area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN AUDIOVISUAL", descripcion: "Pantallas de 43 pulgadas" },
];

export const MULTIDAY_SOURCE_KEY_PREFIX = "multiday-provider-validation:";

function multidayTokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter(t => t.length >= 3));
}

function scoreMultidayMatch(seed: { area: string; centroCosto: string; descripcion: string }, item: any): number {
  const seedArea = normalize(seed.area);
  const seedCentro = normalize(seed.centroCosto);
  const itArea = normalize(item.area || "");
  const itCentro = normalize(item.centroCosto || "");
  let s = 0;
  if (seedArea && itArea === seedArea) s += 100;
  else if (seedArea && (itArea.includes(seedArea) || seedArea.includes(itArea))) s += 40;
  else return 0;
  if (seedCentro && itCentro === seedCentro) s += 50;
  else if (seedCentro && (itCentro.includes(seedCentro) || seedCentro.includes(itCentro))) s += 20;

  const seedTokens = multidayTokens(seed.descripcion);
  const itemText = `${item.item || ""} ${item.descripcion || ""} ${item.notas || ""}`;
  const itTokens = multidayTokens(itemText);
  let overlap = 0;
  for (const t of seedTokens) if (itTokens.has(t)) overlap++;
  if (seedTokens.size > 0) {
    const ratio = overlap / seedTokens.size;
    s += Math.round(ratio * 100);
  }
  return s;
}

router.post("/tasks-board/seed-multiday-validation", async (req, res) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  if (auth.userOrg !== "C2 LABS") {
    res.status(403).json({ error: "Only C2 LABS can generate these tasks" });
    return;
  }
  try {
    const [tasksRow, budgetRow] = await Promise.all([
      db.select().from(appState).where(eq(appState.key, KEY)).limit(1),
      db.select().from(appState).where(eq(appState.key, BUDGET_KEY)).limit(1),
    ]);

    const currentState = (tasksRow.length > 0 ? tasksRow[0].value : null) as any;
    const currentTasks: any[] = Array.isArray(currentState?.tasks) ? currentState.tasks : [];
    const budgetItems: any[] = Array.isArray(budgetRow[0]?.value) ? (budgetRow[0].value as any[]) : [];

    const existingKeys = new Set<string>(
      currentTasks.map(t => t?.sourceKey).filter((k: any): k is string => typeof k === "string")
    );

    const now = new Date().toISOString();
    let created = 0;
    let alreadyExisted = 0;
    let unmatchedCount = 0;
    const newTasks: any[] = [];

    MULTIDAY_SEED.forEach((seed, idx) => {
      const sourceKey = `${MULTIDAY_SOURCE_KEY_PREFIX}${idx + 1}`;
      if (existingKeys.has(sourceKey)) { alreadyExisted++; return; }

      let bestScore = 0;
      let bestItem: any = null;
      for (const it of budgetItems) {
        const sc = scoreMultidayMatch(seed, it);
        if (sc > bestScore) { bestScore = sc; bestItem = it; }
      }
      const matched = bestScore >= 140 && bestItem;
      if (!matched) unmatchedCount++;

      const titleArea = seed.area;
      const titleCentro = seed.centroCosto;
      const titleConcept = matched ? (bestItem.item || seed.descripcion) : seed.descripcion;
      const title = `${titleArea} — ${titleCentro} — ${titleConcept}`.slice(0, 500);

      const notes = [
        "Este ítem está costeado por el proveedor a más de un día. Hay que consultar al proveedor y validar el costo multi-día (alcance, días y precio).",
        "",
        `Área: ${seed.area}`,
        `Categoría: ${seed.centroCosto}`,
        `Concepto: ${seed.descripcion}`,
        matched ? `Match con Budget item #${bestItem.id} (score ${bestScore}).` : "Unmatched — needs manual linking.",
      ].join("\n").slice(0, 5000);

      const task: any = {
        id: typeof crypto !== "undefined" && (crypto as any).randomUUID
          ? (crypto as any).randomUUID()
          : `t-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        notes,
        status: "todo",
        priority: "med",
        assignee: "",
        dueDate: "",
        createdAt: now,
        updatedAt: now,
        sourceKey,
        unmatched: !matched,
      };
      if (matched) {
        task.linkedBudgetItem = {
          id: String(bestItem.id),
          label: String(bestItem.item || seed.descripcion).slice(0, 500),
          evento: bestItem.evento ? String(bestItem.evento).slice(0, 200) : undefined,
          area: bestItem.area ? String(bestItem.area).slice(0, 300) : undefined,
          centroCosto: bestItem.centroCosto ? String(bestItem.centroCosto).slice(0, 200) : undefined,
        };
      }
      newTasks.push(task);
      created++;
    });

    const nextState = { tasks: [...currentTasks, ...newTasks] };
    const parsed = StateSchema.safeParse(nextState);
    if (!parsed.success) {
      res.status(500).json({ error: "Generated state failed validation", issues: parsed.error.issues });
      return;
    }

    const meta = {
      lastEditedBy: auth.userName,
      lastEditedByEmail: auth.userEmail,
      lastEditedByOrg: auth.userOrg,
      lastEditedAt: now,
    };

    await Promise.all([
      db.insert(appState)
        .values({ key: KEY, value: parsed.data, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: parsed.data, updatedAt: new Date() } }),
      db.insert(appState)
        .values({ key: META_KEY, value: meta as any, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: meta as any, updatedAt: new Date() } }),
    ]);

    res.json({
      ok: true,
      summary: {
        total: MULTIDAY_SEED.length,
        created,
        alreadyExisted,
        unmatched: unmatchedCount,
      },
      meta,
    });
  } catch (err) {
    console.error("Failed to seed multi-day validation tasks:", err);
    res.status(500).json({ error: "Failed to seed multi-day validation tasks" });
  }
});

export default router;
