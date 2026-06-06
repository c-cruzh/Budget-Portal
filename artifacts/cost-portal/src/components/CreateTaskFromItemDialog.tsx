import { useEffect, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTasksBoardApi } from "@/hooks/useTasksBoardApi";
import { STATUS_LABEL, STATUS_ORDER, type TaskPriority, type TaskStatus, type LinkedBudgetItem } from "@/data/tasksBoardData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedItem: LinkedBudgetItem | null;
  /** When provided with 2+ items, the dialog creates one task per item (bulk mode). */
  linkedItems?: LinkedBudgetItem[];
  defaultNotes?: string;
}

export function CreateTaskFromItemDialog({ open, onOpenChange, linkedItem, linkedItems, defaultNotes }: Props) {
  const { addTask, loading } = useTasksBoardApi();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("med");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [createdOK, setCreatedOK] = useState(false);

  const bulk = (linkedItems?.length ?? 0) >= 1;
  const bulkSig = (linkedItems ?? []).map(i => i.id).join(",");

  useEffect(() => {
    if (open && (linkedItem || bulk)) {
      setTitle(bulk ? "" : (linkedItem?.label || ""));
      setNotes(defaultNotes || "");
      setPriority("med");
      setStatus("todo");
      setAssignee("");
      setDueDate("");
      setCreatedOK(false);
    }
  }, [open, linkedItem, defaultNotes, bulk, bulkSig]);

  const handleCreate = () => {
    if (bulk) {
      for (const it of linkedItems!) {
        addTask({ title: it.label || "(sin nombre)", notes, priority, status, assignee, dueDate, linkedBudgetItem: it });
      }
      setCreatedOK(true);
      setTimeout(() => onOpenChange(false), 600);
      return;
    }
    if (!linkedItem || !title.trim()) return;
    addTask({ title: title.trim(), notes, priority, status, assignee, dueDate, linkedBudgetItem: linkedItem });
    setCreatedOK(true);
    setTimeout(() => onOpenChange(false), 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" /> {bulk ? "Crear tareas desde Budget" : "Crear tarea desde Budget"}
          </DialogTitle>
        </DialogHeader>

        {bulk ? (
          <div className="rounded-md border border-card-border bg-muted/40 p-2.5 text-xs">
            <div className="font-medium text-foreground">{linkedItems!.length} item{linkedItems!.length === 1 ? "" : "s"} seleccionado{linkedItems!.length === 1 ? "" : "s"}</div>
            <div className="text-muted-foreground text-[11px]">Se creará una tarea por item (el título de cada tarea será el nombre del item).</div>
          </div>
        ) : linkedItem && (
          <div className="rounded-md border border-card-border bg-muted/40 p-2.5 text-xs space-y-0.5">
            <div className="font-medium text-foreground">{linkedItem.label}</div>
            <div className="text-muted-foreground text-[11px]">
              {[linkedItem.evento, linkedItem.area, linkedItem.centroCosto].filter(Boolean).join(" · ") || "—"}
            </div>
            <div className="text-[10px] text-muted-foreground/70 font-mono">#{linkedItem.id}</div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-6 text-sm text-muted-foreground inline-flex items-center gap-2 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando tablero…
          </div>
        ) : (
          <div className="space-y-3">
            {!bulk && (
              <Field label="Título">
                <Input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
              </Field>
            )}
            <Field label="Notas / descripción de la tarea">
              <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej. Pedir cotización a 3 proveedores antes del viernes." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prioridad">
                <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="med">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Estado">
                <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Asignado a">
                <Input value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Nombre" />
              </Field>
              <Field label="Vence">
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading || (!bulk && !title.trim()) || createdOK}>
            {createdOK ? "✓ Creada" : bulk ? `Crear ${linkedItems!.length} tarea${linkedItems!.length === 1 ? "" : "s"}` : "Crear tarea"}
          </Button>
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
