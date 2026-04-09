import { motion } from "framer-motion";
import { Plane, Users, TrendingDown, Info, AlertTriangle, Handshake } from "lucide-react";
import { AVIANCA_ROUTES, TRANSFER_ITEMS, type AviancaRoute, type TransferItem } from "@/data/budgetData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatUSD } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EditableCell } from "@/components/EditableCell";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const IVA_RATE = 0.13;

export default function AviancaPage() {
  const [routes, setRoutes] = useLocalStorage<AviancaRoute[]>("avianca-routes-v2", AVIANCA_ROUTES);
  const [transfers, setTransfers] = useLocalStorage<TransferItem[]>("transfer-items-v2", TRANSFER_ITEMS);

  const updateRoute = (id: string, field: keyof AviancaRoute, value: AviancaRoute[keyof AviancaRoute]) => {
    setRoutes(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === "asientos" || field === "costoPorPasajero") {
        updated.costoTotal = Number(updated.asientos) * Number(updated.costoPorPasajero);
      }
      return updated;
    }));
  };

  const updateTransfer = (id: string, field: keyof TransferItem, value: TransferItem[keyof TransferItem]) => {
    setTransfers(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, [field]: value };
      return updated;
    }));
  };

  const totalFlights = routes.reduce((s, r) => s + r.costoTotal, 0);
  const totalPax = routes.reduce((s, r) => s + r.asientos, 0);

  const arrivalTransfers = transfers.filter(t => t.tipo === "ARRIVALS");
  const cityTransfers = transfers.filter(t => t.tipo === "IN-CITY");
  const departureTransfers = transfers.filter(t => t.tipo === "DEPARTURES");

  const totalArrivals = arrivalTransfers.reduce((s, t) => s + t.costoSinIva, 0);
  const totalCity = cityTransfers.reduce((s, t) => s + t.costoSinIva, 0);
  const totalDepartures = departureTransfers.reduce((s, t) => s + t.costoSinIva, 0);
  const totalTransfers = totalArrivals + totalCity + totalDepartures;
  const totalTransfersWithIva = totalTransfers * (1 + IVA_RATE);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Flight Block", value: formatUSD(totalFlights), sub: "IVA & taxes already included", icon: Plane, color: "text-blue-500" },
          { label: "Total Passengers", value: String(totalPax), sub: "Business Flex class", icon: Users, color: "text-indigo-500" },
          { label: "Ground Transfers", value: formatUSD(totalTransfers), sub: `+IVA: ${formatUSD(totalTransfersWithIva)}`, icon: TrendingDown, color: "text-emerald-500" },
        ].map(card => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-card-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Plane className="w-4 h-4 text-blue-500" />
          </div>
          <h2 className="text-lg font-semibold">Avianca Flight Block</h2>
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-normal text-xs">Business Flex</Badge>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Fares already include IVA, airport taxes, and all travel fees. No additional tax applies.
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="rounded-xl border border-card-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Route Group</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-20">Seats</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground w-32">Per Passenger</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground w-32">Route Total</th>
              </tr>
            </thead>
            <tbody>
              {routes.map(route => (
                <tr key={route.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                      <EditableCell value={route.grupo} onSave={v => updateRoute(route.id, "grupo", v)} className="font-medium" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <EditableCell value={String(route.asientos)} onSave={v => updateRoute(route.id, "asientos", parseInt(v) || 0)} className="text-center font-mono" type="number" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <EditableCell value={String(route.costoPorPasajero)} onSave={v => updateRoute(route.id, "costoPorPasajero", parseFloat(v) || 0)} className="text-right font-mono" type="number" prefix="$" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{formatUSD(route.costoTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30">
                <td className="px-4 py-3 font-bold" colSpan={3}>TOTAL GENERAL (IVA & taxes included)</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-lg">{formatUSD(totalFlights)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 space-y-3">
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <Handshake className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-700">Avianca / Kinstitute Sponsorship Convention — Pending Documentation</p>
                <p className="mt-1">Avianca will commit $22,500 cash + $22,500 in-kind through a convention agreement with Kinstitute. The in-kind portion covers a PR dinner/event during the event launch period (not directly for the main event). Once the documentation and agreement process is complete, Avianca will cover the full requested flight block under the negotiated terms and conditions.</p>
                <p className="mt-1 text-amber-600 font-medium">Status: Awaiting formal documentation and signatures.</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-blue-600">Additional Avianca Benefits Included:</p>
            <p>15% discount on Economy fares for general attendees</p>
            <p>20% discount on Business fares for general attendees</p>
            <p>Unlimited discount code redemption portal for the event</p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-emerald-500" />
          </div>
          <h2 className="text-lg font-semibold">Ground Transfers — Linea Ejecutiva</h2>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-normal text-xs">Toyota Hiace</Badge>
        </div>

        {[
          { label: "Airport Arrivals", items: arrivalTransfers, total: totalArrivals },
          { label: "In-City Trips (Hyatt ↔ ESEN ↔ Monarca)", items: cityTransfers, total: totalCity },
          { label: "Airport Departures", items: departureTransfers, total: totalDepartures },
        ].map(section => (
          <div key={section.label} className="mb-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{section.label}</h3>
            <div className="rounded-xl border border-card-border bg-card overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Group / Activity</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Time</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Origin / Destination</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground w-20">Vehicles</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground w-28">Cost (no IVA)</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground w-28">+IVA</th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map(t => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-2.5 font-medium">
                        <EditableCell value={`${t.grupo} - ${t.detalle}`} onSave={v => updateTransfer(t.id, "detalle", v)} className="font-medium" />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{t.hora}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{t.origen} / {t.destino}</td>
                      <td className="px-4 py-2.5 text-center">
                        <EditableCell value={String(t.vehiculos)} onSave={v => updateTransfer(t.id, "vehiculos", parseInt(v) || 1)} className="text-center font-mono" type="number" />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        <EditableCell value={String(t.costoSinIva)} onSave={v => updateTransfer(t.id, "costoSinIva", parseFloat(v) || 0)} className="text-right font-mono" type="number" prefix="$" />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{formatUSD(t.costoSinIva * (1 + IVA_RATE))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/20">
                    <td colSpan={4} className="px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase">Subtotal</td>
                    <td className="px-4 py-2.5 text-right font-semibold font-mono">{formatUSD(section.total)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold font-mono text-primary">{formatUSD(section.total * (1 + IVA_RATE))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}

        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Total Ground Transportation</p>
            <p className="text-xs text-muted-foreground mt-0.5">All transfers — Aeropuerto SAL ↔ Hyatt Centric ↔ ESEN ↔ Monarca</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary font-mono">{formatUSD(totalTransfers)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">+IVA: {formatUSD(totalTransfersWithIva)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
