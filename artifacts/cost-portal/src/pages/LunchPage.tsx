import { motion } from "framer-motion";
import { Sandwich, Coffee, DollarSign, Truck, Leaf } from "lucide-react";
import { formatUSD } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MenuItem {
  categoria: string;
  item: string;
  fuente: string;
  precio: number;
  notas: string;
  d1: number;
  d2: number;
}

const MENU: MenuItem[] = [
  { categoria: "Coffee AM", item: "Parfait de frutos del bosque y yogurt griego", fuente: "COTIZADO", precio: 3.75, notas: "", d1: 1, d2: 1 },
  { categoria: "Coffee AM", item: "Vaso de frutas", fuente: "COTIZADO", precio: 3.25, notas: "", d1: 1, d2: 1 },
  { categoria: "Coffee AM", item: "Banana Bread", fuente: "COTIZADO", precio: 1.25, notas: "", d1: 1, d2: 0 },
  { categoria: "Coffee AM", item: "Lemon bread", fuente: "COTIZADO", precio: 1.25, notas: "", d1: 0, d2: 1 },
  { categoria: "Coffee PM", item: "Vaso de frutas", fuente: "COTIZADO", precio: 3.25, notas: "Día 2 usa alternativa salada.", d1: 1, d2: 0 },
  { categoria: "Coffee PM", item: "Alternativa (reemplaza vaso de frutas)", fuente: "PROPUESTO", precio: 3.25, notas: "Ejemplos: vaso caprese / tabulé. Mantener $3.25.", d1: 0, d2: 1 },
  { categoria: "Coffee PM", item: "Vaso de hummus con vegetales", fuente: "COTIZADO", precio: 3, notas: "", d1: 1, d2: 1 },
  { categoria: "Coffee PM", item: "Lemon bread", fuente: "COTIZADO", precio: 1.25, notas: "", d1: 1, d2: 0 },
  { categoria: "Coffee PM", item: "Banana Bread", fuente: "COTIZADO", precio: 1.25, notas: "", d1: 0, d2: 1 },
  { categoria: "Lunch Regular", item: "Focaccia BLT", fuente: "COTIZADO", precio: 8.5, notas: "Día 1", d1: 0.3, d2: 0 },
  { categoria: "Lunch Regular", item: "Ensalada Cobb", fuente: "COTIZADO", precio: 8.5, notas: "Día 1", d1: 0.3, d2: 0 },
  { categoria: "Lunch Regular", item: "Wrap de pollo", fuente: "COTIZADO", precio: 8, notas: "Día 1", d1: 0.25, d2: 0 },
  { categoria: "Lunch Regular", item: "Opción 1 Menu Día 2", fuente: "PROPUESTO", precio: 8.5, notas: "Propuesta 2º día (pendiente cotizar).", d1: 0, d2: 0.3 },
  { categoria: "Lunch Regular", item: "Opción 2 Menu Día 2", fuente: "PROPUESTO", precio: 8.5, notas: "Propuesta 2º día (pendiente cotizar).", d1: 0, d2: 0.3 },
  { categoria: "Lunch Regular", item: "Opción 3 Menu Día 2", fuente: "PROPUESTO", precio: 8.5, notas: "Propuesta 2º día (pendiente cotizar).", d1: 0, d2: 0.25 },
  { categoria: "Lunch Veg", item: "Wrap de falafel", fuente: "COTIZADO", precio: 7, notas: "Día 1", d1: 0.1, d2: 0 },
  { categoria: "Lunch Veg", item: "Focaccia Vegetariano", fuente: "COTIZADO", precio: 8.5, notas: "Día 1", d1: 0.05, d2: 0 },
  { categoria: "Lunch Veg", item: "Opción 1 Veg Día 2", fuente: "PROPUESTO", precio: 8, notas: "Propuesta 2º día (pendiente cotizar).", d1: 0, d2: 0.08 },
  { categoria: "Lunch Veg", item: "Opción 2 Veg Día 2", fuente: "PROPUESTO", precio: 8.5, notas: "Propuesta 2º día (pendiente cotizar).", d1: 0, d2: 0.07 },
];

const MONTAJE_POR_DIA = 450;
const DIAS = 2;
const COST_SUMMARY = {
  a: { d1: 9590, d2: 9684, montaje: 900, total: 20174 },
  b: { d1: 11987.5, d2: 12105, montaje: 900, total: 24992.5 },
};

function FuenteBadge({ fuente }: { fuente: string }) {
  return (
    <Badge variant="outline" className={cn(
      "text-[10px] py-0 font-normal",
      fuente === "COTIZADO" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
    )}>
      {fuente}
    </Badge>
  );
}

function CategoryBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    "Coffee AM": "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "Coffee PM": "bg-orange-500/10 text-orange-600 border-orange-500/20",
    "Lunch Regular": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "Lunch Veg": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  };
  return <Badge variant="outline" className={cn("text-[10px] py-0 font-normal", colors[cat] || "")}>{cat}</Badge>;
}

export default function LunchPage() {
  const categories = ["Coffee AM", "Coffee PM", "Lunch Regular", "Lunch Veg"];
  const cotizados = MENU.filter(m => m.fuente === "COTIZADO").length;
  const propuestos = MENU.filter(m => m.fuente === "PROPUESTO").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Esc. A (400)", value: formatUSD(COST_SUMMARY.a.total), sub: `${formatUSD(COST_SUMMARY.a.total / 400)} pp (2 días)`, icon: DollarSign, color: "text-primary" },
          { label: "Total Esc. B (500)", value: formatUSD(COST_SUMMARY.b.total), sub: `${formatUSD(COST_SUMMARY.b.total / 500)} pp (2 días)`, icon: DollarSign, color: "text-emerald-500" },
          { label: "Menu Items", value: String(MENU.length), sub: `${cotizados} cotizados, ${propuestos} propuestos`, icon: Sandwich, color: "text-amber-500" },
          { label: "Montaje + Transporte", value: formatUSD(MONTAJE_POR_DIA * DIAS), sub: `${formatUSD(MONTAJE_POR_DIA)} / día x ${DIAS} días`, icon: Truck, color: "text-violet-500" },
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

      <div className="rounded-xl border border-card-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold">Comparativo de Costos — 400 vs 500 Invitados</h3>
          <span className="text-[10px] text-muted-foreground">Proveedor: Andián</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wider">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground"></th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Esc. A (400)</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Esc. B (500)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Subtotal Día 1", a: COST_SUMMARY.a.d1, b: COST_SUMMARY.b.d1 },
                { label: "Subtotal Día 2", a: COST_SUMMARY.a.d2, b: COST_SUMMARY.b.d2 },
                { label: "Montaje/Transporte (2 días)", a: COST_SUMMARY.a.montaje, b: COST_SUMMARY.b.montaje },
                { label: "TOTAL 2 DÍAS + FEES", a: COST_SUMMARY.a.total, b: COST_SUMMARY.b.total, bold: true, primary: true },
                { label: "Costo por persona (2 días)", a: COST_SUMMARY.a.total / 400, b: COST_SUMMARY.b.total / 500 },
              ].map((row, i) => (
                <tr key={i} className={cn("border-b border-border/50", row.primary && "bg-primary/5 border-primary/20")}>
                  <td className={cn("px-4 py-2.5", row.bold && "font-semibold", row.primary && "text-primary")}>{row.label}</td>
                  <td className={cn("text-right px-4 py-2.5 font-mono", row.bold && "font-bold", row.primary && "text-primary")}>{formatUSD(row.a)}</td>
                  <td className={cn("text-right px-4 py-2.5 font-mono", row.bold && "font-bold", row.primary && "text-primary")}>{formatUSD(row.b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {categories.map(cat => {
        const items = MENU.filter(m => m.categoria === cat);
        const isLunch = cat.startsWith("Lunch");
        const icon = cat.startsWith("Coffee") ? <Coffee className="w-4 h-4 text-amber-600" /> :
                     cat === "Lunch Veg" ? <Leaf className="w-4 h-4 text-emerald-500" /> :
                     <Sandwich className="w-4 h-4 text-blue-500" />;

        return (
          <div key={cat} className="rounded-xl border border-card-border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              {icon}
              <h3 className="text-sm font-semibold">{cat}</h3>
              <Badge variant="secondary" className="text-[10px] py-0">{items.length} items</Badge>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wider">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Item</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-20">Fuente</th>
                  <th className="text-right px-2 py-2 font-semibold text-muted-foreground w-20">Precio</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-16">{isLunch ? "D1 Share" : "D1"}</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-16">{isLunch ? "D2 Share" : "D2"}</th>
                  <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Notas</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{m.item}</td>
                    <td className="text-center px-2 py-2"><FuenteBadge fuente={m.fuente} /></td>
                    <td className="text-right px-2 py-2 font-mono">{formatUSD(m.precio)}</td>
                    <td className={cn("text-center px-2 py-2 font-mono", m.d1 === 0 && "text-muted-foreground/30")}>
                      {isLunch ? (m.d1 > 0 ? `${(m.d1 * 100).toFixed(0)}%` : "—") : (m.d1 > 0 ? m.d1 : "—")}
                    </td>
                    <td className={cn("text-center px-2 py-2 font-mono", m.d2 === 0 && "text-muted-foreground/30")}>
                      {isLunch ? (m.d2 > 0 ? `${(m.d2 * 100).toFixed(0)}%` : "—") : (m.d2 > 0 ? m.d2 : "—")}
                    </td>
                    <td className="px-2 py-2 text-[10px] text-muted-foreground max-w-[200px]">{m.notas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
