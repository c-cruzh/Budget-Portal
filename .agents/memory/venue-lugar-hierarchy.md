---
name: Espacios venue (Lugar/Sede) hierarchy
description: How the Lugar/Sede › Área/Zona › Espacio model coexists with ESEN's day-keyed entries in the spaces catalog.
---

# Venue (Lugar/Sede) layer in Espacios

The spaces catalog has TWO parallel sources, intentionally not unified:

- `entries` (`dia-1` / `dia-2`, day-keyed) — **ESEN only**. This remains the SOLE source for everything Budget consumes: `spaces["dia-1"]`/`["dia-2"]` space pickers, `spaces.capacities`, and zone suggestions in BudgetPage. Never route Budget off `venues`.
- `venues: Venue[]` — additive, day-independent lugares (Hotel, Aeropuerto, Il Bongustaio, Monarca, BINAES, plus any user-added). Each `Venue` has `id`, `name`, optional `subtitle`, and `entries: SpaceEntry[]` (reusing the SpaceEntry shape but **allowing empty `name`** so an área/zona can exist with no specific space yet).

**Why split:** Budget already derives capacity/aforo alerts and space pickers from the ESEN day-keyed structure. Keeping `venues` purely additive (NOT wired to Budget) means new venues can't break aforo alerts or the picker. This was an explicit task constraint.

**How to apply:**
- New venues are catalog/UI only. Do not add `venues` data into any Budget derivation.
- Seeding/migration lives in `ensureSpacesDefaults` (api-server `routes/spaces.ts`): legacy/empty catalogs get venues seeded; an existing `entries`-but-no-`venues` catalog is migrated once. A `venues` key present (even empty `[]`) counts as curated and is preserved — so once a catalog has the key, reseed won't re-add. New seed reaches prod only via republish (same caveat as the structured spaces catalog).
- `normalizeVenueEntries` keeps zone-only / empty-name rows (don't filter them out like normal space entries).
- UI: `EspaciosPage.tsx` renders ESEN as a Lugar card wrapping two `DaySection`s; venues render as `VenueSection` cards. A generic `ZoneGroup` (day/venue-agnostic via closures) and shared `AddRow` (with `allowEmptyName`) back both. Org gating via `permissions.canEdit` (C2 LABS edit; OPINNO/AURORA360 read-only); server PUT also enforces `ORG_PERMISSIONS`.
