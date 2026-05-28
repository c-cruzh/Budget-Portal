import { useEffect, useState, useMemo } from "react";
import { History, RefreshCw, Filter } from "lucide-react";

interface AuditEntry {
  id: number;
  createdAt: string;
  userName: string;
  userOrg: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  action: string;
  field: string | null;
  oldValue: any;
  newValue: any;
  summary: string | null;
}

const ENTITY_LABELS: Record<string, string> = {
  "budget-item": "Item presupuesto",
  "sponsor": "Sponsor",
  "scenario": "Escenario",
};

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  UPDATE: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  DELETE: "bg-red-500/15 text-red-300 border-red-500/30",
};

function formatValue(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "number") return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-SV", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  const load = () => {
    setLoading(true);
    const qs = entityFilter !== "all" ? `?entityType=${entityFilter}&limit=500` : "?limit=500";
    fetch(`/api/audit-log${qs}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        setEntries(Array.isArray(data.entries) ? data.entries : []);
      })
      .catch(err => console.error("Failed to load audit log:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [entityFilter]);

  const users = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => set.add(e.userName));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    if (userFilter === "all") return entries;
    return entries.filter(e => e.userName === userFilter);
  }, [entries, userFilter]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Historial de Cambios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro de todas las ediciones realizadas en el portal.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </div>

      <div className="flex items-center gap-4 flex-wrap text-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-1"
          >
            <option value="all">Todos los tipos</option>
            <option value="budget-item">Items de presupuesto</option>
            <option value="sponsor">Sponsors</option>
            <option value="scenario">Escenario</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Usuario:</span>
          <select
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-1"
          >
            <option value="all">Todos los usuarios</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <span className="text-muted-foreground">
          Mostrando {filtered.length} de {entries.length}
        </span>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Fecha</th>
              <th className="text-left px-3 py-2 font-medium">Usuario</th>
              <th className="text-left px-3 py-2 font-medium">Acción</th>
              <th className="text-left px-3 py-2 font-medium">Tipo</th>
              <th className="text-left px-3 py-2 font-medium">Entidad</th>
              <th className="text-left px-3 py-2 font-medium">Campo</th>
              <th className="text-left px-3 py-2 font-medium">Cambio</th>
            </tr>
          </thead>
          <tbody>
            {loading && entries.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">
                Sin cambios registrados todavía. A medida que el equipo edite, los cambios aparecerán aquí.
              </td></tr>
            ) : filtered.map(e => (
              <tr key={e.id} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {formatTime(e.createdAt)}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{e.userName}</div>
                  <div className="text-xs text-muted-foreground">{e.userOrg}</div>
                </td>
                <td className="px-3 py-2">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${ACTION_STYLES[e.action] || "bg-muted text-muted-foreground border-border"}`}>
                    {e.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {ENTITY_LABELS[e.entityType] || e.entityType}
                </td>
                <td className="px-3 py-2 max-w-[240px] truncate" title={e.entityLabel || ""}>
                  {e.entityLabel || e.entityId || "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {e.field ? <code className="bg-muted/60 px-1 py-0.5 rounded">{e.field}</code> : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {e.action === "UPDATE" ? (
                    <div className="flex items-center gap-1.5 max-w-[360px]">
                      <span className="line-through text-muted-foreground truncate" title={formatValue(e.oldValue)}>
                        {formatValue(e.oldValue)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-foreground font-medium truncate" title={formatValue(e.newValue)}>
                        {formatValue(e.newValue)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{e.summary || "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
