import { useEffect, useMemo, useState } from "react";
import { type BudgetItem, type SubEvent, type DiaValue } from "@/data/budgetData";
import { recalcItem } from "@/lib/budgetCalc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatUSD } from "@/lib/utils";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

interface BulkSplitByDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originals: BudgetItem[];
  subEvents: SubEvent[];
  onApprove: (replacements: { originalId: string; newItems: BudgetItem[] }[]) => void;
}

interface DraftRow {
  subEventId: string;
  item: string;
  qty: number | string;
  qtyDias: number | string;
  precioUnitario: number | string;
}

type ItemDrafts = [DraftRow, DraftRow];

function pickDefaultSubEventIds(subEvents: SubEvent[], original: BudgetItem): [string, string] {
  const has = (id: string) => subEvents.some(s => s.id === id);
  const first = has("dia-1") ? "dia-1" : (subEvents[0]?.id || original.subEventId || "");
  const second = has("dia-2") ? "dia-2" : (subEvents[1]?.id || first);
  return [first, second];
}

function buildDraft(original: BudgetItem, subEventId: string): DraftRow {
  return {
    subEventId,
    item: original.item,
    qty: original.qty,
    qtyDias: 1,
    precioUnitario: original.precioUnitario,
  };
}

function buildItemFromDraft(original: BudgetItem, draft: DraftRow): BudgetItem {
  const id = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `split-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dia: DiaValue | undefined =
    draft.subEventId === "dia-1" ? "dia-1" : draft.subEventId === "dia-2" ? "dia-2" : undefined;
  const clone: BudgetItem = {
    ...original,
    id,
    subEventId: draft.subEventId,
    dia,
    item: draft.item,
    qty: Number(draft.qty) || 0,
    qtyDias: Number(draft.qtyDias) || 1,
    precioUnitario: Number(draft.precioUnitario) || 0,
  };
  return recalcItem(clone);
}

export function BulkSplitByDayDialog({ open, onOpenChange, originals, subEvents, onApprove }: BulkSplitByDayDialogProps) {
  const [draftsById, setDraftsById] = useState<Record<string, ItemDrafts>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      const next: Record<string, ItemDrafts> = {};
      for (const o of originals) {
        const [a, b] = pickDefaultSubEventIds(subEvents, o);
        next[o.id] = [buildDraft(o, a), buildDraft(o, b)];
      }
      setDraftsById(next);
      setExpanded(new Set(originals.slice(0, 1).map(o => o.id)));
    }
  }, [open, originals, subEvents]);

  const previewsById = useMemo(() => {
    const out: Record<string, [BudgetItem, BudgetItem]> = {};
    for (const o of originals) {
      const d = draftsById[o.id];
      if (!d) continue;
      out[o.id] = [buildItemFromDraft(o, d[0]), buildItemFromDraft(o, d[1])];
    }
    return out;
  }, [originals, draftsById]);

  const updateDraft = (originalId: string, idx: 0 | 1, patch: Partial<DraftRow>) => {
    setDraftsById(prev => {
      const cur = prev[originalId];
      if (!cur) return prev;
      const next: ItemDrafts = [{ ...cur[0] }, { ...cur[1] }];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, [originalId]: next };
    });
  };

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const totalsOriginal = originals.reduce((s, o) => s + (o.total || 0), 0);
  const totalsNew = Object.values(previewsById).reduce((s, [a, b]) => s + a.total + b.total, 0);
  const totalsMismatch = Math.abs(totalsNew - totalsOriginal) > 0.01;

  const handleApprove = () => {
    const replacements: { originalId: string; newItems: BudgetItem[] }[] = [];
    for (const o of originals) {
      const p = previewsById[o.id];
      if (!p) continue;
      replacements.push({ originalId: o.id, newItems: [p[0], p[1]] });
    }
    onApprove(replacements);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Split {originals.length} items por día — verificá antes de aprobar</DialogTitle>
          <DialogDescription>
            Cada item se dividirá en 2 filas, una por día. Editá los valores antes de aprobar. Todos se guardarán en una sola operación.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {originals.map((original) => {
            const drafts = draftsById[original.id];
            const previews = previewsById[original.id];
            if (!drafts || !previews) return null;
            const sum = previews[0].total + previews[1].total;
            const mismatch = Math.abs(sum - (original.total || 0)) > 0.01;
            const isOpen = expanded.has(original.id);

            return (
              <div key={original.id} className="rounded-md border border-card-border">
                <button
                  type="button"
                  onClick={() => toggleExpanded(original.id)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover-elevate"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span className="text-xs font-semibold text-foreground truncate">{original.item}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {original.area}{original.centroCosto ? ` · ${original.centroCosto}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    <span className="text-muted-foreground">
                      Orig: <span className="font-mono text-foreground">{formatUSD(original.total || 0)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Nuevo: <span className="font-mono font-semibold text-primary">{formatUSD(sum)}</span>
                    </span>
                    {mismatch && (
                      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30 bg-amber-500/10">
                        <AlertTriangle className="w-3 h-3" />
                        Δ
                      </Badge>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="p-3 pt-0 space-y-2 border-t border-card-border">
                    {([0, 1] as const).map((idx) => {
                      const d = drafts[idx];
                      const p = previews[idx];
                      return (
                        <div key={idx} className="rounded-md border border-card-border p-2 space-y-1.5 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Fila {idx + 1}</span>
                            <span className="text-xs font-mono font-semibold text-primary">{formatUSD(p.total)}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <div className="sm:col-span-3">
                              <label className="text-[10px] uppercase text-muted-foreground">Sub-evento</label>
                              <Select value={d.subEventId} onValueChange={(v) => updateDraft(original.id, idx, { subEventId: v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {subEvents.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="sm:col-span-4">
                              <label className="text-[10px] uppercase text-muted-foreground">Item</label>
                              <Input
                                value={d.item}
                                onChange={(e) => updateDraft(original.id, idx, { item: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="sm:col-span-1">
                              <label className="text-[10px] uppercase text-muted-foreground">Qty</label>
                              <Input
                                type="number"
                                value={d.qty}
                                onChange={(e) => updateDraft(original.id, idx, { qty: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[10px] uppercase text-muted-foreground">Qty Días</label>
                              <Input
                                type="number"
                                value={d.qtyDias}
                                onChange={(e) => updateDraft(original.id, idx, { qtyDias: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[10px] uppercase text-muted-foreground">Precio Unit.</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={d.precioUnitario}
                                onChange={(e) => updateDraft(original.id, idx, { precioUnitario: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            Suma nueva total: <span className="font-mono font-semibold text-foreground">{formatUSD(totalsNew)}</span>
            {" "}vs Original total: <span className="font-mono font-semibold text-foreground">{formatUSD(totalsOriginal)}</span>
          </span>
          {totalsMismatch && (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="w-3 h-3" />
              Los totales no coinciden
            </Badge>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApprove} disabled={originals.length === 0}>
            Aprobar y reemplazar {originals.length} item{originals.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkSplitByDayDialog;
