import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, Download, Plus, ChevronDown, ChevronRight,
  ExternalLink, CheckCircle2, AlertCircle, Clock, Tag,
  DollarSign, TrendingUp, BarChart3, Edit3, Save, X, Trash2
} from "lucide-react";
import { INITIAL_BUDGET_ITEMS, type BudgetItem } from "@/data/budgetData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatUSD } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { EditableCell } from "@/components/EditableCell";
import { SummaryCards } from "@/components/SummaryCards";
import { LinkCell } from "@/components/LinkCell";

export default function BudgetPage() {
  const [items, setItems] = useLocalStorage<BudgetItem[]>("budget-items-v2", INITIAL_BUDGET_ITEMS);
  const [search, setSearch] = useState("");
  const [filterEvento, setFilterEvento] = useState("ALL");
  const [filterArea, setFilterArea] = useState("ALL");
  const [filterCentro, setFilterCentro] = useState("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set(["MAIN EVENT_INGRESO ESEN Y PARQUEO", "MAIN EVENT_AUDITORIO/MAIN STAGE", "BEFORE/AFTER MAIN EVENT_HOSPITALITY"]));
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BudgetItem>>({
    evento: "MAIN EVENT",
    area: "",
    centroCosto: "",
    item: "",
    descripcion: "",
    notas: "",
    inKind: false,
    agencyFee: false,
    qty: 1,
    uom: "",
    porDias: "NO",
    qtyDias: 1,
    precioUnitario: 0,
    subtotal: 0,
    aplicaFee: "NO",
    fee: 0,
    subtotalConFee: 0,
    iva: 0,
    total: 0,
    cotizacion: "",
    documento: "",
  });

  const eventos = useMemo(() => ["ALL", ...Array.from(new Set(items.map(i => i.evento).filter(Boolean)))], [items]);
  const areas = useMemo(() => {
    const src = filterEvento === "ALL" ? items : items.filter(i => i.evento === filterEvento);
    return ["ALL", ...Array.from(new Set(src.map(i => i.area).filter(Boolean)))];
  }, [items, filterEvento]);
  const centros = useMemo(() => {
    let src = items;
    if (filterEvento !== "ALL") src = src.filter(i => i.evento === filterEvento);
    if (filterArea !== "ALL") src = src.filter(i => i.area === filterArea);
    return ["ALL", ...Array.from(new Set(src.map(i => i.centroCosto).filter(Boolean)))];
  }, [items, filterEvento, filterArea]);

  const filtered = useMemo(() => {
    let out = items;
    if (filterEvento !== "ALL") out = out.filter(i => i.evento === filterEvento);
    if (filterArea !== "ALL") out = out.filter(i => i.area === filterArea);
    if (filterCentro !== "ALL") out = out.filter(i => i.centroCosto === filterCentro);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(i =>
        i.item.toLowerCase().includes(q) ||
        i.descripcion.toLowerCase().includes(q) ||
        i.area.toLowerCase().includes(q) ||
        i.centroCosto.toLowerCase().includes(q) ||
        i.notas.toLowerCase().includes(q)
      );
    }
    return out;
  }, [items, filterEvento, filterArea, filterCentro, search]);

  // Group by evento + area
  const grouped = useMemo(() => {
    const map = new Map<string, { evento: string; area: string; items: BudgetItem[] }>();
    filtered.forEach(item => {
      const key = `${item.evento}_${item.area}`;
      if (!map.has(key)) map.set(key, { evento: item.evento, area: item.area, items: [] });
      map.get(key)!.items.push(item);
    });
    return map;
  }, [filtered]);

  const updateItem = useCallback((id: string, field: keyof BudgetItem, value: BudgetItem[keyof BudgetItem]) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      // Recalculate derived fields
      const qty = Number(updated.qty) || 0;
      const dias = Number(updated.qtyDias) || 1;
      const precio = Number(updated.precioUnitario) || 0;
      const byDias = updated.porDias === "SI";
      updated.subtotal = byDias ? qty * dias * precio : qty * precio;
      const feeRate = 0.20;
      updated.fee = updated.aplicaFee === "SI" ? updated.subtotal * feeRate : 0;
      updated.subtotalConFee = updated.subtotal + updated.fee;
      updated.iva = updated.subtotalConFee * 0.13;
      updated.total = updated.subtotalConFee + updated.iva;
      return updated;
    }));
  }, [setItems]);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, [setItems]);

  const addItem = useCallback(() => {
    const id = `custom-${Date.now()}`;
    const qty = Number(newItem.qty) || 0;
    const dias = Number(newItem.qtyDias) || 1;
    const precio = Number(newItem.precioUnitario) || 0;
    const byDias = newItem.porDias === "SI";
    const subtotal = byDias ? qty * dias * precio : qty * precio;
    const fee = newItem.aplicaFee === "SI" ? subtotal * 0.20 : 0;
    const subtotalConFee = subtotal + fee;
    const iva = subtotalConFee * 0.13;
    const total = subtotalConFee + iva;

    const item: BudgetItem = {
      id,
      evento: newItem.evento || "MAIN EVENT",
      area: newItem.area || "",
      centroCosto: newItem.centroCosto || "",
      item: newItem.item || "",
      descripcion: newItem.descripcion || "",
      notas: newItem.notas || "",
      inKind: newItem.inKind || false,
      agencyFee: newItem.agencyFee || false,
      qty: newItem.qty || 0,
      uom: newItem.uom || "",
      porDias: newItem.porDias || "NO",
      qtyDias: newItem.qtyDias || 1,
      precioUnitario: precio,
      subtotal,
      aplicaFee: newItem.aplicaFee || "NO",
      fee,
      subtotalConFee,
      iva,
      total,
      cotizacion: newItem.cotizacion || "",
      documento: newItem.documento || "",
    };
    setItems(prev => [...prev, item]);
    setShowAddModal(false);
    setNewItem({ evento: "MAIN EVENT", area: "", centroCosto: "", item: "", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "", porDias: "NO", qtyDias: 1, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "", documento: "" });
  }, [newItem, setItems]);

  const toggleArea = (key: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalBudget = useMemo(() => filtered.reduce((s, i) => s + i.total, 0), [filtered]);
  const totalPaid = useMemo(() => filtered.filter(i => !i.inKind && i.total > 0).reduce((s, i) => s + i.total, 0), [filtered]);
  const totalInKind = useMemo(() => filtered.filter(i => i.inKind).length, [filtered]);
  const pendingCount = useMemo(() => filtered.filter(i => i.cotizacion === "PENDING").length, [filtered]);

  const exportCSV = () => {
    const headers = ["EVENTO", "AREA", "CENTRO DE COSTO", "ITEM", "DESCRIPCION", "QTY", "UOM", "PRECIO UNITARIO", "SUBTOTAL", "FEE", "SUBTOTAL CON FEE", "IVA", "TOTAL", "IN-KIND", "COTIZACION"];
    const rows = filtered.map(i => [
      i.evento, i.area, i.centroCosto, i.item, i.descripcion,
      i.qty, i.uom, i.precioUnitario, i.subtotal, i.fee,
      i.subtotalConFee, i.iva, i.total, i.inKind ? "SI" : "NO", i.cotizacion
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "EmTech_El_Salvador_2026_Budget.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SummaryCards
        totalBudget={totalBudget}
        totalPaid={totalPaid}
        totalInKind={totalInKind}
        pendingCount={pendingCount}
        itemCount={filtered.length}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="pl-9 bg-card border-card-border"
          />
        </div>

        <Select value={filterEvento} onValueChange={v => { setFilterEvento(v); setFilterArea("ALL"); setFilterCentro("ALL"); }}>
          <SelectTrigger className="w-[200px] bg-card border-card-border">
            <SelectValue placeholder="Event" />
          </SelectTrigger>
          <SelectContent>
            {eventos.map(e => (
              <SelectItem key={e} value={e}>{e === "ALL" ? "All Events" : e}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterArea} onValueChange={v => { setFilterArea(v); setFilterCentro("ALL"); }}>
          <SelectTrigger className="w-[220px] bg-card border-card-border">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            {areas.map(a => (
              <SelectItem key={a} value={a}>{a === "ALL" ? "All Areas" : a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCentro} onValueChange={setFilterCentro}>
          <SelectTrigger className="w-[200px] bg-card border-card-border">
            <SelectValue placeholder="Cost Center" />
          </SelectTrigger>
          <SelectContent>
            {centros.map(c => (
              <SelectItem key={c} value={c}>{c === "ALL" ? "All Centers" : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-card-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-8"></th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[220px]">Item</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[140px]">Cost Center</th>
                <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-16">Qty</th>
                <th className="text-left px-3 py-3 font-semibold text-muted-foreground w-20">UoM</th>
                <th className="text-right px-3 py-3 font-semibold text-muted-foreground w-24">Unit Price</th>
                <th className="text-right px-3 py-3 font-semibold text-muted-foreground w-24">Subtotal</th>
                <th className="text-right px-3 py-3 font-semibold text-muted-foreground w-24">Fee</th>
                <th className="text-right px-3 py-3 font-semibold text-muted-foreground w-20">IVA</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground w-28">Total</th>
                <th className="text-left px-3 py-3 font-semibold text-muted-foreground min-w-[120px]">Status</th>
                <th className="text-left px-3 py-3 font-semibold text-muted-foreground min-w-[140px]">Quote / Doc</th>
                <th className="w-20 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from(grouped.entries()).map(([key, group]) => {
                const isExpanded = expandedAreas.has(key);
                const groupTotal = group.items.reduce((s, i) => s + i.total, 0);
                const hasInKind = group.items.some(i => i.inKind);

                return [
                  // Group header row
                  <tr
                    key={`header-${key}`}
                    className="bg-muted/30 border-t border-b border-border cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => toggleArea(key)}
                  >
                    <td className="px-4 py-2.5" colSpan={1}>
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.15 }}
                        className="w-4 h-4 text-muted-foreground"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.div>
                    </td>
                    <td className="px-4 py-2.5" colSpan={8}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{group.area}</span>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {group.evento === "MAIN EVENT" ? "Main Event" : "Pre/Post Event"}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                          {group.items.length} items
                        </Badge>
                        {hasInKind && (
                          <Badge className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/20 font-normal">
                            In-Kind
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold" colSpan={4}>
                      {groupTotal > 0 ? (
                        <span className="text-primary">{formatUSD(groupTotal)}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">In-Kind / $0</span>
                      )}
                    </td>
                  </tr>,

                  // Item rows
                  ...(isExpanded ? group.items.map(item => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "border-b border-border/50 transition-colors",
                        item.inKind ? "bg-amber-500/5" : "hover:bg-muted/20",
                        editingId === item.id && "bg-primary/5 ring-1 ring-inset ring-primary/20"
                      )}
                    >
                      <td className="px-4 py-2.5">
                        {item.inKind && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Tag className="w-3.5 h-3.5 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>In-Kind contribution</TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <EditableCell
                            value={item.item}
                            onSave={v => updateItem(item.id, "item", v)}
                            className="font-medium text-foreground"
                          />
                          {item.descripcion && (
                            <span className="text-xs text-muted-foreground leading-tight line-clamp-1">{item.descripcion}</span>
                          )}
                          {item.notas && (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-muted-foreground/60 italic line-clamp-1 cursor-help">{item.notas.slice(0, 60)}…</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">{item.notas}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <EditableCell
                          value={item.centroCosto}
                          onSave={v => updateItem(item.id, "centroCosto", v)}
                          className="text-muted-foreground text-xs"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <EditableCell
                          value={String(item.qty)}
                          onSave={v => updateItem(item.id, "qty", v)}
                          className="text-center font-mono text-sm"
                          type="number"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">
                        <EditableCell
                          value={item.uom}
                          onSave={v => updateItem(item.id, "uom", v)}
                          className="text-muted-foreground text-xs"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">
                        {item.inKind ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <EditableCell
                            value={String(item.precioUnitario)}
                            onSave={v => updateItem(item.id, "precioUnitario", parseFloat(v) || 0)}
                            className="text-right font-mono text-sm"
                            type="number"
                            prefix="$"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm text-muted-foreground">
                        {item.inKind ? "—" : formatUSD(item.subtotal)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm text-muted-foreground">
                        {item.fee > 0 ? formatUSD(item.fee) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm text-muted-foreground">
                        {item.iva > 0 ? formatUSD(item.iva) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {item.inKind ? (
                          <span className="text-amber-600 font-semibold text-sm">In-Kind</span>
                        ) : item.total > 0 ? (
                          <span className="font-semibold text-foreground font-mono">{formatUSD(item.total)}</span>
                        ) : (
                          <span className="text-muted-foreground">$0.00</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge value={item.cotizacion} />
                      </td>
                      <td className="px-3 py-2.5">
                        <LinkCell value={item.cotizacion} documento={item.documento} itemId={item.id} onSave={(field, val) => updateItem(item.id, field as keyof BudgetItem, val)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteItem(item.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete item</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </motion.tr>
                  )) : [])
                ];
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30">
                <td colSpan={9} className="px-4 py-3 font-semibold text-muted-foreground">
                  TOTAL — {filtered.length} items shown
                </td>
                <td className="px-4 py-3 text-right font-bold text-lg text-primary font-mono">
                  {formatUSD(totalBudget)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Budget Item</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1 block">Item Name *</label>
              <Input value={newItem.item} onChange={e => setNewItem(p => ({ ...p, item: e.target.value }))} placeholder="e.g. CATERING COFFEE BREAK" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Event</label>
              <Select value={newItem.evento} onValueChange={v => setNewItem(p => ({ ...p, evento: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAIN EVENT">MAIN EVENT</SelectItem>
                  <SelectItem value="BEFORE/AFTER MAIN EVENT">BEFORE/AFTER MAIN EVENT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Area</label>
              <Input value={newItem.area} onChange={e => setNewItem(p => ({ ...p, area: e.target.value }))} placeholder="e.g. CATERING / BREAKS" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Cost Center</label>
              <Input value={newItem.centroCosto} onChange={e => setNewItem(p => ({ ...p, centroCosto: e.target.value }))} placeholder="e.g. CATERING" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Unit of Measure</label>
              <Input value={newItem.uom} onChange={e => setNewItem(p => ({ ...p, uom: e.target.value }))} placeholder="e.g. PERSONA" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Quantity</label>
              <Input type="number" value={newItem.qty as number} onChange={e => setNewItem(p => ({ ...p, qty: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Unit Price (USD)</label>
              <Input type="number" value={newItem.precioUnitario} onChange={e => setNewItem(p => ({ ...p, precioUnitario: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Apply Agency Fee?</label>
              <Select value={newItem.aplicaFee} onValueChange={v => setNewItem(p => ({ ...p, aplicaFee: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO">No</SelectItem>
                  <SelectItem value="SI">Yes (20%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Bill by Days?</label>
              <Select value={newItem.porDias} onValueChange={v => setNewItem(p => ({ ...p, porDias: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO">No</SelectItem>
                  <SelectItem value="SI">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newItem.porDias === "SI" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Number of Days</label>
                <Input type="number" value={newItem.qtyDias as number} onChange={e => setNewItem(p => ({ ...p, qtyDias: parseInt(e.target.value) || 1 }))} />
              </div>
            )}
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input value={newItem.descripcion} onChange={e => setNewItem(p => ({ ...p, descripcion: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1 block">Quote / Link</label>
              <Input value={newItem.cotizacion} onChange={e => setNewItem(p => ({ ...p, cotizacion: e.target.value }))} placeholder="URL or quote reference" />
            </div>
            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newItem.inKind} onChange={e => setNewItem(p => ({ ...p, inKind: e.target.checked }))} className="rounded" />
                <span className="text-sm">In-Kind contribution</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={addItem} disabled={!newItem.item}>Add Item</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
