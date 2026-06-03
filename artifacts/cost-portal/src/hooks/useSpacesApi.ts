import { useState, useEffect, useRef, useCallback } from "react";
import type { SpaceDayKey, SpacesCatalog } from "@/data/budgetData";
import { EMPTY_SPACES_CATALOG } from "@/data/budgetData";

function normalizeList(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of list) {
    const name = String(v ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function normalizeCapacities(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, number> = {};
  for (const [rawName, rawVal] of Object.entries(input as Record<string, unknown>)) {
    const name = String(rawName ?? "").trim();
    if (!name) continue;
    const num = Math.floor(Number(rawVal));
    if (!Number.isFinite(num) || num <= 0) continue;
    out[name] = num;
  }
  return out;
}

export function useSpacesApi() {
  const [spaces, setSpacesState] = useState<SpacesCatalog>(EMPTY_SPACES_CATALOG);
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
        const res = await fetch("/api/spaces", { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled && data.spaces && typeof data.spaces === "object") {
          setSpacesState({
            "dia-1": normalizeList(data.spaces["dia-1"] || []),
            "dia-2": normalizeList(data.spaces["dia-2"] || []),
            capacities: normalizeCapacities(data.spaces.capacities),
          });
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load spaces");
      } finally {
        if (!cancelled) { initialLoadDone.current = true; setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((next: SpacesCatalog) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const myRev = ++rev.current;
      if (inFlight.current) inFlight.current.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      try {
        const res = await fetch("/api/spaces", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({ spaces: next }),
        });
        if (myRev !== rev.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || `HTTP ${res.status}`);
          return;
        }
        setError(null);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Failed to save spaces");
      }
    }, 250);
  }, []);

  // Adds a space to the catalog for the given day if it does not already exist
  // (case-insensitive). Returns the canonical stored name to assign to the item.
  const addSpace = useCallback((day: SpaceDayKey, name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return "";
    let canonical = trimmed;
    setSpacesState(prev => {
      const existing = prev[day].find(s => s.toLowerCase() === trimmed.toLowerCase());
      if (existing) { canonical = existing; return prev; }
      const next: SpacesCatalog = {
        "dia-1": [...prev["dia-1"]],
        "dia-2": [...prev["dia-2"]],
        capacities: { ...(prev.capacities || {}) },
      };
      next[day] = [...prev[day], trimmed].sort((a, b) => a.localeCompare(b));
      persist(next);
      return next;
    });
    return canonical;
  }, [persist]);

  // Sets (or clears, when value is null/<=0) the aforo/capacity for a space.
  // Capacity is shared across both days since it is a property of the space.
  const setCapacity = useCallback((name: string, value: number | null) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSpacesState(prev => {
      const caps = { ...(prev.capacities || {}) };
      const num = value == null ? NaN : Math.floor(Number(value));
      if (!Number.isFinite(num) || num <= 0) {
        delete caps[trimmed];
      } else {
        caps[trimmed] = num;
      }
      const next: SpacesCatalog = {
        "dia-1": [...prev["dia-1"]],
        "dia-2": [...prev["dia-2"]],
        capacities: caps,
      };
      persist(next);
      return next;
    });
  }, [persist]);

  // Renames a space within a day's catalog. Returns the canonical stored name
  // (which may differ if a space with the new name already existed and the two
  // are merged). Returns "" when the new name is empty or the old name is absent.
  const renameSpace = useCallback((day: SpaceDayKey, oldName: string, newName: string): string => {
    const trimmed = newName.trim();
    if (!trimmed) return "";
    let canonical = trimmed;
    setSpacesState(prev => {
      const list = prev[day];
      const idx = list.findIndex(s => s.toLowerCase() === oldName.toLowerCase());
      if (idx === -1) { canonical = ""; return prev; }
      const replaced = list.map((s, i) => (i === idx ? trimmed : s));
      const deduped = normalizeList(replaced).sort((a, b) => a.localeCompare(b));
      const found = deduped.find(s => s.toLowerCase() === trimmed.toLowerCase());
      if (found) canonical = found;
      const caps = { ...(prev.capacities || {}) };
      const next: SpacesCatalog = {
        "dia-1": [...prev["dia-1"]],
        "dia-2": [...prev["dia-2"]],
        capacities: caps,
      };
      next[day] = deduped;
      // Migrate the capacity entry only when the old name no longer exists on
      // either day (capacity is shared across both days).
      const stillExists =
        next["dia-1"].some(s => s.toLowerCase() === oldName.toLowerCase()) ||
        next["dia-2"].some(s => s.toLowerCase() === oldName.toLowerCase());
      if (!stillExists) {
        const capKey = Object.keys(caps).find(k => k.toLowerCase() === oldName.toLowerCase());
        if (capKey != null) {
          const val = caps[capKey];
          delete caps[capKey];
          const targetKey = Object.keys(caps).find(k => k.toLowerCase() === canonical.toLowerCase());
          if (targetKey == null) caps[canonical] = val;
        }
      }
      persist(next);
      return next;
    });
    return canonical;
  }, [persist]);

  // Removes a space from a day's catalog (case-insensitive). Budget line cleanup
  // is handled by the caller.
  const removeSpace = useCallback((day: SpaceDayKey, name: string) => {
    setSpacesState(prev => {
      const caps = { ...(prev.capacities || {}) };
      const next: SpacesCatalog = {
        "dia-1": [...prev["dia-1"]],
        "dia-2": [...prev["dia-2"]],
        capacities: caps,
      };
      next[day] = prev[day].filter(s => s.toLowerCase() !== name.toLowerCase());
      // Drop the capacity entry only when the space is gone from both days.
      const stillExists =
        next["dia-1"].some(s => s.toLowerCase() === name.toLowerCase()) ||
        next["dia-2"].some(s => s.toLowerCase() === name.toLowerCase());
      if (!stillExists) {
        const capKey = Object.keys(caps).find(k => k.toLowerCase() === name.toLowerCase());
        if (capKey != null) delete caps[capKey];
      }
      persist(next);
      return next;
    });
  }, [persist]);

  return { spaces, addSpace, setCapacity, renameSpace, removeSpace, loading, error };
}
