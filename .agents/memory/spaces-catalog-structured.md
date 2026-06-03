---
name: Spaces catalog structured model
description: How the Espacios catalog stores structured entries and derives the legacy Budget picker shape.
---

# Spaces catalog: structured entries are the source of truth

The space catalog (`app_state` key `spaces`) stores structured `entries` per day
(`{ "dia-1": SpaceEntry[], "dia-2": SpaceEntry[] }`) where each `SpaceEntry`
has `id`, `zone` (Área/Zona), `name`, optional `aforo`, optional `image`. The
legacy fields on the same object — `dia-1`/`dia-2` (unique sorted name arrays)
and `capacities` (name→aforo) — are **derived** from entries, never authored
directly.

**Why:** The Espacios tab needs Área/Zona grouping + per-space aforo, but the
Budget space picker / SpaceCell / over-capacity logic already consume the flat
name arrays + capacities map. Deriving keeps one source of truth while leaving
Budget untouched.

**How to apply:**
- Both client (`useSpacesApi` / `buildSpacesCatalog` in `budgetData.ts`) and
  server (`spaces.ts`) re-derive legacy fields on every read/write. Server
  `normalizeCatalog` migrates a legacy-only payload to zone-less entries.
- Names may collide across zones (e.g. "Isla Temporal @ Lobby" under two Día 2
  zones) — they stay as separate entries; `deriveSpaceNames` dedups
  case-insensitively for the picker only.
- Legacy hook fns (`addSpace`/`setCapacity`/`renameSpace`/`removeSpace`) now
  operate on entries under the hood; keep them working — BudgetPage destructures
  them.
- Seeding (`ensureSpacesDefaults`) runs when the stored value is empty OR is the
  pre-Espacios **legacy shape** (flat name arrays, no `entries` key) — in both
  cases it reseeds with the authoritative layout. A stored value that HAS a
  structured `entries` object is treated as curated (the Espacios tab always
  writes `entries`) and is never overwritten. Seed source is
  `api-server/src/data/spacesSeed.ts`.
  **Why:** new Excel/venue layouts only reach an environment whose `spaces` row
  is empty; older environments (notably **production**, which is a separate DB)
  kept stale pre-Espacios "área" names because the old "seed only when empty"
  rule never replaced them. Updating the seed file alone does NOT update a
  non-empty DB — prod data changes only via the app's PUT endpoint or this
  legacy-reseed on GET after a republish.
  **How to apply:** to push a new spacesSeed layout to production, republish so
  the legacy-reseed code is live; first GET upgrades the stale legacy row. Curated
  (entries-bearing) catalogs are intentionally NOT touched.
