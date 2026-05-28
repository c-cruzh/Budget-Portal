import { Columns3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BUDGET_COLUMNS, COLUMN_PRESETS } from "./columns";
import { cn } from "@/lib/utils";

interface Props {
  visible: string[];
  onChange: (next: string[]) => void;
  density: "compact" | "comfortable";
  onDensityChange: (d: "compact" | "comfortable") => void;
}

export function ColumnsMenu({ visible, onChange, density, onDensityChange }: Props) {
  const set = new Set(visible);
  const toggle = (id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };
  const applyPreset = (key: keyof typeof COLUMN_PRESETS) => onChange(COLUMN_PRESETS[key]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="w-4 h-4" />
          Columnas
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 mb-1">Presets</div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => applyPreset("esenciales")}
                className="text-xs px-2 py-1 rounded border border-card-border hover:bg-muted"
              >Esenciales</button>
              <button
                onClick={() => applyPreset("financiera")}
                className="text-xs px-2 py-1 rounded border border-card-border hover:bg-muted"
              >Financiera</button>
              <button
                onClick={() => applyPreset("completa")}
                className="text-xs px-2 py-1 rounded border border-card-border hover:bg-muted"
              >Completa</button>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 mb-1">Densidad</div>
            <div className="flex gap-1">
              <button
                onClick={() => onDensityChange("compact")}
                className={cn(
                  "flex-1 text-xs px-2 py-1 rounded border",
                  density === "compact" ? "bg-primary/10 text-primary border-primary/30" : "border-card-border hover:bg-muted"
                )}
              >Compacta</button>
              <button
                onClick={() => onDensityChange("comfortable")}
                className={cn(
                  "flex-1 text-xs px-2 py-1 rounded border",
                  density === "comfortable" ? "bg-primary/10 text-primary border-primary/30" : "border-card-border hover:bg-muted"
                )}
              >Cómoda</button>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 mb-1">Columnas</div>
            <div className="max-h-72 overflow-y-auto space-y-0.5">
              {BUDGET_COLUMNS.map(col => {
                const checked = set.has(col.id);
                return (
                  <label
                    key={col.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer hover:bg-muted",
                      col.always && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <Checkbox
                      checked={checked || !!col.always}
                      disabled={!!col.always}
                      onCheckedChange={() => !col.always && toggle(col.id)}
                    />
                    <span>{col.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
