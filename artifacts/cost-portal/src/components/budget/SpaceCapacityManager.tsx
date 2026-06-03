import { useState } from "react";
import { Users, AlertTriangle, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SpacesCatalog } from "@/data/budgetData";

export interface SpaceLoadInfo {
  name: string;
  capacity?: number;
  loadDia1: number;
  loadDia2: number;
  overDia1: boolean;
  overDia2: boolean;
}

interface SpaceCapacityManagerProps {
  spaces: SpacesCatalog;
  loadInfo: SpaceLoadInfo[];
  overCount: number;
  canEdit: boolean;
  onSetCapacity: (name: string, value: number | null) => void;
}

function CapacityRow({ info, canEdit, onSetCapacity }: { info: SpaceLoadInfo; canEdit: boolean; onSetCapacity: (name: string, value: number | null) => void }) {
  const [draft, setDraft] = useState(info.capacity != null ? String(info.capacity) : "");

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) { onSetCapacity(info.name, null); return; }
    const num = Math.floor(Number(trimmed));
    onSetCapacity(info.name, Number.isFinite(num) && num > 0 ? num : null);
  };

  const hasCap = info.capacity != null;
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50">
      <span className="flex-1 truncate text-xs font-medium" title={info.name}>{info.name}</span>
      <div className="flex items-center gap-1.5 text-[10px] tabular-nums">
        <span className={cn("px-1.5 py-0.5 rounded border", info.overDia1 ? "bg-destructive/10 text-destructive border-destructive/30 font-semibold" : "text-muted-foreground border-border/60")} title="Carga Día 1 (suma de cantidades)">
          D1 {info.loadDia1}{hasCap ? `/${info.capacity}` : ""}
        </span>
        <span className={cn("px-1.5 py-0.5 rounded border", info.overDia2 ? "bg-destructive/10 text-destructive border-destructive/30 font-semibold" : "text-muted-foreground border-border/60")} title="Carga Día 2 (suma de cantidades)">
          D2 {info.loadDia2}{hasCap ? `/${info.capacity}` : ""}
        </span>
      </div>
      {canEdit ? (
        <Input
          type="number"
          min={0}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
          placeholder="Aforo"
          className="h-7 w-20 text-xs"
        />
      ) : (
        <span className="w-20 text-right text-xs text-muted-foreground">{hasCap ? info.capacity : "—"}</span>
      )}
    </div>
  );
}

export function SpaceCapacityManager({ spaces, loadInfo, overCount, canEdit, onSetCapacity }: SpaceCapacityManagerProps) {
  const [open, setOpen] = useState(false);
  void spaces;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {overCount > 0 ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <Users className="w-4 h-4" />}
          Aforo
          {overCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
              {overCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-2" align="end">
        <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b border-border">
          <div className="text-xs font-semibold">Aforo por espacio</div>
          {overCount > 0 ? (
            <span className="text-[10px] text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{overCount} sobre aforo</span>
          ) : (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Check className="w-3 h-3" />Sin excedidos</span>
          )}
        </div>
        <p className="px-1 pb-1 text-[10px] text-muted-foreground leading-tight">
          Define la capacidad máxima de cada espacio. La carga es la suma de cantidades de los ítems asignados a ese espacio por día.
        </p>
        <div className="max-h-[320px] overflow-y-auto">
          {loadInfo.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-3 text-center">No hay espacios todavía.</div>
          ) : (
            loadInfo.map(info => (
              <CapacityRow key={info.name} info={info} canEdit={canEdit} onSetCapacity={onSetCapacity} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
