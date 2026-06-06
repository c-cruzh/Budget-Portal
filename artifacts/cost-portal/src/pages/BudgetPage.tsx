import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Search, Download, Plus, ChevronRight, ChevronDown, ChevronUp, ChevronsUpDown, Info,
  Tag, Trash2, AlertTriangle, ShieldAlert, MessageSquare, ExternalLink,
  Cloud, CloudOff, Loader2, Pencil, UserCircle, FileText, Flag, CheckCircle2, Star, Settings, Columns2, ListPlus, MapPin, Lock, SendHorizontal, Truck, PackageCheck, PackageX
} from "lucide-react";
import { CreateTaskFromItemDialog } from "@/components/CreateTaskFromItemDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { FlagsChips, type FlagKey } from "@/components/budget/FlagsChips";
import { ColumnsMenu } from "@/components/budget/ColumnsMenu";
import { FiltersPopover, type ActiveFilterChip } from "@/components/budget/FiltersPopover";
import { BulkActionsBar } from "@/components/budget/BulkActionsBar";
import { BudgetHelpGuide } from "@/components/budget/BudgetHelpGuide";
import { BUDGET_COLUMNS, DEFAULT_VISIBLE } from "@/components/budget/columns";
import type { LinkedBudgetItem } from "@/data/tasksBoardData";
import { INITIAL_BUDGET_ITEMS, DEFAULT_SUB_EVENT_ID, STATUS_COLORS, STATUS_SHORT_LABELS, derivePhase, phaseSpaceDay, spaceOptionGroupsForItem, allSpaceRefs, itemSpaceName, itemLugar, allLugares, migrateItems, type BudgetItem, type QuoteOption, type SubEvent, type SpaceDayKey } from "@/data/budgetData";
import { recalcItem, computeTransportAllocations, getItemDataIssues } from "@/lib/budgetCalc";
import { DataIssueBadges } from "@/components/budget/DataIssueBadges";
import { useBudgetApi } from "@/hooks/useBudgetApi";
import { useSubEventsApi } from "@/hooks/useSubEventsApi";
import { useSpacesApi } from "@/hooks/useSpacesApi";
import { SpaceCell } from "@/components/budget/SpaceCell";
import { SpacesSheet, type SpaceLoadInfo } from "@/components/budget/SpacesSheet";
import { useAuth } from "@/hooks/useAuth";
import { ComboInput } from "@/components/ComboInput";
import { BudgetItemDialog } from "@/components/budget/BudgetItemDialog";
import { CostBreakdown } from "@/components/budget/CostBreakdown";
import { SubEventsManagerDialog } from "@/components/SubEventsManagerDialog";
import { SplitByDayDialog } from "@/components/SplitByDayDialog";
import { BulkSplitByDayDialog } from "@/components/BulkSplitByDayDialog";
import { toast } from "@/hooks/use-toast";
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

function SortableHeader({ label, sortKey, current, dir, onSort, align = "left" }: { label: string; sortKey: string; current: string | null; dir: "asc" | "desc"; onSort: (key: string) => void; align?: "left" | "center" | "right" }) {
  const active = current === sortKey;
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn("flex items-center gap-1 select-none hover:text-foreground transition-colors w-full", align === "right" && "justify-end", align === "center" && "justify-center", active && "text-primary")}
    >
      <span>{label}</span>
      <Icon className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />
    </button>
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

function getFeeProductora(item: BudgetItem): number {
  if (!item.agencyFee) return 0;
  return item.fee > 0 ? item.fee : (item.feeIncluido || 0);
}

function RedactedMark() {
  return (
    <span
      className="inline-flex items-center justify-center text-muted-foreground/40"
      title="Costo oculto"
    >
      <Lock className="w-3 h-3" />
    </span>
  );
}

// The "Día" column shows the item's event phase (subEventId). It is unified with
// the colored phase tag in the item cell — both edit the same value, so they can
// never contradict. Picking a phase here updates the badge and the grouping.
function PhaseCell({ value, name, color, subEvents, canEdit, onChange }: {
  value: string | undefined;
  name: string;
  color: string;
  subEvents: SubEvent[];
  canEdit: boolean;
  onChange: (id: string) => void;
}) {
  const badge = (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded border font-medium whitespace-nowrap"
      style={{
        color,
        backgroundColor: `${color}1a`,
        borderColor: `${color}33`,
      }}
    >
      {name}
    </span>
  );
  if (!canEdit) return badge;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer hover:opacity-80 transition-opacity">{badge}</button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="center">
        {subEvents.map(s => (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={cn(
              "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted",
              s.id === value && "bg-primary/10 text-primary"
            )}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || "#94a3b8" }} />
              {s.name}
            </span>
            {s.id === value && <span className="text-[10px]">✓</span>}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

const SEED_ITEMS = INITIAL_BUDGET_ITEMS.map(recalcItem);

interface BudgetPageProps {
  /** API endpoint to read/write budget items. Defaults to the legacy budget. */
  apiUrl?: string;
  /** Whether to sync from seed-data.json. The "Final" budget starts empty. */
  syncSeed?: boolean;
  /** Seed items used as fallback. Empty for the "Final" budget. */
  seedItems?: BudgetItem[];
  /** Show a "Deprecated" banner at the top of the page (legacy budget). */
  deprecated?: boolean;
}

export default function BudgetPage({
  apiUrl = "/api/budget-items",
  syncSeed = true,
  seedItems = SEED_ITEMS,
  deprecated = false,
}: BudgetPageProps = {}) {
  const { items, setItems, loading, error, meta, saveCommentOnly, patchItem, saveFull } = useBudgetApi(seedItems, recalcItem, { apiUrl, syncSeed });
  const { subEvents, setSubEvents } = useSubEventsApi();
  const { spaces, loading: spacesLoading, addSpace, setCapacityById, renameSpaceById, removeSpaceById } = useSpacesApi();
  const { permissions, user } = useAuth();
  const canEdit = permissions.canEdit;
  const canComment = permissions.canComment;
  const canEditTaxonomy = (user?.organization || "") === "C2 LABS";
  const redactMode = (user?.organization || "") === "AURORA360";
  const isAuroraOwned = useCallback((it: BudgetItem) => {
    if (it.agencyFee === true) return true;
    const p = (it.proveedor || "").toUpperCase().replace(/\s+/g, "");
    return p.includes("AURORA360");
  }, []);
  const [search, setSearch] = useState("");
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [filterSubEvents, setFilterSubEvents] = useState<Set<string>>(new Set());
  const [showSubEventsManager, setShowSubEventsManager] = useState(false);
  const [showSpacesSheet, setShowSpacesSheet] = useState(false);

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
  const [filterArea, setFilterArea] = useState("ALL");
  const [filterLugar, setFilterLugar] = useState("ALL");
  const [filterEspacio, setFilterEspacio] = useState("ALL");
  const [filterCentro, setFilterCentro] = useState("ALL");
  const [filterProveedor, setFilterProveedor] = useState("ALL");
  const [filterProductora, setFilterProductora] = useState("ALL");
  const [filterFeeEnCotiz, setFilterFeeEnCotiz] = useState("ALL");
  const [filterCotizacion, setFilterCotizacion] = useState("ALL");
  const [filterAsignado, setFilterAsignado] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterInKind, setFilterInKind] = useState("ALL");
  const [filterPrecio, setFilterPrecio] = useState("ALL");
  // Data-quality issue filter: ALL | ANY | INCOMPLETE | ZERO | NOTRANSPORT
  const [filterIssue, setFilterIssue] = useState("ALL");
  const [filterQtyDias, setFilterQtyDias] = useState<Set<number>>(new Set());
  const [filterPhase, setFilterPhase] = useState<string>("ALL");
  const [filterPending, setFilterPending] = useState(false);
  const [filterAccionReq, setFilterAccionReq] = useState(false);
  const [filterValidar, setFilterValidar] = useState(false);
  const [filterAparte, setFilterAparte] = useState(false);
  const [filterNiceToHave, setFilterNiceToHave] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>("budget.visibleColumns.v1", DEFAULT_VISIBLE);
  const [density, setDensity] = useLocalStorage<"compact" | "comfortable">("budget.density.v1", "compact");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingToFinal, setSendingToFinal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const colVisible = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const isCol = useCallback((id: string) => colVisible.has(id) || BUDGET_COLUMNS.find(c => c.id === id)?.always, [colVisible]);
  const cellPadY = density === "comfortable" ? "py-2.5" : "py-1.5";
  const cellTextSize = density === "comfortable" ? "text-sm" : "text-xs";

  const toggleSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev !== key) { setSortDir("asc"); return key; }
      if (sortDir === "asc") { setSortDir("desc"); return key; }
      return null;
    });
  }, [sortDir]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<Partial<BudgetItem>>({});
  const [splitItem, setSplitItem] = useState<BudgetItem | null>(null);
  const [bulkSplitOpen, setBulkSplitOpen] = useState(false);
  const [taskForItem, setTaskForItem] = useState<{ link: LinkedBudgetItem; notes: string } | null>(null);
  const [newItem, setNewItem] = useState<Partial<BudgetItem>>({
    evento: "MAIN EVENT", subEventId: DEFAULT_SUB_EVENT_ID, area: "", centroCosto: "", item: "", descripcion: "", notas: "",
    inKind: false, agencyFee: false, qty: 1, uom: "", porDias: "NO", qtyDias: 1,
    precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0,
    cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false, ivaMode: "raw", soloPresupuestado: false, accionRequerida: false, statusCotizacion: "",
  });

  const subEventFilteredItems = useMemo(() => {
    if (filterSubEvents.size === 0) return items;
    return items.filter(i => filterSubEvents.has(derivePhase(i)));
  }, [items, filterSubEvents]);
  const areas = useMemo(() => {
    return ["ALL", ...Array.from(new Set(subEventFilteredItems.map(i => i.area).filter(v => v && v.trim())))];
  }, [subEventFilteredItems]);
  const centros = useMemo(() => {
    let src = subEventFilteredItems;
    if (filterArea !== "ALL") src = src.filter(i => i.area === filterArea);
    return ["ALL", ...Array.from(new Set(src.map(i => i.centroCosto).filter(v => v && v.trim())))];
  }, [subEventFilteredItems, filterArea]);

  // All resolvable rooms across ESEN days + day-independent venues (by stable id).
  const spaceRefs = useMemo(() => allSpaceRefs(spaces), [spaces]);

  // Stable room id → Lugar/Sede label, for showing the place under each item's space.
  const placeLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of spaceRefs) if (!map.has(r.id)) map.set(r.id, r.placeLabel);
    return map;
  }, [spaceRefs]);

  // Effective display name set for the filter dropdown: every catalog room name
  // plus any orphan legacy name still carried by an item.
  const allSpaces = useMemo(() => {
    const set = new Set<string>();
    for (const r of spaceRefs) if (r.name) set.add(r.name);
    for (const i of items) {
      const n = itemSpaceName(spaces, i).trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [spaceRefs, spaces, items]);

  // Distinct Lugares/Sedes (ESEN + venues) for the Lugar/Sede filter dropdown.
  const lugares = useMemo(() => allLugares(spaces), [spaces]);

  // Aforo/capacity: assigned load per room id (sum of item quantities).
  const spaceLoadInfo = useMemo<SpaceLoadInfo[]>(() => {
    const caps = spaces.capacitiesById || {};
    const load = new Map<string, number>();
    const count = new Map<string, number>();
    for (const i of items) {
      const id = (i.espacioId || "").trim();
      if (!id) continue;
      load.set(id, (load.get(id) || 0) + (Number(i.qty) || 0));
      count.set(id, (count.get(id) || 0) + 1);
    }
    return spaceRefs
      .map(r => {
        const capacity = caps[r.id] ?? r.aforo;
        const l = load.get(r.id) || 0;
        return {
          id: r.id,
          name: r.name,
          placeLabel: r.placeLabel,
          dayKey: r.dayKey,
          capacity,
          load: l,
          over: capacity != null && l > capacity,
          itemCount: count.get(r.id) || 0,
        };
      })
      .sort((a, b) => a.placeLabel.localeCompare(b.placeLabel) || a.name.localeCompare(b.name));
  }, [spaceRefs, items, spaces.capacitiesById]);

  const overCapacity = useMemo(
    () => spaceLoadInfo.filter(s => s.over && s.capacity != null),
    [spaceLoadInfo],
  );

  const overSpaceIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of spaceLoadInfo) if (s.over) set.add(s.id);
    return set;
  }, [spaceLoadInfo]);

  const allAreas = useMemo(() => Array.from(new Set(items.map(i => i.area).filter(v => v && v.trim()))).sort(), [items]);
  const allCentros = useMemo(() => Array.from(new Set(items.map(i => i.centroCosto).filter(v => v && v.trim()))).sort(), [items]);
  // Zonas from the Espacios catalog (both days, de-duplicated) — used to populate
  // the Area / Zona picker in the item dialogs so it mirrors the venue layout.
  const allZones = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (z?: string) => {
      const v = (z || "").trim();
      if (!v) return;
      const k = v.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(v);
    };
    for (const e of spaces.entries?.["dia-1"] || []) add(e.zone);
    for (const e of spaces.entries?.["dia-2"] || []) add(e.zone);
    for (const v of spaces.venues || []) {
      for (const e of v.entries) add(e.zone);
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [spaces]);

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

  const qtyDiasOptions = useMemo(() => {
    const vals = new Set<number>();
    for (const i of items) {
      const n = Number(i.qtyDias);
      if (Number.isFinite(n) && n > 0) vals.add(n);
    }
    return Array.from(vals).sort((a, b) => a - b);
  }, [items]);

  const statusOptions = useMemo(() => {
    const hasBlank = items.some(i => !(i.statusCotizacion || "").trim());
    const set = new Set(items.map(i => (i.statusCotizacion || "").trim()).filter(v => v.length > 0));
    const sorted = Array.from(set).sort();
    return hasBlank ? ["ALL", "(Sin status)", ...sorted] : ["ALL", ...sorted];
  }, [items]);

  // Display-only transport traceability. Computed over ALL items (not just the
  // filtered view) so links resolve even when the covered item is filtered out.
  // This never feeds into totalBudget — the grand total stays the plain sum of
  // i.total, so transport cost is counted exactly once regardless of mode.
  const transportInfo = useMemo(() => computeTransportAllocations(items), [items]);

  // Per-item data-quality issues, indexed by id, reused by both the row badges
  // and the issue filter so the chip count and the visible badges always agree.
  const issuesByItem = useMemo(() => {
    const m = new Map<string, ReturnType<typeof getItemDataIssues>>();
    for (const i of items) {
      const iss = getItemDataIssues(i, transportInfo);
      if (iss.length > 0) m.set(i.id, iss);
    }
    return m;
  }, [items, transportInfo]);

  const filtered = useMemo(() => {
    let out = items;
    if (filterSubEvents.size > 0) out = out.filter(i => filterSubEvents.has(derivePhase(i)));
    if (filterArea !== "ALL") out = out.filter(i => i.area === filterArea);
    if (filterLugar === "(Sin asignar)") out = out.filter(i => !itemLugar(spaces, i));
    else if (filterLugar !== "ALL") out = out.filter(i => itemLugar(spaces, i) === filterLugar);
    if (filterEspacio === "(Sin asignar)") out = out.filter(i => !itemSpaceName(spaces, i).trim());
    else if (filterEspacio !== "ALL") out = out.filter(i => itemSpaceName(spaces, i) === filterEspacio);
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
    if (filterIssue === "ANY") out = out.filter(i => issuesByItem.has(i.id));
    else if (filterIssue === "INCOMPLETE") out = out.filter(i => (issuesByItem.get(i.id) || []).some(x => x.key === "incomplete"));
    else if (filterIssue === "ZERO") out = out.filter(i => (issuesByItem.get(i.id) || []).some(x => x.key === "zerocost"));
    else if (filterIssue === "NOTRANSPORT") out = out.filter(i => (issuesByItem.get(i.id) || []).some(x => x.key === "notransport"));
    if (filterQtyDias.size > 0) out = out.filter(i => filterQtyDias.has(Number(i.qtyDias)));
    if (filterPhase !== "ALL") out = out.filter(i => derivePhase(i) === filterPhase);
    if (filterPending) out = out.filter(i => i.cotizacion === "PENDING");
    if (filterAccionReq) out = out.filter(i => i.accionRequerida);
    if (filterValidar) out = out.filter(i => i.validarCosto);
    if (filterAparte) out = out.filter(i => i.contratarAparte);
    if (filterNiceToHave) out = out.filter(i => i.niceToHave);
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
  }, [items, spaces, issuesByItem, filterSubEvents, filterArea, filterLugar, filterEspacio, filterCentro, filterProveedor, filterProductora, filterFeeEnCotiz, filterCotizacion, filterAsignado, filterStatus, filterInKind, filterPrecio, filterIssue, filterQtyDias, filterPhase, filterPending, filterAccionReq, filterValidar, filterAparte, filterNiceToHave, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    const get = (it: BudgetItem): string | number => {
      switch (sortKey) {
        case "item": return (it.item || "").toLowerCase();
        case "qty": return Number(it.qty) || 0;
        case "precioUnit": return Number(it.precioUnitario) || 0;
        case "dias": return Number(it.qtyDias) || 0;
        case "total": return Number(it.total) || 0;
        case "proveedor": return (it.proveedor || "").toLowerCase();
        case "status": return (it.statusCotizacion || "").toLowerCase();
        case "assigned": return (it.assignedTo || "").toLowerCase();
        default: return 0;
      }
    };
    return [...filtered].sort((a, b) => {
      const va = get(a); const vb = get(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const parentKeyOf = useCallback((it: BudgetItem) => {
    return `${(it.item || "").trim().toLowerCase()}|${it.area || ""}|${it.centroCosto || ""}|${it.evento || ""}`;
  }, []);

  const multiDayGroups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      const k = parentKeyOf(it);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return counts;
  }, [items, parentKeyOf]);

  const grouped = useMemo(() => {
    const map = new Map<string, { subEventId: string; evento: string; area: string; centroCosto: string; items: BudgetItem[] }>();
    sorted.forEach(item => {
      const seId = derivePhase(item);
      const cc = item.centroCosto || "(Sin centro)";
      const key = `${seId}__${item.area}__${cc}`;
      if (!map.has(key)) map.set(key, { subEventId: seId, evento: item.evento, area: item.area, centroCosto: cc, items: [] });
      map.get(key)!.items.push(item);
    });
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      const oa = subEventOrder(a[1].subEventId);
      const ob = subEventOrder(b[1].subEventId);
      if (oa !== ob) return oa - ob;
      const ac = a[1].area.localeCompare(b[1].area);
      if (ac !== 0) return ac;
      return a[1].centroCosto.localeCompare(b[1].centroCosto);
    });
    return new Map(entries);
  }, [sorted, subEventOrder]);

  type RenderRow =
    | { kind: "single"; item: BudgetItem }
    | { kind: "parent"; key: string; sample: BudgetItem; children: BudgetItem[]; total: number; sumQty: number; sumDias: number };

  const renderRowsByGroup = useMemo(() => {
    const out = new Map<string, RenderRow[]>();
    for (const [gKey, group] of grouped.entries()) {
      const byParent = new Map<string, BudgetItem[]>();
      const order: string[] = [];
      for (const it of group.items) {
        const k = parentKeyOf(it);
        if (!byParent.has(k)) { byParent.set(k, []); order.push(k); }
        byParent.get(k)!.push(it);
      }
      const rows: RenderRow[] = [];
      for (const k of order) {
        const arr = byParent.get(k)!;
        const totalAcross = (multiDayGroups.get(k) || 1);
        if (arr.length > 1 || totalAcross > 1 && arr.length === totalAcross) {
          if (arr.length > 1) {
            rows.push({
              kind: "parent",
              key: `${gKey}::${k}`,
              sample: arr[0],
              children: arr,
              total: arr.reduce((s, x) => s + x.total, 0),
              sumQty: arr.reduce((s, x) => s + (Number(x.qty) || 0), 0),
              sumDias: arr.reduce((s, x) => s + (Number(x.qtyDias) || 0), 0),
            });
          } else {
            rows.push({ kind: "single", item: arr[0] });
          }
        } else {
          rows.push({ kind: "single", item: arr[0] });
        }
      }
      out.set(gKey, rows);
    }
    return out;
  }, [grouped, parentKeyOf, multiDayGroups]);

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
      const id = derivePhase(it);
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
        const recalcFields = ["qty", "qtyDias", "dia", "subEventId", "precioUnitario", "porDias", "aplicaFee", "agencyFee", "inKind", "exentoIva", "ivaMode", "aplicaTurismo"] as const;
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

  const sendToFinal = useCallback(async (itemsToSend: BudgetItem[]) => {
    if (itemsToSend.length === 0) return;
    if (sendingToFinal) return;
    setSendingToFinal(true);
    const genId = () => (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const res = await fetch("/api/budget-items-final", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const existing: BudgetItem[] = Array.isArray(data.items) ? data.items : [];
      const cloned = itemsToSend.map(it => ({ ...it, id: genId() }));
      const next = [...existing, ...cloned];
      const saveRes = await fetch("/api/budget-items-final", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: next }),
      });
      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${saveRes.status}`);
      }
      toast({
        title: itemsToSend.length === 1
          ? "Item enviado a Budget Final"
          : `${itemsToSend.length} items enviados a Budget Final`,
      });
    } catch (err: any) {
      toast({
        title: "Error al enviar a Budget Final",
        description: err.message || "Intenta de nuevo",
        variant: "destructive",
      });
    } finally {
      setSendingToFinal(false);
    }
  }, [sendingToFinal]);

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
    setEditItem({ ...item, subEventId: derivePhase(item) });
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
          subEventId: editItem.subEventId,
          area: editItem.area ?? i.area,
          dia: editItem.dia ?? i.dia,
          espacioId: editItem.espacioId ?? i.espacioId,
          espacioDia1: "",
          espacioDia2: "",
          centroCosto: editItem.centroCosto ?? i.centroCosto,
          item: editItem.item || i.item,
          descripcion: editItem.descripcion ?? i.descripcion,
          notas: editItem.notas ?? i.notas,
          inKind: editItem.inKind ?? i.inKind,
          agencyFee: editItem.agencyFee ?? i.agencyFee,
          qty: Number(editItem.qty) || i.qty,
          uom: editItem.uom ?? i.uom,
          porDias: editItem.porDias ?? i.porDias,
          qtyDias: (editItem.porDias ?? i.porDias) === "SI" ? Math.max(1, Number(editItem.qtyDias) || 1) : 1,
          precioUnitario: Number(editItem.precioUnitario) ?? i.precioUnitario,
          aplicaFee: editItem.aplicaFee ?? i.aplicaFee,
          cotizacion: editItem.cotizacion ?? i.cotizacion,
          cotizacionLink: editItem.cotizacionLink ?? i.cotizacionLink,
          documento: editItem.documento ?? i.documento,
          proveedor: editItem.proveedor ?? i.proveedor,
          assignedTo: editItem.assignedTo ?? i.assignedTo,
          ivaMode: editItem.ivaMode ?? i.ivaMode ?? (i.exentoIva ? "exento" : "raw"),
          aplicaTurismo: editItem.aplicaTurismo ?? i.aplicaTurismo ?? false,
          validarCosto: editItem.validarCosto ?? i.validarCosto ?? false,
          contratarAparte: editItem.contratarAparte ?? i.contratarAparte ?? false,
          accionRequerida: editItem.accionRequerida ?? i.accionRequerida ?? false,
          niceToHave: editItem.niceToHave ?? i.niceToHave ?? false,
          soloPresupuestado: editItem.soloPresupuestado ?? i.soloPresupuestado ?? false,
          statusCotizacion: editItem.statusCotizacion ?? i.statusCotizacion ?? "",
          isTransport: editItem.isTransport ?? i.isTransport ?? false,
          transportMode: editItem.transportMode ?? i.transportMode,
          coveredItemIds: editItem.coveredItemIds ?? i.coveredItemIds,
          transporteNoAplica: editItem.transporteNoAplica ?? i.transporteNoAplica ?? false,
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
      // Phase is a required field in the dialog (no NO APLICA option), so this is
      // always a real phase; the fallback only guards a never-touched default.
      subEventId: newItem.subEventId || DEFAULT_SUB_EVENT_ID,
      area: newItem.area || "",
      espacioId: newItem.espacioId || "",
      espacioDia1: "",
      espacioDia2: "",
      centroCosto: newItem.centroCosto || "",
      item: newItem.item || "",
      descripcion: newItem.descripcion || "",
      notas: newItem.notas || "",
      inKind: newItem.inKind || false,
      agencyFee: newItem.agencyFee || false,
      qty: newItem.qty || 0,
      uom: newItem.uom || "",
      porDias: newItem.porDias || "NO",
      qtyDias: (newItem.porDias || "NO") === "SI" ? Math.max(1, Number(newItem.qtyDias) || 1) : 1,
      precioUnitario: Number(newItem.precioUnitario) || 0,
      subtotal: 0, aplicaFee: newItem.aplicaFee || "NO",
      fee: 0, subtotalConFee: 0, iva: 0, total: 0,
      cotizacion: newItem.cotizacion || "",
      documento: newItem.documento || "",
      proveedor: newItem.proveedor || "",
      assignedTo: newItem.assignedTo || "",
      validarCosto: newItem.validarCosto || false,
      contratarAparte: newItem.contratarAparte || false,
      cotizacionLink: newItem.cotizacionLink || "",
      ivaMode: newItem.ivaMode || "raw",
      aplicaTurismo: newItem.aplicaTurismo || false,
      soloPresupuestado: newItem.soloPresupuestado || false,
      accionRequerida: newItem.accionRequerida || false,
      niceToHave: newItem.niceToHave || false,
      statusCotizacion: newItem.statusCotizacion || "",
      isTransport: newItem.isTransport || false,
      transportMode: newItem.transportMode,
      coveredItemIds: newItem.coveredItemIds,
      transporteNoAplica: newItem.transporteNoAplica || false,
    };
    setItems(prev => {
      const next = [...prev, recalc(base)];
      saveFull(next);
      return next;
    });
    // Auto-expand the group the new item lands in so it's immediately visible
    // (groups are collapsed by default; important when starting from an empty table).
    const seId = derivePhase(base);
    const cc = base.centroCosto || "(Sin centro)";
    const groupKey = `${seId}__${base.area}__${cc}`;
    setExpandedAreas(prev => {
      const nextSet = new Set(prev);
      nextSet.add(groupKey);
      return nextSet;
    });
    setShowAddModal(false);
    setNewItem({ evento: "MAIN EVENT", subEventId: DEFAULT_SUB_EVENT_ID, area: "", centroCosto: "", item: "", descripcion: "", notas: "", inKind: false, agencyFee: false, qty: 1, uom: "", porDias: "NO", qtyDias: 1, precioUnitario: 0, subtotal: 0, aplicaFee: "NO", fee: 0, subtotalConFee: 0, iva: 0, total: 0, cotizacion: "", cotizacionLink: "", documento: "", proveedor: "", validarCosto: false, contratarAparte: false, ivaMode: "raw", aplicaTurismo: false, soloPresupuestado: false, accionRequerida: false, statusCotizacion: "", isTransport: false, transportMode: undefined, coveredItemIds: [], transporteNoAplica: false });
  }, [newItem, setItems, saveFull]);

  const updateComment = useCallback((id: string, field: "notas" | "descripcion", value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    }));
    patchItem(id, field, value, true);
  }, [setItems, patchItem]);

  // Assigns a room to an item by stable id (clearing legacy day fields). Pass an
  // empty id to unassign. Never touches monetary fields.
  const assignSpace = useCallback((itemId: string, spaceId: string) => {
    const id = (spaceId || "").trim();
    setItems(prev => {
      let changed = false;
      const next = prev.map(it => {
        if (it.id !== itemId) return it;
        if ((it.espacioId || "") === id && !(it.espacioDia1 || "") && !(it.espacioDia2 || "")) return it;
        changed = true;
        return { ...it, espacioId: id, espacioDia1: "", espacioDia2: "" };
      });
      if (changed) saveFull(next);
      return next;
    });
  }, [setItems, saveFull]);

  const handleRenameSpace = useCallback((id: string, newName: string) => {
    // Catalog rename only — items reference the room by stable id, so no item edits.
    renameSpaceById(id, newName);
  }, [renameSpaceById]);

  const handleDeleteSpace = useCallback((id: string) => {
    removeSpaceById(id);
    setItems(prev => {
      let changed = false;
      const next = prev.map(it => {
        if ((it.espacioId || "").trim() === id) {
          changed = true;
          return { ...it, espacioId: "" };
        }
        return it;
      });
      if (changed) saveFull(next);
      return next;
    });
  }, [removeSpaceById, setItems, saveFull]);

  // One-shot migration: collapse legacy name-based space assignments to stable
  // `espacioId` references once both items and the spaces catalog have loaded.
  // Idempotent and monetary-neutral; persists only when the user can edit.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current) return;
    if (loading || spacesLoading) return;
    const { next, changed } = migrateItems(items, spaces);
    migratedRef.current = true;
    if (!changed) return;
    setItems(next);
    if (canEdit) saveFull(next);
  }, [loading, spacesLoading, items, spaces, canEdit, setItems, saveFull]);

  const toggleArea = (key: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleParent = (key: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(prev => {
      const visibleIds = filtered.map(i => i.id);
      const allSelected = visibleIds.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  }, [filtered]);

  const bulkUpdate = useCallback((mutator: (item: BudgetItem) => BudgetItem) => {
    setItems(prev => {
      const next = prev.map(it => selectedIds.has(it.id) ? recalcItem(mutator(it)) : it);
      saveFull(next);
      return next;
    });
  }, [setItems, saveFull, selectedIds]);

  const bulkDelete = useCallback(() => {
    setItems(prev => {
      const next = prev.filter(i => !selectedIds.has(i.id));
      saveFull(next);
      return next;
    });
    setSelectedIds(new Set());
    toast({ title: "Items borrados", description: `${selectedIds.size} items eliminados` });
  }, [setItems, saveFull, selectedIds]);

  const bulkExportCsv = useCallback(() => {
    const rows = items.filter(i => selectedIds.has(i.id));
    const headers = ["item", "evento", "area", "centroCosto", "qty", "precioUnitario", "total", "proveedor", "statusCotizacion"];
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Budget_Selection.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [items, selectedIds]);

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
      "IN-KIND?", "AURORA 360?", "QTY", "UoM", "DIA APLICABLE", "ESPACIO DIA 1", "ESPACIO DIA 2", "CONTRATACION POR DIAS?", "QTY DIAS",
      "PRECIO UNITARIO", "SUBTOTAL", "VIA PRODUCTORA (AURORA 360)?", "FEE INCL. EN COTIZACION?",
      "FEE 20%", "SUBTOTAL CON FEE", "IVA", "TOTAL", "COTIZACION", "SOLO PRESUPUESTADO?", "IMAGEN DE REFERENCIA", "PROVEEDOR",
      "REVIEWED BY", "VALIDAR COSTO?", "CONTRATAR APARTE?", "ACCIÓN REQUERIDA?", "NICE TO HAVE?", "COTIZACION LINK", "EXENTO IVA?", "ASSIGNED TO", "STATUS COTIZACION"
    ];
    const rows = filtered.map(i => {
      const redact = redactMode && !isAuroraOwned(i);
      return [
        subEventName(derivePhase(i)), i.evento, i.area, i.centroCosto, i.item, i.descripcion, i.notas,
        i.inKind ? "SI" : "NO", i.agencyFee ? "SI" : "NO", i.qty, i.uom, subEventName(derivePhase(i)),
        phaseSpaceDay(derivePhase(i)) === "dia-2" ? "" : itemSpaceName(spaces, i),
        phaseSpaceDay(derivePhase(i)) === "dia-2" ? itemSpaceName(spaces, i) : "",
        i.porDias, i.qtyDias, redact ? "" : i.precioUnitario, redact ? "" : i.subtotal, i.agencyFee ? "SI" : "NO",
        i.aplicaFee, redact ? "" : i.fee, redact ? "" : i.subtotalConFee, redact ? "" : i.iva, redact ? "" : i.total, i.cotizacion, i.soloPresupuestado ? "SI" : "NO", i.documento,
        i.proveedor || "", i.reviewedBy || "", i.validarCosto ? "SI" : "NO", i.contratarAparte ? "SI" : "NO",
        i.accionRequerida ? "SI" : "NO", i.niceToHave ? "SI" : "NO", i.cotizacionLink || "", i.exentoIva ? "SI" : "NO", i.assignedTo || "", i.statusCotizacion || "",
        i.aplicaTurismo ? "SI" : "NO", redact ? "" : (i.turismo || 0), redact ? "" : (i.feeIncluido || 0)
      ];
    });
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
      {deprecated && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <span className="font-semibold uppercase tracking-wide">Deprecated</span>
            {" — "}Esta es la versión vieja del Budget. La fuente de verdad ahora es{" "}
            <span className="font-semibold">Budget Items (Final)</span>. Los cambios aquí no afectan la versión Final.
          </div>
        </div>
      )}
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
            onValueChange={(v) => { setFilterSubEvents(v === "all" ? new Set() : new Set([v])); setFilterArea("ALL"); setFilterCentro("ALL"); }}
            className="flex-1 min-w-0"
          >
            <TabsList className="h-auto p-1 flex-wrap gap-1">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                Todos
              </TabsTrigger>
              {subEventSummaries.map(s => (
                <TabsTrigger
                  key={s.id}
                  value={s.id}
                  className="text-xs sm:text-sm"
                >
                  {s.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {canEdit && (
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSubEventsManager(true)}
                className="h-7 gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                Gestionar sub-eventos
              </Button>
            </div>
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

      {overCapacity.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <div className="flex items-center gap-2 text-destructive text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {overCapacity.length === 1
              ? "1 espacio supera su aforo"
              : `${overCapacity.length} espacios superan su aforo`}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {overCapacity.map((o) => (
              <span
                key={o.id}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-destructive/30 bg-card text-destructive"
                title={`${o.name} — ${o.placeLabel}: ${o.load} asignado, aforo ${o.capacity}`}
              >
                <span className="font-medium">{o.name}</span>
                <span className="opacity-70">· {o.placeLabel}</span>
                <span className="font-mono font-semibold tabular-nums">{o.load}/{o.capacity}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items, notes, proveedor..." className="pl-9 bg-card border-card-border" />
          </div>
          <Select value={filterArea} onValueChange={v => { setFilterArea(v); setFilterCentro("ALL"); }}>
            <SelectTrigger className="w-[220px] bg-card border-card-border"><SelectValue placeholder="Area" /></SelectTrigger>
            <SelectContent>{areas.map(a => <SelectItem key={a} value={a}>{a === "ALL" ? "All Areas" : a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterCentro} onValueChange={setFilterCentro}>
            <SelectTrigger className="w-[200px] bg-card border-card-border"><SelectValue placeholder="Cost Center" /></SelectTrigger>
            <SelectContent>{centros.map(c => <SelectItem key={c} value={c}>{c === "ALL" ? "All Centers" : c}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSpacesSheet(true)}>
              {overCapacity.length > 0 ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <MapPin className="w-4 h-4" />}
              Espacios
              {overCapacity.length > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                  {overCapacity.length}
                </span>
              )}
            </Button>
            <ColumnsMenu visible={visibleColumns} onChange={setVisibleColumns} density={density} onDensityChange={setDensity} />
            <BudgetHelpGuide />
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2"><Download className="w-4 h-4" />Export CSV</Button>
            {canEdit && (
              <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-2"><Plus className="w-4 h-4" />Add Item</Button>
            )}
          </div>
        </div>
        <FiltersPopover
          active={(() => {
            const chips: ActiveFilterChip[] = [];
            if (filterProveedor !== "ALL") chips.push({ key: "prov", label: `Prov: ${filterProveedor}`, onClear: () => setFilterProveedor("ALL") });
            if (filterProductora !== "ALL") chips.push({ key: "via", label: `Via Productora: ${filterProductora}`, onClear: () => setFilterProductora("ALL") });
            if (filterFeeEnCotiz !== "ALL") chips.push({ key: "fee", label: `Fee Cotiz: ${filterFeeEnCotiz}`, onClear: () => setFilterFeeEnCotiz("ALL") });
            if (filterCotizacion !== "ALL") chips.push({ key: "cot", label: `Cot: ${filterCotizacion}`, onClear: () => setFilterCotizacion("ALL") });
            if (filterAsignado !== "ALL") chips.push({ key: "asg", label: `Asig: ${filterAsignado}`, onClear: () => setFilterAsignado("ALL") });
            if (filterStatus !== "ALL") chips.push({ key: "st", label: `Status: ${filterStatus}`, onClear: () => setFilterStatus("ALL") });
            if (filterInKind !== "ALL") chips.push({ key: "ik", label: `In-Kind: ${filterInKind}`, onClear: () => setFilterInKind("ALL") });
            if (filterPrecio !== "ALL") chips.push({ key: "pr", label: `Precio: ${filterPrecio}`, onClear: () => setFilterPrecio("ALL") });
            if (filterIssue !== "ALL") {
              const issueLabel = filterIssue === "ANY" ? "Con alerta" : filterIssue === "INCOMPLETE" ? "Incompletos" : filterIssue === "ZERO" ? "Costo $0" : "Sin transporte";
              chips.push({ key: "is", label: `Alerta: ${issueLabel}`, onClear: () => setFilterIssue("ALL") });
            }
            if (filterQtyDias.size > 0) chips.push({ key: "qd", label: `Días: ${Array.from(filterQtyDias).sort().join(",")}`, onClear: () => setFilterQtyDias(new Set()) });
            if (filterPhase !== "ALL") chips.push({ key: "dia", label: `Día: ${subEventName(filterPhase)}`, onClear: () => setFilterPhase("ALL") });
            if (filterLugar !== "ALL") chips.push({ key: "lug", label: `Lugar: ${filterLugar}`, onClear: () => setFilterLugar("ALL") });
            if (filterEspacio !== "ALL") chips.push({ key: "esp", label: `Espacio: ${filterEspacio}`, onClear: () => setFilterEspacio("ALL") });
            if (filterPending) chips.push({ key: "pn", label: "Pending Quotes", onClear: () => setFilterPending(false) });
            if (filterAccionReq) chips.push({ key: "ar", label: "Acción Req.", onClear: () => setFilterAccionReq(false) });
            if (filterValidar) chips.push({ key: "vl", label: "A Validar", onClear: () => setFilterValidar(false) });
            if (filterAparte) chips.push({ key: "ap", label: "Aparte", onClear: () => setFilterAparte(false) });
            if (filterNiceToHave) chips.push({ key: "nh", label: "Nice to Have", onClear: () => setFilterNiceToHave(false) });
            return chips;
          })()}
          onClearAll={() => { setFilterProveedor("ALL"); setFilterProductora("ALL"); setFilterFeeEnCotiz("ALL"); setFilterCotizacion("ALL"); setFilterAsignado("ALL"); setFilterStatus("ALL"); setFilterInKind("ALL"); setFilterPrecio("ALL"); setFilterIssue("ALL"); setFilterQtyDias(new Set()); setFilterPhase("ALL"); setFilterLugar("ALL"); setFilterEspacio("ALL"); setFilterPending(false); setFilterAccionReq(false); setFilterValidar(false); setFilterAparte(false); setFilterNiceToHave(false); }}
        >
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
          <Select value={filterIssue} onValueChange={setFilterIssue}>
            <SelectTrigger className="w-[190px] bg-card border-card-border text-xs"><SelectValue placeholder="Alertas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Alertas: Todas</SelectItem>
              <SelectItem value="ANY">Con alguna alerta</SelectItem>
              <SelectItem value="INCOMPLETE">Campos incompletos</SelectItem>
              <SelectItem value="ZERO">Costo en $0</SelectItem>
              <SelectItem value="NOTRANSPORT">Sin transporte</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPhase} onValueChange={setFilterPhase}>
            <SelectTrigger className="w-[160px] bg-card border-card-border text-xs"><SelectValue placeholder="Día" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Día: Todos</SelectItem>
              {subEvents.map(se => (
                <SelectItem key={se.id} value={se.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: se.color || "#94a3b8" }} />
                    {se.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLugar} onValueChange={setFilterLugar}>
            <SelectTrigger className="w-[180px] bg-card border-card-border text-xs"><SelectValue placeholder="Lugar / Sede" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Lugar / Sede: Todos</SelectItem>
              <SelectItem value="(Sin asignar)">(Sin asignar)</SelectItem>
              {lugares.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEspacio} onValueChange={setFilterEspacio}>
            <SelectTrigger className="w-[180px] bg-card border-card-border text-xs"><SelectValue placeholder="Espacio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Espacio: Todos</SelectItem>
              <SelectItem value="(Sin asignar)">(Sin asignar)</SelectItem>
              {allSpaces.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-9 px-3 rounded-md border text-xs flex items-center gap-1.5 transition-colors",
                  filterQtyDias.size > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card border-card-border text-foreground hover:border-border"
                )}
              >
                <span>Cant. Días</span>
                {filterQtyDias.size > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold">
                    {Array.from(filterQtyDias).sort((a, b) => a - b).join(", ")}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Todos</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start">
              {qtyDiasOptions.length === 0 ? (
                <div className="text-xs text-muted-foreground px-2 py-1.5">Sin valores</div>
              ) : (
                qtyDiasOptions.map(n => {
                  const checked = filterQtyDias.has(n);
                  return (
                    <button
                      key={n}
                      onClick={() => {
                        setFilterQtyDias(prev => {
                          const next = new Set(prev);
                          if (next.has(n)) next.delete(n); else next.add(n);
                          return next;
                        });
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted",
                        checked && "bg-primary/10 text-primary"
                      )}
                    >
                      <span>{n} {n === 1 ? "día" : "días"}</span>
                      {checked && <span className="text-[10px]">✓</span>}
                    </button>
                  );
                })
              )}
              {filterQtyDias.size > 0 && (
                <button
                  onClick={() => setFilterQtyDias(new Set())}
                  className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded border-t border-border mt-1"
                >Limpiar</button>
              )}
            </PopoverContent>
          </Popover>
        </div>
        </FiltersPopover>
        <div className="flex flex-wrap gap-2 items-center">
          {([
            { active: filterPending, set: setFilterPending, label: "Pending Quotes", count: pendingCount, cls: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
            { active: filterAccionReq, set: setFilterAccionReq, label: "Accion Req.", count: accionRequeridaCount, cls: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
            { active: filterValidar, set: setFilterValidar, label: "A Validar", count: validarCount, cls: "bg-red-500/10 text-red-600 border-red-500/30" },
            { active: filterAparte, set: setFilterAparte, label: "Aparte", count: contratarAparteCount, cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
            { active: filterNiceToHave, set: setFilterNiceToHave, label: "Nice to Have", count: niceToHaveCount, cls: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
          ] as const).map(p => (
            <button
              key={p.label}
              onClick={() => p.set(!p.active)}
              className={cn(
                "h-8 px-2.5 rounded-md border text-xs flex items-center gap-1.5 transition-colors",
                p.active ? p.cls : "bg-card border-card-border text-foreground hover:border-border"
              )}
            >
              <span>{p.label}</span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", p.active ? "bg-white/40" : "bg-muted text-muted-foreground")}>{p.count}</span>
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {items.length} items</span>
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-auto max-h-[calc(100vh-280px)] budget-scroll">
          <style>{`
            ${BUDGET_COLUMNS.filter(c => !c.always && !colVisible.has(c.id)).map(c => `.budget-table [data-col="${c.id}"]{display:none;}`).join("\n")}
            .budget-table.density-comfortable td { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .budget-table.density-compact td { padding-top: 0.25rem; padding-bottom: 0.25rem; }
          `}</style>
          <table className={cn("w-full budget-table", density === "comfortable" ? "text-sm density-comfortable" : "text-xs density-compact")}>
            <thead className="sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <tr className="text-[10px] uppercase tracking-wider">
                <th className="sticky-col-0 px-2 py-2.5 w-8 bg-[hsl(var(--muted))] border-b border-border">
                  {canEdit && (
                    <Checkbox
                      checked={filtered.length > 0 && filtered.every(i => selectedIds.has(i.id))}
                      onCheckedChange={() => selectAllVisible()}
                      aria-label="Seleccionar todos los visibles"
                    />
                  )}
                </th>
                <th data-col="review" className="sticky-col-1 text-center px-1 py-2.5 font-semibold text-muted-foreground w-10 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Rev." info="Marcar como revisado. Muestra quién lo revisó y cuándo." align="center" />
                </th>
                <th data-col="item" className="sticky-col-2 text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[200px] bg-[hsl(var(--muted))] border-b border-border">
                  <SortableHeader label="Item" sortKey="item" current={sortKey} dir={sortDir} onSort={toggleSort} />
                </th>
                <th data-col="centroCosto" className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[90px] bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Centro Costo" info="Categoría de gasto dentro del área." />
                </th>
                <th data-col="qty" className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-12 bg-[hsl(var(--muted))] border-b border-border">
                  <SortableHeader label="Qty" sortKey="qty" current={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                </th>
                <th data-col="uom" className="text-left px-1 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="UoM" info="Unidad de medida." />
                </th>
                <th data-col="tipo" className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Tipo" info="Por Día / One-Time." align="center" />
                </th>
                <th data-col="dia" className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-20 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Día" info="Fase del evento a la que aplica el ítem (Lanzamiento, Main Event Día 1/2, Cenas VIP, Llegadas, Salidas). Unificado con la etiqueta de color. Llegadas cuenta 2 días para costos por día; el resto, 1." align="center" />
                </th>
                <th data-col="espacio" className="text-left px-1 py-2.5 font-semibold text-muted-foreground min-w-[110px] bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Espacio" info="Espacio/sala físico donde estará el ítem. La lista depende de la fase del evento." align="left" />
                </th>
                <th data-col="dias" className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-12 bg-[hsl(var(--muted))] border-b border-border">
                  <SortableHeader label="Dias" sortKey="dias" current={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                </th>
                <th data-col="precioUnit" className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-20 bg-[hsl(var(--muted))] border-b border-border">
                  <SortableHeader label="P. Unit." sortKey="precioUnit" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                </th>
                <th data-col="subtotal" className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-20 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Subtotal" info="Qty × P.Unit (× Días si aplica)." align="right" />
                </th>
                <th data-col="viaProductora" className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-20 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Via Productora" info="Se contrata a través de Aurora 360." align="center" />
                </th>
                <th data-col="feeEnCotiz" className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-20 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Fee en Cotiz." info="Fee 20% incluido en cotización." align="center" />
                </th>
                <th data-col="fee" className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Fee 20%" info="Fee de gestión de la productora." align="right" />
                </th>
                <th data-col="iva" className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="IVA" info="IVA 13% sobre subtotal + fee." align="right" />
                </th>
                <th data-col="turismo" className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-16 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Turismo" info="Impuesto de turismo del 5%." align="right" />
                </th>
                <th data-col="total" className="text-right px-2 py-2.5 font-semibold text-muted-foreground w-24 bg-[hsl(var(--muted))] border-b border-border">
                  <SortableHeader label="Total" sortKey="total" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                </th>
                <th data-col="cotizacion" className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[90px] bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Cotizacion" info="Código de cotización." />
                </th>
                <th data-col="status" className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[110px] bg-[hsl(var(--muted))] border-b border-border">
                  <SortableHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} />
                </th>
                <th data-col="soloPresup" className="text-center px-1 py-2.5 font-semibold text-muted-foreground w-20 bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Solo Presup." info="Item solo presupuestado." align="center" />
                </th>
                <th data-col="proveedor" className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[90px] bg-[hsl(var(--muted))] border-b border-border">
                  <SortableHeader label="Proveedor" sortKey="proveedor" current={sortKey} dir={sortDir} onSort={toggleSort} />
                </th>
                <th data-col="assigned" className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[100px] bg-[hsl(var(--muted))] border-b border-border">
                  <SortableHeader label="Assigned" sortKey="assigned" current={sortKey} dir={sortDir} onSort={toggleSort} />
                </th>
                <th data-col="imgRef" className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[80px] bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Img. Ref." info="Imagen de referencia." />
                </th>
                <th data-col="flags" className="text-left px-2 py-2.5 font-semibold text-muted-foreground min-w-[140px] bg-[hsl(var(--muted))] border-b border-border">
                  <ColHeader label="Flags" info="In-Kind, Validar, Aparte, Acción Req., Nice to Have — click para marcar." />
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
                          style={{ backgroundColor: subEventColor(group.subEventId) }}
                        >
                          {subEventName(group.subEventId)}
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
                    <td className="px-2 py-2 text-right font-semibold" colSpan={canEdit ? 9 : 8}>

                      {groupTotal > 0 ? <span className="text-primary text-xs">{formatUSD(groupTotal)}</span> : <span className="text-muted-foreground text-[10px]">In-Kind / $0</span>}
                    </td>
                  </tr>,

                  ...(isExpanded ? (renderRowsByGroup.get(key) ?? []).flatMap(__row => {
                    const renderItemTr = (item: BudgetItem) => {
                    const itemPhaseId = derivePhase(item);
                    return (
                    <tr
                      key={item.id}
                      className={cn(
                        "border-b border-border/50 transition-colors text-xs",
                        item.inKind ? "bg-amber-500/5" : "hover:bg-muted/20"
                      )}
                    >
                      <td className={cn("sticky-col-0 px-2 py-1.5 align-top text-center", item.inKind ? "row-inkind-bg" : "bg-background")}>
                        {canEdit && (
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                            aria-label="Seleccionar item"
                          />
                        )}
                      </td>
                      <td data-col="review" className={cn("sticky-col-1 px-1 py-1.5 text-center align-top", item.inKind ? "row-inkind-bg" : "bg-background")}>
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
                                  style={{ backgroundColor: subEventColor(itemPhaseId) }}
                                  title="Editar ítem o cambiar fase"
                                >
                                  {subEventName(itemPhaseId)}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-52 p-1" align="start">
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left text-primary hover:bg-primary/10 font-semibold transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Editar ítem completo…</span>
                                </button>
                                <div className="border-t border-border my-1" />
                                <div className="px-2 pt-0.5 pb-1 text-[9px] uppercase tracking-wide text-muted-foreground/70">Cambio rápido de fase</div>
                                <div className="flex flex-col gap-0.5">
                                  {subEvents.map(s => (
                                    <button
                                      key={s.id}
                                      onClick={() => updateItem(item.id, "subEventId", s.id)}
                                      className={cn(
                                        "flex items-center gap-2 px-2 py-1 rounded text-[11px] text-left hover:bg-muted transition-colors",
                                        itemPhaseId === s.id && "bg-muted font-semibold"
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
                              style={{ backgroundColor: subEventColor(itemPhaseId) }}
                            >
                              {subEventName(itemPhaseId)}
                            </span>
                          )}
                        </div>
                        <EditableCell value={item.item} onSave={v => updateItem(item.id, "item", v)} className="font-medium text-foreground text-xs" disabled={!canEdit} />
                        <DataIssueBadges issues={issuesByItem.get(item.id) || []} />
                        {!item.isTransport && item.transporteNoAplica && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-muted-foreground/30 bg-muted text-muted-foreground">
                                  <PackageX className="w-2.5 h-2.5" />
                                  Transp. N/A
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                                Marcado como "transporte no aplica": este ítem no se traslada, por eso no muestra la alerta "Sin transporte".
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                        {(() => {
                          const covers = item.isTransport ? (transportInfo.coveredByTransport.get(item.id) || []) : [];
                          const sources = transportInfo.sourcesForItem.get(item.id) || [];
                          if (covers.length === 0 && sources.length === 0) return null;
                          const allocated = transportInfo.allocatedToItem.get(item.id) || 0;
                          const distributed = transportInfo.distributedByTransport.get(item.id) || 0;
                          return (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {item.isTransport && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                                      <Truck className="w-2.5 h-2.5" />
                                      Entrega {covers.length}
                                      {distributed > 0 && <span className="font-mono opacity-80">· reparte {formatUSD(distributed)}</span>}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[320px] text-xs p-3 space-y-1">
                                    <div className="font-semibold text-foreground">
                                      {item.transportMode === "allocation" ? "Reparte su costo (visual) entre:" : "Entrega / instala:"}
                                    </div>
                                    {covers.length === 0 ? (
                                      <div className="text-muted-foreground italic">Sin ítems vinculados.</div>
                                    ) : (
                                      <ul className="space-y-0.5">
                                        {covers.map(c => (
                                          <li key={c.id} className="flex justify-between gap-3">
                                            <span className="truncate">{c.label}</span>
                                            {c.amount > 0 && <span className="font-mono text-muted-foreground">{formatUSD(c.amount)}</span>}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    {item.transportMode === "allocation" && (
                                      <div className="text-[10px] text-muted-foreground pt-1">El total general no cambia; el reparto es solo visual.</div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {sources.length > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                      <PackageCheck className="w-2.5 h-2.5" />
                                      {sources.length === 1 ? "Entregado" : `Entregado ×${sources.length}`}
                                      {allocated > 0 && <span className="font-mono opacity-80">+{formatUSD(allocated)}</span>}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[320px] text-xs p-3 space-y-1">
                                    <div className="font-semibold text-foreground">Entregado / instalado por:</div>
                                    <ul className="space-y-0.5">
                                      {sources.map(s => (
                                        <li key={s.transportId} className="flex justify-between gap-3">
                                          <span className="truncate">{s.label}</span>
                                          <span className="font-mono text-muted-foreground">
                                            {s.mode === "allocation" ? `+${formatUSD(s.amount)}` : "asociado"}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                    {allocated > 0 && (
                                      <div className="text-[10px] text-muted-foreground pt-1">Costo de transporte asignado (visual): {formatUSD(allocated)}. No se suma al total general.</div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          );
                        })()}
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
                      <td data-col="centroCosto" className="px-2 py-1.5 align-top">
                        <EditableCell value={item.centroCosto} onSave={v => updateItem(item.id, "centroCosto", v)} className="text-muted-foreground text-xs" disabled={!canEdit} />
                      </td>
                      <td data-col="qty" className="px-1 py-1.5 text-center align-top">
                        <EditableCell value={String(item.qty)} onSave={v => updateItem(item.id, "qty", v)} className="text-center font-mono text-xs" type="number" disabled={!canEdit} />
                      </td>
                      <td data-col="uom" className="px-1 py-1.5 align-top">
                        <EditableCell value={item.uom} onSave={v => updateItem(item.id, "uom", v)} className="text-muted-foreground text-xs" disabled={!canEdit} />
                      </td>
                      <td data-col="tipo" className="px-1 py-1.5 text-center align-top">
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
                      <td data-col="dia" className="px-1 py-1.5 text-center align-top">
                        <PhaseCell
                          value={itemPhaseId}
                          name={subEventName(itemPhaseId)}
                          color={subEventColor(itemPhaseId)}
                          subEvents={subEvents}
                          canEdit={canEdit}
                          onChange={id => updateItem(item.id, "subEventId", id)}
                        />
                      </td>
                      <td data-col="espacio" className="px-1 py-1.5 align-top">
                        {(() => {
                          const spaceDay = phaseSpaceDay(itemPhaseId);
                          const spaceId = (item.espacioId || "").trim();
                          return (
                            <SpaceCell
                              day={spaceDay}
                              value={itemSpaceName(spaces, item)}
                              valueId={spaceId}
                              placeLabel={spaceId ? placeLabelById.get(spaceId) : undefined}
                              options={spaceOptionGroupsForItem(spaces, itemPhaseId, spaceDay)}
                              canEdit={canEdit}
                              over={!!(spaceId && overSpaceIds.has(spaceId))}
                              onAssign={(_day, id) => assignSpace(item.id, id)}
                              onAddSpace={(day, name) => {
                                const newId = addSpace(day, name);
                                if (newId) assignSpace(item.id, newId);
                              }}
                            />
                          );
                        })()}
                      </td>
                      <td data-col="dias" className="px-1 py-1.5 text-center align-top">
                        {item.porDias === "SI" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-center font-mono text-xs text-muted-foreground cursor-help">{item.qtyDias}</span>
                            </TooltipTrigger>
                            <TooltipContent>Derivado de la fase del evento (Llegadas = 2, resto = 1)</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">--</span>
                        )}
                      </td>
                      <td data-col="precioUnit" className="px-2 py-1.5 text-right align-top font-mono">
                        {redactMode && !isAuroraOwned(item) ? (
                          <RedactedMark />
                        ) : item.quotes && item.quotes.length > 0 ? (
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
                      <td data-col="subtotal" className="px-2 py-1.5 text-right align-top font-mono text-muted-foreground">
                        {redactMode && !isAuroraOwned(item) ? <RedactedMark /> : item.subtotal > 0 ? formatUSD(item.subtotal) : "--"}
                      </td>
                      <td data-col="viaProductora" className="px-1 py-1.5 text-center align-top">
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
                      <td data-col="feeEnCotiz" className="px-1 py-1.5 text-center align-top">
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
                      <td data-col="fee" className="px-2 py-1.5 text-right align-top font-mono">
                        {redactMode && !isAuroraOwned(item) ? (
                          <RedactedMark />
                        ) : item.fee > 0 ? (
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
                      <td data-col="iva" className="px-2 py-1.5 text-right align-top">
                        {redactMode && !isAuroraOwned(item) ? (
                          <RedactedMark />
                        ) : (() => {
                          const mode = item.ivaMode ?? (item.exentoIva ? "exento" : "raw");
                          const next: Record<string, "raw" | "incluido" | "exento"> = { raw: "incluido", incluido: "exento", exento: "raw" };
                          const cycle = canEdit ? () => updateItem(item.id, "ivaMode", next[mode]) : undefined;
                          const title = canEdit ? "Click para alternar IVA: +13% → incluido → exento" : undefined;
                          if (mode === "exento") {
                            return (
                              <button
                                onClick={cycle}
                                className={cn("text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium", canEdit && "hover:bg-amber-500/20 transition-colors", !canEdit && "cursor-default")}
                              >EXENTO</button>
                            );
                          }
                          if (mode === "incluido") {
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={cycle}
                                    className={cn("inline-flex items-center gap-1 font-mono text-muted-foreground", canEdit && "cursor-pointer hover:text-sky-600 transition-colors", !canEdit && "cursor-default")}
                                  >
                                    <span className="text-[8px] px-1 py-0.5 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20 font-sans font-medium">INCL</span>
                                    {formatUSD(item.iva)}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs font-normal max-w-[200px]">
                                  IVA ya incluido en el precio — no se suma extra; base derivada (precio ÷ 1.13).
                                </TooltipContent>
                              </Tooltip>
                            );
                          }
                          return item.iva > 0 ? (
                            <span className={cn("font-mono text-muted-foreground", canEdit && "cursor-pointer hover:text-amber-600 transition-colors")} title={title} onClick={cycle}>{formatUSD(item.iva)}</span>
                          ) : (
                            <span className={cn("text-muted-foreground/30", canEdit && "cursor-pointer hover:text-amber-600 transition-colors")} title={title} onClick={cycle}>--</span>
                          );
                        })()}
                      </td>
                      <td data-col="turismo" className="px-2 py-1.5 text-right align-top">
                        {redactMode && !isAuroraOwned(item) ? (
                          <RedactedMark />
                        ) : item.aplicaTurismo ? (
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
                      <td data-col="total" className="px-2 py-1.5 text-right align-top">
                        {redactMode && !isAuroraOwned(item) ? (
                          <RedactedMark />
                        ) : item.inKind ? (
                          <span className="text-amber-600 font-semibold text-xs">In-Kind</span>
                        ) : item.total > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-semibold text-foreground font-mono text-xs cursor-help border-b border-dotted border-muted-foreground/40">{formatUSD(item.total)}</span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[280px] p-3">
                              <CostBreakdown item={item} title="Cómo se construye el total" />
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">$0.00</span>
                        )}
                      </td>
                      <td data-col="cotizacion" className="px-2 py-1.5 align-top">
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
                      <td data-col="status" className="px-2 py-1.5 align-top">
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
                      <td data-col="soloPresup" className="px-1 py-1.5 text-center align-top">
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
                      <td data-col="proveedor" className="px-2 py-1.5 align-top">
                        <EditableCell value={item.proveedor || ""} onSave={v => updateItem(item.id, "proveedor", v)} className="text-muted-foreground text-xs" placeholder="proveedor..." disabled={!canEdit} />
                      </td>
                      <td data-col="assigned" className="px-2 py-1.5 align-top">
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
                      <td data-col="imgRef" className="px-2 py-1.5 align-top">
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
                      <td data-col="flags" className="px-2 py-1.5 align-top">
                        <FlagsChips item={item} canEdit={canEdit} onToggle={(k) => toggleField(item.id, k as any)} />
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
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary" onClick={() => setSplitItem(item)}>
                                  <Columns2 className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Split por día</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary" onClick={() => setTaskForItem({
                                  link: { id: item.id, label: item.item || "(sin nombre)", evento: item.evento, area: item.area, centroCosto: item.centroCosto },
                                  notes: [item.descripcion, item.notas].filter(s => s && s.trim()).join("\n\n"),
                                })}>
                                  <ListPlus className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Crear tarea</TooltipContent>
                            </Tooltip>
                            {deprecated && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={sendingToFinal} className="h-5 w-5 text-muted-foreground hover:text-primary" onClick={() => sendToFinal([item])}>
                                    <SendHorizontal className="w-3 h-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Enviar a Budget Final</TooltipContent>
                              </Tooltip>
                            )}
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
                    );
                    };
                    if (__row.kind === "single") return [renderItemTr(__row.item)];
                    const __pex = expandedParents.has(__row.key);
                    const __parentRow = (
                      <tr
                        key={`p-${__row.key}`}
                        className="bg-primary/5 border-y border-primary/20 cursor-pointer hover:bg-primary/10 select-none"
                        onClick={() => toggleParent(__row.key)}
                      >
                        <td className="sticky-col-0 px-2 py-1.5 text-center bg-primary/5">
                          <motion.div animate={{ rotate: __pex ? 90 : 0 }} className="inline-block">
                            <ChevronRight className="w-3 h-3 text-primary" />
                          </motion.div>
                        </td>
                        <td className="sticky-col-1 bg-primary/5" />
                        <td className="sticky-col-2 px-2 py-1.5 bg-primary/5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground text-xs">{__row.sample.item}</span>
                            <Badge variant="outline" className="text-[10px] py-0">×{__row.children.length} días</Badge>
                            {!__pex && <span className="text-[10px] text-muted-foreground">click para expandir</span>}
                          </div>
                        </td>
                        <td colSpan={canEdit ? 23 : 22} className="px-2 py-1.5 text-right bg-primary/5">
                          <span className="font-semibold text-primary text-xs">{formatUSD(__row.total)}</span>
                        </td>
                      </tr>
                    );
                    return [__parentRow, ...(__pex ? __row.children.map(renderItemTr) : [])];
                  }) : [])
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
                <td colSpan={16} className="px-3 py-3">
                </td>
                <td className="px-2 py-3 text-right font-bold text-sm text-primary font-mono">
                  {formatUSD(totalBudget)}
                </td>
                <td colSpan={canEdit ? 8 : 7}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <BudgetItemDialog
        mode="add"
        open={showAddModal}
        onOpenChange={setShowAddModal}
        value={newItem}
        onChange={setNewItem}
        onSave={addItem}
        subEvents={subEvents}
        allZones={allZones}
        allCentros={allCentros}
        spaces={spaces}
        portalUsers={portalUsers}
        statusOptions={STATUS_COTIZACION_OPTIONS}
        statusLabels={STATUS_SHORT_LABELS}
        allItems={items}
      />

      <BudgetItemDialog
        mode="edit"
        open={showEditModal}
        onOpenChange={setShowEditModal}
        value={editItem}
        onChange={setEditItem}
        onSave={saveEditItem}
        subEvents={subEvents}
        allZones={allZones}
        allCentros={allCentros}
        spaces={spaces}
        portalUsers={portalUsers}
        statusOptions={STATUS_COTIZACION_OPTIONS}
        statusLabels={STATUS_SHORT_LABELS}
        allItems={items}
      />

      <BulkActionsBar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={bulkDelete}
        onExportCsv={bulkExportCsv}
        onSetStatus={(s) => bulkUpdate(it => ({ ...it, statusCotizacion: s }))}
        onSetProveedor={(p) => bulkUpdate(it => ({ ...it, proveedor: p }))}
        onToggleFlag={(flag, on) => {
          const reviewerName = user?.name || "Unknown";
          bulkUpdate(it => {
            switch (flag) {
              case "reviewed":
                return { ...it, reviewedBy: on ? reviewerName : "" };
              case "aplicaFee":
                return { ...it, aplicaFee: on ? "SI" : "NO" };
              case "porDias":
                return { ...it, porDias: on ? "SI" : "NO" };
              default:
                return { ...it, [flag]: on } as BudgetItem;
            }
          });
          const labels: Record<string, string> = {
            inKind: "In-Kind",
            validarCosto: "Validar costo",
            contratarAparte: "Contratar aparte",
            reviewed: "Reviewed",
            aplicaFee: "Aplica Fee",
            porDias: "Por Días",
            accionRequerida: "Acción Requerida",
            soloPresupuestado: "Solo Presupuestado",
          };
          toast({
            title: on ? `${labels[flag]} marcado` : `${labels[flag]} quitado`,
            description: `${selectedIds.size} item${selectedIds.size === 1 ? "" : "s"} actualizado${selectedIds.size === 1 ? "" : "s"}`,
          });
        }}
        onMoveArea={(a) => bulkUpdate(it => ({ ...it, area: a }))}
        onMoveCentro={(c) => bulkUpdate(it => ({ ...it, centroCosto: c }))}
        onSplitByDay={() => setBulkSplitOpen(true)}
        onSendToFinal={deprecated ? () => {
          sendToFinal(items.filter(i => selectedIds.has(i.id)));
          setSelectedIds(new Set());
        } : undefined}
        statusOptions={STATUS_COTIZACION_OPTIONS.filter(Boolean)}
        proveedorOptions={proveedores.filter(p => p !== "ALL")}
        areaOptions={areas.filter(a => a !== "ALL")}
        centroOptions={Array.from(new Set(items.map(i => i.centroCosto).filter(Boolean))).sort()}
      />

      <SubEventsManagerDialog
        open={showSubEventsManager}
        onOpenChange={setShowSubEventsManager}
        subEvents={subEvents}
        items={items}
        canEdit={canEditTaxonomy}
        onSave={setSubEvents}
      />

      <SpacesSheet
        open={showSpacesSheet}
        onOpenChange={setShowSpacesSheet}
        spaces={spaces}
        loadInfo={spaceLoadInfo}
        overCount={overCapacity.length}
        canEdit={canEdit}
        onAddSpace={addSpace}
        onRename={handleRenameSpace}
        onDelete={handleDeleteSpace}
        onSetCapacity={setCapacityById}
      />

      <SplitByDayDialog
        open={!!splitItem}
        onOpenChange={(o) => { if (!o) setSplitItem(null); }}
        original={splitItem}
        subEvents={subEvents}
        onApprove={(newItems) => {
          if (!splitItem) return;
          const originalId = splitItem.id;
          setItems(prev => {
            const next = prev.filter(i => i.id !== originalId).concat(newItems);
            saveFull(next);
            return next;
          });
          setSplitItem(null);
          toast({ title: "Item dividido en 2 filas por día" });
        }}
      />
      <BulkSplitByDayDialog
        open={bulkSplitOpen}
        onOpenChange={setBulkSplitOpen}
        originals={items.filter(i => selectedIds.has(i.id))}
        subEvents={subEvents}
        onApprove={(replacements) => {
          if (replacements.length === 0) { setBulkSplitOpen(false); return; }
          const byOrig = new Map(replacements.map(r => [r.originalId, r.newItems]));
          setItems(prev => {
            const next: BudgetItem[] = [];
            for (const it of prev) {
              const repl = byOrig.get(it.id);
              if (repl) next.push(...repl);
              else next.push(it);
            }
            saveFull(next);
            return next;
          });
          setBulkSplitOpen(false);
          setSelectedIds(new Set());
          toast({ title: `${replacements.length} item${replacements.length === 1 ? "" : "s"} divididos por día` });
        }}
      />

      <CreateTaskFromItemDialog
        open={!!taskForItem}
        onOpenChange={(o) => { if (!o) setTaskForItem(null); }}
        linkedItem={taskForItem?.link || null}
        defaultNotes={taskForItem?.notes}
      />
    </div>
  );
}
