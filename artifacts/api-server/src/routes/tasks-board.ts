import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const KEY = "tasks-board";
const META_KEY = "tasks-board-meta";

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

export default router;
