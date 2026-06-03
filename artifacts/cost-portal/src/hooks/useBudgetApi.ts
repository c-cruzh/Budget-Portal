import { useState, useEffect, useRef, useCallback } from "react";
import type { BudgetItem } from "@/data/budgetData";

const DEFAULT_API_URL = "/api/budget-items";
const SEED_VERSION = "2026-04-10T07:30:00Z";

export interface BudgetMeta {
  lastEditedBy: string;
  lastEditedByEmail: string;
  lastEditedByOrg: string;
  lastEditedAt: string;
}

export interface BudgetApiOptions {
  /** Endpoint to read/write from. Defaults to the legacy budget endpoint. */
  apiUrl?: string;
  /**
   * Whether to sync from the bundled seed-data.json when the server is empty
   * or outdated. The "Final" budget starts empty, so it disables this.
   */
  syncSeed?: boolean;
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
} {
  const apiUrl = options?.apiUrl ?? DEFAULT_API_URL;
  const syncSeed = options?.syncSeed ?? true;

  const [items, setItemsState] = useState<BudgetItem[]>(fallbackItems);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<BudgetMeta | null>(null);
  const initialLoadDone = useRef(false);
  const pendingPatches = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const savingCount = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.meta) setMeta(data.meta);
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
            const appliedVersion = localStorage.getItem("seed-version-applied");
            if (appliedVersion !== SEED_VERSION) {
              try {
                const seedRes = await fetch(import.meta.env.BASE_URL + "seed-data.json");
                if (seedRes.ok) {
                  const seedItems = await seedRes.json();
                  if (Array.isArray(seedItems) && seedItems.length > 0) {
                    const seedStr = JSON.stringify(seedItems);
                    const dbStr = JSON.stringify(data.items);
                    if (seedStr.length > dbStr.length) {
                      console.log("Seed data is newer, syncing to server...");
                      const recalcedSeed = recalcFn ? seedItems.map(recalcFn) : seedItems;
                      await saveFullToServer(recalcedSeed);
                      setItemsState(recalcedSeed);
                      localStorage.setItem("seed-version-applied", SEED_VERSION);
                      initialLoadDone.current = true;
                      setLoading(false);
                      return;
                    }
                  }
                }
              } catch (seedErr) {
                console.warn("Could not load seed data:", seedErr);
              }
              localStorage.setItem("seed-version-applied", SEED_VERSION);
            }
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

  async function saveFullToServer(data: BudgetItem[], commentOnly = false) {
    try {
      savingCount.current++;
      setSaving(true);
      const res = await fetch(apiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: data, commentOnly }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      if (result.meta) setMeta(result.meta);
      setLastSaved(new Date());
      setError(null);
    } catch (err: any) {
      console.error("Failed to save budget data:", err);
      setError(err.message || "Failed to save");
    } finally {
      savingCount.current--;
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
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      pendingPatches.current.delete(key);
      patchFieldOnServer(id, field, value, commentOnly);
    }, 0);
    pendingPatches.current.set(key, timer);
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

  const saveCommentOnly = useCallback((data: BudgetItem[]) => {
    setItemsState(data);
  }, []);

  return { items, setItems, loading, saving, lastSaved, error, meta, saveCommentOnly, patchItem, saveFull };
}
