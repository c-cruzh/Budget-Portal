import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const FLIGHTS_KEY = "flights-state";
const FLIGHTS_META_KEY = "flights-meta";

const ORG_PERMISSIONS: Record<string, { canRead: boolean; canEdit: boolean }> = {
  "C2 LABS": { canRead: true, canEdit: true },
  "OPINNO": { canRead: true, canEdit: false },
  "AURORA360": { canRead: true, canEdit: false },
};

const SEAT_PREFS = new Set(["Ventana", "Pasillo", "Sin preferencia"]);
const BAGGAGE_OPTIONS = new Set(["Carry-on", "23kg", "32kg", "2 x 23kg"]);
const FLIGHT_STATUSES = new Set(["Pendiente", "En revisión", "Aprobado", "Reservado"]);

function clampStr(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

function sanitizePassenger(raw: any): any | null {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" && raw.id.length > 0 && raw.id.length <= 64
    ? raw.id
    : `pax-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const seatPreference = SEAT_PREFS.has(raw.seatPreference) ? raw.seatPreference : "Sin preferencia";
  const baggage = BAGGAGE_OPTIONS.has(raw.baggage) ? raw.baggage : "23kg";
  return {
    id,
    name: clampStr(raw.name, 200),
    email: clampStr(raw.email, 200),
    passport: clampStr(raw.passport, 64),
    seatPreference,
    baggage,
    notes: clampStr(raw.notes ?? "", 500),
  };
}

function sanitizeState(state: any): any {
  if (!state || typeof state !== "object") return state;
  const next = { ...state };
  if (Array.isArray(state.routes)) {
    next.routes = state.routes.map((r: any) => {
      if (!r || typeof r !== "object") return r;
      const route: any = { ...r };
      if (Array.isArray(r.passengers)) {
        const seenIds = new Set<string>();
        route.passengers = r.passengers
          .slice(0, 200)
          .map(sanitizePassenger)
          .filter((p: any) => {
            if (!p) return false;
            if (seenIds.has(p.id)) return false;
            seenIds.add(p.id);
            return true;
          });
      } else {
        route.passengers = [];
      }
      if (r.status !== undefined && !FLIGHT_STATUSES.has(r.status)) {
        delete route.status;
      }
      if (typeof r.notes === "string") {
        route.notes = clampStr(r.notes, 2000);
      }
      return route;
    });
  }
  return next;
}

router.get("/flights-state", async (req, res) => {
  try {
    const session = req.session as any;
    const userId = session?.userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const userOrg = session?.userOrg || "";
    const perms = ORG_PERMISSIONS[userOrg];
    if (!perms?.canRead) {
      res.status(403).json({ error: "You do not have permission to view flights" });
      return;
    }

    const [row, metaRow] = await withRetry(() => Promise.all([
      db.select().from(appState).where(eq(appState.key, FLIGHTS_KEY)).limit(1),
      db.select().from(appState).where(eq(appState.key, FLIGHTS_META_KEY)).limit(1),
    ]));
    const meta = metaRow.length > 0 ? metaRow[0].value : null;
    res.json({ state: row.length === 0 ? null : row[0].value, meta });
  } catch (err) {
    console.error("Failed to load flights state:", err);
    res.status(500).json({ error: "Failed to load flights state" });
  }
});

router.put("/flights-state", async (req, res) => {
  try {
    const session = req.session as any;
    const userId = session?.userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const userOrg = session?.userOrg || "";
    const userName = session?.userName || "Unknown";
    const userEmail = session?.userEmail || "";
    const perms = ORG_PERMISSIONS[userOrg];
    if (!perms?.canEdit) {
      res.status(403).json({ error: "Only C2 LABS can edit flights" });
      return;
    }

    const { state } = req.body;
    if (!state || typeof state !== "object") {
      res.status(400).json({ error: "state object is required" });
      return;
    }

    const sanitized = sanitizeState(state);

    const meta = {
      lastEditedBy: userName,
      lastEditedByEmail: userEmail,
      lastEditedByOrg: userOrg,
      lastEditedAt: new Date().toISOString(),
    };

    await Promise.all([
      db.insert(appState)
        .values({ key: FLIGHTS_KEY, value: sanitized, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: sanitized, updatedAt: new Date() } }),
      db.insert(appState)
        .values({ key: FLIGHTS_META_KEY, value: meta as any, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appState.key, set: { value: meta as any, updatedAt: new Date() } }),
    ]);

    res.json({ ok: true, meta });
  } catch (err) {
    console.error("Failed to save flights state:", err);
    res.status(500).json({ error: "Failed to save flights state" });
  }
});

export default router;
