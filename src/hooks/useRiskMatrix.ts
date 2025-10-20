import { useCallback, useMemo } from "react";
import { DEFAULT_RISK_EVALUATION_CRITERIA } from "../constants/riskMatrix";
import type {
  RiskClassification,
  RiskClassificationDescriptor,
  RiskMatrixDocument,
  RiskMatrixHeader,
  RiskMatrixRow,
} from "../types/riskMatrix";
import { useCompanySettings } from "./useCompanySettings";
import { useCompanyMembers } from "./useCompanyMembers";

const scoreToClassification = (
  score: number,
  descriptors: RiskClassificationDescriptor[]
): RiskClassification => {
  const descriptor = descriptors.find(
    ({ minScore, maxScore }) => score >= minScore && score <= maxScore
  );
  return descriptor?.classification ?? "Tolerable";
};

const scoreToDescriptor = (
  score: number,
  descriptors: RiskClassificationDescriptor[]
) =>
  descriptors.find(
    ({ minScore, maxScore }) => score >= minScore && score <= maxScore
  ) ?? descriptors[0];

const getProbabilityValue = (level: RiskMatrixRow["probabilidad"]) =>
  DEFAULT_RISK_EVALUATION_CRITERIA.probability.find(
    (opt) => opt.level === level
  )?.value ?? 1;

const getConsequenceValue = (level: RiskMatrixRow["consecuencia"]) =>
  DEFAULT_RISK_EVALUATION_CRITERIA.consequence.find(
    (opt) => opt.level === level
  )?.value ?? 1;

export const useRiskMatrix = () => {
  const { data: settings, loading: settingsLoading } = useCompanySettings();
  const { members, loading: membersLoading } = useCompanyMembers();

  const getScoreDetails = useCallback(
    (
      probabilidad: RiskMatrixRow["probabilidad"],
      consecuencia: RiskMatrixRow["consecuencia"]
    ) => {
      const probValue = getProbabilityValue(probabilidad);
      const consValue = getConsequenceValue(consecuencia);
      const score = probValue * consValue;
      const descriptor = scoreToDescriptor(
        score,
        DEFAULT_RISK_EVALUATION_CRITERIA.classification
      );
      return {
        score,
        classification: descriptor.classification,
        descriptor,
      };
    },
    []
  );

  const companyHeader: RiskMatrixHeader | null = useMemo(() => {
    if (!settings) {
      return null;
    }

    const general = settings.general;
    const representatives = settings.representatives;
    const workforce = settings.workforce;

    return {
      codigoIper: "",
      folioIper: "",
      rutEmpleador: general.rut,
      nombreEmpresa: general.legalName || general.tradeName,
      direccion: `${general.address.street} ${general.address.number}`.trim(),
      comuna: general.address.commune,
      codigoActividadEconomica: general.businessActivity,
      nombreCentroTrabajo: general.tradeName || general.legalName,
      direccionCentroTrabajo:
        `${general.address.street} ${general.address.number}`.trim(),
      jornadaCentroTrabajo: "",
      nTotalTrabajadores: workforce.totalEmployees,
      nTrabajadoras: workforce.femaleEmployees,
      nTrabajadores: workforce.maleEmployees,
      fechaActualizacion: new Date().toISOString(),
      representanteLegal: representatives.legalRepresentative.fullName,
      nombreRevisor: settings.healthAndSafety.hseManagerName,
      nombreAprobador: representatives.legalRepresentative.fullName,
    };
  }, [settings]);

  const buildRiskRow = (row: Partial<RiskMatrixRow>): RiskMatrixRow => {
    const { score, classification } = getScoreDetails(
      row.probabilidad ?? "Baja",
      row.consecuencia ?? "Leve"
    );

    return {
      id: row.id ?? crypto.randomUUID(),
      actividad: row.actividad ?? "",
      tarea: row.tarea ?? "",
      puestoTrabajo: row.puestoTrabajo ?? "",
      lugarEspecifico: row.lugarEspecifico ?? "",
      numeroTrabajadores: row.numeroTrabajadores ?? {
        femenino: 0,
        masculino: 0,
        otros: 0,
      },
      rutina: row.rutina ?? "Rutina",
      peligro: row.peligro ?? "",
      factorDeRiesgo: row.factorDeRiesgo ?? "",
      riesgo: row.riesgo ?? "",
      danoProbable: row.danoProbable ?? "",
      probabilidad: row.probabilidad ?? "Baja",
      consecuencia: row.consecuencia ?? "Leve",
      puntuacion: score,
      clasificacion: classification,
      medidasDeControl: row.medidasDeControl ?? "",
      estaControlado: row.estaControlado ?? false,
      responsable: row.responsable ?? "",
      plazo: row.plazo ?? "",
      controles: row.controles ?? [],
    };
  };

  const createEmptyDocument = (): RiskMatrixDocument => {
    return {
      id: crypto.randomUUID(),
      header: companyHeader ?? {
        codigoIper: "",
        folioIper: "",
        rutEmpleador: "",
        nombreEmpresa: "",
        direccion: "",
        comuna: "",
        codigoActividadEconomica: "",
        nombreCentroTrabajo: "",
        direccionCentroTrabajo: "",
        jornadaCentroTrabajo: "",
        nTotalTrabajadores: 0,
        nTrabajadoras: 0,
        nTrabajadores: 0,
        fechaActualizacion: new Date().toISOString(),
        representanteLegal: "",
        nombreRevisor: "",
        nombreAprobador: "",
      },
      rows: [],
      criterios: DEFAULT_RISK_EVALUATION_CRITERIA.classification,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "",
      updatedBy: "",
      reviewers: members.map((member) => member.displayName),
      linkedMembers: members,
    };
  };

  return {
    loading: settingsLoading || membersLoading,
    header: companyHeader,
    members,
    buildRiskRow,
    createEmptyDocument,
    evaluationCriteria: DEFAULT_RISK_EVALUATION_CRITERIA,
    scoreToClassification,
    getScoreDetails,
  };
};
