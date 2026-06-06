import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ComboInput } from "@/components/ComboInput";
import { CostBreakdown } from "@/components/budget/CostBreakdown";
import { cn, formatUSD } from "@/lib/utils";
import { Truck, X, Search, Check, PackageX } from "lucide-react";
import { requiredFieldErrors } from "@/lib/budgetCalc";
import {
  phaseSpaceDay,
  spaceOptionsForItem,
  spaceOptionGroupsForItem,
  IVA_MODE_VALUES,
  IVA_MODE_LABELS,
  TRANSPORT_MODE_VALUES,
  TRANSPORT_MODE_LABELS,
  type BudgetItem,
  type SubEvent,
  type SpacesCatalog,
} from "@/data/budgetData";

/** Sentinel used by Selects to represent the explicit "NO APLICA" / unset choice. */
const NA = "__na__";
/** Sentinel for the Lugar filter meaning "all places / no filter". */
const LUGAR_ALL = "__all__";

interface PortalUserLite {
  id: number;
  name: string;
  organization: string;
}

interface BudgetItemDialogProps {
  mode: "add" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: Partial<BudgetItem>;
  onChange: (updater: (prev: Partial<BudgetItem>) => Partial<BudgetItem>) => void;
  onSave: () => void;
  subEvents: SubEvent[];
  allZones: string[];
  allCentros: string[];
  allProveedores: string[];
  spaces: SpacesCatalog;
  portalUsers: PortalUserLite[];
  statusOptions: string[];
  statusLabels: Record<string, string>;
  /** All budget items, used to pick which items a transport line covers. */
  allItems: BudgetItem[];
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 block">{children}</label>;
}

export function BudgetItemDialog({
  mode,
  open,
  onOpenChange,
  value,
  onChange,
  onSave,
  subEvents,
  allZones,
  allCentros,
  allProveedores,
  spaces,
  portalUsers,
  statusOptions,
  statusLabels,
  allItems,
}: BudgetItemDialogProps) {
  const byDias = value.porDias === "SI";
  const ivaMode = value.ivaMode ?? (value.exentoIva ? "exento" : "raw");
  const isTransport = value.isTransport || false;
  const transportMode = value.transportMode === "allocation" ? "allocation" : "association";
  const coveredIds = useMemo(() => value.coveredItemIds ?? [], [value.coveredItemIds]);

  const errors = useMemo(() => requiredFieldErrors(value), [value]);

  const isValid = Object.keys(errors).length === 0;

  const set = <K extends keyof BudgetItem>(field: K, v: BudgetItem[K]) =>
    onChange(p => ({ ...p, [field]: v }));

  const spaceDay = phaseSpaceDay(value.subEventId);
  // Grouped picker (Lugar › Zona/Área › Espacio), mirroring the table's space button.
  const spaceGroups = useMemo(
    () => spaceOptionGroupsForItem(spaces, value.subEventId, spaceDay),
    [spaces, value.subEventId, spaceDay],
  );
  // Flat id → zone / lugar lookups so picking a space can keep things consistent.
  const { spaceZoneById, spaceLugarById } = useMemo(() => {
    const zoneM = new Map<string, string>();
    const lugarM = new Map<string, string>();
    for (const o of spaceOptionsForItem(spaces, value.subEventId, spaceDay)) {
      zoneM.set(o.id, o.zone);
      lugarM.set(o.id, o.lugar);
    }
    return { spaceZoneById: zoneM, spaceLugarById: lugarM };
  }, [spaces, value.subEventId, spaceDay]);

  // Distinct Lugares/Sedes available for this item, in first-appearance order.
  const lugarOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const g of spaceGroups) {
      if (seen.has(g.lugar)) continue;
      seen.add(g.lugar);
      out.push(g.lugar);
    }
    return out;
  }, [spaceGroups]);

  // UI-only filter: the selected Lugar/Sede. Derived from the item's space (not stored).
  const [lugarFilter, setLugarFilter] = useState<string>(LUGAR_ALL);

  // Preselect / keep the Lugar in sync with the item's currently assigned space.
  useEffect(() => {
    const id = (value.espacioId || "").trim();
    if (!id) return;
    const lugar = spaceLugarById.get(id);
    if (lugar) setLugarFilter(lugar);
  }, [value.espacioId, spaceLugarById]);

  // Espacio groups limited to the selected Lugar (all when no filter).
  const filteredSpaceGroups = useMemo(
    () => (lugarFilter === LUGAR_ALL ? spaceGroups : spaceGroups.filter(g => g.lugar === lugarFilter)),
    [spaceGroups, lugarFilter],
  );

  // Área/Zona suggestions limited to the selected Lugar (all zones when no filter).
  const zoneOptions = useMemo(() => {
    if (lugarFilter === LUGAR_ALL) return allZones;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const g of filteredSpaceGroups) {
      const z = (g.zone || "").trim();
      if (!z || seen.has(z)) continue;
      seen.add(z);
      out.push(z);
    }
    return out;
  }, [lugarFilter, allZones, filteredSpaceGroups]);

  // Changing the Lugar clears a space that no longer belongs to the new selection.
  const onLugarChange = (v: string) => {
    setLugarFilter(v);
    const id = (value.espacioId || "").trim();
    if (!id) return;
    const belongs = v === LUGAR_ALL || spaceLugarById.get(id) === v;
    if (!belongs) {
      onChange(p => ({ ...p, espacioId: "", espacioDia1: "", espacioDia2: "" }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "AGREGAR ITEM DE PRESUPUESTO" : "EDITAR ITEM DE PRESUPUESTO"}</DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Completa los campos para agregar una nueva línea. Budget Items es la única fuente de costos."
              : "Modifica los campos y guarda. Budget Items es la única fuente de costos."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mt-2 text-sm">
          {/* Item name */}
          <div className="col-span-3">
            <FieldLabel>Nombre del Item *</FieldLabel>
            <Input
              value={value.item || ""}
              onChange={e => set("item", e.target.value)}
              placeholder="EJ. CATERING COFFEE BREAK"
              className={cn(errors.item && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.item && <p className="text-[10px] text-destructive mt-1">{errors.item}</p>}
          </div>

          {/* Fase del evento */}
          <div>
            <FieldLabel>Fase del Evento (Día) *</FieldLabel>
            <Select
              value={value.subEventId || ""}
              onValueChange={v => set("subEventId", v)}
            >
              <SelectTrigger className={cn(errors.subEventId && "border-destructive")}><SelectValue placeholder="SELECCIONAR FASE" /></SelectTrigger>
              <SelectContent>
                {subEvents.map(se => (
                  <SelectItem key={se.id} value={se.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: se.color }} />
                      {se.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.subEventId && <p className="text-[10px] text-destructive mt-1">{errors.subEventId}</p>}
          </div>

          {/* Place fields (Área/Zona, Lugar, Espacio) don't apply to transport lines. */}
          {!isTransport && (
          <>
          {/* Area / zona */}
          <div>
            <FieldLabel>Área / Zona *</FieldLabel>
            <ComboInput value={value.area || ""} onChange={v => set("area", v)} options={zoneOptions} placeholder="SELECCIONAR ZONA..." className={cn(errors.area && "border-destructive")} />
            {errors.area && <p className="text-[10px] text-destructive mt-1">{errors.area}</p>}
          </div>

          {/* Lugar / Sede — filters the Espacio and Zona options below */}
          <div>
            <FieldLabel>Lugar / Sede</FieldLabel>
            <Select value={lugarFilter} onValueChange={onLugarChange}>
              <SelectTrigger><SelectValue placeholder="TODOS LOS LUGARES" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={LUGAR_ALL}>Todos los lugares</SelectItem>
                {lugarOptions.length === 0 && (
                  <div className="px-2 py-1.5 text-[11px] text-muted-foreground">Sin lugares disponibles</div>
                )}
                {lugarOptions.map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Espacio — grouped Lugar › Zona/Área › Espacio, like the table's space button */}
          <div>
            <FieldLabel>Espacio Asignado</FieldLabel>
            <Select
              value={(value.espacioId || "").trim() || NA}
              onValueChange={v => {
                const id = v === NA ? "" : v;
                onChange(p => {
                  const next: Partial<BudgetItem> = {
                    ...p,
                    espacioId: id,
                    // Collapse to the single id reference; clear legacy day fields.
                    espacioDia1: "",
                    espacioDia2: "",
                  };
                  // Keep Área/Zona consistent with the chosen space's zone.
                  const zone = id ? (spaceZoneById.get(id) || "").trim() : "";
                  if (zone) next.area = zone;
                  return next;
                });
              }}
            >
              <SelectTrigger><SelectValue placeholder="SELECCIONAR ESPACIO..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NA}>Sin asignar</SelectItem>
                {filteredSpaceGroups.length === 0 && (
                  <div className="px-2 py-1.5 text-[11px] text-muted-foreground">Sin espacios disponibles</div>
                )}
                {filteredSpaceGroups.map((group, gi) => (
                  <SelectGroup key={`${group.lugar}-${group.zone}-${gi}`}>
                    <SelectLabel className="text-[10px] uppercase tracking-wide">
                      {group.lugar}
                      <span className="ml-1 font-normal normal-case text-muted-foreground">· {group.zone}</span>
                    </SelectLabel>
                    {group.options.map(o => (
                      <SelectItem key={o.id} value={o.id} className="pl-6">
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          </>
          )}

          {/* Centro de costo */}
          <div>
            <FieldLabel>Centro de Costo *</FieldLabel>
            <ComboInput value={value.centroCosto || ""} onChange={v => set("centroCosto", v)} options={allCentros} allowCreate={false} placeholder="SELECCIONAR..." className={cn(errors.centroCosto && "border-destructive")} />
            {errors.centroCosto && <p className="text-[10px] text-destructive mt-1">{errors.centroCosto}</p>}
          </div>

          {/* Proveedor */}
          <div className="col-span-2">
            <FieldLabel>Proveedor *</FieldLabel>
            <ComboInput value={value.proveedor || ""} onChange={v => set("proveedor", v)} options={allProveedores} allowCreate={false} placeholder="SELECCIONAR..."
              className={cn(errors.proveedor && "border-destructive")} />
            {errors.proveedor && <p className="text-[10px] text-destructive mt-1">{errors.proveedor}</p>}
          </div>

          {/* Descripcion */}
          <div className="col-span-3">
            <FieldLabel>Descripción *</FieldLabel>
            <Input value={value.descripcion || ""} onChange={e => set("descripcion", e.target.value)} placeholder="DESCRIPCIÓN..."
              className={cn(errors.descripcion && "border-destructive focus-visible:ring-destructive")} />
            {errors.descripcion && <p className="text-[10px] text-destructive mt-1">{errors.descripcion}</p>}
          </div>

          {/* Notas */}
          <div className="col-span-3">
            <FieldLabel>Notas / Observaciones (Opcional)</FieldLabel>
            <Input value={value.notas || ""} onChange={e => set("notas", e.target.value)} placeholder="NOTAS..." />
          </div>

          {/* Qty */}
          <div>
            <FieldLabel>Cantidad</FieldLabel>
            <Input
              type="number"
              value={value.qty ?? 0}
              onChange={e => set("qty", parseFloat(e.target.value) || 0)}
              className={cn(errors.qty && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.qty && <p className="text-[10px] text-destructive mt-1">{errors.qty}</p>}
          </div>

          {/* UoM */}
          <div>
            <FieldLabel>Unidad (UoM) *</FieldLabel>
            <Input value={value.uom || ""} onChange={e => set("uom", e.target.value)} placeholder="PERSONA, UNIDAD..."
              className={cn(errors.uom && "border-destructive focus-visible:ring-destructive")} />
            {errors.uom && <p className="text-[10px] text-destructive mt-1">{errors.uom}</p>}
          </div>

          {/* Precio */}
          <div>
            <FieldLabel>Precio Unitario *</FieldLabel>
            <Input
              type="number"
              step="0.01"
              value={value.precioUnitario ?? 0}
              onChange={e => set("precioUnitario", parseFloat(e.target.value) || 0)}
              className={cn(errors.precioUnitario && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.precioUnitario && <p className="text-[10px] text-destructive mt-1">{errors.precioUnitario}</p>}
          </div>

          {/* Tipo de contratacion */}
          <div>
            <FieldLabel>Tipo de Contratación</FieldLabel>
            <Select value={value.porDias || "NO"} onValueChange={v => set("porDias", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">POR DÍA</SelectItem>
                <SelectItem value="NO">ÚNICO (ONE-TIME)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Qty dias (only when por dia) */}
          <div>
            <FieldLabel>Cantidad de Días</FieldLabel>
            <Input
              type="number"
              min={1}
              value={value.qtyDias ?? 1}
              disabled={!byDias}
              onChange={e => set("qtyDias", parseFloat(e.target.value) || 1)}
              className={cn(!byDias && "opacity-50", errors.qtyDias && "border-destructive focus-visible:ring-destructive")}
            />
            {byDias
              ? errors.qtyDias && <p className="text-[10px] text-destructive mt-1">{errors.qtyDias}</p>
              : <p className="text-[10px] text-muted-foreground mt-1">NO APLICA (ÚNICO)</p>}
          </div>

          {/* IVA mode */}
          <div>
            <FieldLabel>IVA (13%)</FieldLabel>
            <Select value={ivaMode} onValueChange={v => set("ivaMode", v as BudgetItem["ivaMode"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IVA_MODE_VALUES.map(m => (
                  <SelectItem key={m} value={m}>{IVA_MODE_LABELS[m].toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agency fee */}
          <div>
            <FieldLabel>Vía Aurora 360 (Fee 20%)</FieldLabel>
            <Select
              value={value.agencyFee ? "SI" : "NO"}
              onValueChange={v => set("agencyFee", v === "SI")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SÍ</SelectItem>
                <SelectItem value="NO">NO APLICA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fee incluido (only when agencyFee) */}
          {value.agencyFee && (
            <div>
              <FieldLabel>Fee ya incluido en cotización</FieldLabel>
              <Select value={value.aplicaFee || "NO"} onValueChange={v => set("aplicaFee", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SI">SÍ (YA INCLUIDO)</SelectItem>
                  <SelectItem value="NO">NO (SE AGREGA 20%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Turismo */}
          <div>
            <FieldLabel>Impuesto Turismo (5%)</FieldLabel>
            <Select
              value={value.aplicaTurismo ? "SI" : "NO"}
              onValueChange={v => set("aplicaTurismo", v === "SI")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SÍ</SelectItem>
                <SelectItem value="NO">NO APLICA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* In-kind */}
          <div>
            <FieldLabel>In-Kind (No Cash)</FieldLabel>
            <Select
              value={value.inKind ? "SI" : "NO"}
              onValueChange={v => set("inKind", v === "SI")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SI">SÍ (IN-KIND)</SelectItem>
                <SelectItem value="NO">NO APLICA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cotizacion */}
          <div>
            <FieldLabel>Cotización *</FieldLabel>
            <Input value={value.cotizacion || ""} onChange={e => set("cotizacion", e.target.value)} placeholder="A2, PENDING, N/A..."
              className={cn(errors.cotizacion && "border-destructive focus-visible:ring-destructive")} />
            {errors.cotizacion && <p className="text-[10px] text-destructive mt-1">{errors.cotizacion}</p>}
          </div>

          {/* Link */}
          <div>
            <FieldLabel>Link de Cotización (Opcional)</FieldLabel>
            <Input value={value.cotizacionLink || ""} onChange={e => set("cotizacionLink", e.target.value)} placeholder="https://..." />
          </div>

          {/* Imagen */}
          <div>
            <FieldLabel>Imagen de Referencia (Opcional)</FieldLabel>
            <Input value={value.documento || ""} onChange={e => set("documento", e.target.value)} placeholder="URL DE IMAGEN..." />
          </div>

          {/* Status */}
          <div>
            <FieldLabel>Status de Cotización</FieldLabel>
            <Select
              value={value.statusCotizacion || NA}
              onValueChange={v => set("statusCotizacion", v === NA ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="STATUS..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NA}>NO APLICA</SelectItem>
                {statusOptions.filter(Boolean).map(opt => (
                  <SelectItem key={opt} value={opt}>{(statusLabels[opt] || opt).toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Asignado a */}
          <div>
            <FieldLabel>Asignado a</FieldLabel>
            <Select
              value={value.assignedTo || NA}
              onValueChange={v => set("assignedTo", v === NA ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="ASIGNAR..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NA}>NO APLICA</SelectItem>
                {portalUsers.map(u => (
                  <SelectItem key={u.id} value={u.name}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold">{u.name.charAt(0)}</span>
                      {u.name}
                      <span className="text-muted-foreground text-[9px]">{u.organization}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transporte / entrega */}
          <div className="col-span-3 border-t border-border pt-3 mt-1">
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={isTransport}
                onChange={e => {
                  const on = e.target.checked;
                  // Transport lines aren't tied to a place: clear any place fields.
                  if (on) setLugarFilter(LUGAR_ALL);
                  onChange(p => ({
                    ...p,
                    isTransport: on,
                    transportMode: on ? (p.transportMode === "allocation" ? "allocation" : "association") : p.transportMode,
                    ...(on ? { area: "", espacioId: "", espacioDia1: "", espacioDia2: "" } : {}),
                  }));
                }}
                className="rounded border-border"
              />
              <Truck className="w-3.5 h-3.5 text-sky-500" />
              ES TRANSPORTE / ENTREGA (MONTAJE)
            </label>
            {!isTransport && (
              <label className="flex items-center gap-2 text-xs font-semibold mt-2">
                <input
                  type="checkbox"
                  checked={value.transporteNoAplica || false}
                  onChange={e => set("transporteNoAplica", e.target.checked)}
                  className="rounded border-border"
                />
                <PackageX className="w-3.5 h-3.5 text-sky-500" />
                TRANSPORTE NO APLICA (N/A)
                <span className="font-normal text-muted-foreground">
                  — quita la alerta "Sin transporte" en ítems que no se trasladan (servicios, personal, digitales).
                </span>
              </label>
            )}
            {isTransport && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                <div className="sm:col-span-2">
                  <FieldLabel>Modo de costo del transporte</FieldLabel>
                  <Select value={transportMode} onValueChange={v => set("transportMode", v as BudgetItem["transportMode"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRANSPORT_MODE_VALUES.map(m => (
                        <SelectItem key={m} value={m}>{TRANSPORT_MODE_LABELS[m]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {transportMode === "allocation"
                      ? "El costo de este transporte se reparte (en partes iguales) entre los ítems vinculados, solo de forma visual. El total general no cambia."
                      : "El costo queda completo en esta línea de transporte; los ítems vinculados solo muestran quién los entrega/instala."}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Ítems que entrega / instala</FieldLabel>
                  <TransportLinksField
                    allItems={allItems}
                    currentId={value.id}
                    selectedIds={coveredIds}
                    onChange={(ids) => set("coveredItemIds", ids)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Centros de costo que cubre</FieldLabel>
                  <TransportCentrosField
                    options={allCentros}
                    selected={value.centrosCosto ?? []}
                    onChange={(cs) => set("centrosCosto", cs)}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Un transporte puede entregar ítems de varios centros de costo. Solo organizativo; no cambia los totales.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Flags */}
          <div className="col-span-3 flex flex-wrap items-center gap-4 border-t border-border pt-3 mt-1">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={value.validarCosto || false} onChange={e => set("validarCosto", e.target.checked)} className="rounded border-border" />
              VALIDAR COSTO
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={value.contratarAparte || false} onChange={e => set("contratarAparte", e.target.checked)} className="rounded border-border" />
              CONTRATAR APARTE
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={value.accionRequerida || false} onChange={e => set("accionRequerida", e.target.checked)} className="rounded border-border" />
              ACCIÓN REQUERIDA
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={value.niceToHave || false} onChange={e => set("niceToHave", e.target.checked)} className="rounded border-border" />
              NICE TO HAVE
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={value.soloPresupuestado || false} onChange={e => set("soloPresupuestado", e.target.checked)} className="rounded border-border" />
              SOLO PRESUPUESTADO
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={value.costoEnOtroItem || false} onChange={e => set("costoEnOtroItem", e.target.checked)} className="rounded border-border" />
              COSTO EN OTRO ITEM
            </label>
          </div>
        </div>

        {/* Live cost breakdown — mirrors the canonical recalcItem chain */}
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
          <CostBreakdown item={value as BudgetItem} title="Cómo se construye el total" />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>CANCELAR</Button>
          <Button onClick={onSave} disabled={!isValid}>
            {mode === "add" ? "AGREGAR ITEM" : "GUARDAR CAMBIOS"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TransportLinksFieldProps {
  allItems: BudgetItem[];
  /** Current item id, excluded from the selectable list. */
  currentId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/** Searchable multi-select of budget items a transport line delivers/installs. */
function TransportLinksField({ allItems, currentId, selectedIds, onChange }: TransportLinksFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Selectable targets: every other item that is not itself a transport line.
  const selectable = useMemo(
    () => allItems.filter(i => i.id !== currentId && !i.isTransport),
    [allItems, currentId]
  );

  const byId = useMemo(() => {
    const m = new Map<string, BudgetItem>();
    for (const i of allItems) m.set(i.id, i);
    return m;
  }, [allItems]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? selectable.filter(i =>
          (i.item || "").toLowerCase().includes(q) ||
          (i.area || "").toLowerCase().includes(q) ||
          (i.centroCosto || "").toLowerCase().includes(q) ||
          (i.proveedor || "").toLowerCase().includes(q)
        )
      : selectable;
    return base.slice(0, 100);
  }, [selectable, query]);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(selectedIds.filter(x => x !== id));
    else onChange([...selectedIds, id]);
  };

  // Keep displayed chips for ids that still resolve to existing items.
  const chips = selectedIds.filter(id => byId.has(id));

  return (
    <div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {chips.map(id => {
            const it = byId.get(id)!;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
              >
                <span className="truncate max-w-[160px]">{it.item || it.descripcion || id}</span>
                <button type="button" onClick={() => toggle(id)} className="hover:text-destructive">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full justify-between font-normal">
            <span className="text-muted-foreground">
              {chips.length === 0 ? "Vincular ítems..." : `${chips.length} ítem${chips.length === 1 ? "" : "s"} vinculado${chips.length === 1 ? "" : "s"}`}
            </span>
            <Search className="w-3.5 h-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar ítem, área, proveedor..."
                className="pl-7 h-8 text-xs"
              />
            </div>
          </div>
          <div className="max-h-[260px] overflow-auto p-1">
            {filtered.length === 0 ? (
              <div className="text-xs text-muted-foreground px-2 py-3 text-center">Sin resultados</div>
            ) : (
              filtered.map(i => {
                const checked = selectedSet.has(i.id);
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => toggle(i.id)}
                    className={cn(
                      "w-full flex items-start gap-2 px-2 py-1.5 rounded text-left text-xs hover:bg-muted transition-colors",
                      checked && "bg-sky-500/10"
                    )}
                  >
                    <span className={cn(
                      "mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                      checked ? "bg-sky-500 border-sky-500 text-white" : "border-border"
                    )}>
                      {checked && <Check className="w-2.5 h-2.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground truncate">{i.item || "(sin nombre)"}</span>
                      <span className="block text-[10px] text-muted-foreground truncate">
                        {[i.area, i.centroCosto].filter(Boolean).join(" › ")}
                        {i.total > 0 ? ` · ${formatUSD(i.total)}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface TransportCentrosFieldProps {
  options: string[];
  selected: string[];
  onChange: (centros: string[]) => void;
}

/** Multi-select of catalog cost centers a transport line serves. */
function TransportCentrosField({ options, selected, onChange }: TransportCentrosFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = options.filter(c => !!c && !!c.trim());
    return (q ? base.filter(c => c.toLowerCase().includes(q)) : base);
  }, [options, query]);

  const toggle = (c: string) => {
    if (selectedSet.has(c)) onChange(selected.filter(x => x !== c));
    else onChange([...selected, c]);
  };

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selected.map(c => (
            <span
              key={c}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
            >
              <span className="truncate max-w-[160px]">{c}</span>
              <button type="button" onClick={() => toggle(c)} className="hover:text-destructive">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full justify-between font-normal">
            <span className="text-muted-foreground">
              {selected.length === 0 ? "Seleccionar centros..." : `${selected.length} centro${selected.length === 1 ? "" : "s"} seleccionado${selected.length === 1 ? "" : "s"}`}
            </span>
            <Search className="w-3.5 h-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar centro de costo..."
                className="pl-7 h-8 text-xs"
              />
            </div>
          </div>
          <div className="max-h-[260px] overflow-auto p-1">
            {filtered.length === 0 ? (
              <div className="text-xs text-muted-foreground px-2 py-3 text-center">Sin resultados</div>
            ) : (
              filtered.map(c => {
                const checked = selectedSet.has(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggle(c)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs hover:bg-muted transition-colors",
                      checked && "bg-sky-500/10"
                    )}
                  >
                    <span className={cn(
                      "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                      checked ? "bg-sky-500 border-sky-500 text-white" : "border-border"
                    )}>
                      {checked && <Check className="w-2.5 h-2.5" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground">{c}</span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
