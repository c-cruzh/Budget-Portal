import { useState, useEffect, useRef, useCallback } from "react";

export interface Sponsor {
  id: string;
  name: string;
  amount: number;
  status?: "CONFIRMED" | "VERBAL" | "PROSPECT";
  notes?: string;
  link?: string;
}

export interface ScenarioState {
  includeFee: boolean;
  excludeNiceToHave: boolean;
}

const DEFAULT_SCENARIO: ScenarioState = { includeFee: true, excludeNiceToHave: false };

export function useSponsorsApi() {
  const [sponsors, setSponsorsState] = useState<Sponsor[]>([]);
  const [scenario, setScenarioState] = useState<ScenarioState>(DEFAULT_SCENARIO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);
  const sponsorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scenarioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sponsorRev = useRef(0);
  const scenarioRev = useRef(0);
  const inFlightSponsorAbort = useRef<AbortController | null>(null);
  const inFlightScenarioAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sponsors", { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          // Only hydrate from server if user has not already started editing
          if (!initialLoadDone.current) {
            setSponsorsState(Array.isArray(data.sponsors) ? data.sponsors : []);
            if (data.scenario && typeof data.scenario === "object") {
              setScenarioState({ ...DEFAULT_SCENARIO, ...data.scenario });
            }
          }
          initialLoadDone.current = true;
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load sponsors");
          initialLoadDone.current = true;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persistSponsors = useCallback((next: Sponsor[]) => {
    if (sponsorTimer.current) clearTimeout(sponsorTimer.current);
    sponsorTimer.current = setTimeout(() => {
      const myRev = ++sponsorRev.current;
      if (inFlightSponsorAbort.current) inFlightSponsorAbort.current.abort();
      const controller = new AbortController();
      inFlightSponsorAbort.current = controller;
      fetch("/api/sponsors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({ sponsors: next }),
      })
        .then(() => {
          if (myRev !== sponsorRev.current) return;
        })
        .catch(err => {
          if (err?.name !== "AbortError") console.error("Failed to save sponsors:", err);
        });
    }, 400);
  }, []);

  const persistScenario = useCallback((next: ScenarioState) => {
    if (scenarioTimer.current) clearTimeout(scenarioTimer.current);
    scenarioTimer.current = setTimeout(() => {
      const myRev = ++scenarioRev.current;
      if (inFlightScenarioAbort.current) inFlightScenarioAbort.current.abort();
      const controller = new AbortController();
      inFlightScenarioAbort.current = controller;
      fetch("/api/sponsors/scenario", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify(next),
      })
        .then(() => {
          if (myRev !== scenarioRev.current) return;
        })
        .catch(err => {
          if (err?.name !== "AbortError") console.error("Failed to save scenario:", err);
        });
    }, 250);
  }, []);

  const setSponsors = useCallback((value: Sponsor[] | ((prev: Sponsor[]) => Sponsor[])) => {
    setSponsorsState(prev => {
      const next = typeof value === "function" ? (value as any)(prev) : value;
      // Mark as "user has touched it" so the in-flight GET cannot overwrite local edits
      initialLoadDone.current = true;
      persistSponsors(next);
      return next;
    });
  }, [persistSponsors]);

  const setScenario = useCallback((value: ScenarioState | ((prev: ScenarioState) => ScenarioState)) => {
    setScenarioState(prev => {
      const next = typeof value === "function" ? (value as any)(prev) : value;
      initialLoadDone.current = true;
      persistScenario(next);
      return next;
    });
  }, [persistScenario]);

  return { sponsors, setSponsors, scenario, setScenario, loading, error };
}
