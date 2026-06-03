---
name: Ground Transport IVA / price model
description: How Ground Transport (/travel/ground) derives costs from base vehicle prices and where IVA is applied.
---

# Ground Transport price model

Ground Transport seeds from a transport snapshot and stores **base (pre-IVA) vehicle unit prices**: Hiace $65, Sedan $40, Traverse $95 (in `budgetData.ts` `VEHICLE_UNIT_PRICES`).

**Display convention (matches the source snapshot):**
- Per-vehicle prices and the group/segment/section subtotals shown on cards are **IVA-inclusive** (base × 1.13). e.g. one Hiace shows $73.45, not $65.
- The KPI strip mixes both: "Ida/Vuelta/Transporte local" are IVA-inclusive section totals, while "Subtotal antes de IVA" is the pre-IVA base sum and "Total global con IVA" is base × 1.13.

**Why:** The original `snapshot_transporte_SAL_Hyatt` HTML displayed all per-line and section figures with IVA baked in, but labelled the global subtotal as pre-IVA. Reproducing those exact numbers ($418 / $373 / $881 / $1480 / $1672) requires storing base prices and applying IVA only at display time, not double-counting.

**How to apply:** Capacity-utilization bar uses `pax / VEHICLE_CAPACITY[type]` (Hiace 7, Sedan/Traverse 5); amber when ratio ≥ 1. Arrival pickup = landing + 60 min migration, Hyatt = +waze. Departure arrive-airport = flight − 180 min, leave-Hyatt = −waze. All editable state persists in localStorage key `ground-transport-v3`.
