import { db } from "@workspace/db";
import { auditLog, type NewAuditLogEntry } from "@workspace/db/schema";

export interface AuditUser {
  userName: string;
  userEmail: string;
  userOrg: string;
}

export function getAuditUser(req: any): AuditUser | null {
  const s = req.session;
  if (!s?.userOrg) return null;
  return {
    userName: s.userName || "Unknown",
    userEmail: s.userEmail || "",
    userOrg: s.userOrg,
  };
}

export async function writeAuditEntries(entries: NewAuditLogEntry[]) {
  if (!entries.length) return;
  try {
    await db.insert(auditLog).values(entries);
  } catch (err) {
    console.error("[audit] failed to write entries", err);
  }
}

function isPlainObject(v: any) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function normalize(v: any): any {
  if (v === undefined || v === null || v === "") return null;
  return v;
}

function valuesEqual(a: any, b: any): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (isPlainObject(na) && isPlainObject(nb)) return JSON.stringify(na) === JSON.stringify(nb);
  if (Array.isArray(na) && Array.isArray(nb)) return JSON.stringify(na) === JSON.stringify(nb);
  return false;
}

const TRACKED_BUDGET_FIELDS = [
  "evento", "area", "centroCosto", "item", "descripcion", "notas",
  "qty", "uom", "porDias", "qtyDias", "precioUnitario",
  "subtotal", "fee", "iva", "turismo", "total",
  "proveedor", "cotizacion", "cotizacionLink", "documento",
  "inKind", "aplicaFee", "validarCosto", "contratarAparte", "agencyFee",
  "aplicaTurismo", "exentoIva", "niceToHave", "approvedQuoteId",
  "assignedTo", "soloPresupuestado", "accionRequerida", "reviewedBy",
  "statusCotizacion", "mitigable", "mitigNote",
];

export function diffBudgetItems(
  user: AuditUser,
  oldItems: any[] | null | undefined,
  newItems: any[],
): NewAuditLogEntry[] {
  const entries: NewAuditLogEntry[] = [];
  const oldMap = new Map<string, any>();
  if (Array.isArray(oldItems)) for (const it of oldItems) if (it?.id) oldMap.set(it.id, it);
  const newMap = new Map<string, any>();
  for (const it of newItems) if (it?.id) newMap.set(it.id, it);

  // Created
  for (const [id, item] of newMap) {
    if (!oldMap.has(id)) {
      entries.push({
        ...user,
        entityType: "budget-item",
        entityId: id,
        entityLabel: item.item || item.descripcion || id,
        action: "CREATE",
        summary: `Agregó item "${item.item || id}"`,
      });
    }
  }
  // Deleted
  for (const [id, item] of oldMap) {
    if (!newMap.has(id)) {
      entries.push({
        ...user,
        entityType: "budget-item",
        entityId: id,
        entityLabel: item.item || item.descripcion || id,
        action: "DELETE",
        summary: `Eliminó item "${item.item || id}"`,
      });
    }
  }
  // Updated
  for (const [id, newIt] of newMap) {
    const oldIt = oldMap.get(id);
    if (!oldIt) continue;
    for (const field of TRACKED_BUDGET_FIELDS) {
      if (!valuesEqual(oldIt[field], newIt[field])) {
        entries.push({
          ...user,
          entityType: "budget-item",
          entityId: id,
          entityLabel: newIt.item || newIt.descripcion || id,
          action: "UPDATE",
          field,
          oldValue: normalize(oldIt[field]) as any,
          newValue: normalize(newIt[field]) as any,
          summary: `Editó ${field} en "${newIt.item || id}"`,
        });
      }
    }
    // Quotes deep compare (content + count). Normalize to detect any change.
    const oldQuotes = Array.isArray(oldIt.quotes) ? oldIt.quotes : [];
    const newQuotes = Array.isArray(newIt.quotes) ? newIt.quotes : [];
    const oldQStr = JSON.stringify(oldQuotes);
    const newQStr = JSON.stringify(newQuotes);
    if (oldQStr !== newQStr) {
      entries.push({
        ...user,
        entityType: "budget-item",
        entityId: id,
        entityLabel: newIt.item || newIt.descripcion || id,
        action: "UPDATE",
        field: "quotes",
        oldValue: { count: oldQuotes.length, items: oldQuotes } as any,
        newValue: { count: newQuotes.length, items: newQuotes } as any,
        summary: oldQuotes.length !== newQuotes.length
          ? `Cambió cotizaciones (${oldQuotes.length} → ${newQuotes.length}) en "${newIt.item || id}"`
          : `Editó cotizaciones de "${newIt.item || id}"`,
      });
    }
  }
  return entries;
}

export function diffSponsors(
  user: AuditUser,
  oldSponsors: any[] | null | undefined,
  newSponsors: any[],
): NewAuditLogEntry[] {
  const entries: NewAuditLogEntry[] = [];
  const oldMap = new Map<string, any>();
  if (Array.isArray(oldSponsors)) for (const s of oldSponsors) if (s?.id) oldMap.set(s.id, s);
  const newMap = new Map<string, any>();
  for (const s of newSponsors) if (s?.id) newMap.set(s.id, s);

  for (const [id, s] of newMap) {
    if (!oldMap.has(id)) {
      entries.push({
        ...user,
        entityType: "sponsor",
        entityId: id,
        entityLabel: s.name || id,
        action: "CREATE",
        summary: `Agregó sponsor "${s.name || id}"${s.amount ? ` ($${s.amount})` : ""}`,
      });
    }
  }
  for (const [id, s] of oldMap) {
    if (!newMap.has(id)) {
      entries.push({
        ...user,
        entityType: "sponsor",
        entityId: id,
        entityLabel: s.name || id,
        action: "DELETE",
        summary: `Eliminó sponsor "${s.name || id}"`,
      });
    }
  }
  const sponsorFields = ["name", "amount", "status", "notes", "link"];
  for (const [id, newS] of newMap) {
    const oldS = oldMap.get(id);
    if (!oldS) continue;
    for (const f of sponsorFields) {
      if (!valuesEqual(oldS[f], newS[f])) {
        entries.push({
          ...user,
          entityType: "sponsor",
          entityId: id,
          entityLabel: newS.name || id,
          action: "UPDATE",
          field: f,
          oldValue: normalize(oldS[f]) as any,
          newValue: normalize(newS[f]) as any,
          summary: `Editó ${f} de sponsor "${newS.name || id}"`,
        });
      }
    }
  }
  return entries;
}

export function diffScenario(
  user: AuditUser,
  oldScenario: any,
  newScenario: any,
): NewAuditLogEntry[] {
  const entries: NewAuditLogEntry[] = [];
  const old = oldScenario || {};
  const next = newScenario || {};
  const keys = new Set([...Object.keys(old), ...Object.keys(next)]);
  for (const k of keys) {
    if (!valuesEqual(old[k], next[k])) {
      entries.push({
        ...user,
        entityType: "scenario",
        entityId: k,
        entityLabel: "Escenario sponsors",
        action: "UPDATE",
        field: k,
        oldValue: normalize(old[k]) as any,
        newValue: normalize(next[k]) as any,
        summary: `Cambió escenario ${k}: ${JSON.stringify(old[k]) ?? "—"} → ${JSON.stringify(next[k])}`,
      });
    }
  }
  return entries;
}
