import { cn } from "@/lib/utils";

interface PrintFlightRow {
  grupo: string;
  ruta: string;
  pax: number;
  aerolinea: string;
  claseTarifaria: string;
  numerosVuelo: string;
  itinerarioIda: string;
  itinerarioVuelta: string;
  escalas: string;
  duracion: string;
  incluye: string;
  tarifaPorPax: number;
  subtotal: number;
  tarifaOriginalPorPax: number;
  ahorroVsOriginal: number;
}

interface PrintLogisticsArrival {
  date: string; time: string; origin: string; group: string; pax: number; flight: string; depTime: string;
}
interface PrintLogisticsDeparture {
  date: string; time: string; destination: string; group: string; pax: number; flight: string; arrTime: string;
}

export interface FlightOrderPrintViewProps {
  rows: PrintFlightRow[];
  totals: { totalSelected: number; totalOriginal: number; totalPax: number };
  arrivals: PrintLogisticsArrival[];
  departures: PrintLogisticsDeparture[];
  nextSteps: string[];
  generatedAt: Date;
}

function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function FlightOrderPrintView({
  rows,
  totals,
  arrivals,
  departures,
  nextSteps,
  generatedAt,
}: FlightOrderPrintViewProps) {
  const savings = totals.totalOriginal - totals.totalSelected;
  const savingsPct = totals.totalOriginal > 0 ? (savings / totals.totalOriginal) * 100 : 0;

  return (
    <div className="flight-print-doc">
      <style>{`
        @page { size: Letter; margin: 18mm 16mm; }
        body { margin: 0; }
        .flight-print-doc {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          color: #111;
          background: #fff;
          font-size: 11pt;
          line-height: 1.4;
          padding: 24px;
          max-width: 1000px;
          margin: 0 auto;
        }
        .hp-header { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
        .hp-title { font-size: 16pt; font-weight: 700; margin: 0; }
        .hp-subtitle { font-size: 11pt; color: #555; margin: 4px 0 0; }
        .hp-meta { font-size: 9pt; color: #666; margin-top: 6px; }
        .hp-section { margin-top: 18px; }
        .hp-section-title { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 8px; border-bottom: 1px solid #999; padding-bottom: 3px; }
        .hp-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 24px; font-size: 10.5pt; }
        .hp-summary div { display: flex; justify-content: space-between; border-bottom: 1px dotted #bbb; padding: 3px 0; }
        .hp-summary .lbl { color: #555; }
        .hp-summary .val { font-weight: 600; }
        table.hp-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        table.hp-table th, table.hp-table td { border: 1px solid #888; padding: 5px 7px; vertical-align: top; }
        table.hp-table th { background: #eee; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.03em; }
        table.hp-table td.num, table.hp-table th.num { text-align: right; font-variant-numeric: tabular-nums; }
        table.hp-table tfoot td { font-weight: 700; background: #f3f3f3; }
        .hp-itin { font-size: 9.5pt; }
        .hp-itin .leg { display: block; }
        .hp-itin .leg b { color: #333; }
        .hp-incl { color: #444; font-size: 9pt; }
        .hp-footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 8.5pt; color: #777; text-align: center; }
        .hp-signoff { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 10pt; }
        .hp-signoff .line { border-top: 1px solid #111; padding-top: 4px; margin-top: 50px; text-align: center; }
        .hp-steps { margin: 0; padding-left: 18px; font-size: 10pt; }
        .hp-steps li { padding: 2px 0; }
        .hp-print-btn { position: fixed; top: 12px; right: 12px; background: #2563eb; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; font-size: 11pt; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
        .hp-pos { color: #047857; }
        .hp-neg { color: #b91c1c; }
        @media print {
          .hp-print-btn { display: none !important; }
          .flight-print-doc { padding: 0; max-width: none; }
          .hp-section { break-inside: avoid; }
          table.hp-table tr { break-inside: avoid; }
        }
      `}</style>

      <button
        type="button"
        className="hp-print-btn"
        onClick={() => window.print()}
      >
        Imprimir
      </button>

      <header className="hp-header">
        <h1 className="hp-title">EmTech Digital El Salvador 2026 — MIT Technology Review</h1>
        <p className="hp-subtitle">Orden final de vuelos — Bloque aéreo</p>
        <p className="hp-meta">Generado: {generatedAt.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</p>
      </header>

      <section className="hp-section">
        <h2 className="hp-section-title">Resumen de la orden</h2>
        <div className="hp-summary">
          <div><span className="lbl">Total grupos / rutas</span><span className="val">{rows.length}</span></div>
          <div><span className="lbl">Total pasajeros (PAX)</span><span className="val">{totals.totalPax}</span></div>
          <div><span className="lbl">Total seleccionado</span><span className="val">{fmtUSD(totals.totalSelected)}</span></div>
          <div><span className="lbl">Cotización original</span><span className="val">{fmtUSD(totals.totalOriginal)}</span></div>
          <div><span className="lbl">{savings >= 0 ? "Ahorro total" : "Sobrecosto total"}</span><span className={cn("val", savings >= 0 ? "hp-pos" : "hp-neg")}>{fmtUSD(Math.abs(savings))}</span></div>
          <div><span className="lbl">vs Original</span><span className={cn("val", savings >= 0 ? "hp-pos" : "hp-neg")}>{Math.abs(savingsPct).toFixed(1)}% {savings >= 0 ? "menor" : "mayor"}</span></div>
        </div>
      </section>

      <section className="hp-section">
        <h2 className="hp-section-title">Orden de vuelos por grupo</h2>
        <table className="hp-table">
          <thead>
            <tr>
              <th>Grupo / Ruta</th>
              <th className="num">PAX</th>
              <th>Aerolínea / Clase</th>
              <th>Vuelos · Escalas</th>
              <th className="num">Tarifa/pax</th>
              <th className="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><b>{r.grupo}</b><br /><span style={{ color: "#555" }}>{r.ruta}</span></td>
                <td className="num">{r.pax}</td>
                <td>{r.aerolinea}<br /><span style={{ color: "#555" }}>{r.claseTarifaria}</span></td>
                <td>{r.numerosVuelo}<br /><span style={{ color: "#555" }}>{r.escalas} · {r.duracion}</span></td>
                <td className="num">{fmtUSD(r.tarifaPorPax)}</td>
                <td className="num">{fmtUSD(r.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>TOTAL</td>
              <td className="num">{totals.totalPax}</td>
              <td colSpan={3}></td>
              <td className="num">{fmtUSD(totals.totalSelected)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="hp-section">
        <h2 className="hp-section-title">Itinerario y tarifas por grupo</h2>
        <table className="hp-table">
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Itinerario</th>
              <th>Incluye</th>
              <th className="num">vs Original</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><b>{r.grupo}</b></td>
                <td className="hp-itin">
                  <span className="leg"><b>Ida:</b> {r.itinerarioIda || "—"}</span>
                  <span className="leg"><b>Vuelta:</b> {r.itinerarioVuelta || "—"}</span>
                </td>
                <td className="hp-incl">{r.incluye || "—"}</td>
                <td className={cn("num", r.ahorroVsOriginal >= 0 ? "hp-pos" : "hp-neg")}>
                  {r.ahorroVsOriginal >= 0 ? "−" : "+"}{fmtUSD(Math.abs(r.ahorroVsOriginal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="hp-section">
        <h2 className="hp-section-title">Llegadas (arribos a SAL)</h2>
        <table className="hp-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora llegada</th>
              <th>Origen</th>
              <th>Grupo</th>
              <th className="num">PAX</th>
              <th>Vuelo</th>
              <th>Hora salida</th>
            </tr>
          </thead>
          <tbody>
            {arrivals.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#666" }}>Sin llegadas</td></tr>
            ) : arrivals.map((a, i) => (
              <tr key={i}>
                <td>{a.date}</td>
                <td>{a.time}</td>
                <td>{a.origin}</td>
                <td>{a.group}</td>
                <td className="num">{a.pax}</td>
                <td>{a.flight}</td>
                <td>{a.depTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="hp-section">
        <h2 className="hp-section-title">Salidas (regresos desde SAL)</h2>
        <table className="hp-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora salida</th>
              <th>Destino</th>
              <th>Grupo</th>
              <th className="num">PAX</th>
              <th>Vuelo</th>
              <th>Hora llegada</th>
            </tr>
          </thead>
          <tbody>
            {departures.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#666" }}>Sin salidas</td></tr>
            ) : departures.map((d, i) => (
              <tr key={i}>
                <td>{d.date}</td>
                <td>{d.time}</td>
                <td>{d.destination}</td>
                <td>{d.group}</td>
                <td className="num">{d.pax}</td>
                <td>{d.flight}</td>
                <td>{d.arrTime || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {nextSteps.length > 0 && (
        <section className="hp-section">
          <h2 className="hp-section-title">Próximos pasos</h2>
          <ol className="hp-steps">
            {nextSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </section>
      )}

      <section className="hp-signoff">
        <div>
          <div className="line">Confirmado por la aerolínea / agencia</div>
        </div>
        <div>
          <div className="line">Confirmado por el organizador</div>
        </div>
      </section>

      <footer className="hp-footer">
        EmTech Digital El Salvador 2026 · Orden final de vuelos · Documento generado automáticamente desde el Cost Portal
      </footer>
    </div>
  );
}
