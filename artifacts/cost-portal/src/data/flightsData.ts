export type FlightStatus = "Pendiente" | "En revisión" | "Aprobado" | "Reservado";

export interface FlightOption {
  id: string;
  airline: string;
  badge: "RECOMENDADO" | "ALTERNATIVA" | "ECONÓMICO";
  fareClass: string;
  flightNumbers: string;
  scheduleIda: string;
  scheduleVuelta: string;
  duration: string;
  stops: string;
  pricePerPax: number;
  includes: string;
  deepLink: string;
}

export interface FlightRouteGroup {
  id: string;
  label: string;
  origin: string;
  destination: string;
  pax: number;
  defaultFareClass: string;
  selectedOptionId: string;
  status: FlightStatus;
  notes: string;
  originalPerPax: number;
  initialLivePerPax: number;
  lastCaptureDate: string;
  options: FlightOption[];
}

export interface FlightHistoryEntry {
  date: string;
  source: string;
  prices: Record<string, number>;
  changes?: { optId: string; from: number; to: number; deltaPct: number }[];
}

export interface FlightLogisticsArrival {
  date: string;
  time: string;
  origin: string;
  group: string;
  pax: number;
  flight: string;
  depTime: string;
}

export interface FlightLogisticsDeparture {
  date: string;
  time: string;
  destination: string;
  group: string;
  pax: number;
  flight: string;
  arrTime: string;
}

export interface FlightsState {
  routes: FlightRouteGroup[];
  history: FlightHistoryEntry[];
  arrivals: FlightLogisticsArrival[];
  departures: FlightLogisticsDeparture[];
  nextSteps: string[];
}

export const INITIAL_FLIGHTS_STATE: FlightsState = {
  routes: [
    {
      id: "sfo",
      label: "Grupo A — SFO ⇄ SAL",
      origin: "SFO",
      destination: "SAL",
      pax: 7,
      defaultFareClass: "Economy Classic",
      selectedOptionId: "sfo-1",
      status: "En revisión",
      notes: "La alternativa Avianca nocturna podría reducir noches de hotel (llegan el 18 en la mañana). Riesgo: cualquier retraso y no llegan al Día 1.",
      originalPerPax: 887.76,
      initialLivePerPax: 728,
      lastCaptureDate: "2026-05-27",
      options: [
        {
          id: "sfo-1",
          airline: "Avianca",
          badge: "RECOMENDADO",
          fareClass: "Economy Classic",
          flightNumbers: "Directo (op. Taca)",
          scheduleIda: "17 nov 2026: SFO 13:20 → SAL 20:50",
          scheduleVuelta: "20 nov 2026: SAL 07:45 → SFO 12:20",
          duration: "5h 30m directo",
          stops: "Directo",
          pricePerPax: 748,
          includes: "🧳 1 maleta 23kg · 💺 asiento gratis · ✈️ LifeMiles · 🔄 cambios con cargo",
          deepLink: "https://www.google.com/travel/flights?q=Avianca+nonstop+flights+to+SAL+from+SFO+on+2026-11-17+through+2026-11-20",
        },
        {
          id: "sfo-2",
          airline: "Avianca",
          badge: "ALTERNATIVA",
          fareClass: "Economy Classic",
          flightNumbers: "Directo nocturno (op. Taca)",
          scheduleIda: "17 nov 2026: SFO 23:10 → SAL 06:30+1",
          scheduleVuelta: "20 nov 2026: SAL 17:30 → SFO 22:06",
          duration: "5h 20m directo",
          stops: "Directo",
          pricePerPax: 748,
          includes: "🧳 1 maleta 23kg · 💺 asiento gratis · ✈️ LifeMiles · 🔄 cambios con cargo",
          deepLink: "https://www.google.com/travel/flights?q=Avianca+nonstop+flights+to+SAL+from+SFO+on+2026-11-17+through+2026-11-20",
        },
        {
          id: "sfo-3",
          airline: "American",
          badge: "ECONÓMICO",
          fareClass: "Main Cabin",
          flightNumbers: "1 escala vía DFW",
          scheduleIda: "17 nov 2026: SFO 23:59 → SAL 13:27+1",
          scheduleVuelta: "20 nov 2026: SAL → SFO",
          duration: "11h 28m · 4h 36m conexión DFW",
          stops: "1 escala (DFW)",
          pricePerPax: 671,
          includes: "🧳 1ra maleta ~$40 · 💺 asiento gratis · ✈️ AAdvantage · 🔄 cambios sin cargo intl",
          deepLink: "https://www.google.com/travel/flights?q=American+flights+to+SAL+from+SFO+on+2026-11-17+through+2026-11-20",
        },
      ],
    },
    {
      id: "bos-econ",
      label: "Grupo B — BOS ⇄ SAL Economy",
      origin: "BOS",
      destination: "SAL",
      pax: 8,
      defaultFareClass: "Economy Classic",
      selectedOptionId: "bos-econ-2",
      status: "En revisión",
      notes: "Si se logra renegociar con Avianca, vamos con la opción recomendada; si no, con Copa.",
      originalPerPax: 773.76,
      initialLivePerPax: 449,
      lastCaptureDate: "2026-05-27",
      options: [
        {
          id: "bos-econ-1",
          airline: "Avianca",
          badge: "RECOMENDADO",
          fareClass: "Economy Classic",
          flightNumbers: "AV445/AV444 · A320neo · único directo",
          scheduleIda: "16 nov 2026: BOS 15:25 → SAL 20:15",
          scheduleVuelta: "20 nov 2026: SAL 07:45 → BOS 14:55",
          duration: "5h 50m directo",
          stops: "Directo",
          pricePerPax: 606,
          includes: "🧳 1 maleta 23kg · 💺 asiento gratis · ✈️ LifeMiles · 🔄 cambios con cargo",
          deepLink: "https://www.google.com/travel/flights?q=Avianca+nonstop+flights+to+SAL+from+BOS+on+2026-11-16+through+2026-11-20",
        },
        {
          id: "bos-econ-2",
          airline: "Copa",
          badge: "ECONÓMICO",
          fareClass: "Economy Classic",
          flightNumbers: "1 escala vía PTY (Panamá)",
          scheduleIda: "16 nov 2026: BOS 15:07 → SAL 23:36",
          scheduleVuelta: "20 nov 2026: SAL → BOS",
          duration: "9h 29m · 1h 47m conexión PTY",
          stops: "1 escala (PTY)",
          pricePerPax: 469,
          includes: "🧳 1 maleta 23kg · 💺 asiento gratis · ✈️ ConnectMiles · 🔄 cambios $75-150",
          deepLink: "https://www.google.com/travel/flights?q=Copa+flights+to+SAL+from+BOS+on+2026-11-16+through+2026-11-20",
        },
        {
          id: "bos-econ-3",
          airline: "United",
          badge: "ALTERNATIVA",
          fareClass: "Main Cabin",
          flightNumbers: "1 escala vía EWR (Newark)",
          scheduleIda: "16 nov 2026: BOS 12:30 → SAL 22:47",
          scheduleVuelta: "20 nov 2026: SAL → BOS",
          duration: "11h 17m · 4h 22m conexión EWR",
          stops: "1 escala (EWR)",
          pricePerPax: 512,
          includes: "🧳 1ra maleta ~$40 · 💺 asiento gratis · ✈️ MileagePlus · 🔄 cambios sin cargo intl",
          deepLink: "https://www.google.com/travel/flights?q=United+flights+to+SAL+from+BOS+on+2026-11-16+through+2026-11-20",
        },
      ],
    },
    {
      id: "bos-biz",
      label: "Grupo B — BOS ⇄ SAL Business",
      origin: "BOS",
      destination: "SAL",
      pax: 3,
      defaultFareClass: "Business Classic",
      selectedOptionId: "bos-biz-1",
      status: "En revisión",
      notes: "",
      originalPerPax: 1811.76,
      initialLivePerPax: 1344,
      lastCaptureDate: "2026-05-27",
      options: [
        {
          id: "bos-biz-1",
          airline: "Avianca",
          badge: "RECOMENDADO",
          fareClass: "Business Classic",
          flightNumbers: "AV445/AV444 · directo",
          scheduleIda: "16 nov 2026: BOS 15:25 → SAL 20:15",
          scheduleVuelta: "20 nov 2026: SAL 07:45 → BOS 14:55",
          duration: "5h 50m directo",
          stops: "Directo",
          pricePerPax: 1495,
          includes: "🧳 2 maletas 32kg · 🏛️ VIP Lounge · 💺 lie-flat · ✈️ 10 LifeMiles/$1 · 🔄 cambios gratis · 💳 reembolsable",
          deepLink: "https://www.google.com/travel/flights?q=Avianca+nonstop+Business+class+flights+to+SAL+from+BOS+on+2026-11-16+through+2026-11-20",
        },
        {
          id: "bos-biz-3",
          airline: "American",
          badge: "ALTERNATIVA",
          fareClass: "Flagship Business",
          flightNumbers: "1 escala vía DFW ⚠️ riesgo 48 min",
          scheduleIda: "16 nov 2026: BOS 05:32 → SAL 13:27",
          scheduleVuelta: "20 nov 2026: SAL → BOS",
          duration: "8h 55m · 48 min DFW (ALTO RIESGO)",
          stops: "1 escala (DFW)",
          pricePerPax: 1025,
          includes: "🧳 2 maletas 32kg · 🏛️ Flagship Lounge · 💺 lie-flat · ✈️ 5x Loyalty · 🔄 cambios sin cargo",
          deepLink: "https://www.google.com/travel/flights?q=American+Business+class+flights+to+SAL+from+BOS+on+2026-11-16+through+2026-11-20",
        },
      ],
    },
    {
      id: "mex",
      label: "Grupo C — MEX ⇄ SAL",
      origin: "MEX",
      destination: "SAL",
      pax: 5,
      defaultFareClass: "Economy Classic",
      selectedOptionId: "mex-1",
      status: "En revisión",
      notes: "",
      originalPerPax: 441.74,
      initialLivePerPax: 297,
      lastCaptureDate: "2026-05-27",
      options: [
        {
          id: "mex-1",
          airline: "Avianca",
          badge: "RECOMENDADO",
          fareClass: "Economy Classic",
          flightNumbers: "Directo (op. Taca)",
          scheduleIda: "17 nov 2026: MEX 16:50 → SAL 19:05",
          scheduleVuelta: "20 nov 2026: SAL 09:16 → MEX 10:55",
          duration: "2h 15m directo",
          stops: "Directo",
          pricePerPax: 297,
          includes: "🧳 1 maleta 23kg · 💺 asiento gratis · ✈️ LifeMiles · 🔄 cambios con cargo",
          deepLink: "https://www.google.com/travel/flights?q=Avianca+nonstop+flights+to+SAL+from+MEX+on+2026-11-17+through+2026-11-20",
        },
        {
          id: "mex-2",
          airline: "Aeromexico",
          badge: "ALTERNATIVA",
          fareClass: "Clásica",
          flightNumbers: "Directo ⚠️ sin maleta",
          scheduleIda: "17 nov 2026: MEX 11:30 → SAL 13:56",
          scheduleVuelta: "20 nov 2026: SAL → MEX",
          duration: "2h 26m directo",
          stops: "Directo",
          pricePerPax: 298,
          includes: "⚠️ NO incluye maleta (+$30-50/pax) · 💺 asiento gratis · ✈️ 8 Rewards/$1",
          deepLink: "https://www.google.com/travel/flights?q=Aeromexico+nonstop+flights+to+SAL+from+MEX+on+2026-11-17+through+2026-11-20",
        },
        {
          id: "mex-3",
          airline: "Avianca",
          badge: "ALTERNATIVA",
          fareClass: "Economy Classic",
          flightNumbers: "Directo red-eye (op. Taca)",
          scheduleIda: "17 nov 2026: MEX 04:00 → SAL 06:05",
          scheduleVuelta: "20 nov 2026: SAL → MEX",
          duration: "2h 5m directo",
          stops: "Directo",
          pricePerPax: 297,
          includes: "🧳 1 maleta 23kg · 💺 asiento gratis · ✈️ LifeMiles · 🔄 cambios con cargo",
          deepLink: "https://www.google.com/travel/flights?q=Avianca+nonstop+flights+to+SAL+from+MEX+on+2026-11-17+through+2026-11-20",
        },
      ],
    },
    {
      id: "mde",
      label: "Grupo D — MDE ⇄ SAL",
      origin: "MDE",
      destination: "SAL",
      pax: 1,
      defaultFareClass: "Economy Classic",
      selectedOptionId: "mde-1",
      status: "En revisión",
      notes: "",
      originalPerPax: 530.10,
      initialLivePerPax: 362,
      lastCaptureDate: "2026-05-27",
      options: [
        {
          id: "mde-1",
          airline: "Avianca",
          badge: "RECOMENDADO",
          fareClass: "Economy Classic",
          flightNumbers: "Directo (op. Taca)",
          scheduleIda: "17 nov 2026: MDE 14:10 → SAL 16:00",
          scheduleVuelta: "20 nov 2026: SAL → MDE",
          duration: "2h 50m directo",
          stops: "Directo",
          pricePerPax: 360,
          includes: "🧳 1 maleta 23kg · 💺 asiento gratis · ✈️ LifeMiles · 🔄 cambios con cargo",
          deepLink: "https://www.google.com/travel/flights?q=Avianca+nonstop+flights+to+SAL+from+MDE+on+2026-11-17+through+2026-11-20",
        },
        {
          id: "mde-2",
          airline: "Copa",
          badge: "ALTERNATIVA",
          fareClass: "Economy Classic",
          flightNumbers: "1 escala vía PTY",
          scheduleIda: "17 nov 2026: MDE 09:17 → SAL 12:41",
          scheduleVuelta: "20 nov 2026: SAL → MDE",
          duration: "4h 24m · 50 min PTY",
          stops: "1 escala (PTY)",
          pricePerPax: 431,
          includes: "🧳 1 maleta 23kg · 💺 asiento gratis · ✈️ ConnectMiles · 🔄 cambios $75-150",
          deepLink: "https://www.google.com/travel/flights?q=Copa+flights+to+SAL+from+MDE+on+2026-11-17+through+2026-11-20",
        },
        {
          id: "mde-3",
          airline: "Avianca",
          badge: "ALTERNATIVA",
          fareClass: "Economy Classic",
          flightNumbers: "1 escala vía BOG",
          scheduleIda: "17 nov 2026: MDE 06:25 → SAL 11:05",
          scheduleVuelta: "20 nov 2026: SAL → MDE",
          duration: "5h 40m · 1h 45m BOG",
          stops: "1 escala (BOG)",
          pricePerPax: 433,
          includes: "🧳 1 maleta 23kg · 💺 asiento gratis · ✈️ LifeMiles · 🔄 cambios con cargo",
          deepLink: "https://www.google.com/travel/flights?q=Avianca+flights+to+SAL+from+MDE+on+2026-11-17+through+2026-11-20",
        },
      ],
    },
  ],
  history: [
    {
      date: "2026-05-25",
      source: "Captura inicial — Google Flights",
      prices: {
        "sfo-1": 728, "sfo-2": 728, "sfo-3": 651,
        "bos-econ-1": 606, "bos-econ-2": 449, "bos-econ-3": 520,
        "bos-biz-1": 1344, "bos-biz-3": 1236,
        "mex-1": 297, "mex-2": 301, "mex-3": 297,
        "mde-1": 362, "mde-2": 433, "mde-3": 435,
      },
    },
    {
      date: "2026-05-27",
      source: "Refresh Mié — Google Flights",
      prices: {
        "sfo-1": 748, "sfo-2": 748, "sfo-3": 671,
        "bos-econ-1": 606, "bos-econ-2": 469, "bos-econ-3": 512,
        "bos-biz-1": 1495, "bos-biz-3": 1025,
        "mex-1": 297, "mex-2": 298, "mex-3": 297,
        "mde-1": 360, "mde-2": 431, "mde-3": 433,
      },
      changes: [
        { optId: "sfo-1", from: 728, to: 748, deltaPct: 2.7 },
        { optId: "bos-econ-2", from: 449, to: 469, deltaPct: 4.5 },
        { optId: "bos-biz-1", from: 1344, to: 1495, deltaPct: 11.2 },
        { optId: "bos-biz-3", from: 1236, to: 1025, deltaPct: -17.1 },
      ],
    },
  ],
  arrivals: [
    { date: "16 nov 2026", time: "20:15", origin: "BOS", group: "Grupo B (Biz)", pax: 3, flight: "Avianca AV445", depTime: "15:25" },
    { date: "16 nov 2026", time: "23:36", origin: "BOS", group: "Grupo B (Econ)", pax: 8, flight: "Copa (vía PTY)", depTime: "15:07" },
    { date: "17 nov 2026", time: "16:00", origin: "MDE", group: "Grupo D", pax: 1, flight: "Avianca", depTime: "14:10" },
    { date: "17 nov 2026", time: "19:05", origin: "MEX", group: "Grupo C", pax: 5, flight: "Avianca", depTime: "16:50" },
    { date: "17 nov 2026", time: "20:50", origin: "SFO", group: "Grupo A", pax: 7, flight: "Avianca", depTime: "13:20" },
  ],
  departures: [
    { date: "20 nov 2026", time: "07:45", destination: "SFO", group: "Grupo A", pax: 7, flight: "Avianca", arrTime: "12:20" },
    { date: "20 nov 2026", time: "07:45", destination: "BOS", group: "Grupo B (Biz)", pax: 3, flight: "Avianca AV444", arrTime: "14:55" },
    { date: "20 nov 2026", time: "09:16", destination: "MEX", group: "Grupo C", pax: 5, flight: "Avianca", arrTime: "10:55" },
    { date: "20 nov 2026", time: "Por confirmar", destination: "BOS", group: "Grupo B (Econ)", pax: 8, flight: "Copa (vía PTY)", arrTime: "" },
    { date: "20 nov 2026", time: "Por confirmar", destination: "MDE", group: "Grupo D", pax: 1, flight: "Avianca", arrTime: "" },
  ],
  nextSteps: [
    "Decidir escenario: Esc.1 Recomendado vs Esc.2 BOS Copa",
    "Contactar Avianca Corporate (corporate@avianca.com) — tarifa grupal 17 pax",
    "Validar disponibilidad 7 asientos juntos en Avianca SFO-SAL (Grupo A)",
    "⚠️ Validar disponibilidad 8 asientos en Avianca BOS-SAL 16 nov (solo 4 vuelos/sem)",
    "Confirmar precio Business 3 pax BOS-SAL (Avianca)",
    "Recolectar pasaportes y datos completos de los 24 pasajeros",
    "Definir preferencias de asiento (ventana/pasillo) por pasajero",
    "Definir si todos necesitan maleta 23kg o solo carry-on",
    "⏰ Reservar antes de agosto 2026",
    "Confirmar seguro de viaje para los 24 pax",
    "Coordinar traslados aeropuerto-hotel en San Salvador",
    "Si BOS Economy va con Copa: confirmar tiempo conexión PTY 1h 47m es suficiente",
  ],
};
