---
name: Volunteer roles extraction
description: How unpaid PERSONA staffing slots are split out of Budget Items into the Voluntarios roster, and the invariant that keeps cost totals stable.
---

# Volunteer roles vs budget

Volunteer **roles** (unpaid, in-kind staffing slots) live in a dedicated Voluntarios
roster (app_state key `volunteers-roster`), NOT in Budget Items. Volunteer **goods/money**
(laptops under ELECTRONICOS, badges under BADGES & LANDYARD, food) stay in the budget.

## The predicate (single source of truth)
`isVolunteerRole(item)` is true when ALL hold:
- centroCosto NOT in {ELECTRONICOS, BADGES & LANDYARD}
- `precioUnitario === 0 && total === 0` (must be $0)
- centroCosto === "VOLUNTARIOS" **OR** (cotizacion === "VOLUNTARIO" && uom === "PERSONA")

**Why:** matches exactly the 17 in-kind staffing rows (HC 52) without pulling cleaning
STAFF or stray rows. Bare "PROVEE ESEN" is deliberately NOT a trigger — it would wrongly
match non-volunteer rows; the one PROVEE ESEN volunteer is caught via centroCosto VOLUNTARIOS.

## Cost invariant
Every extracted row is $0, so removing it from the budget never changes any total. The
predicate's `$0` clause is what guarantees this — never loosen it.

## Three places the rows must stay stripped
1. `INITIAL_BUDGET_ITEMS` seed (`cost-portal/src/data/budgetData.ts`)
2. `public/seed-data.json` (the seed-resync path in useBudgetApi)
3. Server: `ensureVolunteersExtracted()` in `api-server/src/routes/volunteers.ts` runs in
   BOTH budget GET and volunteers GET, idempotently stripping volunteer rows from the
   budget app_state regardless of which endpoint is hit first.

**How to apply:** if a volunteer row ever reappears in the budget, check all three; the DB
strip is the backstop. The static roster seed (`volunteerRolesSeed.ts`) has 17 entries; the
DB budget originally held only 16 (id140 was already absent from seed-data.json) — that
mismatch is expected, not a bug.

## Reserved future work
`VolunteerRole.assignments` (named person + open/confirmed status) is modeled but NOT
implemented in the UI — that is the explicit next task.
