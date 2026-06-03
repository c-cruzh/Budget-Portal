export interface ColumnDef {
  id: string;
  label: string;
  always?: boolean;
}

export const BUDGET_COLUMNS: ColumnDef[] = [
  { id: "item", label: "Item", always: true },
  { id: "centroCosto", label: "Centro Costo" },
  { id: "qty", label: "Qty" },
  { id: "uom", label: "UoM" },
  { id: "tipo", label: "Tipo" },
  { id: "dia", label: "Día" },
  { id: "dias", label: "Dias" },
  { id: "precioUnit", label: "P. Unit." },
  { id: "subtotal", label: "Subtotal" },
  { id: "viaProductora", label: "Via Productora" },
  { id: "feeEnCotiz", label: "Fee en Cotiz." },
  { id: "fee", label: "Fee 20%" },
  { id: "iva", label: "IVA" },
  { id: "turismo", label: "Turismo" },
  { id: "total", label: "Total" },
  { id: "cotizacion", label: "Cotizacion" },
  { id: "status", label: "Status" },
  { id: "soloPresup", label: "Solo Presup." },
  { id: "proveedor", label: "Proveedor" },
  { id: "assigned", label: "Assigned" },
  { id: "imgRef", label: "Img. Ref." },
  { id: "flags", label: "Flags" },
];

export const COLUMN_PRESETS: Record<string, string[]> = {
  esenciales: ["item", "qty", "uom", "dia", "precioUnit", "dias", "total", "status", "flags"],
  financiera: [
    "item", "qty", "uom", "dia", "precioUnit", "dias", "subtotal",
    "fee", "iva", "turismo", "total", "status", "flags",
  ],
  completa: BUDGET_COLUMNS.map(c => c.id),
};

export const DEFAULT_VISIBLE = COLUMN_PRESETS.esenciales;
