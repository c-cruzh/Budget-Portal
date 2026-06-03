import { deriveDia, dayCountForDia, type BudgetItem, type QuoteOption } from "@/data/budgetData";

export function getApprovedQuote(item: BudgetItem): QuoteOption | null {
  if (!item.quotes || item.quotes.length === 0) return null;
  return item.quotes.find(q => q.id === item.approvedQuoteId) || item.quotes[0];
}

export function recalcItem(item: BudgetItem): BudgetItem {
  const qty = Number(item.qty) || 0;
  // `dia` is the single source of truth for which day the item applies to.
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
  // Per-day costs multiply by the number of days the item runs (Ambos = 2,
  // single day = 1). Keep qtyDias in sync so it never double-counts a one-day space.
  const dayCount = byDias ? dayCountForDia(item.dia) : 1;
  if (byDias) item.qtyDias = dayCount;
  item.subtotal = byDias ? qty * dayCount * precio : qty * precio;
  const feeApplies = item.agencyFee && item.aplicaFee !== "SI";
  item.fee = feeApplies ? item.subtotal * 0.20 : 0;
  item.feeIncluido = (item.agencyFee && item.aplicaFee === "SI") ? item.subtotal * 0.20 : 0;
  item.subtotalConFee = item.subtotal + item.fee;
  item.iva = item.exentoIva ? 0 : item.subtotalConFee * 0.13;
  item.turismo = item.aplicaTurismo ? item.subtotalConFee * 0.05 : 0;
  item.total = item.subtotalConFee + item.iva + (item.turismo || 0);
  return item;
}
