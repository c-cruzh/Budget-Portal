import { motion } from "framer-motion";
import { DollarSign, Package, AlertCircle, CheckCircle2, FileText, AlertTriangle, ShieldAlert, Flag, Percent } from "lucide-react";
import { formatUSD } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SummaryCardsProps {
  totalBudget: number;
  totalPaid: number;
  totalInKindCount: number;
  totalInKindSum: number;
  pendingCount: number;
  itemCount: number;
  validarCount: number;
  contratarAparteCount: number;
  soloPresupuestadoSum: number;
  accionRequeridaCount: number;
  feeProductoraSum: number;
}

export function SummaryCards({ totalBudget, totalPaid, totalInKindCount, totalInKindSum, pendingCount, itemCount, validarCount, contratarAparteCount, soloPresupuestadoSum, accionRequeridaCount, feeProductoraSum }: SummaryCardsProps) {
  const cards = [
    {
      label: "Total Budget",
      value: formatUSD(totalBudget),
      sub: `${itemCount} line items`,
      icon: DollarSign,
      color: "bg-primary/10 text-primary",
      info: "Suma total de todos los items del presupuesto, incluyendo fee e IVA.",
    },
    {
      label: "Cash Expenditure",
      value: formatUSD(totalPaid),
      sub: "Actual spend (IVA incl.)",
      icon: FileText,
      color: "bg-emerald-500/10 text-emerald-500",
      info: "Gasto real en efectivo — excluye items in-kind. Incluye fee e IVA.",
    },
    {
      label: "Fee Productora",
      value: formatUSD(feeProductoraSum),
      sub: "Total fees Aurora 360",
      icon: Percent,
      color: feeProductoraSum > 0 ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500",
      info: "Suma total de los fees del 20% de la productora sobre todos los items contratados vía Aurora 360 — incluye fees explícitos y los ya incluidos en cotización.",
    },
    {
      label: "In-Kind Total",
      value: formatUSD(totalInKindSum),
      sub: `${totalInKindCount} sponsored items`,
      icon: Package,
      color: "bg-amber-500/10 text-amber-600",
      info: "Valor total de contribuciones en especie (donaciones, venue, sponsors).",
    },
    {
      label: "Presupuestado",
      value: formatUSD(soloPresupuestadoSum),
      sub: "Estimado sin cotizar",
      icon: FileText,
      color: soloPresupuestadoSum > 0 ? "bg-yellow-500/10 text-yellow-600" : "bg-emerald-500/10 text-emerald-500",
      info: "Monto total de items 'solo presupuestado' — estimados sin cotización formal.",
    },
    {
      label: "Pending Quotes",
      value: String(pendingCount),
      sub: "Need confirmation",
      icon: pendingCount > 0 ? AlertCircle : CheckCircle2,
      color: pendingCount > 0 ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500",
      info: "Items con cotización PENDING — sin respuesta del proveedor.",
    },
    {
      label: "Accion Req.",
      value: String(accionRequeridaCount),
      sub: "Necesitan accion",
      icon: Flag,
      color: accionRequeridaCount > 0 ? "bg-orange-500/10 text-orange-600" : "bg-emerald-500/10 text-emerald-500",
      info: "Items que requieren acción o seguimiento inmediato.",
    },
    {
      label: "A Validar",
      value: String(validarCount),
      sub: "Posible costo inflado",
      icon: AlertTriangle,
      color: validarCount > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500",
      info: "Items con posible costo inflado. Validar con otros proveedores.",
    },
    {
      label: "Aparte",
      value: String(contratarAparteCount),
      sub: "Cotizar directo",
      icon: ShieldAlert,
      color: contratarAparteCount > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-500",
      info: "Items que conviene contratar directo (sin productora) para evitar fee 20%.",
    },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-3 xl:grid-cols-9 gap-3">
      {cards.map((card, idx) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05, duration: 0.3 }}
          className="rounded-xl border border-card-border bg-card p-3 shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className={`w-7 h-7 rounded-lg ${card.color} flex items-center justify-center flex-shrink-0`}>
              <card.icon className="w-3.5 h-3.5" />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-[11px] text-muted-foreground font-medium leading-tight truncate cursor-help">{card.label}</p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-xs font-normal">
                {card.info}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-lg font-bold text-foreground truncate">{card.value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{card.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}
