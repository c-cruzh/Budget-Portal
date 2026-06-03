---
name: Budget seed/backfill persistence
description: Why the legacy budget must never be overwritten from seed or backfilled, and how day-derivation couples to cost.
---

# Budget seed/backfill persistence

The legacy budget (`budget-items` app_state key) is the live source of truth — users hand-edit it. Two paths used to silently destroy those manual edits and were removed:

1. **Server backfill** (`ensureBudgetSubEventDefaults` in `sub-events.ts`, called on legacy GET) force-stamped any missing `subEventId` to `"dia-2"`, collapsing every item under one sub-event. Removed entirely.
2. **Client seed-resync** (`useBudgetApi.ts`, `syncSeed=true` legacy branch) overwrote the whole DB array with `seed-data.json` whenever the seed JSON string was *longer* than the DB string. The bundled seed has no `subEventId`, so this wiped assignments and any other manual edits. Removed.

**Rule:** Once the DB (server) has items, NEVER overwrite them from the bundled seed. The seed only populates an empty DB. Do not reintroduce a "seed is newer" length/version heuristic for the legacy budget.

**Why:** users reassign sub-events by hand and there is no historical data to reconstruct them; any auto-overwrite is unrecoverable.

## deriveDia ↔ cost coupling (careful when changing the fallback)
`recalcItem` (budgetCalc.ts) sets `item.dia = deriveDia(item)` and, for `porDias === "SI"` items, derives the per-day multiplier as `dayCountForDia(item.dia)` (ambos=2, else 1) and overwrites `qtyDias` with it. So `deriveDia` is the source of truth for how many days a per-day item is billed.

**How to apply:** never make `deriveDia` return `"ambos"` for a `porDias === "SI"` item that lacks an explicit multi-day signal (e.g. `qtyDias < 2`) — it silently doubles that item's cost. The fallback guards this: per-day items collapse to a single day, only truly non-recurring items fall through to `"ambos"`.
