---
name: Explicit 3-state IVA mode for cost-portal budget items
description: How per-item IVA (13%) is modeled, migrated from the old exentoIva boolean, and why totals stay stable.
---
# Per-item IVA mode (cost-portal)

Budget items carry an explicit `ivaMode: "raw" | "incluido" | "exento"` (in `budgetData.ts`). It replaces the old single `exentoIva` boolean as the source of truth for the 13% IVA logic in `recalcItem` (budgetCalc.ts):
- `raw` → entered precio is PRE-IVA; IVA = (base+fee) × 13% added on top.
- `incluido` → entered precio ALREADY includes IVA; base is derived as `gross / 1.13`, IVA is the embedded portion and is NOT re-added (so a no-fee total exactly equals the entered price).
- `exento` → not subject to IVA; IVA = 0.

**Why:** Stakeholders enter prices three different ways (pre-tax quotes, tax-inclusive quotes, exempt items). The old boolean could only express raw-vs-exento and forced manual back-calculation for tax-inclusive prices, causing double-counting.

**How to apply:**
- `recalcItem` is the ONLY place this math lives. SponsorsPage previously had a duplicate recalc — it now imports the canonical one; never re-implement.
- Migration is automatic and totals-preserving: `mode = item.ivaMode ?? (item.exentoIva ? "exento" : "raw")`. Legacy rows therefore resolve to `raw` or `exento` (NEVER `incluido`), so `base = gross` = old subtotal and every downstream figure is byte-identical to the pre-change formula. recalc runs on load via `useBudgetApi(recalcFn)`, so the migration happens the moment data loads.
- recalc writes BOTH fields back: `item.ivaMode = mode` (marks row migrated, flips the `isLegacy` day-count branch off) and `item.exentoIva = mode === "exento"` (kept as a derived mirror so CSV export + any legacy reader still works). Do not remove the mirror.
- Editing: the unified `components/budget/BudgetItemDialog.tsx` exposes a 3-option IVA Select; the inline IVA table cell cycles raw → incluido → exento on click. `ivaMode` is in BudgetPage's `recalcFields` so inline edits re-run recalc + persist.
- Dialog completeness/field semantics: Save is gated — required fields (item, subEventId/phase, area, centroCosto, proveedor, descripcion, uom, cotizacion, qty, precioUnitario, and qtyDias when porDias="SI") show inline errors and block save. Phase is a REQUIRED categorical field with NO "NO APLICA" option (every cost belongs to an event phase; derivePhase deliberately resolves empty→DEFAULT for grouping, so a NO-APLICA phase would silently render as Día 2 — don't add one). Optional supplementary fields: notas, cotizacionLink, documento (labeled "(Opcional)"). Selects that legitimately allow "NO APLICA" (status, assignedTo, agencyFee, aplicaTurismo, inKind) treat that explicit choice as a valid assignment, never as "missing".
- Rates are exported constants in budgetCalc.ts: `IVA_RATE` 0.13, `FEE_RATE` 0.20, `TURISMO_RATE` 0.05. The 20% agency fee is on the pre-IVA base, applied once when `agencyFee && aplicaFee !== "SI"`; when `aplicaFee === "SI"` it is surfaced as informational `feeIncluido` and not summed.
