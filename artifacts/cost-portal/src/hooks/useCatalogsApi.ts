import { useState, useEffect, useRef, useCallback } from "react";

type CatalogKey = "proveedores" | "centrosCosto";

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = (raw || "").trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

export function useCatalogsApi() {
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [centrosCosto, setCentrosCosto] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rev = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  // Always persist the latest of BOTH lists so a debounced write never drops a
  // sibling edit made within the debounce window.
  const latest = useRef<{ proveedores: string[]; centrosCosto: string[] }>({ proveedores: [], centrosCosto: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/catalogs", { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          const prov = dedupe(Array.isArray(data.proveedores) ? data.proveedores : []);
          const cen = dedupe(Array.isArray(data.centrosCosto) ? data.centrosCosto : []);
          setProveedores(prov);
          setCentrosCosto(cen);
          latest.current = { proveedores: prov, centrosCosto: cen };
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load catalogs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const myRev = ++rev.current;
      if (inFlight.current) inFlight.current.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      setSaving(true);
      try {
        const res = await fetch("/api/catalogs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify(latest.current),
        });
        if (myRev !== rev.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || `HTTP ${res.status}`);
          return;
        }
        const result = await res.json().catch(() => ({}));
        if (Array.isArray(result.proveedores)) {
          const p = dedupe(result.proveedores);
          setProveedores(p);
          latest.current.proveedores = p;
        }
        if (Array.isArray(result.centrosCosto)) {
          const c = dedupe(result.centrosCosto);
          setCentrosCosto(c);
          latest.current.centrosCosto = c;
        }
        setError(null);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Failed to save catalogs");
      } finally {
        if (myRev === rev.current) setSaving(false);
      }
    }, 400);
  }, []);

  const mutate = useCallback((key: CatalogKey, fn: (prev: string[]) => string[]) => {
    const setter = key === "proveedores" ? setProveedores : setCentrosCosto;
    setter(prev => {
      const next = dedupe(fn(prev));
      latest.current = { ...latest.current, [key]: next };
      persist();
      return next;
    });
  }, [persist]);

  const add = useCallback((key: CatalogKey, name: string) => {
    const n = name.trim();
    if (!n) return;
    mutate(key, prev => (prev.some(p => p.toLowerCase() === n.toLowerCase()) ? prev : [...prev, n]));
  }, [mutate]);

  const rename = useCallback((key: CatalogKey, oldName: string, newName: string) => {
    const n = newName.trim();
    if (!n) return;
    mutate(key, prev => prev.map(p => (p === oldName ? n : p)));
  }, [mutate]);

  const remove = useCallback((key: CatalogKey, name: string) => {
    mutate(key, prev => prev.filter(p => p !== name));
  }, [mutate]);

  return {
    proveedores, centrosCosto, loading, saving, error,
    addProveedor: (n: string) => add("proveedores", n),
    renameProveedor: (o: string, n: string) => rename("proveedores", o, n),
    removeProveedor: (n: string) => remove("proveedores", n),
    addCentro: (n: string) => add("centrosCosto", n),
    renameCentro: (o: string, n: string) => rename("centrosCosto", o, n),
    removeCentro: (n: string) => remove("centrosCosto", n),
  };
}
