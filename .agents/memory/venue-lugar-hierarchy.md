---
name: Espacios venue (Lugar/Sede) hierarchy
description: How the Lugar/Sede › Área/Zona › Espacio model coexists with ESEN's day-keyed entries in the spaces catalog, and how venues feed the Budget picker/aforo.
---

# Venue (Lugar/Sede) layer in Espacios

The spaces catalog has TWO parallel sources, intentionally not unified at the data level but BOTH now feed Budget:

- `entries` (`dia-1` / `dia-2`, day-keyed) — **ESEN only**. Always offered in the Budget space picker (for the matching day) and in aforo alerts.
- `venues: Venue[]` — additive, day-independent lugares (Hotel, Aeropuerto, Il Bongustaio, Monarca, BINAES, plus user-added). Each `Venue` has `id`, `name`, optional `subtitle`, `entries: SpaceEntry[]` (empty `name` allowed = área with no space yet), and optional `subEventIds?: string[]`.

## Venues feed Budget (updated — supersedes the old "never wire venues into Budget" rule)

- **Capacities/aforo:** `buildSpacesCatalog` (client) and `catalogFromEntries` (server) merge `deriveVenueCapacities(venues)` into `spaces.capacities`, ESEN spread LAST so ESEN wins on a name collision. So any assigned venue space with a positive aforo participates in over-capacity alerts (alerts only fire when a space is actually assigned to an item, so unassigned venue spaces are harmless).
- **Picker options:** `spaceOptionGroupsForItem(catalog, subEventId, day)` returns `SpaceOptionGroup[]` (`{lugar, zone, names}`) = ESEN entries for that day (always, backward-compat) + every venue where `venueMatchesSubEvent(venue, subEventId)` is true, grouped Lugar › Zona. `spaceNamesForItem(...)` is the flat deduped+sorted version used by the add/edit `ComboInput` dialogs. `SpaceCell` takes `optionsDia1/optionsDia2: SpaceOptionGroup[]` (NOT flat `spacesDia1/2` anymore).
- **Association semantics:** `venueMatchesSubEvent` = empty/undefined `subEventIds` → GLOBAL (offered for every item, so legacy venues without an association stay visible); non-empty → offered only for items whose `subEventId` is in the list. ESEN is implicitly the day axis (no association needed/stored).

**Why:** Task #100 required ALL lugares (not just ESEN) to feed the Budget picker + aforo, with per-Lugar sub-event association. This intentionally overrode the earlier additive-only constraint. Cost math (deriveDia/dayCountForDia/fee/IVA/turismo) was NOT touched — only the picker option source and the capacities map changed.

## Seeding / migration

- `buildVenuesSeed` (api-server `data/spacesSeed.ts`) seeds `subEventIds` per venue (Hotel/Aeropuerto→dia-1,dia-2; Il Bongustaio→cena-ania; Monarca→cena-vip; BINAES→lanzamiento). Sub-event ids come from `DEFAULT_SUB_EVENTS`.
- Seeds reach a fresh/empty or legacy catalog only; an existing curated catalog (a `venues` key present, even `[]`) is preserved untouched — so existing dev/prod venues stay association-less (= global) until a user associates them in the Espacios UI. New seed reaches prod only via republish.
- `normalizeVenues` (server + client `venuesFromPayload`) and client `updateVenue` all dedupe/trim and DROP the `subEventIds` key when empty.
- `normalizeVenueEntries` keeps zone-only / empty-name rows (don't filter them).

## UI

- `EspaciosPage.tsx`: ESEN renders as a Lugar card with two `DaySection`s; venues render as `VenueSection` cards. `VenueSubEventPicker` (chips toggler, color from the sub-event) sits under each venue header; reads `subEvents` from `useSubEventsApi`. Org gating via `permissions.canEdit` (C2 LABS edit; OPINNO/AURORA360 read-only); server PUT also enforces `ORG_PERMISSIONS`.
- `allSpaces` (BudgetPage filter dropdown) also includes venue space names.
