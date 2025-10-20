import type { AccessMember } from "./company";

export type TaskRoutineType = "Rutina" | "No Rutina";

export type RiskProbabilityLevel = "Baja" | "Media" | "Alta";

export type RiskConsequenceLevel = "Leve" | "Moderada" | "Grave";

export type RiskClassification =
  | "Tolerable"
  | "Moderado"
  | "Importante"
  | "Intolerable";

export type RiskControlStatus = "Sin controlar" | "En proceso" | "Controlado";

export type RiskControlType =
  | "Eliminar"
  | "Sustituir"
  | "Ingenieril"
  | "Administrativa"
  | "EPP"
  | "Otra";

export interface RiskProbabilityOption {
  level: RiskProbabilityLevel;
  value: number;
  description: string;
  normativeBasis: string;
}

export interface RiskConsequenceOption {
  level: RiskConsequenceLevel;
  value: number;
  description: string;
  examples: string;
}

export interface RiskClassificationDescriptor {
  classification: RiskClassification;
  minScore: number;
  maxScore: number;
  color: string;
  decision: string;
  requiredAction: string;
  rangeLabel?: string;
  scoreValues: number[];
}

export interface RiskMatrixHeader {
  codigoIper: string;
  folioIper: string;
  rutEmpleador: string;
  nombreEmpresa: string;
  direccion: string;
  comuna: string;
  codigoActividadEconomica: string;
  nombreCentroTrabajo: string;
  direccionCentroTrabajo: string;
  jornadaCentroTrabajo: string;
  nTotalTrabajadores: number;
  nTrabajadoras: number;
  nTrabajadores: number;
  fechaActualizacion: string;
  representanteLegal: string;
  nombreRevisor: string;
  nombreAprobador: string;
}

export interface RiskMatrixControl {
  id: string;
  controlDescription: string;
  controlType: RiskControlType;
  implementer: string;
  dueDate: string;
  applied: boolean;
}

export interface RiskMatrixRow {
  id: string;
  actividad: string;
  tarea: string;
  puestoTrabajo: string;
  lugarEspecifico: string;
  numeroTrabajadores: {
    femenino: number;
    masculino: number;
    otros: number;
  };
  rutina: TaskRoutineType;
  peligro: string;
  factorDeRiesgo: string;
  riesgo: string;
  danoProbable: string;
  probabilidad: RiskProbabilityLevel;
  consecuencia: RiskConsequenceLevel;
  puntuacion: number;
  clasificacion: RiskClassification;
  medidasDeControl: string;
  estadoControl: RiskControlStatus;
  responsable: string;
  plazo: string;
  controles?: RiskMatrixControl[];
}

export interface RiskMatrixDocument {
  id: string;
  header: RiskMatrixHeader;
  rows: RiskMatrixRow[];
  criterios: RiskClassificationDescriptor[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  reviewers: string[];
  linkedMembers?: AccessMember[];
}

export interface RiskEvaluationCriteria {
  probability: RiskProbabilityOption[];
  consequence: RiskConsequenceOption[];
  classification: RiskClassificationDescriptor[];
}
