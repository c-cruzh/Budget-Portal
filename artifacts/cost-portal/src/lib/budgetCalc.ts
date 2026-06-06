import { deriveDia, phaseDayCount, type BudgetItem, type IvaMode, type QuoteOption, type TransportMode } from "@/data/budgetData";

export const IVA_RATE = 0.13;
export const FEE_RATE = 0.20;
export const TURISMO_RATE = 0.05;

export function getApprovedQuote(item: BudgetItem): QuoteOption | null {
  if (!item.quotes || item.quotes.length === 0) return null;
  return item.quotes.find(q => q.id === item.approvedQuoteId) || item.quotes[0];
}

/**
 * THE single source of truth for every budget-item money figure. Every page
 * (Budget Items, Overview/Dashboard, Sponsors) must run amounts through this
 * function and never re-implement the chain.
 *
 * Day model — EXPLICIT, never inferred:
 *   subtotal = porDias === "SI" ? qty × qtyDias × precio : qty × precio
 *   `qtyDias` defaults to 1; there is NO phase-span auto-doubling. The only
 *   exception is the one-time migration of legacy rows (see `isLegacy` below).
 *
 * IVA model — EXPLICIT 3-state `ivaMode`:
 *   raw      → base = gross;        IVA = (base+fee) × 13%
 *   incluido → base = gross / 1.13; IVA is the embedded portion (not re-added,
 *              so a no-fee total equals the entered price exactly)
 *   exento   → base = gross;        IVA = 0
 *
 * Agency fee (20%) is applied once on the pre-IVA base when `agencyFee` is set
 * and `aplicaFee !== "SI"`. When `aplicaFee === "SI"` the fee is already inside
 * the quote, so it is surfaced informationally as `feeIncluido` and not summed.
 */
export function recalcItem(item: BudgetItem): BudgetItem {
  // Legacy rows predate the explicit model (no `ivaMode`). They are migrated
  // in-place exactly once, preserving their previously-computed totals.
  const isLegacy = item.ivaMode === undefined;
  const mode: IvaMode = item.ivaMode ?? (item.exentoIva ? "exento" : "raw");

  const qty = Number(item.qty) || 0;
  // `dia` is a display-only label; cost comes solely from `qtyDias`.
  item.dia = deriveDia(item);
  const approved = getApprovedQuote(item);
  if (approved) {
    item.precioUnitario = Number(approved.precioUnitario) || 0;
    item.proveedor = approved.label ?? "";
    item.cotizacion = (approved.notes && approved.notes.length > 0) ? approved.notes : (approved.label ?? "");
    item.cotizacionLink = approved.link ?? "";
  }
  const precio = Number(item.precioUnitario) || 0;
  const byDias = item.porDias === "SI";

  // Billed day count is the explicit `qtyDias` (default 1). Legacy per-día rows
  // stored qtyDias=1 and relied on the phase span to bill 2 days for Day of
  // Arrivals — carry that one resolved value forward so totals don't change.
  let dayCount = 1;
  if (byDias) {
    const stored = Number(item.qtyDias) || 0;
    dayCount = isLegacy
      ? (stored >= 2 ? stored : phaseDayCount(item.subEventId))
      : Math.max(1, stored || 1);
  }
  item.qtyDias = byDias ? dayCount : 1;

  const gross = byDias ? qty * dayCount * precio : qty * precio;
  // Pre-IVA base. For "incluido" the entered price already carries IVA.
  const base = mode === "incluido" ? gross / (1 + IVA_RATE) : gross;
  item.subtotal = base;

  const feeApplies = item.agencyFee && item.aplicaFee !== "SI";
  item.fee = feeApplies ? base * FEE_RATE : 0;
  item.feeIncluido = (item.agencyFee && item.aplicaFee === "SI") ? base * FEE_RATE : 0;
  item.subtotalConFee = base + item.fee;
  item.iva = mode === "exento" ? 0 : item.subtotalConFee * IVA_RATE;
  item.turismo = item.aplicaTurismo ? item.subtotalConFee * TURISMO_RATE : 0;
  item.total = item.subtotalConFee + item.iva + (item.turismo || 0);

  // Normalize/persist the explicit fields (also marks the row as migrated).
  item.ivaMode = mode;
  item.exentoIva = mode === "exento";
  return item;
}

/** A single line in the per-item cost breakdown. Amounts are raw numbers; the
 *  UI formats them. `badge` replaces a summed amount with a label (e.g.
 *  "Exento", "Incluido"); `muted` marks a line that is informational only and
 *  does NOT add to the total. */
export interface BreakdownRow {
  key: string;
  label: string;
  /** Short explanation shown under the label (formula / rate). */
  hint?: string;
  amount: number;
  /** Shown instead of (or beside) the amount, e.g. "Exento" / "Incluido". */
  badge?: string;
  /** True when the line is informational and not added to the running total. */
  muted?: boolean;
  /** True for the final Total line. */
  emphasis?: boolean;
}

export interface CostBreakdown {
  inKind: boolean;
  qty: number;
  precio: number;
  byDias: boolean;
  dayCount: number;
  gross: number;
  rows: BreakdownRow[];
  total: number;
}

/**
 * Builds the human-readable breakdown of how a single line's total is assembled,
 * derived ENTIRELY from `recalcItem` so it can never drift from the canonical
 * math chain (gross → pre-IVA base → agency fee → IVA → tourism → total).
 */
export function getCostBreakdown(input: BudgetItem): CostBreakdown {
  // Run the canonical chain on a clone; read every figure back from it.
  const item = recalcItem({ ...input });
  const mode: IvaMode = item.ivaMode ?? (item.exentoIva ? "exento" : "raw");

  const qty = Number(item.qty) || 0;
  const precio = Number(item.precioUnitario) || 0;
  const byDias = item.porDias === "SI";
  const dayCount = byDias ? Math.max(1, Number(item.qtyDias) || 1) : 1;
  const gross = byDias ? qty * dayCount * precio : qty * precio;

  const base = Number(item.subtotal) || 0;
  const fee = Number(item.fee) || 0;
  const feeIncluido = Number(item.feeIncluido) || 0;
  const iva = Number(item.iva) || 0;
  const turismo = Number(item.turismo) || 0;
  const subtotalConFee = Number(item.subtotalConFee) || 0;
  const total = Number(item.total) || 0;

  const rows: BreakdownRow[] = [];

  // 1) Gross — the entered price × quantity (× days when billed per day).
  rows.push({
    key: "gross",
    label: "Bruto",
    hint: byDias ? "Cant. × días × P. unit." : "Cant. × P. unit.",
    amount: gross,
  });

  // 2) Pre-IVA base — only differs from gross when IVA is embedded in the price.
  if (mode === "incluido") {
    rows.push({
      key: "base",
      label: "Base antes de IVA",
      hint: "Precio ÷ 1.13 (IVA ya incluido)",
      amount: base,
    });
  }

  // 3) Agency fee (20% on the pre-IVA base), once.
  if (fee > 0) {
    rows.push({ key: "fee", label: "Fee Aurora 360", hint: "20% sobre la base", amount: fee });
    rows.push({ key: "subFee", label: "Subtotal + fee", amount: subtotalConFee });
  } else if (feeIncluido > 0) {
    rows.push({
      key: "fee",
      label: "Fee Aurora 360",
      hint: "Ya incluido en la cotización — no suma",
      amount: feeIncluido,
      badge: "Incluido",
      muted: true,
    });
  }

  // 4) IVA 13%.
  if (mode === "exento") {
    rows.push({ key: "iva", label: "IVA 13%", amount: 0, badge: "Exento", muted: true });
  } else if (mode === "incluido") {
    rows.push({
      key: "iva",
      label: "IVA 13%",
      hint: "Porción ya dentro del precio",
      amount: iva,
      badge: "Incluido",
    });
  } else {
    rows.push({ key: "iva", label: "IVA 13%", hint: "Sobre subtotal + fee", amount: iva });
  }

  // 5) Tourism 5% — only when it applies.
  if (turismo > 0) {
    rows.push({ key: "turismo", label: "Impuesto turismo 5%", hint: "Sobre subtotal + fee", amount: turismo });
  }

  // 6) Final total.
  rows.push({ key: "total", label: "Total", amount: total, emphasis: true });

  return {
    inKind: !!item.inKind,
    qty,
    precio,
    byDias,
    dayCount,
    gross,
    rows,
    total,
  };
}

/** A transport line crediting a covered item with a share of its cost. */
export interface TransportSource {
  transportId: string;
  label: string;
  mode: TransportMode;
  /** Allocated share in this credit. 0 for association-mode transports. */
  amount: number;
}

/** A covered item serviced by a transport line. */
export interface CoveredEntry {
  id: string;
  label: string;
  /** Allocated share for this covered item. 0 for association-mode transports. */
  amount: number;
}

/**
 * Display-only traceability index for transport/delivery lines. This NEVER
 * mutates or re-sums any item total — the grand total stays exactly the sum of
 * `item.total`. For "allocation" transports it computes an equal split of the
 * transport's own `total` across its (existing) covered items, purely so the UI
 * can annotate both directions without double-counting. Association transports
 * keep their whole cost on their own line, so their allocated shares are 0.
 */
export interface TransportAllocationInfo {
  /** itemId -> total transport $ allocated to it (allocation-mode only). */
  allocatedToItem: Map<string, number>;
  /** itemId -> transport lines that deliver/install it (both modes). */
  sourcesForItem: Map<string, TransportSource[]>;
  /** transportId -> covered item entries that exist in the array. */
  coveredByTransport: Map<string, CoveredEntry[]>;
  /** transportId -> amount distributed away for display (== total in allocation mode, else 0). */
  distributedByTransport: Map<string, number>;
}

/**
 * The required text fields a complete budget line must carry. Single source of
 * truth shared by the create/edit dialog validation and the row-level data
 * quality alerts so the two can never drift.
 */
interface RequiredFieldDef {
  field: keyof BudgetItem;
  /** Short label for the row alert tooltip. */
  label: string;
  /** Full message for the dialog field error. */
  msg: string;
}

const REQUIRED_TEXT_FIELDS: RequiredFieldDef[] = [
  { field: "item", label: "Nombre", msg: "El nombre del item es obligatorio." },
  { field: "subEventId", label: "Fase", msg: "Selecciona la fase del evento." },
  { field: "area", label: "Área/Zona", msg: "Asigna un área/zona (o NO APLICA)." },
  { field: "centroCosto", label: "Centro de costo", msg: "Asigna un centro de costo." },
  { field: "proveedor", label: "Proveedor", msg: "Indica el proveedor (o NO APLICA)." },
  { field: "descripcion", label: "Descripción", msg: "Agrega una descripción." },
  { field: "uom", label: "Unidad (UoM)", msg: "Indica la unidad (UoM)." },
  { field: "cotizacion", label: "Cotización", msg: "Indica la cotización (o N/A)." },
];

const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === "";
const qtyInvalid = (v: unknown) => v === undefined || v === null || Number.isNaN(Number(v)) || Number(v) < 0;

/**
 * Field → error message map for a budget item. Drives the create/edit dialog's
 * inline validation. An empty object means every required field is present.
 */
export function requiredFieldErrors(item: Partial<BudgetItem>): Record<string, string> {
  const e: Record<string, string> = {};
  for (const r of REQUIRED_TEXT_FIELDS) {
    if (isBlank(item[r.field])) e[r.field as string] = r.msg;
  }
  if (qtyInvalid(item.qty)) e.qty = "Cantidad inválida.";
  if (qtyInvalid(item.precioUnitario)) e.precioUnitario = "Precio inválido (≥ 0).";
  if (item.porDias === "SI" && (Number(item.qtyDias) || 0) < 1) e.qtyDias = "Indica al menos 1 día.";
  return e;
}

/** Short labels of the required fields an item is missing (for row tooltips). */
export function missingRequiredLabels(item: Partial<BudgetItem>): string[] {
  const labels: string[] = [];
  for (const r of REQUIRED_TEXT_FIELDS) {
    if (isBlank(item[r.field])) labels.push(r.label);
  }
  if (qtyInvalid(item.qty)) labels.push("Cantidad");
  if (qtyInvalid(item.precioUnitario)) labels.push("Precio");
  if (item.porDias === "SI" && (Number(item.qtyDias) || 0) < 1) labels.push("Días");
  return labels;
}

/** The kinds of data-quality problems surfaced as row alerts. */
export type DataIssueKey = "incomplete" | "zerocost" | "notransport";

export interface DataIssue {
  key: DataIssueKey;
  /** Short headline for the alert. */
  label: string;
  /** Explanation of what is missing / wrong. */
  detail: string;
}

/**
 * Detects the data-quality issues for a single budget line, reusing the shared
 * field validation and the transport allocation index so the row alerts match
 * the dialog and the transport traceability exactly:
 *  - incomplete : one or more required fields are empty/invalid.
 *  - zerocost   : unit price is $0 and the line is not in-kind (donated).
 *  - notransport: the line is neither a transport itself nor delivered/installed
 *                 by any transport line (no included nor associated transport).
 */
export function getItemDataIssues(item: BudgetItem, info: TransportAllocationInfo): DataIssue[] {
  const issues: DataIssue[] = [];

  const missing = missingRequiredLabels(item);
  if (missing.length > 0) {
    issues.push({
      key: "incomplete",
      label: "Campos incompletos",
      detail: `Faltan: ${missing.join(" · ")}`,
    });
  }

  if ((Number(item.precioUnitario) || 0) === 0 && !item.inKind) {
    issues.push({
      key: "zerocost",
      label: "Costo en $0",
      detail: "El precio unitario es $0 y no está marcado como In-Kind. Confirma el costo o márcalo In-Kind.",
    });
  }

  const isTransport = !!item.isTransport;
  const sources = info.sourcesForItem.get(item.id) || [];
  if (!isTransport && !item.transporteNoAplica && sources.length === 0) {
    issues.push({
      key: "notransport",
      label: "Sin transporte",
      detail: "No tiene transporte/entrega incluido ni asociado. Vincúlalo a una línea de transporte o márcala como transporte.",
    });
  }

  return issues;
}

export function computeTransportAllocations(items: BudgetItem[]): TransportAllocationInfo {
  const byId = new Map<string, BudgetItem>();
  for (const it of items) byId.set(it.id, it);

  const info: TransportAllocationInfo = {
    allocatedToItem: new Map(),
    sourcesForItem: new Map(),
    coveredByTransport: new Map(),
    distributedByTransport: new Map(),
  };

  for (const t of items) {
    if (!t.isTransport) continue;
    const ids = Array.isArray(t.coveredItemIds) ? t.coveredItemIds : [];
    // Only count covered items that still exist and aren't the transport itself.
    const covered = ids.filter(id => id !== t.id && byId.has(id));
    if (covered.length === 0) {
      info.coveredByTransport.set(t.id, []);
      info.distributedByTransport.set(t.id, 0);
      continue;
    }
    const mode: TransportMode = t.transportMode === "allocation" ? "allocation" : "association";
    const share = mode === "allocation" ? (t.total || 0) / covered.length : 0;
    const tLabel = t.item || t.descripcion || "(transporte)";

    const entries: CoveredEntry[] = [];
    for (const id of covered) {
      const target = byId.get(id)!;
      entries.push({ id, label: target.item || target.descripcion || id, amount: share });

      if (share > 0) {
        info.allocatedToItem.set(id, (info.allocatedToItem.get(id) || 0) + share);
      }
      const srcList = info.sourcesForItem.get(id) || [];
      srcList.push({ transportId: t.id, label: tLabel, mode, amount: share });
      info.sourcesForItem.set(id, srcList);
    }
    info.coveredByTransport.set(t.id, entries);
    info.distributedByTransport.set(t.id, mode === "allocation" ? share * covered.length : 0);
  }

  return info;
}
