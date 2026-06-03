---
name: app_state route auth convention
description: How GET vs write auth is gated on cost-portal app_state catalog routes (budget, spaces, etc.)
---

# app_state route auth convention

Read endpoints (`GET`) for app_state-backed catalogs are **public** — no session check. Only writes (`PUT`/`PATCH`) check the session org against `ORG_PERMISSIONS` (C2 LABS edits; OPINNO comment-only; AURORA360 none).

**Why:** The frontend loads data on mount before any auth-context guarantees, and the budget route established this pattern. A new GET that requires auth returns `{"error":"Authentication required"}` and silently breaks the load/seed path in the SPA even though the user appears logged in.

**How to apply:** When adding a new app_state catalog route, mirror `routes/budget.ts`: public GET (do seeding/defaults here), permission-gated writes. Do not add a `session.userId` check on GET.

Note: session cookies are only set over the browser's HTTPS proxy; plain `curl` login returns 200 with no Set-Cookie, so you cannot exercise authenticated endpoints from bash. Test GET (public) via curl; test writes in-browser.
