import { motion } from "framer-motion";
import { PlaneLanding, PlaneTakeoff, Bus, Clock, Coffee, CheckCircle2 } from "lucide-react";
import {
  GROUND_TRANSPORT_DATA,
  GROUND_IVA_RATE,
  MIGRATION_MIN,
  AIRPORT_LEAD_MIN,
  VEHICLE_UNIT_PRICES,
  VEHICLE_CAPACITY,
  type GroundTransportData,
  type ArrivalGroup,
  type DepartureGroup,
  type LocalSegment,
  type FreeTimeGroup,
  type VehicleAssignment,
} from "@/data/budgetData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatUSD, cn } from "@/lib/utils";
import { EditableCell } from "@/components/EditableCell";

// ── time helpers ──────────────────────────────────────────────
function parseHHMM(t: string): number | null {
  const m = /(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function fmtHHMM(mins: number): string {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function fmtHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// ── cost helpers ──────────────────────────────────────────────
function vehicleBase(v: VehicleAssignment): number {
  return VEHICLE_UNIT_PRICES[v.type];
}
function groupBase(vehicles: VehicleAssignment[]): number {
  return vehicles.reduce((s, v) => s + vehicleBase(v), 0);
}
const withIva = (n: number) => n * (1 + GROUND_IVA_RATE);

// ── capacity bar ──────────────────────────────────────────────
function CapacityBar({ v }: { v: VehicleAssignment }) {
  const cap = VEHICLE_CAPACITY[v.type];
  const ratio = cap > 0 ? v.pax / cap : 0;
  const over = ratio >= 1;
  const width = Math.min(ratio, 1) * 100;
  const detail = v.maletas != null
    ? `${v.pax} pax · ${v.maletas} maletas · ${v.carry ?? 0} carry${v.dobleEquipaje ? " · doble equipaje" : ""}`
    : `${v.pax} pax`;
  return (
    <div className="flex items-center gap-3 py-2 border-t border-border/60">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[13px] mb-1">
          <span className="font-medium">{v.type}</span>
          <span className={cn(over ? "text-amber-600" : "text-muted-foreground")}>{detail}</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={cn("h-full rounded-full", over ? "bg-amber-500" : "bg-blue-500")}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
      <span className="text-[13px] text-muted-foreground font-mono w-16 text-right">
        {formatUSD(withIva(vehicleBase(v)))}
      </span>
    </div>
  );
}

const cabinClass = "text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border";
const paxBadgeClass = "text-xs font-medium px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 whitespace-nowrap";

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl p-4 border", accent ? "bg-blue-500/10 border-blue-500/20" : "bg-muted/50 border-card-border")}>
      <div className={cn("text-xs mb-1", accent ? "text-blue-600" : "text-muted-foreground")}>{label}</div>
      <div className={cn("text-2xl font-semibold", accent ? "text-blue-600" : "text-foreground")}>{value}</div>
    </div>
  );
}

export default function GroundTransportPage() {
  const [data, setData] = useLocalStorage<GroundTransportData>("ground-transport-v3", GROUND_TRANSPORT_DATA);

  // ── update helpers ──────────────────────────────────────────
  const updateArrival = (id: string, patch: Partial<ArrivalGroup>) =>
    setData(prev => ({ ...prev, arrivals: prev.arrivals.map(a => a.id === id ? { ...a, ...patch } : a) }));
  const updateDeparture = (id: string, patch: Partial<DepartureGroup>) =>
    setData(prev => ({ ...prev, departures: prev.departures.map(d => d.id === id ? { ...d, ...patch } : d) }));
  const updateSegment = (id: string, patch: Partial<LocalSegment>) =>
    setData(prev => ({ ...prev, localSegments: prev.localSegments.map(s => s.id === id ? { ...s, ...patch } : s) }));
  const updateFreeTime = (id: string, patch: Partial<FreeTimeGroup>) =>
    setData(prev => ({ ...prev, freeTime: prev.freeTime.map(f => f.id === id ? { ...f, ...patch } : f) }));

  // ── totals (base, before IVA) ───────────────────────────────
  const arrivalsBase = data.arrivals.reduce((s, a) => s + groupBase(a.vehicles), 0);
  const departuresBase = data.departures.reduce((s, d) => s + groupBase(d.vehicles), 0);
  const localBase = data.localSegments.reduce((s, seg) => s + groupBase(seg.vehicles), 0);
  const subtotalBase = arrivalsBase + departuresBase + localBase;
  const totalWithIva = withIva(subtotalBase);

  const localTramos = data.localSegments.length;

  return (
    <div className="space-y-10">
      {/* ── Summary KPIs ── */}
      <div>
        <p className="text-xs text-muted-foreground mb-3">
          Migración {MIGRATION_MIN} min · llegada al aeropuerto {AIRPORT_LEAD_MIN / 60}h antes · IVA {Math.round(GROUND_IVA_RATE * 100)}%
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi label="Ida (aeropuerto)" value={formatUSD(withIva(arrivalsBase))} />
          <Kpi label="Vuelta (aeropuerto)" value={formatUSD(withIva(departuresBase))} />
          <Kpi label="Transporte local" value={formatUSD(withIva(localBase))} />
          <Kpi label="Subtotal antes de IVA" value={formatUSD(subtotalBase)} />
          <Kpi label={`Total global con IVA ${Math.round(GROUND_IVA_RATE * 100)}%`} value={formatUSD(totalWithIva)} accent />
        </div>
      </div>

      {/* ── Llegadas ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <PlaneLanding className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold">Llegadas — SAL → Hyatt</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.arrivals.map(a => {
            const land = parseHHMM(a.aterriza);
            const pickup = land != null ? fmtHHMM(land + MIGRATION_MIN) : "—";
            const arrive = land != null ? fmtHHMM(land + MIGRATION_MIN + a.wazeMin) : "—";
            const subtotal = groupBase(a.vehicles);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-card-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{a.label}</span>
                    {a.cabin && <span className={cabinClass}>{a.cabin}</span>}
                  </div>
                  <span className={paxBadgeClass}>{a.pax} pax · {a.maletas} mal</span>
                </div>
                <div className="text-xs text-muted-foreground">{a.fecha} · Aterriza {a.aterriza}</div>

                <div className="flex items-center gap-2 my-3 px-3 py-2 bg-muted/50 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[13px] text-muted-foreground">Estimación Waze</span>
                  <EditableCell value={String(a.wazeMin)} onSave={v => updateArrival(a.id, { wazeMin: parseInt(v) || 0 })} type="number" className="font-mono w-14 text-center" />
                  <span className="text-[13px] text-muted-foreground">min</span>
                </div>

                <div className="flex gap-8 mb-1">
                  <div>
                    <div className="text-xs text-muted-foreground">Recoger en SAL</div>
                    <div className="text-base font-medium">{pickup}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Llegada Hyatt</div>
                    <div className="text-base font-medium">{arrive}</div>
                  </div>
                </div>

                <div className="mt-2">
                  {a.vehicles.map((v, i) => <CapacityBar key={i} v={v} />)}
                </div>
                <div className="flex justify-end items-baseline gap-2 mt-2 pt-2 border-t border-border">
                  <span className="text-[13px] text-muted-foreground">Subtotal</span>
                  <span className="text-sm font-semibold font-mono">{formatUSD(withIva(subtotal))}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Salidas ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <PlaneTakeoff className="w-4 h-4 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold">Salidas — Hyatt → SAL · 20 Nov</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.departures.map(d => {
            const flight = parseHHMM(d.vuelo);
            const arriveAirport = flight != null ? fmtHHMM(flight - AIRPORT_LEAD_MIN) : "—";
            const leaveHyatt = flight != null ? fmtHHMM(flight - AIRPORT_LEAD_MIN - d.wazeMin) : "—";
            const subtotal = groupBase(d.vehicles);
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-card-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{d.label}</span>
                    {d.cabin && <span className={cabinClass}>{d.cabin}</span>}
                  </div>
                  <span className={paxBadgeClass}>{d.pax} pax · {d.maletas} mal</span>
                </div>
                <div className="text-xs text-muted-foreground">{d.fecha} · Vuelo {d.vuelo}</div>
                {d.nota && <div className="text-[11px] text-muted-foreground/70 mt-0.5">{d.nota}</div>}

                <div className="flex items-center gap-2 my-3 px-3 py-2 bg-muted/50 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[13px] text-muted-foreground">Estimación Waze</span>
                  <EditableCell value={String(d.wazeMin)} onSave={v => updateDeparture(d.id, { wazeMin: parseInt(v) || 0 })} type="number" className="font-mono w-14 text-center" />
                  <span className="text-[13px] text-muted-foreground">min</span>
                </div>

                <div className="flex gap-8 mb-1">
                  <div>
                    <div className="text-xs text-muted-foreground">Salir Hyatt</div>
                    <div className="text-base font-medium">{leaveHyatt}</div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-600">Llegar aeropuerto (3h antes)</div>
                    <div className="text-base font-medium text-blue-600">{arriveAirport}</div>
                  </div>
                </div>

                <div className="mt-2">
                  {d.vehicles.map((v, i) => <CapacityBar key={i} v={v} />)}
                </div>
                <div className="flex justify-end items-baseline gap-2 mt-2 pt-2 border-t border-border">
                  <span className="text-[13px] text-muted-foreground">Subtotal</span>
                  <span className="text-sm font-semibold font-mono">{formatUSD(withIva(subtotal))}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Transporte local ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Bus className="w-4 h-4 text-violet-600" />
          </div>
          <h2 className="text-lg font-semibold">Transporte local (18–19 Nov)</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Kpi label="Tramos" value={String(localTramos)} />
          <Kpi label="Unidades/tramo" value="2 Hiace" />
          <Kpi label="Subtotal s/IVA" value={formatUSD(localBase)} />
          <Kpi label="Total local c/IVA" value={formatUSD(withIva(localBase))} accent />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.localSegments.map(seg => {
            const subtotal = groupBase(seg.vehicles);
            const target = seg.objetivo ? parseHHMM(seg.objetivo) : null;
            const onTime = target != null && seg.llegarMin != null ? seg.llegarMin <= target : null;
            return (
              <motion.div
                key={seg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-card-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium">{seg.ruta}</span>
                  <span className="text-xs text-muted-foreground">{seg.fecha}</span>
                </div>
                <div className="text-[11px] text-muted-foreground/70 mt-0.5">{seg.nota}</div>

                <div className="flex items-center gap-2 my-3 px-3 py-2 bg-muted/50 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[13px] text-muted-foreground">Estimación Waze</span>
                  <EditableCell value={String(seg.wazeMin)} onSave={v => updateSegment(seg.id, { wazeMin: parseInt(v) || 0 })} type="number" className="font-mono w-14 text-center" />
                  <span className="text-[13px] text-muted-foreground">min</span>
                </div>

                <div className="flex gap-8 mb-1">
                  <div>
                    <div className="text-xs text-muted-foreground">Salir</div>
                    <div className="text-base font-medium">{seg.salir}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Llegar</div>
                    <div className="text-base font-medium">{seg.llegar}</div>
                  </div>
                </div>
                {onTime && (
                  <div className="mt-1.5 flex items-center gap-1 text-emerald-600 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    dentro de objetivo {seg.objetivo}
                  </div>
                )}

                <div className="mt-2">
                  {seg.vehicles.map((v, i) => <CapacityBar key={i} v={v} />)}
                </div>
                <div className="flex justify-end items-baseline gap-2 mt-2 pt-2 border-t border-border">
                  <span className="text-[13px] text-muted-foreground">Estimado tramo</span>
                  <span className="text-sm font-semibold font-mono">{formatUSD(withIva(subtotal))}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Tiempo muerto ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Coffee className="w-4 h-4 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold">Tiempo muerto</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.freeTime.map(ft => {
            const totalMin = ft.days.reduce((s, d) => s + d.minutes, 0);
            const high = totalMin >= 720; // 12h+
            return (
              <motion.div
                key={ft.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-card-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{ft.label}</span>
                    {ft.cabin && <span className={cabinClass}>{ft.cabin}</span>}
                    <span className={paxBadgeClass}>{ft.pax} pax · {ft.maletas} mal</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground">Horas hábiles libres</div>
                    <div className={cn("text-xl font-semibold", high ? "text-amber-600" : "text-blue-600")}>{fmtHM(totalMin)}</div>
                  </div>
                </div>
                {ft.days.map((d, i) => (
                  <div key={i} className="flex justify-between text-[13px] py-1.5 border-t border-border">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-medium">{fmtHM(d.minutes)}</span>
                  </div>
                ))}
                <div className="mt-3">
                  <label className="text-xs text-amber-600 block mb-1.5">💡 Ideas para este grupo</label>
                  <textarea
                    value={ft.ideas}
                    onChange={e => updateFreeTime(ft.id, { ideas: e.target.value })}
                    rows={4}
                    placeholder="Qué hacer en su tiempo libre..."
                    className="w-full resize-y text-[13px] px-3 py-2 rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Total ── */}
      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground">Total Ground Transportation</p>
          <p className="text-xs text-muted-foreground mt-0.5">Aeropuerto SAL ↔ Hyatt Centric ↔ ESEN ↔ Monarca · Línea Ejecutiva</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary font-mono">{formatUSD(subtotalBase)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">+IVA: {formatUSD(totalWithIva)}</p>
        </div>
      </div>
    </div>
  );
}
