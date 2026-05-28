import { useState, useEffect, useRef, useCallback } from "react";

export type AgendaKey =
  | "lanzamiento"
  | "evento"
  | "evento-dia-1"
  | "evento-dia-2"
  | "completa";

export interface AgendaRow {
  id: string;
  date?: string;
  time: string;
  activity: string;
  location: string;
  responsible: string;
  notes: string;
}

export function useAgendaApi(key: AgendaKey) {
  const [rows, setRowsState] = useState<AgendaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rev = useRef(0);
  const inFlightAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    initialLoadDone.current = false;
    (async () => {
      try {
        const res = await fetch(`/api/agenda/${key}`, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          if (!initialLoadDone.current) {
            setRowsState(Array.isArray(data.rows) ? data.rows : []);
          }
          initialLoadDone.current = true;
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load agenda");
          initialLoadDone.current = true;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [key]);

  const persist = useCallback((next: AgendaRow[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const myRev = ++rev.current;
      if (inFlightAbort.current) inFlightAbort.current.abort();
      const controller = new AbortController();
      inFlightAbort.current = controller;
      fetch(`/api/agenda/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({ rows: next }),
      })
        .then(() => { if (myRev !== rev.current) return; })
        .catch(err => {
          if (err?.name !== "AbortError") {
            console.error("Failed to save agenda:", err);
            setError(err?.message || "Failed to save");
          }
        });
    }, 800);
  }, [key]);

  const setRows = useCallback((value: AgendaRow[] | ((prev: AgendaRow[]) => AgendaRow[])) => {
    setRowsState(prev => {
      const next = typeof value === "function" ? (value as any)(prev) : value;
      initialLoadDone.current = true;
      persist(next);
      return next;
    });
  }, [persist]);

  return { rows, setRows, loading, error };
}
