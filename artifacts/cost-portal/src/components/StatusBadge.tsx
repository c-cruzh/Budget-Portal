import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Gift, FileText, ExternalLink } from "lucide-react";

interface StatusBadgeProps {
  value: string;
}

export function StatusBadge({ value }: StatusBadgeProps) {
  if (!value || value === "") {
    return <span className="text-xs text-muted-foreground/40 italic">—</span>;
  }

  if (value === "VOLUNTARIO") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20">
        <Gift className="w-3 h-3" />
        Volunteer
      </span>
    );
  }

  if (value === "PROVEE ESEN" || value === "PROVEE ESEN ") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 border border-teal-500/20">
        <Gift className="w-3 h-3" />
        ESEN
      </span>
    );
  }

  if (value === "NA" || value === "IN-KIND") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
        <Gift className="w-3 h-3" />
        In-Kind
      </span>
    );
  }

  if (value === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20 animate-pulse">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  }

  // Has a real quote/link reference
  const isUrl = value.startsWith("http://") || value.startsWith("https://");

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border",
      isUrl
        ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    )}>
      {isUrl ? <ExternalLink className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
      {isUrl ? "Link" : "Quoted"}
    </span>
  );
}
