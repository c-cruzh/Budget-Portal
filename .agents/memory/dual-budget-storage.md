---
name: Dual budget tabs (Final vs legacy)
description: How the cost-portal serves two independent Budget Items tables from one component/hook/route factory.
---

# Dual budget tabs (Final vs legacy)

The cost-portal has TWO Budget Items pages backed by the SAME React component
(`BudgetPage`), the SAME hook (`useBudgetApi`), and the SAME Express route logic
(`registerBudgetRoutes` factory) — only configured differently per instance.

- **Final** (`/budget-final`) is the source of truth, starts EMPTY (no seed sync),
  visible to all orgs per normal permissions. Endpoint `/api/budget-items-final`,
  app_state keys `budget-items-final`/`budget-meta-final`, audit entityType
  `budget-item-final`, backfills OFF.
- **Legacy** (`/budget`) keeps seed data, marked "Deprecated", visible ONLY to
  C2 LABS. Endpoint `/api/budget-items`, keys `budget-items`/`budget-meta`,
  entityType `budget-item`, backfills ON. Non-C2 users hitting `/budget` are
  redirected to `/budget-final` by a route guard in `App.tsx`.

**Why:** Final is a clean restart; the two tables must never cross-contaminate.
Separate app_state keys = independent JSONB blobs.

**How to apply:**
- The hook's 3rd `options` arg ({apiUrl, syncSeed}) selects which backend + whether
  to import seed-data.json. `BudgetPageProps` ({apiUrl, syncSeed, seedItems,
  deprecated}) wires it through; defaults preserve legacy behavior.
- Any new budget feature must be added to the shared component so BOTH tabs get it.
- Groups in the table are collapsed by default and an empty table shows nothing
  until you add an item — `addItem` auto-expands the new item's group (key
  `${subEventId||"__unassigned__"}__${area}__${centroCosto||"(Sin centro)"}`) so
  the first item is visible. Don't remove that or the empty Final tab feels broken.

**Final tab is the ONLY surface that renders raw stored old-shape rows** —
backfills OFF and `syncSeed:false`, so nothing upgrades its rows on load. Any new
render path in `BudgetPage` must tolerate missing/old-shape fields, or a single
row can throw. The app is now guarded by `ErrorBoundary` (page-wide, wired in
`App.tsx` Layout keyed by location) + `RowErrorBoundary` (per budget row via the
`safeRow` wrapper) so a bad row degrades to an inline error instead of blanking
the tab — but the underlying old-shape exposure is structural, not a bug to
"fix" by re-seeding.
