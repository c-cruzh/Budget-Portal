import { useEffect, useMemo, useState } from "react";
import type { BudgetItem, SubEvent } from "@/data/budgetData";
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
import { AlertTriangle } from "lucide-react";

interface SplitByDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: BudgetItem | null;
  subEvents: SubEvent[];
  onApprove: (newItems: BudgetItem[]) => void;
}

interface DraftRow {
  subEventId: string;
  item: string;
  qty: number | string;
  qtyDias: number | string;
  precioUnitario: number | string;
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

function pickDefaultSubEventIds(subEvents: SubEvent[], original: BudgetItem): [string, string] {
  const has = (id: string) => subEvents.some(s => s.id === id);
  const first = has("dia-1") ? "dia-1" : (subEvents[0]?.id || original.subEventId || "");
  const second = has("dia-2") ? "dia-2" : (subEvents[1]?.id || first);
  return [first, second];
}

function buildItemFromDraft(original: BudgetItem, draft: DraftRow): BudgetItem {
  const id = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `split-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const clone: BudgetItem = {
    ...original,
    id,
    subEventId: draft.subEventId,
    item: draft.item,
    qty: Number(draft.qty) || 0,
    qtyDias: Number(draft.qtyDias) || 1,
    precioUnitario: Number(draft.precioUnitario) || 0,
  };
  return recalcItem(clone);
}

export function SplitByDayDialog({ open, onOpenChange, original, subEvents, onApprove }: SplitByDayDialogProps) {
  const [drafts, setDrafts] = useState<[DraftRow, DraftRow] | null>(null);

  useEffect(() => {
    if (open && original) {
      const [a, b] = pickDefaultSubEventIds(subEvents, original);
      setDrafts([
        { ...buildDraft(original, a) },
        { ...buildDraft(original, b) },
      ]);
    }
  }, [open, original, subEvents]);

  const previewItems = useMemo(() => {
    if (!original || !drafts) return null;
    return [
      buildItemFromDraft(original, drafts[0]),
      buildItemFromDraft(original, drafts[1]),
    ] as const;
  }, [original, drafts]);

  const newSum = previewItems ? previewItems[0].total + previewItems[1].total : 0;
  const originalTotal = original?.total ?? 0;
  const mismatch = Math.abs(newSum - originalTotal) > 0.01;

  const updateDraft = (idx: 0 | 1, patch: Partial<DraftRow>) => {
    setDrafts(prev => {
      if (!prev) return prev;
      const next: [DraftRow, DraftRow] = [{ ...prev[0] }, { ...prev[1] }];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const handleApprove = () => {
    if (!previewItems) return;
    onApprove([previewItems[0], previewItems[1]]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Split item por día — verificá antes de aprobar</DialogTitle>
          <DialogDescription>
            Dividir este item en 2 filas, una por día. Editá los valores antes de aprobar.
          </DialogDescription>
        </DialogHeader>

        {original && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1">
            <div className="font-semibold text-foreground">{original.item}</div>
            <div className="flex flex-wrap gap-3 text-muted-foreground">
              <span>Sub-evento actual: <span className="text-foreground">{subEvents.find(s => s.id === original.subEventId)?.name || original.subEventId || "Sin asignar"}</span></span>
              <span>Qty: <span className="text-foreground">{original.qty}</span></span>
              <span>Qty Días: <span className="text-foreground">{original.qtyDias}</span></span>
              <span>Precio Unit.: <span className="text-foreground font-mono">{formatUSD(original.precioUnitario)}</span></span>
              <span>Total: <span className="text-foreground font-mono">{formatUSD(original.total)}</span></span>
            </div>
          </div>
        )}

        {previewItems && drafts && (
          <div className="space-y-3">
            {([0, 1] as const).map((idx) => {
              const d = drafts[idx];
              const p = previewItems[idx];
              return (
                <div key={idx} className="rounded-md border border-card-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Fila {idx + 1}</span>
                    <span className="text-xs font-mono font-semibold text-primary">{formatUSD(p.total)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-3">
                      <label className="text-[10px] uppercase text-muted-foreground">Sub-evento</label>
                      <Select value={d.subEventId} onValueChange={(v) => updateDraft(idx, { subEventId: v })}>
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
                        onChange={(e) => updateDraft(idx, { item: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="text-[10px] uppercase text-muted-foreground">Qty</label>
                      <Input
                        type="number"
                        value={d.qty}
                        onChange={(e) => updateDraft(idx, { qty: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] uppercase text-muted-foreground">Qty Días</label>
                      <Input
                        type="number"
                        value={d.qtyDias}
                        onChange={(e) => updateDraft(idx, { qtyDias: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] uppercase text-muted-foreground">Precio Unit.</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={d.precioUnitario}
                        onChange={(e) => updateDraft(idx, { precioUnitario: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Suma nueva: <span className="font-mono font-semibold text-foreground">{formatUSD(newSum)}</span>
                {" "}vs Original: <span className="font-mono font-semibold text-foreground">{formatUSD(originalTotal)}</span>
              </span>
              {mismatch && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30 bg-amber-500/10">
                  <AlertTriangle className="w-3 h-3" />
                  Los totales no coinciden
                </Badge>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApprove} disabled={!previewItems}>Aprobar y reemplazar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SplitByDayDialog;
