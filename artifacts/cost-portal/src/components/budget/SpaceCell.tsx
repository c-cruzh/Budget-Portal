import { useState } from "react";
import { MapPin, Plus, Check, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SpaceDayKey, SpaceOptionGroup } from "@/data/budgetData";

interface DayPickerProps {
  day: SpaceDayKey;
  dayLabel: string;
  /** Display name of the currently-assigned room ("" when unassigned). */
  value?: string;
  /** Stable id of the currently-assigned room ("" when unassigned/orphan). */
  valueId?: string;
  optionGroups: SpaceOptionGroup[];
  canEdit: boolean;
  over?: boolean;
  /** Lugar/Sede label of the assigned room, e.g. "ESEN — Día 1" or "Hotel". */
  placeLabel?: string;
  onAssign: (day: SpaceDayKey, id: string) => void;
  onAddSpace: (day: SpaceDayKey, name: string) => void;
  showDayPrefix?: boolean;
}

function DaySpacePicker({ day, dayLabel, value, valueId, optionGroups, canEdit, over, placeLabel, onAssign, onAddSpace, showDayPrefix }: DayPickerProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const label = value
    ? (showDayPrefix ? `${dayLabel}: ${value}` : value)
    : (showDayPrefix ? `${dayLabel}: —` : "Sin asignar");

  // Short Lugar/Sede chip text: first segment before an em/en dash ("ESEN — Día 1" → "ESEN").
  const place = (placeLabel || "").trim();
  const shortPlace = place ? (place.split(/—|–/)[0].trim() || place) : "";

  const trigger = (
    <span className="inline-flex flex-col items-start gap-0.5">
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
      {value && shortPlace && (
        <span
          className="text-[9px] leading-none text-muted-foreground/80 max-w-[130px] truncate pl-1.5"
          title={place}
        >
          {shortPlace}
        </span>
      )}
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
              {group.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { onAssign(day, opt.id); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted",
                    opt.id === valueId && "bg-primary/10 text-primary"
                  )}
                >
                  <span className="truncate text-left">{opt.name}</span>
                  {opt.id === valueId && <Check className="w-3 h-3 shrink-0" />}
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
  // Each item maps to exactly one space-catalog day, derived from its phase.
  day: SpaceDayKey;
  /** Display name of the assigned room. */
  value?: string;
  /** Stable id of the assigned room. */
  valueId?: string;
  options: SpaceOptionGroup[];
  canEdit: boolean;
  over?: boolean;
  /** Lugar/Sede label of the assigned room, e.g. "ESEN — Día 1" or "Hotel". */
  placeLabel?: string;
  onAssign: (day: SpaceDayKey, id: string) => void;
  onAddSpace: (day: SpaceDayKey, name: string) => void;
}

export function SpaceCell({ day, value, valueId, options, canEdit, over, placeLabel, onAssign, onAddSpace }: SpaceCellProps) {
  return (
    <DaySpacePicker
      day={day} dayLabel={day === "dia-2" ? "D2" : "D1"} value={value} valueId={valueId} optionGroups={options}
      canEdit={canEdit} over={over} placeLabel={placeLabel} onAssign={onAssign} onAddSpace={onAddSpace}
    />
  );
}
