import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, Download, Plus, ChevronRight, Info,
  Tag, Trash2, AlertTriangle, ShieldAlert, MessageSquare, ExternalLink,
  Cloud, CloudOff, Loader2, Pencil, UserCircle, FileText, Flag, CheckCircle2, Star, Settings
} from "lucide-react";
import { INITIAL_BUDGET_ITEMS, DEFAULT_SUB_EVENT_ID, type BudgetItem, type QuoteOption, type SubEvent } from "@/data/budgetData";
import { useBudgetApi } from "@/hooks/useBudgetApi";
import { useSubEventsApi } from "@/hooks/useSubEventsApi";
import { useAuth } from "@/hooks/useAuth";
import { ComboInput } from "@/components/ComboInput";
import { SubEventsManagerDialog } from "@/components/SubEventsManagerDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PortalUser {
  id: number;
  name: string;
  email: string;
  organization: string;
}
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { EditableCell } from "@/components/EditableCell";
import { SummaryCards } from "@/components/SummaryCards";

const STATUS_COTIZACION_OPTIONS = [
  "",
  "Cotización Recibida - Sin Observaciones",
  "Cotización Recibida - Observaciones",
  "Cotización - No Aplica (In-Kind)",
  "Cotización - No Aplica (Voluntario)",
  "Cotización Pending",
  "Pendiente Cotizar",
  "Pendiente Cotizar Alternativa",
];

const STATUS_SHORT_LABELS: Record<string, string> = {
  "Cotización Recibida - Sin Observaciones": "Recibida OK",
  "Cotización Recibida - Observaciones": "Recibida c/ Obs.",
  "Cotización - No Aplica (In-Kind)": "N/A In-Kind",
  "Cotización - No Aplica (Voluntario)": "N/A Voluntario",
  "Cotización Pending": "Pending",
  "Pendiente Cotizar": "Pend. Cotizar",
  "Pendiente Cotizar Alternativa": "Pend. Alternativa",
};

const STATUS_COLORS: Record<string, string> = {
  "Cotización Recibida - Sin Observaciones": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Cotización Recibida - Observaciones": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "Cotización - No Aplica (In-Kind)": "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "Cotización - No Aplica (Voluntario)": "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "Cotización Pending": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Pendiente Cotizar": "bg-red-500/10 text-red-500 border-red-500/20",
  "Pendiente Cotizar Alternativa": "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const STATUS_NO_COTIZACION = new Set([
  "Cotización - No Aplica (In-Kind)",
  "Cotización - No Aplica (Voluntario)",
  "Cotización Pending",
  "Pendiente Cotizar",
]);

const STATUS_HAS_COTIZACION = new Set([
  "Cotización Recibida - Sin Observaciones",
  "Cotización Recibida - Observaciones",
  "Pendiente Cotizar Alternativa",
]);

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function ColHeader({ label, info, align = "left" }: { label: string; info: string; align?: "left" | "center" | "right" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-0.5 cursor-help", align === "right" && "justify-end", align === "center" && "justify-center")}>
          <span>{label}</span>
          <InfoIcon className="w-2.5 h-2.5 text-muted-foreground/40 flex-shrink-0" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-xs font-normal normal-case tracking-normal">
        {info}
      </TooltipContent>
    </Tooltip>
  );
}

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

function getApprovedQuote(item: BudgetItem) {
  if (!item.quotes || item.quotes.length === 0) return null;
  return item.quotes.find(q => q.id === item.approvedQuoteId) || item.quotes[0];
}

function recalcItem(item: BudgetItem): BudgetItem {
  const qty = Number(item.qty) || 0;
  const dias = Number(item.qtyDias) || 1;
  const approved = getApprovedQuote(item);
  if (approved) {
    item.precioUnitario = Number(approved.precioUnitario) || 0;
    item.proveedor = approved.label ?? "";
    item.cotizacion = (approved.notes && approved.notes.length > 0) ? approved.notes : (approved.label ?? "");
    item.cotizacionLink = approved.link ?? "";
  }
  const precio = Number(item.precioUnitario) || 0;
  const byDias = item.porDias === "SI";
  item.subtotal = byDias ? qty * dias * precio : qty * precio;
  const feeApplies = item.agencyFee && item.aplicaFee !== "SI";
  item.fee = feeApplies ? item.subtotal * 0.20 : 0;
  item.feeIncluido = (item.agencyFee && item.aplicaFee === "SI") ? item.subtotal * 0.20 : 0;
  item.subtotalConFee = item.subtotal + item.fee;
  item.iva = item.exentoIva ? 0 : item.subtotalConFee * 0.13;
  item.turismo = item.aplicaTurismo ? item.subtotalConFee * 0.05 : 0;
  item.total = item.subtotalConFee + item.iva + (item.turismo || 0);
  return item;
}

function getFeeProductora(item: BudgetItem): number {
  if (!item.agencyFee) return 0;
  return item.fee > 0 ? item.fee : (item.feeIncluido || 0);
}

const SEED_ITEMS = INITIAL_BUDGET_ITEMS.map(recalcItem);

export default function BudgetPage() {
  const { items, setItems, loading, error, meta, saveCommentOnly, patchItem, saveFull } = useBudgetApi(SEED_ITEMS, recalcItem);
  const { subEvents, setSubEvents } = useSubEventsApi();
  const { permissions, user } = useAuth();
  const canEdit = permissions.canEdit;
  const canComment = permissions.canComment;
  const canEditTaxonomy = (user?.organization || "") === "C2 LABS";
  const [search, setSearch] = useState("");
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [filterSubEvents, setFilterSubEvents] = useState<Set<string>>(new Set());
  const [showSubEventsManager, setShowSubEventsManager] = useState(false);

  const subEventMap = useMemo(() => {
    const m = new Map<string, SubEvent>();
    for (const s of subEvents) m.set(s.id, s);
    return m;
  }, [subEvents]);
  const subEventOrder = useCallback((id: string | undefined) => {
    if (!id) return 9999;
    const s = subEventMap.get(id);
    return s ? s.order : 9998;
  }, [subEventMap]);
  const subEventName = useCallback((id: string | undefined) => {
    if (!id) return "Sin asignar";
    return subEventMap.get(id)?.name || id;
  }, [subEventMap]);
  const subEventColor = useCallback((id: string | undefined) => {
    if (!id) return "#94a3b8";
    return subEventMap.get(id)?.color || "#94a3b8";
  }, [subEventMap]);

  const toggleSubEventFilter = (id: string) => {
    setFilterSubEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/users", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setPortalUsers(data.users || []);
        }
      } catch {}
    })();
  }, []);
  const [filterEvento, setFilterEvento] = useState("ALL");
  const [filterArea, setFilterArea] = useState("ALL");
  const [filterCentro, setFilterCentro] = useState("ALL");
  const [filterProveedor, setFilterProveedor] = useState("ALL");
  const [filterProductora, setFilterProductora] = useState("ALL");
  const [filterFeeEnCotiz, setFilterFeeEnCotiz] = useState("ALL");
  const [filterCotizacion, setFilterCotizacion] = useState("ALL");
  const [filterAsignado, setFilterAsignado] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterInKind, setFilterInKind] = useState("ALL");
  const [filterPrecio, setFilterPrecio] = useState("ALL");
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<Partial<BudgetItem>>({});
  const [newItem, setNewItem] = useState<Partial<BudgetItem>>({
    evento: "MAIN EVENT", subEventId: DEFAULT_SUB_EVENT_ID, area: "", centroCosto: "", item: "", descripcion: "", notas: "",
    inKind: false, agencyFee: false, qty: 1, uom: "", porDias: "NO", qtyDias: 1,
    precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0,
    cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false, soloPresupuestado: false, accionRequerida: false, statusCotizacion: "",
  });

  const eventos = useMemo(() => ["ALL", ...Array.from(new Set(items.map(i => i.evento).filter(v => v && v.trim())))], [items]);
  const areas = useMemo(() => {
    const src = filterEvento === "ALL" ? items : items.filter(i => i.evento === filterEvento);
    return ["ALL", ...Array.from(new Set(src.map(i => i.area).filter(v => v && v.trim())))];
  }, [items, filterEvento]);
  const centros = useMemo(() => {
    let src = items;
    if (filterEvento !== "ALL") src = src.filter(i => i.evento === filterEvento);
    if (filterArea !== "ALL") src = src.filter(i => i.area === filterArea);
    return ["ALL", ...Array.from(new Set(src.map(i => i.centroCosto).filter(v => v && v.trim())))];
  }, [items, filterEvento, filterArea]);

  const allAreas = useMemo(() => Array.from(new Set(items.map(i => i.area).filter(v => v && v.trim()))).sort(), [items]);
  const allCentros = useMemo(() => Array.from(new Set(items.map(i => i.centroCosto).filter(v => v && v.trim()))).sort(), [items]);

  const proveedores = useMemo(() => {
    const hasBlank = items.some(i => !(i.proveedor || "").trim());
    const set = new Set(items.map(i => (i.proveedor || "").trim()).filter(v => v.length > 0));
    const sorted = Array.from(set).sort();
    return hasBlank ? ["ALL", "(Sin proveedor)", ...sorted] : ["ALL", ...sorted];
  }, [items]);

  const cotizaciones = useMemo(() => {
    const hasBlank = items.some(i => !(i.cotizacion || "").trim());
    const set = new Set(items.map(i => (i.cotizacion || "").trim()).filter(v => v.length > 0));
    const sorted = Array.from(set).sort();
    return hasBlank ? ["ALL", "(Sin cotizacion)", ...sorted] : ["ALL", ...sorted];
  }, [items]);

  const assignedToOptions = useMemo(() => {
    const hasBlank = items.some(i => !(i.assignedTo || "").trim());
    const set = new Set(items.map(i => (i.assignedTo || "").trim()).filter(v => v.length > 0));
    const sorted = Array.from(set).sort();
    return hasBlank ? ["ALL", "(Sin asignar)", ...sorted] : ["ALL", ...sorted];
  }, [items]);

  const statusOptions = useMemo(() => {
    const hasBlank = items.some(i => !(i.statusCotizacion || "").trim());
    const set = new Set(items.map(i => (i.statusCotizacion || "").trim()).filter(v => v.length > 0));
    const sorted = Array.from(set).sort();
    return hasBlank ? ["ALL", "(Sin status)", ...sorted] : ["ALL", ...sorted];
  }, [items]);

  const filtered = useMemo(() => {
    let out = items;
    if (filterSubEvents.size > 0) out = out.filter(i => filterSubEvents.has(i.subEventId || "__unassigned__"));
    if (filterEvento !== "ALL") out = out.filter(i => i.evento === filterEvento);
    if (filterArea !== "ALL") out = out.filter(i => i.area === filterArea);
    if (filterCentro !== "ALL") out = out.filter(i => i.centroCosto === filterCentro);
    if (filterProveedor === "(Sin proveedor)") out = out.filter(i => !(i.proveedor || "").trim());
    else if (filterProveedor !== "ALL") out = out.filter(i => (i.proveedor || "").trim() === filterProveedor);
    if (filterProductora === "SI") out = out.filter(i => i.agencyFee);
    else if (filterProductora === "NO") out = out.filter(i => !i.agencyFee);
    if (filterFeeEnCotiz === "SI") out = out.filter(i => i.aplicaFee === "SI");
    else if (filterFeeEnCotiz === "NO") out = out.filter(i => i.aplicaFee !== "SI");
    if (filterCotizacion === "(Sin cotizacion)") out = out.filter(i => !(i.cotizacion || "").trim());
    else if (filterCotizacion !== "ALL") out = out.filter(i => (i.cotizacion || "").trim() === filterCotizacion);
    if (filterAsignado === "(Sin asignar)") out = out.filter(i => !(i.assignedTo || "").trim());
    else if (filterAsignado !== "ALL") out = out.filter(i => (i.assignedTo || "").trim() === filterAsignado);
    if (filterStatus === "(Sin status)") out = out.filter(i => !(i.statusCotizacion || "").trim());
    else if (filterStatus !== "ALL") out = out.filter(i => (i.statusCotizacion || "").trim() === filterStatus);
    if (filterInKind === "SI") out = out.filter(i => i.inKind);
    else if (filterInKind === "NO") out = out.filter(i => !i.inKind);
    if (filterPrecio === "ZERO") out = out.filter(i => (Number(i.precioUnitario) || 0) === 0 && !i.inKind);
    else if (filterPrecio === "NONZERO") out = out.filter(i => (Number(i.precioUnitario) || 0) > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(i =>
        i.item.toLowerCase().includes(q) ||
        i.descripcion.toLowerCase().includes(q) ||
        i.area.toLowerCase().includes(q) ||
        i.centroCosto.toLowerCase().includes(q) ||
        i.notas.toLowerCase().includes(q) ||
        i.cotizacion.toLowerCase().includes(q) ||
        (i.proveedor || "").toLowerCase().includes(q) ||
        (i.assignedTo || "").toLowerCase().includes(q)
      );
    }
    return out;
  }, [items, filterSubEvents, filterEvento, filterArea, filterCentro, filterProveedor, filterProductora, filterFeeEnCotiz, filterCotizacion, filterAsignado, filterStatus, filterInKind, filterPrecio, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, { subEventId: string; evento: string; area: string; centroCosto: string; items: BudgetItem[] }>();
    filtered.forEach(item => {
      const seId = item.subEventId || "__unassigned__";
      const cc = item.centroCosto || "(Sin centro)";
      const key = `${seId}__${item.area}__${cc}`;
      if (!map.has(key)) map.set(key, { subEventId: seId, evento: item.evento, area: item.area, centroCosto: cc, items: [] });
      map.get(key)!.items.push(item);
    });
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      const oa = subEventOrder(a[1].subEventId === "__unassigned__" ? undefined : a[1].subEventId);
      const ob = subEventOrder(b[1].subEventId === "__unassigned__" ? undefined : b[1].subEventId);
      if (oa !== ob) return oa - ob;
      const ac = a[1].area.localeCompare(b[1].area);
      if (ac !== 0) return ac;
      return a[1].centroCosto.localeCompare(b[1].centroCosto);
    });
    return new Map(entries);
  }, [filtered, subEventOrder]);

  const subEventSummaries = useMemo(() => {
    const buckets = new Map<string, { id: string; name: string; color: string; cash: number; inKind: number; pending: number; count: number }>();
    const ensure = (id: string) => {
      if (!buckets.has(id)) {
        const isUnassigned = id === "__unassigned__";
        buckets.set(id, {
          id,
          name: isUnassigned ? "Sin asignar" : subEventName(id),
          color: isUnassigned ? "#94a3b8" : subEventColor(id),
          cash: 0, inKind: 0, pending: 0, count: 0,
        });
      }
      return buckets.get(id)!;
    };
    for (const s of subEvents) ensure(s.id);
    for (const it of items) {
      const id = it.subEventId || "__unassigned__";
      const b = ensure(id);
      b.count++;
      if (it.inKind) b.inKind += it.total;
      else b.cash += it.total;
      if (it.cotizacion === "PENDING" || it.statusCotizacion === "Cotización Pending" || it.statusCotizacion === "Pendiente Cotizar") b.pending++;
    }
    const list = Array.from(buckets.values());
    list.sort((a, b) => subEventOrder(a.id === "__unassigned__" ? undefined : a.id) - subEventOrder(b.id === "__unassigned__" ? undefined : b.id));
    return list.filter(b => b.id !== "__unassigned__" || b.count > 0);
  }, [items, subEvents, subEventName, subEventColor, subEventOrder]);

  const recalc = recalcItem;

  const updateItem = useCallback((id: string, field: keyof BudgetItem, value: BudgetItem[keyof BudgetItem]) => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        return recalc(updated);
      });
      const changed = next.find(i => i.id === id);
      if (changed) {
        const recalcFields = ["qty", "qtyDias", "precioUnitario", "porDias", "aplicaFee", "agencyFee", "inKind", "exentoIva", "aplicaTurismo"] as const;
        if (recalcFields.includes(field as any)) {
          const { id: _id, ...rest } = changed;
          Object.entries(rest).forEach(([k, v]) => patchItem(id, k, v));
        } else {
          patchItem(id, field, changed[field]);
        }
      }
      return next;
    });
  }, [setItems, patchItem]);

  const toggleField = useCallback((id: string, field: "inKind" | "agencyFee" | "validarCosto" | "contratarAparte" | "soloPresupuestado" | "accionRequerida" | "niceToHave") => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: !item[field] };
        return recalc(updated);
      });
      const changed = next.find(i => i.id === id);
      if (changed) {
        const recalcFields = ["inKind", "agencyFee"];
        if (recalcFields.includes(field)) {
          const { id: _id, ...rest } = changed;
          Object.entries(rest).forEach(([k, v]) => patchItem(id, k, v));
        } else {
          patchItem(id, field, changed[field]);
        }
      }
      return next;
    });
  }, [setItems, patchItem]);

  const toggleStringField = useCallback((id: string, field: "porDias" | "aplicaFee") => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: item[field] === "SI" ? "NO" : "SI" };
        return recalc(updated);
      });
      const changed = next.find(i => i.id === id);
      if (changed) {
        const { id: _id, ...rest } = changed;
        Object.entries(rest).forEach(([k, v]) => patchItem(id, k, v));
      }
      return next;
    });
  }, [setItems, patchItem]);

  const newQuoteId = () => (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const addQuote = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item;
        const existingQuotes = item.quotes || [];
        let quotes: QuoteOption[];
        let approvedQuoteId = item.approvedQuoteId;
        if (existingQuotes.length === 0) {
          const firstId = newQuoteId();
          const secondId = newQuoteId();
          quotes = [
            { id: firstId, label: item.proveedor || "Opción 1", precioUnitario: Number(item.precioUnitario) || 0, link: item.cotizacionLink || "", notes: item.cotizacion || "" },
            { id: secondId, label: "", precioUnitario: 0, link: "", notes: "" },
          ];
          approvedQuoteId = firstId;
        } else {
          quotes = [...existingQuotes, { id: newQuoteId(), label: "", precioUnitario: 0, link: "", notes: "" }];
        }
        const updated = recalc({ ...item, quotes, approvedQuoteId });
        return updated;
      });
      const changed = next.find(i => i.id === id);
      if (changed) {
        const { id: _id, ...rest } = changed;
        Object.entries(rest).forEach(([k, v]) => patchItem(id, k, v));
      }
      return next;
    });
  }, [setItems, patchItem]);

  const updateQuote = useCallback((id: string, quoteId: string, field: keyof QuoteOption, value: any) => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item;
        const quotes = (item.quotes || []).map(q => q.id === quoteId ? { ...q, [field]: value } : q);
        return recalc({ ...item, quotes });
      });
      const changed = next.find(i => i.id === id);
      if (changed) {
        const { id: _id, ...rest } = changed;
        Object.entries(rest).forEach(([k, v]) => patchItem(id, k, v));
      }
      return next;
    });
  }, [setItems, patchItem]);

  const removeQuote = useCallback((id: string, quoteId: string) => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item;
        const quotes = (item.quotes || []).filter(q => q.id !== quoteId);
        let approvedQuoteId = item.approvedQuoteId;
        if (quotes.length === 0) {
          return recalc({ ...item, quotes: [], approvedQuoteId: "" });
        }
        if (approvedQuoteId === quoteId) approvedQuoteId = quotes[0].id;
        return recalc({ ...item, quotes, approvedQuoteId });
      });
      const changed = next.find(i => i.id === id);
      if (changed) {
        const { id: _id, ...rest } = changed;
        Object.entries(rest).forEach(([k, v]) => patchItem(id, k, v));
      }
      return next;
    });
  }, [setItems, patchItem]);

  const setApprovedQuote = useCallback((id: string, quoteId: string) => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item;
        return recalc({ ...item, approvedQuoteId: quoteId });
      });
      const changed = next.find(i => i.id === id);
      if (changed) {
        const { id: _id, ...rest } = changed;
        Object.entries(rest).forEach(([k, v]) => patchItem(id, k, v));
      }
      return next;
    });
  }, [setItems, patchItem]);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      saveFull(next);
      return next;
    });
  }, [setItems, saveFull]);

  const toggleReviewed = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item;
        const newVal = item.reviewedBy ? "" : (user?.name || "Unknown");
        return { ...item, reviewedBy: newVal };
      });
      const changed = next.find(i => i.id === id);
      if (changed) patchItem(id, "reviewedBy", changed.reviewedBy);
      return next;
    });
  }, [setItems, patchItem, user]);

  const openEditModal = useCallback((item: BudgetItem) => {
    setEditItem({ ...item });
    setShowEditModal(true);
  }, []);

  const saveEditItem = useCallback(() => {
    if (!editItem.id) return;
    setItems(prev => {
      const next = prev.map(i => {
        if (i.id !== editItem.id) return i;
        const updated: BudgetItem = {
          ...i,
          evento: editItem.evento || i.evento,
          area: editItem.area ?? i.area,
          centroCosto: editItem.centroCosto ?? i.centroCosto,
          item: editItem.item || i.item,
          descripcion: editItem.descripcion ?? i.descripcion,
          notas: editItem.notas ?? i.notas,
          inKind: editItem.inKind ?? i.inKind,
          agencyFee: editItem.agencyFee ?? i.agencyFee,
          qty: Number(editItem.qty) || i.qty,
          uom: editItem.uom ?? i.uom,
          porDias: editItem.porDias ?? i.porDias,
          qtyDias: Number(editItem.qtyDias) || i.qtyDias,
          precioUnitario: Number(editItem.precioUnitario) ?? i.precioUnitario,
          aplicaFee: editItem.aplicaFee ?? i.aplicaFee,
          cotizacion: editItem.cotizacion ?? i.cotizacion,
          documento: editItem.documento ?? i.documento,
          proveedor: editItem.proveedor ?? i.proveedor,
          exentoIva: editItem.exentoIva ?? i.exentoIva,
          aplicaTurismo: editItem.aplicaTurismo ?? i.aplicaTurismo ?? false,
          accionRequerida: editItem.accionRequerida ?? i.accionRequerida ?? false,
          statusCotizacion: editItem.statusCotizacion ?? i.statusCotizacion ?? "",
        };
        return recalcItem(updated);
      });
      saveFull(next);
      return next;
    });
    setShowEditModal(false);
  }, [editItem, setItems, saveFull]);

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
      validarCosto: false,
      contratarAparte: false,
      cotizacionLink: "",
      exentoIva: newItem.exentoIva || false,
      aplicaTurismo: newItem.aplicaTurismo || false,
      soloPresupuestado: false,
      accionRequerida: false,
    };
    setItems(prev => {
      const next = [...prev, recalc(base)];
      saveFull(next);
      return next;
    });
    setShowAddModal(false);
    setNewItem({ evento: "MAIN EVENT", subEventId: DEFAULT_SUB_EVENT_ID, area: "", centroCosto: "", item: "", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "", porDias: "NO", qtyDias: 1, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false, exentoIva: false, aplicaTurismo: false, soloPresupuestado: false, accionRequerida: false, statusCotizacion: "" });
  }, [newItem, setItems, saveFull]);

  const updateComment = useCallback((id: string, field: "notas" | "descripcion", value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    }));
    patchItem(id, field, value, true);
  }, [setItems, patchItem]);

  const toggleArea = (key: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalBudget = useMemo(() => filtered.reduce((s, i) => s + i.total, 0), [filtered]);
  const cashSinFee = useMemo(() => filtered.filter(i => !i.inKind && i.total > 0).reduce((s, i) => s + i.subtotal + i.iva + (i.turismo || 0), 0), [filtered]);
  const totalInKindCount = useMemo(() => filtered.filter(i => i.inKind).length, [filtered]);
  const totalInKindSum = useMemo(() => filtered.filter(i => i.inKind).reduce((s, i) => s + i.total, 0), [filtered]);
  const pendingCount = useMemo(() => filtered.filter(i => i.cotizacion === "PENDING").length, [filtered]);
  const validarCount = useMemo(() => filtered.filter(i => i.validarCosto).length, [filtered]);
  const contratarAparteCount = useMemo(() => filtered.filter(i => i.contratarAparte).length, [filtered]);
  const soloPresupuestadoSum = useMemo(() => filtered.filter(i => i.soloPresupuestado).reduce((s, i) => s + i.total, 0), [filtered]);
  const accionRequeridaCount = useMemo(() => filtered.filter(i => i.accionRequerida).length, [filtered]);
  const feeProductoraSum = useMemo(() => filtered.reduce((s, i) => s + getFeeProductora(i), 0), [filtered]);
  const feeExplicitSum = useMemo(() => filtered.reduce((s, i) => s + i.fee, 0), [filtered]);
  const feeIncluidoSum = useMemo(() => filtered.reduce((s, i) => s + (i.feeIncluido || 0), 0), [filtered]);
  const niceToHaveCount = useMemo(() => filtered.filter(i => i.niceToHave).length, [filtered]);
  const niceToHaveSum = useMemo(() => filtered.filter(i => i.niceToHave).reduce((s, i) => s + i.total, 0), [filtered]);

  const exportCSV = () => {
    const headers = [
      "SUB-EVENTO", "EVENTO", "AREA/ZONA", "CENTRO DE COSTO", "ITEM", "DESCRIPCION", "NOTAS/OBSERVACIONES",
      "IN-KIND?", "AURORA 360?", "QTY", "UoM", "CONTRATACION POR DIAS?", "QTY DIAS",
      "PRECIO UNITARIO", "SUBTOTAL", "VIA PRODUCTORA (AURORA 360)?", "FEE INCL. EN COTIZACION?",
      "FEE 20%", "SUBTOTAL CON FEE", "IVA", "TOTAL", "COTIZACION", "SOLO PRESUPUESTADO?", "IMAGEN DE REFERENCIA", "PROVEEDOR",
      "REVIEWED BY", "VALIDAR COSTO?", "CONTRATAR APARTE?", "ACCIÓN REQUERIDA?", "NICE TO HAVE?", "COTIZACION LINK", "EXENTO IVA?", "ASSIGNED TO", "STATUS COTIZACION"
    ];
    const rows = filtered.map(i => [
      subEventName(i.subEventId), i.evento, i.area, i.centroCosto, i.item, i.descripcion, i.notas,
      i.inKind ? "SI" : "NO", i.agencyFee ? "SI" : "NO", i.qty, i.uom,
      i.porDias, i.qtyDias, i.precioUnitario, i.subtotal, i.agencyFee ? "SI" : "NO",
      i.aplicaFee, i.fee, i.subtotalConFee, i.iva, i.total, i.cotizacion, i.soloPresupuestado ? "SI" : "NO", i.documento,
      i.proveedor || "", i.reviewedBy || "", i.validarCosto ? "SI" : "NO", i.contratarAparte ? "SI" : "NO",
      i.accionRequerida ? "SI" : "NO", i.niceToHave ? "SI" : "NO", i.cotizacionLink || "", i.exentoIva ? "SI" : "NO", i.assignedTo || "", i.statusCotizacion || "",
      i.aplicaTurismo ? "SI" : "NO", i.turismo || 0, i.feeIncluido || 0
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "EmTech_El_Salvador_2026_Budget.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-muted-foreground text-sm">Loading budget data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {error ? (
            <span className="flex items-center gap-1.5 text-[10px] text-destructive">
              <CloudOff className="w-3 h-3" /> {error}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-600">
              <Cloud className="w-3 h-3" /> Cloud sync active
            </span>
          )}
          {meta?.lastEditedBy && (
            <span className="text-[10px] text-muted-foreground/60">
              Last edit by {meta.lastEditedBy} ({meta.lastEditedByOrg}) {meta.lastEditedAt ? new Date(meta.lastEditedAt).toLocaleString() : ""}
            </span>
          )}
        </div>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full border font-medium",
          canEdit
            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
            : canComment
              ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
              : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
        )}>
          {permissions.label}
        </span>
      </div>

      {subEventSummaries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={filterSubEvents.size === 1 ? Array.from(filterSubEvents)[0] : "all"}
            onValueChange={(v) => setFilterSubEvents(v === "all" ? new Set() : new Set([v]))}
            className="flex-1 min-w-0"
          >
            <TabsList className="h-auto p-1 flex-wrap gap-1">
              <TabsTrigger value="all" className="text-xs gap-1.5">
                Todos <span className="text-[10px] text-muted-foreground">({items.length})</span>
              </TabsTrigger>
              {subEventSummaries.map(s => {
                const active = filterSubEvents.has(s.id);
                return (
                  <TabsTrigger
                    key={s.id}
                    value={s.id}
                    className="text-xs gap-1.5"
                    style={active ? { borderBottom: `2px solid ${s.color}` } : { borderLeft: `3px solid ${s.color}` }}
                  >
                    <span>{s.name}</span>
                    <span className="text-[10px] text-muted-foreground">({s.count})</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSubEventsManager(true)}
              className="h-7 gap-1.5 ml-auto"
            >
              <Settings className="w-3.5 h-3.5" />
              Gestionar sub-eventos
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {subEventSummaries.map(s => (
          <div
            key={s.id}
            className="rounded-lg border border-card-border bg-card p-2.5 flex flex-col gap-1"
            style={{ borderTop: `3px solid ${s.color}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground truncate" title={s.name}>{s.name}</span>
              <span className="text-[10px] text-muted-foreground">{s.count}</span>
            </div>
            <div className="text-[11px] font-mono font-semibold text-primary">{formatUSD(s.cash)}</div>
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
              {s.inKind > 0 && <span className="text-amber-600">In-Kind {formatUSD(s.inKind)}</span>}
              {s.pending > 0 && <span className="text-orange-600">{s.pending} pend.</span>}
            </div>
          </div>
        ))}
      </div>

      <SummaryCards
        totalBudget={totalBudget}
        cashSinFee={cashSinFee}
        totalInKindCount={totalInKindCount}
        totalInKindSum={totalInKindSum}
        pendingCount={pendingCount}
        itemCount={filtered.length}
        validarCount={validarCount}
        contratarAparteCount={contratarAparteCount}
        soloPresupuestadoSum={soloPresupuestadoSum}
        accionRequeridaCount={accionRequeridaCount}
        feeProductoraSum={feeProductoraSum}
        feeExplicitSum={feeExplicitSum}
        feeIncluidoSum={feeIncluidoSum}
        niceToHaveCount={niceToHaveCount}
        niceToHaveSum={niceToHaveSum}
      />

      <div className="space-y-3">
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
            {canEdit && (
              <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-2"><Plus className="w-4 h-4" />Add Item</Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filterProveedor} onValueChange={setFilterProveedor}>
            <SelectTrigger className="w-[200px] bg-card border-card-border text-xs"><SelectValue placeholder="Provider" /></SelectTrigger>
            <SelectContent>{proveedores.map(p => <SelectItem key={p} value={p}>{p === "ALL" ? "All Providers" : p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterProductora} onValueChange={setFilterProductora}>
            <SelectTrigger className="w-[180px] bg-card border-card-border text-xs"><SelectValue placeholder="Via Productora" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Via Productora: All</SelectItem>
              <SelectItem value="SI">Via Productora</SelectItem>
              <SelectItem value="NO">Directo (sin productora)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterFeeEnCotiz} onValueChange={setFilterFeeEnCotiz}>
            <SelectTrigger className="w-[180px] bg-card border-card-border text-xs"><SelectValue placeholder="Fee en Cotiz." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Fee en Cotiz.: All</SelectItem>
              <SelectItem value="SI">Fee incluido</SelectItem>
              <SelectItem value="NO">Fee adicional (20%)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCotizacion} onValueChange={setFilterCotizacion}>
            <SelectTrigger className="w-[180px] bg-card border-card-border text-xs"><SelectValue placeholder="Cotizacion" /></SelectTrigger>
            <SelectContent>{cotizaciones.map(c => <SelectItem key={c} value={c}>{c === "ALL" ? "All Cotizaciones" : c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterAsignado} onValueChange={setFilterAsignado}>
            <SelectTrigger className="w-[180px] bg-card border-card-border text-xs"><SelectValue placeholder="Asignado a" /></SelectTrigger>
            <SelectContent>{assignedToOptions.map(a => <SelectItem key={a} value={a}>{a === "ALL" ? "Asignado: Todos" : a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[200px] bg-card border-card-border text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s === "ALL" ? "Status: Todos" : s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterInKind} onValueChange={setFilterInKind}>
            <SelectTrigger className="w-[150px] bg-card border-card-border text-xs"><SelectValue placeholder="In-Kind" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">In-Kind: Todos</SelectItem>
              <SelectItem value="SI">Solo In-Kind</SelectItem>
              <SelectItem value="NO">Sin In-Kind</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPrecio} onValueChange={setFilterPrecio}>
            <SelectTrigger className="w-[170px] bg-card border-card-border text-xs"><SelectValue placeholder="Precio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Precio: Todos</SelectItem>
              <SelectItem value="ZERO">Precio en $0</SelectItem>
              <SelectItem value="NONZERO">Con precio</SelectItem>
            </SelectContent>
          </Select>
          {(filterProveedor !== "ALL" || filterProductora !== "ALL" || filterFeeEnCotiz !== "ALL" || filterCotizacion !== "ALL" || filterAsignado !== "ALL" || filterStatus !== "ALL" || filterInKind !== "ALL" || filterPrecio !== "ALL") && (
            <button
              onClick={() => { setFilterProveedor("ALL"); setFilterProductora("ALL"); setFilterFeeEnCotiz("ALL"); setFilterCotizacion("ALL"); setFilterAsignado("ALL"); setFilterStatus("ALL"); setFilterInKind("ALL"); setFilterPrecio("ALL"); }}
              className="text-xs text-primary hover:underline"
            >Clear filters</button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {items.length} items</span>
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-auto max-h-[calc(100vh-280px)] budget-scroll">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <tr className="text-[10px] uppercase tracking-wider">
                <th className="sticky-col-0 px-2 py-2.5 w-6 bg-[hsl(var(--muted))] border-b border-border"></th>
                <th className="sticky-col-1 text-center px-1 py-2.5 font-semibold text-muted-foreground w-10 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Rev." info="Marcar como revisado. Muestra quién lo revisó y cuándo." align="center" />
                </th>
                <th className="sticky-col-2 text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[200px] bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Item" info="Nombre del producto, servicio o recurso necesario para el evento." />
                </th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[90px] bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Centro Costo" info="Categoría de gasto dentro del área (ej: Staff, Señalética, AV, Catering)." />
                </th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-14 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="In-Kind" info="Contribución en especie — donada o proporcionada por un sponsor/venue sin costo directo." align="center" />
                </th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-10 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Qty" info="Cantidad de unidades requeridas." align="center" />
                </th>
                <th className="text-left px-1 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="UoM" info="Unidad de medida (persona, unidad, servicio, m², etc.)." />
                </th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Tipo" info="SI = contratación por días (Qty × Días × Precio). NO = contratación fija (Qty × Precio)." align="center" />
                </th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-10 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Dias" info="Número de días que se requiere el servicio (aplica solo si Tipo = SI)." align="center" />
                </th>
                <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-20 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="P. Unit." info="Precio unitario por unidad/día del item." align="right" />
                </th>
                <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-20 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Subtotal" info="Qty × P.Unit (× Días si aplica). Sin fee ni IVA." align="right" />
                </th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-20 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Via Productora" info="Indica si este item se contrata a través de Aurora 360 (productora del evento)." align="center" />
                </th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-20 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Fee en Cotiz.?" info="SI = el fee de 20% ya está incluido en la cotización del proveedor. NO = se aplica fee adicional del 20%." align="center" />
                </th>
                <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Fee 20%" info="Fee de gestión de la productora (20% sobre subtotal). Si el fee ya está incluido en la cotización, se muestra en gris para referencia pero no suma al total." align="right" />
                </th>
                <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="IVA" info="Impuesto al Valor Agregado (13% sobre subtotal + fee). Exento si el item tiene IVA exento marcado." align="right" />
                </th>
                <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Turismo" info="Impuesto de turismo del 5% sobre subtotal + fee. Aplica solo a items marcados. Es adicional al IVA." align="right" />
                </th>
                <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-24 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Total" info="Monto final = Subtotal + Fee (si no incluido) + IVA + Turismo. Este es el costo real que se pagará." align="right" />
                </th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[90px] bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Cotizacion" info="Código o referencia de la cotización del proveedor (ej: A001, PENDING, VOLUNTARIO, NA)." />
                </th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[110px] bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Status" info="Estado actual del proceso de cotización para este item (Recibida, Pendiente, No Aplica, etc.)." />
                </th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-20 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Solo Presup." info="Item solo presupuestado — aún no tiene cotización formal. El monto es un estimado/guesstimate." align="center" />
                </th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[90px] bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Proveedor" info="Nombre del proveedor o empresa que suministra este item." />
                </th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[100px] bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Assigned" info="Persona responsable de gestionar o dar seguimiento a este item." />
                </th>
                <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[80px] bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Img. Ref." info="Link a imagen de referencia del producto o servicio." />
                </th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Validar" info="Marcar items con posible costo inflado que necesitan validación con otros proveedores." align="center" />
                </th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Aparte" info="Marcar items que deben contratarse por aparte (sin productora) para evitar el fee del 20%." align="center" />
                </th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Acción Req." info="Items que requieren una acción o seguimiento específico por parte del equipo." align="center" />
                </th>
                <th className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Nice to Have" info="Items deseables pero no esenciales. Pueden eliminarse si se necesita recortar presupuesto." align="center" />
                </th>
                {canEdit && <th className="w-8 px-1 py-2.5 bg-[hsl(var(--muted))] border-b border-border"></th>}
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
                    <td className="sticky-col-0 px-2 py-2 bg-muted/30" colSpan={1}>
                      <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }} className="w-3.5 h-3.5 text-muted-foreground">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </motion.div>
                    </td>
                    <td className="sticky-col-1 px-2 py-2 bg-muted/30" colSpan={2}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: subEventColor(group.subEventId === "__unassigned__" ? undefined : group.subEventId) }}
                        >
                          {subEventName(group.subEventId === "__unassigned__" ? undefined : group.subEventId)}
                        </span>
                        <span className="font-semibold text-foreground text-xs">{group.area}</span>
                        <span className="text-muted-foreground text-[10px]">›</span>
                        <span className="text-foreground text-xs">{group.centroCosto}</span>
                        <Badge variant="secondary" className="text-[10px] font-normal py-0">{group.evento === "MAIN EVENT" ? "Main Event" : group.evento === "MAIN EVENT VIP DINNER" ? "VIP Dinner" : "Pre/Post"}</Badge>
                        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground py-0">{group.items.length} items</Badge>
                        {hasInKind && <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/20 font-normal py-0">In-Kind</Badge>}
                      </div>
                    </td>
                    <td className="px-2 py-2" colSpan={16}></td>
                    <td className="px-2 py-2 text-right font-semibold" colSpan={16}>

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
                      <td className={cn("sticky-col-0 px-2 py-1.5 align-top", item.inKind ? "row-inkind-bg" : "bg-background")}>
                        {item.inKind && (
                          <Tooltip><TooltipTrigger><Tag className="w-3 h-3 text-amber-500" /></TooltipTrigger><TooltipContent>In-Kind</TooltipContent></Tooltip>
                        )}
                      </td>
                      <td className={cn("sticky-col-1 px-1 py-1.5 text-center align-top", item.inKind ? "row-inkind-bg" : "bg-background")}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={canEdit ? () => toggleReviewed(item.id) : undefined}
                              className={cn(
                                "inline-flex items-center justify-center w-6 h-6 rounded transition-colors",
                                !canEdit && "cursor-default",
                                item.reviewedBy
                                  ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                  : "bg-muted/30 text-muted-foreground/25 border border-transparent"
                              )}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] text-xs">
                            {item.reviewedBy
                              ? `Reviewed por ${item.reviewedBy}`
                              : canEdit ? "Click para marcar como reviewed" : "No reviewed"}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className={cn("sticky-col-2 px-2 py-1.5 align-top max-w-[260px]", item.inKind ? "row-inkind-bg" : "bg-background")}>
                        <div className="flex items-center gap-1 mb-0.5">
                          {canEdit ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded text-white hover:opacity-80 transition-opacity"
                                  style={{ backgroundColor: subEventColor(item.subEventId) }}
                                  title="Cambiar sub-evento"
                                >
                                  {subEventName(item.subEventId)}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-1" align="start">
                                <div className="flex flex-col gap-0.5">
                                  {subEvents.map(s => (
                                    <button
                                      key={s.id}
                                      onClick={() => updateItem(item.id, "subEventId", s.id)}
                                      className={cn(
                                        "flex items-center gap-2 px-2 py-1 rounded text-[11px] text-left hover:bg-muted transition-colors",
                                        item.subEventId === s.id && "bg-muted font-semibold"
                                      )}
                                    >
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || "#94a3b8" }} />
                                      <span>{s.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded text-white"
                              style={{ backgroundColor: subEventColor(item.subEventId) }}
                            >
                              {subEventName(item.subEventId)}
                            </span>
                          )}
                        </div>
                        <EditableCell value={item.item} onSave={v => updateItem(item.id, "item", v)} className="font-medium text-foreground text-xs" disabled={!canEdit} />
                        {(item.descripcion || item.notas) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                <MessageSquare className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[180px]">{item.descripcion || item.notas}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[350px] text-xs space-y-1 p-3">
                              {item.descripcion && <div><span className="font-semibold text-foreground">Desc:</span> {item.descripcion}</div>}
                              {item.notas && <div className="italic text-muted-foreground"><span className="font-semibold not-italic text-foreground">Notas:</span> {item.notas}</div>}
                              {(canEdit || canComment) && <div className="text-[10px] text-muted-foreground/50 pt-1">Click to edit desc/notas below.</div>}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <div className="flex gap-1 mt-0.5">
                          <EditableCell value={item.descripcion} onSave={v => canEdit ? updateItem(item.id, "descripcion", v) : updateComment(item.id, "descripcion", v)} className="text-muted-foreground/40 text-[9px] truncate max-w-[120px]" placeholder="+ desc" disabled={!canEdit && !canComment} />
                          <EditableCell value={item.notas} onSave={v => canEdit ? updateItem(item.id, "notas", v) : updateComment(item.id, "notas", v)} className="text-muted-foreground/30 text-[9px] italic truncate max-w-[120px]" placeholder="+ nota" disabled={!canEdit && !canComment} />
                        </div>
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <EditableCell value={item.centroCosto} onSave={v => updateItem(item.id, "centroCosto", v)} className="text-muted-foreground text-xs" disabled={!canEdit} />
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        {canEdit ? (
                          <ToggleCell value={item.inKind} onToggle={() => toggleField(item.id, "inKind")} labelOn="SI" labelOff="NO" />
                        ) : (
                          <span className={cn("text-[10px] px-2 py-0.5 rounded border font-medium", item.inKind ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/50 text-muted-foreground/50 border-border/50")}>{item.inKind ? "SI" : "NO"}</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <EditableCell value={String(item.qty)} onSave={v => updateItem(item.id, "qty", v)} className="text-center font-mono text-xs" type="number" disabled={!canEdit} />
                      </td>
                      <td className="px-1 py-1.5 align-top">
                        <EditableCell value={item.uom} onSave={v => updateItem(item.id, "uom", v)} className="text-muted-foreground text-xs" disabled={!canEdit} />
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <button
                          onClick={canEdit ? () => toggleStringField(item.id, "porDias") : undefined}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border font-medium transition-colors whitespace-nowrap",
                            !canEdit && "cursor-default",
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
                          <EditableCell value={String(item.qtyDias)} onSave={v => updateItem(item.id, "qtyDias", v)} className="text-center font-mono text-xs" type="number" disabled={!canEdit} />
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">--</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right align-top font-mono">
                        {item.quotes && item.quotes.length > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 text-right font-mono text-xs text-emerald-700 cursor-help">
                                ${(item.precioUnitario || 0).toFixed(2)}
                                <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-sans font-medium">{item.quotes.length}</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              Precio de la cotización aprobada ({item.quotes.length} opciones). Cambia desde la columna Cotización.
                            </TooltipContent>
                          </Tooltip>
                        ) : item.precioUnitario > 0 ? (
                          <EditableCell value={String(item.precioUnitario)} onSave={v => updateItem(item.id, "precioUnitario", parseFloat(v) || 0)} className="text-right font-mono text-xs" type="number" prefix="$" disabled={!canEdit} />
                        ) : (
                          <EditableCell value="0" onSave={v => updateItem(item.id, "precioUnitario", parseFloat(v) || 0)} className="text-right font-mono text-xs text-muted-foreground/40" type="number" disabled={!canEdit} />
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right align-top font-mono text-muted-foreground">
                        {item.subtotal > 0 ? formatUSD(item.subtotal) : "--"}
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <button
                          onClick={canEdit ? () => toggleField(item.id, "agencyFee") : undefined}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border font-medium transition-colors whitespace-nowrap",
                            !canEdit && "cursor-default",
                            item.agencyFee
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted/50 text-muted-foreground/40 border-border/50"
                          )}
                        >
                          {item.agencyFee ? "Aurora 360" : "No"}
                        </button>
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        {item.agencyFee ? (
                          <button
                            onClick={canEdit ? () => toggleStringField(item.id, "aplicaFee") : undefined}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded border font-medium transition-colors whitespace-nowrap",
                              !canEdit && "cursor-default",
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
                      <td className="px-2 py-1.5 text-right align-top font-mono">
                        {item.fee > 0 ? (
                          <span className="text-muted-foreground">{formatUSD(item.fee)}</span>
                        ) : (item.feeIncluido || 0) > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground/25 cursor-help">{formatUSD(item.feeIncluido!)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs font-normal max-w-[200px]">
                              Fee del 20% ya incluido en la cotización — no suma al total, solo para visibilidad.
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground/30">--</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right align-top">
                        {item.exentoIva ? (
                          <button
                            onClick={canEdit ? () => { updateItem(item.id, "exentoIva", false); } : undefined}
                            className={cn("text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium", canEdit && "hover:bg-amber-500/20 transition-colors", !canEdit && "cursor-default")}
                          >EXENTO</button>
                        ) : item.iva > 0 ? (
                          <span
                            className={cn("font-mono text-muted-foreground", canEdit && "cursor-pointer hover:text-amber-600 transition-colors")}
                            title={canEdit ? "Click para marcar exento de IVA" : undefined}
                            onClick={canEdit ? () => { updateItem(item.id, "exentoIva", true); } : undefined}
                          >{formatUSD(item.iva)}</span>
                        ) : (
                          <span
                            className={cn("text-muted-foreground/30", canEdit && "cursor-pointer hover:text-amber-600 transition-colors")}
                            title={canEdit ? "Click para marcar exento de IVA" : undefined}
                            onClick={canEdit ? () => { updateItem(item.id, "exentoIva", true); } : undefined}
                          >--</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right align-top">
                        {item.aplicaTurismo ? (
                          <button
                            onClick={canEdit ? () => { updateItem(item.id, "aplicaTurismo", false); } : undefined}
                            className={cn("text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 font-medium font-mono", canEdit && "hover:bg-cyan-500/20 transition-colors", !canEdit && "cursor-default")}
                          >{formatUSD(item.turismo || 0)}</button>
                        ) : (
                          <span
                            className={cn("text-muted-foreground/30", canEdit && "cursor-pointer hover:text-cyan-600 transition-colors")}
                            title={canEdit ? "Click para aplicar 5% turismo" : undefined}
                            onClick={canEdit ? () => { updateItem(item.id, "aplicaTurismo", true); } : undefined}
                          >--</span>
                        )}
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
                        {STATUS_NO_COTIZACION.has(item.statusCotizacion || "") ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground/25 italic">No aplica</span>
                          </div>
                        ) : item.quotes && item.quotes.length > 0 ? (
                          <div className="flex flex-col gap-1 min-w-[220px]">
                            {item.quotes.map(q => {
                              const isApproved = (item.approvedQuoteId || item.quotes![0].id) === q.id;
                              return (
                                <div
                                  key={q.id}
                                  className={cn(
                                    "flex items-center gap-1 rounded border px-1 py-0.5",
                                    isApproved ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/20 border-border/40"
                                  )}
                                >
                                  <button
                                    onClick={canEdit ? () => setApprovedQuote(item.id, q.id) : undefined}
                                    title={isApproved ? "Cotización aprobada" : "Marcar como aprobada"}
                                    className={cn(
                                      "shrink-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors",
                                      isApproved ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40 hover:border-emerald-500",
                                      !canEdit && "cursor-default"
                                    )}
                                  >
                                    {isApproved && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </button>
                                  <div className="flex-1 min-w-0 flex flex-col">
                                    <EditableCell
                                      value={q.label}
                                      onSave={v => updateQuote(item.id, q.id, "label", v)}
                                      className="text-[10px] text-foreground font-medium truncate"
                                      placeholder="proveedor..."
                                      disabled={!canEdit}
                                    />
                                    <EditableCell
                                      value={String(q.precioUnitario || 0)}
                                      onSave={v => updateQuote(item.id, q.id, "precioUnitario", parseFloat(v) || 0)}
                                      className={cn("text-[10px] font-mono", isApproved ? "text-emerald-700 font-semibold" : "text-muted-foreground")}
                                      type="number"
                                      prefix="$"
                                      disabled={!canEdit}
                                    />
                                    <div className="flex items-center gap-0.5">
                                      {q.link && (
                                        <a href={q.link} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-500 hover:text-blue-600" title={q.link}>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      )}
                                      <EditableCell
                                        value={q.link || ""}
                                        onSave={v => updateQuote(item.id, q.id, "link", v)}
                                        className={q.link ? "text-blue-500 text-[9px] truncate max-w-[80px]" : "text-blue-400/40 text-[9px]"}
                                        placeholder="+ link"
                                        disabled={!canEdit}
                                      />
                                    </div>
                                  </div>
                                  {canEdit && (
                                    <button
                                      onClick={() => removeQuote(item.id, q.id)}
                                      className="shrink-0 text-muted-foreground/40 hover:text-red-500 transition-colors p-0.5"
                                      title="Eliminar cotización"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {canEdit && (
                              <button
                                onClick={() => addQuote(item.id)}
                                className="text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-muted/30 transition-colors self-start"
                              >
                                <Plus className="w-2.5 h-2.5" /> Agregar opción
                              </button>
                            )}
                          </div>
                        ) : STATUS_HAS_COTIZACION.has(item.statusCotizacion || "") ? (
                          <div className="flex flex-col gap-0.5">
                            <EditableCell value={item.cotizacion} onSave={v => updateItem(item.id, "cotizacion", v)} className="text-muted-foreground text-[10px]" placeholder="cotizacion..." disabled={!canEdit} />
                            <div className="flex items-center gap-0.5">
                              {item.cotizacionLink && (
                                <a href={item.cotizacionLink} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-blue-500 hover:text-blue-600" title={item.cotizacionLink}>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                              <EditableCell value={item.cotizacionLink || ""} onSave={v => updateItem(item.id, "cotizacionLink", v)} className={item.cotizacionLink ? "text-blue-500 text-[9px] truncate max-w-[100px]" : "text-blue-400/40 text-[9px]"} placeholder="+ link" disabled={!canEdit} />
                            </div>
                            {canEdit && (
                              <button
                                onClick={() => addQuote(item.id)}
                                className="text-[9px] text-muted-foreground/60 hover:text-primary flex items-center gap-0.5 transition-colors self-start mt-0.5"
                                title="Agregar otra cotización para comparar"
                              >
                                <Plus className="w-2.5 h-2.5" /> comparar opciones
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <CotizacionBadge value={item.cotizacion} />
                            <EditableCell value={item.cotizacion} onSave={v => updateItem(item.id, "cotizacion", v)} className="text-muted-foreground text-[10px]" placeholder="cotizacion..." disabled={!canEdit} />
                            <div className="flex items-center gap-0.5">
                              {item.cotizacionLink && (
                                <a href={item.cotizacionLink} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-blue-500 hover:text-blue-600" title={item.cotizacionLink}>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                              <EditableCell value={item.cotizacionLink || ""} onSave={v => updateItem(item.id, "cotizacionLink", v)} className={item.cotizacionLink ? "text-blue-500 text-[9px] truncate max-w-[100px]" : "text-blue-400/40 text-[9px]"} placeholder="+ link" disabled={!canEdit} />
                            </div>
                            {canEdit && (
                              <button
                                onClick={() => addQuote(item.id)}
                                className="text-[9px] text-muted-foreground/60 hover:text-primary flex items-center gap-0.5 transition-colors self-start mt-0.5"
                                title="Agregar otra cotización para comparar"
                              >
                                <Plus className="w-2.5 h-2.5" /> comparar opciones
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        {canEdit ? (
                          <Select
                            value={item.statusCotizacion || "__none__"}
                            onValueChange={v => updateItem(item.id, "statusCotizacion", v === "__none__" ? "" : v)}
                          >
                            <SelectTrigger className={cn(
                              "h-6 text-[10px] min-w-[100px] px-1.5 gap-1 border",
                              item.statusCotizacion
                                ? STATUS_COLORS[item.statusCotizacion] || "border-border"
                                : "border-dashed border-border/50"
                            )}>
                              <SelectValue placeholder="Status..." />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_COTIZACION_OPTIONS.map(opt => (
                                <SelectItem key={opt || "__none__"} value={opt || "__none__"}>
                                  {opt ? (
                                    <span className={cn("text-[10px] px-1 py-0.5 rounded", STATUS_COLORS[opt] || "")}>{STATUS_SHORT_LABELS[opt] || opt}</span>
                                  ) : (
                                    <span className="text-muted-foreground">Sin status</span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : item.statusCotizacion ? (
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap", STATUS_COLORS[item.statusCotizacion] || "border-border")}>
                            {STATUS_SHORT_LABELS[item.statusCotizacion] || item.statusCotizacion}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/30">--</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={canEdit ? () => toggleField(item.id, "soloPresupuestado") : undefined}
                              className={cn(
                                "inline-flex items-center justify-center w-6 h-6 rounded transition-colors",
                                !canEdit && "cursor-default",
                                item.soloPresupuestado
                                  ? "bg-yellow-500/15 text-yellow-500 border border-yellow-500/30"
                                  : "bg-muted/30 text-muted-foreground/25 border border-transparent"
                              )}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] text-xs">
                            {item.soloPresupuestado
                              ? "Solo presupuestado — no existe cotizacion"
                              : canEdit ? "Click para marcar como solo presupuestado" : "Solo presupuestado"}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <EditableCell value={item.proveedor || ""} onSave={v => updateItem(item.id, "proveedor", v)} className="text-muted-foreground text-xs" placeholder="proveedor..." disabled={!canEdit} />
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        {canEdit ? (
                          <Select
                            value={item.assignedTo || "__none__"}
                            onValueChange={v => updateItem(item.id, "assignedTo", v === "__none__" ? "" : v)}
                          >
                            <SelectTrigger className="h-6 text-[10px] border-dashed min-w-[90px] px-1.5 gap-1">
                              <SelectValue placeholder="Assign..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                <span className="text-muted-foreground">Unassigned</span>
                              </SelectItem>
                              {portalUsers.map(u => (
                                <SelectItem key={u.id} value={u.name}>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold flex-shrink-0">{u.name.charAt(0)}</span>
                                    <span>{u.name}</span>
                                    <span className="text-muted-foreground text-[9px]">{u.organization}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : item.assignedTo ? (
                          <div className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold flex-shrink-0">{item.assignedTo.charAt(0)}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{item.assignedTo}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/30">--</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        {item.documento ? (
                          <div className="flex flex-col gap-0.5">
                            <a href={item.documento} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-600 truncate max-w-[100px]">
                              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">Ver imagen</span>
                            </a>
                            <EditableCell value={item.documento} onSave={v => updateItem(item.id, "documento", v)} className="text-blue-400/40 text-[9px]" placeholder="editar link..." disabled={!canEdit} />
                          </div>
                        ) : (
                          <EditableCell value="" onSave={v => updateItem(item.id, "documento", v)} className="text-blue-400/40 text-[9px]" placeholder="+ link img" disabled={!canEdit} />
                        )}
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={canEdit ? () => toggleField(item.id, "validarCosto") : undefined}
                              className={cn(
                                "inline-flex items-center justify-center w-6 h-6 rounded transition-colors",
                                !canEdit && "cursor-default",
                                item.validarCosto
                                  ? "bg-red-500/15 text-red-500 border border-red-500/30"
                                  : "bg-muted/30 text-muted-foreground/25 border border-transparent"
                              )}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] text-xs">
                            {item.validarCosto
                              ? "Marcado: validar costo / cotizar con otros proveedores"
                              : canEdit ? "Click para marcar como costo a validar" : "Validar costo"}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={canEdit ? () => toggleField(item.id, "contratarAparte") : undefined}
                              className={cn(
                                "inline-flex items-center justify-center w-6 h-6 rounded transition-colors",
                                !canEdit && "cursor-default",
                                item.contratarAparte
                                  ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                                  : "bg-muted/30 text-muted-foreground/25 border border-transparent"
                              )}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] text-xs">
                            {item.contratarAparte
                              ? "Marcado: contratar por aparte para evitar costos inflados"
                              : canEdit ? "Click para marcar como contratar por aparte" : "Contratar aparte"}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={canEdit ? () => toggleField(item.id, "accionRequerida") : undefined}
                              className={cn(
                                "inline-flex items-center justify-center w-6 h-6 rounded transition-colors",
                                !canEdit && "cursor-default",
                                item.accionRequerida
                                  ? "bg-orange-500/15 text-orange-500 border border-orange-500/30"
                                  : "bg-muted/30 text-muted-foreground/25 border border-transparent"
                              )}
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] text-xs">
                            {item.accionRequerida
                              ? "Acción requerida — este item necesita seguimiento"
                              : canEdit ? "Click para marcar como acción requerida" : "Acción requerida"}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={canEdit ? () => toggleField(item.id, "niceToHave") : undefined}
                              className={cn(
                                "inline-flex items-center justify-center w-6 h-6 rounded transition-colors",
                                !canEdit && "cursor-default",
                                item.niceToHave
                                  ? "bg-purple-500/15 text-purple-500 border border-purple-500/30"
                                  : "bg-muted/30 text-muted-foreground/25 border border-transparent"
                              )}
                            >
                              <Star className={cn("w-3.5 h-3.5", item.niceToHave && "fill-purple-500")} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] text-xs">
                            {item.niceToHave
                              ? "Nice to Have — deseable pero no esencial"
                              : canEdit ? "Click para marcar como nice to have" : "Nice to have"}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      {canEdit && (
                        <td className="px-1 py-1.5 align-top">
                          <div className="flex items-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary" onClick={() => openEditModal(item)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit item</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => deleteItem(item.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete item</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      )}
                    </tr>
                  )) : [])
                ];
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30">
                <td className="sticky-col-0 px-2 py-3 bg-[hsl(var(--muted))]"></td>
                <td className="sticky-col-1 px-2 py-3 bg-[hsl(var(--muted))]"></td>
                <td className="sticky-col-2 px-2 py-3 font-semibold text-muted-foreground text-xs bg-[hsl(var(--muted))]">
                  TOTAL -- {filtered.length} items
                </td>
                <td colSpan={19} className="px-3 py-3">
                </td>
                <td className="px-2 py-3 text-right font-bold text-sm text-primary font-mono">
                  {formatUSD(totalBudget)}
                </td>
                <td colSpan={11}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Budget Item</DialogTitle>
            <DialogDescription>Fill in the fields below to add a new budget line item.</DialogDescription>
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
              <ComboInput value={newItem.area || ""} onChange={v => setNewItem(p => ({ ...p, area: v }))} options={allAreas} placeholder="Seleccionar o crear..." />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Centro de Costo</label>
              <ComboInput value={newItem.centroCosto || ""} onChange={v => setNewItem(p => ({ ...p, centroCosto: v }))} options={allCentros} placeholder="Seleccionar o crear..." />
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
            <div className="flex items-end gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={newItem.inKind || false} onChange={e => setNewItem(p => ({ ...p, inKind: e.target.checked }))} className="rounded border-border" />
                In-Kind?
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={newItem.exentoIva || false} onChange={e => setNewItem(p => ({ ...p, exentoIva: e.target.checked }))} className="rounded border-border" />
                Exento IVA?
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={newItem.aplicaTurismo || false} onChange={e => setNewItem(p => ({ ...p, aplicaTurismo: e.target.checked }))} className="rounded border-border" />
                Turismo 5%?
              </label>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Cotizacion</label>
              <Input value={newItem.cotizacion} onChange={e => setNewItem(p => ({ ...p, cotizacion: e.target.value }))} placeholder="A2, PENDING..." />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Imagen de Referencia</label>
              <Input value={newItem.documento} onChange={e => setNewItem(p => ({ ...p, documento: e.target.value }))} placeholder="URL de imagen..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={addItem} disabled={!newItem.item}>Add Item</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Budget Item</DialogTitle>
            <DialogDescription>Modify the fields below and click Save Changes.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 mt-2 text-sm">
            <div className="col-span-3">
              <label className="text-xs font-medium mb-1 block">Item Name *</label>
              <Input value={editItem.item || ""} onChange={e => setEditItem(p => ({ ...p, item: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Evento</label>
              <Select value={editItem.evento || "MAIN EVENT"} onValueChange={v => setEditItem(p => ({ ...p, evento: v }))}>
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
              <ComboInput value={editItem.area || ""} onChange={v => setEditItem(p => ({ ...p, area: v }))} options={allAreas} placeholder="Seleccionar o crear..." />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Centro de Costo</label>
              <ComboInput value={editItem.centroCosto || ""} onChange={v => setEditItem(p => ({ ...p, centroCosto: v }))} options={allCentros} placeholder="Seleccionar o crear..." />
            </div>
            <div className="col-span-3">
              <label className="text-xs font-medium mb-1 block">Descripcion</label>
              <Input value={editItem.descripcion || ""} onChange={e => setEditItem(p => ({ ...p, descripcion: e.target.value }))} />
            </div>
            <div className="col-span-3">
              <label className="text-xs font-medium mb-1 block">Notas / Observaciones</label>
              <Input value={editItem.notas || ""} onChange={e => setEditItem(p => ({ ...p, notas: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Qty</label>
              <Input type="number" value={editItem.qty ?? 0} onChange={e => setEditItem(p => ({ ...p, qty: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">UoM</label>
              <Input value={editItem.uom || ""} onChange={e => setEditItem(p => ({ ...p, uom: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Precio Unitario</label>
              <Input type="number" step="0.01" value={editItem.precioUnitario ?? 0} onChange={e => setEditItem(p => ({ ...p, precioUnitario: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Tipo de Contratacion</label>
              <Select value={editItem.porDias || "NO"} onValueChange={v => setEditItem(p => ({ ...p, porDias: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SI">Por Dia</SelectItem>
                  <SelectItem value="NO">One-Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Qty Dias</label>
              <Input type="number" value={editItem.qtyDias ?? 1} onChange={e => setEditItem(p => ({ ...p, qtyDias: parseFloat(e.target.value) || 1 }))} />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={editItem.agencyFee || false} onChange={e => setEditItem(p => ({ ...p, agencyFee: e.target.checked }))} className="rounded border-border" />
                Via Aurora 360?
              </label>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Fee incluido en cotizacion?</label>
              <Select value={editItem.aplicaFee || "NO"} onValueChange={v => setEditItem(p => ({ ...p, aplicaFee: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SI">SI (ya incluido)</SelectItem>
                  <SelectItem value="NO">NO (se agrega 20%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Proveedor</label>
              <Input value={editItem.proveedor || ""} onChange={e => setEditItem(p => ({ ...p, proveedor: e.target.value }))} />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={editItem.inKind || false} onChange={e => setEditItem(p => ({ ...p, inKind: e.target.checked }))} className="rounded border-border" />
                In-Kind?
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={editItem.exentoIva || false} onChange={e => setEditItem(p => ({ ...p, exentoIva: e.target.checked }))} className="rounded border-border" />
                Exento IVA?
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={editItem.aplicaTurismo || false} onChange={e => setEditItem(p => ({ ...p, aplicaTurismo: e.target.checked }))} className="rounded border-border" />
                Aplica Turismo 5%?
              </label>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Cotizacion</label>
              <Input value={editItem.cotizacion || ""} onChange={e => setEditItem(p => ({ ...p, cotizacion: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Imagen de Referencia</label>
              <Input value={editItem.documento || ""} onChange={e => setEditItem(p => ({ ...p, documento: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={saveEditItem} disabled={!editItem.item}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <SubEventsManagerDialog
        open={showSubEventsManager}
        onOpenChange={setShowSubEventsManager}
        subEvents={subEvents}
        items={items}
        canEdit={canEditTaxonomy}
        onSave={setSubEvents}
      />
    </div>
  );
}
