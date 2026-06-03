import { useState } from "react";
import {
  HelpCircle, LayoutGrid, CalendarRange, Search, Table2, Tags,
  MousePointerClick, ListChecks, Download, Columns3, Percent, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GuideEntry {
  term: string;
  desc: string;
}

interface GuideSection {
  id: string;
  title: string;
  icon: typeof HelpCircle;
  intro?: string;
  entries: GuideEntry[];
}

const SECTIONS: GuideSection[] = [
  {
    id: "summary",
    title: "Tarjetas de resumen (KPIs)",
    icon: LayoutGrid,
    intro: "Las tarjetas en la parte superior resumen el presupuesto. Reflejan siempre lo que está filtrado en ese momento, no todo el catálogo.",
    entries: [
      { term: "Total Budget", desc: "Suma total de todos los items visibles, incluyendo fee del 20% e IVA." },
      { term: "Cash (Sin Fee)", desc: "Gasto en efectivo en productos y servicios más IVA, sin el fee de la productora. Excluye los items in-kind." },
      { term: "Fee Productora", desc: "Total de fees del 20% de la productora (Aurora 360). 'Incl' = ya viene dentro de la cotización; 'Adic' = fee extra que se suma al total." },
      { term: "In-Kind Total", desc: "Valor de las contribuciones en especie: donaciones, venue y patrocinios que no se pagan en efectivo." },
      { term: "Presupuestado", desc: "Monto de items 'solo presupuestado' — estimados internos que aún no tienen cotización formal." },
      { term: "Pending Quotes", desc: "Cantidad de items con cotización PENDING, es decir, sin respuesta del proveedor." },
      { term: "Acción Req.", desc: "Items marcados como que requieren acción o seguimiento inmediato." },
      { term: "A Validar", desc: "Items con posible costo inflado que conviene validar con otros proveedores." },
      { term: "Aparte", desc: "Items que conviene contratar directo (sin productora) para evitar el fee del 20%." },
      { term: "Nice to Have", desc: "Suma de items deseables pero no esenciales — candidatos a recortar si hay que ajustar el presupuesto." },
    ],
  },
  {
    id: "subevents",
    title: "Sub-eventos y espacios",
    icon: CalendarRange,
    intro: "El presupuesto se organiza por sub-evento (por ejemplo, las distintas partes del programa) y por espacio físico de cada día.",
    entries: [
      { term: "Pestañas de sub-evento", desc: "Filtran la tabla por un sub-evento. 'Todos' muestra el catálogo completo. Debajo, cada tarjeta resume el gasto, in-kind y pendientes de ese sub-evento." },
      { term: "Gestionar sub-eventos", desc: "Permite crear, renombrar, reordenar y dar color a los sub-eventos (solo edición)." },
      { term: "Gestionar espacios", desc: "Administra los espacios disponibles de cada día y su aforo (capacidad máxima de personas)." },
      { term: "Aforo / Capacidad", desc: "Cada espacio tiene un aforo. Si la suma de cantidades asignadas a un espacio supera su aforo, aparece una alerta roja con el espacio, el día y el conteo (asignado/aforo)." },
    ],
  },
  {
    id: "search",
    title: "Búsqueda y filtros",
    icon: Search,
    intro: "Combina la búsqueda libre con los filtros para acotar la tabla. Todos los KPIs y exportaciones respetan lo filtrado.",
    entries: [
      { term: "Búsqueda", desc: "Busca texto en item, descripción, notas, área, centro de costo, cotización, proveedor y responsable asignado." },
      { term: "Event / Area / Cost Center", desc: "Selectores rápidos que acotan por evento, área/zona y centro de costo. Se encadenan: al elegir un evento se ajustan las áreas disponibles." },
      { term: "Filtros (avanzados)", desc: "Abre un panel con filtros adicionales: proveedor, productora, fee en cotización, status, in-kind, precio, día, banderas (validar, aparte, etc.) y más." },
      { term: "Chips de filtro", desc: "Cada filtro activo aparece como una etiqueta removible. Haz clic en la 'x' del chip para quitar ese filtro sin abrir el panel." },
    ],
  },
  {
    id: "table",
    title: "Tabla y edición en línea",
    icon: Table2,
    intro: "La tabla agrupa los items y permite editar la mayoría de los campos haciendo clic directamente sobre la celda.",
    entries: [
      { term: "Filas agrupadas", desc: "Los items se agrupan por sub-evento, área y centro de costo. Usa las flechas para expandir o contraer cada grupo." },
      { term: "Items en varios días", desc: "Cuando un mismo item se divide por día, se muestra como una fila 'padre' expandible que suma sus partes." },
      { term: "Encabezados ordenables", desc: "Haz clic en un encabezado con flechas para ordenar por esa columna (asc/desc). Un segundo clic invierte el orden; un tercero lo quita." },
      { term: "Editar celdas", desc: "Haz clic en una celda con borde punteado para editarla. Enter guarda, Escape cancela. Los cambios se guardan solos en la nube." },
      { term: "Recálculo automático", desc: "Al cambiar cantidad, precio, días, fee o IVA, el subtotal, fee, IVA y total se recalculan al instante." },
      { term: "Tooltip del Item", desc: "Pasa el cursor sobre el nombre del item para ver su Descripción y Notas completas." },
    ],
  },
  {
    id: "badges",
    title: "Estados y días",
    icon: Tags,
    intro: "Las etiquetas de color comunican de un vistazo el estado de cotización y a qué día pertenece cada item.",
    entries: [
      { term: "Estado de cotización", desc: "Badges de color según el status: recibida (verde), con observaciones (amarillo), pendiente de cotizar (rojo/naranja) o no aplica / in-kind (violeta)." },
      { term: "Badge de Día", desc: "Indica si el item corresponde a Día 1, Día 2 o Ambos. El color distingue cada caso." },
      { term: "Reasignar día", desc: "Con permiso de edición, haz clic en el badge de Día y elige Día 1, Día 2 o Ambos en el menú emergente." },
    ],
  },
  {
    id: "rowactions",
    title: "Acciones por fila",
    icon: MousePointerClick,
    intro: "Cada fila ofrece controles para seleccionar, gestionar cotizaciones, enlaces y banderas de seguimiento.",
    entries: [
      { term: "Casilla de selección", desc: "Marca uno o varios items para aplicarles acciones en lote desde la barra inferior." },
      { term: "Cotización aprobada", desc: "Cuando un item tiene varias cotizaciones, puedes marcar cuál es la aprobada; esa define el precio que entra al total." },
      { term: "Enlaces y tareas", desc: "Abre el documento o cotización en una pestaña nueva, edita el enlace, o crea una tarea de seguimiento ligada al item." },
      { term: "Banderas (Validar / Aparte / Acción Req.)", desc: "Activa o desactiva las banderas: 'Validar costo', 'Contratar aparte' (evitar fee) y 'Acción requerida'. Alimentan los KPIs y los filtros." },
    ],
  },
  {
    id: "bulk",
    title: "Barra de acciones en lote",
    icon: ListChecks,
    intro: "Al seleccionar items aparece una barra inferior para aplicar cambios a todos a la vez.",
    entries: [
      { term: "Edición en lote", desc: "Cambia de golpe el status, proveedor, área o centro de costo de todos los items seleccionados." },
      { term: "Banderas en lote", desc: "Activa o quita banderas (validar, aparte, acción requerida, etc.) en toda la selección." },
      { term: "Split por día", desc: "Divide los items seleccionados por día para asignar parte a Día 1 y parte a Día 2." },
      { term: "Exportar selección / Borrar", desc: "Exporta solo los items seleccionados a CSV, o elimínalos en bloque (acción de edición)." },
    ],
  },
  {
    id: "csv",
    title: "Exportar CSV",
    icon: Download,
    intro: "Puedes descargar el presupuesto como archivo CSV para abrirlo en Excel o Google Sheets.",
    entries: [
      { term: "Export CSV (completo)", desc: "Descarga todas las filas que estén filtradas en ese momento, con todas las columnas: montos, fee, IVA, cotización, proveedor, banderas y más." },
      { term: "Exportar selección", desc: "Desde la barra de acciones en lote, descarga solo los items marcados con un conjunto reducido de campos clave." },
    ],
  },
  {
    id: "columns",
    title: "Columnas y densidad",
    icon: Columns3,
    intro: "Personaliza qué columnas ves y qué tan compacta es la tabla. La preferencia se recuerda en tu navegador.",
    entries: [
      { term: "Menú de Columnas", desc: "Activa o desactiva columnas individuales según lo que necesites revisar." },
      { term: "Presets", desc: "Vistas predefinidas: 'Esenciales' (lo básico), 'Financiera' (con desglose de montos) y 'Completa' (todas las columnas)." },
      { term: "Densidad", desc: "Alterna entre Compacta (más filas a la vista) y Cómoda (más espacio y texto más grande)." },
    ],
  },
  {
    id: "fee",
    title: "Lógica de fee e IVA",
    icon: Percent,
    intro: "Así se calculan el fee de la productora, el IVA y algunos casos especiales.",
    entries: [
      { term: "Fee Productora 20%", desc: "Aplica solo cuando el item va 'Vía Productora' (Aurora 360). Si 'Fee en cotización = SI', el fee ya está incluido y no se suma de nuevo; si es NO, se agrega el 20% sobre el subtotal." },
      { term: "IVA 13%", desc: "Se calcula 13% sobre el subtotal más el fee (cuando aplica). Algunos items pueden estar marcados como exentos de IVA." },
      { term: "Avianca (vuelos)", desc: "El bloque de vuelos Avianca tiene un total cerrado todo incluido; no se le agrega IVA adicional." },
      { term: "VOLUNTARIO / NA / PROVEE ESEN", desc: "Estos items muestran 'N/A' en la columna de cotización porque no llevan un costo cotizable." },
    ],
  },
];

export function BudgetHelpGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
        title="Cómo funciona esta pestaña"
      >
        <HelpCircle className="w-4 h-4" />
        Ayuda
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-primary" />
              Guía de Budget Items
            </DialogTitle>
            <DialogDescription>
              Cómo funciona cada control de esta pestaña — qué hace y para qué sirve.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <section key={section.id} className="scroll-mt-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                  </div>
                  {section.intro && (
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{section.intro}</p>
                  )}
                  <dl className="space-y-2.5">
                    {section.entries.map((e, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "rounded-lg border border-card-border bg-card/50 px-3 py-2.5",
                        )}
                      >
                        <dt className="text-sm font-medium text-foreground">{e.term}</dt>
                        <dd className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">{e.desc}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>

          <div className="px-6 py-3 border-t border-border bg-muted/30 flex justify-end">
            <Button size="sm" onClick={() => setOpen(false)}>Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
