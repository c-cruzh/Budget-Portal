import { cn, formatUSD } from "@/lib/utils";
import { getCostBreakdown } from "@/lib/budgetCalc";
import type { BudgetItem } from "@/data/budgetData";

interface CostBreakdownProps {
  item: BudgetItem;
  /** Optional title shown above the breakdown. */
  title?: string;
  className?: string;
}

/**
 * Renders the canonical per-item cost chain (gross → pre-IVA base → agency fee →
 * IVA → tourism → total). Values come from `getCostBreakdown`, which derives them
 * from `recalcItem`, so this display can never drift from the real math.
 */
export function CostBreakdown({ item, title, className }: CostBreakdownProps) {
  const b = getCostBreakdown(item);

  return (
    <div className={cn("text-xs normal-case tracking-normal font-normal", className)}>
      {title && (
        <div className="font-semibold text-foreground mb-1.5">{title}</div>
      )}
      <div className="text-[10px] text-muted-foreground mb-2">
        {b.byDias
          ? `${b.qty} × ${b.dayCount} día(s) × ${formatUSD(b.precio)}`
          : `${b.qty} × ${formatUSD(b.precio)}`}
      </div>

      {b.inKind && (
        <div className="mb-2 text-[10px] text-amber-600 font-medium">
          Ítem In-Kind (no implica desembolso de efectivo).
        </div>
      )}

      <div className="space-y-1">
        {b.rows.map(row => (
          <div
            key={row.key}
            className={cn(
              "flex items-baseline justify-between gap-4",
              row.emphasis && "border-t border-border mt-1 pt-1.5",
            )}
          >
            <div className="flex flex-col">
              <span
                className={cn(
                  row.emphasis ? "font-semibold text-foreground" : "text-muted-foreground",
                  row.muted && "text-muted-foreground/60",
                )}
              >
                {row.label}
              </span>
              {row.hint && (
                <span className="text-[9px] text-muted-foreground/60 leading-tight">{row.hint}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap font-mono">
              {row.badge && (
                <span
                  className={cn(
                    "text-[8px] px-1 py-0.5 rounded font-sans font-medium",
                    row.badge === "Exento"
                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      : "bg-sky-500/10 text-sky-600 border border-sky-500/20",
                  )}
                >
                  {row.badge.toUpperCase()}
                </span>
              )}
              <span
                className={cn(
                  row.emphasis ? "font-semibold text-foreground" : "text-foreground/80",
                  row.muted && "text-muted-foreground/50",
                )}
              >
                {formatUSD(row.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
