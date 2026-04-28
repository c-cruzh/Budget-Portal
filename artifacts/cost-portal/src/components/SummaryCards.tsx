import { motion } from "framer-motion";
import { DollarSign, Package, AlertCircle, CheckCircle2, FileText, AlertTriangle, ShieldAlert, Flag, Percent, Star } from "lucide-react";
import { formatUSD } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SummaryCardsProps {
  totalBudget: number;
  cashSinFee: number;
  totalInKindCount: number;
  totalInKindSum: number;
  pendingCount: number;
  itemCount: number;
  validarCount: number;
  contratarAparteCount: number;
  soloPresupuestadoSum: number;
  accionRequeridaCount: number;
  feeProductoraSum: number;
  feeExplicitSum: number;
  feeIncluidoSum: number;
  niceToHaveCount: number;
  niceToHaveSum: number;
}

export function SummaryCards({ totalBudget, cashSinFee, totalInKindCount, totalInKindSum, pendingCount, itemCount, validarCount, contratarAparteCount, soloPresupuestadoSum, accionRequeridaCount, feeProductoraSum, feeExplicitSum, feeIncluidoSum, niceToHaveCount, niceToHaveSum }: SummaryCardsProps) {
  const row1 = [
    {
      label: "Total Budget",
      value: formatUSD(totalBudget),
      sub: `${itemCount} line items`,
      icon: DollarSign,
      color: "bg-primary/10 text-primary",
      info: "Suma total de todos los items del presupuesto, incluyendo fee e IVA.",
    },
    {
      label: "Cash (Sin Fee)",
      value: formatUSD(cashSinFee),
      sub: "Productos + IVA",
      icon: FileText,
      color: "bg-emerald-500/10 text-emerald-500",
      info: "Gasto en productos y servicios + IVA, sin incluir el fee del 20% de la productora. Excluye items in-kind.",
    },
    {
      label: "Fee Productora",
      value: formatUSD(feeProductoraSum),
      sub: `Incl: ${formatUSD(feeIncluidoSum)} | Adic: ${formatUSD(feeExplicitSum)}`,
      icon: Percent,
      color: feeProductoraSum > 0 ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500",
      info: "Suma total de fees del 20% de Aurora 360. 'Incl' = ya incluido en la cotizacion (no suma al total del item). 'Adic' = fee adicional que si suma al total.",
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
      info: "Monto total de items 'solo presupuestado' — estimados sin cotizacion formal.",
    },
  ];

  const row2 = [
    {
      label: "Pending Quotes",
      value: String(pendingCount),
      sub: "Need confirmation",
      icon: pendingCount > 0 ? AlertCircle : CheckCircle2,
      color: pendingCount > 0 ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500",
      info: "Items con cotizacion PENDING — sin respuesta del proveedor.",
    },
    {
      label: "Accion Req.",
      value: String(accionRequeridaCount),
      sub: "Necesitan accion",
      icon: Flag,
      color: accionRequeridaCount > 0 ? "bg-orange-500/10 text-orange-600" : "bg-emerald-500/10 text-emerald-500",
      info: "Items que requieren accion o seguimiento inmediato.",
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
    {
      label: "Nice to Have",
      value: formatUSD(niceToHaveSum),
      sub: `${niceToHaveCount} items deseables`,
      icon: Star,
      color: niceToHaveCount > 0 ? "bg-purple-500/10 text-purple-500" : "bg-emerald-500/10 text-emerald-500",
      info: "Suma total de items marcados como 'Nice to Have' — deseables pero no esenciales. Candidatos para reduccion del presupuesto.",
    },
  ];

  const renderCard = (card: typeof row1[0], idx: number) => (
    <motion.div
      key={card.label}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.3 }}
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
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
        {row1.map((card, idx) => renderCard(card, idx))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {row2.map((card, idx) => renderCard(card, idx + row1.length))}
      </div>
    </div>
  );
}
