import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, Download, Plus, ChevronRight,
  Tag, Trash2, AlertTriangle
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
import { EditableCell } from "@/components/EditableCell";
import { SummaryCards } from "@/components/SummaryCards";

function CotizacionBadge({ value }: { value: string }) {
  if (!value) return <span className="text-muted-foreground/40 text-xs">--</span>;
  const v = value.trim().toUpperCase();
  if (v === "PENDING") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 border border-orange-500/20 whitespace-nowrap">PENDING</span>;
  if (v === "VOLUNTARIO") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 border border-violet-500/20 whitespace-nowrap">VOLUNTARIO</span>;
  if (v === "PROVEE ESEN") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 border border-teal-500/20 whitespace-nowrap">PROVEE ESEN</span>;
  if (v === "NA") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-500 border border-gray-500/20 whitespace-nowrap">N/A</span>;
  if (/^A\d+$/.test(v)) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap font-mono">{v}</span>;
  if (v.startsWith("HTTP")) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 whitespace-nowrap truncate max-w-[100px] block">Link</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap truncate max-w-[110px] block" title={value}>{value.length > 18 ? value.slice(0, 18) + "..." : value}</span>;
}

function ToggleCell({ value, onToggle, labelOn, labelOff }: { value: boolean | string; onToggle: () => void; labelOn?: string; labelOff?: string }) {
  const isOn = value === true || value === "SI";
  return (
    <button
      onClick={onToggle}
      className={cn(
        "text-[10px] px-2 py-0.5 rounded border font-medium transition-colors whitespace-nowrap",
        isOn
          ? "bg-primary/10 text-primary border-primary/20"
          : "bg-muted/50 text-muted-foreground/50 border-border/50 hover:border-border"
      )}
    >
      {isOn ? (labelOn || "SI") : (labelOff || "NO")}
    </button>
  );
}

function recalcItem(item: BudgetItem): BudgetItem {
  const qty = Number(item.qty) || 0;
  const dias = Number(item.qtyDias) || 1;
  const precio = Number(item.precioUnitario) || 0;
  const byDias = item.porDias === "SI";
  item.subtotal = byDias ? qty * dias * precio : qty * precio;
  const feeApplies = item.agencyFee && item.aplicaFee !== "SI";
  item.fee = feeApplies ? item.subtotal * 0.20 : 0;
  item.subtotalConFee = item.subtotal + item.fee;
  item.iva = item.subtotalConFee * 0.13;
  item.total = item.subtotalConFee + item.iva;
  return item;
}

function getInitialItems(): BudgetItem[] {
  try {
    const v5Raw = localStorage.getItem("budget-items-v5");
    if (v5Raw) return JSON.parse(v5Raw);
    const prev = localStorage.getItem("budget-items-v4") || localStorage.getItem("budget-items-v3") || localStorage.getItem("budget-items-v2");
    if (prev) {
      const items = (JSON.parse(prev) as any[]).map((item: any) => recalcItem({
        ...item,
        proveedor: item.proveedor || "",
        validarCosto: item.validarCosto ?? false,
      }));
      localStorage.setItem("budget-items-v5", JSON.stringify(items));
      return items;
    }
  } catch {}
  return INITIAL_BUDGET_ITEMS.map(recalcItem);
}

const MIGRATED_ITEMS = getInitialItems();

export default function BudgetPage() {
  const [items, setItems] = useLocalStorage<BudgetItem[]>("budget-items-v5", MIGRATED_ITEMS);
  const [search, setSearch] = useState("");
  const [filterEvento, setFilterEvento] = useState("ALL");
  const [filterArea, setFilterArea] = useState("ALL");
  const [filterCentro, setFilterCentro] = useState("ALL");
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set(["MAIN EVENT_INGRESO ESEN Y PARQUEO", "MAIN EVENT_AUDITORIO/MAIN STAGE", "BEFORE/AFTER MAIN EVENT_HOSPITALITY"]));
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BudgetItem>>({
    evento: "MAIN EVENT", area: "", centroCosto: "", item: "", descripcion: "", notas: "",
    inKind: false, agencyFee: false, qty: 1, uom: "", porDias: "NO", qtyDias: 1,
    precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0,
    cotizacion: "", documento: "", proveedor: "", validarCosto: false,
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
        i.notas.toLowerCase().includes(q) ||
        i.cotizacion.toLowerCase().includes(q) ||
        (i.proveedor || "").toLowerCase().includes(q)
      );
    }
    return out;
  }, [items, filterEvento, filterArea, filterCentro, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, { evento: string; area: string; items: BudgetItem[] }>();
    filtered.forEach(item => {
      const key = `${item.evento}_${item.area}`;
      if (!map.has(key)) map.set(key, { evento: item.evento, area: item.area, items: [] });
      map.get(key)!.items.push(item);
    });
    return map;
  }, [filtered]);

  const recalc = recalcItem;

  const updateItem = useCallback((id: string, field: keyof BudgetItem, value: BudgetItem[keyof BudgetItem]) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      return recalc(updated);
    }));
  }, [setItems]);

  const toggleField = useCallback((id: string, field: "inKind" | "agencyFee") => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: !item[field] };
      return recalc(updated);
    }));
  }, [setItems]);

  const toggleStringField = useCallback((id: string, field: "porDias" | "aplicaFee") => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: item[field] === "SI" ? "NO" : "SI" };
      return recalc(updated);
    }));
  }, [setItems]);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, [setItems]);

  const addItem = useCallback(() => {
    const id = `custom-${Date.now()}`;
    const base: BudgetItem = {
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
      precioUnitario: Number(newItem.precioUnitario) || 0,
      subtotal: 0, aplicaFee: newItem.aplicaFee || "NO",
      fee: 0, subtotalConFee: 0, iva: 0, total: 0,
      cotizacion: newItem.cotizacion || "",
      documento: newItem.documento || "",
      proveedor: newItem.proveedor || "",
    };
    setItems(prev => [...prev, recalc(base)]);
    setShowAddModal(false);
    setNewItem({ evento: "MAIN EVENT", area: "", centroCosto: "", item: "", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "", porDias: "NO", qtyDias: 1, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "", documento: "", proveedor: "" });
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
  const validarCount = useMemo(() => filtered.filter(i => i.validarCosto).length, [filtered]);

  const exportCSV = () => {
    const headers = [
      "EVENTO", "AREA/ZONA", "CENTRO DE COSTO", "ITEM", "DESCRIPCION", "NOTAS/OBSERVACIONES",
      "IN-KIND?", "AURORA 360?", "QTY", "UoM", "CONTRATACION POR DIAS?", "QTY DIAS",
      "PRECIO UNITARIO", "SUBTOTAL", "VIA PRODUCTORA (AURORA 360)?", "FEE INCL. EN COTIZACION?",
      "FEE 20%", "SUBTOTAL CON FEE", "IVA", "TOTAL", "COTIZACION", "DOCUMENTO DE DETALLE", "PROVEEDOR",
      "VALIDAR COSTO?"
    ];
    const rows = filtered.map(i => [
      i.evento, i.area, i.centroCosto, i.item, i.descripcion, i.notas,
      i.inKind ? "SI" : "NO", i.agencyFee ? "SI" : "NO", i.qty, i.uom,
      i.porDias, i.qtyDias, i.precioUnitario, i.subtotal, i.agencyFee ? "SI" : "NO",
      i.aplicaFee, i.fee, i.subtotalConFee, i.iva, i.total, i.cotizacion, i.documento,
      i.proveedor || "", i.validarCosto ? "SI" : "NO"
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "EmTech_El_Salvador_2026_Budget.csv"; a.click();
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
        validarCount={validarCount}
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items, notes, proveedor..." className="pl-9 bg-card border-card-border" />
        </div>
        <Select value={filterEvento} onValueChange={v => { setFilterEvento(v); setFilterArea("ALL"); setFilterCentro("ALL"); }}>
          <SelectTrigger className="w-[200px] bg-card border-card-border"><SelectValue placeholder="Event" /></SelectTrigger>
          <SelectContent>{eventos.map(e => <SelectItem key={e} value={e}>{e === "ALL" ? "All Events" : e}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterArea} onValueChange={v => { setFilterArea(v); setFilterCentro("ALL"); }}>
          <SelectTrigger className="w-[220px] bg-card border-card-border"><SelectValue placeholder="Area" /></SelectTrigger>
          <SelectContent>{areas.map(a => <SelectItem key={a} value={a}>{a === "ALL" ? "All Areas" : a}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterCentro} onValueChange={setFilterCentro}>
          <SelectTrigger className="w-[200px] bg-card border-card-border"><SelectValue placeholder="Cost Center" /></SelectTrigger>
          <SelectContent>{centros.map(c => <SelectItem key={c} value={c}>{c === "ALL" ? "All Centers" : c}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2"><Download className="w-4 h-4" />Export CSV</Button>
          <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-2"><Plus className="w-4 h-4" />Add Item</Button>
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-wider">
                <th className="px-2 py-2.5 w-6"></th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[180px]">Item</th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[130px]">Descripcion</th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[120px]">Notas</th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[90px]">Centro Costo</th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-14">In-Kind</th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-10">Qty</th>
                <th className="text-left px-1 py-2.5 font-semibold text-muted-foreground w-16">UoM</th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-16">Tipo</th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-10">Dias</th>
                <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-20">P. Unit.</th>
                <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-20">Subtotal</th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-20">Via Productora</th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-20">Fee en Cotiz.?</th>
                <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-16">Fee 20%</th>
                <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-16">IVA</th>
                <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-24">Total</th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[90px]">Cotizacion</th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[90px]">Proveedor</th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[80px]">Documento</th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-16">Validar</th>
                <th className="w-8 px-1 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from(grouped.entries()).map(([key, group]) => {
                const isExpanded = expandedAreas.has(key);
                const groupTotal = group.items.reduce((s, i) => s + i.total, 0);
                const hasInKind = group.items.some(i => i.inKind);

                return [
                  <tr
                    key={`header-${key}`}
                    className="bg-muted/30 border-t border-b border-border cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => toggleArea(key)}
                  >
                    <td className="px-2 py-2" colSpan={1}>
                      <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }} className="w-3.5 h-3.5 text-muted-foreground">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </motion.div>
                    </td>
                    <td className="px-2 py-2" colSpan={13}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-xs">{group.area}</span>
                        <Badge variant="secondary" className="text-[10px] font-normal py-0">{group.evento === "MAIN EVENT" ? "Main Event" : group.evento === "MAIN EVENT VIP DINNER" ? "VIP Dinner" : "Pre/Post"}</Badge>
                        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground py-0">{group.items.length} items</Badge>
                        {hasInKind && <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/20 font-normal py-0">In-Kind</Badge>}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right font-semibold" colSpan={9}>
                      {groupTotal > 0 ? <span className="text-primary text-xs">{formatUSD(groupTotal)}</span> : <span className="text-muted-foreground text-[10px]">In-Kind / $0</span>}
                    </td>
                  </tr>,

                  ...(isExpanded ? group.items.map(item => (
                    <tr
                      key={item.id}
                      className={cn(
                        "border-b border-border/50 transition-colors text-xs",
                        item.inKind ? "bg-amber-500/5" : "hover:bg-muted/20"
                      )}
                    >
                      <td className="px-2 py-1.5 align-top">
                        {item.inKind && (
                          <Tooltip><TooltipTrigger><Tag className="w-3 h-3 text-amber-500" /></TooltipTrigger><TooltipContent>In-Kind</TooltipContent></Tooltip>
                        )}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <EditableCell value={item.item} onSave={v => updateItem(item.id, "item", v)} className="font-medium text-foreground text-xs" />
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <EditableCell value={item.descripcion} onSave={v => updateItem(item.id, "descripcion", v)} className="text-muted-foreground text-xs" placeholder="descripcion..." />
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <EditableCell value={item.notas} onSave={v => updateItem(item.id, "notas", v)} className="text-muted-foreground/70 text-xs italic" placeholder="notas..." />
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <EditableCell value={item.centroCosto} onSave={v => updateItem(item.id, "centroCosto", v)} className="text-muted-foreground text-xs" />
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <ToggleCell value={item.inKind} onToggle={() => toggleField(item.id, "inKind")} labelOn="SI" labelOff="NO" />
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <EditableCell value={String(item.qty)} onSave={v => updateItem(item.id, "qty", v)} className="text-center font-mono text-xs" type="number" />
                      </td>
                      <td className="px-1 py-1.5 align-top">
                        <EditableCell value={item.uom} onSave={v => updateItem(item.id, "uom", v)} className="text-muted-foreground text-xs" />
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <button
                          onClick={() => toggleStringField(item.id, "porDias")}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border font-medium transition-colors whitespace-nowrap",
                            item.porDias === "SI"
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                          )}
                        >
                          {item.porDias === "SI" ? "Por Dia" : "One-Time"}
                        </button>
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        {item.porDias === "SI" ? (
                          <EditableCell value={String(item.qtyDias)} onSave={v => updateItem(item.id, "qtyDias", v)} className="text-center font-mono text-xs" type="number" />
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">--</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right align-top font-mono">
                        <EditableCell value={String(item.precioUnitario)} onSave={v => updateItem(item.id, "precioUnitario", parseFloat(v) || 0)} className="text-right font-mono text-xs" type="number" />
                      </td>
                      <td className="px-2 py-1.5 text-right align-top font-mono text-muted-foreground">
                        {item.subtotal > 0 ? formatUSD(item.subtotal) : "--"}
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <button
                          onClick={() => toggleField(item.id, "agencyFee")}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border font-medium transition-colors whitespace-nowrap",
                            item.agencyFee
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted/50 text-muted-foreground/40 border-border/50 hover:border-border"
                          )}
                        >
                          {item.agencyFee ? "Aurora 360" : "--"}
                        </button>
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        {item.agencyFee ? (
                          <button
                            onClick={() => toggleStringField(item.id, "aplicaFee")}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded border font-medium transition-colors whitespace-nowrap",
                              item.aplicaFee === "SI"
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                            )}
                          >
                            {item.aplicaFee === "SI" ? "Incluido" : "No incl."}
                          </button>
                        ) : (
                          <span className="text-muted-foreground/30 text-[10px]">--</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right align-top font-mono text-muted-foreground">
                        {item.fee > 0 ? formatUSD(item.fee) : "--"}
                      </td>
                      <td className="px-2 py-1.5 text-right align-top font-mono text-muted-foreground">
                        {item.iva > 0 ? formatUSD(item.iva) : "--"}
                      </td>
                      <td className="px-2 py-1.5 text-right align-top">
                        {item.inKind ? (
                          <span className="text-amber-600 font-semibold text-xs">In-Kind</span>
                        ) : item.total > 0 ? (
                          <span className="font-semibold text-foreground font-mono text-xs">{formatUSD(item.total)}</span>
                        ) : (
                          <span className="text-muted-foreground">$0.00</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <div className="flex flex-col gap-0.5">
                          <CotizacionBadge value={item.cotizacion} />
                          <EditableCell value={item.cotizacion} onSave={v => updateItem(item.id, "cotizacion", v)} className="text-muted-foreground text-[10px]" placeholder="cotizacion..." />
                        </div>
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <EditableCell value={item.proveedor || ""} onSave={v => updateItem(item.id, "proveedor", v)} className="text-muted-foreground text-xs" placeholder="proveedor..." />
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <EditableCell value={item.documento} onSave={v => updateItem(item.id, "documento", v)} className="text-muted-foreground text-[10px]" placeholder="doc..." />
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => toggleField(item.id, "validarCosto")}
                              className={cn(
                                "inline-flex items-center justify-center w-6 h-6 rounded transition-colors",
                                item.validarCosto
                                  ? "bg-red-500/15 text-red-500 border border-red-500/30"
                                  : "bg-muted/30 text-muted-foreground/25 border border-transparent hover:border-border/50"
                              )}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] text-xs">
                            {item.validarCosto
                              ? "Marcado: validar costo / cotizar con otros proveedores"
                              : "Click para marcar como costo a validar"}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-1 py-1.5 align-top">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => deleteItem(item.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete item</TooltipContent>
                        </Tooltip>
                      </td>
                    </tr>
                  )) : [])
                ];
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30">
                <td colSpan={17} className="px-3 py-3 font-semibold text-muted-foreground text-xs">
                  TOTAL -- {filtered.length} items
                </td>
                <td className="px-2 py-3 text-right font-bold text-sm text-primary font-mono">
                  {formatUSD(totalBudget)}
                </td>
                <td colSpan={5}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Budget Item</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 mt-2 text-sm">
            <div className="col-span-3">
              <label className="text-xs font-medium mb-1 block">Item Name *</label>
              <Input value={newItem.item} onChange={e => setNewItem(p => ({ ...p, item: e.target.value }))} placeholder="e.g. CATERING COFFEE BREAK" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Evento</label>
              <Select value={newItem.evento} onValueChange={v => setNewItem(p => ({ ...p, evento: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAIN EVENT">MAIN EVENT</SelectItem>
                  <SelectItem value="MAIN EVENT VIP DINNER">MAIN EVENT VIP DINNER</SelectItem>
                  <SelectItem value="BEFORE/AFTER MAIN EVENT">BEFORE/AFTER MAIN EVENT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Area / Zona</label>
              <Input value={newItem.area} onChange={e => setNewItem(p => ({ ...p, area: e.target.value }))} placeholder="e.g. AUDITORIO/MAIN STAGE" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Centro de Costo</label>
              <Input value={newItem.centroCosto} onChange={e => setNewItem(p => ({ ...p, centroCosto: e.target.value }))} placeholder="e.g. STAFF" />
            </div>
            <div className="col-span-3">
              <label className="text-xs font-medium mb-1 block">Descripcion</label>
              <Input value={newItem.descripcion} onChange={e => setNewItem(p => ({ ...p, descripcion: e.target.value }))} placeholder="Description..." />
            </div>
            <div className="col-span-3">
              <label className="text-xs font-medium mb-1 block">Notas / Observaciones</label>
              <Input value={newItem.notas} onChange={e => setNewItem(p => ({ ...p, notas: e.target.value }))} placeholder="Notes..." />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Qty</label>
              <Input type="number" value={newItem.qty} onChange={e => setNewItem(p => ({ ...p, qty: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">UoM</label>
              <Input value={newItem.uom} onChange={e => setNewItem(p => ({ ...p, uom: e.target.value }))} placeholder="PERSONA, UNIDAD..." />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Precio Unitario</label>
              <Input type="number" step="0.01" value={newItem.precioUnitario} onChange={e => setNewItem(p => ({ ...p, precioUnitario: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Tipo de Contratacion</label>
              <Select value={newItem.porDias} onValueChange={v => setNewItem(p => ({ ...p, porDias: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SI">Por Dia</SelectItem>
                  <SelectItem value="NO">One-Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Qty Dias</label>
              <Input type="number" value={newItem.qtyDias} onChange={e => setNewItem(p => ({ ...p, qtyDias: parseFloat(e.target.value) || 1 }))} />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={newItem.agencyFee || false} onChange={e => setNewItem(p => ({ ...p, agencyFee: e.target.checked }))} className="rounded border-border" />
                Via Aurora 360?
              </label>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Fee incluido en cotizacion?</label>
              <Select value={newItem.aplicaFee} onValueChange={v => setNewItem(p => ({ ...p, aplicaFee: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SI">SI (ya incluido)</SelectItem>
                  <SelectItem value="NO">NO (se agrega 20%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Proveedor</label>
              <Input value={newItem.proveedor} onChange={e => setNewItem(p => ({ ...p, proveedor: e.target.value }))} placeholder="e.g. AURORA 360" />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={newItem.inKind || false} onChange={e => setNewItem(p => ({ ...p, inKind: e.target.checked }))} className="rounded border-border" />
                In-Kind?
              </label>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Cotizacion</label>
              <Input value={newItem.cotizacion} onChange={e => setNewItem(p => ({ ...p, cotizacion: e.target.value }))} placeholder="A2, PENDING..." />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Documento</label>
              <Input value={newItem.documento} onChange={e => setNewItem(p => ({ ...p, documento: e.target.value }))} placeholder="Document ref..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={addItem} disabled={!newItem.item}>Add Item</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
