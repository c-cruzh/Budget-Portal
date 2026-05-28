import { useState, useEffect, useRef, useCallback } from "react";

const API_URL = "/api/networking-cocktail-d2";

export interface NetworkingCocktailState {
  pax: number;
  transport: number;
  selections: Record<string, boolean>;
  notes: string;
}

export interface NetworkingCocktailMeta {
  lastEditedBy: string;
  lastEditedByEmail: string;
  lastEditedByOrg: string;
  lastEditedAt: string;
}

export function useNetworkingCocktailApi(initial: NetworkingCocktailState) {
  const [state, setStateInner] = useState<NetworkingCocktailState>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<NetworkingCocktailMeta | null>(null);
  const initialLoadDone = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingCount = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API_URL, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.meta) setMeta(data.meta);
        if (data.state && typeof data.state === "object") {
          setStateInner(mergeWithSeed(data.state, initial));
        }
      } catch (err) {
        console.error("Failed to load networking cocktail state:", err);
        setError("Failed to load from server, using local data");
      } finally {
        if (!cancelled) {
          initialLoadDone.current = true;
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveToServer(next: NetworkingCocktailState) {
    try {
      savingCount.current++;
      setSaving(true);
      const res = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ state: next }),
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
      console.error("Failed to save networking cocktail state:", err);
      setError(err.message || "Failed to save");
    } finally {
      savingCount.current--;
      if (savingCount.current <= 0) {
        savingCount.current = 0;
        setSaving(false);
      }
    }
  }

  const scheduleSave = useCallback((next: NetworkingCocktailState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (initialLoadDone.current) saveToServer(next);
    }, 800);
  }, []);

  const setState = useCallback((updater: NetworkingCocktailState | ((prev: NetworkingCocktailState) => NetworkingCocktailState)) => {
    setStateInner(prev => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  return { state, setState, loading, saving, lastSaved, error, meta };
}

function mergeWithSeed(persisted: any, seed: NetworkingCocktailState): NetworkingCocktailState {
  const selections: Record<string, boolean> = { ...seed.selections };
  if (persisted?.selections && typeof persisted.selections === "object") {
    for (const k of Object.keys(persisted.selections)) {
      if (k in selections) selections[k] = !!persisted.selections[k];
    }
  }
  return {
    pax: typeof persisted?.pax === "number" && Number.isFinite(persisted.pax) ? persisted.pax : seed.pax,
    transport: typeof persisted?.transport === "number" && Number.isFinite(persisted.transport) ? persisted.transport : seed.transport,
    selections,
    notes: typeof persisted?.notes === "string" ? persisted.notes : seed.notes,
  };
}
