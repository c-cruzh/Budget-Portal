import { useState, useEffect, useRef, useCallback } from "react";
import type { VolunteerRole, VolunteerRoster } from "@/data/volunteersData";
import { EMPTY_VOLUNTEER_ROSTER } from "@/data/volunteersData";

export interface VolunteerMeta {
  lastEditedBy: string;
  lastEditedByEmail: string;
  lastEditedByOrg: string;
  lastEditedAt: string;
}

export function useVolunteersApi() {
  const [roster, setRosterState] = useState<VolunteerRoster>(EMPTY_VOLUNTEER_ROSTER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<VolunteerMeta | null>(null);
  const initialLoadDone = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rev = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/volunteers", { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.meta) setMeta(data.meta);
          if (data.roster && Array.isArray(data.roster.roles)) {
            setRosterState({ roles: data.roster.roles });
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load volunteers");
      } finally {
        if (!cancelled) { initialLoadDone.current = true; setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((next: VolunteerRoster) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const myRev = ++rev.current;
      if (inFlight.current) inFlight.current.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      setSaving(true);
      try {
        const res = await fetch("/api/volunteers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({ roster: next }),
        });
        if (myRev !== rev.current) return;
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d?.error || `HTTP ${res.status}`);
          return;
        }
        const result = await res.json().catch(() => ({}));
        if (result.meta) setMeta(result.meta);
        setError(null);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Failed to save volunteers");
      } finally {
        if (myRev === rev.current) setSaving(false);
      }
    }, 600);
  }, []);

  const setRoles = useCallback((value: VolunteerRole[] | ((prev: VolunteerRole[]) => VolunteerRole[])) => {
    initialLoadDone.current = true;
    setRosterState(prev => {
      const nextRoles = typeof value === "function" ? value(prev.roles) : value;
      const next = { roles: nextRoles };
      persist(next);
      return next;
    });
  }, [persist]);

  return { roles: roster.roles, setRoles, loading, saving, error, meta };
}
