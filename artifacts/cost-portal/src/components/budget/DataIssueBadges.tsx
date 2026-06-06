import { AlertTriangle, CircleDollarSign, PackageX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DataIssue, DataIssueKey } from "@/lib/budgetCalc";

const ISSUE_STYLE: Record<DataIssueKey, { Icon: typeof AlertTriangle; cls: string }> = {
  incomplete: { Icon: AlertTriangle, cls: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  zerocost: { Icon: CircleDollarSign, cls: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" },
  notransport: { Icon: PackageX, cls: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400" },
};

/** Small per-row alert badges for data-quality issues, each with its own tooltip. */
export function DataIssueBadges({ issues }: { issues: DataIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {issues.map(issue => {
        const { Icon, cls } = ISSUE_STYLE[issue.key];
        return (
          <Tooltip key={issue.key}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border",
                  cls,
                )}
              >
                <Icon className="w-2.5 h-2.5" />
                {issue.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[280px] text-xs">
              {issue.detail}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
