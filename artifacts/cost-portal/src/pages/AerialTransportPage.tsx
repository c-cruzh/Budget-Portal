import { motion } from "framer-motion";
import { Plane, Users, Info, AlertTriangle, Handshake, Lock } from "lucide-react";
import { AVIANCA_ROUTES, type AviancaRoute } from "@/data/budgetData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatUSD } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function AerialTransportPage() {
  const [routes] = useLocalStorage<AviancaRoute[]>("avianca-routes-v2", AVIANCA_ROUTES);

  const totalFlights = routes.reduce((s, r) => s + r.costoTotal, 0);
  const totalPax = routes.reduce((s, r) => s + r.asientos, 0);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-700 flex items-center gap-2">
            Sección deprecada — Bloqueada
            <Lock className="w-3.5 h-3.5" />
          </p>
          <p className="text-sm text-amber-700/90">
            Esta sección está deprecada. El total Avianca está cerrado en <span className="font-mono font-semibold">$56,980.03</span> all-inclusive (IVA y tasas incluidas) y no requiere ediciones. Se conserva solo como referencia histórica.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Total Flight Block", value: formatUSD(totalFlights), sub: "IVA & taxes already included", icon: Plane, color: "text-blue-500" },
          { label: "Total Passengers", value: String(totalPax), sub: "Business Flex class", icon: Users, color: "text-indigo-500" },
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

      <section className="opacity-75">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Plane className="w-4 h-4 text-blue-500" />
          </div>
          <h2 className="text-lg font-semibold">Avianca Flight Block</h2>
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-normal text-xs">Business Flex</Badge>
          <Badge variant="outline" className="font-normal text-xs text-muted-foreground">Read-only</Badge>
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
                <tr key={route.id} className="border-b border-border/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{route.grupo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono">{route.asientos}</td>
                  <td className="px-4 py-3 text-right font-mono">${route.costoPorPasajero}</td>
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
                <p className="font-semibold text-amber-700">Avianca / Key Institute Sponsorship Convention — Pending Documentation</p>
                <p className="mt-1">Avianca will commit $22,500 cash + $22,500 in-kind through a convention agreement with Key Institute. The in-kind portion covers a PR dinner/event during the event launch period (not directly for the main event). Once the documentation and agreement process is complete, Avianca will cover the full requested flight block under the negotiated terms and conditions.</p>
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
    </div>
  );
}
