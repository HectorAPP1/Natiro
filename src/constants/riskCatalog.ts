import type { RiskMatrixRow } from "../types/riskMatrix";

export type RiskFactorId =
  | "seguridad-accidentes"
  | "higienico-agentes"
  | "ergonomico"
  | "psicosocial"
  | "operacional-critico"
  | "otros-complementarios";

export interface RiskCatalogRisk {
  id: string;
  label: string;
  definition: string;
  source: string;
}

export interface RiskCatalogFactor {
  id: RiskFactorId;
  label: string;
  normativeReference: string;
  risks: RiskCatalogRisk[];
}

export const RISK_FACTOR_CATALOG: RiskCatalogFactor[] = [
  {
    id: "seguridad-accidentes",
    label:
      "Seguridad — Riesgos de accidente (caídas / golpes / atrapamientos / choques)",
    normativeReference:
      "DS 44, ISO 45001 (6.1.2), SUSESO e Instituto de Salud Pública de Chile",
    risks: [
      {
        id: "caida-personas-distinto-nivel",
        label: "Caída de personas a distinto nivel",
        definition:
          "Caída a un plano inferior de sustentación en trabajos en altura, andamios, ventanas o zanjas.",
        source: "Instituto de Salud Pública de Chile",
      },
      {
        id: "caida-personas-mismo-nivel",
        label: "Caída de personas al mismo nivel",
        definition:
          "Caída que ocurre en el mismo plano de sustentación por resbalones, tropiezos o traspiés.",
        source: "SUSESO — Gobierno de Chile",
      },
      {
        id: "caida-objetos-altura",
        label: "Caída de objetos desde altura",
        definition:
          "Objetos, materiales o herramientas que caen desde un nivel superior e impactan a trabajadores.",
        source: "Portal INSST",
      },
      {
        id: "golpeado-objeto-movimiento",
        label: "Golpeado por objeto en movimiento",
        definition:
          "Impactos generados por piezas, vehículos, maquinarias o herramientas en movimiento.",
        source: "Portal INSST",
      },
      {
        id: "golpeado-objeto-inmovil",
        label: "Golpeado por objeto inmóvil / choque contra",
        definition:
          "Golpes contra elementos fijos como columnas, puertas, estructuras o maquinaria estacionaria.",
        source: "ACHS",
      },
      {
        id: "cortes-laceraciones-punzamientos",
        label: "Cortes / laceraciones / punzamientos",
        definition:
          "Lesiones por contacto con bordes afilados, herramientas cortantes o envases con aristas.",
        source: "ACHS",
      },
      {
        id: "atrapamiento-aplastamiento-amputacion",
        label: "Atrapamiento / aplastamiento / amputación",
        definition:
          "Atrapamientos entre piezas o al interior de máquinas y aplastamientos por vuelco o colapso.",
        source: "Codelco",
      },
      {
        id: "atropello-vehiculo-movil",
        label: "Atropello por vehículo / móvil",
        definition:
          "Impacto causado por vehículos, equipos móviles o maquinaria en faenas y patios de maniobra.",
        source: "Portal INSST",
      },
      {
        id: "incendio-explosion",
        label: "Incendio / explosión",
        definition:
          "Ignición de combustibles o atmósferas explosivas asociadas a fallas eléctricas o fugas.",
        source: "Portal INSST",
      },
      {
        id: "contacto-electrico-electrocucion",
        label: "Contacto eléctrico / electrocución",
        definition:
          "Contacto directo o indirecto con conductores o equipos energizados generando paso de corriente.",
        source: "ResearchGate / SUSESO",
      },
      {
        id: "caida-profundidades",
        label: "Caída en profundidades (excavaciones, pozos)",
        definition:
          "Caídas en cavidades o zanjas durante trabajos de excavación o construcción a distinto nivel.",
        source: "Instituto de Salud Pública de Chile",
      },
    ],
  },
  {
    id: "higienico-agentes",
    label: "Higiénico — Agentes físicos, químicos y biológicos",
    normativeReference:
      "DS 594, ISO 45001 (6.1.2), guías Instituto de Salud Pública de Chile",
    risks: [
      {
        id: "ruido-ocupacional",
        label: "Exposición a ruido ocupacional",
        definition:
          "Exposición a niveles de ruido capaces de generar hipoacusia o pérdida auditiva inducida.",
        source: "Instituto de Salud Pública de Chile",
      },
      {
        id: "vibraciones",
        label: "Vibraciones (mano-brazo / cuerpo entero)",
        definition:
          "Exposición a vibraciones transmitidas al sistema mano-brazo o al cuerpo completo.",
        source: "Instituto de Salud Pública de Chile",
      },
      {
        id: "temperaturas-extremas",
        label: "Temperaturas extremas (frío / calor)",
        definition:
          "Ambientes térmicos extremos que generan estrés por calor o por frío en las personas.",
        source: "Instituto de Salud Pública de Chile",
      },
      {
        id: "iluminacion-deficiente",
        label: "Iluminación deficiente",
        definition:
          "Niveles de iluminación insuficientes que provocan fatiga visual, tropiezos o accidentes.",
        source: "Instituto de Salud Pública de Chile",
      },
      {
        id: "agentes-quimicos",
        label: "Exposición a agentes químicos",
        definition:
          "Inhalación, contacto dérmico o ingestión de gases, vapores, polvos, aerosoles o líquidos peligrosos.",
        source: "Instituto de Salud Pública de Chile",
      },
      {
        id: "agentes-biologicos",
        label: "Exposición a agentes biológicos",
        definition:
          "Contacto con virus, bacterias, hongos u otros microorganismos capaces de generar enfermedad.",
        source: "SUSESO — Gobierno de Chile",
      },
      {
        id: "radiaciones",
        label: "Radiaciones ionizantes / no ionizantes",
        definition:
          "Exposición a radiaciones ópticas, electromagnéticas o ionizantes en procesos industriales.",
        source: "Instituto de Salud Pública de Chile",
      },
      {
        id: "polvos-fibras",
        label: "Polvos y fibras (silicosis, neumoconiosis)",
        definition:
          "Inhalación de partículas sólidas o fibras que provocan enfermedades respiratorias crónicas.",
        source: "Instituto de Salud Pública de Chile",
      },
    ],
  },
  {
    id: "ergonomico",
    label: "Ergonómico",
    normativeReference:
      "DS 594, ISO 45001 (6.1.2), guías ACHS e INSST",
    risks: [
      {
        id: "manipulacion-manual-cargas",
        label: "Manipulación manual de cargas",
        definition:
          "Levantamiento, transporte o empuje de cargas que exceden las capacidades físicas recomendadas.",
        source: "Portal INSST",
      },
      {
        id: "posturas-forzadas",
        label: "Posturas forzadas / mantenidas",
        definition:
          "Posiciones incómodas o mantenidas que generan sobrecarga en cuello, espalda o extremidades.",
        source: "ACHS",
      },
      {
        id: "movimientos-repetitivos",
        label: "Movimientos repetitivos",
        definition:
          "Acciones repetidas que generan microtraumas acumulativos y trastornos musculoesqueléticos.",
        source: "ACHS",
      },
      {
        id: "cargas-estaticas",
        label: "Cargas estáticas / trabajo prolongado de pie",
        definition:
          "Permanencia prolongada en posición fija o de pie que provoca fatiga muscular y circulatoria.",
        source: "ACHS",
      },
      {
        id: "diseno-inadecuado-puestos",
        label: "Diseño inadecuado de puestos / herramientas",
        definition:
          "Equipos, herramientas o estaciones de trabajo que no se ajustan a la antropometría del trabajador.",
        source: "ACHS",
      },
    ],
  },
  {
    id: "psicosocial",
    label: "Psicosocial",
    normativeReference:
      "Ley 16.744, DS 67, Protocolo SUSESO/ISTAS21, ISO 45003",
    risks: [
      {
        id: "carga-mental-estres",
        label: "Carga mental / estrés laboral",
        definition:
          "Demandas cognitivas o emocionales que superan la capacidad de afrontamiento del trabajador.",
        source: "Ministerio de Previsión Social",
      },
      {
        id: "turnos-trabajo-nocturno",
        label: "Turnos y trabajo nocturno",
        definition:
          "Organización del tiempo de trabajo que altera el ritmo circadiano y la conciliación social.",
        source: "Ministerio de Previsión Social",
      },
      {
        id: "violencia-laboral-acoso",
        label: "Violencia laboral / acoso",
        definition:
          "Actos de violencia, hostigamiento o acoso que afectan la integridad psicológica o física.",
        source: "Ministerio de Previsión Social",
      },
      {
        id: "carga-trabajo-excesiva",
        label: "Carga de trabajo excesiva / ritmos imposibles",
        definition:
          "Exigencias de producción o ritmos de trabajo incompatibles con tiempos de recuperación.",
        source: "Ministerio de Previsión Social",
      },
      {
        id: "falta-apoyo-organizacion",
        label: "Falta de apoyo / mala organización",
        definition:
          "Deficiencias en la coordinación, apoyo jerárquico o recursos para ejecutar el trabajo.",
        source: "Ministerio de Previsión Social",
      },
    ],
  },
  {
    id: "operacional-critico",
    label: "Operacional o específico del rubro",
    normativeReference:
      "DS 132 (Minería), ISO 45001 (8.1.2), guías Codelco",
    risks: [
      {
        id: "riesgos-geomecanicos",
        label: "Riesgos geomecánicos (derrumbes, caída de rocas)",
        definition:
          "Inestabilidad de taludes o macizos rocosos que provocan derrumbes o caída de rocas.",
        source: "Codelco",
      },
      {
        id: "riesgos-maquinaria-pesada",
        label: "Riesgos en maquinaria pesada (vuelco, fallo hidráulico)",
        definition:
          "Sucesos críticos asociados a operación de maquinaria pesada como volcamientos o fallas severas.",
        source: "Codelco",
      },
      {
        id: "operaciones-energias-peligrosas",
        label: "Operaciones con energías peligrosas",
        definition:
          "Trabajos con altas presiones, vapor, energía hidráulica o arcos eléctricos sin control adecuado.",
        source: "ResearchGate",
      },
      {
        id: "procesos-sustancias-inflamables",
        label: "Procesos con sustancias inflamables / combustibles",
        definition:
          "Manejo de combustibles o sustancias inflamables que pueden generar incendios o explosiones.",
        source: "Portal INSST",
      },
    ],
  },
  {
    id: "otros-complementarios",
    label: "Otros riesgos frecuentes / complementarios",
    normativeReference: "DS 594, DS 132, ISO 45001",
    risks: [
      {
        id: "espacios-confinados",
        label: "Espacios confinados (atmósferas peligrosas / asfixia)",
        definition:
          "Trabajos en espacios confinados con riesgos de deficiencia de oxígeno o presencia de gases tóxicos.",
        source: "Portal INSST",
      },
      {
        id: "exposicion-sustancias-inflamables",
        label: "Exposición a sustancias inflamables / combustibles",
        definition:
          "Manipulación o almacenamiento de sustancias inflamables con potencial de incendio o explosión.",
        source: "Portal INSST",
      },
      {
        id: "contaminacion-ambiental-derrames",
        label: "Contaminación ambiental / derrames",
        definition:
          "Liberación de sustancias peligrosas que generan contaminación ambiental o derrames.",
        source: "Superintendencia del Medio Ambiente / INSST",
      },
    ],
  },
];

export const RISK_FACTOR_LABELS = new Map(
  RISK_FACTOR_CATALOG.map((factor) => [factor.id, factor.label])
);

export const RISK_FACTOR_BY_LABEL = new Map(
  RISK_FACTOR_CATALOG.map((factor) => [factor.label, factor])
);

export const RISK_BY_LABEL = new Map(
  RISK_FACTOR_CATALOG.flatMap((factor) =>
    factor.risks.map((risk) => [risk.label, { ...risk, factorId: factor.id }])
  )
);

export const DEFAULT_FACTOR_FOR_ROW =
  RISK_FACTOR_CATALOG[0]?.label ?? ("" as RiskMatrixRow["factorDeRiesgo"]);

export const DEFAULT_RISK_FOR_ROW =
  RISK_FACTOR_CATALOG[0]?.risks[0]?.label ??
  ("" as RiskMatrixRow["riesgo"]);

export const RISK_OPTIONS_BY_FACTOR_LABEL = new Map(
  RISK_FACTOR_CATALOG.map((factor) => [factor.label, factor.risks])
);

export const ALL_RISK_NAME_LABELS = RISK_FACTOR_CATALOG.flatMap((factor) =>
  factor.risks.map((risk) => risk.label)
);
