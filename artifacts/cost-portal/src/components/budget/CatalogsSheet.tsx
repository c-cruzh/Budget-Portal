import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X, Plus, AlertTriangle, Building2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CatalogUsage {
  /** Count of budget items referencing a given proveedor name (lowercased key). */
  proveedorCounts: Record<string, number>;
  /** Count of budget items referencing a given centroCosto name (lowercased key). */
  centroCounts: Record<string, number>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  proveedores: string[];
  centrosCosto: string[];
  usage: CatalogUsage;
  onAddProveedor: (name: string) => void;
  onRenameProveedor: (oldName: string, newName: string) => void;
  onRemoveProveedor: (name: string) => void;
  onAddCentro: (name: string) => void;
  onRenameCentro: (oldName: string, newName: string) => void;
  onRemoveCentro: (name: string) => void;
}

type SectionKind = "proveedor" | "centro";

function CatalogSection({
  kind,
  title,
  icon,
  items,
  counts,
  canEdit,
  onAdd,
  onRename,
  onRemove,
}: {
  kind: SectionKind;
  title: string;
  icon: React.ReactNode;
  items: string[];
  counts: Record<string, number>;
  canEdit: boolean;
  onAdd: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onRemove: (name: string) => void;
}) {
  const [editName, setEditName] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [confirmName, setConfirmName] = useState<string | null>(null);
  const [newVal, setNewVal] = useState("");

  const startEdit = (name: string) => {
    setConfirmName(null);
    setEditName(name);
    setEditVal(name);
  };
  const cancelEdit = () => { setEditName(null); setEditVal(""); };
  const commitEdit = (oldName: string) => {
    const next = editVal.trim();
    if (next && next !== oldName) onRename(oldName, next);
    cancelEdit();
  };
  const requestDelete = (name: string, count: number) => {
    cancelEdit();
    if (count > 0) setConfirmName(name);
    else onRemove(name);
  };
  const commitAdd = () => {
    const n = newVal.trim();
    if (!n) return;
    onAdd(n);
    setNewVal("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {items.length} {items.length === 1 ? "registro" : "registros"}
        </div>
      </div>

      <div className="space-y-1.5">
        {items.length === 0 && (
          <div className="text-[11px] text-muted-foreground italic px-1 py-2">Sin registros</div>
        )}
        {items.map(name => {
          const count = counts[name.toLowerCase()] || 0;
          const isEditing = editName === name;
          const isConfirming = confirmName === name;

          if (isConfirming) {
            return (
              <div key={`c-${kind}-${name}`} className="flex items-start gap-2 p-2.5 rounded border border-destructive/40 bg-destructive/5">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <span className="text-[11px] text-foreground block">
                    <strong>{name}</strong> está en uso por {count} item{count === 1 ? "" : "s"}.
                    Si lo eliminas, esos items conservarán el texto pero ya no podrás seleccionarlo.
                  </span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="destructive" className="h-7" onClick={() => { onRemove(name); setConfirmName(null); }}>
                      Eliminar
                    </Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => setConfirmName(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={`${kind}-${name}`} className="flex items-center gap-2 p-2 rounded border border-border bg-card">
              {isEditing ? (
                <Input
                  autoFocus
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); commitEdit(name); }
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="h-7 text-xs flex-1 min-w-0"
                />
              ) : (
                <span className="text-xs flex-1 min-w-0 truncate" title={name}>{name}</span>
              )}

              <span
                className="px-1.5 py-0.5 rounded border text-[10px] tabular-nums whitespace-nowrap shrink-0 text-muted-foreground border-border/60"
                title="Items que usan este registro"
              >
                {count}
              </span>

              {canEdit && (isEditing ? (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary shrink-0" onClick={() => commitEdit(name)} title="Guardar">
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={cancelEdit} title="Cancelar">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => startEdit(name)} title="Renombrar">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => requestDelete(name, count)} title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              ))}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div className="flex items-center gap-1.5 pt-1">
          <Input
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitAdd(); } }}
            placeholder={kind === "proveedor" ? "Nuevo proveedor" : "Nuevo centro de costo"}
            className="h-8 text-xs flex-1"
          />
          <Button size="sm" variant="outline" className="h-8 gap-1 shrink-0" onClick={commitAdd} disabled={!newVal.trim()}>
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </Button>
        </div>
      )}
    </div>
  );
}

export function CatalogsSheet({
  open,
  onOpenChange,
  canEdit,
  proveedores,
  centrosCosto,
  usage,
  onAddProveedor,
  onRenameProveedor,
  onRemoveProveedor,
  onAddCentro,
  onRenameCentro,
  onRemoveCentro,
}: Props) {
  const provCounts = useMemo(() => usage.proveedorCounts, [usage]);
  const cenCounts = useMemo(() => usage.centroCounts, [usage]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Catálogos
          </SheetTitle>
          <SheetDescription>
            {canEdit
              ? "Inventario único de proveedores y centros de costo. Solo estos aparecen en los menús del presupuesto; agrega aquí para evitar duplicados. Se guarda automáticamente."
              : "Inventario de proveedores y centros de costo (solo lectura)."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
          <CatalogSection
            kind="proveedor"
            title="Proveedores"
            icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
            items={proveedores}
            counts={provCounts}
            canEdit={canEdit}
            onAdd={onAddProveedor}
            onRename={onRenameProveedor}
            onRemove={onRemoveProveedor}
          />

          <CatalogSection
            kind="centro"
            title="Centros de Costo"
            icon={<Wallet className="w-4 h-4 text-muted-foreground" />}
            items={centrosCosto}
            counts={cenCounts}
            canEdit={canEdit}
            onAdd={onAddCentro}
            onRename={onRenameCentro}
            onRemove={onRemoveCentro}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CatalogsSheet;
