import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plane, Users, Handshake, Cloud, CloudOff, Loader2, ExternalLink,
  TrendingDown, TrendingUp, CheckCircle2, ListChecks, MapPin, Calendar,
  UserPlus, Trash2, ChevronDown, ChevronRight, AlertTriangle, Download,
} from "lucide-react";
import { useFlightsApi } from "@/hooks/useFlightsApi";
import { useAuth } from "@/hooks/useAuth";
import type {
  FlightOption, FlightRouteGroup, FlightStatus, Passenger, SeatPreference, BaggageOption,
} from "@/data/flightsData";
import { formatUSD, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS: FlightStatus[] = ["Pendiente", "En revisión", "Aprobado", "Reservado"];

const STATUS_BADGE: Record<FlightStatus, string> = {
  "Pendiente": "bg-gray-500/10 text-gray-500 border-gray-500/20",
  "En revisión": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Aprobado": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Reservado": "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

const OPT_BADGE: Record<FlightOption["badge"], string> = {
  "RECOMENDADO": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "ALTERNATIVA": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "ECONÓMICO": "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

function getSelectedOption(route: FlightRouteGroup): FlightOption | undefined {
  return route.options.find(o => o.id === route.selectedOptionId) ?? route.options[0];
}

// Effective pax = roster length if non-empty, else the route's baseline pax.
// This way the roster auto-derives pricing/logistics once organizers populate
// it, while empty rosters preserve the current baseline behavior.
function effectivePax(route: FlightRouteGroup): number {
  return route.passengers.length > 0 ? route.passengers.length : route.pax;
}

interface ArrivalRow { date: string; time: string; origin: string; group: string; pax: number; flight: string; depTime: string }
interface DepartureRow { date: string; time: string; destination: string; group: string; pax: number; flight: string; arrTime: string }

const MONTH_ORDER = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function dateSortKey(d: string): number {
  // "16 nov 2026" → 20261116
  const m = d.match(/^(\d+)\s+(\w+)\s+(\d{4})/);
  if (!m) return 0;
  const day = parseInt(m[1], 10);
  const mon = MONTH_ORDER.indexOf(m[2].toLowerCase().slice(0, 3));
  const year = parseInt(m[3], 10);
  return year * 10000 + (mon + 1) * 100 + day;
}

function timeSortKey(t: string): number {
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 9999;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// Parses "17 nov 2026: SFO 13:20 → SAL 20:50" or "20 nov 2026: SAL → SFO"
function parseSegment(s: string): { date: string; origin: string; originTime: string; dest: string; destTime: string } | null {
  const m = s.match(/^(\d+\s+\w+\s+\d{4}):\s*([A-Z]{3})\s*(\S*)\s*→\s*([A-Z]{3})\s*(\S*)/);
  if (!m) return null;
  return {
    date: m[1],
    origin: m[2],
    originTime: m[3] || "",
    dest: m[4],
    destTime: m[5] || "",
  };
}

function deriveLogistics(routes: FlightRouteGroup[]): { arrivals: ArrivalRow[]; departures: DepartureRow[] } {
  const arrivals: ArrivalRow[] = [];
  const departures: DepartureRow[] = [];
  for (const r of routes) {
    const sel = getSelectedOption(r);
    if (!sel) continue;
    const pax = effectivePax(r);
    const flightLabel = `${sel.airline}${sel.flightNumbers.match(/AV\d+/) ? " " + sel.flightNumbers.match(/AV\d+/)![0] : ""}${sel.stops !== "Directo" ? ` (${sel.stops.replace(/^1 escala\s*/, "vía ").replace(/[()]/g, "")})` : ""}`;
    const ida = parseSegment(sel.scheduleIda);
    if (ida) {
      // Arrival to SAL (or final destination)
      arrivals.push({
        date: ida.date,
        time: ida.destTime || "Por confirmar",
        origin: ida.origin,
        group: r.label.replace(/^Grupo /, "Grupo "),
        pax,
        flight: flightLabel,
        depTime: ida.originTime || "Por confirmar",
      });
    }
    const vuelta = parseSegment(sel.scheduleVuelta);
    if (vuelta) {
      departures.push({
        date: vuelta.date,
        time: vuelta.originTime || "Por confirmar",
        destination: vuelta.dest,
        group: r.label,
        pax,
        flight: flightLabel,
        arrTime: vuelta.destTime || "",
      });
    }
  }
  arrivals.sort((a, b) => dateSortKey(a.date) - dateSortKey(b.date) || timeSortKey(a.time) - timeSortKey(b.time));
  departures.sort((a, b) => dateSortKey(a.date) - dateSortKey(b.date) || timeSortKey(a.time) - timeSortKey(b.time));
  return { arrivals, departures };
}

// ---- Final flight order export (client-side CSV) ----

interface FlightOrderRow {
  grupo: string;
  ruta: string;
  pax: number;
  aerolinea: string;
  claseTarifaria: string;
  numerosVuelo: string;
  itinerarioIda: string;
  itinerarioVuelta: string;
  escalas: string;
  duracion: string;
  incluye: string;
  tarifaPorPax: number;
  subtotal: number;
  tarifaOriginalPorPax: number;
  ahorroVsOriginal: number;
}

// Maps each route's currently selected option into a flat order row.
function buildFlightOrderRows(routes: FlightRouteGroup[]): FlightOrderRow[] {
  return routes.map(r => {
    const sel = getSelectedOption(r);
    const pax = effectivePax(r);
    const perPax = sel?.pricePerPax ?? 0;
    const subtotal = perPax * pax;
    const originalTotal = r.originalPerPax * pax;
    return {
      grupo: r.label,
      ruta: `${r.origin} → ${r.destination}`,
      pax,
      aerolinea: sel?.airline ?? "",
      claseTarifaria: sel?.fareClass ?? "",
      numerosVuelo: sel?.flightNumbers ?? "",
      itinerarioIda: sel?.scheduleIda ?? "",
      itinerarioVuelta: sel?.scheduleVuelta ?? "",
      escalas: sel?.stops ?? "",
      duracion: sel?.duration ?? "",
      incluye: sel?.includes ?? "",
      tarifaPorPax: perPax,
      subtotal,
      tarifaOriginalPorPax: r.originalPerPax,
      ahorroVsOriginal: originalTotal - subtotal,
    };
  });
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}

function downloadFlightOrderCsv(
  routes: FlightRouteGroup[],
  totals: { totalSelected: number; totalOriginal: number; totalPax: number },
  arrivals: ArrivalRow[],
  departures: DepartureRow[],
  nextSteps: string[],
) {
  const rows = buildFlightOrderRows(routes);
  const savings = totals.totalOriginal - totals.totalSelected;
  const lines: string[] = [];

  lines.push("EmTech Digital El Salvador 2026 — Orden Final de Vuelos");
  lines.push(`Generado: ${new Date().toLocaleString()}`);
  lines.push("");

  lines.push("ORDEN DE VUELOS (opción seleccionada por ruta)");
  lines.push(csvRow([
    "Grupo", "Ruta", "PAX", "Aerolínea", "Clase tarifaria", "Números de vuelo",
    "Itinerario ida", "Itinerario vuelta", "Escalas", "Duración", "Incluye",
    "Tarifa por pax", "Subtotal", "Tarifa original por pax", "Ahorro vs original",
  ]));
  for (const r of rows) {
    lines.push(csvRow([
      r.grupo, r.ruta, r.pax, r.aerolinea, r.claseTarifaria, r.numerosVuelo,
      r.itinerarioIda, r.itinerarioVuelta, r.escalas, r.duracion, r.incluye,
      r.tarifaPorPax, r.subtotal, r.tarifaOriginalPorPax, r.ahorroVsOriginal,
    ]));
  }
  lines.push(csvRow([
    "TOTAL", "", totals.totalPax, "", "", "", "", "", "", "", "",
    "", totals.totalSelected, totals.totalOriginal, savings,
  ]));
  lines.push("");

  lines.push("RESUMEN DE TOTALES");
  lines.push(csvRow(["Total PAX", totals.totalPax]));
  lines.push(csvRow(["Total seleccionado", totals.totalSelected]));
  lines.push(csvRow(["Total original", totals.totalOriginal]));
  lines.push(csvRow(["Ahorro total", savings]));
  lines.push("");

  lines.push("LLEGADAS (ARRIBOS A SAL)");
  lines.push(csvRow(["Fecha", "Hora llegada", "Origen", "Grupo", "PAX", "Vuelo", "Hora salida"]));
  for (const a of arrivals) {
    lines.push(csvRow([a.date, a.time, a.origin, a.group, a.pax, a.flight, a.depTime]));
  }
  lines.push("");

  lines.push("SALIDAS (REGRESOS DESDE SAL)");
  lines.push(csvRow(["Fecha", "Hora salida", "Destino", "Grupo", "PAX", "Vuelo", "Hora llegada"]));
  for (const d of departures) {
    lines.push(csvRow([d.date, d.time, d.destination, d.group, d.pax, d.flight, d.arrTime]));
  }
  lines.push("");

  lines.push("PRÓXIMOS PASOS");
  nextSteps.forEach((s, i) => lines.push(csvRow([i + 1, s])));

  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orden-vuelos-emtech-2026-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

export default function AerialTransportPage() {
  const { state, setState, loading, saving, lastSaved, error, meta } = useFlightsApi();
  const { user, permissions } = useAuth();
  const canEdit = !!user && permissions.canEdit;
  const [tab, setTab] = useState("resumen");

  const derivedLogistics = useMemo(() => deriveLogistics(state.routes), [state.routes]);

  const summary = useMemo(() => {
    const rows = state.routes.map(r => {
      const sel = getSelectedOption(r);
      const perPax = sel?.pricePerPax ?? 0;
      const pax = effectivePax(r);
      const subtotal = perPax * pax;
      const originalTotal = r.originalPerPax * pax;
      const initialTotal = r.initialLivePerPax * pax;
      return {
        route: r,
        selected: sel,
        pax,
        perPax,
        subtotal,
        originalTotal,
        initialTotal,
        vsOriginal: subtotal - originalTotal,
        vsInitial: subtotal - initialTotal,
      };
    });
    const totalSelected = rows.reduce((s, r) => s + r.subtotal, 0);
    const totalOriginal = rows.reduce((s, r) => s + r.originalTotal, 0);
    const totalPax = rows.reduce((s, r) => s + r.pax, 0);
    const decided = state.routes.filter(r => r.status === "Aprobado" || r.status === "Reservado").length;
    return { rows, totalSelected, totalOriginal, totalPax, decided };
  }, [state.routes]);

  const updateRoute = (id: string, patch: Partial<FlightRouteGroup>) => {
    setState(prev => ({
      ...prev,
      routes: prev.routes.map(r => r.id === id ? { ...r, ...patch } : r),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-muted-foreground text-sm">Loading flights...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-card-border bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Plane className="w-5 h-5 text-blue-600" />
              Vuelos San Salvador (SAL)
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 ml-1">PRECIOS EN VIVO</Badge>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Living document · 16/17 nov → 20 nov 2026 · {summary.totalPax} pasajeros · 5 grupos · 14 opciones válidas (regla escalas ≤5h)
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <SyncIndicator saving={saving} lastSaved={lastSaved} error={error} />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => downloadFlightOrderCsv(
                state.routes,
                { totalSelected: summary.totalSelected, totalOriginal: summary.totalOriginal, totalPax: summary.totalPax },
                derivedLogistics.arrivals,
                derivedLogistics.departures,
                state.nextSteps,
              )}
            >
              <Download className="w-4 h-4" />
              Exportar orden de vuelos
            </Button>
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
        <KpiCard label="Total seleccionado" value={formatUSD(summary.totalSelected)} sub={`${summary.totalPax} pax`} icon={Plane} color="bg-blue-500/10 text-blue-600" />
        <KpiCard label="Cotización original" value={formatUSD(summary.totalOriginal)} sub="Baseline Avianca" icon={Users} color="bg-gray-500/10 text-gray-500" />
        <KpiCard
          label="Ahorro vs original"
          value={formatUSD(Math.abs(summary.totalOriginal - summary.totalSelected))}
          sub={`${summary.totalOriginal > 0 ? (((summary.totalOriginal - summary.totalSelected) / summary.totalOriginal) * 100).toFixed(1) : 0}% menor`}
          icon={TrendingDown}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <KpiCard label="Decididos" value={`${summary.decided} / ${state.routes.length}`} sub="Aprobado o reservado" icon={CheckCircle2} color={summary.decided === state.routes.length ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="ahorros">Ahorros</TabsTrigger>
          <TabsTrigger value="logistica">Logística</TabsTrigger>
          <TabsTrigger value="opciones">Opciones</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="acciones">Acciones</TabsTrigger>
        </TabsList>

        {/* RESUMEN */}
        <TabsContent value="resumen" className="space-y-4 mt-4">
          {summary.rows.map(row => (
            <ResumenCard
              key={row.route.id}
              row={row}
              canEdit={canEdit}
              onStatus={(s) => updateRoute(row.route.id, { status: s })}
              onNotes={(n) => updateRoute(row.route.id, { notes: n })}
              onPassengers={(p) => updateRoute(row.route.id, { passengers: p })}
              onPick={() => setTab("opciones")}
            />
          ))}
          <TotalsStrip totalSelected={summary.totalSelected} totalOriginal={summary.totalOriginal} totalPax={summary.totalPax} />
        </TabsContent>

        {/* AHORROS */}
        <TabsContent value="ahorros" className="space-y-4 mt-4">
          <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold opacity-90">Ahorro total vs cotización original Avianca</p>
                <p className="text-3xl font-bold mt-1">{formatUSD(summary.totalOriginal - summary.totalSelected)}</p>
                <p className="text-xs opacity-80 mt-1">
                  {formatUSD(summary.totalSelected)} seleccionado · {formatUSD(summary.totalOriginal)} original
                </p>
              </div>
              <div className="text-right">
                <p className="text-5xl font-extrabold leading-none">
                  {summary.totalOriginal > 0 ? (((summary.totalOriginal - summary.totalSelected) / summary.totalOriginal) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs opacity-80 mt-1">menor que el quote original</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-card-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Ruta</th>
                  <th className="text-right px-4 py-3">Pax</th>
                  <th className="text-right px-4 py-3">$/pax actual</th>
                  <th className="text-right px-4 py-3">$/pax original</th>
                  <th className="text-right px-4 py-3">Subtotal actual</th>
                  <th className="text-right px-4 py-3">Subtotal original</th>
                  <th className="text-right px-4 py-3">Ahorro</th>
                  <th className="text-right px-4 py-3">%</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map(row => {
                  const saving = row.originalTotal - row.subtotal;
                  const pct = row.originalTotal > 0 ? (saving / row.originalTotal) * 100 : 0;
                  return (
                    <tr key={row.route.id} className="border-t border-border/50">
                      <td className="px-4 py-3 font-medium">{row.route.label}</td>
                      <td className="px-4 py-3 text-right font-mono">{row.route.pax}</td>
                      <td className="px-4 py-3 text-right font-mono">${row.perPax}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">${row.route.originalPerPax.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatUSD(row.subtotal)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatUSD(row.originalTotal)}</td>
                      <td className={cn("px-4 py-3 text-right font-mono font-semibold", saving >= 0 ? "text-emerald-600" : "text-red-500")}>
                        {saving >= 0 ? "↓" : "↑"} {formatUSD(Math.abs(saving))}
                      </td>
                      <td className={cn("px-4 py-3 text-right font-mono", saving >= 0 ? "text-emerald-600" : "text-red-500")}>
                        {pct >= 0 ? "-" : "+"}{Math.abs(pct).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                  <td className="px-4 py-3" colSpan={4}>TOTAL</td>
                  <td className="px-4 py-3 text-right font-mono">{formatUSD(summary.totalSelected)}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatUSD(summary.totalOriginal)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600">↓ {formatUSD(summary.totalOriginal - summary.totalSelected)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600">
                    -{summary.totalOriginal > 0 ? (((summary.totalOriginal - summary.totalSelected) / summary.totalOriginal) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* LOGÍSTICA */}
        <TabsContent value="logistica" className="space-y-6 mt-4">
          <LogisticsSection
            title="Arribos a SAL"
            icon={MapPin}
            rows={derivedLogistics.arrivals.map(a => ({
              date: a.date,
              time: a.time,
              cityLabel: `Desde ${a.origin}`,
              group: a.group,
              pax: a.pax,
              flight: a.flight,
              otherTime: `Sale ${a.depTime}`,
            }))}
            otherTimeLabel="Salida origen"
            cityLabel="Origen"
          />
          <LogisticsSection
            title="Salidas desde SAL"
            icon={Plane}
            rows={derivedLogistics.departures.map(d => ({
              date: d.date,
              time: d.time,
              cityLabel: `Hacia ${d.destination}`,
              group: d.group,
              pax: d.pax,
              flight: d.flight,
              otherTime: d.arrTime ? `Llega ${d.arrTime}` : "Por confirmar",
            }))}
            otherTimeLabel="Llegada destino"
            cityLabel="Destino"
          />
        </TabsContent>

        {/* OPCIONES */}
        <TabsContent value="opciones" className="space-y-5 mt-4">
          {state.routes.map(route => (
            <div key={route.id} className="rounded-xl border border-card-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold">{route.label}</h3>
                  <p className="text-xs text-muted-foreground">{route.pax} pax · default {route.defaultFareClass}</p>
                </div>
                <Badge className={STATUS_BADGE[route.status]}>{route.status}</Badge>
              </div>
              <div className="divide-y divide-border/50">
                {route.options.map(opt => {
                  const isSelected = opt.id === route.selectedOptionId;
                  return (
                    <div key={opt.id} className={cn("px-5 py-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-4 items-start", isSelected && "bg-emerald-500/5")}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{opt.airline}</span>
                          <Badge className={OPT_BADGE[opt.badge]}>{opt.badge}</Badge>
                          <Badge variant="outline" className="text-[10px]">{opt.fareClass}</Badge>
                          <span className="text-xs text-muted-foreground">{opt.flightNumbers}</span>
                        </div>
                        <p className="text-xs text-foreground/80 font-mono"><span className="font-semibold not-italic font-sans">Ida:</span> {opt.scheduleIda}</p>
                        <p className="text-xs text-foreground/80 font-mono"><span className="font-semibold not-italic font-sans">Vuelta:</span> {opt.scheduleVuelta}</p>
                        <p className="text-xs text-muted-foreground">{opt.duration} · {opt.stops}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.includes}</p>
                        <a href={opt.deepLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                          <ExternalLink className="w-3 h-3" /> Validar en Google Flights
                        </a>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-xs text-muted-foreground">Precio/pax</p>
                        <p className="text-xl font-bold">${opt.pricePerPax}</p>
                        <p className="text-xs text-muted-foreground mt-1">Subtotal {route.pax} pax</p>
                        <p className="text-sm font-semibold">{formatUSD(opt.pricePerPax * route.pax)}</p>
                      </div>
                      <button
                        disabled={!canEdit || isSelected}
                        onClick={() => updateRoute(route.id, { selectedOptionId: opt.id })}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap self-center",
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 cursor-default"
                            : canEdit
                              ? "bg-card border-border hover:bg-muted"
                              : "bg-muted text-muted-foreground border-border cursor-not-allowed",
                        )}
                      >
                        {isSelected ? "✓ Seleccionado" : "Seleccionar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* HISTORIAL */}
        <TabsContent value="historial" className="space-y-4 mt-4">
          <div className="rounded-xl border border-card-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Capturas de precio por opción a lo largo del tiempo. Cambios entre capturas se resaltan en verde (baja) o rojo (sube).
            </p>
          </div>
          {state.routes.map(route => (
            <div key={route.id} className="rounded-xl border border-card-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30">
                <h3 className="font-semibold">{route.label}</h3>
                <p className="text-xs text-muted-foreground">Última captura: {route.lastCaptureDate}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2">Opción</th>
                      <th className="text-left px-4 py-2">Airline</th>
                      <th className="text-right px-4 py-2">Original</th>
                      {state.history.map(h => (
                        <th key={h.date} className="text-right px-4 py-2">{h.date}</th>
                      ))}
                      <th className="text-right px-4 py-2">Δ vs original</th>
                    </tr>
                  </thead>
                  <tbody>
                    {route.options.map(opt => {
                      const capturedPrices = state.history.map(h => h.prices[opt.id]);
                      const last = capturedPrices[capturedPrices.length - 1] ?? opt.pricePerPax;
                      const vsOrig = last - route.originalPerPax;
                      return (
                        <tr key={opt.id} className={cn("border-t border-border/50", opt.id === route.selectedOptionId && "bg-emerald-500/5")}>
                          <td className="px-4 py-2">
                            <Badge className={cn(OPT_BADGE[opt.badge], "text-[10px]")}>{opt.badge}</Badge>
                          </td>
                          <td className="px-4 py-2">{opt.airline}</td>
                          <td className="px-4 py-2 text-right font-mono text-muted-foreground">${route.originalPerPax.toFixed(2)}</td>
                          {capturedPrices.map((p, i) => {
                            const prev = i === 0 ? null : capturedPrices[i - 1];
                            const delta = prev != null && p != null ? p - prev : null;
                            return (
                              <td key={i} className="px-4 py-2 text-right font-mono">
                                ${p ?? "—"}
                                {delta != null && delta !== 0 && (
                                  <span className={cn("ml-1 text-[10px]", delta > 0 ? "text-red-500" : "text-emerald-600")}>
                                    {delta > 0 ? "↑" : "↓"}{Math.abs(delta)}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className={cn("px-4 py-2 text-right font-mono font-semibold", vsOrig < 0 ? "text-emerald-600" : vsOrig > 0 ? "text-red-500" : "text-muted-foreground")}>
                            {vsOrig === 0 ? "0" : `${vsOrig < 0 ? "↓" : "↑"} $${Math.abs(vsOrig).toFixed(0)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ACCIONES */}
        <TabsContent value="acciones" className="space-y-4 mt-4">
          <div className="rounded-xl border border-card-border bg-card p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <ListChecks className="w-4 h-4 text-amber-600" />
              Próximos pasos & checklist
            </h3>
            <ul className="space-y-2 text-sm">
              {state.nextSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 px-3 py-2 rounded-md border border-border/50 bg-muted/30">
                  <span className="text-xs text-muted-foreground mt-0.5 font-mono w-5 shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Handshake className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-700">Avianca / Key Institute Convention — Pendiente de documentación</p>
                <p className="mt-1">
                  Compromiso paralelo de Avianca con Key Institute: $22,500 cash + $22,500 in-kind. El in-kind cubre un evento PR durante el lanzamiento (no el evento principal). Una vez firmado, Avianca podría cubrir el bloque de vuelos bajo términos negociados — independiente del pricing de Google Flights mostrado arriba.
                </p>
                <p className="mt-1 text-amber-600 font-medium">Status: A la espera de documentación formal.</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub: string; icon: any; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-card-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </motion.div>
  );
}

function ResumenCard({ row, canEdit, onStatus, onNotes, onPassengers, onPick }: {
  row: { route: FlightRouteGroup; selected: FlightOption | undefined; pax: number; perPax: number; subtotal: number; originalTotal: number; vsOriginal: number; vsInitial: number; initialTotal: number };
  canEdit: boolean;
  onStatus: (s: FlightStatus) => void;
  onNotes: (n: string) => void;
  onPassengers: (p: Passenger[]) => void;
  onPick: () => void;
}) {
  const { route, selected, pax, perPax, subtotal, originalTotal, vsOriginal, vsInitial } = row;
  const [showRoster, setShowRoster] = useState(false);
  const rosterCount = route.passengers.length;
  const mismatch = rosterCount > 0 && rosterCount !== route.pax;
  const paxDerived = rosterCount > 0;
  return (
    <div className="rounded-xl border border-card-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">{route.label}</h3>
          <p className="text-xs text-muted-foreground">
            {pax} pax{paxDerived && pax !== route.pax ? ` (roster · baseline ${route.pax})` : paxDerived ? " (roster)" : ""} · {selected?.airline} · {selected?.fareClass} · {selected?.stops}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit ? (
            <Select value={route.status} onValueChange={(v) => onStatus(v as FlightStatus)}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Badge className={STATUS_BADGE[route.status]}>{route.status}</Badge>
          )}
        </div>
      </div>
      <div className="p-5 grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-5">
        <div className="space-y-1.5 text-sm">
          {selected ? (
            <>
              <p className="font-mono text-xs"><span className="font-semibold font-sans">Ida:</span> {selected.scheduleIda}</p>
              <p className="font-mono text-xs"><span className="font-semibold font-sans">Vuelta:</span> {selected.scheduleVuelta}</p>
              <p className="text-xs text-muted-foreground">{selected.duration}</p>
              <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-2 mt-2">{selected.includes}</p>
              <a href={selected.deepLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                <ExternalLink className="w-3 h-3" /> Validar en Google Flights
              </a>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin opción seleccionada.</p>
          )}
        </div>
        <div className="text-xs space-y-1">
          <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Varianza</p>
          <p className={vsOriginal < 0 ? "text-emerald-600 font-medium" : vsOriginal > 0 ? "text-red-500 font-medium" : "text-muted-foreground"}>
            vs Original (${route.originalPerPax.toFixed(2)}/pax): {vsOriginal < 0 ? "↓" : "↑"} ${Math.abs(vsOriginal / pax).toFixed(2)}/pax
          </p>
          <p className={vsInitial < 0 ? "text-emerald-600 font-medium" : vsInitial > 0 ? "text-red-500 font-medium" : "text-muted-foreground"}>
            vs Inicial Live (${route.initialLivePerPax}/pax): {vsInitial === 0 ? "sin cambio" : `${vsInitial < 0 ? "↓" : "↑"} $${Math.abs(vsInitial / pax).toFixed(2)}/pax`}
          </p>
          <p className="text-muted-foreground pt-1">Última captura: {route.lastCaptureDate}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Precio / pax</p>
          <p className="text-2xl font-extrabold">${perPax}</p>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold mt-2">Subtotal ({pax} pax)</p>
          <p className="text-lg font-bold">{formatUSD(subtotal)}</p>
          <p className={cn("text-xs font-semibold mt-1", vsOriginal < 0 ? "text-emerald-600" : vsOriginal > 0 ? "text-red-500" : "text-muted-foreground")}>
            {vsOriginal < 0 ? "↓" : vsOriginal > 0 ? "↑" : ""} {formatUSD(Math.abs(vsOriginal))} vs original
          </p>
        </div>
      </div>
      <div className="px-5 pb-4 -mt-1 flex items-center gap-3 flex-wrap">
        <button onClick={onPick} className="text-xs text-blue-600 hover:underline">Cambiar opción →</button>
        <button
          onClick={() => setShowRoster(s => !s)}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          {showRoster ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Pasajeros ({rosterCount}/{route.pax})
        </button>
        {mismatch && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5">
            <AlertTriangle className="w-3 h-3" />
            Roster ({rosterCount}) no coincide con pax ({route.pax})
          </span>
        )}
      </div>
      {showRoster && (
        <div className="px-5 pb-5">
          <PassengerRoster
            passengers={route.passengers}
            canEdit={canEdit}
            onChange={onPassengers}
          />
        </div>
      )}
      <div className="px-5 pb-5">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Notas</label>
        <Textarea
          value={route.notes}
          onChange={(e) => onNotes(e.target.value)}
          disabled={!canEdit}
          placeholder="Notas para este grupo..."
          className="mt-1 min-h-[60px] text-sm"
        />
      </div>
    </div>
  );
}

const SEAT_OPTIONS: SeatPreference[] = ["Ventana", "Pasillo", "Sin preferencia"];
const BAGGAGE_OPTIONS: BaggageOption[] = ["Carry-on", "23kg", "32kg", "2 x 23kg"];

function makePassengerId(): string {
  return `pax-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function PassengerRoster({ passengers, canEdit, onChange }: {
  passengers: Passenger[];
  canEdit: boolean;
  onChange: (p: Passenger[]) => void;
}) {
  const updatePassenger = (id: string, patch: Partial<Passenger>) => {
    onChange(passengers.map(p => p.id === id ? { ...p, ...patch } : p));
  };
  const addPassenger = () => {
    onChange([...passengers, {
      id: makePassengerId(),
      name: "",
      email: "",
      passport: "",
      seatPreference: "Sin preferencia",
      baggage: "23kg",
      notes: "",
    }]);
  };
  const removePassenger = (id: string) => {
    onChange(passengers.filter(p => p.id !== id));
  };

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20">
      <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Roster ({passengers.length})
          </span>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={addPassenger} className="h-7 text-xs gap-1">
            <UserPlus className="w-3 h-3" /> Añadir pasajero
          </Button>
        )}
      </div>
      {passengers.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground text-center">
          Sin pasajeros registrados. {canEdit ? "Añade el primero." : ""}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground text-[10px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-2 py-2 w-8">#</th>
                <th className="text-left px-2 py-2">Nombre</th>
                <th className="text-left px-2 py-2">Email</th>
                <th className="text-left px-2 py-2">Pasaporte</th>
                <th className="text-left px-2 py-2">Asiento</th>
                <th className="text-left px-2 py-2">Equipaje</th>
                <th className="text-left px-2 py-2">Notas</th>
                {canEdit && <th className="w-8"></th>}
              </tr>
            </thead>
            <tbody>
              {passengers.map((p, i) => (
                <tr key={p.id} className="border-t border-border/40">
                  <td className="px-2 py-1.5 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={p.name}
                      onChange={(e) => updatePassenger(p.id, { name: e.target.value })}
                      disabled={!canEdit}
                      placeholder="Nombre completo"
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="email"
                      value={p.email}
                      onChange={(e) => updatePassenger(p.id, { email: e.target.value })}
                      disabled={!canEdit}
                      placeholder="email@…"
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={p.passport}
                      onChange={(e) => updatePassenger(p.id, { passport: e.target.value })}
                      disabled={!canEdit}
                      placeholder="Núm. pasaporte"
                      className="h-7 text-xs font-mono"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    {canEdit ? (
                      <Select
                        value={p.seatPreference}
                        onValueChange={(v) => updatePassenger(p.id, { seatPreference: v as SeatPreference })}
                      >
                        <SelectTrigger className="h-7 text-xs w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEAT_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span>{p.seatPreference}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {canEdit ? (
                      <Select
                        value={p.baggage}
                        onValueChange={(v) => updatePassenger(p.id, { baggage: v as BaggageOption })}
                      >
                        <SelectTrigger className="h-7 text-xs w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BAGGAGE_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span>{p.baggage}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={p.notes ?? ""}
                      onChange={(e) => updatePassenger(p.id, { notes: e.target.value })}
                      disabled={!canEdit}
                      placeholder="Alergias, dietas…"
                      className="h-7 text-xs"
                    />
                  </td>
                  {canEdit && (
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => removePassenger(p.id)}
                        className="text-muted-foreground hover:text-red-500"
                        aria-label="Eliminar pasajero"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TotalsStrip({ totalSelected, totalOriginal, totalPax }: { totalSelected: number; totalOriginal: number; totalPax: number }) {
  const saving = totalOriginal - totalSelected;
  const pct = totalOriginal > 0 ? (saving / totalOriginal) * 100 : 0;
  return (
    <div className="rounded-xl bg-[#1e3a5f] text-white p-5 flex items-center justify-between flex-wrap gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-wide opacity-70">Total seleccionado</p>
        <p className="text-2xl font-extrabold">{formatUSD(totalSelected)}</p>
        <p className="text-xs opacity-70 mt-0.5">{totalPax} pax</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide opacity-70">Original</p>
        <p className="text-2xl font-extrabold opacity-80 line-through">{formatUSD(totalOriginal)}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] uppercase tracking-wide opacity-70">Ahorro</p>
        <p className="text-2xl font-extrabold text-emerald-300">
          {saving >= 0 ? <TrendingDown className="inline w-5 h-5" /> : <TrendingUp className="inline w-5 h-5" />} {formatUSD(Math.abs(saving))}
        </p>
        <p className="text-xs opacity-80">{pct >= 0 ? "-" : "+"}{Math.abs(pct).toFixed(1)}% vs original</p>
      </div>
    </div>
  );
}

function LogisticsSection({ title, icon: Icon, rows, otherTimeLabel, cityLabel }: {
  title: string;
  icon: any;
  rows: { date: string; time: string; cityLabel: string; group: string; pax: number; flight: string; otherTime: string }[];
  otherTimeLabel: string;
  cityLabel: string;
}) {
  // Group by date
  const byDate = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push(r);
  }
  return (
    <div className="rounded-xl border border-card-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {Array.from(byDate.entries()).map(([date, dateRows]) => (
        <div key={date}>
          <div className="px-5 py-2 bg-muted/20 border-t border-border/50 text-xs font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> {date}
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-2 w-24">Hora SAL</th>
                <th className="text-left px-5 py-2">{cityLabel}</th>
                <th className="text-left px-5 py-2">Grupo</th>
                <th className="text-right px-5 py-2">Pax</th>
                <th className="text-left px-5 py-2">Vuelo</th>
                <th className="text-left px-5 py-2">{otherTimeLabel}</th>
              </tr>
            </thead>
            <tbody>
              {dateRows.map((r, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="px-5 py-2 font-mono font-semibold">{r.time}</td>
                  <td className="px-5 py-2">{r.cityLabel}</td>
                  <td className="px-5 py-2">{r.group}</td>
                  <td className="px-5 py-2 text-right font-mono">{r.pax}</td>
                  <td className="px-5 py-2 text-xs">{r.flight}</td>
                  <td className="px-5 py-2 text-xs text-muted-foreground">{r.otherTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
