import { useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  BedDouble, Hotel, Cloud, CloudOff, Loader2, Users, Calendar,
  TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, RefreshCcw, Plane, Printer,
} from "lucide-react";
import HotelPrintView from "@/components/HotelPrintView";
import { useHotelApi } from "@/hooks/useHotelApi";
import { useFlightsApi } from "@/hooks/useFlightsApi";
import { useAuth } from "@/hooks/useAuth";
import {
  HOTEL_GROUPS, HOTEL_RATE_BASE, HOTEL_RATE_TOTAL,
  calcHotelStay, getSelectedFlightOption,
} from "@/data/hotelData";
import type { FlightRouteGroup } from "@/data/flightsData";
import { formatUSD, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

function SyncIndicator({ saving, lastSaved, error }: { saving: boolean; lastSaved: Date | null; error: string | null }) {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-500">
        <CloudOff className="w-3.5 h-3.5" /> {error}
      </span>
    );
  }
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Cloud className="w-3.5 h-3.5 text-emerald-500" />
      {lastSaved ? `Sincronizado ${lastSaved.toLocaleTimeString()}` : "Sincronizado"}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function fmtDateShort(d: Date | null): string {
  if (!d) return "—";
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

function fmtDateFull(d: Date | null): string {
  if (!d) return "—";
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function dateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default function HotelPage() {
  const { state, setState, loading, saving, lastSaved, error, meta } = useHotelApi();
  const { state: flightsState, loading: flightsLoading } = useFlightsApi();
  const { user } = useAuth();
  const canEdit = !!user;

  const routesByKey = useMemo(() => {
    const map = new Map<string, FlightRouteGroup>();
    for (const r of flightsState.routes) map.set(r.id, r);
    return map;
  }, [flightsState.routes]);

  // Per-group computed rows
  const rows = useMemo(() => {
    return HOTEL_GROUPS.map(g => {
      const route = routesByKey.get(g.key);
      const selected = getSelectedFlightOption(route);
      const stay = calcHotelStay(selected);
      const rooms = state.rooms[g.key] ?? g.pax;
      const hasSelection = !!selected && stay.nights > 0;
      const subtotal = hasSelection ? rooms * stay.nights * state.rateTotal : 0;
      const paxNights = hasSelection ? g.pax * stay.nights : 0;

      // Comparativa across all options
      const optionStays = (route?.options ?? []).map(opt => {
        const s = calcHotelStay(opt);
        return { opt, nights: s.nights, cost: rooms * s.nights * state.rateTotal };
      }).filter(o => o.nights > 0);
      const minNights = optionStays.length ? Math.min(...optionStays.map(o => o.nights)) : stay.nights;
      const maxNights = optionStays.length ? Math.max(...optionStays.map(o => o.nights)) : stay.nights;

      return {
        group: g,
        route,
        selected,
        stay,
        rooms,
        hasSelection,
        subtotal,
        paxNights,
        optionStays,
        minNights,
        maxNights,
      };
    });
  }, [routesByKey, state.rooms, state.rateTotal]);

  const totals = useMemo(() => {
    let totalRoomNights = 0;
    let totalCost = 0;
    let totalPaxNights = 0;
    let missing = 0;
    for (const r of rows) {
      if (!r.hasSelection) { missing++; continue; }
      totalRoomNights += r.rooms * r.stay.nights;
      totalCost += r.subtotal;
      totalPaxNights += r.paxNights;
    }
    return { totalRoomNights, totalCost, totalPaxNights, missing };
  }, [rows]);

  const flightTotal = useMemo(() => {
    let sum = 0;
    for (const r of flightsState.routes) {
      const sel = r.options.find(o => o.id === r.selectedOptionId) ?? r.options[0];
      if (sel) sum += sel.pricePerPax * r.pax;
    }
    return sum;
  }, [flightsState.routes]);

  // Per-night breakdown
  const nightBreakdown = useMemo(() => {
    type NightCell = { date: Date; key: string; perGroup: Record<string, number>; total: number };
    const nightsMap = new Map<string, NightCell>();
    for (const r of rows) {
      if (!r.hasSelection || !r.stay.checkIn || !r.stay.checkOut) continue;
      const cur = new Date(r.stay.checkIn);
      while (cur < r.stay.checkOut) {
        const k = dateKey(cur);
        if (!nightsMap.has(k)) {
          nightsMap.set(k, { date: new Date(cur), key: k, perGroup: {}, total: 0 });
        }
        const cell = nightsMap.get(k)!;
        cell.perGroup[r.group.key] = (cell.perGroup[r.group.key] ?? 0) + r.rooms;
        cell.total += r.rooms;
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }
    const cells = Array.from(nightsMap.values()).sort((a, b) => a.key.localeCompare(b.key));
    const peak = cells.length ? Math.max(...cells.map(c => c.total)) : 0;
    return { cells, peak };
  }, [rows]);

  const resetRoomsToPax = () => {
    if (!canEdit) return;
    setState(prev => ({
      ...prev,
      rooms: HOTEL_GROUPS.reduce((acc, g) => { acc[g.key] = g.pax; return acc; }, {} as Record<string, number>),
    }));
  };

  const updateRooms = (key: string, value: number) => {
    if (!canEdit) return;
    const g = HOTEL_GROUPS.find(x => x.key === key);
    if (!g) return;
    const clamped = Math.max(1, Math.min(g.pax, Math.round(value)));
    setState(prev => ({ ...prev, rooms: { ...prev.rooms, [key]: clamped } }));
  };

  const updateNotes = (notes: string) => {
    if (!canEdit) return;
    setState(prev => ({ ...prev, notes }));
  };

  const toggleChecklist = (id: string) => {
    if (!canEdit) return;
    setState(prev => ({
      ...prev,
      checklist: prev.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c),
    }));
  };

  if (loading || flightsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-muted-foreground text-sm">Cargando hotel...</span>
        </div>
      </div>
    );
  }

  const allDecided = totals.missing === 0;

  const handlePrint = () => {
    if (!allDecided) return;
    const printRows = rows.map(r => ({
      groupKey: r.group.key,
      groupLabel: r.group.label,
      pax: r.group.pax,
      rooms: r.rooms,
      checkIn: r.stay.checkIn,
      checkOut: r.stay.checkOut,
      nights: r.hasSelection ? r.stay.nights : 0,
      subtotal: r.subtotal,
    }));
    const printCells = nightBreakdown.cells.map(c => ({
      date: c.date, key: c.key, perGroup: c.perGroup, total: c.total,
    }));

    const w = window.open("", "_blank", "width=1100,height=850");
    if (!w) return;
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Solicitud de hotel — EmTech Digital El Salvador 2026</title></head><body><div id="root"></div></body></html>`);
    w.document.close();
    const mount = w.document.getElementById("root");
    if (!mount) return;
    const root = createRoot(mount);
    root.render(
      <HotelPrintView
        rows={printRows}
        nightBreakdown={printCells}
        totals={{ totalRoomNights: totals.totalRoomNights, totalCost: totals.totalCost, totalPaxNights: totals.totalPaxNights }}
        notes={state.notes}
        rateBase={state.rateBase}
        rateTotal={state.rateTotal}
        generatedAt={new Date()}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-card-border bg-gradient-to-br from-purple-500/10 to-indigo-500/10 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-purple-600" />
              Hotel / Acomodaciones SAL
              <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/20 ml-1">BLOQUE NEGOCIADO</Badge>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              ${HOTEL_RATE_BASE} base + IVA + Turismo = <b>${HOTEL_RATE_TOTAL.toFixed(2)}</b> por habitación/noche · 1 hab/pax · Noches derivadas de los vuelos seleccionados
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!allDecided}
              title={allDecided ? "Abre una versión imprimible para enviar al hotel" : `Selecciona vuelo para ${totals.missing} grupo(s) antes de imprimir`}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                allDecided
                  ? "bg-purple-600 text-white border-purple-600 hover:bg-purple-700"
                  : "bg-muted text-muted-foreground border-border cursor-not-allowed",
              )}
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir / Exportar PDF
            </button>
            <SyncIndicator saving={saving} lastSaved={lastSaved} error={error} />
          </div>
        </div>
        {meta && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Última edición por {meta.lastEditedBy} ({meta.lastEditedByOrg}) · {new Date(meta.lastEditedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Habitaciones-noche" value={String(totals.totalRoomNights)} sub={`${totals.totalPaxNights} pax-noches`} icon={BedDouble} color="bg-purple-500/10 text-purple-600" />
        <KpiCard label="Costo total c/IVA" value={formatUSD(totals.totalCost)} sub={`@ $${HOTEL_RATE_TOTAL.toFixed(2)}/noche`} icon={Hotel} color="bg-indigo-500/10 text-indigo-600" />
        <KpiCard label="Combinado vuelos + hotel" value={formatUSD(flightTotal + totals.totalCost)} sub={`${formatUSD(flightTotal)} vuelos`} icon={Plane} color="bg-blue-500/10 text-blue-600" />
        <KpiCard
          label="Grupos"
          value={`${HOTEL_GROUPS.length - totals.missing} / ${HOTEL_GROUPS.length}`}
          sub={allDecided ? "Todos con vuelo seleccionado" : `${totals.missing} sin vuelo seleccionado`}
          icon={allDecided ? CheckCircle2 : AlertTriangle}
          color={allDecided ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}
        />
      </div>

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="desglose">Desglose por noche</TabsTrigger>
          <TabsTrigger value="comparativa">Comparativa</TabsTrigger>
          <TabsTrigger value="acciones">Notas y acciones</TabsTrigger>
        </TabsList>

        {/* RESUMEN */}
        <TabsContent value="resumen" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-3 rounded-lg border border-card-border bg-card p-3">
            <p className="text-sm text-muted-foreground">
              Política del evento: <b>1 habitación por persona (privadas)</b>. Editá habitaciones por grupo abajo (min 1, max = pax).
            </p>
            <button
              onClick={resetRoomsToPax}
              disabled={!canEdit}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                canEdit ? "bg-card border-border hover:bg-muted" : "bg-muted text-muted-foreground border-border cursor-not-allowed",
              )}
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Resetear a 1 hab/pax
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rows.map(r => (
              <div key={r.group.key} className="rounded-xl border border-card-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm">{r.group.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <Users className="w-3 h-3" /> {r.group.pax} pax
                    </p>
                  </div>
                  {!r.hasSelection && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                      Selecciona vuelo
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Habs</p>
                    <Input
                      type="number"
                      min={1}
                      max={r.group.pax}
                      value={r.rooms}
                      disabled={!canEdit}
                      onChange={(e) => updateRooms(r.group.key, parseInt(e.target.value, 10) || 1)}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Noches</p>
                    <p className="text-sm font-bold mt-1 h-8 flex items-center">{r.hasSelection ? r.stay.nights : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Pax-noches</p>
                    <p className="text-sm font-bold mt-1 h-8 flex items-center">{r.hasSelection ? r.paxNights : "—"}</p>
                  </div>
                </div>

                {r.hasSelection && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Check-in {fmtDateShort(r.stay.checkIn)} → Check-out {fmtDateShort(r.stay.checkOut)}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold">Subtotal c/IVA</span>
                  <span className="text-base font-bold">{formatUSD(r.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-gradient-to-br from-purple-700 to-indigo-700 text-white p-5 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">Total bloque hotel</p>
              <p className="text-3xl font-extrabold mt-1">{formatUSD(totals.totalCost)}</p>
              <p className="text-xs opacity-80 mt-1">{totals.totalRoomNights} habitaciones-noche · {totals.totalPaxNights} pax-noches</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider opacity-80">Combinado vuelos + hotel</p>
              <p className="text-2xl font-bold mt-1">{formatUSD(flightTotal + totals.totalCost)}</p>
            </div>
          </div>
        </TabsContent>

        {/* DESGLOSE */}
        <TabsContent value="desglose" className="space-y-4 mt-4">
          <div className="rounded-xl border border-card-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Habitaciones por noche</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Picos resaltados. Vacíos = grupo sin estancia esa noche.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5">Noche</th>
                    {HOTEL_GROUPS.map(g => (
                      <th key={g.key} className="text-right px-3 py-2.5">{g.label.replace(/^Grupo /, "").split(" — ")[0]}</th>
                    ))}
                    <th className="text-right px-4 py-2.5">Total</th>
                    <th className="text-right px-4 py-2.5">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {nightBreakdown.cells.length === 0 ? (
                    <tr>
                      <td colSpan={HOTEL_GROUPS.length + 3} className="px-4 py-6 text-center text-muted-foreground text-xs">
                        Sin estancias — selecciona vuelos en la página de Vuelos SAL.
                      </td>
                    </tr>
                  ) : nightBreakdown.cells.map(cell => {
                    const isPeak = cell.total === nightBreakdown.peak && nightBreakdown.peak > 0;
                    return (
                      <tr key={cell.key} className={cn("border-t border-border/50", isPeak && "bg-purple-500/5")}>
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{fmtDateShort(cell.date)}</div>
                          <div className="text-[10px] text-muted-foreground">{cell.key}</div>
                        </td>
                        {HOTEL_GROUPS.map(g => (
                          <td key={g.key} className="px-3 py-2.5 text-right font-mono text-xs">
                            {cell.perGroup[g.key] ?? <span className="text-muted-foreground/40">—</span>}
                          </td>
                        ))}
                        <td className={cn("px-4 py-2.5 text-right font-mono font-bold", isPeak && "text-purple-600")}>
                          {cell.total}{isPeak && " ⚡"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatUSD(cell.total * state.rateTotal)}</td>
                      </tr>
                    );
                  })}
                  {nightBreakdown.cells.length > 0 && (
                    <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                      <td className="px-4 py-3" colSpan={HOTEL_GROUPS.length + 1}>TOTAL</td>
                      <td className="px-4 py-3 text-right font-mono">{totals.totalRoomNights}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatUSD(totals.totalCost)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* COMPARATIVA */}
        <TabsContent value="comparativa" className="space-y-4 mt-4">
          <div className="rounded-xl border border-card-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Costo hotel según la opción de vuelo elegida. "Ahorro posible" aparece cuando hay una opción con menos noches.
            </p>
          </div>

          {rows.map(r => {
            const currentNights = r.stay.nights;
            const minCost = r.rooms * r.minNights * state.rateTotal;
            const maxCost = r.rooms * r.maxNights * state.rateTotal;
            const currentCost = r.subtotal;
            const savingsVsMax = maxCost - currentCost;
            const upsideVsMin = currentCost - minCost;
            return (
              <div key={r.group.key} className="rounded-xl border border-card-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold text-sm">{r.group.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      {r.rooms} habs · rango {r.minNights}–{r.maxNights} noches según opción
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {upsideVsMin > 0 && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Ahorro posible {formatUSD(upsideVsMin)}
                      </Badge>
                    )}
                    {savingsVsMax > 0 && currentNights === r.minNights && (
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                        Mínimo elegido
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/20 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-2">Opción de vuelo</th>
                        <th className="text-left px-4 py-2">Horarios</th>
                        <th className="text-right px-4 py-2">Noches</th>
                        <th className="text-right px-4 py-2">Costo hotel</th>
                        <th className="text-right px-4 py-2">vs actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.optionStays.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground text-xs">Sin opciones con fechas válidas.</td></tr>
                      ) : r.optionStays.map(o => {
                        const isCurrent = o.opt.id === r.selected?.id;
                        const delta = o.cost - currentCost;
                        return (
                          <tr key={o.opt.id} className={cn("border-t border-border/50", isCurrent && "bg-purple-500/5")}>
                            <td className="px-4 py-2">
                              <div className="font-medium flex items-center gap-2">
                                {o.opt.airline}
                                <Badge variant="outline" className="text-[10px]">{o.opt.badge}</Badge>
                                {isCurrent && <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">Actual</Badge>}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{o.opt.stops}</div>
                            </td>
                            <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                              <div>{o.opt.scheduleIda}</div>
                              <div>{o.opt.scheduleVuelta}</div>
                            </td>
                            <td className="px-4 py-2 text-right font-mono">{o.nights}</td>
                            <td className="px-4 py-2 text-right font-mono">{formatUSD(o.cost)}</td>
                            <td className={cn("px-4 py-2 text-right font-mono", delta < 0 ? "text-emerald-600" : delta > 0 ? "text-red-500" : "text-muted-foreground")}>
                              {delta === 0 ? "—" : (
                                <span className="inline-flex items-center gap-1">
                                  {delta < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                  {formatUSD(Math.abs(delta))}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="rounded-xl bg-gradient-to-br from-blue-700 to-purple-700 text-white p-5">
            <p className="text-xs uppercase tracking-wider opacity-80">Costo combinado actual (vuelos + hotel)</p>
            <p className="text-3xl font-extrabold mt-1">{formatUSD(flightTotal + totals.totalCost)}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs opacity-90">
              <span>Vuelos: <b>{formatUSD(flightTotal)}</b></span>
              <span>Hotel: <b>{formatUSD(totals.totalCost)}</b></span>
              <span>{totals.totalRoomNights} habs-noche</span>
            </div>
          </div>
        </TabsContent>

        {/* NOTAS Y ACCIONES */}
        <TabsContent value="acciones" className="space-y-4 mt-4">
          <div className="rounded-xl border border-card-border bg-card p-4 space-y-2">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Notas internas</label>
            <Textarea
              value={state.notes}
              onChange={(e) => updateNotes(e.target.value)}
              disabled={!canEdit}
              placeholder="Notas sobre el bloque hotelero, late check-out, breakfast incluido, contacto del hotel, etc."
              className="min-h-[120px] text-sm"
            />
          </div>

          <div className="rounded-xl border border-card-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm">Checklist</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{state.checklist.filter(c => c.done).length} / {state.checklist.length} completados</p>
            </div>
            <ul className="divide-y divide-border/50">
              {state.checklist.map(item => (
                <li key={item.id} className="px-4 py-3 flex items-start gap-3">
                  <Checkbox
                    checked={item.done}
                    disabled={!canEdit}
                    onCheckedChange={() => toggleChecklist(item.id)}
                    className="mt-0.5"
                  />
                  <span className={cn("text-sm", item.done && "line-through text-muted-foreground")}>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
