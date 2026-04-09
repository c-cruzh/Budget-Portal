import { motion } from "framer-motion";
import { Wine, Users, DollarSign, UtensilsCrossed, CheckCircle2, AlertCircle } from "lucide-react";
import { formatUSD } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MenuItem {
  boca: string;
  sabor: string;
  tipo: string;
  precio: number;
  notas: string;
  d1: number;
  d2: number;
}

const MENU: MenuItem[] = [
  { boca: "Brocheta caprese con pesto", sabor: "Salado", tipo: "I", precio: 1.4, notas: "", d1: 1, d2: 0 },
  { boca: "Bolitas de papa rellena de queso", sabor: "Salado", tipo: "I", precio: 1.4, notas: "", d1: 1, d2: 0 },
  { boca: "Hongos al ajillo", sabor: "Salado", tipo: "I", precio: 1.4, notas: "", d1: 1, d2: 0 },
  { boca: "Mini quiché de espinaca y queso", sabor: "Salado", tipo: "I", precio: 1.4, notas: "", d1: 1, d2: 0 },
  { boca: "Crostini de melocotones asados y queso roquefort", sabor: "Salado", tipo: "II", precio: 1.7, notas: "", d1: 1, d2: 0 },
  { boca: "Crostini de cebollas caramelizadas en maple con peras y queso brie", sabor: "Salado", tipo: "II", precio: 1.7, notas: "", d1: 1, d2: 0 },
  { boca: "Costilla de cerdo en salsa barbacoa", sabor: "Salado", tipo: "II", precio: 1.7, notas: "Confirmar forma de servicio (porción / bocado).", d1: 1, d2: 0 },
  { boca: "Bagel de salmón", sabor: "Salado", tipo: "Gourmet", precio: 2, notas: "", d1: 0, d2: 1 },
  { boca: "Mini ceviche de pescado peruano", sabor: "Salado", tipo: "Gourmet", precio: 2, notas: "", d1: 0, d2: 1 },
  { boca: "Mini ceviche de camarón", sabor: "Salado", tipo: "Gourmet", precio: 2, notas: "", d1: 0, d2: 1 },
  { boca: "Brocheta de pollo al estilo Thai", sabor: "Salado", tipo: "Gourmet", precio: 2, notas: "", d1: 1, d2: 0 },
  { boca: "Camarones empanizados con salsa tártara", sabor: "Salado", tipo: "Gourmet", precio: 2, notas: "", d1: 0, d2: 1 },
  { boca: "Mini filet mignon", sabor: "Salado", tipo: "Gourmet", precio: 2, notas: "Confirmar cómo se sirve (corte / salsa).", d1: 0, d2: 1 },
  { boca: "Rollitos de pepino o de berenjenas", sabor: "Salado", tipo: "Vegetarianos", precio: 2.25, notas: "", d1: 0, d2: 1 },
  { boca: "Vegetales temporizados o tomates cherry confitados", sabor: "Salado", tipo: "Vegetarianos", precio: 2.25, notas: "", d1: 0, d2: 1 },
  { boca: "Humus de colores", sabor: "Salado", tipo: "Vegetarianos", precio: 2.25, notas: "", d1: 0, d2: 1 },
  { boca: "Cardenal de fruta roja (preferible fresa)", sabor: "Dulce", tipo: "Dulce", precio: 1.4, notas: "", d1: 1, d2: 0 },
  { boca: "Fresas cubiertas con chocolate", sabor: "Dulce", tipo: "Dulce", precio: 1.4, notas: "", d1: 0, d2: 1 },
  { boca: "Mini tartas / mini alfajores", sabor: "Dulce", tipo: "Dulce", precio: 1.4, notas: "(Reserva / reemplazo opcional).", d1: 0, d2: 0 },
  { boca: "Cheesecake con salsa de fresa", sabor: "Dulce", tipo: "Dulce", precio: 1.4, notas: "", d1: 0, d2: 1 },
  { boca: "Pie de limón", sabor: "Dulce", tipo: "Dulce", precio: 1.4, notas: "", d1: 1, d2: 0 },
];

const ESCENARIOS = { a: 400, b: 500 };
const SERVICIO = 0.10;

function computeCosts(guests: number) {
  let d1Sub = 0, d2Sub = 0;
  MENU.forEach(m => {
    d1Sub += m.d1 * guests * m.precio;
    d2Sub += m.d2 * guests * m.precio;
  });
  const d1Serv = d1Sub * SERVICIO;
  const d2Serv = d2Sub * SERVICIO;
  return {
    d1Sub, d1Serv, d1Total: d1Sub + d1Serv,
    d2Sub, d2Serv, d2Total: d2Sub + d2Serv,
    totalSub: d1Sub + d2Sub,
    totalServ: d1Serv + d2Serv,
    grandTotal: d1Sub + d1Serv + d2Sub + d2Serv,
    costPP: (d1Sub + d1Serv + d2Sub + d2Serv) / guests,
  };
}

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

export default function CoctelPage() {
  const costA = computeCosts(ESCENARIOS.a);
  const costB = computeCosts(ESCENARIOS.b);

  const d1Menu = MENU.filter(m => m.d1 > 0);
  const d2Menu = MENU.filter(m => m.d2 > 0);
  const reservas = MENU.filter(m => m.d1 === 0 && m.d2 === 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Esc. A (400)", value: formatUSD(costA.grandTotal), sub: `${formatUSD(costA.costPP)} pp`, icon: DollarSign, color: "text-primary" },
          { label: "Total Esc. B (500)", value: formatUSD(costB.grandTotal), sub: `${formatUSD(costB.costPP)} pp`, icon: DollarSign, color: "text-emerald-500" },
          { label: "Menu Items", value: String(MENU.length), sub: `${d1Menu.length} D1, ${d2Menu.length} D2`, icon: UtensilsCrossed, color: "text-amber-500" },
          { label: "Proveedor", value: "Delibanquetes", sub: "10% servicio incluido", icon: Wine, color: "text-violet-500" },
        ].map(card => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={cn("w-4 h-4", card.color)} />
              <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
            </div>
            <div className="text-xl font-bold">{card.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold">Reglas del Proveedor</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" /> 10 bocas mínimo por persona (8 saladas + 2 dulces)</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" /> Selección mínima de 50 bocas por variedad</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" /> Máximo 10 variedades por día (entre saladas + dulces)</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" /> 0 repeticiones entre días</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" /> 10% de servicio aplicado al subtotal</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { title: "Día 1 — Menú", items: d1Menu, dayKey: "d1" as const },
          { title: "Día 2 — Menú", items: d2Menu, dayKey: "d2" as const },
        ].map(({ title, items, dayKey }) => (
          <div key={title} className="rounded-xl border border-card-border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="text-sm font-semibold">{title}</h3>
              <span className="text-[10px] text-muted-foreground">
                {items.filter(m => m.sabor === "Salado").length} saladas + {items.filter(m => m.sabor === "Dulce").length} dulces = {items.length} variedades
              </span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wider">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Boca / Variedad</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-16">Tipo</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground w-20">Precio</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <span className="font-medium">{m.boca}</span>
                      {m.notas && (
                        <div className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> {m.notas}
                        </div>
                      )}
                    </td>
                    <td className="text-center px-2 py-2"><TipoBadge tipo={m.tipo} /></td>
                    <td className="text-right px-3 py-2 font-mono">{formatUSD(m.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {reservas.length > 0 && (
        <div className="rounded-xl border border-dashed border-muted-foreground/20 bg-muted/10 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Reserva / Reemplazo</h4>
          {reservas.map((m, i) => (
            <div key={i} className="text-xs text-muted-foreground">{m.boca} — {formatUSD(m.precio)} {m.notas && <span className="italic">({m.notas})</span>}</div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-card-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold">Comparativo de Costos — 400 vs 500 Invitados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wider">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground"></th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground" colSpan={2}>Esc. A (400 inv.)</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground" colSpan={2}>Esc. B (500 inv.)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Subtotal Día 1", a: costA.d1Sub, b: costB.d1Sub },
                { label: "Servicio Día 1 (10%)", a: costA.d1Serv, b: costB.d1Serv },
                { label: "Total Día 1", a: costA.d1Total, b: costB.d1Total, bold: true },
                { label: "Subtotal Día 2", a: costA.d2Sub, b: costB.d2Sub },
                { label: "Servicio Día 2 (10%)", a: costA.d2Serv, b: costB.d2Serv },
                { label: "Total Día 2", a: costA.d2Total, b: costB.d2Total, bold: true },
                { label: "TOTAL 2 DÍAS", a: costA.grandTotal, b: costB.grandTotal, bold: true, primary: true },
                { label: "Costo por persona (2 días)", a: costA.costPP, b: costB.costPP },
              ].map((row, i) => (
                <tr key={i} className={cn("border-b border-border/50", row.primary && "bg-primary/5 border-primary/20")}>
                  <td className={cn("px-4 py-2", row.bold && "font-semibold", row.primary && "text-primary")}>{row.label}</td>
                  <td className={cn("text-right px-4 py-2 font-mono", row.bold && "font-bold", row.primary && "text-primary")} colSpan={2}>{formatUSD(row.a)}</td>
                  <td className={cn("text-right px-4 py-2 font-mono", row.bold && "font-bold", row.primary && "text-primary")} colSpan={2}>{formatUSD(row.b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
