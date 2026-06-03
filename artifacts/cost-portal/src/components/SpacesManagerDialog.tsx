import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X, MapPin, AlertTriangle } from "lucide-react";
import type { BudgetItem, SpaceDayKey, SpacesCatalog } from "@/data/budgetData";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaces: SpacesCatalog;
  items: BudgetItem[];
  canEdit: boolean;
  onRename: (day: SpaceDayKey, oldName: string, newName: string) => void;
  onDelete: (day: SpaceDayKey, name: string) => void;
}

const DAYS: { key: SpaceDayKey; label: string }[] = [
  { key: "dia-1", label: "Día 1" },
  { key: "dia-2", label: "Día 2" },
];

export function SpacesManagerDialog({ open, onOpenChange, spaces, items, canEdit, onRename, onDelete }: Props) {
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestionar espacios</DialogTitle>
          <DialogDescription>
            {canEdit
              ? "Renombra o elimina los espacios de cada día. Renombrar actualiza las filas del Budget asignadas; eliminar las desasigna. Los cambios se guardan automáticamente."
              : "Lista de espacios (solo lectura)."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {DAYS.map(({ key: day, label }) => {
            const list = spaces[day];
            return (
              <div key={day} className="space-y-2">
                <div className="text-xs font-semibold text-foreground">{label}</div>
                {list.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground italic px-1">Sin espacios</div>
                ) : (
                  <div className="space-y-1.5">
                    {list.map(name => {
                      const rowKey = `${day}::${name}`;
                      const count = usageFor(day, name);
                      const isEditing = editKey === rowKey;
                      const isConfirming = confirmKey === rowKey;

                      if (isConfirming) {
                        return (
                          <div key={rowKey} className="flex items-center gap-2 p-2 rounded border border-destructive/40 bg-destructive/5">
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                            <span className="text-[11px] text-foreground flex-1">
                              <strong>{name}</strong> está asignado a {count} fila{count === 1 ? "" : "s"} en {label}. Se eliminará y esas filas quedarán sin asignar.
                            </span>
                            <Button size="sm" variant="destructive" className="h-7" onClick={() => confirmDelete(day, name)}>
                              Eliminar
                            </Button>
                            <Button size="sm" variant="outline" className="h-7" onClick={() => setConfirmKey(null)}>
                              Cancelar
                            </Button>
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
                                if (e.key === "Enter") { e.preventDefault(); commitEdit(day, name); }
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="h-7 text-xs flex-1"
                            />
                          ) : (
                            <span className="text-xs flex-1 truncate" title={name}>{name}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{count} items</span>
                          {canEdit && (
                            isEditing ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => commitEdit(day, name)} title="Guardar">
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit} title="Cancelar">
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(rowKey, name)} title="Renombrar">
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => requestDelete(rowKey, day, name)} title="Eliminar">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SpacesManagerDialog;
