import { useState, useEffect, useRef, useCallback } from "react";
import type { BudgetItem } from "@/data/budgetData";

const API_URL = "/api/budget-items";
const SAVE_DEBOUNCE_MS = 800;
const SEED_VERSION = "2026-04-09T17:50:00Z";

export function useBudgetApi(
  fallbackItems: BudgetItem[]
): {
  items: BudgetItem[];
  setItems: (value: BudgetItem[] | ((prev: BudgetItem[]) => BudgetItem[])) => void;
  loading: boolean;
  saving: boolean;
  lastSaved: Date | null;
  error: string | null;
} {
  const [items, setItemsState] = useState<BudgetItem[]>(fallbackItems);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestItems = useRef<BudgetItem[]>(fallbackItems);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.items && Array.isArray(data.items) && data.items.length > 0) {
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
                      await saveToServer(seedItems);
                      setItemsState(seedItems);
                      latestItems.current = seedItems;
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
            setItemsState(data.items);
            latestItems.current = data.items;
          } else {
            try {
              const seedRes = await fetch(import.meta.env.BASE_URL + "seed-data.json");
              if (seedRes.ok) {
                const seedItems = await seedRes.json();
                if (Array.isArray(seedItems) && seedItems.length > 0) {
                  await saveToServer(seedItems);
                  setItemsState(seedItems);
                  latestItems.current = seedItems;
                  localStorage.setItem("seed-version-applied", SEED_VERSION);
                  initialLoadDone.current = true;
                  setLoading(false);
                  return;
                }
              }
            } catch (seedErr) {
              console.warn("Could not load seed data:", seedErr);
            }
            await saveToServer(fallbackItems);
            latestItems.current = fallbackItems;
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

  async function saveToServer(data: BudgetItem[]) {
    try {
      setSaving(true);
      const res = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: data }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLastSaved(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to save budget data:", err);
      setError("Failed to save — retrying...");
    } finally {
      setSaving(false);
    }
  }

  const debouncedSave = useCallback((data: BudgetItem[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToServer(data);
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const setItems = useCallback(
    (value: BudgetItem[] | ((prev: BudgetItem[]) => BudgetItem[])) => {
      setItemsState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        latestItems.current = next;
        if (initialLoadDone.current) {
          debouncedSave(next);
        }
        return next;
      });
    },
    [debouncedSave]
  );

  return { items, setItems, loading, saving, lastSaved, error };
}
