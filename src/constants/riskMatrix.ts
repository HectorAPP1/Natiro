import type {
  RiskClassificationDescriptor,
  RiskConsequenceOption,
  RiskEvaluationCriteria,
  RiskProbabilityOption,
} from "../types/riskMatrix";

export const RISK_PROBABILITY_OPTIONS: RiskProbabilityOption[] = [
  {
    level: "Baja",
    value: 1,
    description:
      "El daño ocurrirá rara vez o en contadas ocasiones. Corresponde a eventos con baja frecuencia y posibilidad remota de ocurrencia.",
    normativeBasis: "DS 44 Art. 21, Guía ISP 2025 — Probabilidad baja",
  },
  {
    level: "Media",
    value: 2,
    description:
      "El daño puede ocurrir en varias ocasiones. Existe una probabilidad apreciable pero no permanente de materialización.",
    normativeBasis: "DS 44 Art. 21, Guía ISP 2025 — Probabilidad media",
  },
  {
    level: "Alta",
    value: 4,
    description:
      "El daño ocurrirá siempre o casi siempre. Situaciones con evidencia clara de ocurrencia inmediata o muy frecuente.",
    normativeBasis: "DS 44 Art. 21, Guía ISP 2025 — Probabilidad alta",
  },
];

export const RISK_CONSEQUENCE_OPTIONS: RiskConsequenceOption[] = [
  {
    level: "Leve",
    value: 1,
    description:
      "Lesiones o daños menores, con recuperación rápida y repercusiones limitadas. No provoca incapacidad permanente.",
    examples: "Cortes superficiales, irritaciones dérmicas, molestias transitorias.",
  },
  {
    level: "Moderada",
    value: 2,
    description:
      "Lesiones que pueden requerir atención médica, con incapacidad temporal o consecuencias significativas.",
    examples: "Laceraciones, quemaduras leves, intoxicaciones, fracturas simples.",
  },
  {
    level: "Grave",
    value: 4,
    description:
      "Daños severos que generan incapacidad permanente o riesgo vital. Incluye eventos catastróficos.",
    examples: "Amputaciones, lesiones múltiples, quemaduras graves, fatalidades.",
  },
];

export const RISK_CLASSIFICATION_DESCRIPTORS: RiskClassificationDescriptor[] = [
  {
    classification: "Tolerable",
    minScore: 1,
    maxScore: 2,
    color: "#22c55e",
    decision: "Mantener", 
    requiredAction:
      "No se requiere mejora inmediata; realizar seguimiento y mantener controles existentes según DS 44 e ISO 45001 (cláusula 8.1).",
    rangeLabel: "1 y 2",
    scoreValues: [1, 2],
  },
  {
    classification: "Moderado",
    minScore: 4,
    maxScore: 4,
    color: "#facc15",
    decision: "Mejorar",
    requiredAction:
      "Planificar medidas adicionales que no impliquen inversiones mayores y programar seguimiento periódico (DS 44, Art. 17).",
    rangeLabel: "4",
    scoreValues: [4],
  },
  {
    classification: "Importante",
    minScore: 8,
    maxScore: 8,
    color: "#f97316",
    decision: "Intervenir",
    requiredAction:
      "No continuar la tarea hasta implementar controles correctivos significativos y reducir el riesgo (ISO 45001 8.1.2).",
    rangeLabel: "8",
    scoreValues: [8],
  },
  {
    classification: "Intolerable",
    minScore: 16,
    maxScore: 16,
    color: "#ef4444",
    decision: "Detener",
    requiredAction:
      "Suspender el trabajo inmediatamente; aplicar medidas urgentes o prohibir la actividad hasta controlar el riesgo, conforme DS 44 Art. 21.",
    rangeLabel: "16",
    scoreValues: [16],
  },
];

export const DEFAULT_RISK_EVALUATION_CRITERIA: RiskEvaluationCriteria = {
  probability: RISK_PROBABILITY_OPTIONS,
  consequence: RISK_CONSEQUENCE_OPTIONS,
  classification: RISK_CLASSIFICATION_DESCRIPTORS,
};
