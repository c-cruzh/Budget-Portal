# QA Audit — Budget Portal

Date: 2026-06-03

## Scope

This audit covered the monorepo build pipeline, TypeScript checks, Vite production bundles, API route exposure, unauthenticated smoke checks, and static route serving for the main Cost Portal application.

## Features reviewed

| Area                         | Frontend surface                    | API surface                                           | Result                                                                               |
| ---------------------------- | ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Authentication               | Login gate and session bootstrap    | `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` | Basic unauthenticated behavior verified; protected features require a valid session. |
| Dashboard / budget overview  | `/`                                 | Budget APIs                                           | Static route serves the app shell. Data access is session-protected.                 |
| Budget final / legacy budget | `/budget-final`, `/budget`          | `/api/budget-items-final`, `/api/budget-items`        | Static routes serve the app shell. Data access is session-protected.                 |
| Agenda                       | `/agenda`                           | `/api/agenda/:key`                                    | Static route serves the app shell. Data access is session-protected.                 |
| Volunteers                   | `/voluntarios`                      | `/api/volunteers`                                     | Static route serves the app shell. Data access is session-protected.                 |
| Spaces                       | `/espacios`                         | `/api/spaces`                                         | Static route serves the app shell. Data access is session-protected.                 |
| Transport                    | `/travel/ground`, `/travel/aerial`  | `/api/flights-state`, budget-derived transport data   | Static routes serve the app shell. Data access is session-protected.                 |
| Hotel                        | `/hotel`                            | `/api/hotel-state`                                    | Static route serves the app shell. Data access is session-protected.                 |
| Montaje                      | `/montaje`                          | `/api/montaje-entries`                                | Static route serves the app shell. Data access is session-protected.                 |
| Cocktail / food & beverage   | `/coctel`, `/bar-bebidas`, `/lunch` | `/api/networking-cocktail-d2`, budget-derived pages   | Static routes serve the app shell. Data access is session-protected.                 |
| Sponsors                     | `/sponsors`                         | `/api/sponsors`, `/api/sponsors/scenario`             | Static route serves the app shell. Data access is session-protected.                 |
| History / audit log          | `/history`                          | `/api/audit-log`                                      | Static route serves the app shell. Data access is session-protected.                 |
| Tasks board                  | `/tasks`                            | `/api/tasks-board` and task seed endpoints            | Static route serves the app shell. Data access is session-protected.                 |

## Checks run

- `pnpm exec prettier --check artifacts/api-server/src/routes/index.ts docs/QA_AUDIT.md`
- `pnpm run typecheck`
- `pnpm run build`
- `pnpm audit --audit-level moderate`
- `pnpm --dir artifacts/cost-portal run serve`
- Static route smoke checks with `curl` against `/`, `/budget-final`, `/agenda`, `/voluntarios`, `/espacios`, `/travel/ground`, `/travel/aerial`, `/hotel`, `/montaje`, `/coctel`, `/sponsors`, `/history`, `/tasks`, and an unknown route.
- API smoke checks with `curl` against `/api/healthz`, `/api/auth/me`, and protected data endpoints.

## Findings

### Fixed in this audit

1. Several data routes were directly reachable without an authenticated session because only some individual route files performed read-side auth checks. A central authenticated-session middleware now protects every data router mounted after health/auth routes.

### Passing

- Formatting passed for recently modified files.
- TypeScript typecheck passed across workspace projects.
- Full workspace build passed for libraries, API server, cost portal, and mockup sandbox.
- Vite preview served the SPA shell for all main frontend routes tested.
- `/api/healthz` returned `200` with `{"status":"ok"}`.
- `/api/auth/me` returned `401` for an unauthenticated request.
- Protected data routes return `401` before reaching data loaders when no session is present.

### Warnings / limitations

- `pnpm audit --audit-level moderate` could not complete because the npm audit endpoint returned `403 Forbidden` from this environment.
- API data-read/write behavior with real seeded database content was not fully exercised because no `DATABASE_URL` was available in the environment. The API smoke test used an intentionally invalid local database URL only to validate routing, health, and auth gating behavior without touching production data.
- The production Cost Portal bundle still emits Vite warnings for sourcemap location resolution in a few UI dependency files and a large JavaScript chunk warning. These are warnings, not build failures.

## Recommended next QA pass

1. Run authenticated browser smoke tests against a disposable/staging database using one user from each organization: C2 LABS, OPINNO, and AURORA360.
2. Validate role-specific behavior: editor writes, commenter-only updates, viewer read-only restrictions, and legacy budget visibility.
3. Exercise create/update flows for budget rows, tasks, sponsors, spaces, volunteers, agenda, hotel, montaje, flights, and cocktail pages.
4. Run dependency audit from an environment where the npm audit endpoint is accessible.
5. Consider adding automated Playwright smoke tests for login, navigation, role permissions, and representative save flows.
