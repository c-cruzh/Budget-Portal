import { AlertTriangle, ShieldAlert, Flag, Star, Tag, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type FlagKey = "inKind" | "validarCosto" | "contratarAparte" | "accionRequerida" | "niceToHave" | "costoEnOtroItem";

interface ItemFlags {
  inKind?: boolean;
  validarCosto?: boolean;
  contratarAparte?: boolean;
  accionRequerida?: boolean;
  niceToHave?: boolean;
  costoEnOtroItem?: boolean;
}

const FLAG_DEFS: { key: FlagKey; label: string; Icon: typeof Tag; activeCls: string }[] = [
  { key: "inKind", label: "In-Kind (donado o sponsor)", Icon: Tag, activeCls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { key: "validarCosto", label: "Validar costo — sin visibilidad de un costo final (la cotización sufrió varianzas o hay datos pendientes de llenar, reflejados como $0)", Icon: AlertTriangle, activeCls: "bg-red-500/15 text-red-500 border-red-500/30" },
  { key: "contratarAparte", label: "Contratar aparte (evitar fee 20%)", Icon: ShieldAlert, activeCls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { key: "accionRequerida", label: "Acción requerida", Icon: Flag, activeCls: "bg-orange-500/15 text-orange-500 border-orange-500/30" },
  { key: "niceToHave", label: "Nice to Have", Icon: Star, activeCls: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
  { key: "costoEnOtroItem", label: "Costo $0 — ya contemplado en otro item", Icon: Link2, activeCls: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
];

export function FlagsChips({
  item,
  onToggle,
  canEdit,
}: {
  item: ItemFlags;
  onToggle: (key: FlagKey) => void;
  canEdit: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {FLAG_DEFS.map(f => {
        const active = !!item[f.key];
        return (
          <Tooltip key={f.key}>
            <TooltipTrigger asChild>
              <button
                onClick={canEdit ? () => onToggle(f.key) : undefined}
                className={cn(
                  "inline-flex items-center justify-center w-5 h-5 rounded transition-colors border",
                  !canEdit && "cursor-default",
                  active ? f.activeCls : "bg-transparent text-muted-foreground/25 border-transparent hover:border-border"
                )}
                aria-label={f.label}
                aria-pressed={active}
              >
                <f.Icon className={cn("w-3 h-3", f.key === "niceToHave" && active && "fill-purple-500")} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {f.label}{active ? " · activo" : ""}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
