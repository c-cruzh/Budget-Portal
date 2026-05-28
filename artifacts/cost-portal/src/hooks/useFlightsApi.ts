import { useState, useEffect, useRef, useCallback } from "react";
import { INITIAL_FLIGHTS_STATE, type FlightsState } from "@/data/flightsData";

const API_URL = "/api/flights-state";

export interface FlightsMeta {
  lastEditedBy: string;
  lastEditedByEmail: string;
  lastEditedByOrg: string;
  lastEditedAt: string;
}

export function useFlightsApi() {
  const [state, setStateInner] = useState<FlightsState>(INITIAL_FLIGHTS_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<FlightsMeta | null>(null);
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
          setStateInner(mergeWithSeed(data.state));
        }
        // If no row exists yet, keep the in-memory seed; first edit will PUT.
      } catch (err) {
        console.error("Failed to load flights state:", err);
        setError("Failed to load from server, using local data");
      } finally {
        if (!cancelled) {
          initialLoadDone.current = true;
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function saveToServer(next: FlightsState) {
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
      console.error("Failed to save flights state:", err);
      setError(err.message || "Failed to save");
    } finally {
      savingCount.current--;
      if (savingCount.current <= 0) {
        savingCount.current = 0;
        setSaving(false);
      }
    }
  }

  const scheduleSave = useCallback((next: FlightsState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (initialLoadDone.current) saveToServer(next);
    }, 800);
  }, []);

  const setState = useCallback((updater: FlightsState | ((prev: FlightsState) => FlightsState)) => {
    setStateInner(prev => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  return { state, setState, loading, saving, lastSaved, error, meta };
}

// Merge persisted state with seed: keep user edits (selectedOptionId, status, notes)
// but always use fresh seed for options/history/logistics/nextSteps so updates ship.
function mergeWithSeed(persisted: any): FlightsState {
  const seed = INITIAL_FLIGHTS_STATE;
  const routesById = new Map<string, any>();
  if (Array.isArray(persisted?.routes)) {
    for (const r of persisted.routes) if (r?.id) routesById.set(r.id, r);
  }
  const routes = seed.routes.map(seedRoute => {
    const saved = routesById.get(seedRoute.id);
    if (!saved) return seedRoute;
    const selectedOptionId = seedRoute.options.find(o => o.id === saved.selectedOptionId)
      ? saved.selectedOptionId
      : seedRoute.selectedOptionId;
    return {
      ...seedRoute,
      selectedOptionId,
      status: saved.status ?? seedRoute.status,
      notes: typeof saved.notes === "string" ? saved.notes : seedRoute.notes,
    };
  });
  return { ...seed, routes };
}
