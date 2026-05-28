import { useState, useCallback } from "react";
import { Calendar, Plus, Trash2, Clock, MapPin, User, FileText, CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAgendaApi, type AgendaKey, type AgendaRow } from "@/hooks/useAgendaApi";

function newRowId() {
  return (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `ag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyRow(includeDate: boolean): AgendaRow {
  const base: AgendaRow = {
    id: newRowId(),
    time: "",
    activity: "",
    location: "",
    responsible: "",
    notes: "",
  };
  if (includeDate) base.date = "";
  return base;
}

interface AgendaTabProps {
  agendaKey: AgendaKey;
  includeDate: boolean;
  emptyMessage: string;
}

function AgendaTab({ agendaKey, includeDate, emptyMessage }: AgendaTabProps) {
  const { permissions } = useAuth();
  const canEdit = permissions?.canEdit ?? false;
  const { rows, setRows, loading, error } = useAgendaApi(agendaKey);

  const addRow = useCallback(() => {
    if (!canEdit) return;
    setRows(prev => [...prev, emptyRow(includeDate)]);
  }, [canEdit, includeDate, setRows]);

  const updateRow = useCallback((id: string, field: keyof AgendaRow, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, [setRows]);

  const deleteRow = useCallback((id: string) => {
    if (!canEdit) return;
    setRows(prev => prev.filter(r => r.id !== id));
  }, [canEdit, setRows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Cargando agenda...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-3 py-2 rounded-md border border-red-500/30 bg-red-500/10 text-red-600 text-xs">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "actividad" : "actividades"}
        </div>
        {canEdit && (
          <Button size="sm" onClick={addRow} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Agregar fila
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">{emptyMessage}</p>
          {canEdit && (
            <p className="text-xs text-muted-foreground/60">
              Haz clic en "Agregar fila" para crear la primera actividad.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                {includeDate && (
                  <th className="px-3 py-2.5 font-semibold w-[120px]">
                    <div className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3" />Fecha</div>
                  </th>
                )}
                <th className="px-3 py-2.5 font-semibold w-[110px]">
                  <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" />Hora</div>
                </th>
                <th className="px-3 py-2.5 font-semibold">Actividad</th>
                <th className="px-3 py-2.5 font-semibold w-[180px]">
                  <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />Lugar</div>
                </th>
                <th className="px-3 py-2.5 font-semibold w-[160px]">
                  <div className="flex items-center gap-1.5"><User className="w-3 h-3" />Responsable</div>
                </th>
                <th className="px-3 py-2.5 font-semibold w-[220px]">
                  <div className="flex items-center gap-1.5"><FileText className="w-3 h-3" />Notas</div>
                </th>
                {canEdit && <th className="px-2 py-2.5 w-[40px]"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors",
                    idx % 2 === 1 && "bg-muted/10"
                  )}
                >
                  {includeDate && (
                    <td className="px-2 py-1.5">
                      <Input
                        type="date"
                        value={row.date || ""}
                        onChange={(e) => updateRow(row.id, "date", e.target.value)}
                        disabled={!canEdit}
                        className="h-8 text-xs"
                      />
                    </td>
                  )}
                  <td className="px-2 py-1.5">
                    <Input
                      value={row.time}
                      onChange={(e) => updateRow(row.id, "time", e.target.value)}
                      placeholder="09:00 - 10:00"
                      disabled={!canEdit}
                      className="h-8 text-xs font-mono"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={row.activity}
                      onChange={(e) => updateRow(row.id, "activity", e.target.value)}
                      placeholder="Nombre de la actividad"
                      disabled={!canEdit}
                      className="h-8 text-xs font-medium"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={row.location}
                      onChange={(e) => updateRow(row.id, "location", e.target.value)}
                      placeholder="Lugar"
                      disabled={!canEdit}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={row.responsible}
                      onChange={(e) => updateRow(row.id, "responsible", e.target.value)}
                      placeholder="Responsable"
                      disabled={!canEdit}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={row.notes}
                      onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                      placeholder="Notas..."
                      disabled={!canEdit}
                      className="h-8 text-xs"
                    />
                  </td>
                  {canEdit && (
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="text-muted-foreground/50 hover:text-red-500 transition-colors p-1"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TAB_DEFS: Array<{
  key: AgendaKey;
  value: string;
  label: string;
  description: string;
  includeDate: boolean;
  emptyMessage: string;
}> = [
  {
    key: "lanzamiento",
    value: "lanzamiento",
    label: "Lanzamiento",
    description: "Programa del evento de lanzamiento.",
    includeDate: false,
    emptyMessage: "Aún no hay actividades para el evento de lanzamiento.",
  },
  {
    key: "evento",
    value: "evento",
    label: "Evento (Noviembre)",
    description: "Programa del evento principal de noviembre, día por día.",
    includeDate: false,
    emptyMessage: "Aún no hay actividades para el evento de noviembre.",
  },
  {
    key: "completa",
    value: "completa",
    label: "Completa",
    description: "Vista cronológica completa desde la llegada hasta la salida en noviembre.",
    includeDate: true,
    emptyMessage: "Aún no hay actividades en la agenda completa.",
  },
];

export default function AgendaPage() {
  const [tab, setTab] = useState<string>("lanzamiento");
  const active = TAB_DEFS.find(t => t.value === tab) || TAB_DEFS[0];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Gestiona las tres agendas del EmTech Digital El Salvador 2026.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="h-auto p-1">
          {TAB_DEFS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <p className="text-xs text-muted-foreground mt-3 mb-1">{active.description}</p>

        {TAB_DEFS.map(t => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            <AgendaTab
              agendaKey={t.key}
              includeDate={t.includeDate}
              emptyMessage={t.emptyMessage}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
