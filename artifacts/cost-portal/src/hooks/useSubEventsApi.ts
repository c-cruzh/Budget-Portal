import { useState, useEffect, useRef, useCallback } from "react";
import type { SubEvent } from "@/data/budgetData";
import { DEFAULT_SUB_EVENTS } from "@/data/budgetData";

export function useSubEventsApi() {
  const [subEvents, setSubEventsState] = useState<SubEvent[]>(DEFAULT_SUB_EVENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rev = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sub-events", { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          if (!initialLoadDone.current && Array.isArray(data.subEvents)) {
            setSubEventsState(
              [...data.subEvents].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            );
          }
          initialLoadDone.current = true;
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load sub-events");
          initialLoadDone.current = true;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((next: SubEvent[]): Promise<{ ok: boolean; error?: string }> => {
    return new Promise(resolve => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const myRev = ++rev.current;
        if (inFlight.current) inFlight.current.abort();
        const controller = new AbortController();
        inFlight.current = controller;
        try {
          const res = await fetch("/api/sub-events", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            signal: controller.signal,
            body: JSON.stringify({ subEvents: next }),
          });
          if (myRev !== rev.current) { resolve({ ok: true }); return; }
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data?.error || `HTTP ${res.status}`);
            resolve({ ok: false, error: data?.error || `HTTP ${res.status}` });
            return;
          }
          setError(null);
          resolve({ ok: true });
        } catch (err: any) {
          if (err?.name === "AbortError") { resolve({ ok: true }); return; }
          setError(err?.message || "Failed to save sub-events");
          resolve({ ok: false, error: err?.message });
        }
      }, 250);
    });
  }, []);

  const setSubEvents = useCallback(async (value: SubEvent[]): Promise<{ ok: boolean; error?: string }> => {
    initialLoadDone.current = true;
    setSubEventsState(value);
    return persist(value);
  }, [persist]);

  return { subEvents, setSubEvents, loading, error };
}
