import { useState } from "react";
import { MapPin, Plus, Check, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DiaValue, SpaceDayKey, SpaceOptionGroup } from "@/data/budgetData";

interface DayPickerProps {
  day: SpaceDayKey;
  dayLabel: string;
  value?: string;
  optionGroups: SpaceOptionGroup[];
  canEdit: boolean;
  over?: boolean;
  onAssign: (day: SpaceDayKey, value: string) => void;
  onAddSpace: (day: SpaceDayKey, name: string) => void;
  showDayPrefix?: boolean;
}

function DaySpacePicker({ day, dayLabel, value, optionGroups, canEdit, over, onAssign, onAddSpace, showDayPrefix }: DayPickerProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const label = value
    ? (showDayPrefix ? `${dayLabel}: ${value}` : value)
    : (showDayPrefix ? `${dayLabel}: —` : "Sin asignar");

  const trigger = (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium max-w-[130px]",
        over && value
          ? "bg-destructive/10 text-destructive border-destructive/30"
          : value
          ? "bg-primary/10 text-primary border-primary/20"
          : "bg-muted/40 text-muted-foreground/50 border-border/50"
      )}
      title={over && value ? `${value} — supera el aforo` : (value || "Sin asignar")}
    >
      {over && value
        ? <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
        : <MapPin className="w-2.5 h-2.5 shrink-0" />}
      <span className="truncate">{label}</span>
    </span>
  );

  if (!canEdit) return trigger;

  const commitAdd = () => {
    const name = newName.trim();
    if (name) {
      onAddSpace(day, name);
      setNewName("");
      setAdding(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setAdding(false); setNewName(""); } }}>
      <PopoverTrigger asChild>
        <button className="cursor-pointer hover:opacity-80 transition-opacity">{trigger}</button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[220px] p-1" align="start">
        <div className="max-h-56 overflow-y-auto">
          <button
            onClick={() => { onAssign(day, ""); setOpen(false); }}
            className={cn(
              "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted text-muted-foreground",
              !value && "bg-primary/10 text-primary"
            )}
          >
            <span>Sin asignar</span>
            {!value && <Check className="w-3 h-3" />}
          </button>
          {optionGroups.length === 0 && (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground">Sin espacios disponibles</p>
          )}
          {optionGroups.map((group, gi) => (
            <div key={`${group.lugar}-${group.zone}-${gi}`} className="mb-0.5">
              <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
                {group.lugar}
                <span className="ml-1 font-normal normal-case text-muted-foreground">· {group.zone}</span>
              </div>
              {group.names.map(opt => (
                <button
                  key={`${gi}-${opt}`}
                  onClick={() => { onAssign(day, opt); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted",
                    opt === value && "bg-primary/10 text-primary"
                  )}
                >
                  <span className="truncate text-left">{opt}</span>
                  {opt === value && <Check className="w-3 h-3 shrink-0" />}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-1 pt-1">
          {adding ? (
            <div className="flex items-center gap-1 px-1">
              <Input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); commitAdd(); }
                  if (e.key === "Escape") { setAdding(false); setNewName(""); }
                }}
                placeholder="Nombre del espacio"
                className="h-7 text-xs"
              />
              <button
                onClick={commitAdd}
                className="h-7 px-2 rounded bg-primary text-primary-foreground text-xs shrink-0"
              >OK</button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-primary hover:bg-primary/10"
            >
              <Plus className="w-3 h-3" />
              Agregar espacio
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface SpaceCellProps {
  dia: DiaValue;
  espacioDia1?: string;
  espacioDia2?: string;
  optionsDia1: SpaceOptionGroup[];
  optionsDia2: SpaceOptionGroup[];
  canEdit: boolean;
  overDia1?: boolean;
  overDia2?: boolean;
  onAssign: (day: SpaceDayKey, value: string) => void;
  onAddSpace: (day: SpaceDayKey, name: string) => void;
}

export function SpaceCell({ dia, espacioDia1, espacioDia2, optionsDia1, optionsDia2, canEdit, overDia1, overDia2, onAssign, onAddSpace }: SpaceCellProps) {
  if (dia === "dia-1") {
    return (
      <DaySpacePicker
        day="dia-1" dayLabel="D1" value={espacioDia1} optionGroups={optionsDia1}
        canEdit={canEdit} over={overDia1} onAssign={onAssign} onAddSpace={onAddSpace}
      />
    );
  }
  if (dia === "dia-2") {
    return (
      <DaySpacePicker
        day="dia-2" dayLabel="D2" value={espacioDia2} optionGroups={optionsDia2}
        canEdit={canEdit} over={overDia2} onAssign={onAssign} onAddSpace={onAddSpace}
      />
    );
  }
  return (
    <div className="flex flex-col gap-1 items-start">
      <DaySpacePicker
        day="dia-1" dayLabel="D1" value={espacioDia1} optionGroups={optionsDia1}
        canEdit={canEdit} over={overDia1} onAssign={onAssign} onAddSpace={onAddSpace} showDayPrefix
      />
      <DaySpacePicker
        day="dia-2" dayLabel="D2" value={espacioDia2} optionGroups={optionsDia2}
        canEdit={canEdit} over={overDia2} onAssign={onAssign} onAddSpace={onAddSpace} showDayPrefix
      />
    </div>
  );
}
