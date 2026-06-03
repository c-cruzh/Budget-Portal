export type VolunteerDia = "dia-1" | "dia-2" | "ambos";

export interface VolunteerAssignment {
  id: string;
  name: string;
  status: "open" | "confirmed";
}

export interface VolunteerRole {
  id: string;
  space: string;
  dia: VolunteerDia;
  headcount: number;
  role: string;
  horarios: string;
  jobDescription: string;
  dos: string;
  donts: string;
  guidelines: string;
  cotizacion?: string;
  sourceBudgetId?: string;
  assignments?: VolunteerAssignment[];
  createdAt?: string;
  updatedAt?: string;
}

export type VolunteerRoleSeed = Omit<VolunteerRole, "assignments" | "createdAt" | "updatedAt">;

export interface VolunteerRoster {
  roles: VolunteerRole[];
}
