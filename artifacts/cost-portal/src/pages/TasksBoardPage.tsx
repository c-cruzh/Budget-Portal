import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Plus, Trash2, ChevronLeft, ChevronRight, Cloud, CloudOff, Loader2, ListChecks, Flag, Calendar as CalendarIcon, User, Link2, CalendarRange, AlertTriangle, Sparkles } from "lucide-react";
import { useTasksBoardApi } from "@/hooks/useTasksBoardApi";
import { useAuth } from "@/hooks/useAuth";
import { STATUS_ORDER, STATUS_LABEL, PRIORITY_LABEL, FLAGGED_RRV_SOURCE_TYPE, type TaskStatus, type TaskPriority, type BoardTask } from "@/data/tasksBoardData";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MULTIDAY_SOURCE_KEY_PREFIX = "multiday-provider-validation:";

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  med: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  high: "bg-red-500/10 text-red-600 border-red-500/20",
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "border-slate-300 dark:border-slate-700",
  doing: "border-blue-400 dark:border-blue-600",
  done: "border-emerald-400 dark:border-emerald-600 opacity-70",
};

export default function TasksBoardPage() {
  const { state, setState, loading, saving, lastSaved, error, meta, addTask, updateTask, deleteTask } = useTasksBoardApi();
  const { user } = useAuth();
  const isAdmin = (user?.organization || "") === "C2 LABS";
  const [editing, setEditing] = useState<BoardTask | null>(null);
  const [draft, setDraft] = useState<Partial<BoardTask>>({});
  const [showNew, setShowNew] = useState(false);
  const [onlyFlaggedRRV, setOnlyFlaggedRRV] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [filterMultiday, setFilterMultiday] = useState(false);
  const [seedingMultiday, setSeedingMultiday] = useState(false);

  const flaggedCount = useMemo(
    () => state.tasks.filter(t => t.sourceType === FLAGGED_RRV_SOURCE_TYPE).length,
    [state.tasks]
  );
  const flaggedUnmatched = useMemo(
    () => state.tasks.filter(t => t.sourceType === FLAGGED_RRV_SOURCE_TYPE && t.unmatched).length,
    [state.tasks]
  );
  const multidayCount = useMemo(
    () => state.tasks.filter(t => t.sourceKey?.startsWith(MULTIDAY_SOURCE_KEY_PREFIX)).length,
    [state.tasks]
  );

  const visibleTasks = useMemo(() => {
    let arr = state.tasks;
    if (onlyFlaggedRRV) arr = arr.filter(t => t.sourceType === FLAGGED_RRV_SOURCE_TYPE);
    if (filterMultiday) arr = arr.filter(t => t.sourceKey?.startsWith(MULTIDAY_SOURCE_KEY_PREFIX));
    return arr;
  }, [state.tasks, onlyFlaggedRRV, filterMultiday]);

  const handleSeedFlagged = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/tasks-board/seed-flagged-items", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast({
        title: "Tareas Resize/Rescope/Validate",
        description: `${data.created} creadas · ${data.skipped} ya existían · ${data.matched} vinculadas al Budget · ${data.unmatched} sin vincular (de ${data.total} ítems)`,
      });
      try {
        const r2 = await fetch("/api/tasks-board", { credentials: "include" });
        if (r2.ok) {
          const d2 = await r2.json();
          if (d2.state && Array.isArray(d2.state.tasks)) {
            setState({ tasks: d2.state.tasks });
          }
        }
      } catch {}
      setOnlyFlaggedRRV(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo generar las tareas", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const runSeedMultiday = async () => {
    if (seedingMultiday) return;
    setSeedingMultiday(true);
    try {
      const res = await fetch("/api/tasks-board/seed-multiday-validation", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const s = data.summary || {};
      toast({
        title: "Multi-day validation tasks generadas",
        description: `${s.created ?? 0} creadas · ${s.alreadyExisted ?? 0} ya existían · ${s.unmatched ?? 0} sin match (de ${s.total ?? 0}).`,
      });
      const reload = await fetch("/api/tasks-board", { credentials: "include" });
      if (reload.ok) {
        const r = await reload.json();
        if (r?.state && Array.isArray(r.state.tasks)) {
          setState({ tasks: r.state.tasks });
        }
      }
      setFilterMultiday(true);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "No se pudo generar las tareas", variant: "destructive" });
    } finally {
      setSeedingMultiday(false);
    }
  };

  const byStatus = useMemo(() => {
    const m: Record<TaskStatus, BoardTask[]> = { todo: [], doing: [], done: [] };
    for (const t of visibleTasks) m[t.status].push(t);
    for (const s of STATUS_ORDER) {
      m[s].sort((a, b) => {
        const pOrder = { high: 0, med: 1, low: 2 } as const;
        if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
        return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
      });
    }
    return m;
  }, [visibleTasks]);

  const counts = { total: state.tasks.length, todo: byStatus.todo.length, doing: byStatus.doing.length, done: byStatus.done.length };

  const openEdit = (t: BoardTask) => { setEditing(t); setDraft({ ...t }); };
  const closeEdit = () => { setEditing(null); setDraft({}); };
  const saveEdit = () => {
    if (!editing) return;
    updateTask(editing.id, draft);
    closeEdit();
  };

  const move = (t: BoardTask, dir: -1 | 1) => {
    const idx = STATUS_ORDER.indexOf(t.status);
    const next = STATUS_ORDER[idx + dir];
    if (!next) return;
    updateTask(t.id, { status: next });
  };

  const onCreate = () => {
    const t = addTask({ title: draft.title || "Nueva tarea", notes: draft.notes, priority: (draft.priority as TaskPriority) || "med", assignee: draft.assignee, dueDate: draft.dueDate, status: (draft.status as TaskStatus) || "todo" });
    setShowNew(false);
    setDraft({});
    setEditing(t);
    setDraft({ ...t });
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Mis Tareas del Portal</h1>
            <p className="text-xs text-muted-foreground">
              {counts.total} tareas · {counts.todo} pendientes · {counts.doing} en curso · {counts.done} hechas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SyncIndicator loading={loading} saving={saving} lastSaved={lastSaved} error={error} />
          <Button size="sm" variant="outline" onClick={handleSeedFlagged} disabled={seeding || loading} className="gap-2" title="Crea una tarea por cada uno de los 27 ítems flagged que necesitan Resize / Rescope / Validate. Idempotente.">
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generar tareas R/R/V (27)
          </Button>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={runSeedMultiday} disabled={seedingMultiday} className="gap-2" title="Crea una tarea por cada ítem con costo multi-día del proveedor (idempotente)">
              {seedingMultiday ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generar multi-day
            </Button>
          )}
          <Button size="sm" onClick={() => { setDraft({ priority: "med", status: "todo" }); setShowNew(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Nueva tarea
          </Button>
        </div>
      </motion.div>

      <div className="flex flex-wrap items-center gap-2">
        {flaggedCount > 0 && (
          <>
            <button
              onClick={() => setOnlyFlaggedRRV(v => !v)}
              className={cn(
                "text-[11px] px-2 py-1 rounded border inline-flex items-center gap-1.5 transition-colors",
                onlyFlaggedRRV
                  ? "bg-amber-500/15 text-amber-700 border-amber-500/40"
                  : "bg-amber-500/5 text-amber-700 border-amber-500/20 hover:bg-amber-500/10"
              )}
              title="Filtrar para ver solo los ítems flagged que requieren Resize / Rescope / Validate"
            >
              <Flag className="w-3 h-3" />
              Resize/Rescope/Validate
              <span className="font-mono">{flaggedCount}</span>
              {flaggedUnmatched > 0 && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-red-600">
                  <AlertTriangle className="w-2.5 h-2.5" /> {flaggedUnmatched} sin vincular
                </span>
              )}
            </button>
            {onlyFlaggedRRV && (
              <button onClick={() => setOnlyFlaggedRRV(false)} className="text-[11px] text-muted-foreground hover:text-foreground underline">
                Ver todas
              </button>
            )}
          </>
        )}
        <button
          onClick={() => setFilterMultiday(v => !v)}
          className={cn(
            "text-[11px] px-2 py-1 rounded-full border inline-flex items-center gap-1.5 transition-colors",
            filterMultiday
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40"
              : "bg-muted/40 text-muted-foreground border-border hover:border-amber-500/40"
          )}
          title="Tareas generadas para ítems con costo multi-día del proveedor"
        >
          <CalendarRange className="w-3 h-3" />
          Multi-day provider cost — pendiente validar
          <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-[10px]">{multidayCount}</span>
        </button>
        {filterMultiday && (
          <button onClick={() => setFilterMultiday(false)} className="text-[11px] text-muted-foreground underline">
            Quitar filtro
          </button>
        )}
      </div>

      {meta?.lastEditedBy && (
        <div className="text-[11px] text-muted-foreground">
          Última edición: {meta.lastEditedBy} {meta.lastEditedByOrg && `(${meta.lastEditedByOrg})`} · {new Date(meta.lastEditedAt).toLocaleString()}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUS_ORDER.map(s => (
          <Column
            key={s}
            status={s}
            tasks={byStatus[s]}
            onEdit={openEdit}
            onDelete={deleteTask}
            onMove={move}
            onAdd={() => { setDraft({ priority: "med", status: s }); setShowNew(true); }}
          />
        ))}
      </div>

      <Dialog open={showNew} onOpenChange={o => { if (!o) { setShowNew(false); setDraft({}); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Título">
              <Input autoFocus value={draft.title || ""} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Ej. Confirmar bloqueo de hotel" />
            </Field>
            <Field label="Notas">
              <Textarea rows={3} value={draft.notes || ""} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prioridad">
                <Select value={(draft.priority as string) || "med"} onValueChange={v => setDraft(d => ({ ...d, priority: v as TaskPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="med">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Estado">
                <Select value={(draft.status as string) || "todo"} onValueChange={v => setDraft(d => ({ ...d, status: v as TaskStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Asignado a">
                <Input value={draft.assignee || ""} onChange={e => setDraft(d => ({ ...d, assignee: e.target.value }))} placeholder="Nombre" />
              </Field>
              <Field label="Vence">
                <Input type="date" value={draft.dueDate || ""} onChange={e => setDraft(d => ({ ...d, dueDate: e.target.value }))} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNew(false); setDraft({}); }}>Cancelar</Button>
            <Button onClick={onCreate} disabled={!draft.title?.trim()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={o => { if (!o) closeEdit(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar tarea</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="Título">
                <Input value={draft.title || ""} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
              </Field>
              <Field label="Notas">
                <Textarea rows={4} value={draft.notes || ""} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prioridad">
                  <Select value={(draft.priority as string) || "med"} onValueChange={v => setDraft(d => ({ ...d, priority: v as TaskPriority }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="med">Media</SelectItem>
                      <SelectItem value="low">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Estado">
                  <Select value={(draft.status as string) || "todo"} onValueChange={v => setDraft(d => ({ ...d, status: v as TaskStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Asignado a">
                  <Input value={draft.assignee || ""} onChange={e => setDraft(d => ({ ...d, assignee: e.target.value }))} />
                </Field>
                <Field label="Vence">
                  <Input type="date" value={draft.dueDate || ""} onChange={e => setDraft(d => ({ ...d, dueDate: e.target.value }))} />
                </Field>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => { if (editing) { deleteTask(editing.id); closeEdit(); } }}>
              <Trash2 className="w-4 h-4 mr-1" /> Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeEdit}>Cancelar</Button>
              <Button onClick={saveEdit}>Guardar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Column({ status, tasks, onEdit, onDelete, onMove, onAdd }: {
  status: TaskStatus;
  tasks: BoardTask[];
  onEdit: (t: BoardTask) => void;
  onDelete: (id: string) => void;
  onMove: (t: BoardTask, dir: -1 | 1) => void;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card/50 p-3 min-h-[200px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{STATUS_LABEL[status]}</h3>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{tasks.length}</span>
        </div>
        <button onClick={onAdd} className="text-muted-foreground hover:text-foreground" title="Agregar tarea aquí">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {tasks.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8 border border-dashed border-card-border rounded-lg">
            Sin tareas
          </div>
        )}
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} onEdit={() => onEdit(t)} onDelete={() => onDelete(t.id)} onMove={dir => onMove(t, dir)} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onMove }: { task: BoardTask; onEdit: () => void; onDelete: () => void; onMove: (dir: -1 | 1) => void; }) {
  const canPrev = task.status !== "todo";
  const canNext = task.status !== "done";
  const overdue = task.dueDate && task.status !== "done" && task.dueDate < new Date().toISOString().slice(0, 10);
  return (
    <div className={cn("rounded-lg border bg-card p-2.5 shadow-sm hover:shadow transition", STATUS_STYLE[task.status])}>
      <div className="flex items-start gap-2">
        <button onClick={onEdit} className="flex-1 text-left">
          <div className="text-sm font-medium leading-tight">{task.title || <span className="text-muted-foreground italic">(sin título)</span>}</div>
          {task.notes && <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">{task.notes}</div>}
        </button>
        <button onClick={onDelete} className="text-muted-foreground/60 hover:text-red-600" title="Eliminar">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
        {task.sourceType === FLAGGED_RRV_SOURCE_TYPE && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20" title="Ítem flagged: requiere Resize / Rescope / Validate">
            <Flag className="w-2.5 h-2.5" /> R/R/V
          </span>
        )}
        {task.sourceKey?.startsWith(MULTIDAY_SOURCE_KEY_PREFIX) && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30" title="Generada por: Multi-day provider cost — consult & validate">
            <CalendarRange className="w-2.5 h-2.5" />
            Multi-day validar
          </span>
        )}
        {task.unmatched && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 border border-red-500/20" title="No se pudo vincular a un ítem del Budget. Vincular manualmente.">
            <AlertTriangle className="w-2.5 h-2.5" /> sin vincular
          </span>
        )}
        {task.linkedBudgetItem && (
          <Link href="/budget" className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 max-w-full" title={`Budget item #${task.linkedBudgetItem.id}: ${task.linkedBudgetItem.label}`}>
            <Link2 className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate max-w-[200px]">{task.linkedBudgetItem.label}</span>
          </Link>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1", PRIORITY_STYLE[task.priority])}>
          <Flag className="w-2.5 h-2.5" /> {PRIORITY_LABEL[task.priority]}
        </span>
        {task.assignee && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground inline-flex items-center gap-1">
            <User className="w-2.5 h-2.5" /> {task.assignee}
          </span>
        )}
        {task.dueDate && (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1", overdue ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground")}>
            <CalendarIcon className="w-2.5 h-2.5" /> {task.dueDate}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button disabled={!canPrev} onClick={() => onMove(-1)} className="p-0.5 rounded hover:bg-muted disabled:opacity-30" title="Mover atrás">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button disabled={!canNext} onClick={() => onMove(1)} className="p-0.5 rounded hover:bg-muted disabled:opacity-30" title="Mover adelante">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SyncIndicator({ loading, saving, lastSaved, error }: { loading: boolean; saving: boolean; lastSaved: Date | null; error: string | null }) {
  if (loading) {
    return (
      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" /> Cargando…
      </span>
    );
  }
  if (error) {
    return (
      <span className="text-[11px] text-red-500 inline-flex items-center gap-1" title={error}>
        <CloudOff className="w-3 h-3" /> Sin conexión
      </span>
    );
  }
  if (saving) {
    return (
      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" /> Guardando…
      </span>
    );
  }
  return (
    <span className="text-[11px] text-emerald-600 inline-flex items-center gap-1">
      <Cloud className="w-3 h-3" /> {lastSaved ? `Guardado · ${lastSaved.toLocaleTimeString()}` : "Sincronizado"}
    </span>
  );
}
