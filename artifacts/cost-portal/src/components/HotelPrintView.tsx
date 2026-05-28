import { HOTEL_GROUPS } from "@/data/hotelData";

interface PrintRow {
  groupKey: string;
  groupLabel: string;
  pax: number;
  rooms: number;
  checkIn: Date | null;
  checkOut: Date | null;
  nights: number;
  subtotal: number;
}

interface PrintNightCell {
  date: Date;
  key: string;
  perGroup: Record<string, number>;
  total: number;
}

export interface HotelPrintViewProps {
  rows: PrintRow[];
  nightBreakdown: PrintNightCell[];
  totals: { totalRoomNights: number; totalCost: number; totalPaxNights: number };
  notes: string;
  rateBase: number;
  rateTotal: number;
  generatedAt: Date;
}

function fmtDateFull(d: Date | null): string {
  if (!d) return "—";
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function HotelPrintView({
  rows,
  nightBreakdown,
  totals,
  notes,
  rateBase,
  rateTotal,
  generatedAt,
}: HotelPrintViewProps) {
  const validRows = rows.filter(r => r.nights > 0);
  const firstCheckIn = validRows.reduce<Date | null>((acc, r) => {
    if (!r.checkIn) return acc;
    if (!acc || r.checkIn < acc) return r.checkIn;
    return acc;
  }, null);
  const lastCheckOut = validRows.reduce<Date | null>((acc, r) => {
    if (!r.checkOut) return acc;
    if (!acc || r.checkOut > acc) return r.checkOut;
    return acc;
  }, null);

  return (
    <div className="hotel-print-doc">
      <style>{`
        @page { size: Letter; margin: 18mm 16mm; }
        body { margin: 0; }
        .hotel-print-doc {
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
        table.hp-table th, table.hp-table td { border: 1px solid #888; padding: 5px 7px; }
        table.hp-table th { background: #eee; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.03em; }
        table.hp-table td.num, table.hp-table th.num { text-align: right; font-variant-numeric: tabular-nums; }
        table.hp-table tfoot td { font-weight: 700; background: #f3f3f3; }
        .hp-notes { white-space: pre-wrap; border: 1px solid #888; padding: 10px; min-height: 40px; font-size: 10pt; background: #fafafa; }
        .hp-signoff { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 10pt; }
        .hp-signoff .line { border-top: 1px solid #111; padding-top: 4px; margin-top: 50px; text-align: center; }
        .hp-footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 8.5pt; color: #777; text-align: center; }
        .hp-print-btn { position: fixed; top: 12px; right: 12px; background: #4f46e5; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; font-size: 11pt; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
        @media print {
          .hp-print-btn { display: none !important; }
          .hotel-print-doc { padding: 0; max-width: none; }
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
        <p className="hp-subtitle">Solicitud de bloque hotelero — Rooming list</p>
        <p className="hp-meta">Generado: {generatedAt.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</p>
      </header>

      <section className="hp-section">
        <h2 className="hp-section-title">Resumen del bloque</h2>
        <div className="hp-summary">
          <div><span className="lbl">Total habitaciones (pico)</span><span className="val">{Math.max(0, ...nightBreakdown.map(c => c.total))}</span></div>
          <div><span className="lbl">Total habitaciones-noche</span><span className="val">{totals.totalRoomNights}</span></div>
          <div><span className="lbl">Check-in más temprano</span><span className="val">{fmtDateFull(firstCheckIn)}</span></div>
          <div><span className="lbl">Check-out más tardío</span><span className="val">{fmtDateFull(lastCheckOut)}</span></div>
          <div><span className="lbl">Tarifa base negociada</span><span className="val">{fmtUSD(rateBase)} / noche</span></div>
          <div><span className="lbl">Tarifa con IVA + Turismo</span><span className="val">{fmtUSD(rateTotal)} / noche</span></div>
          <div><span className="lbl">Costo total estimado</span><span className="val">{fmtUSD(totals.totalCost)}</span></div>
          <div><span className="lbl">Total pax-noches</span><span className="val">{totals.totalPaxNights}</span></div>
        </div>
      </section>

      <section className="hp-section">
        <h2 className="hp-section-title">Rooming list por grupo</h2>
        <table className="hp-table">
          <thead>
            <tr>
              <th>Grupo</th>
              <th className="num">Pax</th>
              <th className="num">Habs</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th className="num">Noches</th>
              <th className="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.groupKey}>
                <td>{r.groupLabel}</td>
                <td className="num">{r.pax}</td>
                <td className="num">{r.rooms}</td>
                <td>{fmtDateFull(r.checkIn)}</td>
                <td>{fmtDateFull(r.checkOut)}</td>
                <td className="num">{r.nights || "—"}</td>
                <td className="num">{r.nights > 0 ? fmtUSD(r.subtotal) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>TOTAL</td>
              <td className="num">{rows.reduce((s, r) => s + (r.nights > 0 ? r.rooms : 0), 0)}</td>
              <td colSpan={2}></td>
              <td className="num">{totals.totalRoomNights}</td>
              <td className="num">{fmtUSD(totals.totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="hp-section">
        <h2 className="hp-section-title">Desglose por noche</h2>
        <table className="hp-table">
          <thead>
            <tr>
              <th>Noche</th>
              {HOTEL_GROUPS.map(g => (
                <th key={g.key} className="num">{g.label.replace(/^Grupo /, "").split(" — ")[0]}</th>
              ))}
              <th className="num">Total habs</th>
              <th className="num">Costo</th>
            </tr>
          </thead>
          <tbody>
            {nightBreakdown.length === 0 ? (
              <tr><td colSpan={HOTEL_GROUPS.length + 3} style={{ textAlign: "center", color: "#666" }}>Sin noches reservadas</td></tr>
            ) : nightBreakdown.map(cell => (
              <tr key={cell.key}>
                <td>{fmtDateFull(cell.date)}</td>
                {HOTEL_GROUPS.map(g => (
                  <td key={g.key} className="num">{cell.perGroup[g.key] ?? ""}</td>
                ))}
                <td className="num">{cell.total}</td>
                <td className="num">{fmtUSD(cell.total * rateTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={HOTEL_GROUPS.length + 1}>TOTAL</td>
              <td className="num">{totals.totalRoomNights}</td>
              <td className="num">{fmtUSD(totals.totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="hp-section">
        <h2 className="hp-section-title">Notas y observaciones</h2>
        <div className="hp-notes">{notes.trim() || "Sin notas adicionales."}</div>
      </section>

      <section className="hp-signoff">
        <div>
          <div className="line">Confirmado por el hotel</div>
        </div>
        <div>
          <div className="line">Confirmado por el organizador</div>
        </div>
      </section>

      <footer className="hp-footer">
        EmTech Digital El Salvador 2026 · Solicitud de bloque hotelero · Documento generado automáticamente desde el Cost Portal
      </footer>
    </div>
  );
}
