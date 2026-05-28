import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer
} from "recharts";
import { INITIAL_BUDGET_ITEMS, type BudgetItem } from "@/data/budgetData";
import { useBudgetApi } from "@/hooks/useBudgetApi";
import { formatUSD } from "@/lib/utils";
import { TrendingUp, DollarSign, Package, AlertCircle, Handshake, Building2, Percent, Users, Loader2, ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, MessageSquare, Check, X, Star, ArrowDown, ArrowUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function recalcItem(item: BudgetItem): BudgetItem {
  const qty = Number(item.qty) || 0;
  const dias = Number(item.qtyDias) || 1;
  const precio = Number(item.precioUnitario) || 0;
  const byDias = item.porDias === "SI";
  item.subtotal = byDias ? qty * dias * precio : qty * precio;
  const feeApplies = item.agencyFee && item.aplicaFee !== "SI";
  item.fee = feeApplies ? item.subtotal * 0.20 : 0;
  item.feeIncluido = (item.agencyFee && item.aplicaFee === "SI") ? item.subtotal * 0.20 : 0;
  item.subtotalConFee = item.subtotal + item.fee;
  item.iva = item.exentoIva ? 0 : item.subtotalConFee * 0.13;
  item.turismo = item.aplicaTurismo ? item.subtotalConFee * 0.05 : 0;
  item.total = item.subtotalConFee + item.iva + (item.turismo || 0);
  return item;
}

const SEED_ITEMS = INITIAL_BUDGET_ITEMS.map(recalcItem);

const COLORS_WARM = ["#d97706", "#ea8c00", "#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#1a1a1a", "#525252", "#737373", "#a3a3a3"];

function getFeeProductora(item: BudgetItem): number {
  if (!item.agencyFee) return 0;
  return item.fee > 0 ? item.fee : (item.feeIncluido || 0);
}

export default function DashboardPage() {
  const { items, loading, patchItem } = useBudgetApi(SEED_ITEMS, recalcItem);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const [topCostMode, setTopCostMode] = useState<"CASH" | "INKIND" | "ALL">("CASH");
  const [topCostVisible, setTopCostVisible] = useState(10);
  const [niceSort, setNiceSort] = useState<"DESC" | "ASC">("DESC");
  const [niceVisible, setNiceVisible] = useState(10);
  const [niceExpanded, setNiceExpanded] = useState<string | null>(null);
  const [niceEditingNote, setNiceEditingNote] = useState<string | null>(null);
  const [niceNoteValue, setNiceNoteValue] = useState("");
  const niceNoteRef = useRef<HTMLTextAreaElement>(null);

  const stats = useMemo(() => {
    const total = items.reduce((s, i) => s + i.total, 0);
    const inKindItems = items.filter(i => i.inKind);
    const paidItems = items.filter(i => !i.inKind && i.total > 0);
    const pendingItems = items.filter(i => i.cotizacion === "PENDING");
    const confirmedItems = items.filter(i => i.cotizacion && i.cotizacion !== "PENDING" && i.cotizacion !== "NA" && i.cotizacion !== "" && !i.inKind);

    const agencyItems = items.filter(i => i.agencyFee);
    const agencyTotal = agencyItems.reduce((s, i) => s + i.total, 0);
    const totalFeesExplicit = agencyItems.reduce((s, i) => s + i.fee, 0);
    const totalFeesIncluded = agencyItems.reduce((s, i) => s + (i.feeIncluido || 0), 0);
    const totalFeesAll = items.reduce((s, i) => s + getFeeProductora(i), 0);
    const feeInQuoteItems = agencyItems.filter(i => i.aplicaFee === "SI");
    const feeNotInQuoteItems = agencyItems.filter(i => i.aplicaFee !== "SI" && i.fee > 0);
    const directItems = items.filter(i => !i.agencyFee && !i.inKind && i.total > 0);
    const directTotal = directItems.reduce((s, i) => s + i.total, 0);
    const exentoIvaCount = items.filter(i => i.exentoIva).length;

    const cashSinFee = paidItems.reduce((s, i) => s + i.subtotal + i.iva + (i.turismo || 0), 0);

    const niceToHaveItems = items.filter(i => i.niceToHave);
    const niceToHaveSum = niceToHaveItems.reduce((s, i) => s + i.total, 0);

    return {
      total,
      paidTotal: paidItems.reduce((s, i) => s + i.total, 0),
      cashSinFee,
      inKindCount: inKindItems.length,
      pendingCount: pendingItems.length,
      confirmedCount: confirmedItems.length,
      itemCount: items.length,
      agencyItemCount: agencyItems.length,
      agencyTotal,
      totalFeesExplicit,
      totalFeesIncluded,
      totalFeesAll,
      feeInQuoteCount: feeInQuoteItems.length,
      feeInQuoteAmount: feeInQuoteItems.reduce((s, i) => s + (i.feeIncluido || 0), 0),
      feeNotInQuoteCount: feeNotInQuoteItems.length,
      feeNotInQuoteAmount: feeNotInQuoteItems.reduce((s, i) => s + i.fee, 0),
      directTotal,
      directItemCount: directItems.length,
      exentoIvaCount,
      niceToHaveCount: niceToHaveItems.length,
      niceToHaveSum,
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

  const quoteStatusData = useMemo(() => {
    const recibida = items.filter(i => !i.inKind && i.cotizacion && i.cotizacion !== "PENDING" && i.cotizacion !== "NA" && i.cotizacion !== "" && i.cotizacion !== "VOLUNTARIO" && i.cotizacion !== "PROVEE ESEN");
    const pending = items.filter(i => i.cotizacion === "PENDING");
    const inKind = items.filter(i => i.inKind);
    const na = items.filter(i => !i.inKind && (i.cotizacion === "NA" || i.cotizacion === ""));
    return {
      chart: [
        { name: "Recibida", value: recibida.length, amount: recibida.reduce((s, i) => s + i.total, 0), color: "#22c55e" },
        { name: "Pendiente", value: pending.length, amount: pending.reduce((s, i) => s + i.total, 0), color: "#f59e0b" },
        { name: "In-Kind / Vol.", value: inKind.length, amount: inKind.reduce((s, i) => s + i.total, 0), color: "#a78bfa" },
        { name: "Sin cotizar", value: na.length, amount: na.reduce((s, i) => s + i.total, 0), color: "#94a3b8" },
      ].filter(d => d.value > 0),
      recibidaCount: recibida.length,
      recibidaAmount: recibida.reduce((s, i) => s + i.total, 0),
    };
  }, [items]);

  const agencyVsDirectData = useMemo(() => [
    { name: "Via Productora", value: stats.agencyTotal, color: "#d97706" },
    { name: "Directo", value: stats.directTotal, color: "#22c55e" },
  ].filter(d => d.value > 0), [stats]);

  const feeBreakdown = useMemo(() => [
    { name: "Fee adicional (20%)", value: stats.feeNotInQuoteCount, amount: stats.feeNotInQuoteAmount, color: "#d97706" },
    { name: "Fee incl. en cotiz.", value: stats.feeInQuoteCount, amount: stats.feeInQuoteAmount, color: "#3b82f6" },
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

  const topItemsAll = useMemo(() => {
    let src = [...items];
    if (topCostMode === "CASH") src = src.filter(i => !i.inKind && i.total > 0);
    else if (topCostMode === "INKIND") src = src.filter(i => i.inKind);
    else src = src.filter(i => i.total > 0 || i.inKind);
    return src.sort((a, b) => b.total - a.total);
  }, [items, topCostMode]);

  const topItems = useMemo(() => topItemsAll.slice(0, topCostVisible), [topItemsAll, topCostVisible]);

  const niceItemsAll = useMemo(() => {
    const src = items.filter(i => i.niceToHave);
    return niceSort === "DESC"
      ? src.sort((a, b) => b.total - a.total)
      : src.sort((a, b) => a.total - b.total);
  }, [items, niceSort]);

  const niceItems = useMemo(() => niceItemsAll.slice(0, niceVisible), [niceItemsAll, niceVisible]);
  const niceMitigatedSum = useMemo(
    () => niceItemsAll.filter(i => i.mitigable).reduce((s, i) => s + i.total, 0),
    [niceItemsAll],
  );

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
          { label: "Cash (Sin Fee)", value: formatUSD(stats.cashSinFee), sub: "Productos + servicios + IVA", icon: TrendingUp, color: "bg-emerald-500/10 text-emerald-500" },
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Via Productora (Aurora 360)", value: formatUSD(stats.agencyTotal), sub: `${stats.agencyItemCount} items (${stats.paidTotal > 0 ? ((stats.agencyTotal / stats.paidTotal) * 100).toFixed(1) : 0}% del gasto)`, icon: Building2, color: "bg-amber-500/10 text-amber-600" },
          { label: "Fee Productora Total", value: formatUSD(stats.totalFeesAll), sub: `Incl: ${formatUSD(stats.totalFeesIncluded)} | Adic: ${formatUSD(stats.totalFeesExplicit)}`, icon: Percent, color: "bg-orange-500/10 text-orange-600" },
          { label: "Contratacion Directa", value: formatUSD(stats.directTotal), sub: `${stats.directItemCount} items sin productora`, icon: Users, color: "bg-emerald-500/10 text-emerald-600" },
          { label: "IVA Exento", value: String(stats.exentoIvaCount), sub: "Items sin IVA 13%", icon: Percent, color: "bg-blue-500/10 text-blue-500" },
          { label: "Nice to Have", value: formatUSD(stats.niceToHaveSum), sub: `${stats.niceToHaveCount} items deseables`, icon: Star, color: stats.niceToHaveCount > 0 ? "bg-purple-500/10 text-purple-500" : "bg-emerald-500/10 text-emerald-500" },
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

      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm">
        <div className="flex items-start gap-2">
          <Handshake className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-700">Avianca / Key Institute Convention</p>
            <p className="text-muted-foreground text-xs mt-1">$22,500 cash + $22,500 in-kind commitment pending formal documentation. In-kind covers a PR dinner/event. Once signed, Avianca covers the full flight block.</p>
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
                  <RechartTooltip
                    formatter={(_v: number, _name: string, props: any) => {
                      const d = props.payload;
                      return [`${d.value} items - ${formatUSD(d.amount)}`, d.name];
                    }}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {feeBreakdown.map(d => (
                  <div key={d.name}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-xs text-muted-foreground flex-1">{d.name}</span>
                      <span className="text-xs font-bold">{d.value}</span>
                    </div>
                    <div className="ml-[18px] text-[10px] text-muted-foreground/60">{formatUSD(d.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total fee generado</span>
                <span className="font-bold text-primary">{formatUSD(stats.totalFeesAll)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Cotizaciones</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={quoteStatusData.chart} cx="50%" cy="50%" innerRadius={28} outerRadius={42} dataKey="value" paddingAngle={2}>
                  {quoteStatusData.chart.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <RechartTooltip
                  formatter={(_v: number, _name: string, props: any) => {
                    const d = props.payload;
                    return [`${d.value} items - ${formatUSD(d.amount)}`, d.name];
                  }}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1">
              {quoteStatusData.chart.map(d => (
                <div key={d.name}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs text-muted-foreground flex-1">{d.name}</span>
                    <span className="text-xs font-bold">{d.value}</span>
                  </div>
                  <div className="ml-[18px] text-[10px] text-muted-foreground/60">{formatUSD(d.amount)}</div>
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
          <div className="px-5 py-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Top Cost Items</h3>
              <span className="text-[10px] text-muted-foreground">{topItemsAll.filter(i => i.mitigable).length} marcados para mitigar</span>
            </div>
            <div className="flex items-center gap-1 bg-muted/20 rounded-lg p-0.5">
              {([["CASH", "Cash"], ["INKIND", "In-Kind"], ["ALL", "Todos"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setTopCostMode(val); setTopCostVisible(10); setExpandedItem(null); }}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    topCostMode === val
                      ? "bg-card text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border/50">
            {topItems.map((item, idx) => {
              const isExpanded = expandedItem === item.id;
              const isEditingNote = editingNote === item.id;
              const hasMitigNote = !!(item.mitigNote || "").trim();
              return (
                <div key={item.id}>
                  <div
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/10 transition-colors cursor-pointer group"
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  >
                    <span className="text-muted-foreground text-sm font-mono w-5 shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{item.item}</p>
                        {item.mitigable && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">Mitigable</span>
                        )}
                        {hasMitigNote && !isExpanded && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[280px] text-xs whitespace-pre-wrap">
                              {item.mitigNote}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{item.area}</span>
                        {item.agencyFee && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">Aurora 360</span>}
                        {item.proveedor && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">{item.proveedor}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-primary font-mono shrink-0">{formatUSD(item.total)}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pt-1 ml-8 space-y-3">
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div><span className="text-muted-foreground">Subtotal:</span> <span className="font-mono font-medium">{formatUSD(item.subtotal)}</span></div>
                            <div><span className="text-muted-foreground">Fee 20%:</span> <span className="font-mono font-medium">{formatUSD(item.fee)}</span></div>
                            <div><span className="text-muted-foreground">IVA:</span> <span className="font-mono font-medium">{formatUSD(item.iva)}</span></div>
                            <div><span className="text-muted-foreground">Qty:</span> <span className="font-medium">{item.qty} {item.uom}</span></div>
                            <div><span className="text-muted-foreground">P. Unit:</span> <span className="font-mono font-medium">{formatUSD(Number(item.precioUnitario))}</span></div>
                            {item.porDias === "SI" && <div><span className="text-muted-foreground">Dias:</span> <span className="font-medium">{item.qtyDias}</span></div>}
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newVal = !item.mitigable;
                                patchItem(item.id, "mitigable", newVal);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                item.mitigable
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20"
                                  : "bg-card text-muted-foreground border-border hover:bg-muted/20 hover:text-foreground"
                              }`}
                            >
                              {item.mitigable ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                              {item.mitigable ? "Se puede mitigar" : "Marcar mitigable"}
                            </button>

                            {!isEditingNote && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNote(item.id);
                                  setNoteValue(item.mitigNote || "");
                                  setTimeout(() => noteInputRef.current?.focus(), 50);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border bg-card text-muted-foreground border-border hover:bg-muted/20 hover:text-foreground"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {hasMitigNote ? "Editar nota" : "Agregar nota"}
                              </button>
                            )}
                          </div>

                          {hasMitigNote && !isEditingNote && (
                            <div className="text-xs bg-muted/10 rounded-lg p-3 border border-border/50">
                              <p className="text-muted-foreground text-[10px] uppercase tracking-wide mb-1 font-medium">Nota de mitigacion</p>
                              <p className="text-foreground whitespace-pre-wrap">{item.mitigNote}</p>
                            </div>
                          )}

                          {isEditingNote && (
                            <div className="space-y-2" onClick={e => e.stopPropagation()}>
                              <textarea
                                ref={noteInputRef}
                                value={noteValue}
                                onChange={e => setNoteValue(e.target.value)}
                                placeholder="Escribe una nota de mitigacion..."
                                className="w-full bg-muted/10 border border-border rounded-lg p-3 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                                rows={3}
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    patchItem(item.id, "mitigNote", noteValue.trim());
                                    setEditingNote(null);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                  <Check className="w-3 h-3" /> Guardar
                                </button>
                                <button
                                  onClick={() => setEditingNote(null)}
                                  className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <X className="w-3 h-3" /> Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          {topItemsAll.length > 10 && (
            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {topItems.length} de {topItemsAll.length} items
              </span>
              <div className="flex items-center gap-2">
                {topCostVisible > 10 && (
                  <button
                    onClick={() => setTopCostVisible(prev => Math.max(10, prev - 10))}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Ver menos
                  </button>
                )}
                {topCostVisible < topItemsAll.length && (
                  <button
                    onClick={() => setTopCostVisible(prev => Math.min(topItemsAll.length, prev + 10))}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Ver 10 mas
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-500 fill-purple-500" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Nice to Have — Decision Support</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-muted-foreground">
                {niceItemsAll.length} items · <span className="font-bold text-purple-500">{formatUSD(stats.niceToHaveSum)}</span>
              </span>
              {niceMitigatedSum > 0 && (
                <span className="text-emerald-500">
                  Mitigable: <span className="font-bold">{formatUSD(niceMitigatedSum)}</span>
                </span>
              )}
            </div>
          </div>
          {niceItemsAll.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Items deseables pero no esenciales — candidatos para reducir el presupuesto.
              </p>
              <button
                onClick={() => { setNiceSort(s => s === "DESC" ? "ASC" : "DESC"); setNiceExpanded(null); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                {niceSort === "DESC" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                {niceSort === "DESC" ? "Mayor a menor" : "Menor a mayor"}
              </button>
            </div>
          )}
        </div>
        {niceItemsAll.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Star className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay items marcados como Nice to Have</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Marca items con la estrella en la tabla de Budget Items para verlos aqui</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/50">
              {niceItems.map((item, idx) => {
                const isExpanded = niceExpanded === item.id;
                const isEditingNote = niceEditingNote === item.id;
                const hasMitigNote = !!(item.mitigNote || "").trim();
                return (
                  <div key={item.id}>
                    <div
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/10 transition-colors cursor-pointer group"
                      onClick={() => setNiceExpanded(isExpanded ? null : item.id)}
                    >
                      <span className="text-muted-foreground text-sm font-mono w-5 shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{item.item}</p>
                          {item.mitigable && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">Mitigable</span>
                          )}
                          {hasMitigNote && !isExpanded && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[280px] text-xs whitespace-pre-wrap">
                                {item.mitigNote}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{item.area}</span>
                          {item.inKind && <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 border border-violet-500/20">In-Kind</span>}
                          {item.agencyFee && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">Aurora 360</span>}
                          {item.proveedor && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">{item.proveedor}</span>}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-purple-500 font-mono shrink-0">{formatUSD(item.total)}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 pt-1 ml-8 space-y-3">
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div><span className="text-muted-foreground">Subtotal:</span> <span className="font-mono font-medium">{formatUSD(item.subtotal)}</span></div>
                              <div><span className="text-muted-foreground">Fee 20%:</span> <span className="font-mono font-medium">{formatUSD(item.fee)}</span></div>
                              <div><span className="text-muted-foreground">IVA:</span> <span className="font-mono font-medium">{formatUSD(item.iva)}</span></div>
                              <div><span className="text-muted-foreground">Qty:</span> <span className="font-medium">{item.qty} {item.uom}</span></div>
                              <div><span className="text-muted-foreground">P. Unit:</span> <span className="font-mono font-medium">{formatUSD(Number(item.precioUnitario))}</span></div>
                              {item.porDias === "SI" && <div><span className="text-muted-foreground">Dias:</span> <span className="font-medium">{item.qtyDias}</span></div>}
                            </div>

                            {item.descripcion && (
                              <div className="text-xs text-muted-foreground italic border-l-2 border-purple-500/30 pl-3">
                                {item.descripcion}
                              </div>
                            )}

                            <div className="flex items-center gap-3 pt-1 flex-wrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  patchItem(item.id, "niceToHave", false);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border bg-card text-muted-foreground border-border hover:bg-muted/20 hover:text-foreground"
                              >
                                <Star className="w-3.5 h-3.5" />
                                Quitar Nice to Have
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newVal = !item.mitigable;
                                  patchItem(item.id, "mitigable", newVal);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                  item.mitigable
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20"
                                    : "bg-card text-muted-foreground border-border hover:bg-muted/20 hover:text-foreground"
                                }`}
                              >
                                {item.mitigable ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                                {item.mitigable ? "Se puede mitigar" : "Marcar mitigable"}
                              </button>

                              {!isEditingNote && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNiceEditingNote(item.id);
                                    setNiceNoteValue(item.mitigNote || "");
                                    setTimeout(() => niceNoteRef.current?.focus(), 50);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border bg-card text-muted-foreground border-border hover:bg-muted/20 hover:text-foreground"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  {hasMitigNote ? "Editar nota" : "Agregar nota"}
                                </button>
                              )}
                            </div>

                            {hasMitigNote && !isEditingNote && (
                              <div className="text-xs bg-muted/10 rounded-lg p-3 border border-border/50">
                                <p className="text-muted-foreground text-[10px] uppercase tracking-wide mb-1 font-medium">Nota de decision</p>
                                <p className="text-foreground whitespace-pre-wrap">{item.mitigNote}</p>
                              </div>
                            )}

                            {isEditingNote && (
                              <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                <textarea
                                  ref={niceNoteRef}
                                  value={niceNoteValue}
                                  onChange={e => setNiceNoteValue(e.target.value)}
                                  placeholder="Escribe una nota de decision (por que es nice-to-have, alternativas, etc.)..."
                                  className="w-full bg-muted/10 border border-border rounded-lg p-3 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                                  rows={3}
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      patchItem(item.id, "mitigNote", niceNoteValue.trim());
                                      setNiceEditingNote(null);
                                    }}
                                    className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                  >
                                    <Check className="w-3 h-3" /> Guardar
                                  </button>
                                  <button
                                    onClick={() => setNiceEditingNote(null)}
                                    className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <X className="w-3 h-3" /> Cancelar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            {niceItemsAll.length > 10 && (
              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {niceItems.length} de {niceItemsAll.length} items
                </span>
                <div className="flex items-center gap-2">
                  {niceVisible > 10 && (
                    <button
                      onClick={() => setNiceVisible(prev => Math.max(10, prev - 10))}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Ver menos
                    </button>
                  )}
                  {niceVisible < niceItemsAll.length && (
                    <button
                      onClick={() => setNiceVisible(prev => Math.min(niceItemsAll.length, prev + 10))}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Ver 10 mas
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
