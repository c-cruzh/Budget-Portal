import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X, MapPin, AlertTriangle, Plus } from "lucide-react";
import type { SpaceDayKey, SpacesCatalog } from "@/data/budgetData";
import { cn } from "@/lib/utils";

export interface SpaceLoadInfo {
  /** Stable room id (SpaceEntry.id). */
  id: string;
  name: string;
  /** Owning place label, e.g. "ESEN — Día 1", "ESEN — Día 2" or a venue name. */
  placeLabel: string;
  /** ESEN day for ESEN rooms; undefined for day-independent venue rooms. */
  dayKey?: SpaceDayKey;
  capacity?: number;
  /** Sum of item quantities assigned to this room. */
  load: number;
  over: boolean;
  /** Number of budget rows referencing this room. */
  itemCount: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaces: SpacesCatalog;
  loadInfo: SpaceLoadInfo[];
  overCount: number;
  canEdit: boolean;
  onAddSpace: (day: SpaceDayKey, name: string) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onSetCapacity: (id: string, value: number | null) => void;
}

const ESEN_DAYS: { key: SpaceDayKey; label: string }[] = [
  { key: "dia-1", label: "Día 1" },
  { key: "dia-2", label: "Día 2" },
];

function CapacityField({
  id,
  capacity,
  canEdit,
  onSetCapacity,
}: {
  id: string;
  capacity?: number;
  canEdit: boolean;
  onSetCapacity: (id: string, value: number | null) => void;
}) {
  const [draft, setDraft] = useState(capacity != null ? String(capacity) : "");

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onSetCapacity(id, null);
      return;
    }
    const num = Math.floor(Number(trimmed));
    onSetCapacity(id, Number.isFinite(num) && num > 0 ? num : null);
  };

  if (!canEdit) {
    return (
      <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
        {capacity != null ? capacity : "—"}
      </span>
    );
  }

  return (
    <Input
      type="number"
      min={0}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder="Aforo"
      className="h-7 w-16 text-xs"
      title="Aforo (capacidad máxima del espacio)"
    />
  );
}

export function SpacesSheet({
  open,
  onOpenChange,
  loadInfo,
  overCount,
  canEdit,
  onAddSpace,
  onRename,
  onDelete,
  onSetCapacity,
}: Props) {
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [newName, setNewName] = useState<Record<SpaceDayKey, string>>({ "dia-1": "", "dia-2": "" });

  // Group rooms by their owning place, preserving first-appearance order. Each
  // group carries the ESEN day (when applicable) so we can offer an add box.
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, { placeLabel: string; dayKey?: SpaceDayKey; rooms: SpaceLoadInfo[] }>();
    for (const info of loadInfo) {
      let g = map.get(info.placeLabel);
      if (!g) {
        g = { placeLabel: info.placeLabel, dayKey: info.dayKey, rooms: [] };
        map.set(info.placeLabel, g);
        order.push(info.placeLabel);
      }
      g.rooms.push(info);
    }
    return order.map(k => map.get(k)!);
  }, [loadInfo]);

  const startEdit = (key: string, name: string) => {
    setConfirmKey(null);
    setEditKey(key);
    setEditVal(name);
  };

  const cancelEdit = () => {
    setEditKey(null);
    setEditVal("");
  };

  const commitEdit = (id: string, oldName: string) => {
    const next = editVal.trim();
    if (next && next !== oldName) {
      onRename(id, next);
    }
    cancelEdit();
  };

  const requestDelete = (id: string, itemCount: number) => {
    cancelEdit();
    if (itemCount > 0) {
      setConfirmKey(id);
    } else {
      onDelete(id);
    }
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setConfirmKey(null);
  };

  const commitAdd = (day: SpaceDayKey) => {
    const name = newName[day].trim();
    if (!name) return;
    onAddSpace(day, name);
    setNewName(prev => ({ ...prev, [day]: "" }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Espacios
            {overCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
                <AlertTriangle className="w-3.5 h-3.5" />
                {overCount} sobre aforo
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            {canEdit
              ? "Renombra o elimina espacios y define su aforo. Cada espacio es único; los cambios se guardan automáticamente."
              : "Lista de espacios y aforo (solo lectura)."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {groups.length === 0 && (
            <div className="text-[11px] text-muted-foreground italic px-1 py-2">Sin espacios</div>
          )}
          {groups.map(group => (
            <div key={group.placeLabel} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">{group.placeLabel}</div>
                <div className="text-[10px] text-muted-foreground">
                  {group.rooms.length} espacio{group.rooms.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="space-y-1.5">
                {group.rooms.map(info => {
                  const rowKey = info.id;
                  const isEditing = editKey === rowKey;
                  const isConfirming = confirmKey === rowKey;
                  const name = info.name;

                  if (isConfirming) {
                    return (
                      <div
                        key={rowKey}
                        className="flex items-start gap-2 p-2.5 rounded border border-destructive/40 bg-destructive/5"
                      >
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <span className="text-[11px] text-foreground block">
                            <strong>{name}</strong> está asignado a {info.itemCount} fila{info.itemCount === 1 ? "" : "s"}.
                            Se eliminará y esas filas quedarán sin asignar.
                          </span>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="destructive" className="h-7" onClick={() => confirmDelete(info.id)}>
                              Eliminar
                            </Button>
                            <Button size="sm" variant="outline" className="h-7" onClick={() => setConfirmKey(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={rowKey} className="flex items-center gap-2 p-2 rounded border border-border bg-card">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitEdit(info.id, name);
                            }
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="h-7 text-xs flex-1 min-w-0"
                        />
                      ) : (
                        <span className="text-xs flex-1 min-w-0 truncate" title={name}>
                          {name}
                        </span>
                      )}

                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded border text-[10px] tabular-nums whitespace-nowrap shrink-0",
                          info.over
                            ? "bg-destructive/10 text-destructive border-destructive/30 font-semibold"
                            : "text-muted-foreground border-border/60"
                        )}
                        title="Carga (suma de cantidades asignadas)"
                      >
                        {info.load}
                        {info.capacity != null ? `/${info.capacity}` : ""}
                      </span>

                      <CapacityField
                        id={info.id}
                        capacity={info.capacity}
                        canEdit={canEdit}
                        onSetCapacity={onSetCapacity}
                      />

                      {canEdit &&
                        (isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary shrink-0"
                              onClick={() => commitEdit(info.id, name)}
                              title="Guardar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={cancelEdit}
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => startEdit(rowKey, name)}
                              title="Renombrar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive shrink-0"
                              onClick={() => requestDelete(info.id, info.itemCount)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {canEdit && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="text-[11px] font-medium text-muted-foreground">Agregar espacio ESEN</div>
              {ESEN_DAYS.map(({ key: day, label }) => (
                <div key={day} className="flex items-center gap-1.5">
                  <Input
                    value={newName[day]}
                    onChange={e => setNewName(prev => ({ ...prev, [day]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitAdd(day);
                      }
                    }}
                    placeholder={`Nuevo espacio en ${label}`}
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 shrink-0"
                    onClick={() => commitAdd(day)}
                    disabled={!newName[day].trim()}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default SpacesSheet;
