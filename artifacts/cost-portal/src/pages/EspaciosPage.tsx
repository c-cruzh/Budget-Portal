import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Cloud, CloudOff, Loader2, Trash2, Plus, Users, Layers, CalendarDays, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSpacesApi } from "@/hooks/useSpacesApi";
import { groupSpacesByZone, type SpaceDayKey, type SpaceEntry } from "@/data/budgetData";

const DAYS: { key: SpaceDayKey; label: string }[] = [
  { key: "dia-1", label: "Día 1" },
  { key: "dia-2", label: "Día 2" },
];

export default function EspaciosPage() {
  const { permissions } = useAuth();
  const canEdit = permissions.canEdit;
  const {
    spaces, loading, saving, error, meta,
    addEntry, updateEntry, removeEntry, renameZone, removeZone,
  } = useSpacesApi();

  const entries = spaces.entries || { "dia-1": [], "dia-2": [] };

  const summary = useMemo(() => {
    const d1 = entries["dia-1"];
    const d2 = entries["dia-2"];
    const zones = new Set<string>();
    let withAforo = 0;
    for (const e of [...d1, ...d2]) {
      zones.add((e.zone || "").trim().toLowerCase() || "sin zona");
      if (e.aforo != null) withAforo++;
    }
    return { d1: d1.length, d2: d2.length, zones: zones.size, withAforo };
  }, [entries]);

  const cards = [
    { label: "Espacios Día 1", value: String(summary.d1), icon: CalendarDays, color: "bg-blue-500/10 text-blue-500" },
    { label: "Espacios Día 2", value: String(summary.d2), icon: CalendarDays, color: "bg-emerald-500/10 text-emerald-500" },
    { label: "Zonas / Áreas", value: String(summary.zones), icon: Layers, color: "bg-violet-500/10 text-violet-500" },
    { label: "Con aforo", value: String(summary.withAforo), icon: Users, color: "bg-amber-500/10 text-amber-600" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Espacios</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Layout del venue por Área/Zona, Espacio y Aforo, separado en Día 1 y Día 2.
            Esta es la fuente única de los espacios: lo que edites aquí alimenta el selector de
            espacios y las alertas de aforo del Budget.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {error ? (
              <><CloudOff className="w-3.5 h-3.5 text-red-500" /> <span className="text-red-500">{error}</span></>
            ) : saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…</>
            ) : (
              <><Cloud className="w-3.5 h-3.5 text-emerald-500" /> Sincronizado</>
            )}
          </div>
        </div>
      </div>

      {meta?.lastEditedBy && (
        <p className="text-[11px] text-muted-foreground/70">
          Última edición por {meta.lastEditedBy} ({meta.lastEditedByOrg}) · {new Date(meta.lastEditedAt).toLocaleString()}
        </p>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.3 }}
            className="rounded-xl border border-card-border bg-card p-3.5 shadow-sm"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`w-7 h-7 rounded-lg ${card.color} flex items-center justify-center`}>
                <card.icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {!canEdit && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Vista de solo lectura. Solo C2 LABS puede editar el catálogo de espacios.</span>
        </div>
      )}

      {/* Day sections */}
      <div className="grid gap-5 xl:grid-cols-2">
        {DAYS.map(({ key, label }) => (
          <DaySection
            key={key}
            day={key}
            label={label}
            entries={entries[key]}
            canEdit={canEdit}
            onAdd={addEntry}
            onUpdate={updateEntry}
            onRemove={removeEntry}
            onRenameZone={renameZone}
            onRemoveZone={removeZone}
          />
        ))}
      </div>
    </div>
  );
}

function DaySection({
  day, label, entries, canEdit, onAdd, onUpdate, onRemove, onRenameZone, onRemoveZone,
}: {
  day: SpaceDayKey;
  label: string;
  entries: SpaceEntry[];
  canEdit: boolean;
  onAdd: (day: SpaceDayKey, partial: { zone?: string; name: string; aforo?: number }) => string;
  onUpdate: (day: SpaceDayKey, id: string, patch: Partial<Omit<SpaceEntry, "id">>) => void;
  onRemove: (day: SpaceDayKey, id: string) => void;
  onRenameZone: (day: SpaceDayKey, oldZone: string, newZone: string) => void;
  onRemoveZone: (day: SpaceDayKey, zone: string) => void;
}) {
  const grouped = useMemo(() => groupSpacesByZone(entries), [entries]);
  const zones = useMemo(
    () => Array.from(new Set(entries.map(e => (e.zone || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [entries],
  );
  const [newZone, setNewZone] = useState("");
  const [newName, setNewName] = useState("");
  const [newAforo, setNewAforo] = useState("");

  const datalistId = `zones-${day}`;

  const commitAdd = (zone: string, name: string, aforo: string, reset: () => void) => {
    const n = name.trim();
    if (!n) return;
    const a = Math.floor(Number(aforo));
    onAdd(day, { zone, name: n, aforo: Number.isFinite(a) && a > 0 ? a : undefined });
    reset();
  };

  return (
    <div className="rounded-xl border border-card-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
        <CalendarDays className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground text-sm flex-1">{label}</span>
        <Badge variant="secondary" className="text-[10px]">{entries.length} espacios</Badge>
      </div>

      <datalist id={datalistId}>
        {zones.map(z => <option key={z} value={z} />)}
      </datalist>

      {grouped.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">Sin espacios definidos.</div>
      ) : (
        <div className="divide-y divide-border">
          {grouped.map(([zone, zoneEntries]) => (
            <ZoneGroup
              key={zone}
              day={day}
              zone={zone}
              entries={zoneEntries}
              canEdit={canEdit}
              onAdd={onAdd}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onRenameZone={onRenameZone}
              onRemoveZone={onRemoveZone}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <div className="border-t border-border bg-muted/20 px-4 py-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Agregar espacio
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={newZone}
              list={datalistId}
              onChange={e => setNewZone(e.target.value)}
              placeholder="Área / Zona"
              className="h-8 flex-1 min-w-[140px] bg-card border border-border rounded px-2 text-xs outline-none focus:border-primary"
            />
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitAdd(newZone, newName, newAforo, () => { setNewName(""); setNewAforo(""); });
                }
              }}
              placeholder="Espacio"
              className="h-8 flex-1 min-w-[140px] bg-card border border-border rounded px-2 text-xs outline-none focus:border-primary"
            />
            <input
              type="number"
              min={0}
              value={newAforo}
              onChange={e => setNewAforo(e.target.value)}
              placeholder="Aforo"
              className="h-8 w-20 bg-card border border-border rounded px-2 text-xs outline-none focus:border-primary"
            />
            <button
              onClick={() => commitAdd(newZone, newName, newAforo, () => { setNewName(""); setNewAforo(""); })}
              disabled={!newName.trim()}
              className="h-8 flex items-center gap-1 px-3 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ZoneGroup({
  day, zone, entries, canEdit, onAdd, onUpdate, onRemove, onRenameZone, onRemoveZone,
}: {
  day: SpaceDayKey;
  zone: string;
  entries: SpaceEntry[];
  canEdit: boolean;
  onAdd: (day: SpaceDayKey, partial: { zone?: string; name: string; aforo?: number }) => string;
  onUpdate: (day: SpaceDayKey, id: string, patch: Partial<Omit<SpaceEntry, "id">>) => void;
  onRemove: (day: SpaceDayKey, id: string) => void;
  onRenameZone: (day: SpaceDayKey, oldZone: string, newZone: string) => void;
  onRemoveZone: (day: SpaceDayKey, zone: string) => void;
}) {
  const [zoneDraft, setZoneDraft] = useState(zone);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAforo, setAddAforo] = useState("");

  const commitZone = () => {
    const next = zoneDraft.trim();
    if (next && next !== zone) onRenameZone(day, zone, next);
    else setZoneDraft(zone);
  };

  const commitRemoveZone = () => {
    const count = entries.length;
    const label = zone === "Sin zona" ? "sin zona" : `"${zone}"`;
    const ok = window.confirm(
      `¿Eliminar la zona ${label} y sus ${count} espacio${count === 1 ? "" : "s"}? Esta acción no se puede deshacer.`,
    );
    if (ok) onRemoveZone(day, zone);
  };

  const commitAdd = () => {
    const n = addName.trim();
    if (!n) return;
    const a = Math.floor(Number(addAforo));
    onAdd(day, { zone, name: n, aforo: Number.isFinite(a) && a > 0 ? a : undefined });
    setAddName("");
    setAddAforo("");
    setAdding(false);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        {canEdit && zone !== "Sin zona" ? (
          <input
            value={zoneDraft}
            data-zone-key={`${day}:${zone}`}
            onChange={e => setZoneDraft(e.target.value)}
            onBlur={commitZone}
            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setZoneDraft(zone); }}
            className="text-xs font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none py-0.5 flex-1 min-w-0"
          />
        ) : (
          <span className="text-xs font-semibold text-foreground flex-1 min-w-0">{zone}</span>
        )}
        <span className="text-[10px] text-muted-foreground">{entries.length}</span>
        {canEdit && (
          <button
            onClick={commitRemoveZone}
            className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
            title="Eliminar zona y todos sus espacios"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-1 pl-5">
        {entries.map(e => (
          <div key={e.id} className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
            {canEdit ? (
              <input
                value={e.name}
                onChange={ev => onUpdate(day, e.id, { name: ev.target.value })}
                placeholder="Espacio"
                className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none text-xs text-foreground py-0.5"
              />
            ) : (
              <span className="flex-1 min-w-0 text-xs text-foreground truncate" title={e.name}>{e.name}</span>
            )}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[9px] text-muted-foreground uppercase">Aforo</span>
              {canEdit ? (
                <input
                  type="number"
                  min={0}
                  value={e.aforo ?? ""}
                  onChange={ev => onUpdate(day, e.id, { aforo: ev.target.value === "" ? undefined : Number(ev.target.value) })}
                  placeholder="—"
                  className="w-16 h-7 bg-muted border border-border rounded px-1.5 text-xs text-right tabular-nums outline-none focus:border-primary"
                />
              ) : (
                <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">{e.aforo ?? "—"}</span>
              )}
            </div>
            {canEdit && (
              <button
                onClick={() => onRemove(day, e.id)}
                className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                title="Eliminar espacio"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="pl-5 pt-1.5">
          {adding ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitAdd(); } if (e.key === "Escape") { setAdding(false); setAddName(""); setAddAforo(""); } }}
                placeholder={`Espacio en ${zone === "Sin zona" ? "esta zona" : zone}`}
                className="h-7 flex-1 min-w-0 bg-card border border-border rounded px-2 text-xs outline-none focus:border-primary"
              />
              <input
                type="number"
                min={0}
                value={addAforo}
                onChange={e => setAddAforo(e.target.value)}
                placeholder="Aforo"
                className="h-7 w-16 bg-card border border-border rounded px-1.5 text-xs outline-none focus:border-primary"
              />
              <button onClick={commitAdd} disabled={!addName.trim()} className="h-7 px-2 rounded bg-primary text-primary-foreground text-xs disabled:opacity-40">OK</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
              <Plus className="w-3 h-3" /> Agregar espacio
            </button>
          )}
        </div>
      )}
    </div>
  );
}
