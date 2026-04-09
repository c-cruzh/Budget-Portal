# EmTech Digital El Salvador 2026 — Cost Portal

## Overview

A fully-editable cost management portal for the MIT Technology Review EmTech Digital El Salvador 2026 event. Built as a React + Vite SPA with local browser persistence.

## Features

- **Overview Dashboard**: KPI cards (total budget, cash spend, in-kind, pending quotes), charts by area/event phase/cost center, top items
- **Budget Items**: Full Excel-parity table with all 21 columns (EVENTO, AREA/ZONA, CENTRO DE COSTO, ITEM, DESCRIPCION, NOTAS/OBSERVACIONES, IN-KIND, AGENCY FEE, QTY, UoM, POR DIAS, QTY DIAS, PRECIO UNITARIO, SUBTOTAL, APLICA FEE, FEE, SUBTOTAL CON FEE, IVA, TOTAL, COTIZACION, DOCUMENTO). Every field is inline-editable. Toggle buttons for boolean fields (In-Kind, Por Dias, Aplica Fee). Cotizacion column shows identifier badges (A2=Aurora360, PENDING, VOLUNTARIO, etc.). Grouped by event+area with expand/collapse. Filters, search, CSV export with all columns, add/delete items.
- **Flights & Transfers**: Avianca flight block by route group, ground transfers (arrivals, in-city, departures) with editable costs
- **Persistent**: All edits saved in localStorage, survive page refreshes
- **Link management**: Quote/document URLs open in new tab, inline edit UI for links

## Data Source

Imported from: `attached_assets/MITTR_EmTech_Digital_El_Salvador_2026_Budget_[COSTS]_1775694259858.xlsx`

## Stack

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
