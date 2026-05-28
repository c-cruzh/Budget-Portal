import { Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActiveFilterChip {
  key: string;
  label: string;
  onClear: () => void;
}

interface Props {
  active: ActiveFilterChip[];
  onClearAll: () => void;
  children: React.ReactNode;
}

export function FiltersPopover({ active, onClearAll, children }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <Filter className="w-4 h-4" />
            Filtros
            {active.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">
                {active.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[520px] p-3" align="start">
          <div className="grid grid-cols-2 gap-2">{children}</div>
        </PopoverContent>
      </Popover>
      {active.length > 0 && (
        <>
          {active.map(chip => (
            <button
              key={chip.key}
              onClick={chip.onClear}
              className={cn(
                "inline-flex items-center gap-1 h-7 px-2 rounded-full text-[11px]",
                "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
              )}
            >
              <span>{chip.label}</span>
              <X className="w-3 h-3" />
            </button>
          ))}
          <button
            onClick={onClearAll}
            className="text-[11px] text-muted-foreground hover:text-primary underline"
          >
            Limpiar todos
          </button>
        </>
      )}
    </div>
  );
}
