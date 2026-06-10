import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  MapPin, Cloud, CloudOff, Loader2, Trash2, Plus, Users, Layers, CalendarDays, Info,
  Building2, Pencil, Check, X, ImagePlus, Play, ChevronLeft, ChevronRight, Film,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSpacesApi } from "@/hooks/useSpacesApi";
import { useSubEventsApi } from "@/hooks/useSubEventsApi";
import { groupSpacesByZone, type SpaceDayKey, type SpaceEntry, type SpaceMedia, type Venue, type SubEvent } from "@/data/budgetData";

const STORAGE_BASE = "/api/storage";
/** Builds the serving URL for an uploaded object path. */
function mediaUrl(objectPath: string): string {
  return `${STORAGE_BASE}${objectPath}`;
}

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB per file

type AddMediaFn = (entryId: string, media: { objectPath: string; kind: "photo" | "video"; name?: string }) => string;
type RemoveMediaFn = (entryId: string, mediaId: string) => void;

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
    addMedia, removeMedia,
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
              onAddMedia={addMedia}
              onRemoveMedia={removeMedia}
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
          onAddMedia={addMedia}
          onRemoveMedia={removeMedia}
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
  day, label, entries, canEdit, onAdd, onUpdate, onRemove, onRenameZone, onRemoveZone, onAddMedia, onRemoveMedia,
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
  onAddMedia: AddMediaFn;
  onRemoveMedia: RemoveMediaFn;
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
              onAddMedia={onAddMedia}
              onRemoveMedia={onRemoveMedia}
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
  venue, subEvents, canEdit, onUpdateVenue, onRemoveVenue, onAddEntry, onUpdateEntry, onRemoveEntry, onRenameZone, onRemoveZone, onAddMedia, onRemoveMedia,
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
  onAddMedia: AddMediaFn;
  onRemoveMedia: RemoveMediaFn;
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
              onAddMedia={onAddMedia}
              onRemoveMedia={onRemoveMedia}
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
/* Media gallery + upload (per space)                                          */
/* -------------------------------------------------------------------------- */

interface UploadJob {
  id: string;
  name: string;
  progress: number; // 0..1
  error?: string;
}

/** Detects whether a File is an accepted image/video and returns its kind. */
function detectKind(file: File): "photo" | "video" | null {
  const t = (file.type || "").toLowerCase();
  if (t.startsWith("image/")) return "photo";
  if (t.startsWith("video/")) return "video";
  return null;
}

/** Requests a signed upload URL from the server for the given file. */
async function requestUploadUrl(file: File): Promise<{ uploadURL: string; objectPath: string }> {
  const res = await fetch(`${STORAGE_BASE}/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    }),
  });
  if (!res.ok) {
    let msg = `No se pudo iniciar la subida (${res.status})`;
    try { const j = await res.json(); if (j?.error?.message) msg = j.error.message; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

/** PUTs the file bytes to the signed URL, reporting byte progress. */
function putWithProgress(url: string, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = ev => { if (ev.lengthComputable) onProgress(ev.loaded / ev.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Error al subir (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Error de red al subir el archivo"));
    xhr.send(file);
  });
}

function SpaceMediaGallery({
  entryId, media, canEdit, onAddMedia, onRemoveMedia,
}: {
  entryId: string;
  media: SpaceMedia[];
  canEdit: boolean;
  onAddMedia: AddMediaFn;
  onRemoveMedia: RemoveMediaFn;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    for (const file of files) {
      const kind = detectKind(file);
      const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      if (!kind) {
        setJobs(prev => [...prev, { id: jobId, name: file.name, progress: 0, error: "Tipo no admitido (solo imágenes o videos)" }]);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setJobs(prev => [...prev, { id: jobId, name: file.name, progress: 0, error: "Archivo demasiado grande (máx. 200 MB)" }]);
        continue;
      }
      setJobs(prev => [...prev, { id: jobId, name: file.name, progress: 0 }]);
      try {
        const { uploadURL, objectPath } = await requestUploadUrl(file);
        await putWithProgress(uploadURL, file, p =>
          setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, progress: p } : j))),
        );
        onAddMedia(entryId, { objectPath, kind, name: file.name });
        setJobs(prev => prev.filter(j => j.id !== jobId));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al subir";
        setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, error: message } : j)));
      }
    }
  }, [entryId, onAddMedia]);

  const onPick = () => fileInputRef.current?.click();

  const confirmRemove = (m: SpaceMedia) => {
    const ok = window.confirm(`¿Eliminar este ${m.kind === "video" ? "video" : "foto"}? Esta acción no se puede deshacer.`);
    if (ok) onRemoveMedia(entryId, m.id);
  };

  if (!canEdit && media.length === 0) return null;

  return (
    <div className="pl-5">
      {(media.length > 0 || jobs.length > 0 || canEdit) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {media.map((m, idx) => (
            <div key={m.id} className="relative group">
              <button
                type="button"
                onClick={() => setLightboxIndex(idx)}
                className="block w-14 h-14 rounded-md overflow-hidden border border-border bg-muted hover:border-primary transition-colors"
                title={m.name || (m.kind === "video" ? "Video" : "Foto")}
              >
                {m.kind === "video" ? (
                  <div className="relative w-full h-full">
                    <video src={mediaUrl(m.objectPath)} className="w-full h-full object-cover" muted preload="metadata" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-4 h-4 text-white" fill="white" />
                    </span>
                  </div>
                ) : (
                  <img src={mediaUrl(m.objectPath)} alt={m.name || "Foto"} className="w-full h-full object-cover" loading="lazy" />
                )}
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => confirmRemove(m)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  title="Eliminar"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {jobs.map(j => (
            <div
              key={j.id}
              className={`w-14 h-14 rounded-md border flex flex-col items-center justify-center px-1 text-center ${j.error ? "border-red-400 bg-red-50" : "border-border bg-muted"}`}
              title={j.error || j.name}
            >
              {j.error ? (
                <>
                  <X className="w-3.5 h-3.5 text-red-500" />
                  <button onClick={() => setJobs(prev => prev.filter(x => x.id !== j.id))} className="text-[8px] text-red-500 mt-0.5 underline">cerrar</button>
                </>
              ) : (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-[9px] tabular-nums text-muted-foreground mt-1">{Math.round(j.progress * 100)}%</span>
                </>
              )}
            </div>
          ))}

          {canEdit && (
            <button
              type="button"
              onClick={onPick}
              className="w-14 h-14 rounded-md border border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary flex flex-col items-center justify-center gap-0.5 transition-colors"
              title="Subir fotos o videos"
            >
              <ImagePlus className="w-4 h-4" />
              <span className="text-[8px]">Subir</span>
            </button>
          )}

          {canEdit && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={ev => { handleFiles(ev.target.files); ev.target.value = ""; }}
            />
          )}
        </div>
      )}

      {lightboxIndex !== null && media.length > 0 && (
        <MediaLightbox
          items={media}
          index={Math.min(lightboxIndex, media.length - 1)}
          onIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Fullscreen lightbox viewer                                                  */
/* -------------------------------------------------------------------------- */

function MediaLightbox({
  items, index, onIndex, onClose,
}: {
  items: SpaceMedia[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const count = items.length;
  const current = items[index];

  const go = useCallback((delta: number) => {
    onIndex((index + delta + count) % count);
  }, [index, count, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, onClose]);

  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/90 text-sm tabular-nums flex items-center gap-1.5">
        {current.kind === "video" ? <Film className="w-4 h-4" /> : <ImagePlus className="w-4 h-4" />}
        {index + 1} / {count}
      </div>

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        title="Cerrar (Esc)"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Prev */}
      {count > 1 && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); go(-1); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          title="Anterior (←)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Media */}
      <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
        {current.kind === "video" ? (
          <video
            key={current.id}
            src={mediaUrl(current.objectPath)}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[80vh] rounded-lg"
          />
        ) : (
          <img
            key={current.id}
            src={mediaUrl(current.objectPath)}
            alt={current.name || "Foto"}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
          />
        )}
        {current.name && (
          <p className="text-white/70 text-xs mt-3 max-w-[90vw] truncate">{current.name}</p>
        )}
      </div>

      {/* Next */}
      {count > 1 && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); go(1); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          title="Siguiente (→)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/* Generic zone group (day/venue-agnostic via closures)                        */
/* -------------------------------------------------------------------------- */

function ZoneGroup({
  zone, entries, canEdit, allowEmptyName, onAddSpace, onUpdateEntry, onRemoveEntry, onRenameZone, onRemoveZone, onAddMedia, onRemoveMedia,
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
  onAddMedia: AddMediaFn;
  onRemoveMedia: RemoveMediaFn;
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

      <div className="space-y-2 pl-5">
        {entries.map(e => {
          const hasName = !!(e.name || "").trim();
          return (
            <div key={e.id} className="space-y-1.5">
            <div className="flex items-center gap-2">
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
            <SpaceMediaGallery
              entryId={e.id}
              media={e.media ?? []}
              canEdit={canEdit}
              onAddMedia={onAddMedia}
              onRemoveMedia={onRemoveMedia}
            />
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
