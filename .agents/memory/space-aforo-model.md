---
name: Space aforo (capacity) model
description: How per-space capacity/over-capacity warning is modeled in the cost portal Budget view.
---

# Space aforo (capacity) model

Capacity (aforo) is a property of the **space**, stored as `capacities: Record<spaceName, number>` on the spaces catalog, **shared across both days** (not per-day). Keyed by exact space name.

"Load" for over-capacity comparison = sum of budget item `qty` (Number(i.qty)||0) for items whose `espacioDia1`/`espacioDia2` matches the space, computed per day. A space is over capacity on a day when `capacity != null && dayLoad > capacity`.

**Why:** A room's physical aforo doesn't change between event days, so one capacity value covers both. Mixing units (people vs item quantities) in the load sum is a known imperfection accepted because items carry only `qty`.

**How to apply:** The Budget banner and the "Aforo" toolbar button badge both derive from the same `spaceLoadInfo`/`overCapacity` memos in `BudgetPage.tsx`, so they always agree — if you change one's over-capacity logic, it flows to both. A missing warning is almost always because no item is actually assigned to the space (load 0), not a render bug. Capacity persistence and item-space assignment persistence are **independent** (spaces catalog vs budget-items JSONB); a capacity can persist while an assignment doesn't.
