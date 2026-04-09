import { motion } from "framer-motion";
import { Coffee, Beer, Droplets, Snowflake, DollarSign, ShoppingCart } from "lucide-react";
import { formatUSD } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PurchaseItem {
  item: string;
  presentacion: string;
  comprarA: number;
  unidadA: string;
  comprarB: number;
  unidadB: string;
  nota: string;
}

const PURCHASE_LIST: PurchaseItem[] = [
  { item: "Oster Cafetera de Filtro", presentacion: "unidad", comprarA: 3, unidadA: "unidad", comprarB: 3, unidadB: "unidad", nota: "" },
  { item: "Nedecaza Café Tostado y Molido", presentacion: "pack 2 kg", comprarA: 20, unidadA: "pack 2 kg", comprarB: 25, unidadB: "pack 2 kg", nota: "" },
  { item: "Vaso café 8 oz", presentacion: "pack 25", comprarA: 106, unidadA: "pack 25", comprarB: 133, unidadB: "pack 25", nota: "VGF8 (GRACO FOAM): $0.74 / pack 25" },
  { item: "Azúcar granulada en sobre", presentacion: "pack 1,000", comprarA: 3, unidadA: "pack 1,000", comprarB: 4, unidadB: "pack 1,000", nota: "" },
  { item: "Endulzante con Stevia", presentacion: "pack 500", comprarA: 2, unidadA: "pack 500", comprarB: 2, unidadB: "pack 500", nota: "" },
  { item: "Crema de café en sobre", presentacion: "pack 200", comprarA: 7, unidadA: "pack 200", comprarB: 9, unidadB: "pack 200", nota: "" },
  { item: "Alpina 5 gal retornable", presentacion: "botellón", comprarA: 34, unidadA: "botellón", comprarB: 42, unidadB: "botellón", nota: "" },
  { item: "Agua purificada 500 mL", presentacion: "pack 40", comprarA: 66, unidadA: "pack 40", comprarB: 83, unidadB: "pack 40", nota: "" },
  { item: "Coca Cola lata", presentacion: "pack 24", comprarA: 18, unidadA: "pack 24", comprarB: 22, unidadB: "pack 24", nota: "" },
  { item: "Coca Cola Zero", presentacion: "pack 12", comprarA: 18, unidadA: "pack 12", comprarB: 22, unidadB: "pack 12", nota: "" },
  { item: "Salutaris surtida", presentacion: "pack 24", comprarA: 11, unidadA: "pack 24", comprarB: 14, unidadB: "pack 24", nota: "" },
  { item: "Cascada Kolashampan", presentacion: "pack 24", comprarA: 7, unidadA: "pack 24", comprarB: 9, unidadB: "pack 24", nota: "" },
  { item: "Vaso traslúcido 8 oz", presentacion: "pack 25", comprarA: 43, unidadA: "pack 25", comprarB: 53, unidadB: "pack 25", nota: "Cubre soft drinks; agua va en botella" },
  { item: "Servilletas resistentes", presentacion: "pack 800", comprarA: 8, unidadA: "pack 800", comprarB: 10, unidadB: "pack 800", nota: "" },
  { item: "Pilsener (24 latas)", presentacion: "pack 24", comprarA: 26, unidadA: "pack 24", comprarB: 33, unidadB: "pack 24", nota: "Pilsener: $23.99 / pack 24" },
  { item: "Trapiche Pinot Grigio (750 mL)", presentacion: "botella", comprarA: 51, unidadA: "botella", comprarB: 63, unidadB: "botella", nota: "" },
  { item: "Santa Helena Cabernet (1.5 L)", presentacion: "botella", comprarA: 18, unidadA: "botella", comprarB: 23, unidadB: "botella", nota: "1 botella = ~10 copas de 5 oz" },
  { item: "Dubois Espumante Brut", presentacion: "pack 6", comprarA: 3, unidadA: "pack 6", comprarB: 3, unidadB: "pack 6", nota: "" },
  { item: "Servilletas premium", presentacion: "pack 150", comprarA: 16, unidadA: "pack 150", comprarB: 20, unidadB: "pack 150", nota: "" },
  { item: "Vaso 9 oz GPHEV9COPA", presentacion: "pack 50", comprarA: 11, unidadA: "pack 50", comprarB: 13, unidadB: "pack 50", nota: "GPHEV9COPA: $5.00 / pack 50" },
  { item: "Hielo Great Value (~10 lb)", presentacion: "bolsa", comprarA: 80, unidadA: "bolsa", comprarB: 100, unidadB: "bolsa", nota: "1 lb por asistente efectivo / noche" },
];

const COST_BREAKDOWN = {
  a: { coffee: 1127.09, drinks: 1291.12, bar: 1697.66, ice: 176, total: 4291.87 },
  b: { coffee: 1272.25, drinks: 1612, bar: 2095.58, ice: 217.8, total: 5197.63 },
};

const BAR_DETAILS = {
  asistencia: "90%",
  serviciosPP: 1.43,
  mixCerveza: "54.7%",
  mixVinoBlanco: "22.5%",
  mixVinoTinto: "15.9%",
  mixEspumante: "6.9%",
};

const COFFEE_DETAILS = {
  tazasPP: 3,
  botellasAguaPP: 3,
  softDrinksPP: 1.2,
};

function CategoryIcon({ cat }: { cat: string }) {
  if (cat === "coffee") return <Coffee className="w-4 h-4 text-amber-600" />;
  if (cat === "drinks") return <Droplets className="w-4 h-4 text-blue-500" />;
  if (cat === "bar") return <Beer className="w-4 h-4 text-amber-500" />;
  return <Snowflake className="w-4 h-4 text-cyan-400" />;
}

export default function BarBebidasPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Esc. A (400)", value: formatUSD(COST_BREAKDOWN.a.total), sub: `${formatUSD(COST_BREAKDOWN.a.total / 400 / 2)} pp/día`, icon: DollarSign, color: "text-primary" },
          { label: "Total Esc. B (500)", value: formatUSD(COST_BREAKDOWN.b.total), sub: `${formatUSD(COST_BREAKDOWN.b.total / 500 / 2)} pp/día`, icon: DollarSign, color: "text-emerald-500" },
          { label: "Items a Comprar", value: String(PURCHASE_LIST.length), sub: "PriceSmart, Diasa, otros", icon: ShoppingCart, color: "text-violet-500" },
          { label: "Bar (5-7 PM)", value: `${BAR_DETAILS.serviciosPP} srv/pers`, sub: `${BAR_DETAILS.asistencia} asistencia est.`, icon: Beer, color: "text-amber-500" },
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
          <h3 className="text-sm font-semibold">Desglose por Categoría</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wider">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Categoría</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Esc. A (400)</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Esc. B (500)</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">% del Total A</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cat: "coffee", label: "Coffee Station", a: COST_BREAKDOWN.a.coffee, b: COST_BREAKDOWN.b.coffee },
                { cat: "drinks", label: "Drinks / Water + Day Support", a: COST_BREAKDOWN.a.drinks, b: COST_BREAKDOWN.b.drinks },
                { cat: "bar", label: "Bar (Cocktail 5-7 PM)", a: COST_BREAKDOWN.a.bar, b: COST_BREAKDOWN.b.bar },
                { cat: "ice", label: "Hielo", a: COST_BREAKDOWN.a.ice, b: COST_BREAKDOWN.b.ice },
              ].map((row) => (
                <tr key={row.cat} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-2.5 flex items-center gap-2">
                    <CategoryIcon cat={row.cat} />
                    <span className="font-medium">{row.label}</span>
                  </td>
                  <td className="text-right px-4 py-2.5 font-mono">{formatUSD(row.a)}</td>
                  <td className="text-right px-4 py-2.5 font-mono">{formatUSD(row.b)}</td>
                  <td className="text-right px-4 py-2.5 font-mono text-muted-foreground">{((row.a / COST_BREAKDOWN.a.total) * 100).toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="bg-primary/5 border-t-2 border-primary/20">
                <td className="px-4 py-2.5 font-bold text-primary">TOTAL EVENTO</td>
                <td className="text-right px-4 py-2.5 font-mono font-bold text-primary">{formatUSD(COST_BREAKDOWN.a.total)}</td>
                <td className="text-right px-4 py-2.5 font-mono font-bold text-primary">{formatUSD(COST_BREAKDOWN.b.total)}</td>
                <td className="text-right px-4 py-2.5 font-mono text-primary">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Coffee className="w-4 h-4 text-amber-600" /> Coffee Station</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/30 rounded-lg p-3"><span className="text-muted-foreground">Tazas por persona / día</span><div className="font-bold text-lg mt-1">{COFFEE_DETAILS.tazasPP}</div></div>
            <div className="bg-muted/30 rounded-lg p-3"><span className="text-muted-foreground">Botellas agua / día</span><div className="font-bold text-lg mt-1">{COFFEE_DETAILS.botellasAguaPP}</div></div>
            <div className="bg-muted/30 rounded-lg p-3"><span className="text-muted-foreground">Soft drinks / día</span><div className="font-bold text-lg mt-1">{COFFEE_DETAILS.softDrinksPP}</div></div>
            <div className="bg-muted/30 rounded-lg p-3"><span className="text-muted-foreground">Cafeteras Oster</span><div className="font-bold text-lg mt-1">3</div></div>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Beer className="w-4 h-4 text-amber-500" /> Bar — Mix de Bebidas</h3>
          <div className="space-y-2">
            {[
              { label: "Cerveza (Pilsener)", pct: BAR_DETAILS.mixCerveza, color: "bg-amber-500" },
              { label: "Vino Blanco (Trapiche Pinot Grigio)", pct: BAR_DETAILS.mixVinoBlanco, color: "bg-yellow-400" },
              { label: "Vino Tinto (Santa Helena Cabernet 1.5L)", pct: BAR_DETAILS.mixVinoTinto, color: "bg-red-500" },
              { label: "Espumante (Dubois Brut)", pct: BAR_DETAILS.mixEspumante, color: "bg-emerald-400" },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 text-xs">
                <div className="w-[120px] bg-muted/50 rounded-full h-2.5 overflow-hidden">
                  <div className={cn("h-full rounded-full", row.color)} style={{ width: row.pct }} />
                </div>
                <span className="font-mono w-12 text-right">{row.pct}</span>
                <span className="text-muted-foreground">{row.label}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
            Base: {BAR_DETAILS.serviciosPP} servicios alcohólicos por asistente efectivo/noche. {BAR_DETAILS.asistencia} asistencia estimada al cocktail.
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Lista de Compra</h3>
          <span className="text-[10px] text-muted-foreground">PriceSmart, Diasa, otros proveedores</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wider">
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Item</th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground">Presentación</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Qty Esc A</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Qty Esc B</th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground">Nota</th>
              </tr>
            </thead>
            <tbody>
              {PURCHASE_LIST.map((item, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{item.item}</td>
                  <td className="px-2 py-2 text-muted-foreground">{item.presentacion}</td>
                  <td className="text-center px-2 py-2 font-mono">{item.comprarA}</td>
                  <td className="text-center px-2 py-2 font-mono">{item.comprarB}</td>
                  <td className="px-2 py-2 text-[10px] text-muted-foreground max-w-[200px]">{item.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
