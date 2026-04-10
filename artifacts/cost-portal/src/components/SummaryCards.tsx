import { motion } from "framer-motion";
import { DollarSign, Package, AlertCircle, CheckCircle2, FileText, AlertTriangle, ShieldAlert, Flag } from "lucide-react";
import { formatUSD } from "@/lib/utils";

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
}

export function SummaryCards({ totalBudget, totalPaid, totalInKindCount, totalInKindSum, pendingCount, itemCount, validarCount, contratarAparteCount, soloPresupuestadoSum, accionRequeridaCount }: SummaryCardsProps) {
  const cards = [
    {
      label: "Total Budget",
      value: formatUSD(totalBudget),
      sub: `${itemCount} line items`,
      icon: DollarSign,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Cash Expenditure",
      value: formatUSD(totalPaid),
      sub: "Actual spend (IVA incl.)",
      icon: FileText,
      color: "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "In-Kind Total",
      value: formatUSD(totalInKindSum),
      sub: `${totalInKindCount} sponsored / venue items`,
      icon: Package,
      color: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Presupuestado (est.)",
      value: formatUSD(soloPresupuestadoSum),
      sub: "Guesstimate / estimado",
      icon: FileText,
      color: soloPresupuestadoSum > 0 ? "bg-yellow-500/10 text-yellow-600" : "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Pending Quotes",
      value: String(pendingCount),
      sub: "Need confirmation",
      icon: pendingCount > 0 ? AlertCircle : CheckCircle2,
      color: pendingCount > 0 ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Accion Requerida",
      value: String(accionRequeridaCount),
      sub: "Items que necesitan accion",
      icon: Flag,
      color: accionRequeridaCount > 0 ? "bg-orange-500/10 text-orange-600" : "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Costos a Validar",
      value: String(validarCount),
      sub: "Posible costo inflado",
      icon: AlertTriangle,
      color: validarCount > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Contratar Aparte",
      value: String(contratarAparteCount),
      sub: "Cotizar con otros",
      icon: ShieldAlert,
      color: contratarAparteCount > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
      {cards.map((card, idx) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05, duration: 0.3 }}
          className="rounded-xl border border-card-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center flex-shrink-0`}>
              <card.icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-muted-foreground font-medium leading-tight">{card.label}</p>
          </div>
          <p className="text-xl font-bold text-foreground">{card.value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}
