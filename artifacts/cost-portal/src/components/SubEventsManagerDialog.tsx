import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Trash2, Plus, Loader2 } from "lucide-react";
import type { SubEvent, BudgetItem } from "@/data/budgetData";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subEvents: SubEvent[];
  items: BudgetItem[];
  canEdit: boolean;
  onSave: (next: SubEvent[]) => Promise<{ ok: boolean; error?: string }>;
}

const DEFAULT_COLOR = "#94a3b8";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `se-${Date.now().toString(36)}`;
}

export function SubEventsManagerDialog({ open, onOpenChange, subEvents, items, canEdit, onSave }: Props) {
  const [draft, setDraft] = useState<SubEvent[]>(subEvents);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setDraft(subEvents); setError(null); } }, [open, subEvents]);

  const usage: Record<string, number> = {};
  for (const it of items) {
    if (it?.subEventId) usage[it.subEventId] = (usage[it.subEventId] || 0) + 1;
  }

  const commit = async (next: SubEvent[]) => {
    const reordered = next.map((s, i) => ({ ...s, order: i }));
    setDraft(reordered);
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    const res = await onSave(reordered);
    setSaving(false);
    if (!res.ok) setError(res.error || "Falló el guardado");
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[idx], next[j]] = [next[j], next[idx]];
    void commit(next);
  };

  const rename = (id: string, name: string) => {
    setDraft(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const commitRename = (id: string) => {
    const target = draft.find(s => s.id === id);
    if (!target || !target.name.trim()) {
      setDraft(subEvents);
      return;
    }
    void commit(draft);
  };

  const setColor = (id: string, color: string) => {
    const next = draft.map(s => s.id === id ? { ...s, color } : s);
    void commit(next);
  };

  const remove = async (id: string) => {
    if ((usage[id] || 0) > 0) return;
    void commit(draft.filter(s => s.id !== id));
  };

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    let id = slugify(name);
    const existing = new Set(draft.map(s => s.id));
    let suffix = 2;
    let candidate = id;
    while (existing.has(candidate)) {
      candidate = `${id}-${suffix++}`;
    }
    const next = [...draft, { id: candidate, name, order: draft.length, color: newColor }];
    setNewName("");
    setNewColor(DEFAULT_COLOR);
    void commit(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Gestionar sub-eventos</DialogTitle>
          <DialogDescription>
            {canEdit
              ? "Agrega, renombra, reordena o elimina los sub-eventos. Los cambios se guardan automáticamente."
              : "Lista de sub-eventos (solo lectura)."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {draft.map((s, idx) => {
            const count = usage[s.id] || 0;
            const blocked = count > 0;
            return (
              <div key={s.id} className="flex items-center gap-2 p-2 rounded border border-border bg-card">
                <input
                  type="color"
                  value={s.color || DEFAULT_COLOR}
                  onChange={e => canEdit && setColor(s.id, e.target.value)}
                  disabled={!canEdit}
                  className="w-7 h-7 rounded border border-border bg-transparent cursor-pointer"
                  title="Color"
                />
                <Input
                  value={s.name}
                  onChange={e => rename(s.id, e.target.value)}
                  onBlur={() => commitRename(s.id)}
                  disabled={!canEdit}
                  className="h-7 text-xs flex-1"
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{count} items</span>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(idx, -1)} disabled={idx === 0}>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(idx, 1)} disabled={idx === draft.length - 1}>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-7 w-7 text-destructive", blocked && "opacity-30")}
                      onClick={() => remove(s.id)}
                      disabled={blocked}
                      title={blocked ? `${count} items aún apuntan aquí, reasigna primero` : "Eliminar"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {canEdit && (
          <div className="mt-3 p-3 rounded border border-dashed border-border space-y-2">
            <div className="text-xs font-semibold">Agregar sub-evento</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="w-7 h-7 rounded border border-border bg-transparent cursor-pointer"
              />
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nombre del sub-evento"
                className="h-7 text-xs flex-1"
                onKeyDown={e => { if (e.key === "Enter") add(); }}
              />
              <Button size="sm" onClick={add} disabled={!newName.trim()} className="h-7 gap-1">
                <Plus className="w-3 h-3" /> Agregar
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-2 text-[11px] min-h-[18px]">
          <span className="text-destructive">{error}</span>
          {saving && <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Guardando…</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SubEventsManagerDialog;
