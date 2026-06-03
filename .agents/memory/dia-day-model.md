---
name: Día (day) model for cost-portal budget items
description: How per-item day (Día 1 / Día 2 / Ambos) is derived, persisted, and how it drives cost.
---
# Per-item Día model (cost-portal)

`dia: DiaValue` ("dia-1" | "dia-2" | "ambos") on BudgetItem is the SINGLE source of truth for which day an item applies to. Lives in `budgetData.ts` (type, DIA_VALUES/LABELS/COLORS, `deriveDia`, `dayCountForDia`).

**Why:** Day used to be implicit (subEventId + porDias/qtyDias + text), causing zones to show on wrong days and per-day costs double-counting single-day spaces.

**How to apply:**
- `recalcItem` (budgetCalc.ts) is the only place that normalizes: `item.dia = deriveDia(item)`, then `dayCount = porDias==="SI" ? dayCountForDia(dia) : 1`, syncs `item.qtyDias = dayCount`, subtotal uses dayCount. Do NOT reintroduce local recalc copies in pages — DashboardPage/BudgetPage import the shared one.
- Persisted JSONB items predate the field (all `dia` undefined); the frontend derives on load via recalcItem. deriveDia precedence: explicit dia → "1 & 2"/"1 Y 2" text → "DAY/DÍA n ONLY/SOLO" → porDias SI & qtyDias>=2 → subEventId dia-1/dia-2 → default dia-2.
- Split dialogs (Split/BulkSplitByDayDialog) must set `dia` explicitly from chosen subEventId (dia-1/dia-2) so split halves don't inherit "ambos" via spread; else text hints like "DIA 1 & 2" force both halves to ambos.
- Dashboard "Gasto por Día" splits Ambos items 50/50 across the two days for the per-day view.

**Out of scope (separate tasks):** 3+ day split, fee/IVA changes, and step-6 "pre-load known corrections" needs an organizer-provided list (not delivered) — derivation covers the known text/qtyDias cases only.
