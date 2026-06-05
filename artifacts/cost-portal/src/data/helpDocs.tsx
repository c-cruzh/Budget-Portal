import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Compass, ShieldCheck, EyeOff, Cloud, BookOpen,
  LayoutDashboard, TableProperties, CalendarRange, Search, Table2,
  FileSpreadsheet, Columns3, ListChecks, MousePointerClick, MessageSquare,
  CheckCircle2, Sparkles, Tags, CalendarClock, Calculator, Receipt, Truck,
  MapPin, Plane, Bus, BedDouble, Wine, HandHelping, Calendar, HandCoins,
  History as HistoryIcon, Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EVENT_PHASES,
  STATUS_COLORS, STATUS_SHORT_LABELS,
} from "@/data/budgetData";

export interface HelpEntry {
  term: string;
  desc: string;
}

export interface HelpSection {
  id: string;
  title: string;
  icon: LucideIcon;
  intro?: string;
  entries: HelpEntry[];
  /** Optional rich React content shown in the dialog (not included in the Markdown export). */
  extra?: ReactNode;
}

export interface HelpCategory {
  id: string;
  title: string;
  icon: LucideIcon;
  sections: HelpSection[];
}

function PhaseBadgeExample({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded border font-medium whitespace-nowrap"
      style={{ color, backgroundColor: `${color}1a`, borderColor: `${color}33` }}
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

export const HELP_DOCS: HelpCategory[] = [
  {
    id: "intro",
    title: "Primeros pasos",
    icon: Compass,
    sections: [
      {
        id: "que-es",
        title: "Qué es este portal",
        icon: BookOpen,
        intro: "Portal de organizadores para gestionar todos los costos y la logística del evento EmTech Digital El Salvador 2026. Es la única fuente de verdad: lo que se ve aquí es lo que vale.",
        entries: [
          { term: "Presupuesto vivo", desc: "Todos los costos viven en Budget Items. Las demás pestañas (vuelos, hotel, catering, etc.) son herramientas de planeación que se reflejan o alimentan ese presupuesto." },
          { term: "Multi-organización", desc: "Tres organizaciones colaboran en el mismo portal con distintos permisos: C2 LABS (edita), OPINNO (comenta) y AURORA360 (solo lectura)." },
          { term: "Todo se guarda solo", desc: "No hay botón de 'Guardar'. Cada cambio se sincroniza con la nube automáticamente." },
        ],
      },
      {
        id: "nav",
        title: "Navegación y pestañas",
        icon: Compass,
        intro: "El menú lateral izquierdo lista todas las secciones. La barra superior muestra en qué pestaña estás y quién eres.",
        entries: [
          { term: "Menú lateral", desc: "Cambia entre Overview, Budget Items, Agenda, Voluntarios, Espacios, Transporte, Hotel, Catering, Sponsors, Historial y Tareas." },
          { term: "Pestañas 'Deprecated'", desc: "Algunas pestañas viejas (Budget Items Vieja, Bar & Bebidas, Lunch) llevan una etiqueta ámbar 'Deprecated'. Se conservan como referencia; el trabajo nuevo va en las versiones vigentes." },
          { term: "Menú según organización", desc: "Algunas pestañas solo aparecen para ciertas organizaciones (por ejemplo, Budget Items Vieja solo la ve C2 LABS)." },
          { term: "Menú móvil", desc: "En pantallas pequeñas, el ícono de menú abre la navegación; toca fuera para cerrarla." },
        ],
      },
      {
        id: "roles",
        title: "Roles y permisos",
        icon: ShieldCheck,
        intro: "Lo que puedes hacer depende de tu organización. Tu nivel aparece como una etiqueta de color junto a tu nombre, abajo en el menú lateral.",
        entries: [
          { term: "Edición completa (C2 LABS)", desc: "Editan todas las celdas, activan banderas, marcan items como revisados, agregan y borran items, y aplican acciones en lote." },
          { term: "Solo comentar (OPINNO)", desc: "Ven todo y pueden agregar o editar la Descripción y las Notas de un item a modo de comentario, pero no modifican montos, banderas ni estructura." },
          { term: "Solo lectura (AURORA360)", desc: "Ven, buscan y filtran, pero no editan nada." },
          { term: "Edición de taxonomía (solo C2 LABS)", desc: "Crear, renombrar, reordenar o dar color a sub-eventos, áreas y centros de costo está restringido a C2 LABS, aun por encima del permiso de edición de items." },
        ],
      },
      {
        id: "redact",
        title: "Modo redactado (AURORA360)",
        icon: EyeOff,
        intro: "Para proteger costos negociados con terceros, AURORA360 ve ocultos los montos de los items que no son suyos.",
        entries: [
          { term: "Qué se oculta", desc: "Precio unitario, subtotal, fee, IVA, turismo y total de items ajenos a AURORA360 aparecen con un candado en lugar del monto." },
          { term: "Items propios de AURORA360", desc: "Los items vía productora (Aurora 360) o cuyo proveedor es AURORA360 se muestran completos." },
          { term: "También en el CSV", desc: "Al exportar, esas columnas de montos salen vacías para los items ajenos, respetando la misma confidencialidad que la pantalla." },
        ],
      },
      {
        id: "sync",
        title: "Sincronización en la nube",
        icon: Cloud,
        intro: "Tus cambios se guardan automáticamente en el servidor con un breve retardo.",
        entries: [
          { term: "Cloud sync active", desc: "Un indicador verde en la parte superior confirma que la conexión está activa y los cambios se guardan solos." },
          { term: "Estado de error", desc: "Si la conexión falla, el indicador se pone rojo; tus últimos cambios podrían no haberse guardado. Revisa tu conexión." },
          { term: "Última edición", desc: "Junto al indicador se muestra quién hizo el último cambio, de qué organización y cuándo." },
        ],
      },
      {
        id: "export-docs",
        title: "Exportar esta documentación para IA",
        icon: BookOpen,
        intro: "Esta guía completa se puede descargar o copiar en formato Markdown, pensado para pegarlo en un asistente de IA y conversar sobre cómo usar el portal.",
        entries: [
          { term: "Descargar .md", desc: "Genera un archivo Markdown con toda la documentación del portal, listo para adjuntar a un chat de IA o guardar como manual." },
          { term: "Copiar para IA", desc: "Copia toda la documentación al portapapeles. Pégala en ChatGPT, Claude u otro asistente y pregúntale cómo hacer cualquier tarea o cómo interpretar los números." },
          { term: "Siempre actualizada", desc: "El texto exportado se genera desde esta misma Ayuda, así que refleja las funciones vigentes del portal." },
        ],
      },
    ],
  },
  {
    id: "dashboard",
    title: "Overview (Dashboard)",
    icon: LayoutDashboard,
    sections: [
      {
        id: "dash-kpis",
        title: "Tarjetas e indicadores",
        icon: LayoutDashboard,
        intro: "El Overview resume la salud financiera del evento de un vistazo.",
        entries: [
          { term: "KPIs principales", desc: "Totales de presupuesto, gasto en efectivo (sin fee), in-kind y cotizaciones pendientes." },
          { term: "Vía productora vs directo", desc: "Compara el gasto que va por Aurora 360 (con fee 20%) contra el contratado directo." },
          { term: "Top costos", desc: "Ranking de los items más caros para enfocar la negociación." },
          { term: "Nice to Have", desc: "Suma de items deseables pero no esenciales — candidatos a recortar si hay que ajustar." },
        ],
      },
      {
        id: "dash-charts",
        title: "Gráficas de análisis",
        icon: LayoutDashboard,
        intro: "Desgloses visuales del gasto por distintas dimensiones.",
        entries: [
          { term: "Por fase del evento", desc: "Gasto por cada día/fase (lanzamiento, main event, cenas, llegadas, salidas)." },
          { term: "Por área/zona y centro de costo", desc: "Identifica qué áreas y centros concentran el presupuesto." },
          { term: "Por proveedor", desc: "Cuánto se concentra en cada proveedor." },
          { term: "Estado de cotizaciones", desc: "Cuántos items están recibidos, pendientes o in-kind." },
        ],
      },
    ],
  },
  {
    id: "budget",
    title: "Budget Items",
    icon: TableProperties,
    sections: [
      {
        id: "bi-final-vieja",
        title: "Final vs Vieja",
        icon: TableProperties,
        intro: "Existen dos tablas de presupuesto. La vigente para todo el equipo es 'Budget Items (Final)'.",
        entries: [
          { term: "Budget Items (Final)", desc: "La tabla oficial y vigente, visible para todas las organizaciones. Aquí va el trabajo nuevo." },
          { term: "Budget Items (Vieja)", desc: "Versión heredada con los datos originales, marcada como 'Deprecated' y visible solo para C2 LABS como referencia." },
        ],
      },
      {
        id: "bi-summary",
        title: "Tarjetas de resumen (KPIs)",
        icon: LayoutDashboard,
        intro: "Las tarjetas superiores reflejan siempre lo que está filtrado en ese momento, no todo el catálogo.",
        entries: [
          { term: "Total Budget", desc: "Suma total de todos los items visibles, incluyendo fee del 20% e IVA." },
          { term: "Cash (Sin Fee)", desc: "Gasto en efectivo en productos y servicios más IVA, sin el fee de la productora. Excluye items in-kind." },
          { term: "Fee Productora", desc: "Total de fees del 20% de Aurora 360. 'Incl' = ya viene dentro de la cotización; 'Adic' = fee extra que se suma al total." },
          { term: "In-Kind Total", desc: "Valor de las contribuciones en especie: donaciones, venue y patrocinios que no se pagan en efectivo." },
          { term: "Presupuestado", desc: "Monto de items 'solo presupuestado' — estimados internos sin cotización formal." },
          { term: "Pending Quotes", desc: "Cantidad de items con cotización PENDING (sin respuesta del proveedor)." },
          { term: "Acción Req. / A Validar / Aparte / Nice to Have", desc: "Banderas de seguimiento: requieren acción, conviene validar costo, conviene contratar directo (evitar fee), o son deseables pero recortables." },
        ],
      },
      {
        id: "bi-search",
        title: "Búsqueda y filtros",
        icon: Search,
        intro: "Combina la búsqueda libre con los filtros para acotar la tabla. Todos los KPIs y exportaciones respetan lo filtrado.",
        entries: [
          { term: "Búsqueda", desc: "Busca texto en item, descripción, notas, área, centro de costo, cotización, proveedor y responsable asignado." },
          { term: "Event / Area / Cost Center", desc: "Selectores rápidos que se encadenan: al elegir un evento se ajustan las áreas disponibles." },
          { term: "Filtros avanzados", desc: "Panel con filtros adicionales: proveedor, productora, fee en cotización, status, in-kind, precio, día, banderas y más." },
          { term: "Chips de filtro", desc: "Cada filtro activo aparece como etiqueta removible; haz clic en la 'x' para quitarlo." },
        ],
      },
      {
        id: "bi-table",
        title: "Tabla y edición en línea",
        icon: Table2,
        intro: "La tabla agrupa los items por sub-evento, área y centro de costo, y permite editar la mayoría de campos haciendo clic en la celda.",
        entries: [
          { term: "Filas agrupadas", desc: "Usa las flechas para expandir o contraer cada grupo." },
          { term: "Encabezados ordenables", desc: "Clic en un encabezado para ordenar (asc/desc); un tercer clic quita el orden." },
          { term: "Editar celdas", desc: "Clic en una celda con borde punteado para editarla. Enter guarda, Escape cancela; se guarda solo en la nube." },
          { term: "Recálculo automático", desc: "Al cambiar cantidad, precio, días, fee o IVA, el subtotal, fee, IVA y total se recalculan al instante." },
          { term: "Tooltip del Item", desc: "Pasa el cursor sobre el nombre del item para ver su Descripción y Notas completas." },
        ],
      },
      {
        id: "bi-dialog",
        title: "Formulario de alta / edición (unificado)",
        icon: Sparkles,
        intro: "Un único formulario validado para crear y editar items, con todos los campos en un solo lugar.",
        entries: [
          { term: "Mismo formulario para todo", desc: "Crear y editar usan el mismo diálogo, así no hay campos que se 'pierdan' entre una acción y otra." },
          { term: "Campos obligatorios", desc: "Item, fase, área, centro de costo, proveedor, descripción, unidad, cotización, cantidad y precio (y días si es por día) muestran error en línea y bloquean Guardar hasta completarse." },
          { term: "Campos opcionales", desc: "Notas, enlace e imagen están claramente marcados como '(Opcional)'." },
          { term: "Combos con búsqueda", desc: "Área, espacio, proveedor y similares se eligen de listas existentes con búsqueda, o escribiendo un valor nuevo." },
          { term: "Vista previa del total", desc: "El diálogo muestra el desglose del costo en vivo, que se actualiza conforme editas los campos." },
        ],
      },
      {
        id: "bi-day",
        title: "Modelo de días (por día / qtyDias)",
        icon: CalendarClock,
        intro: "El conteo de días es explícito: tú decides cuántos días se cobra un item, sin reglas ocultas.",
        entries: [
          { term: "Fase del evento (Día)", desc: "Cada item pertenece a una fase (Lanzamiento, Main Event Día 1/2, Cenas, Llegadas, Salidas). Es un campo obligatorio e independiente del costo." },
          { term: "Contratación por días", desc: "Si un item se cobra por día, marca 'Por días' e indica cuántos (qtyDias). El subtotal = cantidad × días × precio." },
          { term: "Sin duplicar costos", desc: "Ya no hay reglas que dupliquen el costo automáticamente por la fase: lo que ves cobrado es exactamente lo que configuraste." },
        ],
      },
      {
        id: "bi-iva",
        title: "Modos de IVA (Crudo / Incluido / Exento)",
        icon: Receipt,
        intro: "Cada item declara explícitamente cómo se trata el IVA del 13%, para que el total nunca sea ambiguo.",
        entries: [
          { term: "Crudo (raw)", desc: "El precio no trae IVA. Se calcula el 13% sobre (base + fee) y se suma al total." },
          { term: "Incluido", desc: "El precio ya trae IVA. La base se obtiene dividiendo entre 1.13 y no se vuelve a sumar IVA." },
          { term: "Exento", desc: "El item no causa IVA; el IVA es 0." },
          { term: "Cómo cambiarlo", desc: "Desde la celda de IVA en la tabla (cicla entre los tres modos) o desde el formulario de edición." },
        ],
      },
      {
        id: "bi-breakdown",
        title: "Desglose del total por item",
        icon: Calculator,
        intro: "Cada total se puede 'abrir' para ver exactamente cómo se construyó, sin tener que confiar a ciegas en el número.",
        entries: [
          { term: "Tooltip en el Total", desc: "Pasa el cursor sobre el total de una fila (subrayado punteado) para ver el desglose: Bruto → Base antes de IVA → Fee Aurora 360 → Subtotal + fee → IVA 13% → Turismo 5% → Total." },
          { term: "Vista previa en el formulario", desc: "Al crear o editar, el mismo desglose aparece en vivo y se actualiza con cada cambio." },
          { term: "Siempre fiel a la matemática real", desc: "El desglose se calcula con la misma fórmula que el total, así que nunca se contradice con la cifra mostrada." },
          { term: "Badges informativos", desc: "Marca casos especiales como 'Incluido' (fee o IVA ya dentro del precio), 'Exento' o item in-kind." },
        ],
      },
      {
        id: "bi-transport",
        title: "Trazabilidad de transporte / entregas",
        icon: Truck,
        intro: "Permite marcar una línea como transporte/montaje y vincularla a los items que entrega o instala, todo dentro de Budget Items.",
        entries: [
          { term: "Marcar como transporte", desc: "En el formulario, activa la casilla de transporte/entrega y elige el modo." },
          { term: "Vincular items cubiertos", desc: "Selecciona (búsqueda + chips) qué items entrega o instala esa línea de transporte." },
          { term: "Modo 'Asociación'", desc: "Solo deja la traza del vínculo; el costo del transporte se cuenta entero una sola vez." },
          { term: "Modo 'Asignación'", desc: "Reparte, solo para visualización, el costo del transporte entre los items cubiertos. No cambia los totales reales." },
          { term: "Badges bidireccionales", desc: "Las líneas de transporte muestran 'Entrega N'; los items cubiertos muestran 'Entregado', con tooltips que listan los vínculos." },
        ],
      },
      {
        id: "bi-subevents",
        title: "Sub-eventos y espacios",
        icon: CalendarRange,
        intro: "El presupuesto se organiza por sub-evento; cada item puede asignarse a un espacio físico con aforo.",
        entries: [
          { term: "Pestañas de sub-evento", desc: "Filtran la tabla por sub-evento. 'Todos' muestra el catálogo completo. Cada tarjeta resume gasto, in-kind y pendientes de ese sub-evento." },
          { term: "Espacio por item", desc: "Cada item referencia un espacio concreto (por su identificador). La lista de espacios sale del catálogo de Espacios." },
          { term: "Aforo / Capacidad", desc: "Si la suma de cantidades asignadas a un espacio supera su aforo, aparece una alerta con el espacio, el día y el conteo (asignado/aforo)." },
          { term: "Área / Zona", desc: "El campo Área/Zona se alimenta de todas las zonas del catálogo de Espacios (ESEN y demás sedes), no solo de una." },
        ],
      },
      {
        id: "bi-badges",
        title: "Estados y días (badges)",
        icon: Tags,
        intro: "Las etiquetas de color comunican de un vistazo el estado de cotización y la fase de cada item. Estos son los badges reales:",
        entries: [
          { term: "Estado de cotización", desc: "Verde = recibida sin observaciones; amarillo = recibida con observaciones; naranja = pending; rojo = pendiente de cotizar; violeta = no aplica/in-kind; ámbar = pendiente de alternativa." },
          { term: "Badge de Día", desc: "Indica la fase del evento del item; cada fase tiene su color." },
          { term: "Reasignar día", desc: "Con permiso de edición, haz clic en el badge de Día (o en la etiqueta de color del item) y elige la fase. La fase es solo categórica: no cambia el costo. Los días que se cobran se controlan aparte, con 'Por días' y qtyDias." },
        ],
        extra: BadgeExamples,
      },
      {
        id: "bi-comments",
        title: "Comentarios sin permiso de edición",
        icon: MessageSquare,
        intro: "Usuarios con permiso de comentar (OPINNO) pueden colaborar dejando notas en los items.",
        entries: [
          { term: "Editar Descripción y Notas", desc: "Pueden agregar o editar la Descripción y las Notas de un item aunque no modifiquen el resto de campos." },
          { term: "Dónde se editan", desc: "Bajo el nombre del item aparecen '+ desc' y '+ nota'. El texto se guarda solo y queda visible en el tooltip del item." },
          { term: "El resto queda bloqueado", desc: "Montos, banderas y cotizaciones siguen siendo de solo lectura para quien solo puede comentar." },
        ],
      },
      {
        id: "bi-review",
        title: "Marcar como revisado",
        icon: CheckCircle2,
        intro: "Cada fila lleva registro de qué items ya validó el equipo.",
        entries: [
          { term: "Botón de revisión", desc: "El círculo con check al inicio de la fila marca el item como revisado. Verde = revisado; gris = sin revisar. Requiere permiso de edición." },
          { term: "Quién revisó", desc: "Al marcarlo queda registrado tu nombre; el tooltip muestra 'Reviewed por <nombre>'. Vuelve a hacer clic para quitar la marca." },
        ],
      },
      {
        id: "bi-rowactions",
        title: "Acciones por fila",
        icon: MousePointerClick,
        intro: "Cada fila ofrece controles para seleccionar, gestionar cotizaciones, enlaces y banderas.",
        entries: [
          { term: "Casilla de selección", desc: "Marca uno o varios items para aplicarles acciones en lote desde la barra inferior." },
          { term: "Cotización aprobada", desc: "Cuando un item tiene varias cotizaciones, marca cuál es la aprobada; esa define el precio que entra al total." },
          { term: "Enlaces y tareas", desc: "Abre el documento o cotización en una pestaña nueva, edita el enlace, o crea una tarea de seguimiento ligada al item." },
          { term: "Banderas", desc: "Activa/desactiva 'Validar costo', 'Contratar aparte' (evitar fee) y 'Acción requerida'. Alimentan los KPIs y los filtros." },
        ],
      },
      {
        id: "bi-bulk",
        title: "Barra de acciones en lote",
        icon: ListChecks,
        intro: "Al seleccionar items aparece una barra inferior para aplicar cambios a todos a la vez.",
        entries: [
          { term: "Edición en lote", desc: "Cambia de golpe el status, proveedor, área o centro de costo de la selección." },
          { term: "Banderas en lote", desc: "Activa o quita banderas en toda la selección." },
          { term: "Split por día", desc: "Divide los items seleccionados por día para asignar parte a Día 1 y parte a Día 2." },
          { term: "Exportar selección / Borrar", desc: "Exporta solo los items marcados a CSV, o elimínalos en bloque (acción de edición)." },
        ],
      },
      {
        id: "bi-csv",
        title: "Exportar y columnas",
        icon: FileSpreadsheet,
        intro: "Descarga el presupuesto y personaliza la vista de la tabla.",
        entries: [
          { term: "Export CSV (completo)", desc: "Descarga todas las filas filtradas con todas las columnas: montos, fee, IVA, cotización, proveedor, banderas y más." },
          { term: "Menú de Columnas y presets", desc: "Activa/desactiva columnas o usa vistas predefinidas: 'Esenciales', 'Financiera' y 'Completa'." },
          { term: "Densidad", desc: "Alterna entre Compacta (más filas) y Cómoda (más espacio). La preferencia se recuerda en tu navegador." },
        ],
      },
    ],
  },
  {
    id: "espacios",
    title: "Espacios y aforo",
    icon: MapPin,
    sections: [
      {
        id: "esp-model",
        title: "Modelo Lugar › Zona › Espacio",
        icon: MapPin,
        intro: "El catálogo de Espacios define dónde ocurre cada cosa, en una jerarquía de tres niveles.",
        entries: [
          { term: "Lugar / Sede", desc: "El recinto (ESEN, Hotel, Aeropuerto y otras sedes). Cada uno agrupa sus zonas y espacios." },
          { term: "Área / Zona", desc: "Subdivisión dentro de una sede; alimenta el campo Área/Zona de los items del presupuesto." },
          { term: "Espacio", desc: "El salón o lugar físico concreto al que se asigna un item, con su aforo." },
        ],
      },
      {
        id: "esp-aforo",
        title: "Aforo y alertas de capacidad",
        icon: MapPin,
        intro: "Cada espacio tiene una capacidad máxima de personas (aforo) que el presupuesto vigila.",
        entries: [
          { term: "Definir aforo", desc: "Asigna a cada espacio su capacidad. Si está vacío, no se vigila." },
          { term: "Alerta de sobrecupo", desc: "En Budget Items, si las cantidades asignadas a un espacio superan su aforo, aparece una alerta roja con el conteo." },
          { term: "ESEN por día", desc: "Los espacios de ESEN son específicos por día (Día 1 / Día 2); las demás sedes son independientes del día." },
        ],
      },
    ],
  },
  {
    id: "logistica",
    title: "Logística de viajes",
    icon: Plane,
    sections: [
      {
        id: "flights",
        title: "Vuelos / Aéreo SAL",
        icon: Plane,
        intro: "Gestión de rutas de vuelo de los pasajeros y comparación de tarifas.",
        entries: [
          { term: "Grupos de ruta", desc: "Los vuelos se agrupan por ruta (speakers, staff, etc.) con su número de pasajeros." },
          { term: "Elegir opción", desc: "Cada ruta puede tener varias cotizaciones; eliges la recomendada o la económica, con itinerario de ida y vuelta." },
          { term: "Roster de pasajeros", desc: "Asocia nombres de pasajeros a cada ruta." },
          { term: "Llegadas y salidas", desc: "Se generan automáticamente líneas de tiempo de arribos y salidas según los vuelos elegidos." },
          { term: "Exportar CSV / PDF", desc: "Descarga la orden de vuelos como CSV o como PDF imprimible con resumen, itinerarios, llegadas, salidas y próximos pasos." },
        ],
      },
      {
        id: "ground",
        title: "Ground Transport",
        icon: Bus,
        intro: "Logística y costos de buses y traslados terrestres.",
        entries: [
          { term: "Segmentos", desc: "Llegadas, salidas y traslados locales (por ejemplo, Hotel ↔ ESEN)." },
          { term: "Minutos Waze", desc: "Campo editable que calcula la hora de 'salir del hotel' a partir de la llegada de los vuelos." },
          { term: "Ocupación de vehículos", desc: "Barras que muestran pasajeros y equipaje contra la capacidad del vehículo." },
          { term: "Costos con IVA", desc: "Las tarjetas muestran precios con IVA incluido; el KPI de subtotal es antes de IVA." },
        ],
      },
      {
        id: "hotel",
        title: "Hotel / Acomodaciones",
        icon: BedDouble,
        intro: "Control de bloques de habitaciones y costos del hotel.",
        entries: [
          { term: "Fechas ligadas a vuelos", desc: "El check-in/out se deriva de las opciones de vuelo elegidas en Aéreo." },
          { term: "Desglose por noche", desc: "Grilla de ocupación por noche entre todos los grupos, resaltando las noches pico." },
          { term: "Tarifa negociada", desc: "Se calcula con tarifa base fija más impuestos." },
          { term: "Vista imprimible", desc: "Orden de hotel imprimible para comunicar directamente con el hotel (rooming list)." },
        ],
      },
      {
        id: "montaje",
        title: "Montaje / Desmontaje",
        icon: Truck,
        intro: "Logística de entrega e instalación, ligada a la trazabilidad de transporte de Budget Items.",
        entries: [
          { term: "Entrega e instalación", desc: "Organiza qué se entrega, instala y desmonta, y cuándo." },
          { term: "Vínculo con el presupuesto", desc: "Se conecta con las líneas marcadas como transporte/entrega en Budget Items." },
        ],
      },
    ],
  },
  {
    id: "catering",
    title: "Catering y servicios",
    icon: Wine,
    sections: [
      {
        id: "coctel",
        title: "Networking Cocktail Day 2",
        icon: Wine,
        intro: "Hoja de servicio del cóctel de networking del Día 2 (Delibanquetes).",
        entries: [
          { term: "Menú y comparación", desc: "Items salados y dulces con comparación de escenarios de costo y servicio." },
          { term: "Tipos", desc: "Badges por tipo de bocadillo (I/II/Gourmet/Vegetarianos/Dulce)." },
        ],
      },
      {
        id: "bar-lunch",
        title: "Bar & Bebidas / Lunch (Deprecated)",
        icon: Wine,
        intro: "Pestañas de planeación de bebidas y de almuerzos/coffee breaks; marcadas como heredadas.",
        entries: [
          { term: "Bar & Bebidas", desc: "Planeación de café, agua, barra de cócteles y hielo, con lista de compras y mezcla de barra." },
          { term: "Lunch & Coffee Breaks", desc: "Menús de coffee AM/PM y almuerzo (regular y veg) por día, con montaje y transporte." },
          { term: "Solo referencia", desc: "Están marcadas como 'Deprecated'; el costeo vigente vive en Budget Items." },
        ],
      },
    ],
  },
  {
    id: "personas",
    title: "Voluntarios, Agenda y Sponsors",
    icon: HandHelping,
    sections: [
      {
        id: "voluntarios",
        title: "Voluntarios",
        icon: HandHelping,
        intro: "Roster del personal voluntario no pagado (in-kind), fuera del presupuesto monetario.",
        entries: [
          { term: "Roles por espacio", desc: "Define roles con espacio, día(s), headcount, horarios y descripción del puesto." },
          { term: "Guías y reglas", desc: "Cada rol lleva job description, do's y don'ts y lineamientos." },
          { term: "In-kind $0", desc: "Los voluntarios suman headcount pero aportan $0 a los totales del presupuesto." },
          { term: "Permisos", desc: "C2 LABS edita; OPINNO/AURORA360 solo lectura. Auto-guardado." },
        ],
      },
      {
        id: "agenda",
        title: "Agenda y sub-eventos",
        icon: Calendar,
        intro: "Línea de tiempo del evento y administración de fases/sub-eventos.",
        entries: [
          { term: "Gestor de sub-eventos", desc: "Define las fases (Llegadas, Main Event, Cenas, Salidas) y su color, que se usa en todo el portal." },
          { term: "Sesiones", desc: "Detalle de hora, título, ponente y espacio de cada sesión." },
        ],
      },
      {
        id: "sponsors",
        title: "Sponsors & Cash",
        icon: HandCoins,
        intro: "Seguimiento de ingresos y comparación contra la necesidad de efectivo.",
        entries: [
          { term: "Ledger de patrocinios", desc: "Registra montos confirmados, verbales y prospectos." },
          { term: "Escenarios", desc: "Cálculo dinámico de posición neta con toggles para incluir el fee de agencia o excluir los nice-to-have." },
          { term: "Barra de cobertura", desc: "Indicador del % del efectivo necesario que cubren los ingresos confirmados." },
        ],
      },
    ],
  },
  {
    id: "seguimiento",
    title: "Historial y Tareas",
    icon: HistoryIcon,
    sections: [
      {
        id: "history",
        title: "Historial (auditoría)",
        icon: HistoryIcon,
        intro: "Registro de todos los cambios para transparencia y trazabilidad.",
        entries: [
          { term: "Bitácora", desc: "Log de cada creación, edición y borrado." },
          { term: "Vista de diferencias", desc: "Muestra valor anterior vs nuevo en los campos modificados." },
          { term: "Filtros", desc: "Por usuario, organización o tipo de entidad (presupuesto, sponsor, etc.)." },
        ],
      },
      {
        id: "tasks",
        title: "Mis Tareas",
        icon: ListChecks,
        intro: "Tablero de tareas para validar y dar seguimiento a los datos del portal.",
        entries: [
          { term: "Tablero", desc: "Flujo tipo kanban con estados (por hacer, en curso, hecho)." },
          { term: "Generar tareas", desc: "Botón para crear automáticamente tareas de validación a partir de items con banderas." },
          { term: "Vínculo al presupuesto", desc: "Cada tarea puede ligarse a un item de Budget para navegar con un clic." },
        ],
      },
    ],
  },
  {
    id: "costos",
    title: "Lógica de costos",
    icon: Percent,
    sections: [
      {
        id: "cost-logic",
        title: "Fee, IVA, Turismo y casos especiales",
        icon: Percent,
        intro: "Así se calcula cada total. El orden es: base → fee → IVA → turismo → total.",
        entries: [
          { term: "Fee Productora 20%", desc: "Aplica solo cuando el item va 'Vía Productora' (Aurora 360). Si 'Fee en cotización = SI', ya está incluido y no se suma de nuevo; si es NO, se agrega 20% sobre la base." },
          { term: "IVA 13%", desc: "Según el modo del item: Crudo suma 13% sobre (base+fee); Incluido deriva la base dividiendo entre 1.13 sin re-sumar; Exento = 0." },
          { term: "Turismo 5%", desc: "Cuando aplica, se calcula 5% sobre el subtotal (base + fee)." },
          { term: "Por días", desc: "Si el item es por día, el subtotal = cantidad × días × precio. No hay duplicación automática por fase." },
          { term: "Avianca (vuelos)", desc: "El bloque de vuelos Avianca tiene un total cerrado todo incluido; no se le agrega IVA adicional." },
          { term: "VOLUNTARIO / NA / PROVEE ESEN", desc: "Muestran 'N/A' en la columna de cotización porque no llevan costo cotizable." },
          { term: "In-Kind", desc: "Contribuciones en especie: cuentan en el Total Budget pero se excluyen del gasto en efectivo." },
        ],
      },
    ],
  },
];
