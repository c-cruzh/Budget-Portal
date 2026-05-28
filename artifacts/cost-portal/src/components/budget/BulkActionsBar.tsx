import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, Download, Tag, ShieldAlert, AlertTriangle, MoveRight, ChevronDown, Columns2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface BulkActionsProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onExportCsv: () => void;
  onSetStatus: (status: string) => void;
  onSetProveedor: (proveedor: string) => void;
  onToggleFlag: (flag: "inKind" | "validarCosto" | "contratarAparte", on: boolean) => void;
  onMoveArea: (area: string) => void;
  onMoveCentro: (centro: string) => void;
  onSplitByDay: () => void;
  statusOptions: string[];
  proveedorOptions: string[];
  areaOptions: string[];
  centroOptions: string[];
}

export function BulkActionsBar(props: BulkActionsProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [proveedorDraft, setProveedorDraft] = useState("");
  const [areaDraft, setAreaDraft] = useState("");
  const [centroDraft, setCentroDraft] = useState("");

  return (
    <>
      <AnimatePresence>
        {props.count > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card shadow-lg px-3 py-2">
              <span className="text-xs font-semibold text-foreground px-2">
                {props.count} seleccionado{props.count === 1 ? "" : "s"}
              </span>

              <SimplePicker
                label="Status"
                options={props.statusOptions}
                onPick={props.onSetStatus}
              />

              <SimplePicker
                label="Proveedor"
                options={props.proveedorOptions}
                onPick={props.onSetProveedor}
                allowCustom
                customDraft={proveedorDraft}
                setCustomDraft={setProveedorDraft}
              />

              <SimplePicker
                label="Área"
                options={props.areaOptions}
                onPick={props.onMoveArea}
                allowCustom
                customDraft={areaDraft}
                setCustomDraft={setAreaDraft}
                icon={<MoveRight className="w-3 h-3" />}
              />

              <SimplePicker
                label="Centro Costo"
                options={props.centroOptions}
                onPick={props.onMoveCentro}
                allowCustom
                customDraft={centroDraft}
                setCustomDraft={setCentroDraft}
                icon={<MoveRight className="w-3 h-3" />}
              />

              <FlagPicker onToggle={props.onToggleFlag} />

              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={props.onSplitByDay}
              >
                <Columns2 className="w-3.5 h-3.5" /> Split por día
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={props.onExportCsv}
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>

              <Button
                size="sm"
                variant="destructive"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Borrar
              </Button>

              <button
                onClick={props.onClear}
                className="ml-1 text-muted-foreground hover:text-foreground"
                aria-label="Cancelar selección"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrar {props.count} items</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se borrarán definitivamente los items seleccionados del presupuesto.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDelete(false);
                props.onDelete();
              }}
            >Borrar definitivamente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SimplePicker({
  label,
  options,
  onPick,
  allowCustom,
  customDraft,
  setCustomDraft,
  icon,
}: {
  label: string;
  options: string[];
  onPick: (v: string) => void;
  allowCustom?: boolean;
  customDraft?: string;
  setCustomDraft?: (v: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
          {icon}
          {label}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <div className="max-h-64 overflow-y-auto">
          {options.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-1.5">Sin opciones</div>
          )}
          {options.map(opt => (
            <button
              key={opt || "__blank__"}
              onClick={() => onPick(opt)}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted"
            >
              {opt || <span className="text-muted-foreground italic">(vacío)</span>}
            </button>
          ))}
          {allowCustom && setCustomDraft && (
            <div className="flex gap-1 mt-1 p-1 border-t border-border">
              <input
                value={customDraft || ""}
                onChange={e => setCustomDraft(e.target.value)}
                placeholder="Otro valor..."
                className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => {
                  if (customDraft && customDraft.trim()) {
                    onPick(customDraft.trim());
                    setCustomDraft("");
                  }
                }}
                className="text-xs px-2 rounded bg-primary text-primary-foreground hover:opacity-90"
              >OK</button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FlagPicker({
  onToggle,
}: {
  onToggle: (flag: "inKind" | "validarCosto" | "contratarAparte", on: boolean) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
          <Tag className="w-3 h-3" />
          Flags
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        {([
          { key: "inKind", label: "In-Kind", Icon: Tag },
          { key: "validarCosto", label: "Validar costo", Icon: AlertTriangle },
          { key: "contratarAparte", label: "Contratar aparte", Icon: ShieldAlert },
        ] as const).map(({ key, label, Icon }) => (
          <div key={key} className="flex items-center justify-between px-2 py-1 text-xs">
            <span className="flex items-center gap-1.5">
              <Icon className="w-3 h-3" />
              {label}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => onToggle(key, true)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20"
              >Marcar</button>
              <button
                onClick={() => onToggle(key, false)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/70"
              >Quitar</button>
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
