import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer
} from "recharts";
import { INITIAL_BUDGET_ITEMS, type BudgetItem } from "@/data/budgetData";
import { useBudgetApi } from "@/hooks/useBudgetApi";
import { formatUSD } from "@/lib/utils";
import { TrendingUp, DollarSign, Package, AlertCircle, Handshake, Building2, Percent, Users, Loader2 } from "lucide-react";

function recalcItem(item: BudgetItem): BudgetItem {
  const qty = Number(item.qty) || 0;
  const dias = Number(item.qtyDias) || 1;
  const precio = Number(item.precioUnitario) || 0;
  const byDias = item.porDias === "SI";
  item.subtotal = byDias ? qty * dias * precio : qty * precio;
  const feeApplies = item.agencyFee && item.aplicaFee !== "SI";
  item.fee = feeApplies ? item.subtotal * 0.20 : 0;
  item.subtotalConFee = item.subtotal + item.fee;
  item.iva = item.exentoIva ? 0 : item.subtotalConFee * 0.13;
  item.total = item.subtotalConFee + item.iva;
  return item;
}

const SEED_ITEMS = INITIAL_BUDGET_ITEMS.map(recalcItem);

const COLORS_WARM = ["#d97706", "#ea8c00", "#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#1a1a1a", "#525252", "#737373", "#a3a3a3"];
const COLORS_AGENCY = ["#d97706", "#22c55e"];

export default function DashboardPage() {
  const { items, loading } = useBudgetApi(SEED_ITEMS);

  const stats = useMemo(() => {
    const total = items.reduce((s, i) => s + i.total, 0);
    const inKindItems = items.filter(i => i.inKind);
    const paidItems = items.filter(i => !i.inKind && i.total > 0);
    const pendingItems = items.filter(i => i.cotizacion === "PENDING");
    const confirmedItems = items.filter(i => i.cotizacion && i.cotizacion !== "PENDING" && i.cotizacion !== "NA" && i.cotizacion !== "" && !i.inKind);

    const agencyItems = items.filter(i => i.agencyFee);
    const agencyTotal = agencyItems.reduce((s, i) => s + i.total, 0);
    const totalFees = agencyItems.reduce((s, i) => s + i.fee, 0);
    const feeInQuoteItems = agencyItems.filter(i => i.aplicaFee === "SI");
    const feeNotInQuoteItems = agencyItems.filter(i => i.aplicaFee !== "SI");
    const directItems = items.filter(i => !i.agencyFee && !i.inKind && i.total > 0);
    const directTotal = directItems.reduce((s, i) => s + i.total, 0);
    const exentoIvaCount = items.filter(i => i.exentoIva).length;

    return {
      total,
      paidTotal: paidItems.reduce((s, i) => s + i.total, 0),
      inKindCount: inKindItems.length,
      pendingCount: pendingItems.length,
      confirmedCount: confirmedItems.length,
      itemCount: items.length,
      agencyItemCount: agencyItems.length,
      agencyTotal,
      totalFees,
      feeInQuoteCount: feeInQuoteItems.length,
      feeNotInQuoteCount: feeNotInQuoteItems.length,
      directTotal,
      directItemCount: directItems.length,
      exentoIvaCount,
    };
  }, [items]);

  const byArea = useMemo(() => {
    const map = new Map<string, number>();
    items.filter(i => !i.inKind && i.total > 0).forEach(i => {
      map.set(i.area, (map.get(i.area) || 0) + i.total);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.length > 22 ? name.slice(0, 22) + "\u2026" : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [items]);

  const [centroExcludeInKind, setCentroExcludeInKind] = useState(true);

  const byCentro = useMemo(() => {
    const map = new Map<string, number>();
    const filtered = centroExcludeInKind ? items.filter(i => !i.inKind && i.total > 0) : items.filter(i => i.total > 0);
    filtered.forEach(i => {
      map.set(i.centroCosto, (map.get(i.centroCosto) || 0) + i.total);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 18) + "\u2026" : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [items, centroExcludeInKind]);

  const byEvento = useMemo(() => {
    const map = new Map<string, number>();
    items.filter(i => !i.inKind && i.total > 0).forEach(i => {
      const label = i.evento === "MAIN EVENT" ? "Main Event" : i.evento === "MAIN EVENT VIP DINNER" ? "VIP Dinner" : "Pre/Post Event";
      map.set(label, (map.get(label) || 0) + i.total);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [items]);

  const statusData = useMemo(() => [
    { name: "Confirmed", value: stats.confirmedCount, color: "#22c55e" },
    { name: "Pending", value: stats.pendingCount, color: "#f59e0b" },
    { name: "In-Kind", value: stats.inKindCount, color: "#a78bfa" },
    { name: "Other", value: items.length - stats.confirmedCount - stats.pendingCount - stats.inKindCount, color: "#94a3b8" },
  ].filter(d => d.value > 0), [stats, items]);

  const agencyVsDirectData = useMemo(() => [
    { name: "Via Productora", value: stats.agencyTotal, color: "#d97706" },
    { name: "Directo", value: stats.directTotal, color: "#22c55e" },
  ].filter(d => d.value > 0), [stats]);

  const feeBreakdown = useMemo(() => [
    { name: "Fee 20% aplicado", value: stats.feeNotInQuoteCount, color: "#d97706" },
    { name: "Fee incluido en cotiz.", value: stats.feeInQuoteCount, color: "#3b82f6" },
  ].filter(d => d.value > 0), [stats]);

  const byProvider = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    items.filter(i => !i.inKind && i.total > 0 && i.proveedor).forEach(i => {
      const p = i.proveedor!.trim();
      if (!p) return;
      const cur = map.get(p) || { total: 0, count: 0 };
      cur.total += i.total;
      cur.count += 1;
      map.set(p, cur);
    });
    return Array.from(map.entries())
      .map(([name, { total, count }]) => ({ name: name.length > 20 ? name.slice(0, 20) + "\u2026" : name, value: total, count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [items]);

  const topItems = useMemo(() => {
    return [...items].filter(i => i.total > 0).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [items]);

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-muted-foreground text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Budget", value: formatUSD(stats.total), sub: `${stats.itemCount} line items`, icon: DollarSign, color: "bg-primary/10 text-primary" },
          { label: "Cash Expenditure", value: formatUSD(stats.paidTotal), sub: `${items.filter(i => !i.inKind && i.total > 0).length} paid items`, icon: TrendingUp, color: "bg-emerald-500/10 text-emerald-500" },
          { label: "In-Kind Items", value: String(stats.inKindCount), sub: "Sponsor / venue contributions", icon: Package, color: "bg-violet-500/10 text-violet-500" },
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Via Productora (Aurora 360)", value: formatUSD(stats.agencyTotal), sub: `${stats.agencyItemCount} items (${stats.paidTotal > 0 ? ((stats.agencyTotal / stats.paidTotal) * 100).toFixed(1) : 0}% del gasto)`, icon: Building2, color: "bg-amber-500/10 text-amber-600" },
          { label: "Total Fee 20%", value: formatUSD(stats.totalFees), sub: `${stats.feeNotInQuoteCount} items con fee adicional`, icon: Percent, color: "bg-orange-500/10 text-orange-600" },
          { label: "Contratacion Directa", value: formatUSD(stats.directTotal), sub: `${stats.directItemCount} items sin productora`, icon: Users, color: "bg-emerald-500/10 text-emerald-600" },
          { label: "IVA Exento", value: String(stats.exentoIvaCount), sub: "Items sin IVA 13%", icon: Percent, color: "bg-blue-500/10 text-blue-500" },
        ].map((card, idx) => (
          <motion.div
            key={card.label}
            custom={idx + 4}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-card-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg ${card.color} flex items-center justify-center`}>
                <card.icon className="w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
            </div>
            <p className="text-xl font-bold text-foreground">{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm">
          <div className="flex items-start gap-2">
            <Handshake className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-700">Avianca / Key Institute Convention</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Productora vs Directo</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={agencyVsDirectData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" paddingAngle={3}>
                  {agencyVsDirectData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <RechartTooltip
                  formatter={(v: number) => [formatUSD(v), "Total"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {agencyVsDirectData.map(d => (
                <div key={d.name}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="text-sm font-bold">{formatUSD(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Fee Status (Aurora 360)</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={feeBreakdown} cx="50%" cy="50%" innerRadius={28} outerRadius={42} dataKey="value" paddingAngle={3}>
                    {feeBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {feeBreakdown.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs text-muted-foreground flex-1">{d.name}</span>
                    <span className="text-xs font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total fee generado</span>
                <span className="font-bold text-primary">{formatUSD(stats.totalFees)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">% fee sobre gasto productora</span>
                <span className="font-mono">{stats.agencyTotal > 0 ? ((stats.totalFees / stats.agencyTotal) * 100).toFixed(1) : "0"}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Quote Status</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={28} outerRadius={42} dataKey="value" paddingAngle={2}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1">
              {statusData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-xs text-muted-foreground flex-1">{d.name}</span>
                  <span className="text-xs font-bold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-border pt-3 mt-auto">
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">By Event Phase</h4>
            <ResponsiveContainer width="100%" height={55}>
              <BarChart data={byEvento} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={100} />
                <RechartTooltip
                  formatter={(v: number) => [formatUSD(v), "Total"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {byEvento.map((_, i) => <Cell key={i} fill={i === 0 ? "#d97706" : i === 1 ? "#f59e0b" : "#fbbf24"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                {byArea.map((_, i) => <Cell key={i} fill={COLORS_WARM[i % COLORS_WARM.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Spend by Provider</h3>
          {byProvider.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byProvider} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={120} />
                <RechartTooltip
                  formatter={(v: number, _: string, props: any) => [
                    `${formatUSD(v)} (${props.payload.count} items)`, "Total"
                  ]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {byProvider.map((_, i) => <Cell key={i} fill={COLORS_WARM[i % COLORS_WARM.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              No provider data yet — add providers to budget items
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Spend by Cost Center</h3>
            <button
              onClick={() => setCentroExcludeInKind(!centroExcludeInKind)}
              className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors ${centroExcludeInKind ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/50 text-muted-foreground border-border/50 hover:border-border"}`}
            >
              {centroExcludeInKind ? "Excl. In-Kind" : "All"}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byCentro} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={120} />
              <RechartTooltip
                formatter={(v: number) => [formatUSD(v), "Total"]}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {byCentro.map((_, i) => <Cell key={i} fill={COLORS_WARM[i % COLORS_WARM.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

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
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{item.area}</span>
                    {item.agencyFee && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">Aurora 360</span>}
                    {item.proveedor && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">{item.proveedor}</span>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary font-mono">{formatUSD(item.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
