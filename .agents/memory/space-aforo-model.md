---
name: Space aforo (capacity) + room-reference model
description: How rooms are referenced by budget items and how capacity/over-capacity is modeled in the cost portal Budget view.
---

# Space aforo (capacity) + room-reference model

A budget item references **exactly one** room by **stable id** (`espacioId`). The legacy `espacioDia1`/`espacioDia2` name fields are `@deprecated` read-only fallbacks kept only for migration; never write to them (writers clear them to "").

Capacity (aforo) is a property of the **room**, exposed as `capacitiesById: Record<roomId, number>` on the spaces catalog (derived server-side in `catalogFromEntries` and client-side via `deriveCapacitiesById`). The old name-keyed `capacities` map is kept as a derived mirror only. ESEN rooms have **distinct ids per day** (`sp-d1-N` / `sp-d2-N`), so a "room" on Día 1 vs Día 2 is two ids — day-by-day stays intact without per-day fields on the item. Day-independent venues use `venue-*` ids.

"Load" = sum of item `qty` grouped by `espacioId`. A room is over capacity when `capacity != null && load > capacity`; capacity falls back to the entry's own `aforo` if no override. Orphans (legacy name with no matching catalog room) keep `espacioId=""`, are NOT counted in any load, and never mutate the catalog.

**Why:** Names were ambiguous and split across two day fields, tangling places/spaces/phases. Stable ids collapse to one reference, survive renames, and let aforo key off the physical room. The Phase axis is fully independent of room choice.

**How to apply:** `migrateItems(items, catalog)` (in `budgetData.ts`) is the idempotent, **monetary-neutral** migrator — it only sets `espacioId` from a resolvable legacy name, never touches recalcItem fields. It runs once client-side in a ref-guarded effect gated on BOTH budget+spaces loaded, persisting via `saveFull` only when `canEdit`; server also normalizes. `itemSpaceName(catalog, item)` is the sole effective-name resolver (id first, legacy fallback) — use it for display, filters, CSV. Over-capacity banner + badge share `spaceLoadInfo`/`overCapacity`/`overSpaceIds` memos keyed by id. New seed capacities reach prod only via republish. Do NOT merge ESEN day rooms into generic places.
