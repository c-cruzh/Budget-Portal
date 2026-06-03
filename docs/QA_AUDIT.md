# Exhaustive QA Audit — Budget Portal

Date: 2026-06-03  
Repo: `Budget-Portal`  
Branch audited: `work`

## 1. Executive summary

This pass reviewed the Budget Portal at four levels:

1. **Repository / build health**: workspace scripts, TypeScript projects, Vite bundles, API bundle, formatting of changed files, and dependency-audit attempt.
2. **Application surface**: every primary Cost Portal route in `App.tsx`, every API router mounted under `/api`, and the role/permission model used by UI and API.
3. **Runtime smoke checks**: static SPA route serving through Vite preview and unauthenticated API behavior through the built API server.
4. **Security / access-control QA**: unauthenticated access, central session gate, route ordering, and organization-specific edit/comment permissions.

### Overall result

| Area                          | Result                    | Notes                                                                                           |
| ----------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| TypeScript                    | Pass                      | Full workspace typecheck completed.                                                             |
| Production build              | Pass with warnings        | Cost Portal bundle builds; Vite reports sourcemap and chunk-size warnings only.                 |
| Main SPA routes               | Pass                      | Preview served the SPA shell for all primary routes tested.                                     |
| API health/auth bootstrap     | Pass                      | `/api/healthz` returns `200`; unauthenticated `/api/auth/me` returns `401`.                     |
| Protected data API access     | Pass after fix            | Central middleware blocks unauthenticated data-route requests before DB/data loaders.           |
| Dependency audit              | Environment-blocked       | `pnpm audit` returned external npm registry `403 Forbidden`.                                    |
| Full authenticated feature QA | Not fully executable here | No real/staging `DATABASE_URL` or browser automation package was available in this environment. |

## 2. Scope audited

### 2.1 Frontend routes and pages

The main SPA routes are defined in `artifacts/cost-portal/src/App.tsx`. This audit covered the route table and static route serving for each primary route.

| Route            | Page/component                              | Navigation label          | Primary feature intent                                          | Smoke result                                                                               |
| ---------------- | ------------------------------------------- | ------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `/`              | `DashboardPage`                             | Overview                  | Executive budget/event overview                                 | SPA shell served `200`.                                                                    |
| `/budget-final`  | `BudgetPage` with `/api/budget-items-final` | Budget Items (Final)      | Current budget table, edits, flags, comments, final budget data | SPA shell served `200`.                                                                    |
| `/budget`        | `LegacyBudgetRoute` / `BudgetPage`          | Budget Items (Vieja)      | Legacy budget view, restricted in UI to C2 LABS                 | SPA shell served `200`; client redirect/role behavior requires authenticated browser test. |
| `/agenda`        | `AgendaPage`                                | Agenda                    | Agenda sections by key                                          | SPA shell served `200`.                                                                    |
| `/voluntarios`   | `VoluntariosPage`                           | Voluntarios               | Volunteer role roster and assignments                           | SPA shell served `200`.                                                                    |
| `/espacios`      | `EspaciosPage`                              | Espacios                  | Venue/space definitions and capacities                          | SPA shell served `200`.                                                                    |
| `/travel/ground` | `GroundTransportPage`                       | Ground Transport          | Ground transportation budget/data view                          | SPA shell served `200`.                                                                    |
| `/travel/aerial` | `AerialTransportPage`                       | Flights / Vuelos SAL      | Flight arrivals/departures state                                | SPA shell served `200`.                                                                    |
| `/travel`        | Redirect                                    | n/a                       | Redirect to ground transport                                    | Route configured; direct static smoke returns SPA shell.                                   |
| `/hotel`         | `HotelPage`                                 | Hotel / Acomodaciones SAL | Hotel accommodation state and flight-derived hotel context      | SPA shell served `200`.                                                                    |
| `/montaje`       | `MontajePage`                               | Montaje / Desmontaje      | Setup/teardown schedule entries                                 | SPA shell served `200`.                                                                    |
| `/coctel`        | `CoctelPage`                                | Networking Cocktail Day 2 | Networking cocktail state                                       | SPA shell served `200`.                                                                    |
| `/bar-bebidas`   | `BarBebidasPage`                            | Bar & Bebidas             | Deprecated/derived bar & beverage budget page                   | SPA shell served `200`.                                                                    |
| `/lunch`         | `LunchPage`                                 | Lunch & Coffee Breaks     | Deprecated/derived lunch/coffee-break budget page               | SPA shell served `200`.                                                                    |
| `/sponsors`      | `SponsorsPage`                              | Sponsors & Cash           | Sponsor commitments and scenario                                | SPA shell served `200`.                                                                    |
| `/history`       | `HistoryPage`                               | Historial                 | Audit-log history                                               | SPA shell served `200`.                                                                    |
| `/tasks`         | `TasksBoardPage`                            | Mis Tareas                | Task board and generated validation tasks                       | SPA shell served `200`.                                                                    |
| Unknown route    | `NotFound` client route                     | n/a                       | SPA fallback / client-side 404 handling                         | Server returns SPA shell `200`, expected for SPA fallback.                                 |

### 2.2 API routers and endpoints

Routers are mounted in `artifacts/api-server/src/routes/index.ts`. `healthRouter` and `authRouter` intentionally remain available before the authenticated-session middleware. Every router mounted after the middleware requires `req.session.userId`.

| Endpoint                                    | Method(s)     | Router                   | Auth requirement                          | Permission / behavior reviewed                                                                            |
| ------------------------------------------- | ------------- | ------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/api/healthz`                              | GET           | `health.ts`              | Public                                    | Health check returns parsed `{ status: "ok" }`.                                                           |
| `/api/auth/login`                           | POST          | `auth.ts`                | Public                                    | Validates email/password, populates session fields. Needs DB for full login test.                         |
| `/api/auth/logout`                          | POST          | `auth.ts`                | Public route, session-aware               | Destroys session and clears matching cookie options.                                                      |
| `/api/auth/me`                              | GET           | `auth.ts`                | Public route, returns 401 when no session | Smoke-tested unauthenticated `401`.                                                                       |
| `/api/budget-items`                         | GET/PUT/PATCH | `budget.ts`              | Central session required                  | C2 LABS edit/comment; OPINNO comment-only; AURORA360 no changes. Legacy route runs backfills on GET.      |
| `/api/budget-items-final`                   | GET/PUT/PATCH | `budget.ts`              | Central session required                  | Same permission model as budget; final app-state key.                                                     |
| `/api/users`                                | GET           | `budget.ts`              | Central session required                  | User list for assignment/edit UI.                                                                         |
| `/api/sponsors`                             | GET/PUT       | `sponsors.ts`            | Central session required                  | Reads require session; C2 LABS-only edits.                                                                |
| `/api/sponsors/scenario`                    | PUT           | `sponsors.ts`            | Central session required                  | C2 LABS-only scenario edits.                                                                              |
| `/api/audit-log`                            | GET           | `audit.ts`               | Central session required                  | Session org required by route as well.                                                                    |
| `/api/agenda/:key`                          | GET/PUT       | `agenda.ts`              | Central session required                  | Key validation; C2 LABS-only edits.                                                                       |
| `/api/sub-events`                           | GET/PUT       | `sub-events.ts`          | Central session required                  | C2 LABS-only edits; seed/backfill behavior reviewed statically.                                           |
| `/api/flights-state`                        | GET/PUT       | `flights.ts`             | Central session required                  | C2/OPINNO/AURORA can read; C2 LABS-only writes.                                                           |
| `/api/hotel-state`                          | GET/PUT       | `hotel.ts`               | Central session required                  | Reads protected by central middleware; route-level auth on PUT. Full role behavior needs staging DB test. |
| `/api/networking-cocktail-d2`               | GET/PUT       | `networking-cocktail.ts` | Central session required                  | Reads protected by central middleware; route-level auth on PUT. Full role behavior needs staging DB test. |
| `/api/tasks-board`                          | GET/PUT       | `tasks-board.ts`         | Central session required                  | Route also performs auth helper; task state validation with Zod.                                          |
| `/api/tasks-board/seed-flagged-items`       | POST          | `tasks-board.ts`         | Central session required                  | Task-generation endpoint; C2 LABS constraints reviewed statically where present.                          |
| `/api/tasks-board/seed-multiday-validation` | POST          | `tasks-board.ts`         | Central session required                  | Explicit C2 LABS-only guard.                                                                              |
| `/api/spaces`                               | GET/PUT       | `spaces.ts`              | Central session required                  | C2 LABS-only edits.                                                                                       |
| `/api/montaje-entries`                      | GET/PUT       | `montaje.ts`             | Central session required                  | C2 LABS-only edits.                                                                                       |
| `/api/volunteers`                           | GET/PUT       | `volunteers.ts`          | Central session required                  | C2 LABS-only edits; volunteer extraction/backfill reviewed statically.                                    |

## 3. Role and permission audit

### 3.1 Frontend role model

The frontend permission helper maps organizations as follows:

| Organization    | UI permission label | UI can edit | UI can comment | UI can view |
| --------------- | ------------------- | ----------- | -------------- | ----------- |
| C2 LABS         | Editor              | Yes         | Yes            | Yes         |
| OPINNO          | Commenter           | No          | Yes            | Yes         |
| AURORA360       | Viewer              | No          | No             | Yes         |
| Unknown/default | Viewer              | No          | No             | Yes         |

### 3.2 Backend write-permission model

| Feature             | C2 LABS                                                                         | OPINNO                                  | AURORA360  | Notes                                                                                         |
| ------------------- | ------------------------------------------------------------------------------- | --------------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Budget PUT/PATCH    | Edit/comment                                                                    | Comment-only when `commentOnly` is true | No changes | Server enforces edit vs comment mode.                                                         |
| Agenda              | Edit                                                                            | Read-only                               | Read-only  | Key allowlist enforced.                                                                       |
| Sponsors            | Edit                                                                            | Read-only                               | Read-only  | Scenario write is also C2-only.                                                               |
| Sub-events          | Edit                                                                            | Read-only                               | Read-only  | Server-side edit guard.                                                                       |
| Flights             | Edit/read                                                                       | Read-only                               | Read-only  | Route includes read permission table.                                                         |
| Hotel               | Authenticated writes currently accepted by route-level check if `userId` exists | Same                                    | Same       | Needs product decision: should hotel writes be C2-only like most operational modules?         |
| Networking cocktail | Authenticated writes currently accepted by route-level check if `userId` exists | Same                                    | Same       | Needs product decision: should cocktail writes be C2-only?                                    |
| Tasks board         | Authenticated read/write helper                                                 | Same                                    | Same       | Some seed endpoints add C2-only guard; general board write policy needs product confirmation. |
| Spaces              | Edit                                                                            | Read-only                               | Read-only  | Server-side edit guard.                                                                       |
| Montaje             | Edit                                                                            | Read-only                               | Read-only  | Server-side edit guard.                                                                       |
| Volunteers          | Edit                                                                            | Read-only                               | Read-only  | Server-side edit guard.                                                                       |

## 4. Runtime and smoke-test results

### 4.1 Static frontend smoke

Command family used:

```sh
PORT=4173 pnpm --dir artifacts/cost-portal run serve
curl http://127.0.0.1:4173/<route>
```

Routes checked: `/`, `/budget-final`, `/agenda`, `/voluntarios`, `/espacios`, `/travel/ground`, `/travel/aerial`, `/hotel`, `/montaje`, `/coctel`, `/sponsors`, `/history`, `/tasks`, and `/not-a-route`.

Expected/observed result: HTTP `200` with the Vite-built SPA shell for each route. The unknown route also returns the shell, which is normal for SPA fallback; client-side routing owns the rendered 404.

### 4.2 API unauthenticated smoke

Command family used:

```sh
DATABASE_URL='postgresql://user:pass@127.0.0.1:9/db' PORT=8090 NODE_ENV=development pnpm --dir artifacts/api-server run start
curl http://127.0.0.1:8090/api/<endpoint>
```

Observed statuses:

| Endpoint                  | Expected              | Observed                                  |
| ------------------------- | --------------------- | ----------------------------------------- |
| `/api/healthz`            | `200`                 | `200 {"status":"ok"}`                     |
| `/api/auth/me`            | `401` without session | `401 {"user":null}`                       |
| `/api/hotel-state`        | `401` without session | `401 {"error":"Authentication required"}` |
| `/api/spaces`             | `401` without session | `401 {"error":"Authentication required"}` |
| `/api/volunteers`         | `401` without session | `401 {"error":"Authentication required"}` |
| `/api/budget-items-final` | `401` without session | `401 {"error":"Authentication required"}` |
| `/api/tasks-board`        | `401` without session | `401 {"error":"Authentication required"}` |

Note: the intentionally invalid DB URL avoids touching production data and is enough to prove that the new central session middleware rejects unauthenticated data calls before app-state loaders run.

## 5. Checks run

| Check                                                                                  | Result              | Notes                                                                                                  |
| -------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm exec prettier --check artifacts/api-server/src/routes/index.ts docs/QA_AUDIT.md` | Pass                | Changed files use Prettier style.                                                                      |
| `pnpm run typecheck`                                                                   | Pass                | Workspace TypeScript typecheck completed.                                                              |
| `pnpm run build`                                                                       | Pass with warnings  | API, Cost Portal, and mockup builds completed. Cost Portal emitted sourcemap/chunk-size warnings only. |
| `pnpm audit --audit-level moderate`                                                    | Environment-blocked | npm audit endpoint returned `403 Forbidden`; rerun from CI/dev network.                                |
| Frontend Vite preview route smoke                                                      | Pass                | All primary SPA URLs returned built shell.                                                             |
| API unauthenticated smoke                                                              | Pass                | Health/auth bootstrap and protected-route gating behaved as expected.                                  |

## 6. Findings

### 6.1 Fixed during audit

1. **Central auth gate added for data routers.** Previously, read-side auth was uneven across individual routers, meaning some data endpoints could reach route handlers without a session. The router index now mounts health/auth first, then a `requireAuthenticatedSession` middleware, then all data routers.

### 6.2 Remaining product/security questions

These are not necessarily code defects, but they should be confirmed before production sign-off:

1. **Hotel write permissions**: `PUT /api/hotel-state` currently requires any authenticated user, while many operational modules restrict writes to C2 LABS.
2. **Networking cocktail write permissions**: `PUT /api/networking-cocktail-d2` currently requires any authenticated user.
3. **Tasks board general writes**: `PUT /api/tasks-board` accepts any authenticated user; specific seed endpoint `/seed-multiday-validation` has a C2-only guard.
4. **Seed users in source code**: seeded credentials are present in `auth.ts`. Confirm this is intentional for the deployment model, rotate if needed, and prefer environment-managed bootstrap credentials for production.
5. **Session secret fallback**: production should always provide `SESSION_SECRET`; the fallback is suitable only for dev/test.
6. **Audit-log scope**: `/api/audit-log` is readable by any authenticated org. Confirm if all organizations should see all audit entries or if org/entity filtering is required.

### 6.3 Build/performance warnings

1. Vite reports sourcemap original-location warnings for some UI files. Build completes.
2. Cost Portal bundle includes a chunk above 500 kB. Consider code splitting for heavy pages if startup performance becomes an issue.

## 7. Exhaustive manual QA checklist for staging

Run this against a disposable/staging database with fresh seed data and three users: C2 LABS, OPINNO, AURORA360.

### 7.1 Authentication and session

- [ ] Login succeeds for a valid C2 LABS user.
- [ ] Login succeeds for a valid OPINNO user.
- [ ] Login succeeds for a valid AURORA360 user.
- [ ] Invalid email/password shows a safe error and does not create a session.
- [ ] Refresh preserves session.
- [ ] Logout destroys session and redirects/shows login.
- [ ] After logout, direct API calls to data routes return `401`.
- [ ] Session cookie attributes are correct in production: `Secure`, `HttpOnly`, `SameSite=None`.
- [ ] Session cookie attributes are workable in local HTTP development: `HttpOnly`, `SameSite=Lax`, not `Secure`.

### 7.2 Navigation and layout

- [ ] Every nav item opens the expected page.
- [ ] Mobile menu opens/closes and links navigate correctly.
- [ ] Deprecated pages are visibly marked.
- [ ] Legacy `/budget` is visible/usable only for C2 LABS and redirects non-C2 users to `/budget-final`.
- [ ] Unknown routes render the client 404 page.
- [ ] Presenting-partners image loads from the configured base path.

### 7.3 Budget final

- [ ] Initial load shows budget rows or an intentional empty state.
- [ ] Search/filter controls update visible rows correctly.
- [ ] Column visibility controls persist or reset as designed.
- [ ] Summary totals match row-level calculations.
- [ ] C2 LABS can edit text, numeric fields, taxonomy, flags, reviewed status, links, and spaces.
- [ ] C2 LABS edits persist after refresh.
- [ ] OPINNO can edit comment fields only and cannot change numeric/cost/taxonomy fields.
- [ ] AURORA360 cannot edit fields.
- [ ] Add/delete/bulk actions are hidden or disabled for non-editors.
- [ ] Patch saves update audit metadata.
- [ ] Invalid numeric input is rejected or normalized consistently.
- [ ] Final budget and legacy budget use the correct API keys and do not overwrite each other.

### 7.4 Agenda

- [ ] Every valid agenda key loads: `lanzamiento`, `evento`, `evento-dia-1`, `evento-dia-2`, `completa`.
- [ ] Invalid agenda key returns `400`.
- [ ] C2 LABS can edit agenda rows and persist changes.
- [ ] OPINNO/AURORA360 cannot save agenda changes.
- [ ] Empty agenda state is clear and recoverable.

### 7.5 Spaces

- [ ] Spaces list loads with expected seed/backfill data.
- [ ] Add space persists.
- [ ] Rename space persists and updates dependent UI where expected.
- [ ] Capacity edits persist and validate numeric values.
- [ ] Remove space behavior is confirmed and safe.
- [ ] Non-C2 users cannot mutate spaces.

### 7.6 Volunteers

- [ ] Volunteer roster loads.
- [ ] Volunteer extraction from budget is idempotent.
- [ ] Role headcounts and assignments render correctly.
- [ ] Add/update/remove assignment persists.
- [ ] Open/confirmed status changes persist.
- [ ] Non-C2 users cannot mutate volunteer roster.
- [ ] Budget totals are unchanged by volunteer role extraction.

### 7.7 Flights / aerial transport

- [ ] Flight state loads.
- [ ] Arrival/departure fields render correctly.
- [ ] C2 LABS can save flight edits.
- [ ] OPINNO/AURORA360 can read but cannot save.
- [ ] Invalid flight payloads are rejected.
- [ ] Hotel page correctly consumes flight context if applicable.

### 7.8 Hotel

- [ ] Hotel state loads.
- [ ] Room/group/guest edits behave as designed.
- [ ] Save persists and survives refresh.
- [ ] Permission policy is confirmed and enforced.
- [ ] Print view renders readable output.
- [ ] Flight-derived hotel context does not crash when flight data is empty.

### 7.9 Montaje

- [ ] Montaje entries load.
- [ ] C2 LABS can save schedule/entry edits.
- [ ] OPINNO/AURORA360 cannot save.
- [ ] Date/time/order fields render consistently.
- [ ] Empty state is usable.

### 7.10 Networking cocktail / bar / lunch

- [ ] Networking cocktail state loads.
- [ ] Save behavior matches confirmed permission policy.
- [ ] Bar & Bebidas deprecated page renders correct derived data.
- [ ] Lunch & Coffee Breaks deprecated page renders correct derived data.
- [ ] No deprecated page can overwrite final budget unexpectedly.

### 7.11 Sponsors

- [ ] Sponsors load.
- [ ] C2 LABS can edit sponsor rows.
- [ ] Scenario edits persist.
- [ ] OPINNO/AURORA360 cannot save sponsor/scenario changes.
- [ ] Totals and cash/in-kind classifications are correct.

### 7.12 Tasks board

- [ ] Tasks load.
- [ ] Create/edit/status changes persist.
- [ ] Linked budget item details render.
- [ ] Seed flagged-items endpoint creates expected tasks only once.
- [ ] Seed multiday-validation endpoint is C2-only.
- [ ] Permission policy for general task edits is confirmed and enforced.
- [ ] Large task lists remain usable.

### 7.13 History / audit log

- [ ] Audit log loads after authenticated edits.
- [ ] Entity type filter works.
- [ ] Changed field, old value, new value, actor, org, and timestamp are correct.
- [ ] Unauthorized users cannot read if product requires restricted audit visibility.
- [ ] Limit parameter caps at expected maximum.

### 7.14 Cross-cutting negative tests

- [ ] Unauthenticated GET/PUT/PATCH/POST to all data routes returns `401`.
- [ ] Authenticated unauthorized writes return `403`, not silent success.
- [ ] Malformed payloads return `400` where schemas exist.
- [ ] Concurrent saves do not drop data unexpectedly.
- [ ] Large payloads respect configured Express limits.
- [ ] Refresh after every save displays persisted server state, not stale local state.
- [ ] Network failure displays user-visible error and does not corrupt local UI state.

## 8. Recommended automation follow-up

1. Add Playwright or similar browser smoke tests for login, route navigation, role visibility, and one representative save flow per major module.
2. Add API integration tests with a disposable Postgres/Neon-compatible test database.
3. Add route-permission contract tests that assert `401`, `403`, and `200` for every endpoint/role combination.
4. Add bundle-size tracking for Cost Portal chunks.
5. Run `pnpm audit` in CI from an environment with registry audit access.

## 9. Release recommendation

The app is buildable and passes unauthenticated smoke/security gating checks in this environment. It should not be considered fully QA-approved until authenticated role-based browser/API flows are run against a staging database, especially for modules whose write policy needs product confirmation: hotel, networking cocktail, and the general tasks board.
