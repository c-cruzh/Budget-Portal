interface FlightOrderPrintRow {
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

interface PrintArrivalRow { date: string; time: string; origin: string; group: string; pax: number; flight: string; depTime: string }
interface PrintDepartureRow { date: string; time: string; destination: string; group: string; pax: number; flight: string; arrTime: string }

export interface FlightOrderPrintViewProps {
  rows: FlightOrderPrintRow[];
  totals: { totalSelected: number; totalOriginal: number; totalPax: number };
  arrivals: PrintArrivalRow[];
  departures: PrintDepartureRow[];
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
  const savingsPct = totals.totalOriginal > 0 ? ((savings / totals.totalOriginal) * 100).toFixed(1) : "0";

  return (
    <div className="fo-print-doc">
      <style>{`
        @page { size: A4; margin: 16mm 14mm; }
        body { margin: 0; }
        .fo-print-doc {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          color: #111;
          background: #fff;
          font-size: 10.5pt;
          line-height: 1.4;
          padding: 24px;
          max-width: 1000px;
          margin: 0 auto;
        }
        .fo-header { border-bottom: 2px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 16px; }
        .fo-title { font-size: 16pt; font-weight: 700; margin: 0; color: #1e3a8a; }
        .fo-subtitle { font-size: 11pt; color: #555; margin: 4px 0 0; }
        .fo-meta { font-size: 9pt; color: #666; margin-top: 6px; }
        .fo-section { margin-top: 18px; page-break-inside: auto; }
        .fo-section-title { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 8px; border-bottom: 1px solid #999; padding-bottom: 3px; }
        .fo-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 24px; font-size: 10.5pt; }
        .fo-summary div { display: flex; justify-content: space-between; border-bottom: 1px dotted #bbb; padding: 3px 0; }
        .fo-summary .lbl { color: #555; }
        .fo-summary .val { font-weight: 600; }
        .fo-summary .pos { color: #047857; }
        .fo-route { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; page-break-inside: avoid; }
        .fo-route-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px; }
        .fo-route-title { font-size: 11pt; font-weight: 700; color: #1e3a8a; }
        .fo-route-route { font-size: 9.5pt; color: #475569; }
        .fo-route-price { text-align: right; font-variant-numeric: tabular-nums; }
        .fo-route-price .big { font-size: 12pt; font-weight: 700; }
        .fo-route-price .small { font-size: 8.5pt; color: #666; }
        .fo-route-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3px 24px; font-size: 9.5pt; }
        .fo-route-grid .cell { display: flex; gap: 6px; padding: 2px 0; }
        .fo-route-grid .cell .k { color: #64748b; min-width: 92px; flex-shrink: 0; }
        .fo-route-grid .cell .v { font-weight: 500; }
        .fo-route-grid .full { grid-column: 1 / -1; }
        table.fo-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
        table.fo-table th, table.fo-table td { border: 1px solid #888; padding: 5px 7px; }
        table.fo-table th { background: #eef2ff; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.03em; }
        table.fo-table td.num, table.fo-table th.num { text-align: right; font-variant-numeric: tabular-nums; }
        table.fo-table tfoot td { font-weight: 700; background: #f3f4f6; }
        .fo-steps { padding-left: 20px; margin: 0; font-size: 10pt; }
        .fo-steps li { padding: 3px 0; }
        .fo-footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 8.5pt; color: #777; text-align: center; }
        .fo-print-btn { position: fixed; top: 12px; right: 12px; background: #1d4ed8; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; font-size: 11pt; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
        @media print {
          .fo-print-btn { display: none !important; }
          .fo-print-doc { padding: 0; max-width: none; }
        }
      `}</style>

      <button
        type="button"
        className="fo-print-btn"
        onClick={() => window.print()}
      >
        Imprimir / Guardar PDF
      </button>

      <header className="fo-header">
        <h1 className="fo-title">EmTech Digital El Salvador 2026 — MIT Technology Review</h1>
        <p className="fo-subtitle">Orden final de vuelos — Vuelos San Salvador (SAL)</p>
        <p className="fo-meta">
          Generado: {generatedAt.toLocaleString("es-ES", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          {" · "}{totals.totalPax} pasajeros · {rows.length} grupos
        </p>
      </header>

      <section className="fo-section">
        <h2 className="fo-section-title">Resumen de totales</h2>
        <div className="fo-summary">
          <div><span className="lbl">Total pasajeros</span><span className="val">{totals.totalPax}</span></div>
          <div><span className="lbl">Grupos / rutas</span><span className="val">{rows.length}</span></div>
          <div><span className="lbl">Total seleccionado</span><span className="val">{fmtUSD(totals.totalSelected)}</span></div>
          <div><span className="lbl">Cotización original</span><span className="val">{fmtUSD(totals.totalOriginal)}</span></div>
          <div><span className="lbl">Ahorro vs original</span><span className="val pos">{fmtUSD(savings)} ({savingsPct}%)</span></div>
        </div>
      </section>

      <section className="fo-section">
        <h2 className="fo-section-title">Orden de vuelos (opción seleccionada por ruta)</h2>
        {rows.map((r, i) => (
          <div className="fo-route" key={i}>
            <div className="fo-route-head">
              <div>
                <span className="fo-route-title">{r.grupo}</span>
                {" "}<span className="fo-route-route">· {r.ruta} · {r.pax} pax</span>
              </div>
              <div className="fo-route-price">
                <div className="big">{fmtUSD(r.subtotal)}</div>
                <div className="small">{fmtUSD(r.tarifaPorPax)} / pax</div>
              </div>
            </div>
            <div className="fo-route-grid">
              <div className="cell"><span className="k">Aerolínea</span><span className="v">{r.aerolinea || "—"}</span></div>
              <div className="cell"><span className="k">Clase tarifaria</span><span className="v">{r.claseTarifaria || "—"}</span></div>
              <div className="cell"><span className="k">Números vuelo</span><span className="v">{r.numerosVuelo || "—"}</span></div>
              <div className="cell"><span className="k">Escalas</span><span className="v">{r.escalas || "—"}</span></div>
              <div className="cell full"><span className="k">Itinerario ida</span><span className="v">{r.itinerarioIda || "—"}</span></div>
              <div className="cell full"><span className="k">Itinerario vuelta</span><span className="v">{r.itinerarioVuelta || "—"}</span></div>
              <div className="cell"><span className="k">Duración</span><span className="v">{r.duracion || "—"}</span></div>
              <div className="cell"><span className="k">Incluye</span><span className="v">{r.incluye || "—"}</span></div>
              <div className="cell"><span className="k">Tarifa original</span><span className="v">{fmtUSD(r.tarifaOriginalPorPax)} / pax</span></div>
              <div className="cell"><span className="k">Ahorro</span><span className="v">{fmtUSD(r.ahorroVsOriginal)}</span></div>
            </div>
          </div>
        ))}
        <table className="fo-table" style={{ marginTop: "6px" }}>
          <tfoot>
            <tr>
              <td>TOTAL</td>
              <td className="num">{totals.totalPax} pax</td>
              <td className="num">{fmtUSD(totals.totalSelected)}</td>
              <td className="num">orig. {fmtUSD(totals.totalOriginal)}</td>
              <td className="num">ahorro {fmtUSD(savings)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="fo-section">
        <h2 className="fo-section-title">Llegadas (arribos a SAL)</h2>
        <table className="fo-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora llegada</th>
              <th>Origen</th>
              <th>Grupo</th>
              <th className="num">Pax</th>
              <th>Vuelo</th>
              <th>Hora salida</th>
            </tr>
          </thead>
          <tbody>
            {arrivals.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#666" }}>Sin llegadas registradas</td></tr>
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

      <section className="fo-section">
        <h2 className="fo-section-title">Salidas (regresos desde SAL)</h2>
        <table className="fo-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora salida</th>
              <th>Destino</th>
              <th>Grupo</th>
              <th className="num">Pax</th>
              <th>Vuelo</th>
              <th>Hora llegada</th>
            </tr>
          </thead>
          <tbody>
            {departures.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#666" }}>Sin salidas registradas</td></tr>
            ) : departures.map((d, i) => (
              <tr key={i}>
                <td>{d.date}</td>
                <td>{d.time}</td>
                <td>{d.destination}</td>
                <td>{d.group}</td>
                <td className="num">{d.pax}</td>
                <td>{d.flight}</td>
                <td>{d.arrTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {nextSteps.length > 0 && (
        <section className="fo-section">
          <h2 className="fo-section-title">Próximos pasos</h2>
          <ol className="fo-steps">
            {nextSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </section>
      )}

      <footer className="fo-footer">
        EmTech Digital El Salvador 2026 · Orden final de vuelos · Documento generado automáticamente desde el Cost Portal
      </footer>
    </div>
  );
}
