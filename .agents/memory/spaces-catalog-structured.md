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
- Seeding (`ensureSpacesDefaults`) only runs when there are zero entries, so
  user edits are never overwritten. Seed source is `api-server/src/data/spacesSeed.ts`.
