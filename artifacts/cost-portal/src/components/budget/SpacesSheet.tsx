import { useState } from "react";
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
import type { BudgetItem, SpaceDayKey, SpacesCatalog } from "@/data/budgetData";
import { cn } from "@/lib/utils";

export interface SpaceLoadInfo {
  name: string;
  capacity?: number;
  loadDia1: number;
  loadDia2: number;
  overDia1: boolean;
  overDia2: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaces: SpacesCatalog;
  items: BudgetItem[];
  loadInfo: SpaceLoadInfo[];
  overCount: number;
  canEdit: boolean;
  onAddSpace: (day: SpaceDayKey, name: string) => void;
  onRename: (day: SpaceDayKey, oldName: string, newName: string) => void;
  onDelete: (day: SpaceDayKey, name: string) => void;
  onSetCapacity: (name: string, value: number | null) => void;
}

const DAYS: { key: SpaceDayKey; label: string }[] = [
  { key: "dia-1", label: "Día 1" },
  { key: "dia-2", label: "Día 2" },
];

function CapacityField({
  name,
  capacity,
  canEdit,
  onSetCapacity,
}: {
  name: string;
  capacity?: number;
  canEdit: boolean;
  onSetCapacity: (name: string, value: number | null) => void;
}) {
  const [draft, setDraft] = useState(capacity != null ? String(capacity) : "");

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onSetCapacity(name, null);
      return;
    }
    const num = Math.floor(Number(trimmed));
    onSetCapacity(name, Number.isFinite(num) && num > 0 ? num : null);
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
  spaces,
  items,
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

  const infoFor = (name: string): SpaceLoadInfo | undefined =>
    loadInfo.find(l => l.name.toLowerCase() === name.toLowerCase());

  const usageFor = (day: SpaceDayKey, name: string): number => {
    const field = day === "dia-1" ? "espacioDia1" : "espacioDia2";
    let n = 0;
    for (const it of items) {
      if ((it[field] || "").trim().toLowerCase() === name.toLowerCase()) n++;
    }
    return n;
  };

  const startEdit = (key: string, name: string) => {
    setConfirmKey(null);
    setEditKey(key);
    setEditVal(name);
  };

  const cancelEdit = () => {
    setEditKey(null);
    setEditVal("");
  };

  const commitEdit = (day: SpaceDayKey, oldName: string) => {
    const next = editVal.trim();
    if (next && next !== oldName) {
      onRename(day, oldName, next);
    }
    cancelEdit();
  };

  const requestDelete = (key: string, day: SpaceDayKey, name: string) => {
    cancelEdit();
    if (usageFor(day, name) > 0) {
      setConfirmKey(key);
    } else {
      onDelete(day, name);
    }
  };

  const confirmDelete = (day: SpaceDayKey, name: string) => {
    onDelete(day, name);
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
              ? "Agrega, renombra o elimina espacios por día y define su aforo. Los cambios se guardan automáticamente."
              : "Lista de espacios y aforo (solo lectura)."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {DAYS.map(({ key: day, label }) => {
            const list = spaces[day];
            return (
              <div key={day} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground">{label}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {list.length} espacio{list.length === 1 ? "" : "s"}
                  </div>
                </div>

                {list.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground italic px-1 py-2">Sin espacios</div>
                ) : (
                  <div className="space-y-1.5">
                    {list.map(name => {
                      const rowKey = `${day}::${name}`;
                      const isEditing = editKey === rowKey;
                      const isConfirming = confirmKey === rowKey;
                      const info = infoFor(name);
                      const load = info ? (day === "dia-1" ? info.loadDia1 : info.loadDia2) : 0;
                      const over = info ? (day === "dia-1" ? info.overDia1 : info.overDia2) : false;
                      const capacity = info?.capacity;
                      const itemCount = usageFor(day, name);

                      if (isConfirming) {
                        return (
                          <div
                            key={rowKey}
                            className="flex items-start gap-2 p-2.5 rounded border border-destructive/40 bg-destructive/5"
                          >
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-2">
                              <span className="text-[11px] text-foreground block">
                                <strong>{name}</strong> está asignado a {itemCount} fila{itemCount === 1 ? "" : "s"} en{" "}
                                {label}. Se eliminará y esas filas quedarán sin asignar.
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7"
                                  onClick={() => confirmDelete(day, name)}
                                >
                                  Eliminar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7"
                                  onClick={() => setConfirmKey(null)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={rowKey}
                          className="flex items-center gap-2 p-2 rounded border border-border bg-card"
                        >
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {isEditing ? (
                            <Input
                              autoFocus
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitEdit(day, name);
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
                              over
                                ? "bg-destructive/10 text-destructive border-destructive/30 font-semibold"
                                : "text-muted-foreground border-border/60"
                            )}
                            title={`Carga ${label} (suma de cantidades)`}
                          >
                            {load}
                            {capacity != null ? `/${capacity}` : ""}
                          </span>

                          <CapacityField
                            name={name}
                            capacity={capacity}
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
                                  onClick={() => commitEdit(day, name)}
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
                                  onClick={() => requestDelete(rowKey, day, name)}
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
                )}

                {canEdit && (
                  <div className="flex items-center gap-1.5 pt-1">
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
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default SpacesSheet;
