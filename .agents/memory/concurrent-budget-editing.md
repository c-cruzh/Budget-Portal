---
name: Concurrent budget editing model
description: How safe simultaneous Budget editing works (rev counter, atomic batch, optimistic lock, polling) and the constraints behind it.
---

# Concurrent budget editing (cost-portal)

The Budget (both legacy `/budget` and Budget Final `/budget-final`) supports
multiple simultaneous editors without lost updates. No WebSockets, no
single-editor lock, no char-by-char realtime — by design (out of scope).

## Model
- Each budget has a `rev` counter stored in its meta; every write bumps it.
- Structural mutations go through **POST {path}/batch** (adds/sets/deletes),
  applied atomically server-side under `pg_advisory_xact_lock(hashtext(itemsKey))`
  inside a `db.transaction` read-modify-write. Two editors touching *different*
  items compose without clobbering.
- Full-list **PUT** is optimistic-locked: client sends `baseRev`; server returns
  **409 + latest items/meta** on mismatch. PUT is reserved for the one-shot
  migration effect + seed/initial load only — do NOT route normal mutations
  through it.
- **GET {path}/rev** is a lightweight poll endpoint; client polls ~5s (skips when
  tab hidden or a write is in-flight) and refreshes when serverRev advances,
  showing a discreet "Actualizado por [nombre]" toast.

## Why
**Why:** old code saved the entire list on every structural action ("last write
wins"), so concurrent edits silently overwrote each other. Atomic per-change
batches + a rev counter fix that without realtime infra.

## How to apply / gotchas
- Any new structural Budget mutation must use `applyBatch`, never `saveFull`.
  Pattern: optimistic local `setItems`, capture changed/added/deleted item(s),
  then `applyBatch({ sets | adds | deletes })`.
- applyOps server order is **deletes → sets → adds**; set to a missing id is
  ignored, add with an existing id is skipped.
- The 409 response carries rev inside `meta` (read via metaRev), not as a
  top-level field — client recovers rev from `errData.meta`.
- Session cookie is `secure:true; sameSite:none`, so curl over `localhost:80`
  (http) can't authenticate. Test authed routes over `https://$REPLIT_DEV_DOMAIN`
  instead, where the Secure cookie persists.
