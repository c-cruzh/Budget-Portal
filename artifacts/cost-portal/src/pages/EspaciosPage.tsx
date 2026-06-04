import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Cloud, CloudOff, Loader2, Trash2, Plus, Users, Layers, CalendarDays, Info,
  Building2, Pencil, Check, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSpacesApi } from "@/hooks/useSpacesApi";
import { useSubEventsApi } from "@/hooks/useSubEventsApi";
import { groupSpacesByZone, type SpaceDayKey, type SpaceEntry, type Venue, type SubEvent } from "@/data/budgetData";

const DAYS: { key: SpaceDayKey; label: string }[] = [
  { key: "dia-1", label: "Día 1" },
  { key: "dia-2", label: "Día 2" },
];

const ESEN_TITLE = "ESEN — Escuela Superior de Economía y Negocios";

export default function EspaciosPage() {
  const { permissions } = useAuth();
  const canEdit = permissions.canEdit;
  const {
    spaces, loading, saving, error, meta,
    addEntry, updateEntry, removeEntry, renameZone, removeZone,
    addVenue, updateVenue, removeVenue,
    addVenueEntry, updateVenueEntry, removeVenueEntry, renameVenueZone, removeVenueZone,
  } = useSpacesApi();
  const { subEvents } = useSubEventsApi();

  const entries = spaces.entries || { "dia-1": [], "dia-2": [] };
  const venues = spaces.venues || [];

  const summary = useMemo(() => {
    const esenAll = [...entries["dia-1"], ...entries["dia-2"]];
    const venueAll = venues.flatMap(v => v.entries);
    const zones = new Set<string>();
    let spacesCount = 0;
    let withAforo = 0;
    for (const e of esenAll) {
      zones.add((e.zone || "").trim().toLowerCase() || "sin zona");
      spacesCount++;
      if (e.aforo != null) withAforo++;
    }
    for (const e of venueAll) {
      zones.add((e.zone || "").trim().toLowerCase() || "sin zona");
      if ((e.name || "").trim()) spacesCount++;
      if (e.aforo != null) withAforo++;
    }
    return { lugares: venues.length + 1, spaces: spacesCount, zones: zones.size, withAforo };
  }, [entries, venues]);

  const cards = [
    { label: "Lugares / Sedes", value: String(summary.lugares), icon: Building2, color: "bg-primary/10 text-primary" },
    { label: "Espacios", value: String(summary.spaces), icon: MapPin, color: "bg-blue-500/10 text-blue-500" },
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
            Layout por Lugar/Sede › Área/Zona › Espacio (con aforo). La ESEN conserva su separación
            Día 1 / Día 2; los demás lugares (Hotel, Aeropuerto, restaurantes, BINAES) son independientes
            del día. Todos los lugares alimentan el selector de espacios y las alertas de aforo del Budget:
            cada lugar puede asociarse a uno o más subeventos para acotar dónde aparecen sus espacios.
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

      {/* ESEN — Lugar principal (con Día 1 / Día 2) */}
      <section className="rounded-xl border border-card-border bg-card/40 overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-primary/5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">{ESEN_TITLE}</p>
            <p className="text-[11px] text-muted-foreground">Sede principal · Día 1 / Día 2 · asociada automáticamente a los subeventos Día 1 y Día 2</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-[10px] flex-shrink-0">Sede principal</Badge>
        </div>
        <div className="p-4 grid gap-5 xl:grid-cols-2">
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
      </section>

      {/* Otros Lugares / Sedes (independientes del día) */}
      {venues.map(v => (
        <VenueSection
          key={v.id}
          venue={v}
          subEvents={subEvents}
          canEdit={canEdit}
          onUpdateVenue={updateVenue}
          onRemoveVenue={removeVenue}
          onAddEntry={addVenueEntry}
          onUpdateEntry={updateVenueEntry}
          onRemoveEntry={removeVenueEntry}
          onRenameZone={renameVenueZone}
          onRemoveZone={removeVenueZone}
        />
      ))}

      {canEdit && <AddVenue onAdd={addVenue} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ESEN per-day section                                                        */
/* -------------------------------------------------------------------------- */

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
  const datalistId = `zones-${day}`;

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
              zone={zone}
              entries={zoneEntries}
              canEdit={canEdit}
              onAddSpace={(name, aforo) => onAdd(day, { zone: zone === "Sin zona" ? "" : zone, name, aforo })}
              onUpdateEntry={(id, patch) => onUpdate(day, id, patch)}
              onRemoveEntry={id => onRemove(day, id)}
              onRenameZone={(oldZone, newZone) => onRenameZone(day, oldZone, newZone)}
              onRemoveZone={zoneName => onRemoveZone(day, zoneName)}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <AddRow
          datalistId={datalistId}
          onAdd={(zone, name, aforo) => onAdd(day, { zone, name, aforo })}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* New venue (Lugar/Sede) section — day-independent                            */
/* -------------------------------------------------------------------------- */

function VenueSection({
  venue, subEvents, canEdit, onUpdateVenue, onRemoveVenue, onAddEntry, onUpdateEntry, onRemoveEntry, onRenameZone, onRemoveZone,
}: {
  venue: Venue;
  subEvents: SubEvent[];
  canEdit: boolean;
  onUpdateVenue: (venueId: string, patch: { name?: string; subtitle?: string; subEventIds?: string[] }) => void;
  onRemoveVenue: (venueId: string) => void;
  onAddEntry: (venueId: string, partial: { zone?: string; name?: string; aforo?: number }) => string;
  onUpdateEntry: (venueId: string, entryId: string, patch: Partial<Omit<SpaceEntry, "id">>) => void;
  onRemoveEntry: (venueId: string, entryId: string) => void;
  onRenameZone: (venueId: string, oldZone: string, newZone: string) => void;
  onRemoveZone: (venueId: string, zone: string) => void;
}) {
  const grouped = useMemo(() => groupSpacesByZone(venue.entries), [venue.entries]);
  const zones = useMemo(
    () => Array.from(new Set(venue.entries.map(e => (e.zone || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [venue.entries],
  );
  const datalistId = `zones-${venue.id}`;

  const [editingHeader, setEditingHeader] = useState(false);
  const [nameDraft, setNameDraft] = useState(venue.name);
  const [subtitleDraft, setSubtitleDraft] = useState(venue.subtitle ?? "");

  const spaceCount = venue.entries.filter(e => (e.name || "").trim()).length;

  const startEditHeader = () => {
    setNameDraft(venue.name);
    setSubtitleDraft(venue.subtitle ?? "");
    setEditingHeader(true);
  };
  const commitHeader = () => {
    const name = nameDraft.trim();
    onUpdateVenue(venue.id, { name: name || venue.name, subtitle: subtitleDraft });
    setEditingHeader(false);
  };
  const commitRemoveVenue = () => {
    const ok = window.confirm(
      `¿Eliminar el lugar "${venue.name}" y todas sus áreas y espacios? Esta acción no se puede deshacer.`,
    );
    if (ok) onRemoveVenue(venue.id);
  };

  return (
    <section className="rounded-xl border border-card-border bg-card overflow-hidden">
      <div className="flex items-start gap-2.5 px-4 py-3 bg-muted/30 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
        {editingHeader ? (
          <div className="flex-1 min-w-0 space-y-1.5">
            <input
              autoFocus
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commitHeader(); if (e.key === "Escape") setEditingHeader(false); }}
              placeholder="Nombre del lugar / sede"
              className="w-full h-8 bg-card border border-border rounded px-2 text-sm font-semibold outline-none focus:border-primary"
            />
            <input
              value={subtitleDraft}
              onChange={e => setSubtitleDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commitHeader(); if (e.key === "Escape") setEditingHeader(false); }}
              placeholder="Descripción (opcional), p. ej. Cena VIP (Día 1)"
              className="w-full h-7 bg-card border border-border rounded px-2 text-xs outline-none focus:border-primary"
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground text-sm truncate" title={venue.name}>{venue.name}</p>
            {venue.subtitle && <p className="text-[11px] text-muted-foreground truncate" title={venue.subtitle}>{venue.subtitle}</p>}
          </div>
        )}
        <Badge variant="secondary" className="text-[10px] flex-shrink-0 mt-0.5">{spaceCount} espacios</Badge>
        {canEdit && (
          editingHeader ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={commitHeader} className="text-primary hover:opacity-80" title="Guardar"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditingHeader(false)} className="text-muted-foreground hover:opacity-80" title="Cancelar"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={startEditHeader} className="text-muted-foreground hover:text-primary transition-colors" title="Editar lugar"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={commitRemoveVenue} className="text-muted-foreground hover:text-red-500 transition-colors" title="Eliminar lugar"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )
        )}
      </div>

      <VenueSubEventPicker
        venue={venue}
        subEvents={subEvents}
        canEdit={canEdit}
        onChange={ids => onUpdateVenue(venue.id, { subEventIds: ids })}
      />

      <datalist id={datalistId}>
        {zones.map(z => <option key={z} value={z} />)}
      </datalist>

      {grouped.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">Sin áreas ni espacios definidos.</div>
      ) : (
        <div className="divide-y divide-border">
          {grouped.map(([zone, zoneEntries]) => (
            <ZoneGroup
              key={zone}
              zone={zone}
              entries={zoneEntries}
              canEdit={canEdit}
              allowEmptyName
              onAddSpace={(name, aforo) => onAddEntry(venue.id, { zone: zone === "Sin zona" ? "" : zone, name, aforo })}
              onUpdateEntry={(id, patch) => onUpdateEntry(venue.id, id, patch)}
              onRemoveEntry={id => onRemoveEntry(venue.id, id)}
              onRenameZone={(oldZone, newZone) => onRenameZone(venue.id, oldZone, newZone)}
              onRemoveZone={zoneName => onRemoveZone(venue.id, zoneName)}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <AddRow
          datalistId={datalistId}
          allowEmptyName
          onAdd={(zone, name, aforo) => onAddEntry(venue.id, { zone, name, aforo })}
        />
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Venue → sub-event association (chips toggler)                               */
/* -------------------------------------------------------------------------- */

function VenueSubEventPicker({
  venue, subEvents, canEdit, onChange,
}: {
  venue: Venue;
  subEvents: SubEvent[];
  canEdit: boolean;
  onChange: (ids: string[]) => void;
}) {
  const selected = venue.subEventIds ?? [];
  const selectedSet = new Set(selected);
  const isGlobal = selected.length === 0;

  const toggle = (id: string) => {
    if (!canEdit) return;
    const next = selectedSet.has(id) ? selected.filter(s => s !== id) : [...selected, id];
    onChange(next);
  };

  if (!canEdit && isGlobal) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/10 text-[11px] text-muted-foreground">
        <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Disponible en todos los subeventos del Budget.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-border bg-muted/10">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mr-1">
        <CalendarDays className="w-3.5 h-3.5" /> Subeventos:
      </span>
      {subEvents.map(se => {
        const active = selectedSet.has(se.id);
        return (
          <button
            key={se.id}
            type="button"
            disabled={!canEdit}
            onClick={() => toggle(se.id)}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              active
                ? "border-transparent text-white"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
            style={active ? { backgroundColor: se.color || "#6366f1" } : undefined}
            title={canEdit ? (active ? `Quitar de ${se.name}` : `Asociar a ${se.name}`) : se.name}
          >
            {se.name}
          </button>
        );
      })}
      {isGlobal && (
        <span className="text-[10px] text-muted-foreground/70 italic ml-1">
          (sin asociación: disponible en todos)
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Generic zone group (day/venue-agnostic via closures)                        */
/* -------------------------------------------------------------------------- */

function ZoneGroup({
  zone, entries, canEdit, allowEmptyName, onAddSpace, onUpdateEntry, onRemoveEntry, onRenameZone, onRemoveZone,
}: {
  zone: string;
  entries: SpaceEntry[];
  canEdit: boolean;
  allowEmptyName?: boolean;
  onAddSpace: (name: string, aforo?: number) => void;
  onUpdateEntry: (id: string, patch: Partial<Omit<SpaceEntry, "id">>) => void;
  onRemoveEntry: (id: string) => void;
  onRenameZone: (oldZone: string, newZone: string) => void;
  onRemoveZone: (zone: string) => void;
}) {
  const [zoneDraft, setZoneDraft] = useState(zone);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAforo, setAddAforo] = useState("");

  const commitZone = () => {
    const next = zoneDraft.trim();
    if (next && next !== zone) onRenameZone(zone, next);
    else setZoneDraft(zone);
  };

  const commitRemoveZone = () => {
    const count = entries.length;
    const label = zone === "Sin zona" ? "sin zona" : `"${zone}"`;
    const ok = window.confirm(
      `¿Eliminar la zona ${label} y sus ${count} espacio${count === 1 ? "" : "s"}? Esta acción no se puede deshacer.`,
    );
    if (ok) onRemoveZone(zone);
  };

  const commitAdd = () => {
    const n = addName.trim();
    if (!n) return;
    const a = Math.floor(Number(addAforo));
    onAddSpace(n, Number.isFinite(a) && a > 0 ? a : undefined);
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
        {entries.map(e => {
          const hasName = !!(e.name || "").trim();
          return (
            <div key={e.id} className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
              {canEdit ? (
                <input
                  value={e.name}
                  onChange={ev => onUpdateEntry(e.id, { name: ev.target.value })}
                  placeholder={allowEmptyName ? "Espacio (opcional)" : "Espacio"}
                  className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none text-xs text-foreground py-0.5"
                />
              ) : (
                <span
                  className={hasName ? "flex-1 min-w-0 text-xs text-foreground truncate" : "flex-1 min-w-0 text-xs text-muted-foreground/60 italic truncate"}
                  title={hasName ? e.name : "Sin espacio asignado"}
                >
                  {hasName ? e.name : "Sin espacio asignado"}
                </span>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-[9px] text-muted-foreground uppercase">Aforo</span>
                {canEdit ? (
                  <input
                    type="number"
                    min={0}
                    value={e.aforo ?? ""}
                    onChange={ev => onUpdateEntry(e.id, { aforo: ev.target.value === "" ? undefined : Number(ev.target.value) })}
                    placeholder="—"
                    className="w-16 h-7 bg-muted border border-border rounded px-1.5 text-xs text-right tabular-nums outline-none focus:border-primary"
                  />
                ) : (
                  <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">{e.aforo ?? "—"}</span>
                )}
              </div>
              {canEdit && (
                <button
                  onClick={() => onRemoveEntry(e.id)}
                  className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                  title="Eliminar espacio"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
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

/* -------------------------------------------------------------------------- */
/* Shared "add area / space" footer                                            */
/* -------------------------------------------------------------------------- */

function AddRow({
  datalistId, allowEmptyName, onAdd,
}: {
  datalistId: string;
  allowEmptyName?: boolean;
  onAdd: (zone: string, name: string, aforo?: number) => void;
}) {
  const [zone, setZone] = useState("");
  const [name, setName] = useState("");
  const [aforo, setAforo] = useState("");

  const canAdd = allowEmptyName ? !!(zone.trim() || name.trim()) : !!name.trim();

  const commit = () => {
    const z = zone.trim();
    const n = name.trim();
    if (allowEmptyName ? !(z || n) : !n) return;
    const a = Math.floor(Number(aforo));
    onAdd(z, n, Number.isFinite(a) && a > 0 ? a : undefined);
    setName("");
    setAforo("");
  };

  return (
    <div className="border-t border-border bg-muted/20 px-4 py-3">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {allowEmptyName ? "Agregar área / espacio" : "Agregar espacio"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={zone}
          list={datalistId}
          onChange={e => setZone(e.target.value)}
          placeholder="Área / Zona"
          className="h-8 flex-1 min-w-[140px] bg-card border border-border rounded px-2 text-xs outline-none focus:border-primary"
        />
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          placeholder={allowEmptyName ? "Espacio (opcional)" : "Espacio"}
          className="h-8 flex-1 min-w-[140px] bg-card border border-border rounded px-2 text-xs outline-none focus:border-primary"
        />
        <input
          type="number"
          min={0}
          value={aforo}
          onChange={e => setAforo(e.target.value)}
          placeholder="Aforo"
          className="h-8 w-20 bg-card border border-border rounded px-2 text-xs outline-none focus:border-primary"
        />
        <button
          onClick={commit}
          disabled={!canAdd}
          className="h-8 flex items-center gap-1 px-3 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Add a new Lugar / Sede                                                       */
/* -------------------------------------------------------------------------- */

function AddVenue({ onAdd }: { onAdd: (name: string, subtitle?: string) => string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");

  const commit = () => {
    const n = name.trim();
    if (!n) return;
    onAdd(n, subtitle.trim() || undefined);
    setName("");
    setSubtitle("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 py-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
      >
        <Plus className="w-4 h-4" /> Agregar lugar / sede
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-card-border bg-card p-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Nuevo lugar / sede</span>
      </div>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setOpen(false); }}
        placeholder="Nombre del lugar (p. ej. Hotel, Aeropuerto)"
        className="w-full h-9 bg-background border border-border rounded px-2.5 text-sm outline-none focus:border-primary"
      />
      <input
        value={subtitle}
        onChange={e => setSubtitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setOpen(false); }}
        placeholder="Descripción (opcional), p. ej. Cena VIP (Día 1)"
        className="w-full h-8 bg-background border border-border rounded px-2.5 text-xs outline-none focus:border-primary"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={commit}
          disabled={!name.trim()}
          className="h-8 flex items-center gap-1 px-3 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" /> Crear lugar
        </button>
        <button
          onClick={() => { setOpen(false); setName(""); setSubtitle(""); }}
          className="h-8 px-3 rounded border border-border text-xs text-muted-foreground hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
