import { Loader2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { itemWorkStage, type WorkStage } from "@/data/budgetData";

const META: Record<Exclude<WorkStage, "normal">, { label: string; cls: string; Icon: typeof Loader2 }> = {
  "en-progreso": {
    label: "En progreso",
    cls: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    Icon: Loader2,
  },
  staged: {
    label: "Staged",
    cls: "border-slate-400/50 bg-slate-400/15 text-slate-600 dark:text-slate-300",
    Icon: Layers,
  },
};

/** Small badge marking an item's work-stage. Renders nothing for "normal". */
export function StageBadge({ item, className }: { item: { workStage?: WorkStage }; className?: string }) {
  const stage = itemWorkStage(item);
  if (stage === "normal") return null;
  const { label, cls, Icon } = META[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap",
        cls,
        className,
      )}
    >
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}
