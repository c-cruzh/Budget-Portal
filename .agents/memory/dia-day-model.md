---
name: Día (day) model for cost-portal budget items
description: How a budget item's "Día" (event phase) is derived, persisted, and how it drives per-day cost.
---
# Per-item Día model (cost-portal)

The budget item "Día" field is the SINGLE event-phase selector, unified with the colored sub-event tag — both edit `subEventId`, so they can never contradict. There are 7 phases (`EVENT_PHASES` in `budgetData.ts`): lanzamiento, dia-1 (Main Event Día 1), dia-2 (Main Event Día 2), cena-vip, cena-ania, arrivals (Day of Arrivals 16–17 Nov, days=2), departures (Day of Departures 20 Nov). `subEventId` is the source of truth.

**Why:** Previously "Día" was a separate `dia: DiaValue` (dia-1/dia-2/ambos) field that duplicated and could contradict the subEventId tag, and only modeled 2 days. Stakeholders need all 7 event phases as one selector, with Arrivals billing 2 days for "por días".

**How to apply:**
- `derivePhase(item)` returns the phase id: any non-empty `subEventId` wins; else legacy `deriveDia` fallback (dia-1/dia-2) else `DEFAULT_SUB_EVENT_ID` ("dia-2"). Use this EVERYWHERE phase is displayed/grouped/filtered (badge, PhaseCell, group key, summaries, filter chips, CSV, espacio picker) — never raw `item.subEventId`, or legacy items with no subEventId render as "Sin asignar". This is display-time derivation only; DB is never backfilled (totals stay stable on load).
- Explicit phase change makes phase authoritative for the billed day count: `updateItem(field==="subEventId")` and `saveEditItem`/`openEditModal` reset `qtyDias` from `phaseDayCount`. recalc's `stored>=2` guard only preserves legacy totals on LOAD, not on a deliberate user edit.
- `phaseDayCount(subEventId)` = `EVENT_PHASE_MAP[id].days` (arrivals=2, rest=1). `phaseSpaceDay(subEventId)` maps dia-2→"dia-2" else "dia-1" (which ESEN space layout the espacio picker uses).
- `recalcItem` (budgetCalc.ts) is the only normalizer: `dayCount = porDias==="SI" ? (storedQtyDias>=2 ? storedQtyDias : phaseDayCount(subEventId)) : 1`. The `stored>=2` guard PRESERVES legacy "ambos" 2-day totals (don't remove it). It still sets `item.dia = deriveDia(item)` for backward-compat but `dia` no longer drives cost.
- Legacy `DiaValue`/`DIA_VALUES`/`DIA_LABELS`/`DIA_COLORS`/`deriveDia`/`dayCountForDia` are KEPT (used by recalc fallback + Voluntarios/Montaje operational-day model, which is a SEPARATE concept — do not merge them).
- Server `sub-events.ts`: `DEFAULT_SUB_EVENTS` has all 7 phases. `ensureSubEventDefaults` does an ADDITIVE merge — existing DBs (original 5 phases) gain arrivals+departures appended without renaming/reordering/removing user data. New seed reaches prod only via republish.
- BudgetPage: single `PhaseCell` (Día column) + item-cell tag popover both edit `subEventId`; espacio is a single picker via `phaseSpaceDay`; filter is `filterPhase` (subEventId or "ALL"). Dashboard "Gasto por Día" groups by all 7 phases (no more 50/50 Ambos split).
- Split dialogs still default to dia-1/dia-2 and set subEventId; recalcItem handles day count for any phase.

**Out of scope:** Voluntarios/Montaje `DiaValue` (operational days) is a different model — untouched.
