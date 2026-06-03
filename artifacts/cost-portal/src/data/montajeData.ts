import type { DiaValue } from "@/data/budgetData";

export type MontajeFase = "montaje" | "desmontaje";

export const FASE_VALUES: MontajeFase[] = ["montaje", "desmontaje"];

export const FASE_LABELS: Record<MontajeFase, string> = {
  montaje: "Montaje",
  desmontaje: "Desmontaje",
};

export interface MontajePersona {
  id: string;
  nombre: string;
  rol: string;
  identificacion: string;
}

export interface MontajeEntry {
  id: string;
  empresa: string;
  dia: DiaValue;
  fase: MontajeFase;
  horaIngreso: string;
  horaSalida: string;
  lineamientos: string;
  personas: MontajePersona[];
  itemIds: string[];
}

export interface MontajeState {
  entries: MontajeEntry[];
}

export const EMPTY_MONTAJE_STATE: MontajeState = { entries: [] };

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeEmptyEntry(dia: DiaValue, fase: MontajeFase): MontajeEntry {
  return {
    id: makeId("mtj"),
    empresa: "",
    dia,
    fase,
    horaIngreso: "",
    horaSalida: "",
    lineamientos: "",
    personas: [],
    itemIds: [],
  };
}

export function makeEmptyPersona(): MontajePersona {
  return { id: makeId("per"), nombre: "", rol: "", identificacion: "" };
}
