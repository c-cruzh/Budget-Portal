import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, UserPlus, Trash2, Cloud, CloudOff, Loader2, ChevronDown, ChevronRight,
  HandHelping, CalendarDays, Layers, MapPin, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useVolunteersApi } from "@/hooks/useVolunteersApi";
import { useSpacesApi } from "@/hooks/useSpacesApi";
import {
  computeVolunteerTotals, personDaysForRole,
  type VolunteerRole,
} from "@/data/volunteersData";
import { DIA_VALUES, DIA_LABELS, DIA_COLORS, type DiaValue } from "@/data/budgetData";

function newId(): string {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return `vol-${(crypto as any).randomUUID()}`;
  return `vol-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function DiaBadge({ dia }: { dia: DiaValue }) {
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded font-medium border"
      style={{
        color: DIA_COLORS[dia],
        backgroundColor: `${DIA_COLORS[dia]}1a`,
        borderColor: `${DIA_COLORS[dia]}33`,
      }}
    >
      {DIA_LABELS[dia]}
    </span>
  );
}

export default function VoluntariosPage() {
  const { permissions } = useAuth();
  const canEdit = permissions.canEdit;
  const { roles, setRoles, loading, saving, error, meta } = useVolunteersApi();
  const { spaces } = useSpacesApi();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsedSpaces, setCollapsedSpaces] = useState<Set<string>>(new Set());

  const totals = useMemo(() => computeVolunteerTotals(roles), [roles]);

  const spaceOptions = useMemo(() => {
    const set = new Set<string>();
    (spaces["dia-1"] || []).forEach(s => set.add(s));
    (spaces["dia-2"] || []).forEach(s => set.add(s));
    roles.forEach(r => { if (r.space.trim()) set.add(r.space.trim()); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [spaces, roles]);

  const grouped = useMemo(() => {
    const map = new Map<string, VolunteerRole[]>();
    for (const r of roles) {
      const key = r.space.trim() || "General / Sin asignar";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [roles]);

  function updateRole(id: string, patch: Partial<VolunteerRole>) {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r));
  }

  function addRole(space?: string) {
    const now = new Date().toISOString();
    const role: VolunteerRole = {
      id: newId(),
      space: space || "",
      dia: "ambos",
      headcount: 1,
      role: "",
      horarios: "",
      jobDescription: "",
      dos: "",
      donts: "",
      guidelines: "",
      assignments: [],
      createdAt: now,
      updatedAt: now,
    };
    setRoles(prev => [...prev, role]);
    setExpanded(prev => new Set(prev).add(role.id));
  }

  function deleteRole(id: string) {
    setRoles(prev => prev.filter(r => r.id !== id));
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSpace(space: string) {
    setCollapsedSpaces(prev => {
      const next = new Set(prev);
      if (next.has(space)) next.delete(space); else next.add(space);
      return next;
    });
  }

  const summaryCards = [
    { label: "Roles", value: String(totals.roleCount), sub: "Posiciones de voluntariado", icon: Layers, color: "bg-violet-500/10 text-violet-500" },
    { label: "Voluntarios Día 1", value: String(totals.dia1), sub: "Headcount requerido", icon: CalendarDays, color: "bg-blue-500/10 text-blue-500" },
    { label: "Voluntarios Día 2", value: String(totals.dia2), sub: "Headcount requerido", icon: CalendarDays, color: "bg-emerald-500/10 text-emerald-500" },
    { label: "Total HC", value: String(totals.overall), sub: "Suma de headcount por rol", icon: Users, color: "bg-amber-500/10 text-amber-600" },
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
            <HandHelping className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Voluntarios</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Roster de roles de voluntariado (in-kind, sin costo) por espacio, día y headcount.
            Estos roles ya no viven en Budget Items — los ítems que cuestan dinero o son bienes físicos
            (laptops, gafetes, alimentos) permanecen en el presupuesto.
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
          {canEdit && (
            <button
              onClick={() => addRole()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <UserPlus className="w-4 h-4" /> Agregar rol
            </button>
          )}
        </div>
      </div>

      {meta?.lastEditedBy && (
        <p className="text-[11px] text-muted-foreground/70">
          Última edición por {meta.lastEditedBy} ({meta.lastEditedByOrg}) · {new Date(meta.lastEditedAt).toLocaleString()}
        </p>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card, idx) => (
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
            <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Note about future assignment */}
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          La asignación de voluntarios por nombre y el estado de cobertura (cubierto / pendiente)
          se habilitarán más adelante. El modelo de datos ya reserva ese espacio.
        </span>
      </div>

      <datalist id="vol-spaces">
        {spaceOptions.map(s => <option key={s} value={s} />)}
      </datalist>

      {/* Roster grouped by space */}
      {roles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay roles de voluntariado todavía.</p>
          {canEdit && (
            <button onClick={() => addRole()} className="mt-3 text-sm text-primary hover:underline">
              Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([space, spaceRoles]) => {
            const collapsed = collapsedSpaces.has(space);
            const spaceHc = spaceRoles.reduce((s, r) => s + (Number(r.headcount) || 0), 0);
            return (
              <div key={space} className="rounded-xl border border-card-border bg-card overflow-hidden">
                <button
                  onClick={() => toggleSpace(space)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-semibold text-foreground text-sm flex-1">{space}</span>
                  <span className="text-[11px] text-muted-foreground">{spaceRoles.length} roles</span>
                  <Badge variant="secondary" className="text-[10px]">{spaceHc} HC</Badge>
                </button>

                {!collapsed && (
                  <div className="divide-y divide-border">
                    {spaceRoles.map(role => {
                      const isOpen = expanded.has(role.id);
                      return (
                        <div key={role.id} className="px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <button onClick={() => toggleExpanded(role.id)} className="text-muted-foreground hover:text-foreground">
                              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>

                            {/* Role name */}
                            {canEdit ? (
                              <input
                                value={role.role}
                                onChange={e => updateRole(role.id, { role: e.target.value })}
                                placeholder="Nombre del rol"
                                className="flex-1 min-w-[180px] bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none text-sm font-medium text-foreground py-1"
                              />
                            ) : (
                              <span className="flex-1 min-w-[180px] text-sm font-medium text-foreground">{role.role || "—"}</span>
                            )}

                            {/* Día */}
                            {canEdit ? (
                              <select
                                value={role.dia}
                                onChange={e => updateRole(role.id, { dia: e.target.value as DiaValue })}
                                className="text-xs bg-muted border border-border rounded px-2 py-1 outline-none focus:border-primary"
                              >
                                {DIA_VALUES.map(d => <option key={d} value={d}>{DIA_LABELS[d]}</option>)}
                              </select>
                            ) : (
                              <DiaBadge dia={role.dia} />
                            )}

                            {/* Headcount */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground uppercase">HC</span>
                              {canEdit ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={role.headcount}
                                  onChange={e => updateRole(role.id, { headcount: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                                  className="w-16 bg-muted border border-border rounded px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
                                />
                              ) : (
                                <span className="text-sm font-semibold text-foreground">{role.headcount}</span>
                              )}
                            </div>

                            {role.cotizacion && (
                              <Badge variant="outline" className="text-[9px]">{role.cotizacion}</Badge>
                            )}

                            {canEdit && (
                              <button
                                onClick={() => deleteRole(role.id)}
                                className="text-muted-foreground hover:text-red-500 transition-colors"
                                title="Eliminar rol"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {isOpen && (
                            <div className="mt-3 pl-7 grid gap-3 md:grid-cols-2">
                              <Field
                                label="Espacio"
                                value={role.space}
                                onChange={v => updateRole(role.id, { space: v })}
                                canEdit={canEdit}
                                list="vol-spaces"
                                placeholder="Espacio / área"
                              />
                              <Field
                                label="Horarios"
                                value={role.horarios}
                                onChange={v => updateRole(role.id, { horarios: v })}
                                canEdit={canEdit}
                                placeholder="Ej. 7:00–17:00, ambos días"
                              />
                              <TextArea
                                label="Descripción del puesto"
                                value={role.jobDescription}
                                onChange={v => updateRole(role.id, { jobDescription: v })}
                                canEdit={canEdit}
                                className="md:col-span-2"
                              />
                              <TextArea
                                label="Do's (hacer)"
                                value={role.dos}
                                onChange={v => updateRole(role.id, { dos: v })}
                                canEdit={canEdit}
                              />
                              <TextArea
                                label="Don'ts (no hacer)"
                                value={role.donts}
                                onChange={v => updateRole(role.id, { donts: v })}
                                canEdit={canEdit}
                              />
                              <TextArea
                                label="Lineamientos / Guidelines"
                                value={role.guidelines}
                                onChange={v => updateRole(role.id, { guidelines: v })}
                                canEdit={canEdit}
                                className="md:col-span-2"
                              />
                              <p className="md:col-span-2 text-[10px] text-muted-foreground/70">
                                {personDaysForRole(role)} persona-días · {role.sourceBudgetId ? `Origen: budget #${role.sourceBudgetId}` : "Creado manualmente"}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {canEdit && (
                      <div className="px-4 py-2">
                        <button
                          onClick={() => addRole(space === "General / Sin asignar" ? "" : space)}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Agregar rol en {space}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, canEdit, placeholder, list, className }: {
  label: string; value: string; onChange: (v: string) => void; canEdit: boolean; placeholder?: string; list?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</label>
      {canEdit ? (
        <input
          value={value}
          list={list}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-muted border border-border rounded px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
        />
      ) : (
        <p className="text-sm text-foreground whitespace-pre-wrap">{value || "—"}</p>
      )}
    </div>
  );
}

function TextArea({ label, value, onChange, canEdit, className }: {
  label: string; value: string; onChange: (v: string) => void; canEdit: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</label>
      {canEdit ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className="w-full bg-muted border border-border rounded px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary resize-y"
        />
      ) : (
        <p className="text-sm text-foreground whitespace-pre-wrap">{value || "—"}</p>
      )}
    </div>
  );
}
