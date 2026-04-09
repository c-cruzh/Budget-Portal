import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { INITIAL_BUDGET_ITEMS, AVIANCA_ROUTES, type BudgetItem } from "@/data/budgetData";
import { formatUSD } from "@/lib/utils";
import { TrendingUp, DollarSign, Package, AlertCircle, CheckCircle, Clock, Handshake } from "lucide-react";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f5f3ff", "#4f46e5"];

export default function DashboardPage() {
  const [items] = useLocalStorage<BudgetItem[]>("budget-items-v2", INITIAL_BUDGET_ITEMS);

  const stats = useMemo(() => {
    const total = items.reduce((s, i) => s + i.total, 0);
    const inKindItems = items.filter(i => i.inKind);
    const paidItems = items.filter(i => !i.inKind && i.total > 0);
    const pendingItems = items.filter(i => i.cotizacion === "PENDING");
    const confirmedItems = items.filter(i => i.cotizacion && i.cotizacion !== "PENDING" && i.cotizacion !== "NA" && i.cotizacion !== "" && !i.inKind);

    return {
      total,
      paidTotal: paidItems.reduce((s, i) => s + i.total, 0),
      inKindCount: inKindItems.length,
      pendingCount: pendingItems.length,
      confirmedCount: confirmedItems.length,
      itemCount: items.length,
    };
  }, [items]);

  // By area
  const byArea = useMemo(() => {
    const map = new Map<string, number>();
    items.filter(i => !i.inKind && i.total > 0).forEach(i => {
      map.set(i.area, (map.get(i.area) || 0) + i.total);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.length > 22 ? name.slice(0, 22) + "…" : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [items]);

  // By cost center
  const byCentro = useMemo(() => {
    const map = new Map<string, number>();
    items.filter(i => !i.inKind && i.total > 0).forEach(i => {
      map.set(i.centroCosto, (map.get(i.centroCosto) || 0) + i.total);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 18) + "…" : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [items]);

  // By event type
  const byEvento = useMemo(() => {
    const map = new Map<string, number>();
    items.filter(i => !i.inKind && i.total > 0).forEach(i => {
      const label = i.evento === "MAIN EVENT" ? "Main Event" : i.evento === "MAIN EVENT VIP DINNER" ? "VIP Dinner" : "Pre/Post Event";
      map.set(label, (map.get(label) || 0) + i.total);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [items]);

  // Status breakdown
  const statusData = useMemo(() => [
    { name: "Confirmed", value: stats.confirmedCount, color: "#22c55e" },
    { name: "Pending", value: stats.pendingCount, color: "#f59e0b" },
    { name: "In-Kind", value: stats.inKindCount, color: "#a78bfa" },
    { name: "Other", value: items.length - stats.confirmedCount - stats.pendingCount - stats.inKindCount, color: "#94a3b8" },
  ].filter(d => d.value > 0), [stats, items]);

  const topItems = useMemo(() => {
    return [...items].filter(i => i.total > 0).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [items]);

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
  };

  return (
    <div className="space-y-8">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Budget", value: formatUSD(stats.total), sub: "All items incl. IVA", icon: DollarSign, color: "bg-primary/10 text-primary" },
          { label: "Cash Expenditure", value: formatUSD(stats.paidTotal), sub: `${items.filter(i => !i.inKind && i.total > 0).length} paid items`, icon: TrendingUp, color: "bg-emerald-500/10 text-emerald-500" },
          { label: "In-Kind Items", value: String(stats.inKindCount), sub: "Sponsor / venue contributions", icon: Package, color: "bg-amber-500/10 text-amber-500" },
          { label: "Pending Quotes", value: String(stats.pendingCount), sub: "Need confirmation", icon: AlertCircle, color: "bg-red-500/10 text-red-500" },
        ].map((card, idx) => (
          <motion.div
            key={card.label}
            custom={idx}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-card-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm">
          <div className="flex items-start gap-2">
            <Handshake className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-700">Avianca / Kinstitute Convention</p>
              <p className="text-muted-foreground text-xs mt-1">$22,500 cash + $22,500 in-kind commitment pending formal documentation. In-kind covers a PR dinner/event. Once signed, Avianca covers the full flight block.</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm">
          <div className="flex items-start gap-2">
            <Handshake className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700">Andian — Potential Sponsor</p>
              <p className="text-muted-foreground text-xs mt-1">Andian (lunch & coffee breaks caterer) could enter as a sponsor to improve budget viability. Negotiation in progress.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by area */}
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Spend by Area</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byArea} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={120} />
              <RechartTooltip
                formatter={(v: number) => [formatUSD(v), "Total"]}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {byArea.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie + Event split */}
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Quote Status</h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" paddingAngle={2}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-sm text-muted-foreground">{d.name}</span>
                    <span className="text-sm font-semibold ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Budget by Event Phase</h3>
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={byEvento} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={110} />
                <RechartTooltip
                  formatter={(v: number) => [formatUSD(v), "Total"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {byEvento.map((_, i) => <Cell key={i} fill={i === 0 ? "#6366f1" : "#a78bfa"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Items */}
      <div className="rounded-xl border border-card-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Top Cost Items</h3>
        </div>
        <div className="divide-y divide-border/50">
          {topItems.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/10 transition-colors">
              <span className="text-muted-foreground text-sm font-mono w-5">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.item}</p>
                <p className="text-xs text-muted-foreground">{item.area} — {item.centroCosto}</p>
              </div>
              <span className="text-sm font-semibold text-primary font-mono">{formatUSD(item.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
