# EmTech Digital El Salvador 2026 — Cost Portal

## Overview

A fully-editable cost management portal for the MIT Technology Review EmTech Digital El Salvador 2026 event. Built as a React + Vite SPA with server-side PostgreSQL persistence via an Express API.

## Features

- **Overview Dashboard**: KPI cards (total budget, cash spend, in-kind, pending quotes), charts by area/event phase/cost center, top items
- **Budget Items**: Full Excel-parity table with inline-editable fields. Item cell merges Descripcion/Notas as tooltip. Toggle buttons for boolean fields (In-Kind, Por Dias, Aplica Fee, Validar Costo, Contratar Aparte). Cotizacion column shows identifier badges and link support. Grouped by event+area with expand/collapse. Filters, search, CSV export, add/delete items.
- **Flights & Transfers**: Avianca flight block by route group, ground transfers with editable costs
- **Coctel (Delibanquetes)**: 21 menu items (saladas/dulces) across 2 days, Esc A (400) vs B (500) cost comparison, 10% servicio, tipo badges (I/II/Gourmet/Vegetarianos/Dulce)
- **Bar & Bebidas**: Full beverage planning — Coffee station, drinks/water, bar cocktail (5-7 PM), ice. Purchase list for PriceSmart/Diasa. Bar mix breakdown (cerveza 54.7%, vino blanco 22.5%, tinto 15.9%, espumante 6.9%)
- **Lunch & Coffee Breaks (Andián)**: 19 menu items across Coffee AM/PM and Lunch (Regular + Veg). Day 1 vs Day 2 allocation. Fuente badges (COTIZADO/PROPUESTO). Montaje+transporte $450/día
- **Authentication**: Email/password login with session-based auth (express-session + PostgreSQL session store). 5 pre-seeded users across 3 organizations (C2 LABS, OPINNO, AURORA360). User info displayed in sidebar and header. Sign out functionality.
- **Persistent**: All edits synced to PostgreSQL database via API (auto-save with 800ms debounce). Cloud sync indicator shows save status.
- **Link management**: Quote/document URLs open in new tab, inline edit UI for links
- **Summary Cards (6)**: Total Budget, Cash Expenditure, In-Kind Items, Pending Quotes, Costos a Validar, Contratar Aparte

## Architecture

### Data Flow
- Frontend loads budget items from `GET /api/budget-items` on mount
- Every edit triggers a debounced `PUT /api/budget-items` (800ms) to save the full items array
- Data stored as JSONB in `app_state` table with key `budget-items`
- Falls back to seed data (`INITIAL_BUDGET_ITEMS`) if database is empty

### Fee Logic
- `agencyFee` (Via Productora) drives the 20% fee
- `aplicaFee: "SI"` means fee is already included in quote (no double-counting)
- `feeApplies = agencyFee === true AND aplicaFee !== "SI"`
- IVA 13% on subtotal + fee

### Special Rules
- Avianca: $56,980.03 final all-inclusive (no IVA added)
- VOLUNTARIO/NA/PROVEE ESEN items: Cotizacion shows "N/A" (not editable)

## Data Source

Imported from: `attached_assets/MITTR_EmTech_Digital_El_Salvador_2026_Budget_[COSTS]_1775694259858.xlsx`

## Stack

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Files

- `artifacts/cost-portal/src/pages/BudgetPage.tsx` — Main budget table with all CRUD operations
- `artifacts/cost-portal/src/data/budgetData.ts` — BudgetItem interface and seed data (179 items)
- `artifacts/cost-portal/src/hooks/useBudgetApi.ts` — API hook for server persistence
- `artifacts/cost-portal/src/components/SummaryCards.tsx` — 6 summary KPI cards
- `artifacts/api-server/src/routes/budget.ts` — Budget CRUD API endpoints
- `artifacts/api-server/src/routes/auth.ts` — Authentication routes (login/logout/me) + user seeding
- `artifacts/cost-portal/src/hooks/useAuth.tsx` — Auth context provider and hook
- `artifacts/cost-portal/src/pages/LoginPage.tsx` — Login page
- `lib/db/src/schema/index.ts` — Database schema (app_state + users tables)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
