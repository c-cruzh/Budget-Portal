import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  HandCoins, Plus, Trash2, ExternalLink, TrendingUp, TrendingDown,
  CheckCircle2, MessageCircle, Sparkles, Calculator, Star, Percent
} from "lucide-react";
import { cn, formatUSD } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useBudgetApi } from "@/hooks/useBudgetApi";
import { useSponsorsApi, type Sponsor } from "@/hooks/useSponsorsApi";
import { INITIAL_BUDGET_ITEMS, type BudgetItem } from "@/data/budgetData";
import { EditableCell } from "@/components/EditableCell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

const STATUS_OPTIONS: Array<{ value: NonNullable<Sponsor["status"]>; label: string; color: string }> = [
  { value: "CONFIRMED", label: "Confirmado", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  { value: "VERBAL", label: "Verbal", color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  { value: "PROSPECT", label: "Prospecto", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
];

function newId() {
  return (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function SponsorsPage() {
  const { permissions } = useAuth();
  const canEdit = permissions?.canEdit ?? false;

  const { items } = useBudgetApi(INITIAL_BUDGET_ITEMS, recalcItem);
  const { sponsors, setSponsors, scenario, setScenario, loading } = useSponsorsApi();

  const [showOnlyConfirmed, setShowOnlyConfirmed] = useState(false);

  // ---- Cash needed math ----
  const cashMath = useMemo(() => {
    const paid = items.filter(i => !i.inKind && i.total > 0);
    const cashSinFee = paid.reduce((s, i) => s + i.subtotal + i.iva + (i.turismo || 0), 0);
    const feeProductora = paid.reduce((s, i) => s + (i.fee || 0), 0);
    const niceItems = paid.filter(i => i.niceToHave);
    const niceCashSinFee = niceItems.reduce((s, i) => s + i.subtotal + i.iva + (i.turismo || 0), 0);
    const niceFee = niceItems.reduce((s, i) => s + (i.fee || 0), 0);

    let needed = cashSinFee;
    if (scenario.includeFee) needed += feeProductora;
    if (scenario.excludeNiceToHave) {
      needed -= niceCashSinFee;
      if (scenario.includeFee) needed -= niceFee;
    }

    return {
      cashSinFee,
      feeProductora,
      niceCashSinFee,
      niceFee,
      niceCount: niceItems.length,
      itemCount: paid.length,
      needed,
    };
  }, [items, scenario]);

  const sponsorMath = useMemo(() => {
    const filtered = showOnlyConfirmed ? sponsors.filter(s => s.status === "CONFIRMED") : sponsors;
    const totalRaised = filtered.reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
    const confirmed = sponsors.filter(s => s.status === "CONFIRMED").reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
    const verbal = sponsors.filter(s => s.status === "VERBAL").reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
    const prospect = sponsors.filter(s => s.status === "PROSPECT").reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
    return { totalRaised, confirmed, verbal, prospect, count: sponsors.length };
  }, [sponsors, showOnlyConfirmed]);

  const net = sponsorMath.totalRaised - cashMath.needed;
  const isPositive = net >= 0;
  const coverage = cashMath.needed > 0 ? Math.min(100, (sponsorMath.totalRaised / cashMath.needed) * 100) : 0;

  // ---- Mutations ----
  const addSponsor = () => {
    if (!canEdit) return;
    setSponsors(prev => [...prev, { id: newId(), name: "", amount: 0, status: "PROSPECT", notes: "", link: "" }]);
  };

  const updateSponsor = (id: string, patch: Partial<Sponsor>) => {
    setSponsors(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const removeSponsor = (id: string) => {
    setSponsors(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="p-5 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <span className="brand-gradient-bg p-2 rounded-lg text-white"><HandCoins className="w-5 h-5" /></span>
            Sponsors & Cash Coverage
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Patrocinadores en cash y comparación con el presupuesto necesario. Toggle escenarios para ver impacto.
          </p>
        </div>
      </div>

      {/* SCORECARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cash Raised</span>
            <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-600"><HandCoins className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-bold tabular-nums">{formatUSD(sponsorMath.totalRaised)}</div>
          <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <span><span className="text-emerald-600 font-semibold">{formatUSD(sponsorMath.confirmed)}</span> conf.</span>
            <span><span className="text-blue-600 font-semibold">{formatUSD(sponsorMath.verbal)}</span> verbal</span>
            <span><span className="text-amber-600 font-semibold">{formatUSD(sponsorMath.prospect)}</span> prosp.</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cash Needed</span>
            <div className="p-1.5 rounded brand-gradient-bg text-white"><Calculator className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-bold tabular-nums brand-gradient-text">{formatUSD(cashMath.needed)}</div>
          <div className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            Cash (sin fee) {formatUSD(cashMath.cashSinFee)}
            {scenario.includeFee && <> <span className="text-foreground">+ fee {formatUSD(cashMath.feeProductora)}</span></>}
            {scenario.excludeNiceToHave && <> <span className="text-rose-600">− nice-to-have {formatUSD(cashMath.niceCashSinFee + (scenario.includeFee ? cashMath.niceFee : 0))}</span></>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={cn(
            "rounded-xl border p-5 shadow-sm",
            isPositive ? "bg-emerald-500/5 border-emerald-500/30" : "bg-rose-500/5 border-rose-500/30"
          )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Position</span>
            <div className={cn("p-1.5 rounded", isPositive ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600")}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className={cn("text-3xl font-bold tabular-nums", isPositive ? "text-emerald-600" : "text-rose-600")}>
            {isPositive ? "+" : ""}{formatUSD(net)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {isPositive
              ? <>Sobran {formatUSD(net)} sobre el presupuesto</>
              : <>Faltan {formatUSD(Math.abs(net))} para cubrir el presupuesto</>}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full transition-all", isPositive ? "bg-emerald-500" : "bg-rose-500")}
              style={{ width: `${coverage}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">{coverage.toFixed(1)}% cubierto</div>
        </motion.div>
      </div>

      {/* SCENARIO CONTROLS */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Escenarios</h2>
          <span className="text-[10px] text-muted-foreground">Ajusta el cálculo de cash necesario</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors">
            <Switch
              checked={scenario.includeFee}
              onCheckedChange={(v: boolean) => setScenario(s => ({ ...s, includeFee: v }))}
              disabled={!canEdit}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Percent className="w-3.5 h-3.5 text-blue-600" />
                Incluir Fee Productora (20%)
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Suma <span className="font-semibold text-foreground">{formatUSD(cashMath.feeProductora)}</span> al total necesario.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors">
            <Switch
              checked={scenario.excludeNiceToHave}
              onCheckedChange={(v: boolean) => setScenario(s => ({ ...s, excludeNiceToHave: v }))}
              disabled={!canEdit}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                Descontar Nice-to-Haves
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Resta <span className="font-semibold text-foreground">{formatUSD(cashMath.niceCashSinFee + (scenario.includeFee ? cashMath.niceFee : 0))}</span> ({cashMath.niceCount} items).
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* SPONSORS LIST */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Patrocinadores</h2>
            <span className="text-[11px] text-muted-foreground">{sponsorMath.count} {sponsorMath.count === 1 ? "patrocinador" : "patrocinadores"}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
              <Switch checked={showOnlyConfirmed} onCheckedChange={setShowOnlyConfirmed} />
              Solo confirmados (afecta scorecard)
            </label>
            {canEdit && (
              <Button size="sm" onClick={addSponsor} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : sponsors.length === 0 ? (
          <div className="p-12 text-center">
            <HandCoins className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No hay patrocinadores aún.</p>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={addSponsor} className="mt-3 gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Agregar el primero
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Patrocinador</th>
                  <th className="text-left px-3 py-2 font-medium w-[140px]">Estado</th>
                  <th className="text-right px-3 py-2 font-medium w-[140px]">Monto (USD)</th>
                  <th className="text-left px-3 py-2 font-medium">Notas</th>
                  <th className="text-left px-3 py-2 font-medium w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sponsors.map(sp => {
                  const statusOpt = STATUS_OPTIONS.find(o => o.value === sp.status) || STATUS_OPTIONS[2];
                  return (
                    <tr key={sp.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 align-top">
                        <EditableCell
                          value={sp.name}
                          onSave={v => updateSponsor(sp.id, { name: v })}
                          className="font-medium"
                          placeholder="Nombre del patrocinador..."
                          disabled={!canEdit}
                        />
                        <div className="flex items-center gap-1 mt-0.5">
                          {sp.link && (
                            <a href={sp.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          <EditableCell
                            value={sp.link || ""}
                            onSave={v => updateSponsor(sp.id, { link: v })}
                            className={sp.link ? "text-blue-500 text-[10px] truncate max-w-[200px]" : "text-blue-400/40 text-[10px]"}
                            placeholder="+ link / acuerdo"
                            disabled={!canEdit}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        {canEdit ? (
                          <div className="flex flex-col gap-0.5">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => updateSponsor(sp.id, { status: opt.value })}
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded border text-left transition-all",
                                  sp.status === opt.value
                                    ? opt.color + " font-semibold"
                                    : "border-transparent text-muted-foreground/50 hover:bg-muted/40"
                                )}
                              >
                                {sp.status === opt.value && <CheckCircle2 className="w-2.5 h-2.5 inline mr-1" />}
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className={cn("text-[10px] px-2 py-0.5 rounded border", statusOpt.color)}>{statusOpt.label}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top text-right">
                        <EditableCell
                          value={String(sp.amount || 0)}
                          onSave={v => updateSponsor(sp.id, { amount: parseFloat(v) || 0 })}
                          className="text-right font-mono font-semibold tabular-nums"
                          type="number"
                          prefix="$"
                          disabled={!canEdit}
                        />
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <EditableCell
                          value={sp.notes || ""}
                          onSave={v => updateSponsor(sp.id, { notes: v })}
                          className="text-xs text-muted-foreground"
                          placeholder="Categoría, contacto, condiciones..."
                          disabled={!canEdit}
                        />
                      </td>
                      <td className="px-3 py-2.5 align-top text-right">
                        {canEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => removeSponsor(sp.id)}
                                className="text-muted-foreground/40 hover:text-rose-600 transition-colors p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar patrocinador</TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/20 font-semibold">
                <tr>
                  <td className="px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground" colSpan={2}>
                    Total {showOnlyConfirmed ? "(confirmados)" : ""}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono brand-gradient-text text-base">
                    {formatUSD(sponsorMath.totalRaised)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {!canEdit && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <MessageCircle className="w-3 h-3" />
          Vista de solo lectura. Contacta a un editor de C2 LABS para registrar patrocinadores.
        </div>
      )}
    </div>
  );
}
