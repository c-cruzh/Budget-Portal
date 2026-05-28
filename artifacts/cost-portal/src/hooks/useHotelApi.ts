import { useState, useEffect, useRef, useCallback } from "react";
import { INITIAL_HOTEL_STATE, type HotelState } from "@/data/hotelData";

const API_URL = "/api/hotel-state";

export interface HotelMeta {
  lastEditedBy: string;
  lastEditedByEmail: string;
  lastEditedByOrg: string;
  lastEditedAt: string;
}

export function useHotelApi() {
  const [state, setStateInner] = useState<HotelState>(INITIAL_HOTEL_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<HotelMeta | null>(null);
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
      } catch (err) {
        console.error("Failed to load hotel state:", err);
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

  async function saveToServer(next: HotelState) {
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
      console.error("Failed to save hotel state:", err);
      setError(err.message || "Failed to save");
    } finally {
      savingCount.current--;
      if (savingCount.current <= 0) {
        savingCount.current = 0;
        setSaving(false);
      }
    }
  }

  const scheduleSave = useCallback((next: HotelState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (initialLoadDone.current) saveToServer(next);
    }, 800);
  }, []);

  const setState = useCallback((updater: HotelState | ((prev: HotelState) => HotelState)) => {
    setStateInner(prev => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  return { state, setState, loading, saving, lastSaved, error, meta };
}

function mergeWithSeed(persisted: any): HotelState {
  const seed = INITIAL_HOTEL_STATE;
  const rooms = { ...seed.rooms };
  if (persisted?.rooms && typeof persisted.rooms === "object") {
    for (const k of Object.keys(rooms)) {
      const v = persisted.rooms[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        rooms[k] = v;
      }
    }
  }
  const checklist = Array.isArray(persisted?.checklist) && persisted.checklist.length > 0
    ? persisted.checklist.map((c: any, i: number) => ({
        id: typeof c?.id === "string" ? c.id : `c${i + 1}`,
        text: typeof c?.text === "string" ? c.text : "",
        done: !!c?.done,
      }))
    : seed.checklist;
  return {
    rooms,
    notes: typeof persisted?.notes === "string" ? persisted.notes : seed.notes,
    checklist,
    rateBase: typeof persisted?.rateBase === "number" ? persisted.rateBase : seed.rateBase,
    rateTotal: typeof persisted?.rateTotal === "number" ? persisted.rateTotal : seed.rateTotal,
  };
}
