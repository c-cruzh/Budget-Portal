import { useState, useEffect, useRef, useCallback } from "react";
import type { SpaceDayKey, SpaceEntry, SpacesCatalog, Venue } from "@/data/budgetData";
import { EMPTY_SPACES_CATALOG, buildSpacesCatalog } from "@/data/budgetData";

export interface SpacesMeta {
  lastEditedBy: string;
  lastEditedByEmail: string;
  lastEditedByOrg: string;
  lastEditedAt: string;
}

function newEntryId(): string {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return `sp-${(crypto as any).randomUUID()}`;
  return `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newVenueId(): string {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return `venue-${(crypto as any).randomUUID()}`;
  return `venue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEntries(input: unknown): SpaceEntry[] {
  if (!Array.isArray(input)) return [];
  const out: SpaceEntry[] = [];
  const used = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = String(r.name ?? "").trim();
    if (!name) continue;
    let id = String(r.id ?? "").trim();
    if (!id || used.has(id)) id = newEntryId();
    used.add(id);
    const entry: SpaceEntry = { id, zone: String(r.zone ?? "").trim(), name };
    const a = Math.floor(Number(r.aforo));
    if (Number.isFinite(a) && a > 0) entry.aforo = a;
    const image = String(r.image ?? "").trim();
    if (image) entry.image = image;
    out.push(entry);
  }
  return out;
}

/** Builds the structured entries from a server payload, migrating legacy shapes. */
function entriesFromPayload(data: any): { "dia-1": SpaceEntry[]; "dia-2": SpaceEntry[] } {
  const e = data?.entries;
  if (e && typeof e === "object" && !Array.isArray(e)) {
    return { "dia-1": normalizeEntries(e["dia-1"]), "dia-2": normalizeEntries(e["dia-2"]) };
  }
  // Legacy: name arrays + capacities map → zone-less entries.
  const caps: Record<string, unknown> =
    data?.capacities && typeof data.capacities === "object" ? data.capacities : {};
  const mig = (day: SpaceDayKey): SpaceEntry[] => {
    const names: unknown[] = Array.isArray(data?.[day]) ? data[day] : [];
    return names
      .map(n => String(n ?? "").trim())
      .filter(Boolean)
      .map(name => {
        const entry: SpaceEntry = { id: newEntryId(), zone: "", name };
        const capKey = Object.keys(caps).find(k => k.toLowerCase() === name.toLowerCase());
        if (capKey != null) {
          const a = Math.floor(Number(caps[capKey]));
          if (Number.isFinite(a) && a > 0) entry.aforo = a;
        }
        return entry;
      });
  };
  return { "dia-1": mig("dia-1"), "dia-2": mig("dia-2") };
}

/** Normalizes a venue's entries, keeping Área-only rows (empty space name). */
function normalizeVenueEntries(input: unknown): SpaceEntry[] {
  if (!Array.isArray(input)) return [];
  const out: SpaceEntry[] = [];
  const used = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = String(r.name ?? "").trim();
    const zone = String(r.zone ?? "").trim();
    if (!name && !zone) continue;
    let id = String(r.id ?? "").trim();
    if (!id || used.has(id)) id = newEntryId();
    used.add(id);
    const entry: SpaceEntry = { id, zone, name };
    const a = Math.floor(Number(r.aforo));
    if (Number.isFinite(a) && a > 0) entry.aforo = a;
    const image = String(r.image ?? "").trim();
    if (image) entry.image = image;
    out.push(entry);
  }
  return out;
}

function venuesFromPayload(data: any): Venue[] {
  if (!Array.isArray(data?.venues)) return [];
  const out: Venue[] = [];
  const used = new Set<string>();
  for (const raw of data.venues) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = String(r.name ?? "").trim();
    if (!name) continue;
    let id = String(r.id ?? "").trim();
    if (!id || used.has(id)) id = newVenueId();
    used.add(id);
    const venue: Venue = { id, name, entries: normalizeVenueEntries(r.entries) };
    const subtitle = String(r.subtitle ?? "").trim();
    if (subtitle) venue.subtitle = subtitle;
    if (Array.isArray(r.subEventIds)) {
      const seen = new Set<string>();
      const ids: string[] = [];
      for (const rawId of r.subEventIds) {
        const sid = String(rawId ?? "").trim();
        if (!sid || seen.has(sid)) continue;
        seen.add(sid);
        ids.push(sid);
      }
      if (ids.length) venue.subEventIds = ids;
    }
    out.push(venue);
  }
  return out;
}

export function useSpacesApi() {
  const [spaces, setSpacesState] = useState<SpacesCatalog>(EMPTY_SPACES_CATALOG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<SpacesMeta | null>(null);
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
        if (!cancelled) {
          if (data.meta) setMeta(data.meta);
          if (data.spaces && typeof data.spaces === "object") {
            const ent = entriesFromPayload(data.spaces);
            const venues = venuesFromPayload(data.spaces);
            setSpacesState(buildSpacesCatalog(ent["dia-1"], ent["dia-2"], venues));
          }
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
      setSaving(true);
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
        const result = await res.json().catch(() => ({}));
        if (result.meta) setMeta(result.meta);
        setError(null);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Failed to save spaces");
      } finally {
        if (myRev === rev.current) setSaving(false);
      }
    }, 250);
  }, []);

  /** Applies a transform to the per-day entries, rebuilds derived fields, persists. */
  const mutateEntries = useCallback(
    (fn: (entries: { "dia-1": SpaceEntry[]; "dia-2": SpaceEntry[] }) => { "dia-1": SpaceEntry[]; "dia-2": SpaceEntry[] }) => {
      initialLoadDone.current = true;
      setSpacesState(prev => {
        const cur = prev.entries || { "dia-1": [], "dia-2": [] };
        const nextEntries = fn({ "dia-1": [...cur["dia-1"]], "dia-2": [...cur["dia-2"]] });
        const next = buildSpacesCatalog(nextEntries["dia-1"], nextEntries["dia-2"], prev.venues || []);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  /** Applies a transform to the venues list, preserving ESEN entries, persists. */
  const mutateVenues = useCallback(
    (fn: (venues: Venue[]) => Venue[]) => {
      initialLoadDone.current = true;
      setSpacesState(prev => {
        const cur = prev.entries || { "dia-1": [], "dia-2": [] };
        const nextVenues = fn(prev.venues || []);
        const next = buildSpacesCatalog(cur["dia-1"], cur["dia-2"], nextVenues);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  // ---- Venue (Lugar/Sede) operations used by the Espacios tab ----

  const addVenue = useCallback((name: string, subtitle?: string): string => {
    const n = name.trim();
    if (!n) return "";
    const id = newVenueId();
    const venue: Venue = { id, name: n, entries: [] };
    const sub = (subtitle || "").trim();
    if (sub) venue.subtitle = sub;
    mutateVenues(vs => [...vs, venue]);
    return id;
  }, [mutateVenues]);

  const updateVenue = useCallback((venueId: string, patch: { name?: string; subtitle?: string; subEventIds?: string[] }) => {
    mutateVenues(vs => vs.map(v => {
      if (v.id !== venueId) return v;
      const next: Venue = { ...v };
      if (patch.name !== undefined) next.name = patch.name;
      if (patch.subtitle !== undefined) {
        const sub = patch.subtitle.trim();
        if (sub) next.subtitle = patch.subtitle; else delete next.subtitle;
      }
      if (patch.subEventIds !== undefined) {
        const seen = new Set<string>();
        const ids: string[] = [];
        for (const raw of patch.subEventIds) {
          const sid = (raw || "").trim();
          if (!sid || seen.has(sid)) continue;
          seen.add(sid);
          ids.push(sid);
        }
        if (ids.length) next.subEventIds = ids; else delete next.subEventIds;
      }
      return next;
    }));
  }, [mutateVenues]);

  const removeVenue = useCallback((venueId: string) => {
    mutateVenues(vs => vs.filter(v => v.id !== venueId));
  }, [mutateVenues]);

  const addVenueEntry = useCallback(
    (venueId: string, partial: { zone?: string; name?: string; aforo?: number }): string => {
      const zone = (partial.zone || "").trim();
      const name = (partial.name || "").trim();
      if (!zone && !name) return "";
      const id = newEntryId();
      const entry: SpaceEntry = { id, zone, name };
      if (partial.aforo != null && Number.isFinite(partial.aforo) && partial.aforo > 0) entry.aforo = Math.floor(partial.aforo);
      mutateVenues(vs => vs.map(v => (v.id === venueId ? { ...v, entries: [...v.entries, entry] } : v)));
      return id;
    },
    [mutateVenues],
  );

  const updateVenueEntry = useCallback(
    (venueId: string, entryId: string, patch: Partial<Omit<SpaceEntry, "id">>) => {
      mutateVenues(vs => vs.map(v => {
        if (v.id !== venueId) return v;
        return {
          ...v,
          entries: v.entries.map(en => {
            if (en.id !== entryId) return en;
            const next: SpaceEntry = { ...en };
            if (patch.zone !== undefined) next.zone = patch.zone;
            if (patch.name !== undefined) next.name = patch.name;
            if (patch.aforo !== undefined) {
              const a = Math.floor(Number(patch.aforo));
              if (Number.isFinite(a) && a > 0) next.aforo = a; else delete next.aforo;
            }
            return next;
          }),
        };
      }));
    },
    [mutateVenues],
  );

  const removeVenueEntry = useCallback((venueId: string, entryId: string) => {
    mutateVenues(vs => vs.map(v => (v.id === venueId ? { ...v, entries: v.entries.filter(en => en.id !== entryId) } : v)));
  }, [mutateVenues]);

  const renameVenueZone = useCallback((venueId: string, oldZone: string, newZone: string) => {
    const target = newZone.trim();
    const from = oldZone.trim();
    mutateVenues(vs => vs.map(v => {
      if (v.id !== venueId) return v;
      return { ...v, entries: v.entries.map(en => ((en.zone || "").trim() === from ? { ...en, zone: target } : en)) };
    }));
  }, [mutateVenues]);

  const removeVenueZone = useCallback((venueId: string, zone: string) => {
    const isSinZona = zone === "Sin zona";
    const from = zone.trim();
    mutateVenues(vs => vs.map(v => {
      if (v.id !== venueId) return v;
      return {
        ...v,
        entries: v.entries.filter(en => {
          const z = (en.zone || "").trim();
          return isSinZona ? z !== "" : z !== from;
        }),
      };
    }));
  }, [mutateVenues]);

  // ---- Structured operations used by the Espacios tab ----

  const addEntry = useCallback((day: SpaceDayKey, partial: { zone?: string; name: string; aforo?: number }): string => {
    const name = partial.name.trim();
    if (!name) return "";
    const id = newEntryId();
    const entry: SpaceEntry = { id, zone: (partial.zone || "").trim(), name };
    if (partial.aforo != null && Number.isFinite(partial.aforo) && partial.aforo > 0) entry.aforo = Math.floor(partial.aforo);
    mutateEntries(e => ({ ...e, [day]: [...e[day], entry] }));
    return id;
  }, [mutateEntries]);

  const updateEntry = useCallback((day: SpaceDayKey, id: string, patch: Partial<Omit<SpaceEntry, "id">>) => {
    mutateEntries(e => ({
      ...e,
      [day]: e[day].map(en => {
        if (en.id !== id) return en;
        const next: SpaceEntry = { ...en };
        // Keep raw (untrimmed) values during live typing; the server and the
        // derived name list trim on save/derive, so this stays stable.
        if (patch.zone !== undefined) next.zone = patch.zone;
        if (patch.name !== undefined) next.name = patch.name;
        if (patch.aforo !== undefined) {
          const a = Math.floor(Number(patch.aforo));
          if (Number.isFinite(a) && a > 0) next.aforo = a; else delete next.aforo;
        }
        return next;
      }),
    }));
  }, [mutateEntries]);

  const removeEntry = useCallback((day: SpaceDayKey, id: string) => {
    mutateEntries(e => ({ ...e, [day]: e[day].filter(en => en.id !== id) }));
  }, [mutateEntries]);

  const renameZone = useCallback((day: SpaceDayKey, oldZone: string, newZone: string) => {
    const target = newZone.trim();
    const from = oldZone.trim();
    mutateEntries(e => ({
      ...e,
      [day]: e[day].map(en => ((en.zone || "").trim() === from ? { ...en, zone: target } : en)),
    }));
  }, [mutateEntries]);

  // Removes every space in a zone on a day. "Sin zona" matches zone-less entries.
  const removeZone = useCallback((day: SpaceDayKey, zone: string) => {
    const isSinZona = zone === "Sin zona";
    const from = zone.trim();
    mutateEntries(e => ({
      ...e,
      [day]: e[day].filter(en => {
        const z = (en.zone || "").trim();
        return isSinZona ? z !== "" : z !== from;
      }),
    }));
  }, [mutateEntries]);

  // ---- Id-based operations used by the Budget space picker / SpacesSheet ----

  /**
   * Applies a transform to a single SpaceEntry located anywhere in the catalog
   * (ESEN Día 1 / Día 2 or any venue) by its stable id, then rebuilds + persists.
   * `mapEntry` returns the replacement entry, or `null` to delete it.
   */
  const mutateEntryById = useCallback(
    (id: string, mapEntry: (e: SpaceEntry) => SpaceEntry | null) => {
      const key = (id || "").trim();
      if (!key) return;
      initialLoadDone.current = true;
      setSpacesState(prev => {
        const cur = prev.entries || { "dia-1": [], "dia-2": [] };
        const applyDay = (arr: SpaceEntry[]): SpaceEntry[] => {
          const out: SpaceEntry[] = [];
          for (const en of arr) {
            if (en.id !== key) { out.push(en); continue; }
            const r = mapEntry(en);
            if (r) out.push(r);
          }
          return out;
        };
        const d1 = applyDay(cur["dia-1"]);
        const d2 = applyDay(cur["dia-2"]);
        const venues = (prev.venues || []).map(v => ({
          ...v,
          entries: (() => {
            const out: SpaceEntry[] = [];
            for (const en of v.entries) {
              if (en.id !== key) { out.push(en); continue; }
              const r = mapEntry(en);
              if (r) out.push(r);
            }
            return out;
          })(),
        }));
        const next = buildSpacesCatalog(d1, d2, venues);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  // Adds a space (zone-less) to an ESEN day if no entry with that name exists
  // (case-insensitive). Returns the stable id of the new or existing entry.
  const addSpace = useCallback((day: SpaceDayKey, name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return "";
    let resultId = "";
    mutateEntries(e => {
      const existing = e[day].find(en => en.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) { resultId = existing.id; return e; }
      resultId = newEntryId();
      return { ...e, [day]: [...e[day], { id: resultId, zone: "", name: trimmed }] };
    });
    return resultId;
  }, [mutateEntries]);

  // Sets (or clears, when value is null/<=0) the aforo of one room by id.
  const setCapacityById = useCallback((id: string, value: number | null) => {
    const num = value == null ? NaN : Math.floor(Number(value));
    const valid = Number.isFinite(num) && num > 0;
    mutateEntryById(id, en => {
      const next: SpaceEntry = { ...en };
      if (valid) next.aforo = num; else delete next.aforo;
      return next;
    });
  }, [mutateEntryById]);

  // Renames one room by id. No-op when the new name is blank.
  const renameSpaceById = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    mutateEntryById(id, en => ({ ...en, name: trimmed }));
  }, [mutateEntryById]);

  // Removes one room by id.
  const removeSpaceById = useCallback((id: string) => {
    mutateEntryById(id, () => null);
  }, [mutateEntryById]);

  return {
    spaces, loading, saving, error, meta,
    addEntry, updateEntry, removeEntry, renameZone, removeZone,
    addVenue, updateVenue, removeVenue,
    addVenueEntry, updateVenueEntry, removeVenueEntry, renameVenueZone, removeVenueZone,
    addSpace, setCapacityById, renameSpaceById, removeSpaceById,
  };
}
