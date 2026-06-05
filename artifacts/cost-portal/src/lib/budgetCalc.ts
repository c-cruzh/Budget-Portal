import { deriveDia, phaseDayCount, type BudgetItem, type IvaMode, type QuoteOption } from "@/data/budgetData";

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
