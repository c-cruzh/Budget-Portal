---
name: Space media (photos/videos) storage
description: How uploaded photos/videos attach to Espacios — object storage refs only, normalized money-neutrally.
---

Each `SpaceEntry` (ESEN day entries + Venue entries) may carry `media?: SpaceMedia[]`,
where `SpaceMedia = { id, objectPath, kind: "photo"|"video", name? }`. Only the
object-storage `objectPath` (e.g. `/objects/uploads/<uuid>`) is stored in the spaces
catalog JSONB — never the bytes.

**Serving:** browser fetches `/api/storage${objectPath}`.

**Storage endpoint authz (must stay in lockstep with spaces write-gating):** the
generic object-storage scaffold ships its routes WIDE OPEN — `POST .../uploads/request-url`
has no session check and the private `GET .../objects/*` read protection is commented out.
For this permission-modeled app that is a real broken-access-control hole (anyone could
mint signed upload URLs / read private media). Decisions enforced here:
- Upload URL issuance is gated the same way as spaces writes: authenticated session +
  org `canEdit` (C2 LABS only). OPINNO/AURORA360 get 403.
- Upload requests are validated server-side (content-type must be `image/*` or `video/*`,
  size ≤ 200 MB) — client-side checks alone are bypassable.
- Private `GET .../objects/*` requires an authenticated session (any org may VIEW media),
  anonymous → 401.
**Why:** client-only gating + an unauthenticated signing endpoint = unauthorized storage
writes and cost/abuse risk; the storage scaffold's defaults do NOT match this app's auth model.

**Upload flow (client):** EspaciosPage uploads directly (request-url + a PUT with real
byte progress); it does NOT use the coarse `useUpload` hook from `@workspace/object-storage-web`.

**Normalization:** media is sanitized idempotently on BOTH server and client. Entries
lacking `objectPath` are dropped, ids de-duplicated, `kind` defaults to "photo". Media never
affects totals → follows the same money-neutral, totals-stable idempotency convention as
the rest of the spaces catalog.

**Why:** keeps the catalog payload small and avoids base64 bloat in app_state; mirrors
the existing spaces persistence (PUT /api/spaces debounced) without new endpoints.
