import { useState, useEffect, useRef, useCallback } from "react";
import type { BudgetItem } from "@/data/budgetData";

const DEFAULT_API_URL = "/api/budget-items";
const SEED_VERSION = "2026-04-10T07:30:00Z";
const POLL_INTERVAL_MS = 5000;

export interface BudgetMeta {
  lastEditedBy: string;
  lastEditedByEmail: string;
  lastEditedByOrg: string;
  lastEditedAt: string;
  /** Monotonic revision counter from the server. */
  rev?: number;
}

/** Granular structural operations applied atomically on the server. */
export interface BudgetBatch {
  adds?: BudgetItem[];
  deletes?: string[];
  sets?: BudgetItem[];
}

export interface BudgetApiOptions {
  /** Endpoint to read/write from. Defaults to the legacy budget endpoint. */
  apiUrl?: string;
  /**
   * Whether to sync from the bundled seed-data.json when the server is empty
   * or outdated. The "Final" budget starts empty, so it disables this.
   */
  syncSeed?: boolean;
  /** Current user's email — used to suppress "updated by" notices for own edits. */
  currentUserEmail?: string;
  /**
   * Called when another user's change is detected and the local items have
   * been refreshed from the server. Lets the page show a discreet notice.
   * `changedIds` lists the item ids whose values changed (or were added) in
   * this refresh, so the page can briefly highlight those specific rows.
   */
  onRemoteRefresh?: (meta: BudgetMeta, changedIds: string[]) => void;
}

export function useBudgetApi(
  fallbackItems: BudgetItem[],
  recalcFn?: (item: BudgetItem) => BudgetItem,
  options?: BudgetApiOptions
): {
  items: BudgetItem[];
  setItems: (value: BudgetItem[] | ((prev: BudgetItem[]) => BudgetItem[])) => void;
  loading: boolean;
  saving: boolean;
  lastSaved: Date | null;
  error: string | null;
  meta: BudgetMeta | null;
  saveCommentOnly: (items: BudgetItem[]) => void;
  patchItem: (id: string, field: string, value: any, commentOnly?: boolean) => void;
  saveFull: (items: BudgetItem[]) => void;
  applyBatch: (batch: BudgetBatch) => void;
} {
  const apiUrl = options?.apiUrl ?? DEFAULT_API_URL;
  const syncSeed = options?.syncSeed ?? true;
  const currentUserEmail = options?.currentUserEmail ?? "";
  const onRemoteRefreshRef = useRef(options?.onRemoteRefresh);
  onRemoteRefreshRef.current = options?.onRemoteRefresh;

  const [items, setItemsState] = useState<BudgetItem[]>(fallbackItems);
  // Always-current snapshot of items, used to diff against a freshly fetched
  // server array without depending on the async-scheduled state value.
  const itemsRef = useRef<BudgetItem[]>(fallbackItems);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<BudgetMeta | null>(null);
  const initialLoadDone = useRef(false);
  // Pending debounced field patches: key `${id}:${field}` -> timer + value, so
  // a live refresh can re-apply not-yet-flushed local edits on top of server data.
  const pendingPatches = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; id: string; field: string; value: any }>>(new Map());
  const savingCount = useRef(0);
  // Highest revision we know the server is at because of our own writes. Polling
  // compares the server's rev against this to detect other users' changes.
  const revRef = useRef<number>(0);
  // Count of in-flight structural writes; skip live refresh while we are mid-write
  // so a poll doesn't transiently revert our optimistic update.
  const inFlightWrites = useRef(0);

  function recordRev(m: BudgetMeta | null | undefined) {
    if (m && typeof m.rev === "number" && m.rev > revRef.current) {
      revRef.current = m.rev;
    }
  }

  // Keep itemsRef in lockstep with React state so diffs always see the latest.
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Ids whose serialized value changed (or that are newly present) between the
  // previous local items and a freshly fetched server array.
  function diffChangedIds(oldItems: BudgetItem[], newItems: BudgetItem[]): string[] {
    const oldById = new Map(oldItems.map((it) => [it.id, it]));
    const changed: string[] = [];
    for (const it of newItems) {
      const prev = oldById.get(it.id);
      if (!prev) {
        changed.push(it.id);
        continue;
      }
      if (JSON.stringify(prev) !== JSON.stringify(it)) changed.push(it.id);
    }
    return changed;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.meta) { setMeta(data.meta); recordRev(data.meta); }
          const hasServerItems = data.items && Array.isArray(data.items) && data.items.length > 0;

          // When seed sync is disabled (e.g. the "Final" budget), never pull
          // from seed-data.json: just use whatever the server has, or start empty.
          if (!syncSeed) {
            const recalced = hasServerItems
              ? (recalcFn ? data.items.map(recalcFn) : data.items)
              : (recalcFn ? fallbackItems.map(recalcFn) : fallbackItems);
            setItemsState(recalced);
            initialLoadDone.current = true;
            setLoading(false);
            return;
          }

          if (hasServerItems) {
            // The server (DB) is the source of truth. Never overwrite stored
            // items from the bundled seed — doing so would wipe manual edits
            // such as sub-event assignments. The seed is only used to populate
            // an empty DB (the branch below).
            const recalced = recalcFn ? data.items.map(recalcFn) : data.items;
            setItemsState(recalced);
          } else {
            try {
              const seedRes = await fetch(import.meta.env.BASE_URL + "seed-data.json");
              if (seedRes.ok) {
                const seedItems = await seedRes.json();
                if (Array.isArray(seedItems) && seedItems.length > 0) {
                  const recalced = recalcFn ? seedItems.map(recalcFn) : seedItems;
                  await saveFullToServer(recalced);
                  setItemsState(recalced);
                  localStorage.setItem("seed-version-applied", SEED_VERSION);
                  initialLoadDone.current = true;
                  setLoading(false);
                  return;
                }
              }
            } catch (seedErr) {
              console.warn("Could not load seed data:", seedErr);
            }
            await saveFullToServer(fallbackItems);
          }
          initialLoadDone.current = true;
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load budget data from server:", err);
          setError("Failed to load from server, using local data");
          initialLoadDone.current = true;
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-apply not-yet-flushed local field patches on top of a freshly fetched
  // server array, so a live refresh never drops an edit in progress.
  function mergePendingPatches(serverItems: BudgetItem[]): BudgetItem[] {
    if (pendingPatches.current.size === 0) return serverItems;
    const byId = new Map<string, { field: string; value: any }[]>();
    for (const { id, field, value } of pendingPatches.current.values()) {
      const arr = byId.get(id) ?? [];
      arr.push({ field, value });
      byId.set(id, arr);
    }
    return serverItems.map((it) => {
      const patches = byId.get(it.id);
      if (!patches) return it;
      let merged: any = { ...it };
      for (const { field, value } of patches) merged[field] = value;
      return recalcFn ? recalcFn(merged) : merged;
    });
  }

  // Pull the latest items from the server and replace local state (merging any
  // pending local patches). Used by live-refresh polling and on conflict.
  async function refreshFromServer(notifyRemote: boolean) {
    const res = await fetch(apiUrl, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.meta) { setMeta(data.meta); recordRev(data.meta); }
    const serverItems: BudgetItem[] = Array.isArray(data.items) ? data.items : [];
    const recalced = recalcFn ? serverItems.map(recalcFn) : serverItems;
    const merged = mergePendingPatches(recalced);
    const changedIds = diffChangedIds(itemsRef.current, merged);
    itemsRef.current = merged;
    setItemsState(merged);
    if (
      notifyRemote &&
      data.meta &&
      data.meta.lastEditedByEmail &&
      data.meta.lastEditedByEmail !== currentUserEmail
    ) {
      onRemoteRefreshRef.current?.(data.meta, changedIds);
    }
  }

  // Live-refresh polling: ask the server for its current revision; if it has
  // advanced past what our own writes produced, another editor changed the
  // budget — reload and (when it's someone else) surface a discreet notice.
  useEffect(() => {
    const tick = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (!initialLoadDone.current) return;
      if (inFlightWrites.current > 0) return;
      try {
        const res = await fetch(`${apiUrl}/rev`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const serverRev = typeof data.rev === "number" ? data.rev : 0;
        if (serverRev > revRef.current) {
          await refreshFromServer(true);
        }
      } catch {
        // ignore transient polling errors
      }
    };
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [apiUrl, currentUserEmail]);

  async function saveFullToServer(data: BudgetItem[], commentOnly = false) {
    try {
      savingCount.current++;
      inFlightWrites.current++;
      setSaving(true);
      const res = await fetch(apiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: data, commentOnly, baseRev: revRef.current }),
      });
      if (res.status === 409) {
        // Someone else advanced the document — reload the latest instead of
        // overwriting, and notify the user.
        const errData = await res.json().catch(() => ({}));
        if (errData.meta) { setMeta(errData.meta); recordRev(errData.meta); }
        await refreshFromServer(true).catch(() => {});
        setError(null);
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      if (result.meta) { setMeta(result.meta); recordRev(result.meta); }
      setLastSaved(new Date());
      setError(null);
    } catch (err: any) {
      console.error("Failed to save budget data:", err);
      setError(err.message || "Failed to save");
    } finally {
      savingCount.current--;
      inFlightWrites.current = Math.max(0, inFlightWrites.current - 1);
      if (savingCount.current <= 0) {
        savingCount.current = 0;
        setSaving(false);
      }
    }
  }

  async function applyBatchToServer(batch: BudgetBatch) {
    try {
      savingCount.current++;
      inFlightWrites.current++;
      setSaving(true);
      const res = await fetch(`${apiUrl}/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      if (result.meta) { setMeta(result.meta); recordRev(result.meta); }
      setLastSaved(new Date());
      setError(null);
    } catch (err: any) {
      console.error("Failed to apply budget batch:", err);
      setError(err.message || "Failed to save");
    } finally {
      savingCount.current--;
      inFlightWrites.current = Math.max(0, inFlightWrites.current - 1);
      if (savingCount.current <= 0) {
        savingCount.current = 0;
        setSaving(false);
      }
    }
  }

  const lastSavedRef = useRef<number>(0);

  async function patchFieldOnServer(id: string, field: string, value: any, commentOnly = false) {
    try {
      const res = await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, field, value, commentOnly }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      if (result.meta) recordRev(result.meta);
      const now = Date.now();
      if (now - lastSavedRef.current > 5000) {
        lastSavedRef.current = now;
        if (result.meta) setMeta(result.meta);
        setLastSaved(new Date(now));
      }
      if (error) setError(null);
    } catch (err: any) {
      console.error("Failed to patch field:", err);
      setError(err.message || "Failed to save");
    }
  }

  const patchItem = useCallback((id: string, field: string, value: any, commentOnly = false) => {
    setItemsState(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
    const key = `${id}:${field}`;
    const existing = pendingPatches.current.get(key);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => {
      pendingPatches.current.delete(key);
      patchFieldOnServer(id, field, value, commentOnly);
    }, 0);
    pendingPatches.current.set(key, { timer, id, field, value });
  }, []);

  const setItems = useCallback(
    (value: BudgetItem[] | ((prev: BudgetItem[]) => BudgetItem[])) => {
      setItemsState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        return next;
      });
    },
    []
  );

  const saveFull = useCallback((data: BudgetItem[]) => {
    if (initialLoadDone.current) {
      saveFullToServer(data);
    }
  }, []);

  const applyBatch = useCallback((batch: BudgetBatch) => {
    if (!initialLoadDone.current) return;
    const hasOps =
      (batch.adds && batch.adds.length) ||
      (batch.deletes && batch.deletes.length) ||
      (batch.sets && batch.sets.length);
    if (!hasOps) return;
    applyBatchToServer(batch);
  }, []);

  const saveCommentOnly = useCallback((data: BudgetItem[]) => {
    setItemsState(data);
  }, []);

  return { items, setItems, loading, saving, lastSaved, error, meta, saveCommentOnly, patchItem, saveFull, applyBatch };
}
