export interface QuoteOption {
  id: string;
  label: string;
  precioUnitario: number;
  link?: string;
  notes?: string;
}

export interface SubEvent {
  id: string;
  name: string;
  order: number;
  color?: string;
}

/**
 * The 7 event phases. The phase (stored on a budget item as `subEventId`) is the
 * SINGLE source of truth for where an item falls in the event timeline. It drives
 * the colored tag, the grouping, the "Día" selector and the "por días" cost.
 * `days` = how many natural days the phase spans (only Arrivals spans 2).
 */
export interface EventPhase {
  id: string;
  name: string;
  color: string;
  days: number;
}

export const EVENT_PHASES: EventPhase[] = [
  { id: "lanzamiento", name: "Lanzamiento", color: "#a78bfa", days: 1 },
  { id: "dia-1", name: "Main Event Día 1", color: "#60a5fa", days: 1 },
  { id: "dia-2", name: "Main Event Día 2", color: "#34d399", days: 1 },
  { id: "cena-vip", name: "Cena VIP", color: "#fbbf24", days: 1 },
  { id: "cena-ania", name: "Cena VIP Ania", color: "#f472b6", days: 1 },
  { id: "arrivals", name: "Day of Arrivals (16–17 Nov)", color: "#22d3ee", days: 2 },
  { id: "departures", name: "Day of Departures (20 Nov)", color: "#fb923c", days: 1 },
];

const EVENT_PHASE_MAP: Record<string, EventPhase> = Object.fromEntries(
  EVENT_PHASES.map(p => [p.id, p]),
);

export const DEFAULT_SUB_EVENTS: SubEvent[] = EVENT_PHASES.map((p, i) => ({
  id: p.id,
  name: p.name,
  order: i,
  color: p.color,
}));

export const DEFAULT_SUB_EVENT_ID = "dia-2";

export type DiaValue = "dia-1" | "dia-2" | "ambos";

export const DIA_VALUES: DiaValue[] = ["dia-1", "dia-2", "ambos"];

export const DIA_LABELS: Record<DiaValue, string> = {
  "dia-1": "Día 1",
  "dia-2": "Día 2",
  "ambos": "Ambos",
};

export const DIA_COLORS: Record<DiaValue, string> = {
  "dia-1": "#60a5fa",
  "dia-2": "#34d399",
  "ambos": "#a78bfa",
};

export const STATUS_SHORT_LABELS: Record<string, string> = {
  "Cotización Recibida - Sin Observaciones": "Recibida OK",
  "Cotización Recibida - Observaciones": "Recibida c/ Obs.",
  "Cotización - No Aplica (In-Kind)": "N/A In-Kind",
  "Cotización - No Aplica (Voluntario)": "N/A Voluntario",
  "Cotización Pending": "Pending",
  "Pendiente Cotizar": "Pend. Cotizar",
  "Pendiente Cotizar Alternativa": "Pend. Alternativa",
};

export const STATUS_COLORS: Record<string, string> = {
  "Cotización Recibida - Sin Observaciones": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Cotización Recibida - Observaciones": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "Cotización - No Aplica (In-Kind)": "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "Cotización - No Aplica (Voluntario)": "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "Cotización Pending": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Pendiente Cotizar": "bg-red-500/10 text-red-500 border-red-500/20",
  "Pendiente Cotizar Alternativa": "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

export function isDiaValue(v: unknown): v is DiaValue {
  return v === "dia-1" || v === "dia-2" || v === "ambos";
}

/**
 * Explicit per-item IVA (13%) treatment. Replaces the old single `exentoIva`
 * boolean so the price entry mode is unambiguous:
 *  - `raw`      → precio is PRE-IVA; portal adds 13% on top.
 *  - `incluido` → precio ALREADY includes IVA; portal does NOT re-add it and
 *                 derives the pre-IVA base (precio / 1.13) for reporting.
 *  - `exento`   → not subject to IVA; 0.
 */
export type IvaMode = "raw" | "incluido" | "exento";

export const IVA_MODE_VALUES: IvaMode[] = ["raw", "incluido", "exento"];

export const IVA_MODE_LABELS: Record<IvaMode, string> = {
  raw: "Pre-IVA (sumar 13%)",
  incluido: "IVA incluido en precio",
  exento: "Exento / No aplica",
};

export const IVA_MODE_SHORT: Record<IvaMode, string> = {
  raw: "+IVA",
  incluido: "INCL",
  exento: "EXENTO",
};

export function isIvaMode(v: unknown): v is IvaMode {
  return v === "raw" || v === "incluido" || v === "exento";
}

/**
 * How a transport/delivery (montaje) budget line is treated for display:
 *  - "association": traceability only — the cost stays whole on the transport
 *    line; covered items just show who delivers/installs them.
 *  - "allocation": the transport cost is split (equally) across the covered
 *    items for display only. The grand total never changes and nothing is
 *    added to any stored item total — the split is purely informational.
 */
export type TransportMode = "association" | "allocation";

export const TRANSPORT_MODE_VALUES: TransportMode[] = ["association", "allocation"];

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  association: "Solo asociación (costo queda en el transporte)",
  allocation: "Repartir costo entre ítems (solo visual)",
};

export const TRANSPORT_MODE_SHORT: Record<TransportMode, string> = {
  association: "Asociación",
  allocation: "Reparto",
};

export function isTransportMode(v: unknown): v is TransportMode {
  return v === "association" || v === "allocation";
}

interface DiaSource {
  dia?: DiaValue;
  item?: string;
  descripcion?: string;
  notas?: string;
  porDias?: string;
  qtyDias?: number | string;
  subEventId?: string;
}

/**
 * The display day a budget item applies to: "dia-1" | "dia-2" | "ambos".
 *
 * This is a DISPLAY-ONLY label and does NOT drive cost — per-day cost is billed
 * strictly from the explicit `qtyDias` count in recalcItem. We therefore no
 * longer infer the day from free-text hints or silently promote per-día items
 * to "ambos" (which used to double cost). Resolution order:
 *  1. an explicit `dia` set by the user / split dialogs,
 *  2. the day-named event phase (subEventId === "dia-1" | "dia-2"),
 *  3. otherwise "ambos" (unassigned / non-day phase) — purely a visual tag.
 */
export function deriveDia(item: DiaSource): DiaValue {
  if (isDiaValue(item.dia)) return item.dia;
  if (item.subEventId === "dia-1") return "dia-1";
  if (item.subEventId === "dia-2") return "dia-2";
  return "ambos";
}

export function dayCountForDia(dia: DiaValue): number {
  return dia === "ambos" ? 2 : 1;
}

/**
 * How many natural days a phase spans for "por días" cost. Single-day phases
 * count 1; Day of Arrivals (16–17 Nov) counts 2. Custom/unknown sub-events
 * default to 1.
 */
export function phaseDayCount(subEventId: string | undefined): number {
  if (!subEventId) return 1;
  return EVENT_PHASE_MAP[subEventId]?.days ?? 1;
}

/**
 * Maps a phase to the space-catalog day used by the espacio picker. Main Event
 * Día 2 uses the Día 2 ESEN layout; every other phase uses the Día 1 layout as
 * a single space list (venues are still filtered by the item's phase).
 */
export function phaseSpaceDay(subEventId: string | undefined): SpaceDayKey {
  return subEventId === "dia-2" ? "dia-2" : "dia-1";
}

/**
 * Single source of truth for an item's event phase. Any assigned `subEventId`
 * (including custom user-created sub-events) wins. Items predating the phase
 * field fall back to the legacy day derivation so migration keeps them visible
 * without overwriting stored data; legacy "ambos" lands on the default phase.
 */
export function derivePhase(item: DiaSource): string {
  if (item.subEventId && item.subEventId.trim()) return item.subEventId;
  const d = deriveDia(item);
  if (d === "dia-1") return "dia-1";
  if (d === "dia-2") return "dia-2";
  return DEFAULT_SUB_EVENT_ID;
}

export interface BudgetItem {
  id: string;
  subEventId?: string;
  dia?: DiaValue;
  evento: string;
  area: string;
  centroCosto: string;
  item: string;
  descripcion: string;
  notas: string;
  inKind: boolean;
  agencyFee: boolean;
  qty: number | string;
  uom: string;
  porDias: string;
  qtyDias: number | string;
  precioUnitario: number;
  subtotal: number;
  aplicaFee: string;
  fee: number;
  subtotalConFee: number;
  iva: number;
  total: number;
  cotizacion: string;
  cotizacionLink: string;
  documento: string;
  proveedor: string;
  validarCosto: boolean;
  contratarAparte: boolean;
  /** @deprecated kept as a derived mirror of `ivaMode === "exento"` for CSV/legacy reads. */
  exentoIva?: boolean;
  /** Explicit IVA treatment. Source of truth for the 13% logic in recalcItem. */
  ivaMode?: IvaMode;
  aplicaTurismo?: boolean;
  turismo?: number;
  feeIncluido?: number;
  assignedTo?: string;
  soloPresupuestado?: boolean;
  accionRequerida?: boolean;
  reviewedBy?: string;
  statusCotizacion?: string;
  mitigable?: boolean;
  mitigNote?: string;
  niceToHave?: boolean;
  /** Marks this line as cost $0 because its economic cost is already contemplated in another item. */
  costoEnOtroItem?: boolean;
  /**
   * Stable reference to exactly ONE catalog room (SpaceEntry.id), across ESEN
   * Día 1 / Día 2 and every Lugar/Sede venue. Source of truth for the assigned
   * space; replaces the day-split name fields below.
   */
  espacioId?: string;
  /** @deprecated legacy name-based space (Día 1). Read-only migration source / orphan fallback. */
  espacioDia1?: string;
  /** @deprecated legacy name-based space (Día 2). Read-only migration source / orphan fallback. */
  espacioDia2?: string;
  quotes?: QuoteOption[];
  approvedQuoteId?: string;
  /** Marks this line as a transport/delivery/montaje cost that services other items. */
  isTransport?: boolean;
  /** How this transport's cost is treated for display. Defaults to "association". */
  transportMode?: TransportMode;
  /** IDs of the budget items this transport delivers/installs (one transport → many items). */
  coveredItemIds?: string[];
  /**
   * For transport lines: the cost centers this transport serves. A transport can
   * deliver items across several centros de costo, so it may carry more than the
   * single primary `centroCosto`. Display/organizational only — does not affect totals.
   */
  centrosCosto?: string[];
  /**
   * Marks this line as one where transport/delivery simply does not apply
   * (services, staffing, digital/in-kind items that don't get moved). When true,
   * the "Sin transporte" data-quality alert is suppressed for this item.
   */
  transporteNoAplica?: boolean;
}

export type SpaceDayKey = "dia-1" | "dia-2";

/**
 * A single venue space as defined in the Espacios tab. This is the structured
 * source of truth for the space catalog: it carries the Área/Zona grouping and
 * an optional aforo (capacity). Spaces are kept per day because the venue
 * layout differs between Día 1 and Día 2. `id` lets the same name appear under
 * different zones (e.g. "Isla Temporal @ Lobby" under two pick-up zones).
 */
export interface SpaceEntry {
  id: string;
  /** Área/Zona heading this space is grouped under. */
  zone: string;
  /** Espacio name. */
  name: string;
  /** Optional aforo / maximum capacity. */
  aforo?: number;
  /** Reserved for a future "Imagen" column. No UI yet. */
  image?: string;
}

/**
 * A Lugar/Sede (physical venue): Hotel, Aeropuerto, restaurantes de cenas VIP,
 * BINAES, etc. Groups its own Áreas/Zonas + Espacios and is independent of the
 * ESEN Día 1 / Día 2 axis. A venue entry may carry an Área/Zona without an
 * assigned Espacio (empty `name`). Venues feed the Budget space picker (filtered
 * by their `subEventIds` association) and the aforo/capacity alerts, alongside
 * the ESEN day entries.
 */
export interface Venue {
  id: string;
  name: string;
  /** Optional descriptor, e.g. 'Cena VIP "Ania" (Día 1)' or "Lanzamiento". */
  subtitle?: string;
  entries: SpaceEntry[];
  /**
   * Sub-events this Lugar belongs to. When non-empty, the venue's Espacios are
   * only offered in the Budget space picker for items in one of these
   * sub-events. When empty/undefined the venue is treated as global (offered
   * for every item), so legacy venues without an association stay visible.
   */
  subEventIds?: string[];
}

/** A single pickable room option: stable id + display name. */
export interface SpaceOption {
  id: string;
  name: string;
}

/** A grouped option for the Budget space picker: Lugar › Zona/Área › rooms. */
export interface SpaceOptionGroup {
  /** Lugar/Sede label, e.g. "ESEN", "Hotel". */
  lugar: string;
  /** Área/Zona heading. */
  zone: string;
  /** Rooms under this zone (deduped by name, first-appearance order). */
  options: SpaceOption[];
}

/** A fully-resolved room reference: stable id + display + place/day context. */
export interface ResolvedSpace {
  id: string;
  name: string;
  zone: string;
  aforo?: number;
  /** Human label of the owning place, e.g. "ESEN — Día 1" or "Hotel". */
  placeLabel: string;
  /** ESEN day for ESEN rooms; undefined for day-independent venue rooms. */
  dayKey?: SpaceDayKey;
}

export interface SpacesCatalog {
  /** Derived unique space names for the Budget Día 1 picker (legacy shape). */
  "dia-1": string[];
  /** Derived unique space names for the Budget Día 2 picker (legacy shape). */
  "dia-2": string[];
  /**
   * Optional aforo/capacity per space, keyed by space name. Derived from the
   * structured `entries`. Capacity is a property of the physical space, so it
   * is shared across both days.
   */
  capacities?: Record<string, number>;
  /**
   * Aforo/capacity keyed by stable room id (SpaceEntry.id), across ESEN days
   * and venues. This is the source of truth for over-capacity checks — unlike
   * the name-keyed `capacities` map it never collides between rooms that share
   * a name (e.g. the same aula on Día 1 and Día 2, or two venue rooms).
   */
  capacitiesById?: Record<string, number>;
  /**
   * Structured source of truth for the ESEN venue (Área/Zona + aforo, per day).
   * The legacy `dia-1`/`dia-2` name arrays and `capacities` map above are
   * derived from this so the existing Budget space picker keeps working
   * unchanged.
   */
  entries?: {
    "dia-1": SpaceEntry[];
    "dia-2": SpaceEntry[];
  };
  /**
   * Additional Lugares/Sedes beyond ESEN. Day-independent; purely additive and
   * never feeds the derived `dia-1`/`dia-2`/`capacities` fields above.
   */
  venues?: Venue[];
}

export const EMPTY_SPACES_CATALOG: SpacesCatalog = {
  "dia-1": [],
  "dia-2": [],
  capacities: {},
  capacitiesById: {},
  entries: { "dia-1": [], "dia-2": [] },
  venues: [],
};

/** Derives the unique, sorted list of space names from structured entries. */
export function deriveSpaceNames(entries: SpaceEntry[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of entries) {
    const name = (e.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

/** Derives the name→aforo map from structured entries (positive ints only). */
export function deriveCapacities(entries: SpaceEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) {
    const name = (e.name || "").trim();
    if (!name) continue;
    const a = Number(e.aforo);
    if (Number.isFinite(a) && a > 0) out[name] = Math.floor(a);
  }
  return out;
}

/** Derives the name→aforo map from every Lugar/Sede venue (positive ints only). */
export function deriveVenueCapacities(venues: Venue[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of venues) {
    for (const e of v.entries) {
      const name = (e.name || "").trim();
      if (!name) continue;
      const a = Number(e.aforo);
      if (Number.isFinite(a) && a > 0) out[name] = Math.floor(a);
    }
  }
  return out;
}

/** Derives the id→aforo map from ESEN day entries + venues (positive ints only). */
export function deriveCapacitiesById(
  entriesD1: SpaceEntry[],
  entriesD2: SpaceEntry[],
  venues: Venue[] = [],
): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (e: SpaceEntry) => {
    const id = (e.id || "").trim();
    if (!id) return;
    const a = Number(e.aforo);
    if (Number.isFinite(a) && a > 0) out[id] = Math.floor(a);
  };
  for (const e of entriesD1) add(e);
  for (const e of entriesD2) add(e);
  for (const v of venues) for (const e of v.entries) add(e);
  return out;
}

/** Builds a full catalog (legacy derived fields + entries + venues) from parts. */
export function buildSpacesCatalog(
  entriesD1: SpaceEntry[],
  entriesD2: SpaceEntry[],
  venues: Venue[] = [],
): SpacesCatalog {
  return {
    "dia-1": deriveSpaceNames(entriesD1),
    "dia-2": deriveSpaceNames(entriesD2),
    // ESEN capacities take precedence over a same-named venue space.
    capacities: {
      ...deriveVenueCapacities(venues),
      ...deriveCapacities(entriesD1),
      ...deriveCapacities(entriesD2),
    },
    capacitiesById: deriveCapacitiesById(entriesD1, entriesD2, venues),
    entries: { "dia-1": entriesD1, "dia-2": entriesD2 },
    venues,
  };
}

/**
 * Flat, ordered list of every room in the catalog with its stable id and
 * place/day context. ESEN Día 1 / Día 2 rooms come first (distinct ids per
 * day), then each Lugar/Sede's named rooms (zone-only venue placeholders are
 * skipped). This is the single source for id↔name resolution.
 */
export function allSpaceRefs(catalog: SpacesCatalog): ResolvedSpace[] {
  const out: ResolvedSpace[] = [];
  const pushEntry = (e: SpaceEntry, placeLabel: string, dayKey?: SpaceDayKey, requireName = false) => {
    const id = (e.id || "").trim();
    const name = (e.name || "").trim();
    if (!id) return;
    if (requireName && !name) return;
    const ref: ResolvedSpace = { id, name, zone: (e.zone || "").trim(), placeLabel };
    if (e.aforo != null && Number.isFinite(Number(e.aforo)) && Number(e.aforo) > 0) ref.aforo = Math.floor(Number(e.aforo));
    if (dayKey) ref.dayKey = dayKey;
    out.push(ref);
  };
  for (const e of catalog.entries?.["dia-1"] ?? []) pushEntry(e, "ESEN — Día 1", "dia-1");
  for (const e of catalog.entries?.["dia-2"] ?? []) pushEntry(e, "ESEN — Día 2", "dia-2");
  for (const v of catalog.venues ?? []) {
    for (const e of v.entries) pushEntry(e, v.name || "Sin lugar", undefined, true);
  }
  return out;
}

/** id → ResolvedSpace map for the whole catalog. */
export function spaceRefsById(catalog: SpacesCatalog): Map<string, ResolvedSpace> {
  const map = new Map<string, ResolvedSpace>();
  for (const r of allSpaceRefs(catalog)) if (!map.has(r.id)) map.set(r.id, r);
  return map;
}

/** Resolves a stable room id to its display name; "" when not found. */
export function resolveSpaceName(catalog: SpacesCatalog, id: string | undefined): string {
  const key = (id || "").trim();
  if (!key) return "";
  return spaceRefsById(catalog).get(key)?.name ?? "";
}

/** Whether a venue is offered for an item in the given sub-event. */
export function venueMatchesSubEvent(venue: Venue, subEventId?: string): boolean {
  const ids = venue.subEventIds;
  if (!ids || ids.length === 0) return true; // unassociated = global
  if (!subEventId) return false;
  return ids.includes(subEventId);
}

/** Groups entries by zone, preserving first-appearance order (faithful to Excel). */
export function groupSpacesByZone(entries: SpaceEntry[]): [string, SpaceEntry[]][] {
  const order: string[] = [];
  const map = new Map<string, SpaceEntry[]>();
  for (const e of entries) {
    const zone = (e.zone || "").trim() || "Sin zona";
    if (!map.has(zone)) { map.set(zone, []); order.push(zone); }
    map.get(zone)!.push(e);
  }
  return order.map(z => [z, map.get(z)!]);
}

/** Pushes zone-grouped, deduped, named entries (id+name) of one Lugar into `out`. */
function pushOptionGroups(out: SpaceOptionGroup[], lugar: string, entries: SpaceEntry[]): void {
  for (const [zone, zoneEntries] of groupSpacesByZone(entries)) {
    const options: SpaceOption[] = [];
    const seen = new Set<string>();
    for (const e of zoneEntries) {
      const n = (e.name || "").trim();
      const id = (e.id || "").trim();
      if (!n || !id) continue;
      const k = n.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      options.push({ id, name: n });
    }
    if (options.length) out.push({ lugar, zone, options });
  }
}

/**
 * Builds the grouped space options for a Budget item on a given day. Always
 * includes the ESEN entries for that day (the main venue, kept for backward
 * compatibility) plus the Espacios of every Lugar/Sede associated with the
 * item's sub-event, grouped by Lugar › Zona/Área.
 */
export function spaceOptionGroupsForItem(
  catalog: SpacesCatalog,
  subEventId: string | undefined,
  day: SpaceDayKey,
): SpaceOptionGroup[] {
  const out: SpaceOptionGroup[] = [];
  pushOptionGroups(out, "ESEN", catalog.entries?.[day] ?? []);
  for (const v of catalog.venues ?? []) {
    if (!venueMatchesSubEvent(v, subEventId)) continue;
    pushOptionGroups(out, v.name, v.entries);
  }
  return out;
}

/** Flat, deduped, sorted list of space names offered for an item on a day. */
export function spaceNamesForItem(
  catalog: SpacesCatalog,
  subEventId: string | undefined,
  day: SpaceDayKey,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of spaceOptionGroupsForItem(catalog, subEventId, day)) {
    for (const o of g.options) {
      const k = o.name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(o.name);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

/**
 * Flat list of pickable room options (id + display label) for an item on its
 * day, deduped by id and carrying place/zone context for disambiguation.
 */
export function spaceOptionsForItem(
  catalog: SpacesCatalog,
  subEventId: string | undefined,
  day: SpaceDayKey,
): { id: string; name: string; zone: string; lugar: string }[] {
  const out: { id: string; name: string; zone: string; lugar: string }[] = [];
  const seen = new Set<string>();
  for (const g of spaceOptionGroupsForItem(catalog, subEventId, day)) {
    for (const o of g.options) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      out.push({ id: o.id, name: o.name, zone: g.zone, lugar: g.lugar });
    }
  }
  return out;
}

/**
 * The legacy (name-based) space assigned to an item, collapsed to one value:
 * the field for the item's phase day, falling back to the other day. Used only
 * as a migration source and orphan-display fallback.
 */
export function itemLegacySpaceName(item: BudgetItem): string {
  const day = phaseSpaceDay(derivePhase(item));
  const primary = (day === "dia-2" ? item.espacioDia2 : item.espacioDia1) || "";
  const other = (day === "dia-2" ? item.espacioDia1 : item.espacioDia2) || "";
  return primary.trim() || other.trim();
}

/**
 * Resolves a legacy free-typed space name to a stable catalog room id for the
 * given item. Prefers the ESEN day matching the item's phase, then the other
 * ESEN day, then any venue room associated with the item's sub-event, then any
 * venue room. Returns "" when the name matches no catalog room (orphan).
 */
export function resolveItemSpaceNameToId(
  catalog: SpacesCatalog,
  item: BudgetItem,
  name: string,
): string {
  const target = name.trim().toLowerCase();
  if (!target) return "";
  const phase = derivePhase(item);
  const day = phaseSpaceDay(phase);
  const findIn = (entries: SpaceEntry[] | undefined): string => {
    for (const e of entries ?? []) {
      if ((e.name || "").trim().toLowerCase() === target && (e.id || "").trim()) return e.id;
    }
    return "";
  };
  const primaryDay = catalog.entries?.[day];
  const otherDay = catalog.entries?.[day === "dia-2" ? "dia-1" : "dia-2"];
  let hit = findIn(primaryDay) || findIn(otherDay);
  if (hit) return hit;
  // Venues associated with the item's sub-event first, then the rest.
  const venues = catalog.venues ?? [];
  for (const v of venues) {
    if (!venueMatchesSubEvent(v, phase)) continue;
    hit = findIn(v.entries);
    if (hit) return hit;
  }
  for (const v of venues) {
    hit = findIn(v.entries);
    if (hit) return hit;
  }
  return "";
}

/** Effective display name of an item's assigned space (id first, legacy fallback). */
export function itemSpaceName(catalog: SpacesCatalog, item: BudgetItem): string {
  const id = (item.espacioId || "").trim();
  if (id) return resolveSpaceName(catalog, id) || itemLegacySpaceName(item);
  return itemLegacySpaceName(item);
}

/**
 * The Lugar/Sede label of a resolved room: "ESEN" for ESEN day rooms (collapsing
 * both days under the single venue), the venue name otherwise.
 */
export function lugarOfSpace(ref: ResolvedSpace): string {
  return ref.dayKey ? "ESEN" : ref.placeLabel;
}

/** Effective Lugar/Sede of an item's assigned space; "" when unassigned/orphan. */
export function itemLugar(catalog: SpacesCatalog, item: BudgetItem): string {
  const id = (item.espacioId || "").trim();
  if (!id) return "";
  const ref = spaceRefsById(catalog).get(id);
  return ref ? lugarOfSpace(ref) : "";
}

/** Distinct Lugares/Sedes present in the catalog, ESEN first, then venues sorted. */
export function allLugares(catalog: SpacesCatalog): string[] {
  const set = new Set<string>();
  for (const r of allSpaceRefs(catalog)) {
    const l = lugarOfSpace(r);
    if (l) set.add(l);
  }
  return Array.from(set).sort((a, b) =>
    a === "ESEN" ? -1 : b === "ESEN" ? 1 : a.localeCompare(b),
  );
}

/**
 * Idempotent migration of legacy name-based space assignments to stable
 * `espacioId` references. Items that already carry an `espacioId`, or whose
 * legacy name matches no catalog room (orphans), are left untouched. Never
 * changes any monetary field. Returns the (possibly new) array and whether
 * anything changed.
 */
export function migrateItems(
  items: BudgetItem[],
  catalog: SpacesCatalog,
): { next: BudgetItem[]; changed: boolean } {
  let changed = false;
  const next = items.map(it => {
    if ((it.espacioId || "").trim()) return it;
    const name = itemLegacySpaceName(it);
    if (!name) return it;
    const id = resolveItemSpaceNameToId(catalog, it, name);
    if (!id) return it;
    changed = true;
    return { ...it, espacioId: id };
  });
  return { next, changed };
}

export const INITIAL_BUDGET_ITEMS: BudgetItem[] = [
  { id: "1", evento: "MAIN EVENT", area: "INGRESO ESEN Y PARQUEO", centroCosto: "STAFF", item: "GESTORES VMT", descripcion: "GESTORES DE TRAFICO DE APOYO PARA EVITAR CONGESTION EN INGRESO ESEN", notas: "SE DEBE CONTEMPLAR COSTO DEL SERVICIO CIVIL Y ALIMENTOS PARA VTM. PUEDE QUE SEA IN-KIND Y SOLO CORRERIAMOS CON ALIMENTOS.", inKind: true, agencyFee: false, qty: 6, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "NA", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "2", evento: "MAIN EVENT", area: "INGRESO ESEN Y PARQUEO", centroCosto: "STAFF", item: "BOUNCER EN PLUMA (3 HORAS DE SERVICIO)", descripcion: "", notas: "CONTRATADO VIA AURORA360.", inKind: false, agencyFee: true, qty: 2, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 111.11, subtotal: 444.44, aplicaFee: "NO", fee: 88.888, subtotalConFee: 533.328, iva: 69.33264, total: 602.66064, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "AURORA 360", validarCosto: false, contratarAparte: false },
  { id: "5", evento: "MAIN EVENT", area: "INGRESO ESEN Y PARQUEO", centroCosto: "SEÑALETICA", item: "ESTRUCTURA Y BANDEROLAS PUBLICITARIAS", descripcion: "PARA EXTERIOR, COMO GUIA EN LA CALLE PRINCIPAL FRENTE A LA ENTRADA DE LA ESEN", notas: "SE DEBERAN CONTRATAR POR APARTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 4, uom: "PERSONA", porDias: "NO", qtyDias: 1, precioUnitario: 65, subtotal: 260, aplicaFee: "NO", fee: 52, subtotalConFee: 312, iva: 40.56, total: 352.56, cotizacion: "PENDING", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "6", evento: "MAIN EVENT", area: "RIDE SHARE/DROP-OFF ZONE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "MUPPIES DIGITALES (DIMENSIONES TBD)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 420, subtotal: 840, aplicaFee: "NO", fee: 168, subtotalConFee: 1008, iva: 131.04, total: 1139.04, cotizacion: "PENDING", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "9", evento: "MAIN EVENT", area: "INGRESO 1 via DROP OFF ZONE", centroCosto: "SEÑALETICA", item: "HANDHELD PADEL SIGNS", descripcion: "", notas: "SE DEBERAN CONTRATAR CON UNA IMPRENTA DIRECTAMENTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 2, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 1.45, subtotal: 2.9, aplicaFee: "NO", fee: 0.58, subtotalConFee: 3.48, iva: 0.4524, total: 3.9324, cotizacion: "PENDING", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "11", evento: "MAIN EVENT", area: "INGRESO 1 via DROP OFF ZONE", centroCosto: "MOBILIARIO", item: "UNIFILAS PARA QUEUE", descripcion: "", notas: "CONTRATADO VIA AURORA360.", inKind: false, agencyFee: true, qty: 6, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 8, subtotal: 96, aplicaFee: "NO", fee: 19.200000000000003, subtotalConFee: 115.2, iva: 14.976, total: 130.176, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "AURORA 360", validarCosto: false, contratarAparte: false },
  { id: "12", evento: "MAIN EVENT", area: "INGRESO 1 via DROP OFF ZONE", centroCosto: "MOBILIARIO", item: "MESA METALICA + 2 SILLAS DEL LOBBY  DE ESEN PARA TAQUILLA CON MANTEL", descripcion: "", notas: "MOBILIARIO EN LOBBY DE LA ESEN A REUBICAR", inKind: true, agencyFee: false, qty: 1, uom: "JUEGO", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "13", evento: "MAIN EVENT", area: "INGRESO 1 via DROP OFF ZONE", centroCosto: "MANTELERIA", item: "MANTEL PARA MESA METALICA PARA TAQUILLA", descripcion: "", notas: "MANTELERIA SE MANDARA HACER PARA OBVIAR COSTOS ALTOS DE ALQUILER DE MANTELES.", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 3, subtotal: 6, aplicaFee: "NO", fee: 1.2000000000000002, subtotalConFee: 7.2, iva: 0.936, total: 8.136, cotizacion: "A4", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "14", evento: "MAIN EVENT", area: "INGRESO 1 via DROP OFF ZONE", centroCosto: "SEÑALETICA", item: "ROTULO PARA MESA PARA TAQUILLA (60 × 20 cm)", descripcion: "", notas: "SE DEBERAN CONTRATAR CON UNA IMPRENTA DIRECTAMENTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 2, subtotal: 2, aplicaFee: "NO", fee: 0.4, subtotalConFee: 2.4, iva: 0.312, total: 2.712, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "15", evento: "MAIN EVENT", area: "INGRESO 1 via DROP OFF ZONE", centroCosto: "FUN CAPITAL STAFF", item: "SCANNING STAFF", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 30, subtotal: 120, aplicaFee: "NO", fee: 0, subtotalConFee: 120, iva: 15.6, total: 135.6, cotizacion: "PROPUESTA DE VALOR FUN CAPITAL CAMILA.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "16", evento: "MAIN EVENT", area: "INGRESO 1 via DROP OFF ZONE", centroCosto: "FUN CAPITAL STAFF", item: "TAQUILLA STAFF", descripcion: "PERSONAL DE FUN CAPITAL PARA VENTA IN-SITU (DAY 1 ONLY).", notas: "PUEDE NO REQUERIRSE. SE EVALUARA EN CONJUNTO CON MITTR.", inKind: false, agencyFee: false, qty: 1, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 30, subtotal: 60, aplicaFee: "NO", fee: 0, subtotalConFee: 60, iva: 7.8, total: 67.8, cotizacion: "PROPUESTA DE VALOR FUN CAPITAL CAMILA.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "19", evento: "MAIN EVENT", area: "INGRESO 2 \"PRINCIPAL\" via GRADAS (DE PARQUEO O GRADAS PAREDON EXTERNO)", centroCosto: "MOBILIARIO", item: "UNIFILAS PARA RESTRINGIR PASO A AREAS", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 4, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 8, subtotal: 64, aplicaFee: "NO", fee: 12.8, subtotalConFee: 76.8, iva: 9.984, total: 86.784, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "20", evento: "MAIN EVENT", area: "INGRESO 2 \"PRINCIPAL\" via GRADAS (DE PARQUEO O GRADAS PAREDON EXTERNO)", centroCosto: "MOBILIARIO", item: "UNIFILAS PARA QUEUE EXTERIOR", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 4, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 8, subtotal: 64, aplicaFee: "NO", fee: 12.8, subtotalConFee: 76.8, iva: 9.984, total: 86.784, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "21", evento: "MAIN EVENT", area: "INGRESO 2 \"PRINCIPAL\" via GRADAS (DE PARQUEO O GRADAS PAREDON EXTERNO)", centroCosto: "FUN CAPITAL STAFF", item: "SCANNING STAFF", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 4, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 30, subtotal: 240, aplicaFee: "NO", fee: 0, subtotalConFee: 240, iva: 31.2, total: 271.2, cotizacion: "PROPUESTA DE VALOR FUN CAPITAL CAMILA.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "22", evento: "MAIN EVENT", area: "INGRESO 2 \"PRINCIPAL\" via GRADAS (DE PARQUEO O GRADAS PAREDON EXTERNO)", centroCosto: "FUN CAPITAL STAFF", item: "PULSERAS", descripcion: "PULSERAS PARA IDENTIFICAR TIPO DE TICKET/ACCESOS. SE ADQUIRIRAN VIA FUN CAPITAL COMO UNO DE SUS SERVICIOS.", notas: "", inKind: false, agencyFee: false, qty: 500, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 0.3, subtotal: 150, aplicaFee: "NO", fee: 0, subtotalConFee: 150, iva: 19.5, total: 169.5, cotizacion: "PROPUESTA DE VALOR FUN CAPITAL CAMILA.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "23", evento: "MAIN EVENT", area: "AREA DE REGISTRO @ LOBBY", centroCosto: "MOBILIARIO", item: "UNIFILAS PARA QUEUE/REGISTRO INTERIOR", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 12, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 8, subtotal: 192, aplicaFee: "NO", fee: 38.400000000000006, subtotalConFee: 230.4, iva: 29.952, total: 260.352, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "24", evento: "MAIN EVENT", area: "AREA DE REGISTRO @ LOBBY", centroCosto: "MOBILIARIO", item: "ADAPTADOR DE LETRERO PARA UNIFILAS PARA QUEUE/REGISTRO INTERIOR", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 6, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 50, subtotal: 600, aplicaFee: "NO", fee: 120, subtotalConFee: 720, iva: 93.6, total: 813.6, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "25", evento: "MAIN EVENT", area: "AREA DE REGISTRO @ LOBBY", centroCosto: "MOBILIARIO", item: "SILLAS PARA REGISTRO ESEN (PLASTICAS NEGRAS)", descripcion: "", notas: "", inKind: true, agencyFee: false, qty: 10, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "26", evento: "MAIN EVENT", area: "AREA DE REGISTRO @ LOBBY", centroCosto: "MOBILIARIO", item: "MESA ESEN PARA REGISTRO", descripcion: "SE UTILIZARAN LAS MESAS DE ESEN (TIPO ESCRITORIO0", notas: "", inKind: true, agencyFee: false, qty: 4, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "27", evento: "MAIN EVENT", area: "AREA DE REGISTRO @ LOBBY", centroCosto: "MOBILIARIO", item: "MESA ESEN (1.80 X 0.85 M) PARA REGISTRO ESPECIAL (VIPs/Press/Restricciones Alimentarias)", descripcion: "SE UTILIZARAN LAS MESAS DE ESEN (TIPO ESCRITORIO0", notas: "", inKind: true, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "28", evento: "MAIN EVENT", area: "AREA DE REGISTRO @ LOBBY", centroCosto: "MOBILIARIO", item: "MESA ESEN (1.80 X 0.85 M) PARA IMPRESION DE BADGES", descripcion: "SE UTILIZARAN LAS MESAS DE ESEN (TIPO ESCRITORIO0", notas: "", inKind: true, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "29", evento: "MAIN EVENT", area: "AREA DE REGISTRO @ LOBBY", centroCosto: "ELECTRONICOS", item: "COMPUTADORAS LAPTOP PARA VOLUNTARIOS DE REGISTRO (BYOD POLICY)", descripcion: "", notas: "BRING YOUR OWN DEVICE POLICY", inKind: true, agencyFee: false, qty: 12, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "VOLUNTARIO", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "32", evento: "MAIN EVENT", area: "AREA DE REGISTRO @ LOBBY", centroCosto: "AMENITIES", item: "LIBRETA Y LAPICERO PROMOCIONAL MAS IMPRESION [ATTENDEE GOODIE BAG]", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 500, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 2.32, subtotal: 1160, aplicaFee: "NO", fee: 0, subtotalConFee: 1160, iva: 150.8, total: 1310.8, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "33", evento: "MAIN EVENT", area: "AREA DE REGISTRO @ LOBBY", centroCosto: "AMENITIES", item: "BOLSA TRIFOLD NEGRA PROMOCIONAL MAS IMPRESION  [ATTENDEE GOODIE BAG]", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 500, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 1.87, subtotal: 935, aplicaFee: "NO", fee: 0, subtotalConFee: 935, iva: 121.55, total: 1056.55, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "34", evento: "MAIN EVENT", area: "AREA DE REGISTRO @ LOBBY", centroCosto: "BADGES & LANDYARD", item: "BADGES Y LANDYARDS PARA SPEAKERS (24), ORGANIZADORES/ORGANIZING STAFF (10), VOLUNTARIOS (30), ATTENDEES (485)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 550, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 3.39, subtotal: 1864.5, aplicaFee: "NO", fee: 0, subtotalConFee: 1864.5, iva: 242.385, total: 2106.885, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "35", evento: "MAIN EVENT", area: "AREA DE REGISTRO @ LOBBY", centroCosto: "IMPRESOS", item: "TICKETS REDENCION LUNCH EN PAPEL FOLCOTE 5X5CMS", descripcion: "TICKETS A UTILIZAR PARA EFECTOS DE LOGISTICA DE ENTREGA DE LUNCHBOXES.", notas: "COTIZAR CON IMPRENTA", inKind: false, agencyFee: false, qty: 1000, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 0.06, subtotal: 60, aplicaFee: "NO", fee: 12, subtotalConFee: 72, iva: 9.36, total: 81.36, cotizacion: "A3", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "36", evento: "MAIN EVENT", area: "LOBBY", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "TOTEM DIGITAL PARA AGENDA Y LOOPS", descripcion: "", notas: "escribir a flor o proveedor q corrija coti para que nos den esto de cortesia como plantea el proovedor", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 233.49, subtotal: 233.49, aplicaFee: "NO", fee: 46.69800000000001, subtotalConFee: 280.188, iva: 36.42444, total: 316.61244, cotizacion: "A1", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "37", evento: "MAIN EVENT", area: "LOBBY", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "BACKING PARA FOTOGRAFIAS EN LOBBY CON PERFILERIA Y LONA TENSADA MATE FULL COLOR 4X3 METROS", descripcion: "", notas: "esto vario en 3er scouting", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 400, subtotal: 400, aplicaFee: "NO", fee: 80, subtotalConFee: 480, iva: 62.4, total: 542.4, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "38", evento: "MAIN EVENT", area: "LOBBY", centroCosto: "BOOTHS/STANDS", item: "C2 LABS", descripcion: "", notas: "", inKind: false, agencyFee: true, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 600, subtotal: 600, aplicaFee: "NO", fee: 120, subtotalConFee: 720, iva: 93.6, total: 813.6, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "39", evento: "MAIN EVENT", area: "LOBBY", centroCosto: "BOOTHS/STANDS", item: "OPINNO", descripcion: "", notas: "", inKind: false, agencyFee: true, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 600, subtotal: 600, aplicaFee: "NO", fee: 120, subtotalConFee: 720, iva: 93.6, total: 813.6, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "40", evento: "MAIN EVENT", area: "LOBBY", centroCosto: "ELECTRICO", item: "ACCESOS A TOMA 220 EN BOOTHS Y 1 TOMA 110 PARA AREA DE REGISTRO", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 333.33, subtotal: 333.33, aplicaFee: "NO", fee: 66.666, subtotalConFee: 399.996, iva: 51.99948, total: 451.99548, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "41", evento: "MAIN EVENT", area: "LOBBY", centroCosto: "INTERNET", item: "RED DE INTERNET PARA FALLBACK DE ASISTENTES (ESEN 500 MB)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "42", evento: "MAIN EVENT", area: "BACKSTAGE", centroCosto: "MOBILIARIO", item: "MESA ESEN (1.80 X 0.85 CM) PARA BACKSTAGE", descripcion: "SE UTILIZARAN LAS MESAS DE ESEN (TIPO ESCRITORIO0", notas: "", inKind: false, agencyFee: false, qty: 3, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "43", evento: "MAIN EVENT", area: "BACKSTAGE", centroCosto: "MANTELERIA", item: "MANTEL PARA MESA (6 ft) PARA BACKSTAGE", descripcion: "", notas: "MANTELERIA SE MANDARA HACER PARA OBVIAR COSTOS ALTOS DE ALQUILER DE MANTELES.", inKind: false, agencyFee: false, qty: 3, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 3, subtotal: 18, aplicaFee: "NO", fee: 3.6, subtotalConFee: 21.6, iva: 2.808, total: 24.408, cotizacion: "A4", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "44", evento: "MAIN EVENT", area: "BACKSTAGE", centroCosto: "MOBILIARIO", item: "SILLAS PARA TECNICOS ESEN (PLASTICA NEGRA)", descripcion: "SILLAS PLASTICAS NEGRAS ESEN.", notas: "", inKind: false, agencyFee: false, qty: 4, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "45", evento: "MAIN EVENT", area: "BACKSTAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "DIVISION DE PERFILERIA CON PVC BLANCO CON PUERTA 5 X 2.40 M PARA BACKSTAGE CON LONA FULL COLOR", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 200, subtotal: 200, aplicaFee: "NO", fee: 40, subtotalConFee: 240, iva: 31.2, total: 271.2, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "47", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "ESCENOGRAFIA - TARIMA 14.64 X 3.66 X 0.30 CON CHAROL NEGRO Y GRADAS LATERAL DERECHO (POV HACIA PUBLICO)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 870, subtotal: 1740, aplicaFee: "NO", fee: 348, subtotalConFee: 2088, iva: 271.44, total: 2359.44, cotizacion: "A6 ON TIME SOLUTIONS CAMILA CRUZ.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "48", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "ESCENOGRAFIA - LUZ LED PARA ORILLA DE TARIMA", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 300, subtotal: 300, aplicaFee: "NO", fee: 60, subtotalConFee: 360, iva: 46.8, total: 406.8, cotizacion: "A6 ON TIME SOLUTIONS CAMILA CRUZ.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "49", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "ILUMINACIÓN", item: "ESCENOGRAFIA - BARRAS DE LUZ PARA BAÑAR FONDO/PARED PRINCIPAL AUDITORIO", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 8, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 30, subtotal: 480, aplicaFee: "NO", fee: 96, subtotalConFee: 576, iva: 74.88, total: 650.88, cotizacion: "A6 ON TIME SOLUTIONS CAMILA CRUZ.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "50", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "ESCENOGRAFIA - LOGO EMTECH DIGITAL LATAM PARA ESCENARIO SIN ILUMINACIÓN", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 750, subtotal: 750, aplicaFee: "NO", fee: 150, subtotalConFee: 900, iva: 117, total: 1017, cotizacion: "A9", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "51", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "MOBILIARIO ESCENOGRAFICO - SOFA INDIVIDUAL EJECUTIVO NEGRO DE ESEN", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "52", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "MOBILIARIO ESCENOGRAFICO - SILLAS PARA PONENTES", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 7, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 30, subtotal: 210, aplicaFee: "NO", fee: 42, subtotalConFee: 252, iva: 32.76, total: 284.76, cotizacion: "PENDING", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "53", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "MOBILIARIO ESCENOGRAFICO - CUBO ACRILICO PARA MESA LATERAL DE 45X45 CM", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 3, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 25, subtotal: 150, aplicaFee: "NO", fee: 30, subtotalConFee: 180, iva: 23.4, total: 203.4, cotizacion: "A7", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "54", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "MOBILIARIO ESCENOGRAFICO - CUBO ACRILICO PARA MESA LATERAL DE 20X20 CM", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 15, subtotal: 30, aplicaFee: "NO", fee: 6, subtotalConFee: 36, iva: 4.68, total: 40.68, cotizacion: "A7", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "55", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "MOBILIARIO ESCENOGRAFICO - PODIO DE ESEN", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "56", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "MOBILIARIO ESCENOGRAFICO - MAGNETO CON BRANDING FULL COLOR PARA PODIO DE ESEN (DIMENSIONES TBD)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 6.64, subtotal: 6.64, aplicaFee: "NO", fee: 1.328, subtotalConFee: 7.968, iva: 1.03584, total: 9.00384, cotizacion: "A3", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "57", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "MOBILIARIO", item: "SILLAS COORDINACIÓN STAGE-SIDE ESEN", descripcion: "SILLAS PLASTICAS NEGRAS ESEN.", notas: "", inKind: false, agencyFee: false, qty: 5, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "58", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "MOBILIARIO", item: "SILLAS EXTRA ASISTENTES ESEN", descripcion: "SILLAS PLASTICAS NEGRAS ESEN.", notas: "", inKind: true, agencyFee: false, qty: 154, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "59", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "MOBILIARIO", item: "BUTACAS FIJAS ESEN", descripcion: "", notas: "", inKind: true, agencyFee: false, qty: 168, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "60", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "DIVISION DE PERFILERIA PARA 2 CAMARAS A LOS LATERALES (DIMENSIONES TBD)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "PAQUETE", porDias: "SI", qtyDias: 2, precioUnitario: 60, subtotal: 240, aplicaFee: "NO", fee: 48, subtotalConFee: 288, iva: 37.44, total: 325.44, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "61", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "TARIMA PARA 2 CAMARAS A LOS LATERALES (1.20X1.20X0.50m)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 50, subtotal: 200, aplicaFee: "NO", fee: 40, subtotalConFee: 240, iva: 31.2, total: 271.2, cotizacion: "A6 ON TIME SOLUTIONS CAMILA CRUZ.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "62", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "ILUMINACIÓN", item: "ILUMINACION MAIN STAGE PARA PONENTES Y PARTICIPANTES", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 900, subtotal: 1800, aplicaFee: "NO", fee: 360, subtotalConFee: 2160, iva: 280.8, total: 2440.8, cotizacion: "A6 ON TIME SOLUTIONS CAMILA CRUZ.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "63", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "AUDIO", item: "4 SISTEMA DE AUDIO AUTOAMPLIFICADO CON 7 MICROFONOS, MIXER Y OPERADOR", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 500, subtotal: 500, aplicaFee: "NO", fee: 100, subtotalConFee: 600, iva: 78, total: 678, cotizacion: "A6 ON TIME SOLUTIONS CAMILA CRUZ.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "64", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "AUDIO", item: "MONITOR PARA PRENSA", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 80, subtotal: 320, aplicaFee: "NO", fee: 64, subtotalConFee: 384, iva: 49.92, total: 433.92, cotizacion: "A6 ON TIME SOLUTIONS CAMILA CRUZ.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "65", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "MOBILIARIO", item: "MESA ESEN (1.80 X 0.85 M) PARA AV SET UP", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 5, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "66", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "MANTELERIA", item: "MANTEL PARA MESA PARA AV SET UP", descripcion: "", notas: "MANTELERIA SE MANDARA HACER PARA OBVIAR COSTOS ALTOS DE ALQUILER DE MANTELES.", inKind: false, agencyFee: false, qty: 5, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 3, subtotal: 30, aplicaFee: "NO", fee: 6, subtotalConFee: 36, iva: 4.68, total: 40.68, cotizacion: "A4", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "67", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "MOBILIARIO", item: "SILLAS PARA TECNICOS EN AV SET UP", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 10, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "68", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCION AUDIOVISUAL", item: "CAMARA PTZ: TRÍPODE, CABLES Y CONTROLADOR IP DEL EQUIPO.", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 6, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 800, subtotal: 4800, aplicaFee: "NO", fee: 0, subtotalConFee: 4800, iva: 624, total: 5424, cotizacion: "PROAUDIO V3.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "69", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCION AUDIOVISUAL", item: "CAMARA FHD: TRÍPODE Y CABLES.", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 600, subtotal: 1200, aplicaFee: "NO", fee: 0, subtotalConFee: 1200, iva: 156, total: 1356, cotizacion: "PROAUDIO V3.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "70", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCION AUDIOVISUAL", item: "RECORDING DEVICE AND 4 HDD: DISPOSITIVO DE GRABACIÓN Y HDD.", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 1600, subtotal: 1600, aplicaFee: "NO", fee: 0, subtotalConFee: 1600, iva: 208, total: 1808, cotizacion: "PROAUDIO V3.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "71", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCION AUDIOVISUAL", item: "CCTV -HARDWARE/CABLES PARA DISTRIBUCION DE SEÑAL MAINSTAGE", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 1300, subtotal: 1300, aplicaFee: "NO", fee: 0, subtotalConFee: 1300, iva: 169, total: 1469, cotizacion: "PROAUDIO V3.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "72", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCION AUDIOVISUAL", item: "SWITCHER, PC, CAPTURE CARDS, SWOOGO SOFTWARE", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 2200, subtotal: 2200, aplicaFee: "NO", fee: 0, subtotalConFee: 2200, iva: 286, total: 2486, cotizacion: "PROAUDIO V3.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "73", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCION AUDIOVISUAL", item: "PRODUCCION DE GRAFICOS (INTRO, 25 GRAFICOS X SPEAKERS, SALIDAS)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 1500, subtotal: 1500, aplicaFee: "NO", fee: 0, subtotalConFee: 1500, iva: 195, total: 1695, cotizacion: "PROAUDIO V3.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "74", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCION AUDIOVISUAL", item: "PANTALLA LED P3 14m x 4m, ESTRUCTURAS Y PROCESADOR", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 56, uom: "PIEZAS", porDias: "NO", qtyDias: 1, precioUnitario: 150, subtotal: 8400, aplicaFee: "NO", fee: 0, subtotalConFee: 8400, iva: 1092, total: 9492, cotizacion: "PROAUDIO V3.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "75", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCION AUDIOVISUAL", item: "PANTALLA LED P3 1m x 4m (PANTALLA LATERAL)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 4, uom: "PIEZAS", porDias: "NO", qtyDias: 1, precioUnitario: 150, subtotal: 600, aplicaFee: "NO", fee: 0, subtotalConFee: 600, iva: 78, total: 678, cotizacion: "PROAUDIO V3.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "76", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "PRODUCCION AUDIOVISUAL", item: "MONITOR DE REFERENCIA 75' (ESTILO TELEPROMPTERS)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 125, subtotal: 250, aplicaFee: "NO", fee: 0, subtotalConFee: 250, iva: 32.5, total: 282.5, cotizacion: "PROAUDIO V3.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "77", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "COMUNICACION", item: "AURICULARES", descripcion: "DISPOSITIVOS DE COMUNICACION PARA ORGANIZADORES, PRODUCCION Y AV TEAM", notas: "", inKind: false, agencyFee: false, qty: 8, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 62.5, subtotal: 1000, aplicaFee: "NO", fee: 200, subtotalConFee: 1200, iva: 156, total: 1356, cotizacion: "PENDING", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "78", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "STAFF", item: "PERSONAL TECNICO DE PRODUCCIÓN AV: STREAMING, LED, FLOOR MANAGEMENT, ETC)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 11, uom: "PERSONA", porDias: "NO", qtyDias: 1, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROAUDIO V3.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "79", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "STAFF", item: "PERSONAL TECNICO DE PRODUCCIÓN AV: STREAMING, LED, FLOOR MANAGEMENT, ETC) PARA ENSAYO (4HR)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "SI", qtyDias: 1, precioUnitario: 500, subtotal: 500, aplicaFee: "NO", fee: 0, subtotalConFee: 500, iva: 65, total: 565, cotizacion: "PROAUDIO V3.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "80", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "STAFF", item: "PERSONAL PRODUCCIÓN AURORA360: SUPERVISORES DIA DEL EVENTO", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 44.44, subtotal: 177.76, aplicaFee: "NO", fee: 0, subtotalConFee: 177.76, iva: 23.1088, total: 200.8688, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "AURORA 360", validarCosto: false, contratarAparte: false },
  { id: "81", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "STAFF", item: "PERSONAL PRODUCCIÓN AURORA360: SUPERVISORES DIA(S) DE MONTAJE", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 44.44, subtotal: 177.76, aplicaFee: "NO", fee: 0, subtotalConFee: 177.76, iva: 23.1088, total: 200.8688, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "AURORA 360", validarCosto: false, contratarAparte: false },
  { id: "82", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "STAFF", item: "PERSONAL PRODUCCIÓN AURORA360: SUPERVISORES DIA(S) DE DESMONTAJE", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 44.44, subtotal: 177.76, aplicaFee: "NO", fee: 0, subtotalConFee: 177.76, iva: 23.1088, total: 200.8688, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "AURORA 360", validarCosto: false, contratarAparte: false },
  { id: "85", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "INTERNET", item: "RED DE INTERNET PARA MAINSTAGE/BACKSTAGE (CLARO)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 1500, subtotal: 1500, aplicaFee: "NO", fee: 300, subtotalConFee: 1800, iva: 234, total: 2034, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "86", evento: "MAIN EVENT", area: "AUDITORIO/MAIN STAGE", centroCosto: "INTERNET", item: "RED DE INTERNET PARA FALLBACK DE MAINSTAGE/BACKSTAGE", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "87", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "MOBILIARIO", item: "JUEGOS ALTOS MESA RENDONDA + 4 STOOLS NEGROS DELIBAQUETES SIN MANTEL", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 30, uom: "JUEGOS", porDias: "SI", qtyDias: 2, precioUnitario: 90, subtotal: 5400, aplicaFee: "NO", fee: 1080, subtotalConFee: 6480, iva: 842.4, total: 7322.4, cotizacion: "A10", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "88", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "MOBILIARIO", item: "JUEGOS BAJOS METAL INTERNOS (SOLO MESAS) ESEN CON MANTEL", descripcion: "", notas: "", inKind: true, agencyFee: false, qty: 15, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "89", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "MANTELERIA", item: "MANTEL PARA MESA METAL ESEN (DIMENSIONES TBD)", descripcion: "", notas: "MANTELERIA SE MANDARA HACER PARA OBVIAR COSTOS ALTOS DE ALQUILER DE MANTELES.", inKind: false, agencyFee: false, qty: 15, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 3, subtotal: 90, aplicaFee: "NO", fee: 18, subtotalConFee: 108, iva: 14.04, total: 122.04, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "90", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "MOBILIARIO", item: "SILLAS NEGRAS PARA MESA METAL ESEN CON MANTEL", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 60, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "91", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "MOBILIARIO", item: "CHARGING STATIONS", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 40, subtotal: 160, aplicaFee: "NO", fee: 32, subtotalConFee: 192, iva: 24.96, total: 216.96, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "92", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "AUDIO", item: "SISTEMA DE AUDIO AUTOAMPLIFICADO CON MICROFONO, MIXER, Y OPERADOR", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "PAQUETE", porDias: "SI", qtyDias: 2, precioUnitario: 500, subtotal: 1000, aplicaFee: "NO", fee: 200, subtotalConFee: 1200, iva: 156, total: 1356, cotizacion: "A6 ON TIME SOLUTIONS CAMILA CRUZ.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "93", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "ILUMINACION", item: "ILUMINACION PARADES CAFETERIA", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 12, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 25, subtotal: 600, aplicaFee: "NO", fee: 120, subtotalConFee: 720, iva: 93.6, total: 813.6, cotizacion: "A6 ON TIME SOLUTIONS CAMILA CRUZ.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "94", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "ELECTRICO", item: "TOMAS 110 PARA BOOTH (2 TOMAS POR BOOTH)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 5, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 55.55, subtotal: 277.75, aplicaFee: "NO", fee: 55.550000000000004, subtotalConFee: 333.3, iva: 43.329, total: 376.629, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "95", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "CUBO ACRILICO PARA DECORACIÓN DE 45X45 CM", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 3, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 25, subtotal: 150, aplicaFee: "NO", fee: 30, subtotalConFee: 180, iva: 23.4, total: 203.4, cotizacion: "A7", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "96", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "CUBO ACRILICO PARA DECORACIÓN DE 20X20 CM", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 15, subtotal: 30, aplicaFee: "NO", fee: 6, subtotalConFee: 36, iva: 4.68, total: 40.68, cotizacion: "A7", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "97", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "DIVISIÓN DE PERFILERIA CON PVC BLANCO PARA CAFETERIA 20 MTS", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 15, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 40, subtotal: 600, aplicaFee: "NO", fee: 120, subtotalConFee: 720, iva: 93.6, total: 813.6, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "98", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "BOOTHS/STANDS", item: "BOOTH ESEN", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 195, subtotal: 195, aplicaFee: "NO", fee: 39, subtotalConFee: 234, iva: 30.42, total: 264.42, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "99", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "BOOTHS/STANDS", item: "BOOTH ANIA", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 195, subtotal: 195, aplicaFee: "NO", fee: 39, subtotalConFee: 234, iva: 30.42, total: 264.42, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "100", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "BOOTHS/STANDS", item: "EXTRA BOOTHS TBD...", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: "TBD", uom: "", porDias: "", qtyDias: "", precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "101", evento: "MAIN EVENT", area: "LIVING SPACE (CAFETERIA)", centroCosto: "INTERNET", item: "RED DE INTERNET PARA ASISTENTES DEL EVENTO", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "102", evento: "MAIN EVENT", area: "LIVING SPACE (TERRAZA)", centroCosto: "MOBILIARIO", item: "JUEGOS MESAS Y SILLAS BAJAS METALICOS EN TERRAZA AL AIRE LIBRE ESEN", descripcion: "", notas: "", inKind: true, agencyFee: false, qty: 20, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "103", evento: "MAIN EVENT", area: "LIVING SPACE (TERRAZA)", centroCosto: "MOBILIARIO", item: "JUEGOS BAJOS METAL INTERNOS (SOLO MESAS) ESEN SIN MANTEL", descripcion: "", notas: "", inKind: true, agencyFee: false, qty: 18, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "104", evento: "MAIN EVENT", area: "LIVING SPACE (TERRAZA)", centroCosto: "MOBILIARIO", item: "SILLAS NEGRAS ESEN PARA MESA METAL ESEN SIN MANTEL", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 72, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "105", evento: "MAIN EVENT", area: "LIVING SPACE (TERRAZA)", centroCosto: "ILUMINACION", item: "ILUMINACION PARADES PLANTAS/AMBIENTE TERRAZA", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 12, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 25, subtotal: 600, aplicaFee: "NO", fee: 120, subtotalConFee: 720, iva: 93.6, total: 813.6, cotizacion: "A6 ON TIME SOLUTIONS CAMILA CRUZ.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "106", evento: "MAIN EVENT", area: "LIVING SPACE (TERRAZA)", centroCosto: "MOBILIARIO", item: "SEGUNDA BARRA DE BEBIDAS TIPO O/U/ISLA", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 350, subtotal: 700, aplicaFee: "NO", fee: 140, subtotalConFee: 840, iva: 109.2, total: 949.2, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "107", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "MOBILIARIO", item: "MESA LIFETIMES DE 1.80 X 0.85 M (ZONA DE ALMACENAMIENTO DE ALIMENTOS)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 8, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 3, subtotal: 48, aplicaFee: "NO", fee: 9.600000000000001, subtotalConFee: 57.6, iva: 7.488, total: 65.088, cotizacion: "A4", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "108", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "MOBILIARIO", item: "MANTEL PARA SERVICIO DE ALIMENTOS", descripcion: "", notas: "MANTELERIA SE MANDARA HACER PARA OBVIAR COSTOS ALTOS DE ALQUILER DE MANTELES.", inKind: false, agencyFee: false, qty: 8, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 3, subtotal: 48, aplicaFee: "NO", fee: 9.600000000000001, subtotalConFee: 57.6, iva: 7.488, total: 65.088, cotizacion: "A4", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "109", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "MOBILIARIO", item: "BARRAS PARA ZONA DE ALIMENTOS 2M LARGO X 1.40M ALTURA X 0.40 PROFUNDIDAD CON BRANDING FRONTAL (REPISAS Y LUZ PARA LA NOCHE)", descripcion: "", notas: "ESTAS BARRAS SE UTILIZARÁN PARA MONTAR LOS COFFE BREAKS TAMBIEN", inKind: false, agencyFee: false, qty: 2, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 245, subtotal: 980, aplicaFee: "NO", fee: 196, subtotalConFee: 1176, iva: 152.88, total: 1328.88, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "110", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "ELECTRICO", item: "2 TOMAS 110", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 99.99, subtotal: 99.99, aplicaFee: "NO", fee: 19.998, subtotalConFee: 119.988, iva: 15.59844, total: 135.58644, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "111", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "EQUIPO", item: "PERCOLADORA DE CAFE", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 177.99, subtotal: 177.99, aplicaFee: "NO", fee: 0, subtotalConFee: 177.99, iva: 23.1387, total: 201.1287, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "112", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "EQUIPO", item: "HIELERAS", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 4, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 125, subtotal: 500, aplicaFee: "NO", fee: 0, subtotalConFee: 500, iva: 65, total: 565, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "113", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "EQUIPO", item: "MENAJE DESECHABLE", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 200, subtotal: 200, aplicaFee: "NO", fee: 0, subtotalConFee: 200, iva: 26, total: 226, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "114", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "EQUIPO", item: "MENAJE & SUMINISTROS OPERATIVOS", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 350, subtotal: 350, aplicaFee: "NO", fee: 0, subtotalConFee: 350, iva: 45.5, total: 395.5, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "115", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "EQUIPO", item: "BANDEJAS", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 20, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "116", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "STAFF", item: "FOOD & BEVERAGE SERVICE STAFF", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 15, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 125, subtotal: 3750, aplicaFee: "NO", fee: 0, subtotalConFee: 3750, iva: 487.5, total: 4237.5, cotizacion: "MONTIEL - Camila Cruz.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "117", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "CATERING", item: "ANDIAN - LUNCH AND COFFEE BREAKS [DIA 1 & 2 - TRANSPORTE E IVA INC.] (QUOTATION BASED ON 400 PEOPLE)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 27205.63, subtotal: 27205.63, aplicaFee: "NO", fee: 0, subtotalConFee: 27205.63, iva: 3536.7319, total: 30742.3619, cotizacion: "ANDIAN - 2026.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "118", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "CATERING", item: "DELIBANQUETES - BOCAS COCTEL [DIA 1 & 2 - TRANSPORTE E IVA NO INC.] (QUOTATION BASED ON 400 PEOPLE)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 17725, subtotal: 17725, aplicaFee: "NO", fee: 0, subtotalConFee: 17725, iva: 2304.25, total: 20029.25, cotizacion: "C2 LABB, CAMILA CRUZ, COCTEL SOLO ENTREGA, NOVIEMBRE 1.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "119", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "CATERING", item: "BEBIDAS NO ALCOHOLICAS [DIA 1 & 2 - TRANSPORTE E IVA NO INC.]", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 800, subtotal: 800, aplicaFee: "NO", fee: 0, subtotalConFee: 800, iva: 104, total: 904, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "120", evento: "MAIN EVENT", area: "ZONA DE ALIMENTOS @ PING PONG ROOM", centroCosto: "CATERING", item: "AGUA EMBOTELLADA [DIA 1 & 2 - TRANSPORTE E IVA NO INC.]", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 300, subtotal: 300, aplicaFee: "NO", fee: 0, subtotalConFee: 300, iva: 39, total: 339, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "121", evento: "MAIN EVENT", area: "ESTACION DE CAFE", centroCosto: "CATERING", item: "ESTACION DE CAFE PERMANENTE [DIA 1 & 2 - TRANSPORTE E IVA NO INC.]", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 200, subtotal: 200, aplicaFee: "NO", fee: 0, subtotalConFee: 200, iva: 26, total: 226, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "122", evento: "MAIN EVENT", area: "ESTACION DE CAFE", centroCosto: "EQUIPO", item: "PERCOLADORAS DE CAFE", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 177.99, subtotal: 355.98, aplicaFee: "NO", fee: 0, subtotalConFee: 355.98, iva: 46.2774, total: 402.2574, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "123", evento: "MAIN EVENT", area: "ESTACION DE CAFE", centroCosto: "ELECTRICO", item: "2 TOMAS 110", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 99.99, subtotal: 99.99, aplicaFee: "NO", fee: 19.998, subtotalConFee: 119.988, iva: 15.59844, total: 135.58644, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "124", evento: "MAIN EVENT", area: "ESTACION DE CAFE", centroCosto: "MOBILIARIO", item: "MESA LIFETIMES DE 1.80 X 0.85 M", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 3, subtotal: 12, aplicaFee: "NO", fee: 0, subtotalConFee: 12, iva: 1.56, total: 13.56, cotizacion: "A4", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "125", evento: "MAIN EVENT", area: "ESTACION DE CAFE", centroCosto: "MOBILIARIO", item: "MANTELES CON FALDON", descripcion: "", notas: "MANTELERIA SE MANDARA HACER PARA OBVIAR COSTOS ALTOS DE ALQUILER DE MANTELES.", inKind: false, agencyFee: false, qty: 10, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 10, subtotal: 200, aplicaFee: "NO", fee: 40, subtotalConFee: 240, iva: 31.2, total: 271.2, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "126", evento: "MAIN EVENT", area: "ESTACION DE CAFE", centroCosto: "EQUIPO", item: "MENAJE DESECHABLE", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 200, subtotal: 200, aplicaFee: "NO", fee: 0, subtotalConFee: 200, iva: 26, total: 226, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "127", evento: "MAIN EVENT", area: "ESTACION DE CAFE", centroCosto: "EQUIPO", item: "MENAJE & SUMINISTROS OPERATIVOS", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 350, subtotal: 350, aplicaFee: "NO", fee: 0, subtotalConFee: 350, iva: 45.5, total: 395.5, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "128", evento: "MAIN EVENT", area: "PRESS/SPEAKER ROOM", centroCosto: "MOBILIARIO", item: "JUEGOS DE MESAS Y SILLAS (2 MESAS + 6 SILLAS) ESEN", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 5, uom: "JUEGOS", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "129", evento: "MAIN EVENT", area: "PRESS/SPEAKER ROOM", centroCosto: "MOBILIARIO", item: "SILLONES EJECUTIVOS AMARILLOS (ESEN)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "130", evento: "MAIN EVENT", area: "PRESS/SPEAKER ROOM", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "CUBO ACRILICO PARA DECORACIÓN DE 45X45 CM", descripcion: "", notas: "", inKind: true, agencyFee: false, qty: 3, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 25, subtotal: 150, aplicaFee: "NO", fee: 30, subtotalConFee: 180, iva: 23.4, total: 203.4, cotizacion: "A7", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "131", evento: "MAIN EVENT", area: "PRESS/SPEAKER ROOM", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "CUBO ACRILICO PARA DECORACIÓN DE 20X20 CM", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 15, subtotal: 30, aplicaFee: "NO", fee: 6, subtotalConFee: 36, iva: 4.68, total: 40.68, cotizacion: "A7", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "132", evento: "MAIN EVENT", area: "PRESS/SPEAKER ROOM", centroCosto: "PRODUCCIÓN Y MONTAJE", item: "BACKING DE ENTREVISTAS 3M x 2.40M", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "SI", qtyDias: 2, precioUnitario: 300, subtotal: 600, aplicaFee: "NO", fee: 120, subtotalConFee: 720, iva: 93.6, total: 813.6, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "133", evento: "", area: "", centroCosto: "", item: "ESEN IT ASSISTANT", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "136", evento: "MAIN EVENT", area: "REPLAY ROOM 3", centroCosto: "INTERNET", item: "RED DE INTERNET PARA REPLAY ROOMS (ESEN)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "137", evento: "MAIN EVENT", area: "REPLAY ROOM 4", centroCosto: "INTERNET", item: "RED DE INTERNET PARA FALLBACK DE REPLAY ROOMS", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "141", evento: "MAIN EVENT", area: "SHORT FORM EXPERIENCE ROOM", centroCosto: "FUN CAPITAL STAFF", item: "SCANNING STAFF", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 2, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 30, subtotal: 120, aplicaFee: "NO", fee: 0, subtotalConFee: 120, iva: 15.6, total: 135.6, cotizacion: "PROPUESTA DE VALOR FUN CAPITAL CAMILA.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "142", evento: "MAIN EVENT", area: "WASTE MANAGEMENT & GENERAL CLEANING", centroCosto: "WASTE MANAGEMENT", item: "BASURERO REDONDO RUBBERMAID CAPACIDAD 55 GALONES.", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 4, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 25, subtotal: 100, aplicaFee: "NO", fee: 0, subtotalConFee: 100, iva: 13, total: 113, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "143", evento: "MAIN EVENT", area: "WASTE MANAGEMENT & GENERAL CLEANING", centroCosto: "WASTE MANAGEMENT", item: "BOLSAS DE BASURA 55 GALONES", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 50, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 19.49, subtotal: 974.5, aplicaFee: "NO", fee: 0, subtotalConFee: 974.5, iva: 126.685, total: 1101.185, cotizacion: "https://www.pricesmart.com/es-sv/producto/members-selection-bolsas-para-la-basura-50-unidades-208-l-55-gal-732573/732573", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "144", evento: "MAIN EVENT", area: "WASTE MANAGEMENT & GENERAL CLEANING", centroCosto: "STAFF", item: "PERSONAL DE LIMPIEZA BAÑOS ESEN", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 5, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROVEE ESEN", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "145", evento: "MAIN EVENT", area: "WASTE MANAGEMENT & GENERAL CLEANING", centroCosto: "STAFF", item: "AUXILIAR DE LIMPIEZA", descripcion: "", notas: "", inKind: true, agencyFee: false, qty: 2, uom: "PERSONA", porDias: "SI", qtyDias: 2, precioUnitario: 20, subtotal: 80, aplicaFee: "NO", fee: 16, subtotalConFee: 96, iva: 12.48, total: 108.48, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "146", evento: "MAIN EVENT", area: "TRANSPORTE DE EQUIPO Y/O ELEMENTOS DE PRODUCCIÓN & MONTAJE", centroCosto: "TRANSPORTE MOBILIARIO Y EQUIPO", item: "CUBOS ACRILICOS", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 45, subtotal: 45, aplicaFee: "NO", fee: 9, subtotalConFee: 54, iva: 7.02, total: 61.02, cotizacion: "A7", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "147", evento: "MAIN EVENT", area: "TRANSPORTE DE EQUIPO Y/O ELEMENTOS DE PRODUCCIÓN & MONTAJE", centroCosto: "TRANSPORTE MOBILIARIO Y EQUIPO", item: "MESAS, SILLAS Y MANTELES", descripcion: "", notas: "MANTELERIA SE MANDARA HACER PARA OBVIAR COSTOS ALTOS DE ALQUILER DE MANTELES.", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 90, subtotal: 90, aplicaFee: "NO", fee: 18, subtotalConFee: 108, iva: 14.04, total: 122.04, cotizacion: "A4", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "148", evento: "MAIN EVENT", area: "TRANSPORTE DE EQUIPO Y/O ELEMENTOS DE PRODUCCIÓN & MONTAJE", centroCosto: "TRANSPORTE ALIMENTOS", item: "DOMICILIO DELIBANQUETES", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 80, subtotal: 80, aplicaFee: "NO", fee: 16, subtotalConFee: 96, iva: 12.48, total: 108.48, cotizacion: "C2 LABB, CAMILA CRUZ, COCTEL SOLO ENTREGA, NOVIEMBRE 1.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "149", evento: "MAIN EVENT", area: "TRANSPORTE DE EQUIPO Y/O ELEMENTOS DE PRODUCCIÓN & MONTAJE", centroCosto: "TRANSPORTE IMPRENTA", item: "IMPRESIONES DIVERSAS", descripcion: "", notas: "SE DEBERAN CONTRATAR CON UNA IMPRENTA DIRECTAMENTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 10, subtotal: 10, aplicaFee: "NO", fee: 2, subtotalConFee: 12, iva: 1.56, total: 13.56, cotizacion: "A3", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "150", evento: "MAIN EVENT", area: "SEÑALETICA", centroCosto: "SEÑALETICA", item: "AFICHES CON LAMINADO PARA AREAS (MAIN STAGE, BACKSTAGE, REPLAY ROOM 1, REPLAY ROOM 2, REPLAY ROOM 3, 4 PARA REGISTRO + 2 EXTRAS)", descripcion: "", notas: "SE DEBERAN CONTRATAR CON UNA IMPRENTA DIRECTAMENTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 11, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 1.75, subtotal: 19.25, aplicaFee: "NO", fee: 3.85, subtotalConFee: 23.1, iva: 3.003, total: 26.103, cotizacion: "A3", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "151", evento: "MAIN EVENT", area: "SEÑALETICA", centroCosto: "SEÑALETICA", item: "AFICHES LAMINADO DE BIENVENIDA", descripcion: "", notas: "SE DEBERAN CONTRATAR CON UNA IMPRENTA DIRECTAMENTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 2.25, subtotal: 2.25, aplicaFee: "NO", fee: 0.45, subtotalConFee: 2.7, iva: 0.351, total: 3.051, cotizacion: "A3", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "152", evento: "MAIN EVENT", area: "SEÑALETICA", centroCosto: "SEÑALETICA", item: "PALETAS INFORMATIVAS DE 5.5 X 8.5 IN", descripcion: "", notas: "SE DEBERAN CONTRATAR CON UNA IMPRENTA DIRECTAMENTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 10, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 1.45, subtotal: 14.5, aplicaFee: "NO", fee: 2.9000000000000004, subtotalConFee: 17.4, iva: 2.262, total: 19.662, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "153", evento: "MAIN EVENT", area: "SEÑALETICA", centroCosto: "SEÑALETICA", item: "PEDESTAL CON SEÑALETICA (SPEAKER/PRESS ROOM, 2 EN PARQUEO, 2 SHORT FORM EXPERIENCE ROOM, 2 EXTRAS)", descripcion: "", notas: "SE DEBERAN CONTRATAR CON UNA IMPRENTA DIRECTAMENTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 7, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 60, subtotal: 420, aplicaFee: "NO", fee: 84, subtotalConFee: 504, iva: 65.52, total: 569.52, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "154", evento: "MAIN EVENT", area: "SEÑALETICA", centroCosto: "SEÑALETICA", item: "ROTULOS EN SHORT FORM EXPERIENCE ROOM", descripcion: "", notas: "SE DEBERAN CONTRATAR CON UNA IMPRENTA DIRECTAMENTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 3, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 40, subtotal: 120, aplicaFee: "NO", fee: 24, subtotalConFee: 144, iva: 18.72, total: 162.72, cotizacion: "A2", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "155", evento: "MAIN EVENT", area: "SEÑALETICA", centroCosto: "SEÑALETICA", item: "ROTULOS PARA ESPACIOS RESERVADOS", descripcion: "", notas: "SE DEBERAN CONTRATAR CON UNA IMPRENTA DIRECTAMENTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 20, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 1, subtotal: 20, aplicaFee: "NO", fee: 4, subtotalConFee: 24, iva: 3.12, total: 27.12, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "156", evento: "MAIN EVENT", area: "SEÑALETICA", centroCosto: "SEÑALETICA", item: "TARJETA DE 3X2 IN PARA MENÚ Y ALERGIAS", descripcion: "", notas: "SE DEBERAN CONTRATAR CON UNA IMPRENTA DIRECTAMENTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 50, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 0.15, subtotal: 7.5, aplicaFee: "NO", fee: 1.5, subtotalConFee: 9, iva: 1.17, total: 10.17, cotizacion: "A3", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "157", evento: "MAIN EVENT", area: "SEÑALETICA", centroCosto: "SEÑALETICA", item: "TARJETA DE 3X2 IN PARA CAFETERAS", descripcion: "", notas: "SE DEBERAN CONTRATAR CON UNA IMPRENTA DIRECTAMENTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 2, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 0.15, subtotal: 0.3, aplicaFee: "NO", fee: 0.06, subtotalConFee: 0.36, iva: 0.0468, total: 0.4068, cotizacion: "A3", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "158", evento: "MAIN EVENT", area: "SEÑALETICA", centroCosto: "SEÑALETICA", item: "ROTULOS DE FOLCOTE PARA METER EN ACRILICOS. MEDIA CARTA", descripcion: "", notas: "SE DEBERAN CONTRATAR CON UNA IMPRENTA DIRECTAMENTE PARA OBVIAR AGENCY FEE.", inKind: false, agencyFee: false, qty: 7, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 0.85, subtotal: 5.95, aplicaFee: "NO", fee: 1.1900000000000002, subtotalConFee: 7.14, iva: 0.9282, total: 8.0682, cotizacion: "A3", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "159", evento: "MAIN EVENT", area: "LICENCIAS", centroCosto: "MITTR/OPINNO", item: "LICENCIA MITTR - ON-TIME FEE", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 80000, subtotal: 80000, aplicaFee: "NO", fee: 0, subtotalConFee: 80000, iva: 10400, total: 90400, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "160", evento: "MAIN EVENT", area: "LICENCIAS", centroCosto: "STREAMING", item: "SWOOGO (2 LICENSES, 1 EACH TYPE) - ANNUAL", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 1, precioUnitario: 11800, subtotal: 11800, aplicaFee: "NO", fee: 0, subtotalConFee: 11800, iva: 1534, total: 13334, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "161", evento: "MAIN EVENT", area: "LICENCIAS", centroCosto: "STREAMING", item: "VIMEO LICENSE BUDGET - MENSUAL", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "UNIDAD", porDias: "NO", qtyDias: 4, precioUnitario: 75, subtotal: 300, aplicaFee: "NO", fee: 0, subtotalConFee: 300, iva: 39, total: 339, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "162", evento: "MAIN EVENT", area: "PLAN DE SEGURIDAD, PREVENCIÓN Y RESPUESTA A EMERGENCIAS", centroCosto: "AMBULANCIA", item: "CRUZ ROJA", descripcion: "", notas: "CONSIDERAR ALIMENTACION VIA CAFETERIA DE LA ESEN", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 2, precioUnitario: 100, subtotal: 200, aplicaFee: "NO", fee: 40, subtotalConFee: 240, iva: 31.2, total: 271.2, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "163", evento: "MAIN EVENT", area: "TICKETING", centroCosto: "TICKETING", item: "FUN CAPITAL TICKETING SERVICES 10% OVER TICKET PRICE", descripcion: "", notas: "10% DE LAS VENTAS, TRANSFERIBLE AL ASISTENTE", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "PROPUESTA DE VALOR FUN CAPITAL CAMILA.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "164", evento: "MAIN EVENT VIP DINNER", area: "HOSPITALITY", centroCosto: "ALIMENTACION", item: "CENA/MARIDAJE EN MONARCA CON SOMMERLIER MARGARITA MACHON", descripcion: "CENA VIP", notas: "", inKind: false, agencyFee: false, qty: 30, uom: "PERSONA", porDias: "NO", qtyDias: 1, precioUnitario: 100, subtotal: 3000, aplicaFee: "NO", fee: 0, subtotalConFee: 3000, iva: 390, total: 3390, cotizacion: "Menu Maridaje Camila Cruz.docx", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "165", evento: "MAIN EVENT", area: "FOTOGRAFIA Y VIDEO", centroCosto: "FOTOGRAFIA Y VIDEO", item: "BUDGET FOTOGRAFO Y VIDEOGRAFO MAIN EVENT ($8K)", descripcion: "SE CONTEMPLA UNICAMENTE A NIVEL BUDGET. PERFILES RECOMENDADOS A CONTACTAR - IN PROGRESS.", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 8000, subtotal: 8000, aplicaFee: "NO", fee: 0, subtotalConFee: 8000, iva: 1040, total: 9040, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "166", evento: "MAIN EVENT", area: "PR", centroCosto: "PR BUDGET", item: "BUDGET PARA AGENCIA DE PR ($5K)", descripcion: "SE CONTEMPLA UNICAMENTE A NIVEL BUDGET. STAKEHOLDERS RECOMENDADOS A CONTACTAR - IN PROGRESS.", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 5000, subtotal: 5000, aplicaFee: "NO", fee: 0, subtotalConFee: 5000, iva: 650, total: 5650, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "167", evento: "MAIN EVENT", area: "MARKETING & COMMUNICATIONS", centroCosto: "MARKETING & COMMUNICATIONS BUDGET", item: "BUDGET PARA PAUTA ($3K)", descripcion: "SE CONTEMPLA UNICAMENTE A NIVEL BUDGET. STAKEHOLDERS RECOMENDADOS A CONTACTAR - IN PROGRESS.", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 3000, subtotal: 3000, aplicaFee: "NO", fee: 0, subtotalConFee: 3000, iva: 390, total: 3390, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "168", evento: "BEFORE/AFTER MAIN EVENT", area: "HOSPITALITY", centroCosto: "ALIMENTACION", item: "BUDGET DE VIATICOS ALIMENTARIOS PARA SPEAKERS INTERNACIONALES Y COMITE ORGANIZADOR [TIEMPOS DE COMIDA FUERA DE AGENDA EVENTO ($6K)", descripcion: "SE CONTEMPLA UNICAMENTE A NIVEL BUDGET. PROOVEDORES RECOMENDADOS A CONTACTAR - IN PROGRESS.", notas: "", inKind: false, agencyFee: false, qty: 30, uom: "PERSONA", porDias: "NO", qtyDias: 1, precioUnitario: 200, subtotal: 6000, aplicaFee: "NO", fee: 0, subtotalConFee: 6000, iva: 780, total: 6780, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "169", evento: "BEFORE/AFTER MAIN EVENT", area: "MOBILITY", centroCosto: "AERIAL TRANSPORTATION", item: "VUELOS PARA PONENTES INTERNANCIONALES Y EQUIPO ORGANIZADORES", descripcion: "Tracking en vivo en la pestaña Flights / Vuelos SAL. La cotización Avianca previa ($56,980.03) fue reemplazada por el modelo de precios en vivo por grupo (5 rutas, 14 opciones, 24 pax).", notas: "Ver pestaña Flights / Vuelos SAL para totales actuales por grupo, opciones por ruta y ahorros vs. cotización original.", inKind: false, agencyFee: false, qty: 1, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "NA", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "170", evento: "BEFORE/AFTER MAIN EVENT", area: "HOSPITALITY", centroCosto: "AIRPORT RECEPTION ASSITANCE", item: "SERVICIO SALA VIP @ SAL", descripcion: "\"Recpcion de viajeros por personal especializado quienes:\n1) Le reciben en la puerta de salida, luego es trasladado a nuestra sala VIP\n2) Realizan sus trámites migratorios mientras permanece comodamente en sala VIP (No incluye el pago de Tarjeta Migratoria de Ingreso para extranjeros, US$ 12.00 según aplique.)\n3) Recoge el equipaje del pasajero y realiza tramites de Aduana (No está incluido el uso de carretilla para movilizar el equipaje, valor US$ 3.00 por carretilla)\n4) Una vez sellado el pasaporte y con el equipaje, se entrega al pasajero\nSale por la puerta de entrada principal (egreso VIP) del aeropuerto con acceso prioritario a parqueo de acceso a nuestro proveedor de transporte. \"", notas: "", inKind: true, agencyFee: false, qty: 30, uom: "SERVICIOS", porDias: "NO", qtyDias: 1, precioUnitario: 35, subtotal: 1050, aplicaFee: "NO", fee: 0, subtotalConFee: 1050, iva: 136.5, total: 1186.5, cotizacion: "https://www.cepa.gob.sv/servicios/servicio-vip-pasajeros-del-aies/", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "171", evento: "BEFORE/AFTER MAIN EVENT", area: "MOBILITY", centroCosto: "TERRESTRIAL TRANSPORTATION", item: "ARRIVALS / TRASLADO DE LLEGADAS", descripcion: "TRASLADOS AEROPUERTO > HYATT.", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 325, subtotal: 325, aplicaFee: "NO", fee: 0, subtotalConFee: 325, iva: 42.25, total: 367.25, cotizacion: "31-03-2026 CAMILA CRUZ (Por confirmar) MICROBUS HIACE 2 MODIF.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "172", evento: "BEFORE/AFTER MAIN EVENT", area: "HOSPITALITY", centroCosto: "ACCOMODATIONS", item: "BLOQUE DE 30 HABITACIONES PARA LA ATENCION Y HOSPEDAJE DE PONENTES INTERNACIONALES Y STAFF ORGANIZADOR", descripcion: "", notas: "", inKind: true, agencyFee: false, qty: 1, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 18270, subtotal: 18270, aplicaFee: "NO", fee: 0, subtotalConFee: 18270, iva: 2375.1, total: 20645.1, cotizacion: "https://drive.google.com/drive/folders/1sgi9vNZHe5ucyLvVQM9qN9ZIoD0Qug2t?usp=sharing", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "173", evento: "BEFORE/AFTER MAIN EVENT", area: "HOSPITALITY", centroCosto: "AMENITIES", item: "WELCOME KITS (SPEAKERS + ORGANIZERS) 30", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 30, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 35, subtotal: 1050, aplicaFee: "NO", fee: 0, subtotalConFee: 1050, iva: 136.5, total: 1186.5, cotizacion: "Cotización Insumos Varios Final - The Rack", cotizacionLink: "", documento: "Cotización Caro Pa's Coffee", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "174", evento: "BEFORE/AFTER MAIN EVENT", area: "HOSPITALITY", centroCosto: "AMENITIES", item: "IN ROOM WELCOME KIT DELIVERY SERVICE", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 2, subtotal: 2, aplicaFee: "NO", fee: 0, subtotalConFee: 2, iva: 0.26, total: 2.26, cotizacion: "Cotización Final HC SS", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "175", evento: "BEFORE/AFTER MAIN EVENT", area: "MOBILITY", centroCosto: "TERRESTRIAL TRANSPORTATION", item: "IN-CITY TRIPS / TRASLADO EN SS", descripcion: "TODOS LOS TRASLADOS DE HOTEL, ESEN, MONARCA DURANTE SU ESTADIA EN SS.", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 1305, subtotal: 1305, aplicaFee: "NO", fee: 0, subtotalConFee: 1305, iva: 169.65, total: 1474.65, cotizacion: "31-03-2026 CAMILA CRUZ (Por confirmar) MICROBUS HIACE 2 MODIF.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "176", evento: "MAIN EVENT", area: "MOBILITY", centroCosto: "TERRESTRIAL TRANSPORTATION", item: "UBER BUDGET (EVENT CODE DISCOUNT SUBSIDY)", descripcion: "PARA ASEGURAR UNA BUENA EXPERIENCIA, EN VISTA DEL PARQUEO LIMITADO  RELATIVO AL AFORO, SE CONTEMPLARA BRINDAR CODIGOS DE DESCUENTO EN RIDES, UN MONTO A UTILIZAR PARA MINIMIZAR VOLUMEN DE CARROS. SE CONTEMPLA UN DROP-OFF ZONE EN ZONA \"VALET\" ESEN.", notas: "", inKind: false, agencyFee: false, qty: 250, uom: "PAQUETE", porDias: "NO", qtyDias: 1, precioUnitario: 10, subtotal: 2500, aplicaFee: "NO", fee: 0, subtotalConFee: 2500, iva: 0, total: 2500, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "177", evento: "BEFORE/AFTER MAIN EVENT", area: "MOBILITY", centroCosto: "TERRESTRIAL TRANSPORTATION", item: "DEPARTURES / TRASLADO DE PARTIDAS", descripcion: "TRASLADOS HYATT > AEROPUERTO.", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "SERVICIO", porDias: "NO", qtyDias: 1, precioUnitario: 325, subtotal: 325, aplicaFee: "NO", fee: 0, subtotalConFee: 325, iva: 42.25, total: 367.25, cotizacion: "31-03-2026 CAMILA CRUZ (Por confirmar) MICROBUS HIACE 2 MODIF.pdf", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "178", evento: "BEFORE/AFTER MAIN EVENT", area: "ORGANIZERS", centroCosto: "STAFF", item: "EQUIPO C2 LABS (BILLABLE TIME)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: "", uom: "", porDias: "", qtyDias: "", precioUnitario: 0, subtotal: 0, aplicaFee: "", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
  { id: "179", evento: "BEFORE/AFTER MAIN EVENT", area: "ORGANIZERS", centroCosto: "STAFF", item: "EQUIPO OPINNO (BILLABLE TIME)", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: "", uom: "", porDias: "", qtyDias: "", precioUnitario: 0, subtotal: 0, aplicaFee: "", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false },
];
export interface AviancaRoute {
  id: string;
  grupo: string;
  clase: string;
  asientos: number;
  costoPorPasajero: number;
  costoTotal: number;
}

export const AVIANCA_ROUTES: AviancaRoute[] = [
  { id: "a1", grupo: "Grupo A — San Francisco ⇄ San Salvador (SAL)", clase: "Business Flex", asientos: 11, costoPorPasajero: 1603.76, costoTotal: 17641.36 },
  { id: "a2", grupo: "Grupo B — Boston ⇄ San Salvador (SAL)", clase: "Business Flex", asientos: 14, costoPorPasajero: 2329.76, costoTotal: 32616.64 },
  { id: "a3", grupo: "Grupo C — Mexico City ⇄ San Salvador (SAL)", clase: "Business Flex", asientos: 5, costoPorPasajero: 1163.62, costoTotal: 5818.10 },
  { id: "a4", grupo: "Medellín ⇄ San Salvador (SAL)", clase: "Business Flex", asientos: 1, costoPorPasajero: 903.93, costoTotal: 903.93 },
];

// ── Ground Transport (SAL ⇄ Hyatt) — rebuilt from the transport snapshot ──
// Generado 2026-06-03 · migración 60 min · llegada al aeropuerto 3h antes · IVA 13%

export const GROUND_IVA_RATE = 0.13;
export const MIGRATION_MIN = 60; // airport migration buffer after landing
export const AIRPORT_LEAD_MIN = 180; // arrive at airport 3h before flight

export type VehicleType = "Hiace" | "Sedan" | "Traverse";

// Base unit prices (before IVA), in USD
export const VEHICLE_UNIT_PRICES: Record<VehicleType, number> = {
  Hiace: 65,
  Sedan: 40,
  Traverse: 95,
};

// Comfortable passenger capacity per vehicle type (drives the utilization bar)
export const VEHICLE_CAPACITY: Record<VehicleType, number> = {
  Hiace: 7,
  Sedan: 5,
  Traverse: 5,
};

export interface VehicleAssignment {
  type: VehicleType;
  pax: number;
  maletas?: number;
  carry?: number;
  dobleEquipaje?: boolean;
}

export interface ArrivalGroup {
  id: string;
  label: string; // e.g. "Grupo A · SFO"
  cabin?: string; // e.g. "Economy" | "Business"
  pax: number;
  maletas: number;
  fecha: string; // e.g. "17 Nov"
  aterriza: string; // landing time "HH:MM"
  wazeMin: number;
  vehicles: VehicleAssignment[];
}

export interface DepartureGroup {
  id: string;
  label: string;
  cabin?: string;
  pax: number;
  maletas: number;
  fecha: string;
  vuelo: string; // flight time "HH:MM"
  nota?: string; // extra context (e.g. combined groups)
  wazeMin: number;
  vehicles: VehicleAssignment[];
}

export interface LocalSegment {
  id: string;
  ruta: string; // "Hyatt → ESEN"
  fecha: string;
  nota: string;
  wazeMin: number;
  salir: string; // "HH:MM"
  llegar: string; // display string, may include "(límite)"
  objetivo?: string; // target time for on-time check, e.g. "19:00"
  llegarMin?: number; // numeric arrival minutes for on-time comparison
  vehicles: VehicleAssignment[];
}

export interface FreeTimeDay {
  label: string; // "17 Nov · 8:00–22:00"
  minutes: number;
}

export interface FreeTimeGroup {
  id: string;
  label: string;
  cabin?: string;
  pax: number;
  maletas: number;
  days: FreeTimeDay[];
  ideas: string;
}

export interface GroundTransportData {
  arrivals: ArrivalGroup[];
  departures: DepartureGroup[];
  localSegments: LocalSegment[];
  freeTime: FreeTimeGroup[];
}

const IDEAS_FULL = `10-11:30am tour de palacio nacional
lunch por ahi en algun lado - quien paga esto (12-1pm)
1:30-3:00pm tour de binaes
break en hotel despues y en la tarde noche llevarlos al tunco/la cajita?
back home early or not so early flexibility (quien paga food and drinks?)

todos el 18 slow morning free relax time y lunch to be covered`;

const IDEAS_SHORT = `llegan solo a comer/dormir
todos el 18 slow morning free relax time y lunch to be covered`;

export const GROUND_TRANSPORT_DATA: GroundTransportData = {
  arrivals: [
    { id: "arr-a", label: "Grupo A · SFO", pax: 7, maletas: 7, fecha: "17 Nov", aterriza: "20:50", wazeMin: 50, vehicles: [
      { type: "Hiace", pax: 7, maletas: 7, carry: 7 },
    ] },
    { id: "arr-b-eco", label: "Grupo B · BOS Economy", cabin: "Economy", pax: 8, maletas: 8, fecha: "16 Nov", aterriza: "20:15", wazeMin: 50, vehicles: [
      { type: "Hiace", pax: 7, maletas: 7, carry: 7 },
      { type: "Sedan", pax: 1, maletas: 1, carry: 1 },
    ] },
    { id: "arr-b-bus", label: "Grupo B · BOS Business", cabin: "Business", pax: 3, maletas: 6, fecha: "16 Nov", aterriza: "20:15", wazeMin: 50, vehicles: [
      { type: "Traverse", pax: 3, maletas: 6, carry: 3, dobleEquipaje: true },
    ] },
    { id: "arr-c", label: "Grupo C · MEX", pax: 5, maletas: 5, fecha: "17 Nov", aterriza: "19:05", wazeMin: 50, vehicles: [
      { type: "Hiace", pax: 5, maletas: 5, carry: 5 },
    ] },
    { id: "arr-d", label: "Grupo D · MDE", pax: 1, maletas: 1, fecha: "17 Nov", aterriza: "16:00", wazeMin: 50, vehicles: [
      { type: "Sedan", pax: 1, maletas: 1, carry: 1 },
    ] },
  ],
  departures: [
    { id: "dep-a", label: "Grupo A · SFO", pax: 7, maletas: 7, fecha: "20 Nov", vuelo: "07:45", wazeMin: 50, vehicles: [
      { type: "Hiace", pax: 7, maletas: 7, carry: 7 },
    ] },
    { id: "dep-b-eco", label: "Grupo B · BOS Economy", cabin: "Economy", pax: 8, maletas: 8, fecha: "20 Nov", vuelo: "07:45", wazeMin: 50, vehicles: [
      { type: "Hiace", pax: 7, maletas: 7, carry: 7 },
      { type: "Sedan", pax: 1, maletas: 1, carry: 1 },
    ] },
    { id: "dep-b-bus", label: "Grupo B · BOS Business", cabin: "Business", pax: 3, maletas: 6, fecha: "20 Nov", vuelo: "07:45", wazeMin: 50, vehicles: [
      { type: "Traverse", pax: 3, maletas: 6, carry: 3, dobleEquipaje: true },
    ] },
    { id: "dep-cd", label: "Grupo C + D · MEX + MDE", pax: 6, maletas: 6, fecha: "20 Nov", vuelo: "09:05", nota: "C: MEX 09:05 · 5 pax  —  D: MDE 09:05 · 1 pax", wazeMin: 50, vehicles: [
      { type: "Hiace", pax: 6, maletas: 6, carry: 6 },
    ] },
  ],
  localSegments: [
    { id: "loc-1", ruta: "Hyatt → ESEN", fecha: "18 Nov", nota: "Estar en ESEN 14:00 como tarde", wazeMin: 20, salir: "13:40", llegar: "14:00 (límite)", vehicles: [
      { type: "Hiace", pax: 12 }, { type: "Hiace", pax: 12 },
    ] },
    { id: "loc-2", ruta: "ESEN → Il Buon Gustaio", fecha: "18 Nov", nota: "Evento termina 18:30 → cena 19:00", wazeMin: 20, salir: "18:30", llegar: "18:50", objetivo: "19:00", llegarMin: 18 * 60 + 50, vehicles: [
      { type: "Hiace", pax: 12 }, { type: "Hiace", pax: 12 },
    ] },
    { id: "loc-3", ruta: "Il Buon Gustaio → Hyatt", fecha: "18 Nov", nota: "Cena termina 21:30–22:00", wazeMin: 20, salir: "21:30", llegar: "21:50", vehicles: [
      { type: "Hiace", pax: 12 }, { type: "Hiace", pax: 12 },
    ] },
    { id: "loc-4", ruta: "Hyatt → ESEN", fecha: "19 Nov", nota: "Estar en ESEN 07:30 como tarde", wazeMin: 20, salir: "07:10", llegar: "07:30 (límite)", vehicles: [
      { type: "Hiace", pax: 12 }, { type: "Hiace", pax: 12 },
    ] },
    { id: "loc-5", ruta: "ESEN → Monarca", fecha: "19 Nov", nota: "Salir 18:30 de ESEN → Monarca 19:00", wazeMin: 20, salir: "18:30", llegar: "18:50", objetivo: "19:00", llegarMin: 18 * 60 + 50, vehicles: [
      { type: "Hiace", pax: 12 }, { type: "Hiace", pax: 12 },
    ] },
    { id: "loc-6", ruta: "Monarca → Hyatt", fecha: "19 Nov", nota: "Cena termina 21:30", wazeMin: 20, salir: "21:30", llegar: "21:50", vehicles: [
      { type: "Hiace", pax: 12 }, { type: "Hiace", pax: 12 },
    ] },
  ],
  freeTime: [
    { id: "ft-b-eco", label: "Grupo B · BOS Economy", cabin: "Economy", pax: 8, maletas: 8, days: [
      { label: "17 Nov · 8:00–22:00", minutes: 14 * 60 },
      { label: "18 Nov · 8:00–13:40", minutes: 5 * 60 + 40 },
    ], ideas: IDEAS_FULL },
    { id: "ft-b-bus", label: "Grupo B · BOS Business", cabin: "Business", pax: 3, maletas: 6, days: [
      { label: "17 Nov · 8:00–22:00", minutes: 14 * 60 },
      { label: "18 Nov · 8:00–13:40", minutes: 5 * 60 + 40 },
    ], ideas: IDEAS_FULL },
    { id: "ft-d", label: "Grupo D · MDE", pax: 1, maletas: 1, days: [
      { label: "17 Nov · 17:50–22:00", minutes: 4 * 60 + 10 },
      { label: "18 Nov · 8:00–13:40", minutes: 5 * 60 + 40 },
    ], ideas: IDEAS_SHORT },
    { id: "ft-c", label: "Grupo C · MEX", pax: 5, maletas: 5, days: [
      { label: "17 Nov · 20:55–22:00", minutes: 1 * 60 + 5 },
      { label: "18 Nov · 8:00–13:40", minutes: 5 * 60 + 40 },
    ], ideas: IDEAS_SHORT },
    { id: "ft-a", label: "Grupo A · SFO", pax: 7, maletas: 7, days: [
      { label: "18 Nov · 8:00–13:40", minutes: 5 * 60 + 40 },
    ], ideas: IDEAS_SHORT },
  ],
};
