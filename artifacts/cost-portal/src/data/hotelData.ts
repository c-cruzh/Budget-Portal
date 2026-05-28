import { INITIAL_FLIGHTS_STATE, type FlightOption, type FlightRouteGroup } from "./flightsData";

export const HOTEL_RATE_BASE = 145;
export const HOTEL_RATE_TOTAL = 171.10;

export interface HotelGroup {
  key: string;
  label: string;
  pax: number;
}

export const HOTEL_GROUPS: HotelGroup[] = INITIAL_FLIGHTS_STATE.routes.map(r => ({
  key: r.id,
  label: r.label,
  pax: r.pax,
}));

const MONTHS_ES: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

function parseEsDate(s: string): Date | null {
  const m = s.match(/^(\d+)\s+(\w+)\s+(\d{4})/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = MONTHS_ES[m[2].toLowerCase().slice(0, 3)];
  const year = parseInt(m[3], 10);
  if (mon === undefined) return null;
  return new Date(Date.UTC(year, mon, day));
}

function isNextDayArrival(scheduleIda: string): boolean {
  // Look for "+1" after the arrival time, e.g. "SAL 06:30+1"
  const m = scheduleIda.match(/→\s*[A-Z]{3}\s*\S*?(\+\d+)/);
  return !!m;
}

export interface HotelStayDates {
  checkIn: Date | null;
  checkOut: Date | null;
  nights: number;
}

export function calcHotelStay(opt: FlightOption | undefined): HotelStayDates {
  if (!opt) return { checkIn: null, checkOut: null, nights: 0 };
  const idaDate = parseEsDate(opt.scheduleIda.split(":")[0] + ":");
  // scheduleIda is "17 nov 2026: ..." — match leading date.
  const idaMatch = opt.scheduleIda.match(/^(\d+\s+\w+\s+\d{4})/);
  const vueltaMatch = opt.scheduleVuelta.match(/^(\d+\s+\w+\s+\d{4})/);
  const outDate = idaMatch ? parseEsDate(idaMatch[1]) : idaDate;
  const retDate = vueltaMatch ? parseEsDate(vueltaMatch[1]) : null;
  if (!outDate || !retDate) return { checkIn: null, checkOut: null, nights: 0 };
  const checkIn = new Date(outDate);
  if (isNextDayArrival(opt.scheduleIda)) {
    checkIn.setUTCDate(checkIn.getUTCDate() + 1);
  }
  const checkOut = retDate;
  const msPerDay = 24 * 60 * 60 * 1000;
  const nights = Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay));
  return { checkIn, checkOut, nights };
}

export function calcHotelNights(opt: FlightOption | undefined): number {
  return calcHotelStay(opt).nights;
}

export function getSelectedFlightOption(route: FlightRouteGroup | undefined): FlightOption | undefined {
  if (!route) return undefined;
  return route.options.find(o => o.id === route.selectedOptionId);
}

export interface HotelChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface HotelState {
  rooms: Record<string, number>;
  notes: string;
  checklist: HotelChecklistItem[];
  rateBase: number;
  rateTotal: number;
}

export const INITIAL_HOTEL_STATE: HotelState = {
  rooms: {
    sfo: 7,
    "bos-econ": 8,
    "bos-biz": 3,
    mex: 5,
    mde: 1,
  },
  notes: "",
  checklist: [
    { id: "c1", text: "Confirmar bloqueo de habitaciones con el hotel", done: false },
    { id: "c2", text: "Enviar lista final de pasajeros al hotel", done: false },
    { id: "c3", text: "Validar early check-in para grupos con llegada nocturna", done: false },
    { id: "c4", text: "Confirmar tarifa negociada $145 base + IVA + Turismo ($171.10 total)", done: false },
    { id: "c5", text: "Definir política de late check-out para vuelos de la tarde", done: false },
  ],
  rateBase: HOTEL_RATE_BASE,
  rateTotal: HOTEL_RATE_TOTAL,
};
