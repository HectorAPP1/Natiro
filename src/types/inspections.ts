export type InspectionFrequency =
  | "Diaria"
  | "Semanal"
  | "Mensual"
  | "Trimestral"
  | "Semestral"
  | "Anual";

export type InspectionDiscipline =
  | "Seguridad"
  | "Salud e Higiene"
  | "Medioambiente"
  | "Calidad"
  | "Contratistas";

export interface InspectionTemplate {
  id: string;
  name: string;
  standard: string;
  description: string;
  discipline: InspectionDiscipline;
  checklistLength: number;
}

export interface InspectionProgram {
  id: string;
  name: string;
  frequency: InspectionFrequency;
  discipline: InspectionDiscipline;
  location: string;
  responsible: {
    name: string;
    email: string;
  };
  templateId: string;
  nextDate: string; // ISO string
  status: "Activa" | "Pausada";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_INSPECTION_TEMPLATES: InspectionTemplate[] = [
  {
    id: "iso-45001-general",
    name: "ISO 45001 - Inspección de seguridad general",
    standard: "ISO 45001 / DS 594",
    description:
      "Checklist orientado a identificar condiciones y actos inseguros en áreas operativas.",
    discipline: "Seguridad",
    checklistLength: 32,
  },
  {
    id: "iso-14001-residuos",
    name: "ISO 14001 - Gestión de residuos peligrosos",
    standard: "ISO 14001 / DS 148",
    description:
      "Verificación del almacenamiento, rotulación y disposición de residuos peligrosos.",
    discipline: "Medioambiente",
    checklistLength: 18,
  },
  {
    id: "ds-594-higiene",
    name: "DS 594 - Higiene industrial",
    standard: "DS 594 / Ley 16.744",
    description:
      "Control de ventilación, iluminación, orden y limpieza en áreas de trabajo.",
    discipline: "Salud e Higiene",
    checklistLength: 24,
  },
  {
    id: "contratistas-hse",
    name: "Evaluación HSE a contratistas",
    standard: "ISO 45001 / Reg. Internos",
    description:
      "Auditoría rápida a cumplimiento HSE de empresas contratistas y subcontratistas.",
    discipline: "Contratistas",
    checklistLength: 20,
  },
];
