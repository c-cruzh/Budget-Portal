import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Plus, Trash2, ChevronLeft, ChevronRight, Cloud, CloudOff, Loader2, ListChecks, Flag, Calendar as CalendarIcon, User, Link2 } from "lucide-react";
import { useTasksBoardApi } from "@/hooks/useTasksBoardApi";
import { STATUS_ORDER, STATUS_LABEL, PRIORITY_LABEL, type TaskStatus, type TaskPriority, type BoardTask } from "@/data/tasksBoardData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  const { state, loading, saving, lastSaved, error, meta, addTask, updateTask, deleteTask } = useTasksBoardApi();
  const [editing, setEditing] = useState<BoardTask | null>(null);
  const [draft, setDraft] = useState<Partial<BoardTask>>({});
  const [showNew, setShowNew] = useState(false);

  const byStatus = useMemo(() => {
    const m: Record<TaskStatus, BoardTask[]> = { todo: [], doing: [], done: [] };
    for (const t of state.tasks) m[t.status].push(t);
    for (const s of STATUS_ORDER) {
      m[s].sort((a, b) => {
        const pOrder = { high: 0, med: 1, low: 2 } as const;
        if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
        return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
      });
    }
    return m;
  }, [state.tasks]);

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
        <div className="flex items-center gap-3">
          <SyncIndicator loading={loading} saving={saving} lastSaved={lastSaved} error={error} />
          <Button size="sm" onClick={() => { setDraft({ priority: "med", status: "todo" }); setShowNew(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Nueva tarea
          </Button>
        </div>
      </motion.div>

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
      {task.linkedBudgetItem && (
        <Link href="/budget" className="mt-1.5 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 max-w-full" title={`Budget item #${task.linkedBudgetItem.id}: ${task.linkedBudgetItem.label}`}>
          <Link2 className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{task.linkedBudgetItem.label}</span>
        </Link>
      )}
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
        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={() => onMove(-1)} disabled={!canPrev} className={cn("p-0.5 rounded", canPrev ? "hover:bg-muted text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed")} title="Mover izquierda">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onMove(1)} disabled={!canNext} className={cn("p-0.5 rounded", canNext ? "hover:bg-muted text-muted-foreground hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed")} title="Mover derecha">
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
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function SyncIndicator({ loading, saving, lastSaved, error }: { loading: boolean; saving: boolean; lastSaved: Date | null; error: string | null }) {
  if (loading) return <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Cargando…</span>;
  if (error) return <span className="text-[11px] text-red-600 inline-flex items-center gap-1"><CloudOff className="w-3 h-3" /> {error}</span>;
  if (saving) return <span className="text-[11px] text-blue-600 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Guardando…</span>;
  if (lastSaved) return <span className="text-[11px] text-emerald-600 inline-flex items-center gap-1"><Cloud className="w-3 h-3" /> Guardado {lastSaved.toLocaleTimeString()}</span>;
  return <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Cloud className="w-3 h-3" /> Listo</span>;
}
