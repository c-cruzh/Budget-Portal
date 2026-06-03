import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Truck, PackageOpen, Plus, Trash2, Pencil, Clock, Users, Link2, X,
  Building2, Cloud, CloudOff, Loader2, Search, Lock, Calendar,
} from "lucide-react";
import { useMontajeApi } from "@/hooks/useMontajeApi";
import { useBudgetApi } from "@/hooks/useBudgetApi";
import { useAuth } from "@/hooks/useAuth";
import { recalcItem } from "@/lib/budgetCalc";
import {
  INITIAL_BUDGET_ITEMS, DIA_LABELS, DIA_COLORS, DIA_VALUES, type DiaValue, type BudgetItem,
} from "@/data/budgetData";
import {
  FASE_LABELS, FASE_VALUES, makeEmptyEntry, makeEmptyPersona,
  type MontajeEntry, type MontajeFase, type MontajePersona,
} from "@/data/montajeData";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DAY_TABS: DiaValue[] = ["dia-1", "dia-2", "ambos"];

function SyncIndicator({ saving, lastSaved, error }: { saving: boolean; lastSaved: Date | null; error: string | null }) {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-500">
        <CloudOff className="w-3.5 h-3.5" /> {error}
      </span>
    );
  }
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Cloud className="w-3.5 h-3.5 text-emerald-500" />
      {lastSaved ? `Sincronizado ${lastSaved.toLocaleTimeString()}` : "Sincronizado"}
    </span>
  );
}

function DiaBadge({ dia }: { dia: DiaValue }) {
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
      style={{
        color: DIA_COLORS[dia],
        backgroundColor: `${DIA_COLORS[dia]}1a`,
        borderColor: `${DIA_COLORS[dia]}33`,
      }}
    >
      {DIA_LABELS[dia]}
    </span>
  );
}

function itemLabel(it: BudgetItem): string {
  return it.item || it.descripcion || `#${it.id}`;
}

function BudgetItemPicker({
  items, selectedIds, onChange,
}: {
  items: BudgetItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? items.filter(it =>
          `${it.item} ${it.descripcion} ${it.evento} ${it.area} ${it.proveedor}`
            .toLowerCase()
            .includes(q))
      : items;
    return list.slice(0, 60);
  }, [items, query]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id));
    else onChange([...selectedIds, id]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> Vincular ítems del Budget
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar ítem, área o proveedor…"
            className="flex-1 bg-transparent text-sm outline-none"
            autoFocus
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">Sin resultados</div>
          ) : (
            filtered.map(it => {
              const checked = selectedIds.includes(it.id);
              return (
                <button
                  key={it.id}
                  onClick={() => toggle(it.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-muted/60 transition-colors",
                    checked && "bg-primary/5"
                  )}
                >
                  <span className={cn(
                    "mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                    checked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                  )}>
                    {checked && <span className="text-[10px] leading-none">✓</span>}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium truncate">{itemLabel(it)}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">
                      {[it.evento, it.area].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EntryDialog({
  open, onOpenChange, initial, items, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: MontajeEntry;
  items: BudgetItem[];
  onSave: (entry: MontajeEntry) => void;
}) {
  const [draft, setDraft] = useState<MontajeEntry>(initial);

  // Reset draft whenever a different entry is opened.
  useEffect(() => { if (open) setDraft(initial); }, [open, initial]);

  const set = (patch: Partial<MontajeEntry>) => setDraft(d => ({ ...d, ...patch }));

  const setPersona = (id: string, patch: Partial<MontajePersona>) =>
    setDraft(d => ({ ...d, personas: d.personas.map(p => p.id === id ? { ...p, ...patch } : p) }));
  const addPersona = () => setDraft(d => ({ ...d, personas: [...d.personas, makeEmptyPersona()] }));
  const removePersona = (id: string) =>
    setDraft(d => ({ ...d, personas: d.personas.filter(p => p.id !== id) }));

  const itemsById = useMemo(() => new Map(items.map(it => [it.id, it])), [items]);

  const handleSave = () => {
    if (!draft.empresa.trim()) return;
    onSave({ ...draft, empresa: draft.empresa.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Ingreso de proveedor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Empresa / proveedor">
            <Input
              value={draft.empresa}
              onChange={e => set({ empresa: e.target.value })}
              placeholder="Ej. Andián, Decoración, AV…"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Día">
              <Select value={draft.dia} onValueChange={v => set({ dia: v as DiaValue })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIA_VALUES.map(d => <SelectItem key={d} value={d}>{DIA_LABELS[d]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fase">
              <Select value={draft.fase} onValueChange={v => set({ fase: v as MontajeFase })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FASE_VALUES.map(f => <SelectItem key={f} value={f}>{FASE_LABELS[f]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora de ingreso">
              <Input type="time" value={draft.horaIngreso} onChange={e => set({ horaIngreso: e.target.value })} />
            </Field>
            <Field label="Hora de salida">
              <Input type="time" value={draft.horaSalida} onChange={e => set({ horaSalida: e.target.value })} />
            </Field>
          </div>

          <Field label="Lineamientos / notas">
            <Textarea
              rows={3}
              value={draft.lineamientos}
              onChange={e => set({ lineamientos: e.target.value })}
              placeholder="Requisitos de acceso, vehículos, restricciones…"
            />
          </Field>

          {/* Personas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Personas</label>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addPersona}>
                <Plus className="w-3.5 h-3.5" /> Agregar persona
              </Button>
            </div>
            {draft.personas.length === 0 ? (
              <p className="text-xs text-muted-foreground/70 italic">Sin personas registradas.</p>
            ) : (
              <div className="space-y-2">
                {draft.personas.map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <Input
                      value={p.nombre}
                      onChange={e => setPersona(p.id, { nombre: e.target.value })}
                      placeholder="Nombre"
                      className="h-8 text-[13px]"
                    />
                    <Input
                      value={p.rol}
                      onChange={e => setPersona(p.id, { rol: e.target.value })}
                      placeholder="Rol"
                      className="h-8 text-[13px] w-28"
                    />
                    <Input
                      value={p.identificacion}
                      onChange={e => setPersona(p.id, { identificacion: e.target.value })}
                      placeholder="ID (opcional)"
                      className="h-8 text-[13px] w-28"
                    />
                    <button
                      onClick={() => removePersona(p.id)}
                      className="text-muted-foreground/50 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked budget items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Ítems del Budget</label>
              <BudgetItemPicker
                items={items}
                selectedIds={draft.itemIds}
                onChange={ids => set({ itemIds: ids })}
              />
            </div>
            {draft.itemIds.length === 0 ? (
              <p className="text-xs text-muted-foreground/70 italic">Ningún ítem vinculado.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {draft.itemIds.map(id => {
                  const it = itemsById.get(id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-muted border border-border">
                      <span className="max-w-[180px] truncate">{it ? itemLabel(it) : `#${id} (eliminado)`}</span>
                      <button
                        onClick={() => set({ itemIds: draft.itemIds.filter(x => x !== id) })}
                        className="text-muted-foreground/50 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!draft.empresa.trim()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function EntryCard({
  entry, items, canEdit, onEdit, onDelete,
}: {
  entry: MontajeEntry;
  items: Map<string, BudgetItem>;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-card-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{entry.empresa || "Sin nombre"}</span>
            <DiaBadge dia={entry.dia} />
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[13px] text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{entry.horaIngreso || "—"}</span>
            <span className="text-muted-foreground/50">→</span>
            <span>{entry.horaSalida || "—"}</span>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {entry.lineamientos && (
        <p className="text-[13px] text-muted-foreground mt-3 whitespace-pre-wrap border-l-2 border-border pl-2.5">
          {entry.lineamientos}
        </p>
      )}

      {entry.personas.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
            <Users className="w-3.5 h-3.5" /> Personas ({entry.personas.length})
          </div>
          <div className="space-y-1">
            {entry.personas.map(p => (
              <div key={p.id} className="text-[13px] flex items-center gap-2">
                <span className="font-medium">{p.nombre || "—"}</span>
                {p.rol && <span className="text-muted-foreground">· {p.rol}</span>}
                {p.identificacion && <span className="text-muted-foreground/70 font-mono text-[11px]">· {p.identificacion}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {entry.itemIds.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
            <Link2 className="w-3.5 h-3.5" /> Ítems vinculados ({entry.itemIds.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {entry.itemIds.map(id => {
              const it = items.get(id);
              return (
                <span key={id} className="text-[11px] px-2 py-1 rounded-md bg-muted border border-border max-w-[200px] truncate">
                  {it ? itemLabel(it) : `#${id} (eliminado)`}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

const FASE_META: Record<MontajeFase, { icon: typeof Truck; color: string }> = {
  montaje: { icon: Truck, color: "text-blue-600 bg-blue-500/10" },
  desmontaje: { icon: PackageOpen, color: "text-amber-600 bg-amber-500/10" },
};

export default function MontajePage() {
  const { permissions } = useAuth();
  const canEdit = permissions.canEdit;
  const { entries, addEntry, updateEntry, removeEntry, saving, lastSaved, error } = useMontajeApi();
  const { items } = useBudgetApi(INITIAL_BUDGET_ITEMS, recalcItem);

  const [activeDay, setActiveDay] = useState<DiaValue>("dia-1");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MontajeEntry | null>(null);

  const itemsById = useMemo(() => new Map(items.map(it => [it.id, it])), [items]);

  const dayEntries = useMemo(
    () => entries.filter(e => e.dia === activeDay),
    [entries, activeDay]
  );

  const openCreate = (fase: MontajeFase) => {
    setEditing(makeEmptyEntry(activeDay, fase));
    setDialogOpen(true);
  };
  const openEdit = (entry: MontajeEntry) => {
    setEditing(entry);
    setDialogOpen(true);
  };
  const handleSave = (entry: MontajeEntry) => {
    if (entries.some(e => e.id === entry.id)) updateEntry(entry.id, entry);
    else addEntry(entry);
  };

  const countByDay = (d: DiaValue) => entries.filter(e => e.dia === d).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" /> Montaje / Desmontaje
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Coordina los ingresos y salidas de proveedores: quién entra, a qué hora, qué traen/instalan y bajo qué
            lineamientos. Montaje de Día 1 (17) y Día 2 (18).
          </p>
        </div>
        <SyncIndicator saving={saving} lastSaved={lastSaved} error={error} />
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-border bg-muted/40 px-3 py-2">
          <Lock className="w-3.5 h-3.5" /> Modo solo lectura — no tienes permisos para editar montaje.
        </div>
      )}

      {/* Day tabs */}
      <div className="flex items-center gap-1.5 border-b border-border">
        {DAY_TABS.map(d => {
          const isActive = d === activeDay;
          return (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="w-3.5 h-3.5" style={isActive ? { color: DIA_COLORS[d] } : undefined} />
              {DIA_LABELS[d]}
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full",
                isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {countByDay(d)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fase sections */}
      {FASE_VALUES.map(fase => {
        const faseEntries = dayEntries.filter(e => e.fase === fase);
        const meta = FASE_META[fase];
        const Icon = meta.icon;
        return (
          <section key={fase} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", meta.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-semibold">{FASE_LABELS[fase]}</h2>
                <span className="text-xs text-muted-foreground">{faseEntries.length} ingreso(s)</span>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openCreate(fase)}>
                  <Plus className="w-3.5 h-3.5" /> Agregar ingreso
                </Button>
              )}
            </div>

            {faseEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                Sin ingresos de {FASE_LABELS[fase].toLowerCase()} para {DIA_LABELS[activeDay]}.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {faseEntries.map(entry => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    items={itemsById}
                    canEdit={canEdit}
                    onEdit={() => openEdit(entry)}
                    onDelete={() => removeEntry(entry.id)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {editing && (
        <EntryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initial={editing}
          items={items}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
