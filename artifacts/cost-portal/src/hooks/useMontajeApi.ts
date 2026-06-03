import { useState, useEffect, useRef, useCallback } from "react";
import {
  EMPTY_MONTAJE_STATE,
  type MontajeEntry,
  type MontajeState,
} from "@/data/montajeData";

const API_URL = "/api/montaje-entries";

export interface MontajeMeta {
  lastEditedBy: string;
  lastEditedByEmail: string;
  lastEditedByOrg: string;
  lastEditedAt: string;
}

export function useMontajeApi() {
  const [state, setStateInner] = useState<MontajeState>(EMPTY_MONTAJE_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<MontajeMeta | null>(null);
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
        if (data.state && Array.isArray(data.state.entries)) {
          setStateInner({ entries: data.state.entries });
        }
      } catch (err) {
        console.error("Failed to load montaje state:", err);
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

  async function saveToServer(next: MontajeState) {
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
      console.error("Failed to save montaje state:", err);
      setError(err.message || "Failed to save");
    } finally {
      savingCount.current--;
      if (savingCount.current <= 0) {
        savingCount.current = 0;
        setSaving(false);
      }
    }
  }

  const scheduleSave = useCallback((next: MontajeState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (initialLoadDone.current) saveToServer(next);
    }, 800);
  }, []);

  const update = useCallback((updater: (prev: MontajeState) => MontajeState) => {
    setStateInner(prev => {
      const next = updater(prev);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const addEntry = useCallback((entry: MontajeEntry) => {
    update(prev => ({ entries: [...prev.entries, entry] }));
  }, [update]);

  const updateEntry = useCallback((id: string, patch: Partial<MontajeEntry>) => {
    update(prev => ({
      entries: prev.entries.map(e => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, [update]);

  const removeEntry = useCallback((id: string) => {
    update(prev => ({ entries: prev.entries.filter(e => e.id !== id) }));
  }, [update]);

  return {
    entries: state.entries,
    addEntry,
    updateEntry,
    removeEntry,
    loading,
    saving,
    lastSaved,
    error,
    meta,
  };
}
