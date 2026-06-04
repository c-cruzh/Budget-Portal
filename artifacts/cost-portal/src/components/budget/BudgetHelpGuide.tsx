import { useRef, useState, type ReactNode } from "react";
import {
  HelpCircle, LayoutGrid, CalendarRange, Search, Table2, Tags,
  MousePointerClick, ListChecks, Download, Columns3, Percent, Sparkles,
  ShieldCheck, EyeOff, MessageSquare, CheckCircle2, Cloud,
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
import {
  EVENT_PHASES,
  STATUS_COLORS, STATUS_SHORT_LABELS,
} from "@/data/budgetData";

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
  extra?: ReactNode;
}

function PhaseBadgeExample({ name, color }: { name: string; color: string }) {
  return (
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
}

function StatusBadgeExample({ value }: { value: string }) {
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap", STATUS_COLORS[value] || "border-border")}>
      {STATUS_SHORT_LABELS[value] || value}
    </span>
  );
}

const STATUS_EXAMPLES = [
  "Cotización Recibida - Sin Observaciones",
  "Cotización Recibida - Observaciones",
  "Cotización Pending",
  "Pendiente Cotizar",
  "Cotización - No Aplica (In-Kind)",
  "Pendiente Cotizar Alternativa",
];

const BadgeExamples = (
  <div className="rounded-lg border border-dashed border-card-border bg-card/30 px-3 py-3 space-y-3">
    <div>
      <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide mb-1.5">
        Estado de cotización
      </p>
      <div className="flex flex-wrap gap-1.5">
        {STATUS_EXAMPLES.map((v) => (
          <StatusBadgeExample key={v} value={v} />
        ))}
      </div>
    </div>
    <div>
      <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide mb-1.5">
        Día (fase del evento)
      </p>
      <div className="flex flex-wrap gap-1.5">
        {EVENT_PHASES.map((p) => (
          <PhaseBadgeExample key={p.id} name={p.name} color={p.color} />
        ))}
      </div>
    </div>
  </div>
);

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
    id: "roles",
    title: "Roles y permisos",
    icon: ShieldCheck,
    intro: "Lo que puedes hacer en esta pestaña depende de tu organización. Tu nivel aparece como una etiqueta de color junto al indicador de sincronización, en la parte superior.",
    entries: [
      { term: "Edición completa (Editor)", desc: "Usuarios de C2 LABS. Pueden editar todas las celdas, activar banderas, marcar items como revisados, agregar y borrar items, y aplicar acciones en lote." },
      { term: "Solo comentar (Commenter)", desc: "Usuarios de OPINNO. Pueden agregar o editar la Descripción y las Notas de un item a modo de comentario, pero no modificar montos, banderas ni la estructura del presupuesto." },
      { term: "Solo lectura (Viewer)", desc: "Usuarios de AURORA360. Pueden ver, buscar y filtrar el presupuesto, pero no editar nada." },
      { term: "Controles que solo aparecen con permiso de edición", desc: "Las celdas con borde punteado, los botones de bandera, el botón 'Add Item' y la opción de borrar solo se muestran si tienes permiso de edición. Sin ese permiso, la tabla es solo de consulta." },
      { term: "Edición de taxonomía (solo C2 LABS)", desc: "Crear, renombrar, reordenar o dar color a sub-eventos, áreas y centros de costo está restringido a C2 LABS, aun por encima del permiso de edición de items." },
    ],
  },
  {
    id: "redact",
    title: "Modo redactado (AURORA360)",
    icon: EyeOff,
    intro: "Para proteger la información de costos negociada con otros proveedores, los usuarios de AURORA360 ven ocultos los montos de los items que no son de AURORA360.",
    entries: [
      { term: "Qué se oculta", desc: "El precio unitario, subtotal, fee, IVA, turismo y total de los items que no pertenecen a AURORA360 aparecen con un candado en lugar del monto." },
      { term: "Items propios de AURORA360", desc: "Los items que van vía productora (Aurora 360) o cuyo proveedor es AURORA360 se muestran completos, con todos sus montos visibles." },
      { term: "También en el CSV", desc: "Al exportar, esas mismas columnas de montos salen vacías para los items ajenos, de modo que el archivo descargado respeta la misma confidencialidad que la pantalla." },
      { term: "Por qué", desc: "Permite a AURORA360 revisar el alcance y la logística del evento sin exponer el detalle de los costos negociados con terceros." },
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
    id: "comments",
    title: "Comentarios sin permiso de edición",
    icon: MessageSquare,
    intro: "Algunos usuarios sin permiso de edición completa pueden colaborar dejando comentarios en los items.",
    entries: [
      { term: "Editar Descripción y Notas", desc: "Los usuarios con permiso de comentar (OPINNO) pueden agregar o editar la Descripción y las Notas de un item, aun cuando no puedan modificar el resto de sus campos." },
      { term: "Dónde se editan", desc: "Debajo del nombre del item aparecen los campos '+ desc' y '+ nota'. Haz clic para escribir; el texto se guarda solo y queda visible en el tooltip del item." },
      { term: "El resto queda bloqueado", desc: "Montos, banderas, cotizaciones y demás campos siguen siendo de solo lectura para quien únicamente puede comentar." },
    ],
  },
  {
    id: "badges",
    title: "Estados y días",
    icon: Tags,
    intro: "Las etiquetas de color comunican de un vistazo el estado de cotización y a qué día pertenece cada item. Estos son los badges reales tal como aparecen en la tabla:",
    entries: [
      { term: "Estado de cotización", desc: "Verde = recibida sin observaciones; amarillo = recibida con observaciones; naranja = cotización pending; rojo = pendiente de cotizar; violeta = no aplica / in-kind; ámbar = pendiente de alternativa." },
      { term: "Badge de Día", desc: "Indica la fase del evento del item: Lanzamiento, Main Event Día 1, Main Event Día 2, Cena VIP, Cena VIP Ania, Day of Arrivals (16–17 Nov) y Day of Departures (20 Nov). Cada fase tiene su color." },
      { term: "Reasignar día", desc: "Con permiso de edición, haz clic en el badge de Día (o en la etiqueta de color del item) y elige la fase del evento. Ambos editan el mismo valor, así que nunca se contradicen. Day of Arrivals cuenta 2 días para costos por día; el resto cuenta 1." },
    ],
    extra: BadgeExamples,
  },
  {
    id: "review",
    title: "Marcar como revisado (Reviewed)",
    icon: CheckCircle2,
    intro: "Cada fila tiene un control para llevar registro de qué items ya fueron revisados por el equipo.",
    entries: [
      { term: "Botón de revisión", desc: "El círculo con un check al inicio de cada fila marca el item como revisado. Verde = revisado; gris = sin revisar. Requiere permiso de edición." },
      { term: "Quién revisó", desc: "Al marcarlo, queda registrado tu nombre. Al pasar el cursor sobre el botón verás 'Reviewed por <nombre>'. Vuelve a hacer clic para quitar la marca." },
      { term: "Para qué sirve", desc: "Ayuda al equipo a hacer seguimiento de qué items ya fueron validados y cuáles faltan por revisar." },
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
    id: "add",
    title: "Agregar item",
    icon: Sparkles,
    intro: "Puedes ampliar el presupuesto creando items nuevos desde cero.",
    entries: [
      { term: "Botón 'Add Item'", desc: "Disponible con permiso de edición. Abre un formulario para crear un item nuevo: nombre, evento, área, centro de costo, cantidad, precio y demás campos." },
      { term: "Se integra al instante", desc: "El item nuevo aparece en la tabla dentro de su grupo y se incluye en los KPIs y exportaciones según los filtros activos." },
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
    id: "sync",
    title: "Sincronización en la nube",
    icon: Cloud,
    intro: "Tus cambios se guardan automáticamente en el servidor; no hay un botón de 'Guardar'.",
    entries: [
      { term: "Cloud sync active", desc: "El indicador verde en la parte superior confirma que la conexión con el servidor está activa y los cambios se están guardando solos (con un breve retardo)." },
      { term: "Estado de error", desc: "Si la conexión falla, el indicador se pone en rojo con un aviso. En ese caso tus últimos cambios podrían no haberse guardado; revisa tu conexión." },
      { term: "Última edición", desc: "Junto al indicador se muestra quién hizo la última edición, de qué organización y cuándo." },
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
        <DialogContent className="max-w-4xl p-0 gap-0 max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-primary" />
              Guía de Budget Items
            </DialogTitle>
            <DialogDescription>
              Cómo funciona cada control de esta pestaña — qué hace y para qué sirve.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 min-h-0">
            <nav className="hidden md:flex flex-col w-56 shrink-0 border-r border-border overflow-y-auto py-4 px-2 gap-0.5 bg-muted/20">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Índice
              </p>
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollTo(section.id)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                    <span className="truncate">{section.title}</span>
                  </button>
                );
              })}
            </nav>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <section
                    key={section.id}
                    ref={(el) => { sectionRefs.current[section.id] = el; }}
                    className="scroll-mt-4"
                  >
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
                    {section.extra && <div className="mt-3">{section.extra}</div>}
                  </section>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-3 border-t border-border bg-muted/30 flex justify-end">
            <Button size="sm" onClick={() => setOpen(false)}>Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
