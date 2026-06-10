---
name: Work-stage field
description: How the budget-item workStage field excludes items from totals without touching money math.
---

# Work-stage field (workStage)

A per-item `workStage` field independent of statusCotizacion and all boolean flags. Three states:
- `normal` (default; treat undefined as normal)
- `en-progreso` — still counts in every total; visual attenuation only
- `staged` — EXCLUDED from every total/KPI/dashboard chart/top-item/summary

**Why:** organizers needed to park budget lines as pending/staged so they drop
out of the official numbers without deleting them or abusing statusCotizacion.

**How to apply:**
- workStage carries NO money — stage must never affect subtotal/fee/IVA. The
  recalc step just passes it through.
- Staged rows stay VISIBLE in the table but must be subtracted from EVERY money
  aggregation: top KPIs, per-sub-event summary cards, group/section subtotals,
  CSV-derived totals, and the whole dashboard. The trap is partial coverage —
  reviewers reject if any one summary (e.g. sub-event cards or group header
  subtotals) still sums staged lines. Audit every place that reduces totals.
- Source every total from a non-staged subset; never reuse the raw filtered/all
  set for money. Adding any new total later must also exclude staged.
- Stage is a tracked audit field; both bulk action and the per-item edit dialog
  set it, and BOTH must persist it on save (the dialog-save path is easy to miss).
  Both budget tabs + org edit-permission gating apply.
