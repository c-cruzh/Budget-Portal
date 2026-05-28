import { motion } from "framer-motion";
import { Wine, Users, DollarSign, UtensilsCrossed, CheckCircle2, AlertCircle, Truck, Cloud, CloudOff } from "lucide-react";
import { formatUSD, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNetworkingCocktailApi, type NetworkingCocktailState } from "@/hooks/useNetworkingCocktailApi";
import { useMemo } from "react";

interface MenuItem {
  key: string;
  boca: string;
  sabor: "Salado" | "Dulce";
  tipo: string;
  precio: number;
  notas: string;
}

// Approved Esc C menu (Day 2 only) — sourced from
// attached_assets/Delibanquetes_Coctel_FINAL_Aprobado_EscC_1779961634261.xlsx
// 6 saladas + 2 dulces at $13.00 pp × 300 pax = $3,900 subtotal.
const MENU: MenuItem[] = [
  { key: "hongos-ajillo", boca: "Hongos al ajillo", sabor: "Salado", tipo: "I", precio: 1.4, notas: "" },
  { key: "quiche-espinaca", boca: "Mini quiché de espinaca y queso", sabor: "Salado", tipo: "I", precio: 1.4, notas: "" },
  { key: "crostini-melocoton", boca: "Crostini de melocotones asados y queso roquefort", sabor: "Salado", tipo: "II", precio: 1.7, notas: "" },
  { key: "costilla-bbq", boca: "Costilla de cerdo en salsa barbacoa", sabor: "Salado", tipo: "II", precio: 1.7, notas: "Confirmar forma de servicio (porción / bocado)." },
  { key: "camarones-tartara", boca: "Camarones empanizados con salsa tártara", sabor: "Salado", tipo: "Gourmet", precio: 2, notas: "" },
  { key: "filet-mignon", boca: "Mini filet mignon", sabor: "Salado", tipo: "Gourmet", precio: 2, notas: "Confirmar cómo se sirve (corte / salsa)." },
  { key: "cardenal-fresa", boca: "Cardenal de fruta roja (preferible fresa)", sabor: "Dulce", tipo: "Dulce", precio: 1.4, notas: "" },
  { key: "fresas-chocolate", boca: "Fresas cubiertas con chocolate", sabor: "Dulce", tipo: "Dulce", precio: 1.4, notas: "" },
];

const SERVICIO = 0.10;

// Esc C aprobado — fixed reference numbers (independent of menu edits)
const APPROVED = {
  pax: 300,
  comida: 3900,
  servicio: 390,
  comidaServicio: 4290,
  transporte: 80,
  granTotal: 4370,
  costPp: 14.57,
};

const SEED_STATE: NetworkingCocktailState = {
  pax: APPROVED.pax,
  transport: APPROVED.transporte,
  selections: Object.fromEntries(MENU.map(m => [m.key, true])),
  notes: "",
};

function TipoBadge({ tipo }: { tipo: string }) {
  const colors: Record<string, string> = {
    I: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    II: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    Gourmet: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    Vegetarianos: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    Dulce: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  };
  return <Badge variant="outline" className={cn("text-[10px] py-0 font-normal", colors[tipo] || "")}>{tipo}</Badge>;
}

function SyncIndicator({ saving, lastSaved, error }: { saving: boolean; lastSaved: Date | null; error: string | null }) {
  if (error) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-red-500">
        <CloudOff className="w-3.5 h-3.5" /> {error}
      </div>
    );
  }
  if (saving) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Cloud className="w-3.5 h-3.5 animate-pulse" /> Guardando…
      </div>
    );
  }
  if (lastSaved) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
        <Cloud className="w-3.5 h-3.5" /> Guardado {lastSaved.toLocaleTimeString()}
      </div>
    );
  }
  return null;
}

export default function CoctelPage() {
  const { state, setState, loading, saving, lastSaved, error, meta } = useNetworkingCocktailApi(SEED_STATE);

  const live = useMemo(() => {
    const includedItems = MENU.filter(m => state.selections[m.key]);
    const pricePerGuest = includedItems.reduce((s, m) => s + m.precio, 0);
    const subtotal = pricePerGuest * state.pax;
    const servicio = subtotal * SERVICIO;
    const comidaServicio = subtotal + servicio;
    const granTotal = comidaServicio + state.transport;
    const pp = state.pax > 0 ? granTotal / state.pax : 0;
    const saladasCount = includedItems.filter(m => m.sabor === "Salado").length;
    const dulcesCount = includedItems.filter(m => m.sabor === "Dulce").length;
    return { includedItems, pricePerGuest, subtotal, servicio, comidaServicio, granTotal, pp, saladasCount, dulcesCount };
  }, [state.selections, state.pax, state.transport]);

  const matchesApproved = Math.abs(live.subtotal - APPROVED.comida) < 0.5;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Networking Cocktail · Day 2</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escenario C aprobado · Delibanquetes · 300 pax · 6 saladas + 2 dulces (8 bocados pp).
          </p>
          {meta && (
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Última edición: {meta.lastEditedBy} ({meta.lastEditedByOrg}) · {new Date(meta.lastEditedAt).toLocaleString()}
            </p>
          )}
        </div>
        <SyncIndicator saving={saving} lastSaved={lastSaved} error={error} />
      </div>

      {/* Approved KPI strip — always shown, independent of menu edits */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Escenario C aprobado</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          {[
            { label: "Pax", value: `${APPROVED.pax}`, icon: Users },
            { label: "Comida", value: formatUSD(APPROVED.comida), icon: UtensilsCrossed },
            { label: "Servicio 10%", value: formatUSD(APPROVED.servicio), icon: DollarSign },
            { label: "Comida + servicio", value: formatUSD(APPROVED.comidaServicio), icon: DollarSign },
            { label: "Transporte", value: formatUSD(APPROVED.transporte), icon: Truck },
            { label: "Gran total", value: formatUSD(APPROVED.granTotal), icon: Wine, highlight: true },
            { label: "Costo pp", value: `$${APPROVED.costPp.toFixed(2)}`, icon: Users, highlight: true },
          ].map(k => (
            <div key={k.label} className={cn("rounded-lg px-2 py-2", k.highlight ? "bg-primary/10 border border-primary/30" : "bg-background/60")}>
              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                <k.icon className="w-3 h-3" />
                {k.label}
              </div>
              <div className={cn("text-sm font-bold font-mono", k.highlight && "text-primary")}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Inputs: pax + transport */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-card-border bg-card p-4 shadow-sm">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Users className="w-3 h-3" /> Pax (invitados)
          </label>
          <input
            type="number"
            min={0}
            value={state.pax}
            onChange={e => setState(prev => ({ ...prev, pax: Math.max(0, Number(e.target.value) || 0) }))}
            className="mt-2 w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="rounded-xl border border-card-border bg-card p-4 shadow-sm">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Truck className="w-3 h-3" /> Transporte (servicio Delibanquetes)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={state.transport}
            onChange={e => setState(prev => ({ ...prev, transport: Math.max(0, Number(e.target.value) || 0) }))}
            className="mt-2 w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="rounded-xl border border-card-border bg-card p-4 shadow-sm">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Notas</label>
          <input
            type="text"
            value={state.notes}
            placeholder="Observaciones internas…"
            onChange={e => setState(prev => ({ ...prev, notes: e.target.value }))}
            className="mt-2 w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Provider rules */}
      <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold">Reglas del Proveedor</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" /> 8 bocados pp aprobado (6 saladas + 2 dulces)</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" /> Selección mínima de 50 bocas por variedad</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" /> Máximo 10 variedades por día</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" /> 10% de servicio aplicado al subtotal</div>
        </div>
      </div>

      {/* Menu table */}
      <div className="rounded-xl border border-card-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold">Menú aprobado · Día 2</h3>
            <span className="text-[10px] text-muted-foreground">
              {live.saladasCount} saladas + {live.dulcesCount} dulces seleccionadas ({live.includedItems.length} variedades)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-muted-foreground">Precio pp seleccionado:</span>
            <span className="font-mono font-semibold">{formatUSD(live.pricePerGuest)}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wider">
                <th className="text-center px-3 py-2 font-semibold text-muted-foreground w-12">Incluir</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Boca / Variedad</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-20">Tipo</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground w-24">Precio</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground w-28">Subtotal línea</th>
              </tr>
            </thead>
            <tbody>
              {MENU.map(m => {
                const checked = !!state.selections[m.key];
                const lineSubtotal = checked ? m.precio * state.pax : 0;
                return (
                  <tr key={m.key} className={cn("border-b border-border/50 hover:bg-muted/20", !checked && "opacity-50")}>
                    <td className="text-center px-3 py-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => setState(prev => ({
                          ...prev,
                          selections: { ...prev.selections, [m.key]: e.target.checked },
                        }))}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{m.boca}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">({m.sabor})</span>
                      {m.notas && (
                        <div className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> {m.notas}
                        </div>
                      )}
                    </td>
                    <td className="text-center px-2 py-2"><TipoBadge tipo={m.tipo} /></td>
                    <td className="text-right px-3 py-2 font-mono">{formatUSD(m.precio)}</td>
                    <td className="text-right px-3 py-2 font-mono">{checked ? formatUSD(lineSubtotal) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td colSpan={4} className="text-right px-3 py-2.5">Subtotal comida (live)</td>
                <td className="text-right px-3 py-2.5 font-mono">{formatUSD(live.subtotal)}</td>
              </tr>
              <tr className="border-t border-border/50 bg-muted/20">
                <td colSpan={4} className="text-right px-3 py-2">Servicio 10%</td>
                <td className="text-right px-3 py-2 font-mono">{formatUSD(live.servicio)}</td>
              </tr>
              <tr className="border-t border-border/50 bg-muted/20">
                <td colSpan={4} className="text-right px-3 py-2">Transporte</td>
                <td className="text-right px-3 py-2 font-mono">{formatUSD(state.transport)}</td>
              </tr>
              <tr className="border-t-2 border-primary/30 bg-primary/5 font-bold">
                <td colSpan={4} className="text-right px-3 py-2.5 text-primary">Gran total (live)</td>
                <td className="text-right px-3 py-2.5 font-mono text-primary">{formatUSD(live.granTotal)} <span className="text-[10px] font-normal text-muted-foreground">({state.pax > 0 ? formatUSD(live.pp) : "—"} pp)</span></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Δ vs Esc C aprobado */}
        <div className={cn(
          "px-4 py-3 border-t border-border text-xs flex items-start gap-2",
          matchesApproved ? "bg-emerald-500/5 text-emerald-700" : "bg-amber-500/5 text-amber-700"
        )}>
          {matchesApproved
            ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <div>
            <div className="font-semibold">
              Δ vs Esc C aprobado: {matchesApproved
                ? "coincide con $3,900"
                : `${live.subtotal > APPROVED.comida ? "+" : ""}${formatUSD(live.subtotal - APPROVED.comida)}`}
            </div>
            <div className="text-[11px] mt-0.5 opacity-90">
              Esc C aprobado fija el gran total en $4,370 independiente del menú; usá esto para planear la lista final.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
