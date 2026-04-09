import { motion } from "framer-motion";
import { DollarSign, Package, AlertCircle, CheckCircle2, FileText, AlertTriangle } from "lucide-react";
import { formatUSD } from "@/lib/utils";

interface SummaryCardsProps {
  totalBudget: number;
  totalPaid: number;
  totalInKind: number;
  pendingCount: number;
  itemCount: number;
  validarCount: number;
}

export function SummaryCards({ totalBudget, totalPaid, totalInKind, pendingCount, itemCount, validarCount }: SummaryCardsProps) {
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
      label: "In-Kind Items",
      value: String(totalInKind),
      sub: "Sponsored / venue",
      icon: Package,
      color: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Pending Quotes",
      value: String(pendingCount),
      sub: "Need confirmation",
      icon: pendingCount > 0 ? AlertCircle : CheckCircle2,
      color: pendingCount > 0 ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Costos a Validar",
      value: String(validarCount),
      sub: "Revisar / cotizar aparte",
      icon: AlertTriangle,
      color: validarCount > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05, duration: 0.3 }}
          className="rounded-xl border border-card-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center flex-shrink-0`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted-foreground font-medium leading-tight">{card.label}</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{card.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}
