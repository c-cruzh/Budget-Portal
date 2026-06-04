export interface SpaceEntry {
  id: string;
  zone: string;
  name: string;
  aforo?: number;
  image?: string;
}

/**
 * A Lugar/Sede (physical venue) that groups its own Áreas/Zonas + Espacios.
 * These venues are independent of the ESEN Día 1 / Día 2 axis; their day, if
 * any, is conveyed via `subtitle` / zone naming, not a structural day key.
 */
export interface Venue {
  id: string;
  name: string;
  subtitle?: string;
  entries: SpaceEntry[];
  /** Sub-events this Lugar belongs to (empty/undefined = global). */
  subEventIds?: string[];
}

interface SeedRow {
  zone: string;
  name: string;
  aforo?: number;
}

/**
 * Faithful Día 1 / Día 2 venue layout from Espacios_EmTech_FINAL.xlsx.
 * Order matters — it is preserved (grouped by first-appearance zone) so the
 * Espacios tab mirrors the Excel. Some names repeat under different zones
 * (e.g. "Isla Temporal @ Lobby"); they are intentionally kept as separate
 * entries.
 */
const DIA_1_SEED: SeedRow[] = [
  { zone: "Ingreso & Parqueo", name: "Pluma", aforo: 1 },
  { zone: "Ingreso & Parqueo", name: "Parqueo Zona A", aforo: 200 },
  { zone: "Ingreso & Parqueo", name: "Parqueo Zona B" },
  { zone: "Ingreso & Parqueo", name: "Parqueo Zona C" },
  { zone: "Ingreso & Parqueo", name: "Parqueo Zona D" },
  { zone: "Ingreso & Parqueo", name: "Drop off zone (acceso C)" },
  { zone: "Ingreso & Parqueo / Accesos Discapacitados", name: "Entrada discapacitados @ Rampa Nivel 1" },
  { zone: "Ingreso & Parqueo", name: "Intersección principal parqueo" },
  { zone: "Ingreso & Parqueo / Accesos Discapacitados", name: "Entrada discapacitados @ Rampa Drop off zone" },
  { zone: "Registro", name: "Pasillo Hacia Registro Contiguo a Plaza Ricardo Lagorreta" },
  { zone: "Registro", name: "Pasillo Hacia Registro Gradas/Rampa" },
  { zone: "Registro", name: "Vestibulo Nivel 2 Frente a Speaker & Press Room" },
  { zone: "Speaker & Press Room", name: "Aula 12 @ Nivel 2", aforo: 34 },
  { zone: "Ascensor", name: "Ascensor" },
  { zone: "Escaleras", name: "Nivel 1 a Nivel 2 & Nivel 2 a Nivel 3" },
  { zone: "Baños", name: "Baños frente a Pasillo Interno Gradas/Rampa" },
  { zone: "Gradas Principales Externas", name: "Gradas Principales (Acceso B)" },
  { zone: "Gradas Secundarias Externas", name: "Gradas Secundarias (Acceso A)" },
  { zone: "Short form experience room A", name: "Aula 24 @ Nivel 3", aforo: 63 },
  { zone: "Short form experience room B", name: "Aula 23 @ Nivel 3", aforo: 72 },
  { zone: "Living Space Nivel 3", name: "Zonas Abiertas + Pasillos afuera de Aulas Nivel 3" },
  { zone: "Volunteer Room", name: "Aula 21", aforo: 34 },
];

const DIA_2_SEED: SeedRow[] = [
  { zone: "Ingreso & Parqueo", name: "Pluma", aforo: 1 },
  { zone: "Ingreso & Parqueo", name: "Parqueo zona A", aforo: 200 },
  { zone: "Ingreso & Parqueo", name: "Parqueo zona B" },
  { zone: "Ingreso & Parqueo", name: "Parqueo zona C" },
  { zone: "Ingreso & Parqueo", name: "Parqueo zona D" },
  { zone: "Ingreso & Parqueo / Accesos Discapacitados", name: "Entrada discapacitados @ rampa n1" },
  { zone: "Ingreso & Parqueo", name: "Intersección principal parqueo" },
  { zone: "Ingreso & Parqueo / Accesos Discapacitados", name: "Entrada discapacitados @ Rampa Drop off zone" },
  { zone: "Ingreso & Parqueo", name: "Drop off zone (acceso A)" },
  { zone: "Gradas Principales Externas", name: "Gradas Principales (Acceso B)" },
  { zone: "Gradas Secundarias Externas", name: "Gradas Secundarias" },
  { zone: "Registro", name: "Pasillo Hacia Registro Contiguo a Plaza Ricardo Lagorreta" },
  { zone: "Registro", name: "Vestibulo Nivel 2 Frente a Lab Informatica" },
  { zone: "Escalera Internas Lobby", name: "Paredon Escaleras Lobby" },
  { zone: "Escaleras Externas via Parqueo D", name: "Escaleras Externas via Parqueo D" },
  { zone: "Queue exterior", name: "Fachada exterior auditorio (en L)" },
  { zone: "Registro", name: "Lobby" },
  { zone: "Main Stage", name: "Auditorio", aforo: 300 },
  { zone: "Back Stage", name: "Back Stage" },
  { zone: "Coffee Break Pick-up Zone (AM/PM)", name: "Isla Temporal @ Lobby" },
  { zone: "Living space Nivel 1", name: "Cafeteria" },
  { zone: "Living space Nivel 1", name: "Terraza" },
  { zone: "Lunch Pick-up Zone", name: "Isla Temporal @ Lobby" },
  { zone: "Zona de Alimentos / Estacion Permanente de Bebidas / Bar", name: "Ping Pong Room" },
  { zone: "Estacion de Cafe Permanente", name: "Pasillo Frente a Baños" },
  { zone: "Baños", name: "Baños @ Cafeteria" },
  { zone: "Speaker & Press Room", name: "Aula 12 @ Nivel 2", aforo: 34 },
  { zone: "Volunteers room", name: "Aula N @ Nivel 1", aforo: 72 },
  { zone: "Ascensor", name: "Ascensor" },
  { zone: "Escaleras", name: "Nivel 1 a Nivel 2 & Nivel 2 a Nivel 3" },
];

function withIds(rows: SeedRow[], day: string): SpaceEntry[] {
  return rows.map((r, i) => ({
    id: `sp-${day}-${i + 1}`,
    zone: r.zone,
    name: r.name,
    ...(r.aforo != null ? { aforo: r.aforo } : {}),
  }));
}

export function buildSpacesSeedEntries(): { "dia-1": SpaceEntry[]; "dia-2": SpaceEntry[] } {
  return {
    "dia-1": withIds(DIA_1_SEED, "d1"),
    "dia-2": withIds(DIA_2_SEED, "d2"),
  };
}

interface VenueSeedRow {
  /** Área/Zona heading. */
  zone: string;
  /** Espacio name. Empty when the área has no assigned space yet. */
  name?: string;
  aforo?: number;
}

interface VenueSeed {
  name: string;
  subtitle?: string;
  subEventIds?: string[];
  rows: VenueSeedRow[];
}

/**
 * Additional physical venues seeded alongside the ESEN layout. They are
 * independent of the Día 1 / Día 2 axis; any day reference lives in the
 * subtitle / zone name. For each row, the text BEFORE the "@" is the Área/Zona
 * and the text AFTER is the Espacio.
 */
const VENUES_SEED: VenueSeed[] = [
  {
    name: "Hotel",
    subEventIds: ["dia-1", "dia-2"],
    rows: [
      { zone: "Nativo Lounge Bar" },
      { zone: "Breakfast", name: "Las Tunas" },
      { zone: "VIP attendee meetup", name: "Nativo Lounge Bar" },
      { zone: "Meeting point", name: "Lobby" },
      { zone: "Transport drop off", name: "Main entrance" },
    ],
  },
  {
    name: "Aeropuerto",
    subEventIds: ["dia-1", "dia-2"],
    rows: [
      { zone: "Sala VIP", name: "SAL (CEPA)" },
      { zone: "Pickup zone de Sala VIP", name: "SAL (CEPA)" },
    ],
  },
  {
    name: "Il Bongustaio",
    subtitle: 'Cena VIP "Ania" (Día 1)',
    subEventIds: ["cena-ania"],
    rows: [{ zone: "Cena VIP (Día 1)", name: "Salón principal" }],
  },
  {
    name: "Monarca",
    subtitle: "Cena VIP (Día 2)",
    subEventIds: ["cena-vip"],
    rows: [{ zone: "Cena VIP (Día 2)", name: "Terraza" }],
  },
  {
    name: "BINAES — Biblioteca Nacional de El Salvador",
    subtitle: "Lanzamiento",
    subEventIds: ["lanzamiento"],
    rows: [
      { zone: "Nivel 7", name: "Auditorio" },
      { zone: "Nivel 7", name: "Vestíbulo frente al auditorio" },
    ],
  },
];

export function buildVenuesSeed(): Venue[] {
  return VENUES_SEED.map((v, vi) => ({
    id: `venue-${vi + 1}`,
    name: v.name,
    ...(v.subtitle ? { subtitle: v.subtitle } : {}),
    ...(v.subEventIds && v.subEventIds.length ? { subEventIds: v.subEventIds } : {}),
    entries: v.rows.map((r, ri) => ({
      id: `venue-${vi + 1}-${ri + 1}`,
      zone: r.zone,
      name: r.name ?? "",
      ...(r.aforo != null ? { aforo: r.aforo } : {}),
    })),
  }));
}
