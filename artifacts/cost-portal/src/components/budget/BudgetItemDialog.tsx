import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ComboInput } from "@/components/ComboInput";
import { cn } from "@/lib/utils";
import {
  phaseSpaceDay,
  spaceNamesForItem,
  IVA_MODE_VALUES,
  IVA_MODE_LABELS,
  type BudgetItem,
  type SubEvent,
  type SpacesCatalog,
} from "@/data/budgetData";

/** Sentinel used by Selects to represent the explicit "NO APLICA" / unset choice. */
const NA = "__na__";

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
  spaces: SpacesCatalog;
  portalUsers: PortalUserLite[];
  statusOptions: string[];
  statusLabels: Record<string, string>;
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
  spaces,
  portalUsers,
  statusOptions,
  statusLabels,
}: BudgetItemDialogProps) {
  const byDias = value.porDias === "SI";
  const ivaMode = value.ivaMode ?? (value.exentoIva ? "exento" : "raw");

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const reqText = (field: keyof BudgetItem, msg: string) => {
      const v = value[field];
      if (v === undefined || v === null || String(v).trim() === "") e[field as string] = msg;
    };
    reqText("item", "El nombre del item es obligatorio.");
    reqText("subEventId", "Selecciona la fase del evento.");
    reqText("area", "Asigna un área/zona (o NO APLICA).");
    reqText("centroCosto", "Asigna un centro de costo.");
    reqText("proveedor", "Indica el proveedor (o NO APLICA).");
    reqText("descripcion", "Agrega una descripción.");
    reqText("uom", "Indica la unidad (UoM).");
    reqText("cotizacion", "Indica la cotización (o N/A).");
    if (value.qty === undefined || value.qty === null || Number.isNaN(Number(value.qty)) || Number(value.qty) < 0)
      e.qty = "Cantidad inválida.";
    if (value.precioUnitario === undefined || value.precioUnitario === null || Number.isNaN(Number(value.precioUnitario)) || Number(value.precioUnitario) < 0)
      e.precioUnitario = "Precio inválido (≥ 0).";
    if (byDias && (Number(value.qtyDias) || 0) < 1)
      e.qtyDias = "Indica al menos 1 día.";
    return e;
  }, [value, byDias]);

  const isValid = Object.keys(errors).length === 0;

  const set = <K extends keyof BudgetItem>(field: K, v: BudgetItem[K]) =>
    onChange(p => ({ ...p, [field]: v }));

  const spaceDay = phaseSpaceDay(value.subEventId);
  const spaceOptions = spaceNamesForItem(spaces, value.subEventId, spaceDay);

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

          {/* Area / zona */}
          <div>
            <FieldLabel>Área / Zona *</FieldLabel>
            <ComboInput value={value.area || ""} onChange={v => set("area", v)} options={allZones} placeholder="SELECCIONAR ZONA..." className={cn(errors.area && "border-destructive")} />
            {errors.area && <p className="text-[10px] text-destructive mt-1">{errors.area}</p>}
          </div>

          {/* Espacio */}
          <div>
            <FieldLabel>Espacio Asignado</FieldLabel>
            {spaceDay === "dia-2" ? (
              <ComboInput value={value.espacioDia2 || ""} onChange={v => set("espacioDia2", v)} options={spaceOptions} placeholder="SELECCIONAR ESPACIO..." />
            ) : (
              <ComboInput value={value.espacioDia1 || ""} onChange={v => set("espacioDia1", v)} options={spaceOptions} placeholder="SELECCIONAR ESPACIO..." />
            )}
          </div>

          {/* Centro de costo */}
          <div>
            <FieldLabel>Centro de Costo *</FieldLabel>
            <ComboInput value={value.centroCosto || ""} onChange={v => set("centroCosto", v)} options={allCentros} placeholder="SELECCIONAR O CREAR..." className={cn(errors.centroCosto && "border-destructive")} />
            {errors.centroCosto && <p className="text-[10px] text-destructive mt-1">{errors.centroCosto}</p>}
          </div>

          {/* Proveedor */}
          <div className="col-span-2">
            <FieldLabel>Proveedor *</FieldLabel>
            <Input value={value.proveedor || ""} onChange={e => set("proveedor", e.target.value)} placeholder="EJ. AURORA 360"
              className={cn(errors.proveedor && "border-destructive focus-visible:ring-destructive")} />
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
          </div>
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
