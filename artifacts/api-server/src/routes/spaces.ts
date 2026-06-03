import { Router, type IRouter } from "express";
import { db, appState, withRetry } from "@workspace/db";
import { eq } from "drizzle-orm";
import { buildSpacesSeedEntries, buildVenuesSeed, type SpaceEntry, type Venue } from "../data/spacesSeed";

const router: IRouter = Router();

export const SPACES_KEY = "spaces";
const SPACES_META_KEY = "spaces-meta";

export type DayKey = "dia-1" | "dia-2";

export interface SpacesCatalog {
  "dia-1": string[];
  "dia-2": string[];
  capacities?: Record<string, number>;
  entries?: {
    "dia-1": SpaceEntry[];
    "dia-2": SpaceEntry[];
  };
  /**
   * Additional Lugares/Sedes (Hotel, Aeropuerto, restaurantes, BINAES…) that
   * group their own Áreas/Zonas + Espacios. Independent of the ESEN Día 1 /
   * Día 2 axis and NOT wired to the Budget space picker / aforo alerts.
   */
  venues?: Venue[];
}

interface SpacesMeta {
  lastEditedBy: string;
  lastEditedByEmail: string;
  lastEditedByOrg: string;
  lastEditedAt: string;
}

const ORG_PERMISSIONS: Record<string, { canEdit: boolean }> = {
  "C2 LABS": { canEdit: true },
  "OPINNO": { canEdit: false },
  "AURORA360": { canEdit: false },
};

function deriveSpaceNames(entries: SpaceEntry[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of entries) {
    const name = String(e?.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function deriveCapacities(entries: SpaceEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) {
    const name = String(e?.name ?? "").trim();
    if (!name) continue;
    const a = Math.floor(Number(e?.aforo));
    if (Number.isFinite(a) && a > 0) out[name] = a;
  }
  return out;
}

function normalizeEntries(input: unknown, day: DayKey): SpaceEntry[] {
  if (!Array.isArray(input)) return [];
  const out: SpaceEntry[] = [];
  const usedIds = new Set<string>();
  input.forEach((raw, idx) => {
    if (!raw || typeof raw !== "object") return;
    const r = raw as Record<string, unknown>;
    const name = String(r.name ?? "").trim();
    if (!name) return;
    const zone = String(r.zone ?? "").trim();
    let id = String(r.id ?? "").trim();
    if (!id || usedIds.has(id)) id = `sp-${day}-${idx + 1}-${Math.random().toString(36).slice(2, 8)}`;
    usedIds.add(id);
    const entry: SpaceEntry = { id, zone, name };
    const a = Math.floor(Number(r.aforo));
    if (Number.isFinite(a) && a > 0) entry.aforo = a;
    const image = String(r.image ?? "").trim();
    if (image) entry.image = image;
    out.push(entry);
  });
  return out;
}

/**
 * Normalizes a venue's entries. Unlike ESEN entries, a venue entry may carry an
 * Área/Zona without a Espacio name yet (e.g. "Nativo Lounge Bar"), so an entry
 * is kept when it has either a zone or a name.
 */
function normalizeVenueEntries(input: unknown, venueId: string): SpaceEntry[] {
  if (!Array.isArray(input)) return [];
  const out: SpaceEntry[] = [];
  const usedIds = new Set<string>();
  input.forEach((raw, idx) => {
    if (!raw || typeof raw !== "object") return;
    const r = raw as Record<string, unknown>;
    const name = String(r.name ?? "").trim();
    const zone = String(r.zone ?? "").trim();
    if (!name && !zone) return;
    let id = String(r.id ?? "").trim();
    if (!id || usedIds.has(id)) id = `${venueId}-${idx + 1}-${Math.random().toString(36).slice(2, 8)}`;
    usedIds.add(id);
    const entry: SpaceEntry = { id, zone, name };
    const a = Math.floor(Number(r.aforo));
    if (Number.isFinite(a) && a > 0) entry.aforo = a;
    const image = String(r.image ?? "").trim();
    if (image) entry.image = image;
    out.push(entry);
  });
  return out;
}

function normalizeVenues(input: unknown): Venue[] {
  if (!Array.isArray(input)) return [];
  const out: Venue[] = [];
  const usedIds = new Set<string>();
  input.forEach((raw, idx) => {
    if (!raw || typeof raw !== "object") return;
    const r = raw as Record<string, unknown>;
    const name = String(r.name ?? "").trim();
    if (!name) return;
    let id = String(r.id ?? "").trim();
    if (!id || usedIds.has(id)) id = `venue-${idx + 1}-${Math.random().toString(36).slice(2, 8)}`;
    usedIds.add(id);
    const venue: Venue = { id, name, entries: normalizeVenueEntries(r.entries, id) };
    const subtitle = String(r.subtitle ?? "").trim();
    if (subtitle) venue.subtitle = subtitle;
    out.push(venue);
  });
  return out;
}

/**
 * Migrates a pre-structured (legacy) catalog — plain name arrays plus a
 * capacities map keyed by name — into structured zone-less entries. Used only
 * for catalogs saved before the Espacios tab existed.
 */
function migrateLegacyToEntries(value: any, day: DayKey): SpaceEntry[] {
  const names: string[] = Array.isArray(value?.[day]) ? value[day] : [];
  const caps: Record<string, unknown> =
    value?.capacities && typeof value.capacities === "object" && !Array.isArray(value.capacities)
      ? value.capacities
      : {};
  const seen = new Set<string>();
  const out: SpaceEntry[] = [];
  names.forEach((raw, idx) => {
    const name = String(raw ?? "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const entry: SpaceEntry = { id: `sp-${day}-mig-${idx + 1}`, zone: "", name };
    const capKey = Object.keys(caps).find(k => k.toLowerCase() === key);
    if (capKey != null) {
      const a = Math.floor(Number(caps[capKey]));
      if (Number.isFinite(a) && a > 0) entry.aforo = a;
    }
    out.push(entry);
  });
  return out;
}

function catalogFromEntries(
  entriesD1: SpaceEntry[],
  entriesD2: SpaceEntry[],
  venues: Venue[] = [],
): SpacesCatalog {
  return {
    "dia-1": deriveSpaceNames(entriesD1),
    "dia-2": deriveSpaceNames(entriesD2),
    capacities: { ...deriveCapacities(entriesD1), ...deriveCapacities(entriesD2) },
    entries: { "dia-1": entriesD1, "dia-2": entriesD2 },
    venues,
  };
}

/** Normalizes any stored or incoming value into a full structured catalog. */
function normalizeCatalog(value: any): SpacesCatalog {
  const venues = Array.isArray(value?.venues) ? normalizeVenues(value.venues) : [];
  const hasEntries =
    value?.entries && typeof value.entries === "object" && !Array.isArray(value.entries);
  if (hasEntries) {
    return catalogFromEntries(
      normalizeEntries(value.entries["dia-1"], "dia-1"),
      normalizeEntries(value.entries["dia-2"], "dia-2"),
      venues,
    );
  }
  // Legacy shape (name arrays + capacities) → migrate to entries.
  return catalogFromEntries(
    migrateLegacyToEntries(value, "dia-1"),
    migrateLegacyToEntries(value, "dia-2"),
    venues,
  );
}

function hasAnyEntries(catalog: SpacesCatalog): boolean {
  const e = catalog.entries;
  return !!e && ((e["dia-1"]?.length || 0) > 0 || (e["dia-2"]?.length || 0) > 0);
}

export async function ensureSpacesDefaults(): Promise<SpacesCatalog> {
  const row = await db.select().from(appState).where(eq(appState.key, SPACES_KEY)).limit(1);
  if (row.length > 0 && row[0].value && typeof row[0].value === "object" && !Array.isArray(row[0].value)) {
    const stored = row[0].value as any;
    // Only an explicit structured `entries` payload counts as curated content
    // from the Espacios tab — that always writes `entries`. A stored value that
    // lacks `entries` is pre-Espacios legacy data (old flat name arrays that
    // never carried Área/Zona), so we reseed it with the authoritative venue
    // layout instead of migrating those obsolete names forward.
    const hasStructuredEntries =
      stored.entries && typeof stored.entries === "object" && !Array.isArray(stored.entries);
    if (hasStructuredEntries) {
      const normalized = normalizeCatalog(stored);
      // Preserve a curated catalog only when it actually has entries; a
      // structured-but-empty catalog falls through to reseed.
      if (hasAnyEntries(normalized)) {
        // The Lugares/Sedes layer is curated once a `venues` key exists (even an
        // empty array, e.g. the user deleted them all). A catalog with ESEN
        // entries but no `venues` key predates this feature: wrap the existing
        // ESEN spaces and seed the new venues one time, then persist so future
        // reads are treated as curated.
        if (Array.isArray(stored.venues)) return normalized;
        const migrated: SpacesCatalog = { ...normalized, venues: buildVenuesSeed() };
        await db.insert(appState)
          .values({ key: SPACES_KEY, value: migrated as any, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: appState.key,
            set: { value: migrated as any, updatedAt: new Date() },
          });
        return migrated;
      }
    }
  }
  // Empty, never seeded, or legacy/pre-Espacios shape: seed the faithful
  // Día 1 / Día 2 ESEN layout plus the additional venues. This is self-healing
  // — once seeded (or once a user edits in the Espacios tab) the stored value
  // has `entries` + `venues` and is preserved.
  const seed = buildSpacesSeedEntries();
  const catalog = catalogFromEntries(seed["dia-1"], seed["dia-2"], buildVenuesSeed());
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
    const [spaces, metaRow] = await withRetry(() => Promise.all([
      ensureSpacesDefaults(),
      db.select().from(appState).where(eq(appState.key, SPACES_META_KEY)).limit(1),
    ]));
    const meta = metaRow.length > 0 ? metaRow[0].value : null;
    res.json({ spaces, meta });
  } catch (err) {
    console.error("Failed to load spaces:", err);
    res.status(500).json({ error: "Failed to load spaces" });
  }
});

router.put("/spaces", async (req, res) => {
  try {
    const session = req.session as any;
    const userOrg = session?.userOrg || "";
    const userName = session?.userName || "Unknown";
    const userEmail = session?.userEmail || "";
    const perms = ORG_PERMISSIONS[userOrg] || { canEdit: false };
    if (!perms.canEdit) {
      res.status(403).json({ error: "You do not have permission to edit spaces" });
      return;
    }
    const { spaces } = req.body;
    if (!spaces || typeof spaces !== "object" || Array.isArray(spaces)) {
      res.status(400).json({ error: "spaces must be an object" });
      return;
    }
    const normalized = normalizeCatalog(spaces);
    const meta: SpacesMeta = {
      lastEditedBy: userName,
      lastEditedByEmail: userEmail,
      lastEditedByOrg: userOrg,
      lastEditedAt: new Date().toISOString(),
    };
    await Promise.all([
      db.insert(appState)
        .values({ key: SPACES_KEY, value: normalized as any, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appState.key,
          set: { value: normalized as any, updatedAt: new Date() },
        }),
      db.insert(appState)
        .values({ key: SPACES_META_KEY, value: meta as any, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appState.key,
          set: { value: meta as any, updatedAt: new Date() },
        }),
    ]);
    res.json({ ok: true, spaces: normalized, meta });
  } catch (err) {
    console.error("Failed to save spaces:", err);
    res.status(500).json({ error: "Failed to save spaces" });
  }
});

export default router;
