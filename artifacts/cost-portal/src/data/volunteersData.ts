import type { DiaValue } from "@/data/budgetData";
import { dayCountForDia } from "@/data/budgetData";

/**
 * A named-person slot reserved against a role. Modeled now so the future
 * "assign volunteers by name + fill status" work has a stable shape to build
 * on, but intentionally NOT surfaced in the UI yet.
 */
export interface VolunteerAssignment {
  id: string;
  name: string;
  status: "open" | "confirmed";
}

export interface VolunteerRole {
  id: string;
  /** The space / area this role staffs. */
  space: string;
  /** Día 1, Día 2, or both. */
  dia: DiaValue;
  /** Headcount (HC) — number of volunteers needed for this role. */
  headcount: number;
  /** Job title / role name. */
  role: string;
  /** Applicable schedules / horarios (free text). */
  horarios: string;
  /** Job description. */
  jobDescription: string;
  /** Do's. */
  dos: string;
  /** Don'ts. */
  donts: string;
  /** Guidelines. */
  guidelines: string;
  /** Original cotización tag (VOLUNTARIO / PROVEE ESEN). */
  cotizacion?: string;
  /** Provenance: the budget row id this role was migrated from. */
  sourceBudgetId?: string;
  /** Reserved for future named-person assignment + fill-status. Not implemented. */
  assignments?: VolunteerAssignment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VolunteerRoster {
  roles: VolunteerRole[];
}

export const EMPTY_VOLUNTEER_ROSTER: VolunteerRoster = { roles: [] };

export interface VolunteerTotals {
  dia1: number;
  dia2: number;
  overall: number;
  roleCount: number;
}

/** Headcount totals split by day. A role on "ambos" counts toward both days. */
export function computeVolunteerTotals(roles: VolunteerRole[]): VolunteerTotals {
  let dia1 = 0;
  let dia2 = 0;
  let overall = 0;
  for (const r of roles) {
    const hc = Number(r.headcount) || 0;
    overall += hc;
    if (r.dia === "dia-1" || r.dia === "ambos") dia1 += hc;
    if (r.dia === "dia-2" || r.dia === "ambos") dia2 += hc;
  }
  return { dia1, dia2, overall, roleCount: roles.length };
}

/** Total person-days represented by a role (headcount × days it spans). */
export function personDaysForRole(r: VolunteerRole): number {
  return (Number(r.headcount) || 0) * dayCountForDia(r.dia);
}
