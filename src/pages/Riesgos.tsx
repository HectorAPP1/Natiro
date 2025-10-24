import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BookOpen,
  Check,
  Download,
  Edit,
  Info,
  Loader2,
  PartyPopper,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useRiskMatrix } from "../hooks/useRiskMatrix";
import { useAuth } from "../context/AuthContext";
import FullScreenLoader from "../components/FullScreenLoader";
import {
  ALL_RISK_NAME_LABELS,
  RISK_FACTOR_CATALOG,
  RISK_OPTIONS_BY_FACTOR_LABEL,
} from "../constants/riskCatalog";
import {
  useRiskMatrixFirestore,
  createDefaultRiskMatrixDocument,
} from "../hooks/useRiskMatrixFirestore";
import type {
  RiskMatrixRow,
  RiskMatrixHeader,
  RiskClassificationDescriptor,
  RiskEvaluationCriteria,
  RiskClassification,
  RiskConsequenceLevel,
  RiskProbabilityLevel,
  RiskControlStatus,
  RiskControlType,
  RiskMatrixControl,
  RiskMatrixDocument,
  RiskMatrixVersion,
} from "../types/riskMatrix";

const formatDate = (iso: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (iso: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type ControlledFilterValue = "all" | RiskControlStatus;

type FilterState = {
  search: string;
  classification: RiskClassification | "all";
  probability: RiskProbabilityLevel | "all";
  consequence: RiskConsequenceLevel | "all";
  controlled: ControlledFilterValue;
  riskFactor: string | "all";
  riskName: string | "all";
};

const CONTROL_STATUS_OPTIONS: Array<{
  value: RiskControlStatus;
  label: string;
  color: string;
  background: string;
}> = [
  {
    value: "Sin controlar",
    label: "Sin controlar",
    color: "#ef4444",
    background: "rgba(239,68,68,0.12)",
  },
  {
    value: "En proceso",
    label: "En proceso",
    color: "#f59e0b",
    background: "rgba(245,158,11,0.15)",
  },
  {
    value: "Controlado",
    label: "Controlado",
    color: "#22c55e",
    background: "rgba(34,197,94,0.15)",
  },
];

const CONTROL_STATUS_META = CONTROL_STATUS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {} as Record<RiskControlStatus, (typeof CONTROL_STATUS_OPTIONS)[number]>);

type VersionModalState = {
  open: boolean;
  draftComment: string;
  submitting: boolean;
};

const CONTROLLED_OPTIONS: { label: string; value: ControlledFilterValue }[] = [
  { label: "Todos", value: "all" },
  ...CONTROL_STATUS_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
  })),
];

type ControlTypeOption = {
  value: RiskControlType;
  label: string;
  color: string;
};

const CONTROL_TYPE_OPTIONS: ControlTypeOption[] = [
  { value: "Eliminar", label: "Eliminar", color: "#ef4444" },
  { value: "Sustituir", label: "Sustituir", color: "#f97316" },
  { value: "Ingenieril", label: "Ingenieril", color: "#2563eb" },
  { value: "Administrativa", label: "Administrativa", color: "#7c3aed" },
  { value: "EPP", label: "EPP", color: "#0891b2" },
  { value: "Otra", label: "Otra", color: "#6366f1" },
];

const WORKFORCE_LABELS: Record<
  keyof RiskMatrixRow["numeroTrabajadores"],
  string
> = {
  femenino: "Personas mujeres",
  masculino: "Personas hombres",
  otros: "Otras identidades",
};

type ControlModalState = {
  rowId: string;
  actividad: string;
  riesgo: string;
  responsable: string;
  controles: RiskMatrixControl[];
};

const generateControlId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const createEmptyControl = (implementer?: string): RiskMatrixControl => ({
  id: generateControlId(),
  controlDescription: "",
  controlType: CONTROL_TYPE_OPTIONS[0]?.value ?? "Eliminar",
  implementer: implementer ?? "",
  dueDate: "",
  applied: false,
});

const ROWS_PER_PAGE = 15;

const TEXT_FIELD_MAX_LENGTH = 120;
const MAX_CELL_PREVIEW_LENGTH = 25;

const FIELD_LABELS: Record<string, string> = {
  actividad: "Actividad",
  tarea: "Tarea",
  puestoTrabajo: "Puesto de trabajo",
  lugarEspecifico: "Lugar específico",
  peligro: "Peligro",
  factorDeRiesgo: "Peligro / factor de riesgo",
  riesgo: "Riesgo",
  danoProbable: "Daño probable",
  responsable: "Evaluador",
};

type RiskMatrixRowEditorProps = {
  row: RiskMatrixRow;
  descriptors: RiskClassificationDescriptor[];
  probabilityOptions: RiskEvaluationCriteria["probability"];
  consequenceOptions: RiskEvaluationCriteria["consequence"];
  onChange: (id: string, patch: Partial<RiskMatrixRow>) => void;
  factorOptions: string[];
  resolveRiskOptions: (factorLabel: string | null | undefined) => string[];
};

type RiskMatrixEditorModalProps = {
  open: boolean;
  row: RiskMatrixRow | null;
  descriptors: RiskClassificationDescriptor[];
  probabilityOptions: RiskEvaluationCriteria["probability"];
  consequenceOptions: RiskEvaluationCriteria["consequence"];
  onChange: (id: string, patch: Partial<RiskMatrixRow>) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  isNew: boolean;
  factorOptions: string[];
  resolveRiskOptions: (factorLabel: string | null | undefined) => string[];
};

type RiskControlModalProps = {
  open: boolean;
  state: ControlModalState | null;
  onClose: () => void;
  onSave: () => void;
  onAddControl: () => void;
  onControlChange: (
    controlId: string,
    patch: Partial<RiskMatrixControl>
  ) => void;
  onRemoveControl: (controlId: string) => void;
  onToggleApplied: (controlId: string) => void;
  deriveStatus: (controles: RiskMatrixControl[]) => RiskControlStatus;
};

const RiskMatrixRowEditor = ({
  row,
  descriptors,
  probabilityOptions,
  consequenceOptions,
  onChange,
  factorOptions,
  resolveRiskOptions,
}: RiskMatrixRowEditorProps) => {
  const descriptor =
    descriptors.find(
      (item) =>
        row.puntuacion >= item.minScore && row.puntuacion <= item.maxScore
    ) ?? descriptors[0];

  useEffect(() => {
    if (!factorOptions.length) {
      return;
    }

    if (!row.factorDeRiesgo) {
      const firstFactor = factorOptions[0];
      const nextRiskOptions = resolveRiskOptions(firstFactor);
      const firstRisk = nextRiskOptions[0] ?? "";
      onChange(row.id, {
        factorDeRiesgo: firstFactor,
        riesgo: firstRisk,
      });
      return;
    }

    const currentRiskOptions = resolveRiskOptions(row.factorDeRiesgo);
    if (currentRiskOptions.length === 0) {
      return;
    }

    if (!row.riesgo || !currentRiskOptions.includes(row.riesgo)) {
      onChange(row.id, {
        riesgo: currentRiskOptions[0],
      });
    }
  }, [
    factorOptions,
    onChange,
    resolveRiskOptions,
    row.factorDeRiesgo,
    row.id,
    row.riesgo,
  ]);

  const effectiveFactorOptions = useMemo(() => {
    if (!row.factorDeRiesgo || factorOptions.includes(row.factorDeRiesgo)) {
      return factorOptions;
    }
    return [row.factorDeRiesgo, ...factorOptions];
  }, [factorOptions, row.factorDeRiesgo]);

  const resolvedRiskOptions = useMemo(
    () => resolveRiskOptions(row.factorDeRiesgo),
    [resolveRiskOptions, row.factorDeRiesgo]
  );

  const effectiveRiskOptions = useMemo(() => {
    if (!row.riesgo || resolvedRiskOptions.includes(row.riesgo)) {
      return resolvedRiskOptions;
    }
    return [row.riesgo, ...resolvedRiskOptions];
  }, [resolvedRiskOptions, row.riesgo]);

  return (
    <div className="grid gap-4 text-sm">
      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            ✨ Actividad
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Describe la tarea general que evaluas (ej. "Carga de camiones").
          </span>
          <input
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={row.actividad}
            maxLength={TEXT_FIELD_MAX_LENGTH}
            onChange={(event) =>
              onChange(row.id, { actividad: event.target.value })
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            🧩 Tarea
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Detalla la acción puntual que ejecuta el equipo.
          </span>
          <input
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={row.tarea}
            maxLength={TEXT_FIELD_MAX_LENGTH}
            onChange={(event) =>
              onChange(row.id, { tarea: event.target.value })
            }
          />
        </label>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            👷 Puesto de trabajo
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Indica el cargo o rol involucrado.
          </span>
          <input
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={row.puestoTrabajo}
            maxLength={TEXT_FIELD_MAX_LENGTH}
            onChange={(event) =>
              onChange(row.id, { puestoTrabajo: event.target.value })
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            📍 Lugar de trabajo específico
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Señala área o ubicación exacta (planta, patio, etc.).
          </span>
          <input
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={row.lugarEspecifico}
            maxLength={TEXT_FIELD_MAX_LENGTH}
            onChange={(event) =>
              onChange(row.id, { lugarEspecifico: event.target.value })
            }
          />
        </label>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {(["femenino", "masculino", "otros"] as const).map((key) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-slate-500">
              👥 {WORKFORCE_LABELS[key]}
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
              Cantidad expuesta habitual en la actividad.
            </span>
            <input
              type="number"
              min={0}
              className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
              value={row.numeroTrabajadores[key]}
              onChange={(event) =>
                onChange(row.id, {
                  numeroTrabajadores: {
                    ...row.numeroTrabajadores,
                    [key]: Number(event.target.value),
                  },
                })
              }
            />
          </label>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            🔁 Rutina
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            ¿La tarea se realiza frecuentemente o es eventual?
          </span>
          <select
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={row.rutina}
            onChange={(event) =>
              onChange(row.id, {
                rutina: event.target.value as RiskMatrixRow["rutina"],
              })
            }
          >
            <option value="Rutina">Rutina</option>
            <option value="No Rutina">No Rutina</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            ⚠️ Peligro
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Menciona el agente que podría causar daño (ruido, golpes...).
          </span>
          <input
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={row.peligro}
            maxLength={TEXT_FIELD_MAX_LENGTH}
            onChange={(event) =>
              onChange(row.id, { peligro: event.target.value })
            }
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            🧭 Factor de riesgo
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Selecciona el factor normativo según DS 44 / DS 594 / ISO 45001.
          </span>
          <select
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={
              row.factorDeRiesgo &&
              effectiveFactorOptions.includes(row.factorDeRiesgo)
                ? row.factorDeRiesgo
                : effectiveFactorOptions[0] ?? ""
            }
            onChange={(event) => {
              const selectedFactor = event.target.value;
              const nextRiskOptions = resolveRiskOptions(selectedFactor);
              const nextRisk = nextRiskOptions[0] ?? "";
              onChange(row.id, {
                factorDeRiesgo: selectedFactor,
                riesgo: nextRisk,
              });
            }}
          >
            {effectiveFactorOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 md:col-span-3">
          <span className="text-xs font-semibold uppercase text-slate-500">
            🚨 Riesgo
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Selecciona el riesgo específico asociado al factor elegido.
          </span>
          <select
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={
              row.riesgo && effectiveRiskOptions.includes(row.riesgo)
                ? row.riesgo
                : effectiveRiskOptions[0] ?? ""
            }
            onChange={(event) =>
              onChange(row.id, { riesgo: event.target.value })
            }
          >
            {effectiveRiskOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            💥 Daño probable
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Indica el tipo de lesión o impacto que podría ocurrir.
          </span>
          <input
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={row.danoProbable}
            maxLength={TEXT_FIELD_MAX_LENGTH}
            onChange={(event) =>
              onChange(row.id, { danoProbable: event.target.value })
            }
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            🎯 Probabilidad
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Selecciona la frecuencia con la que puede ocurrir el evento.
          </span>
          <select
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={row.probabilidad}
            onChange={(event) =>
              onChange(row.id, {
                probabilidad: event.target
                  .value as RiskMatrixRow["probabilidad"],
              })
            }
          >
            {probabilityOptions.map((option) => (
              <option key={option.level} value={option.level}>
                {option.level} ({option.value})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            📊 Consecuencia
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Define la severidad del daño posible.
          </span>
          <select
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={row.consecuencia}
            onChange={(event) =>
              onChange(row.id, {
                consecuencia: event.target
                  .value as RiskMatrixRow["consecuencia"],
              })
            }
          >
            {consequenceOptions.map((option) => (
              <option key={option.level} value={option.level}>
                {option.level} ({option.value})
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            ✅ Evaluación
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Se calcula automáticamente según probabilidad y consecuencia.
          </span>
          <div
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            style={{
              backgroundColor: `${descriptor.color}20`,
              borderColor: descriptor.color,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">{row.puntuacion}</span>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold uppercase"
                style={{ backgroundColor: descriptor.color, color: "#fff" }}
              >
                {row.clasificacion}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            👤 Evaluador
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Persona encargada de revisar y evaluar este riesgo.
          </span>
          <input
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={row.responsable}
            readOnly
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            📅 Fecha de evaluación
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Indica la fecha en la que se evalúa el riesgo.
          </span>
          <input
            type="date"
            className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
            value={row.plazo}
            onChange={(event) =>
              onChange(row.id, { plazo: event.target.value })
            }
          />
        </label>
      </div>
    </div>
  );
};

const RiskControlModal = ({
  open,
  state,
  onClose,
  onSave,
  onAddControl,
  onControlChange,
  onRemoveControl,
  onToggleApplied,
  deriveStatus,
}: RiskControlModalProps) => {
  if (!open || !state) {
    return null;
  }

  const resolvedStatus = useMemo(
    () => deriveStatus(state.controles),
    [deriveStatus, state.controles]
  );

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center overflow-y-auto bg-slate-900/60 px-4 py-8 backdrop-blur-sm sm:px-6 lg:px-10">
      <div className="relative w-full max-w-4xl sm:max-w-5xl rounded-[32px] border border-white/70 bg-white/95 px-5 py-6 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.6)] dark:border-dracula-current dark:bg-dracula-bg/95 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700 dark:border-dracula-selection dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground"
          aria-label="Cerrar control del riesgo"
        >
          <X className="h-5 w-5" />
        </button>

        <header className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400 dark:text-dracula-cyan">
            Gestión de controles
          </p>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
            {state.actividad || "Actividad sin nombre"}
          </h2>
          {state.riesgo ? (
            <p className="text-sm text-slate-500 dark:text-dracula-comment">
              Riesgo evaluado: {state.riesgo}
            </p>
          ) : null}
        </header>

        <section className="mb-6 space-y-3">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Estado del riesgo
          </p>
          <div className="flex flex-wrap gap-2">
            {CONTROL_STATUS_OPTIONS.map((option) => {
              const isActive = resolvedStatus === option.value;
              return (
                <span
                  key={option.value}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] shadow-sm ${
                    isActive
                      ? "text-white"
                      : "border border-soft-gray-200 text-slate-500"
                  }`}
                  style={
                    isActive
                      ? {
                          background: option.color,
                          borderColor: option.color,
                        }
                      : {
                          background: option.background,
                          borderColor: option.color,
                          color: option.color,
                        }
                  }
                >
                  {option.label}
                </span>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-soft-gray-200/70 bg-white/80 p-4 shadow-sm dark:border-dracula-selection dark:bg-dracula-current/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase text-slate-500">
                Medidas de control
              </span>
              <p className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
                Registra acciones correctivas, su jerarquía y responsables.
              </p>
            </div>
            <button
              type="button"
              onClick={onAddControl}
              className="inline-flex items-center gap-2 rounded-full border border-celeste-200/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-celeste-500 transition hover:border-celeste-300 hover:bg-celeste-50 hover:text-celeste-600 dark:border-dracula-current dark:text-dracula-cyan"
            >
              <Plus className="h-4 w-4" /> Agregar medida
            </button>
          </div>
          {state.controles.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-soft-gray-200 px-4 py-6 text-center text-[12px] text-slate-400 dark:border-dracula-selection dark:text-dracula-comment">
              Aún no se han registrado medidas de control.
            </p>
          ) : (
            <div className="space-y-4">
              {state.controles.map((control) => {
                const typeMeta =
                  CONTROL_TYPE_OPTIONS.find(
                    (option) => option.value === control.controlType
                  ) ?? CONTROL_TYPE_OPTIONS[0];
                return (
                  <div
                    key={control.id}
                    className="space-y-3 rounded-2xl border border-soft-gray-200 px-4 py-4 shadow-sm transition hover:border-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-pressed={control.applied}
                        onClick={() => onToggleApplied(control.id)}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
                          control.applied
                            ? "border-emerald-300 bg-emerald-500 text-white"
                            : "border-soft-gray-300 text-slate-400 hover:border-celeste-300 hover:text-celeste-500"
                        }`}
                      >
                        {control.applied ? <Check className="h-4 w-4" /> : null}
                      </button>
                      <label className="flex w-full flex-col gap-1">
                        <span className="text-xs font-semibold uppercase text-slate-500">
                          Medida preventiva aplicada
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
                          Describe la acción implementada.
                        </span>
                        <textarea
                          rows={2}
                          className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                          value={control.controlDescription}
                          onChange={(event) =>
                            onControlChange(control.id, {
                              controlDescription: event.target.value,
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => onRemoveControl(control.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/70 text-rose-500 transition hover:border-rose-300 hover:text-rose-600 dark:border-dracula-red/40 dark:text-dracula-red"
                        aria-label="Eliminar medida"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase text-slate-500">
                          Tipo de medida
                        </span>
                        <span className="flex items-center gap-2 text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: typeMeta?.color ?? "#94a3b8",
                            }}
                          />
                          Jerarquía aplicada al riesgo.
                        </span>
                        <select
                          className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                          value={control.controlType}
                          onChange={(event) =>
                            onControlChange(control.id, {
                              controlType: event.target
                                .value as RiskControlType,
                            })
                          }
                        >
                          {CONTROL_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase text-slate-500">
                          Fecha aplicada
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
                          Día en que se implementó la medida.
                        </span>
                        <input
                          type="date"
                          className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                          value={control.dueDate}
                          onChange={(event) =>
                            onControlChange(control.id, {
                              dueDate: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase text-slate-500">
                          Responsable
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
                          Persona encargada de ejecutar la medida.
                        </span>
                        <input
                          className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                          value={control.implementer}
                          onChange={(event) =>
                            onControlChange(control.id, {
                              implementer: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-soft-gray-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-celeste-300 hover:text-celeste-600 dark:border-dracula-selection dark:text-dracula-comment"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-5 py-2 text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg dark:from-dracula-purple dark:via-dracula-pink dark:to-dracula-cyan dark:text-dracula-bg"
          >
            Guardar cambios
          </button>
        </footer>
      </div>
    </div>
  );
};

const RiskMatrixEditorModal = ({
  open,
  row,
  descriptors,
  probabilityOptions,
  consequenceOptions,
  onChange,
  onClose,
  onSave,
  onDelete,
  isNew,
  factorOptions,
  resolveRiskOptions,
}: RiskMatrixEditorModalProps) => {
  if (!open || !row) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[140] hidden items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-8 backdrop-blur-sm sm:px-6 lg:flex lg:py-14">
      <div className="relative w-full max-w-5xl rounded-[28px] border border-white/70 bg-white/95 px-5 py-6 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.6)] dark:border-dracula-current dark:bg-dracula-bg/95 sm:px-8 sm:py-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700 dark:border-dracula-selection dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground"
          aria-label="Cerrar editor de riesgo"
        >
          <X className="h-5 w-5" />
        </button>

        <header className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400 dark:text-dracula-cyan">
            {isNew ? "Nuevo registro" : "Editar registro"}
          </p>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
            {row.actividad || "Actividad sin nombre"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-dracula-comment">
            Actualiza los campos de la matriz para mantener trazabilidad y
            control del riesgo.
          </p>
        </header>

        <div className="space-y-6">
          <RiskMatrixRowEditor
            row={row}
            descriptors={descriptors}
            probabilityOptions={probabilityOptions}
            consequenceOptions={consequenceOptions}
            onChange={onChange}
            factorOptions={factorOptions}
            resolveRiskOptions={resolveRiskOptions}
          />
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-end gap-3">
          {!isNew && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-500 transition hover:border-rose-300 hover:text-rose-600 dark:border-dracula-red/40 dark:text-dracula-red dark:hover:border-dracula-red/60"
            >
              Eliminar
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-soft-gray-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700 dark:border-dracula-selection dark:text-dracula-comment dark:hover:border-dracula-cyan/40 dark:hover:text-dracula-cyan"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
          >
            Guardar cambios
          </button>
        </footer>
      </div>
    </div>
  );
};

type RiskCriteriaModalProps = {
  open: boolean;
  onClose: () => void;
  criteria: RiskEvaluationCriteria;
};

const RiskCriteriaModal = ({
  open,
  onClose,
  criteria,
}: RiskCriteriaModalProps) => {
  if (!open) {
    return null;
  }

  const { probability, consequence, classification } = criteria;

  return (
    <div className="fixed inset-0 z-[130] hidden items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-10 backdrop-blur-sm sm:px-6 lg:flex lg:py-16">
      <div className="relative w-full max-w-5xl rounded-[28px] border border-white/70 bg-white/95 px-5 py-6 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.6)] dark:border-dracula-current dark:bg-dracula-bg/95 sm:px-8 sm:py-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700 dark:border-dracula-selection dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground"
          aria-label="Cerrar criterios de evaluación"
        >
          <X className="h-5 w-5" />
        </button>

        <header className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400 dark:text-dracula-cyan">
            Referencia
          </p>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
            Criterios de evaluación de riesgos
          </h2>
          <p className="text-sm text-slate-500 dark:text-dracula-comment">
            Consulta los criterios oficiales de probabilidad, consecuencia y
            clasificación antes de registrar o actualizar riesgos.
          </p>
        </header>

        <div className="grid gap-6">
          <section className="rounded-3xl border border-soft-gray-200/70 bg-white p-6 shadow-sm dark:border-dracula-current/40 dark:bg-dracula-current/30">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
              Criterios de probabilidad
            </h3>
            <div className="mt-4 grid gap-4">
              {probability.map((option) => (
                <div
                  key={option.level}
                  className="rounded-2xl border border-soft-gray-200/70 bg-white/70 p-4 dark:border-dracula-selection/60 dark:bg-dracula-current/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-celeste-100 text-sm font-semibold text-celeste-600">
                      {option.value}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                        {option.level}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-dracula-comment">
                        {option.description}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-celeste-500">
                        {option.normativeBasis}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-soft-gray-200/70 bg-white p-6 shadow-sm dark:border-dracula-current/40 dark:bg-dracula-current/30">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
              Criterios de consecuencia
            </h3>
            <div className="mt-4 grid gap-4">
              {consequence.map((option) => (
                <div
                  key={option.level}
                  className="rounded-2xl border border-soft-gray-200/70 bg-white/70 p-4 dark:border-dracula-selection/60 dark:bg-dracula-current/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-600">
                      {option.value}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                        {option.level}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-dracula-comment">
                        {option.description}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-amber-500">
                        {option.examples}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-soft-gray-200/70 bg-white p-6 shadow-sm dark:border-dracula-current/40 dark:bg-dracula-current/30">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
              Clasificación del riesgo
            </h3>
            <div className="mt-4 grid gap-4">
              {classification.map((descriptor) => (
                <div
                  key={descriptor.classification}
                  className="rounded-2xl border border-soft-gray-200/70 p-4"
                  style={{ backgroundColor: `${descriptor.color}15` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {descriptor.scoreValues.map((value) => (
                        <div
                          key={value}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                          style={{ backgroundColor: descriptor.color }}
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                        {descriptor.classification}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-dracula-comment leading-relaxed">
                        {descriptor.requiredAction}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const Riesgos = () => {
  const {
    header: companyHeader,
    loading: baseLoading,
    buildRiskRow,
    createEmptyDocument,
    evaluationCriteria,
    getScoreDetails,
    members,
  } = useRiskMatrix();
  const {
    data: remoteMatrix,
    loading: remoteLoading,
    error: remoteError,
    save: saveMatrix,
  } = useRiskMatrixFirestore();
  const { user } = useAuth();
  const [rows, setRows] = useState<RiskMatrixRow[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [pendingNewRowId, setPendingNewRowId] = useState<string | null>(null);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [versionModal, setVersionModal] = useState<VersionModalState>({
    open: false,
    draftComment: "",
    submitting: false,
  });
  const [previewModal, setPreviewModal] = useState<{
    fieldKey: string;
    label: string;
    value: string;
  } | null>(null);
  const [controlModalState, setControlModalState] =
    useState<ControlModalState | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    classification: "all",
    probability: "all",
    consequence: "all",
    controlled: "all",
    riskFactor: "all",
    riskName: "all",
  });
  const [header, setHeader] = useState<RiskMatrixHeader | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);

  useEffect(() => {
    if (!remoteMatrix) {
      return;
    }
    setRows(remoteMatrix.rows ?? []);
    setHeader(remoteMatrix.header);
    setSaveError(null);
  }, [remoteMatrix]);

  useEffect(() => {
    if (!remoteMatrix && !remoteLoading) {
      const fallback = createDefaultRiskMatrixDocument();
      setRows([]);
      setHeader(fallback.header);
    }
  }, [createDefaultRiskMatrixDocument, remoteLoading, remoteMatrix]);

  useEffect(() => {
    if (companyHeader && !remoteMatrix) {
      setHeader((prev) => prev ?? companyHeader);
    }
  }, [companyHeader, remoteMatrix]);

  const renderTruncatedText = useCallback<
    (rowId: string, fieldKey: string, rawValue?: string | null) => ReactNode
  >(
    (rowId: string, fieldKey: string, rawValue?: string | null) => {
      if (!rawValue) {
        return "—";
      }

      const value = rawValue.trim();
      if (!value) {
        return "—";
      }

      const words = value.split(/\s+/);
      const wordPreview = words.length > 1 ? words.slice(0, 2).join(" ") : "";
      const charPreview = value.slice(0, MAX_CELL_PREVIEW_LENGTH);
      const previewBase = wordPreview || charPreview;
      const preview = previewBase.trim();
      const needsEllipsis = value.length > preview.length;

      const label = FIELD_LABELS[fieldKey] ?? "Detalle";

      return (
        <div className="flex flex-wrap items-center gap-1">
          <span>{needsEllipsis ? `${preview}…` : preview}</span>
          {needsEllipsis ? (
            <button
              type="button"
              className="text-[10px] font-semibold uppercase tracking-wider text-celeste-500 hover:text-celeste-600"
              onClick={() =>
                setPreviewModal({
                  fieldKey: `${rowId}-${fieldKey}`,
                  label,
                  value,
                })
              }
            >
              Ver más
            </button>
          ) : null}
        </div>
      );
    },
    [setPreviewModal]
  );

  const closePreviewModal = useCallback(() => {
    setPreviewModal(null);
  }, []);

  const responsibleName = useMemo(() => {
    const lowerEmail = user?.email?.toLowerCase() ?? "";
    const member = members.find(
      (candidate) => candidate.email.toLowerCase() === lowerEmail
    );
    return (
      member?.displayName ||
      user?.displayName ||
      user?.email ||
      "Sin responsable"
    );
  }, [members, user?.displayName, user?.email]);

  const isAnyModalOpen = useMemo(
    () =>
      Boolean(editingRowId) ||
      showCriteriaModal ||
      Boolean(previewModal) ||
      Boolean(controlModalState) ||
      versionModal.open,
    [editingRowId, showCriteriaModal, previewModal, controlModalState, versionModal.open]
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (isAnyModalOpen) {
      const { overflow } = document.body.style;
      document.body.dataset.prevOverflow = overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = document.body.dataset.prevOverflow ?? "";
        delete document.body.dataset.prevOverflow;
      };
    }

    return () => {};
  }, [isAnyModalOpen]);

  const matrixDocument = useMemo(() => {
    const base = remoteMatrix ?? createEmptyDocument();
    return {
      ...base,
      header: header ?? base.header,
      rows,
      versions: base.versions ?? [],
      criterios: evaluationCriteria.classification,
    };
  }, [
    createEmptyDocument,
    evaluationCriteria.classification,
    header,
    remoteMatrix,
    rows,
  ]);

  const companyAddressLine = [
    matrixDocument.header?.direccion?.trim(),
    matrixDocument.header?.comuna?.trim(),
    matrixDocument.header?.region?.trim(),
  ]
    .filter((value) => value && value.length > 0)
    .join(", ");

  const fallbackCompanyAddressLine = [
    companyHeader?.direccion?.trim(),
    companyHeader?.comuna?.trim(),
    companyHeader?.region?.trim(),
  ]
    .filter((value) => value && value.length > 0)
    .join(", ");

  const displayedCompanyName =
    matrixDocument.header?.nombreEmpresa ||
    companyHeader?.nombreEmpresa ||
    "Sin razón social";

  const displayedCompanyRut =
    matrixDocument.header?.rutEmpleador ||
    companyHeader?.rutEmpleador ||
    "No registrado";

  const displayedCompanyAddress =
    companyAddressLine || fallbackCompanyAddressLine || "Dirección no registrada";

  const latestVersionNumber = useMemo(() => {
    const versions = matrixDocument.versions ?? [];
    if (versions.length === 0) {
      return 0;
    }
    return versions.reduce((max, version) => Math.max(max, version.versionNumber), 0);
  }, [matrixDocument.versions]);

  const orderedVersions = useMemo(() => {
    return [...(matrixDocument.versions ?? [])]
      .filter((version) => version.versionNumber && version.updatedAt)
      .sort((a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0));
  }, [matrixDocument.versions]);

  const handleOpenVersionModal = useCallback(() => {
    setVersionModal({ open: true, draftComment: "", submitting: false });
  }, []);

  const handleCloseVersionModal = useCallback(() => {
    setVersionModal({ open: false, draftComment: "", submitting: false });
  }, []);

  const resolveCurrentUserInfo = useCallback((): RiskMatrixVersion["updatedBy"] => {
    if (!user) {
      return {
        memberId: null,
        name: "Usuario desconocido",
        position: undefined,
        email: undefined,
      };
    }

    const normalizedEmail = user.email?.toLowerCase() ?? "";
    const member = members.find(
      (candidate) => candidate.email.toLowerCase() === normalizedEmail
    );

    if (!member) {
      return {
        memberId: null,
        name: user.displayName ?? user.email ?? "Usuario desconocido",
        position: undefined,
        email: user.email ?? undefined,
      };
    }

    return {
      memberId: member.id,
      name: member.displayName || normalizedEmail,
      position: member.role,
      email: member.email,
    };
  }, [members, user]);

  const handleSubmitVersion = useCallback(async () => {
    if (!matrixDocument) {
      return;
    }

    setVersionModal((prev) => ({ ...prev, submitting: true }));

    try {
      const nextVersionNumber = latestVersionNumber + 1;
      const updatedAt = new Date().toISOString();
      const updatedBy = resolveCurrentUserInfo();

      const newVersion: RiskMatrixVersion = {
        id: crypto.randomUUID(),
        versionNumber: nextVersionNumber,
        updatedAt,
        updatedBy,
        comment: versionModal.draftComment.trim() || undefined,
      };

      const nextDocument: RiskMatrixDocument = {
        ...matrixDocument,
        versions: [...(matrixDocument.versions ?? []), newVersion],
        header: {
          ...matrixDocument.header,
          fechaActualizacion: updatedAt,
          nombreRevisor: updatedBy.name,
        },
        updatedAt,
        updatedBy: updatedBy.email ?? updatedBy.name,
      };

      await saveMatrix(nextDocument);
      handleCloseVersionModal();
    } catch (error) {
      console.error("Error al registrar versión", error);
      alert("No se pudo registrar la versión. Intenta nuevamente.");
      setVersionModal((prev) => ({ ...prev, submitting: false }));
    }
  }, [
    handleCloseVersionModal,
    latestVersionNumber,
    matrixDocument,
    resolveCurrentUserInfo,
    saveMatrix,
    versionModal.draftComment,
  ]);

  const catalogFactorOptions = useMemo(
    () => RISK_FACTOR_CATALOG.map((factor) => factor.label),
    []
  );

  const catalogRiskOptions = useMemo(
    () => Array.from(new Set(ALL_RISK_NAME_LABELS)),
    []
  );

  const observedFactorLabels = useMemo(() => {
    const registry = new Set<string>();
    rows.forEach((row) => {
      const value = row.factorDeRiesgo?.trim();
      if (value) {
        registry.add(value);
      }
    });
    return Array.from(registry);
  }, [rows]);

  const observedRiskLabels = useMemo(() => {
    const registry = new Set<string>();
    rows.forEach((row) => {
      const value = row.riesgo?.trim();
      if (value) {
        registry.add(value);
      }
    });
    return Array.from(registry);
  }, [rows]);

  const combinedFactorOptions = useMemo(() => {
    const extras = observedFactorLabels.filter(
      (label) => !catalogFactorOptions.includes(label)
    );
    return [...catalogFactorOptions, ...extras];
  }, [catalogFactorOptions, observedFactorLabels]);

  const combinedRiskOptions = useMemo(() => {
    const extras = observedRiskLabels.filter(
      (label) => !catalogRiskOptions.includes(label)
    );
    return [...catalogRiskOptions, ...extras];
  }, [catalogRiskOptions, observedRiskLabels]);

  const resolveRiskOptions = useCallback(
    (factorLabel: string | null | undefined) => {
      if (!factorLabel || factorLabel === "all") {
        return combinedRiskOptions;
      }

      const normalized = factorLabel.trim();
      const catalogMatches =
        RISK_OPTIONS_BY_FACTOR_LABEL.get(normalized)?.map(
          (risk) => risk.label
        ) ?? [];

      const observedMatches = rows
        .map((row) => {
          if (row.factorDeRiesgo?.trim() !== normalized) {
            return "";
          }
          return row.riesgo?.trim() ?? "";
        })
        .filter((value): value is string => value.length > 0);

      const merged = new Set<string>([...catalogMatches, ...observedMatches]);

      if (merged.size === 0) {
        return combinedRiskOptions;
      }

      return Array.from(merged);
    },
    [combinedRiskOptions, rows]
  );

  const factorFilterOptions = useMemo<string[]>(
    () => ["all", ...combinedFactorOptions],
    [combinedFactorOptions]
  );

  const riskFilterOptions = useMemo<string[]>(() => {
    const baseOptions =
      filters.riskFactor !== "all" && filters.riskFactor
        ? resolveRiskOptions(filters.riskFactor)
        : combinedRiskOptions;
    const unique = Array.from(new Set(baseOptions));
    return ["all", ...unique];
  }, [combinedRiskOptions, filters.riskFactor, resolveRiskOptions]);

  const probabilityValueMap = useMemo(() => {
    const map: Record<RiskMatrixRow["probabilidad"], number> = {
      Baja: 1,
      Media: 2,
      Alta: 4,
    };
    evaluationCriteria.probability.forEach((option) => {
      map[option.level] = option.value;
    });
    return map;
  }, [evaluationCriteria.probability]);

  const consequenceValueMap = useMemo(() => {
    const map: Record<RiskMatrixRow["consecuencia"], number> = {
      Leve: 1,
      Moderada: 2,
      Grave: 4,
    };
    evaluationCriteria.consequence.forEach((option) => {
      map[option.level] = option.value;
    });
    return map;
  }, [evaluationCriteria.consequence]);

  const deriveControlStatus = useCallback((controles: RiskMatrixControl[]) => {
    if (!controles || controles.length === 0) {
      return "Sin controlar";
    }
    return controles.every((control) => control.applied)
      ? "Controlado"
      : "En proceso";
  }, []);

  const resolveRowControlStatus = useCallback(
    (row: RiskMatrixRow): RiskControlStatus => {
      const controles = row.controles ?? [];
      if (controles.length > 0) {
        return deriveControlStatus(controles);
      }
      return row.estadoControl ?? "Sin controlar";
    },
    [deriveControlStatus]
  );

  const handleRowChange = useCallback(
    (id: string, patch: Partial<RiskMatrixRow>) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== id) {
            return row;
          }

          const mergedNumeroTrabajadores = patch.numeroTrabajadores
            ? {
                ...row.numeroTrabajadores,
                ...patch.numeroTrabajadores,
              }
            : row.numeroTrabajadores;

          const merged: RiskMatrixRow = {
            ...row,
            ...patch,
            numeroTrabajadores: mergedNumeroTrabajadores,
            responsable: responsibleName,
          };

          const { score, classification } = getScoreDetails(
            merged.probabilidad,
            merged.consecuencia
          );

          return {
            ...merged,
            puntuacion: score,
            clasificacion: classification,
          };
        })
      );
    },
    [getScoreDetails, responsibleName]
  );

  const handleAddRow = () => {
    const newRow = buildRiskRow({ responsable: responsibleName });
    setRows((prev) => {
      const updated = [...prev, newRow];
      setCurrentPage(Math.ceil(updated.length / ROWS_PER_PAGE));
      return updated;
    });
    setEditingRowId(newRow.id);
    setPendingNewRowId(newRow.id);
  };

  const handleEditRow = (rowId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, responsable: responsibleName } : row
      )
    );
    setEditingRowId(rowId);
    setPendingNewRowId(null);
  };

  const handleCancelEdit = () => {
    if (editingRowId && editingRowId === pendingNewRowId) {
      setRows((prev) => prev.filter((row) => row.id !== editingRowId));
    }
    setEditingRowId(null);
    setPendingNewRowId(null);
  };

  const handleSaveRow = () => {
    setEditingRowId(null);
    setPendingNewRowId(null);
  };

  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => {
      const updated = prev.filter((row) => row.id !== rowId);
      const nextTotalPages =
        updated.length > 0 ? Math.ceil(updated.length / ROWS_PER_PAGE) : 1;
      setCurrentPage((prevPage) => Math.min(prevPage, nextTotalPages));
      return updated;
    });
    if (editingRowId === rowId) {
      setEditingRowId(null);
      setPendingNewRowId(null);
    }
  };

  const openControlModal = useCallback((row: RiskMatrixRow) => {
    const controles = (row.controles ?? []).map((control) => ({ ...control }));
    setControlModalState({
      rowId: row.id,
      actividad: row.actividad,
      riesgo: row.riesgo,
      responsable: row.responsable,
      controles,
    });
  }, []);

  const closeControlModal = useCallback(() => {
    setControlModalState(null);
  }, []);

  const addControlToModal = useCallback(() => {
    setControlModalState((prev) => {
      if (!prev) {
        return prev;
      }
      const defaultImplementer = prev.responsable || responsibleName;
      const updatedControls = [
        ...prev.controles,
        createEmptyControl(defaultImplementer),
      ];
      return {
        ...prev,
        controles: updatedControls,
      };
    });
  }, [responsibleName]);

  const updateControlInModal = useCallback(
    (controlId: string, patch: Partial<RiskMatrixControl>) => {
      setControlModalState((prev) => {
        if (!prev) {
          return prev;
        }
        const updatedControls = prev.controles.map((control) =>
          control.id === controlId ? { ...control, ...patch } : control
        );
        return {
          ...prev,
          controles: updatedControls,
        };
      });
    },
    []
  );

  const removeControlFromModal = useCallback((controlId: string) => {
    setControlModalState((prev) => {
      if (!prev) {
        return prev;
      }
      const updatedControls = prev.controles.filter(
        (control) => control.id !== controlId
      );
      return {
        ...prev,
        controles: updatedControls,
      };
    });
  }, []);

  const toggleControlAppliedInModal = useCallback((controlId: string) => {
    setControlModalState((prev) => {
      if (!prev) {
        return prev;
      }
      const updatedControls = prev.controles.map((control) =>
        control.id === controlId
          ? { ...control, applied: !control.applied }
          : control
      );
      return {
        ...prev,
        controles: updatedControls,
      };
    });
  }, []);

  const handleSaveControlModal = useCallback(() => {
    setControlModalState((current) => {
      if (!current) {
        return current;
      }
      const finalStatus = deriveControlStatus(current.controles);
      setRows((prevRows) =>
        prevRows.map((row) =>
          row.id === current.rowId
            ? {
                ...row,
                estadoControl: finalStatus,
                controles: current.controles,
              }
            : row
        )
      );
      return null;
    });
  }, [deriveControlStatus]);

  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
      setCurrentPage(1);
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      classification: "all",
      probability: "all",
      consequence: "all",
      controlled: "all",
      riskFactor: "all",
      riskName: "all",
    });
    setCurrentPage(1);
  }, []);

  const handleExportMatrix = useCallback(() => {
    const workbook = XLSX.utils.book_new();

    const latestVersionEntry = orderedVersions[0];
    const latestVersionMetadata = latestVersionEntry
      ? {
          number: latestVersionEntry.versionNumber,
          date: formatDateTime(latestVersionEntry.updatedAt),
          responsible:
            latestVersionEntry.updatedBy?.position
              ? `${latestVersionEntry.updatedBy.name} • ${latestVersionEntry.updatedBy.position}`
              : latestVersionEntry.updatedBy?.name ?? "",
          comment: latestVersionEntry.comment ?? "",
        }
      : {
          number: latestVersionNumber,
          date: formatDateTime(matrixDocument.header.fechaActualizacion),
          responsible: matrixDocument.header.nombreRevisor ?? "",
          comment: "",
        };

    const summaryInfo = [
      ["Empresa", displayedCompanyName],
      ["RUT", displayedCompanyRut === "No registrado" ? "" : displayedCompanyRut],
      ["Dirección", displayedCompanyAddress],
      ["Centro de trabajo", matrixDocument.header.nombreCentroTrabajo || ""],
      ["Dirección centro", matrixDocument.header.direccionCentroTrabajo || ""],
      [
        "Fecha de actualización",
        formatDate(matrixDocument.header.fechaActualizacion || ""),
      ],
      ["Revisor", matrixDocument.header.nombreRevisor || ""],
      [
        "Versión actual",
        latestVersionMetadata.number > 0
          ? `Versión ${latestVersionMetadata.number}`
          : "Sin versiones registradas",
      ],
      ["Detalle última actualización", latestVersionMetadata.date || ""],
      ["Responsable", latestVersionMetadata.responsible || ""],
      ["Comentario", latestVersionMetadata.comment || ""],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryInfo);

    const headerInfo = [
      [
        "#",
        "Actividad",
        "Tarea",
        "Puesto",
        "Lugar específico",
        "Personas mujeres",
        "Personas hombres",
        "Otras identidades",
        "Rutina",
        "Peligro / factor",
        "Factor de riesgo",
        "Riesgo",
        "Daño probable",
        "Probabilidad",
        "Consecuencia",
        "Puntaje",
        "Clasificación",
        "Estado",
        "Evaluador",
        "Fecha de evaluación",
        "Medidas gestión de control",
      ],
    ];

    const tableRows = rows.map((row, index) => {
      const exportStatus = resolveRowControlStatus(row);
      const controlsSummary = (row.controles ?? [])
        .map((control, controlIndex) => {
          const due = control.dueDate ? formatDate(control.dueDate) : "Sin fecha";
          const applied = control.applied ? "Aplicada" : "Pendiente";
          const implementer = control.implementer?.trim()
            ? `Responsable: ${control.implementer}`
            : "Responsable: No asignado";
          const description = control.controlDescription?.trim()
            ? control.controlDescription
            : `Control ${controlIndex + 1}`;
          return `${description} (${control.controlType}) • ${implementer} • Vence: ${due} • Estado: ${applied}`;
        })
        .join("\n");

      return [
        index + 1,
        row.actividad,
        row.tarea,
        row.puestoTrabajo,
        row.lugarEspecifico,
        row.numeroTrabajadores.femenino,
        row.numeroTrabajadores.masculino,
        row.numeroTrabajadores.otros,
        row.rutina,
        row.peligro,
        row.factorDeRiesgo,
        row.riesgo,
        row.danoProbable,
        row.probabilidad,
        row.consecuencia,
        row.puntuacion,
        row.clasificacion,
        exportStatus,
        row.responsable,
        row.plazo ? formatDate(row.plazo) : "",
        controlsSummary,
      ];
    });

    const matrixSheet = XLSX.utils.aoa_to_sheet([...headerInfo, ...tableRows]);

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: "FF15803D" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "FF0F172A" } },
        bottom: { style: "thin", color: { rgb: "FF0F172A" } },
        left: { style: "thin", color: { rgb: "FF0F172A" } },
        right: { style: "thin", color: { rgb: "FF0F172A" } },
      },
    } as const;

    const baseDataStyle = {
      font: { color: { rgb: "FF1F2937" } },
      alignment: { vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { rgb: "FFE2E8F0" } },
        left: { style: "thin", color: { rgb: "FFE2E8F0" } },
        right: { style: "thin", color: { rgb: "FFE2E8F0" } },
      },
    } as const;

    const headerRowLength = headerInfo[0]?.length ?? 0;

    for (let columnIndex = 0; columnIndex < headerRowLength; columnIndex += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: columnIndex });
      const cell = matrixSheet[cellAddress];
      if (cell) {
        cell.s = headerStyle;
      }
    }

    const totalRows = headerInfo.length + tableRows.length;
    for (let rowIndex = 1; rowIndex < totalRows; rowIndex += 1) {
      const isStriped = rowIndex % 2 === 0;
      const fillColor = isStriped ? "FFE6F4EA" : "FFFFFFFF";

      for (let columnIndex = 0; columnIndex < headerRowLength; columnIndex += 1) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        let cell = matrixSheet[cellAddress];
        if (!cell) {
          cell = { t: "s", v: "" };
          matrixSheet[cellAddress] = cell;
        }
        cell.s = {
          ...baseDataStyle,
          fill: { patternType: "solid", fgColor: { rgb: fillColor } },
        };
      }
    }

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen empresa");
    XLSX.utils.book_append_sheet(workbook, matrixSheet, "Matriz de riesgos");

    const companySlug = (matrixDocument.header.nombreEmpresa || "matriz")
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "_");

    XLSX.writeFile(workbook, `matriz-riesgos-${companySlug}.xlsx`);
  }, [matrixDocument.header, rows, resolveRowControlStatus]);

  const filtersActive = useMemo(() => {
    return (
      filters.search.trim().length > 0 ||
      filters.classification !== "all" ||
      filters.probability !== "all" ||
      filters.consequence !== "all" ||
      filters.controlled !== "all" ||
      filters.riskFactor !== "all" ||
      filters.riskName !== "all"
    );
  }, [filters]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();

    return rows.filter((row) => {
      const rowStatus = resolveRowControlStatus(row);

      if (normalizedSearch.length > 0) {
        const haystack = [
          row.actividad,
          row.tarea,
          row.puestoTrabajo,
          row.lugarEspecifico,
          row.peligro,
          row.factorDeRiesgo,
          row.riesgo,
          row.danoProbable,
          row.responsable,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      if (
        filters.riskFactor !== "all" &&
        row.factorDeRiesgo.trim() !== filters.riskFactor
      ) {
        return false;
      }

      if (
        filters.riskName !== "all" &&
        row.riesgo.trim() !== filters.riskName
      ) {
        return false;
      }

      if (
        filters.classification !== "all" &&
        row.clasificacion !== filters.classification
      ) {
        return false;
      }

      if (
        filters.probability !== "all" &&
        row.probabilidad !== filters.probability
      ) {
        return false;
      }

      if (
        filters.consequence !== "all" &&
        row.consecuencia !== filters.consequence
      ) {
        return false;
      }

      if (filters.controlled !== "all" && rowStatus !== filters.controlled) {
        return false;
      }

      return true;
    });
  }, [filters, resolveRowControlStatus, rows]);

  const totalPages =
    filteredRows.length > 0
      ? Math.ceil(filteredRows.length / ROWS_PER_PAGE)
      : 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
    if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const loading = baseLoading || remoteLoading;

  const hasUnsavedChanges = useMemo(() => {
    if (!remoteMatrix) {
      return rows.length > 0;
    }
    const remoteRowsJSON = JSON.stringify(remoteMatrix.rows ?? []);
    const localRowsJSON = JSON.stringify(rows ?? []);
    const headerChanged =
      JSON.stringify(remoteMatrix.header ?? {}) !==
      JSON.stringify(header ?? {});
    return remoteRowsJSON !== localRowsJSON || headerChanged;
  }, [header, remoteMatrix, rows]);

  const handleSaveMatrix = useCallback(async () => {
    if (!matrixDocument) {
      return;
    }
    console.log("handleSaveMatrix: preparando guardado", matrixDocument);
    setSaving(true);
    setSaveError(null);
    try {
      const nextDocument = {
        ...matrixDocument,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid ?? user?.email ?? "",
      } satisfies RiskMatrixDocument;

      await saveMatrix(nextDocument);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 6500);
    } catch (error) {
      console.error("Error al guardar matriz", error);
      setSaveError("No se pudo guardar la matriz. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }, [matrixDocument, saveMatrix, user?.email, user?.uid]);

  if (loading) {
    return (
      <FullScreenLoader
        message="Cargando matriz de riesgos..."
        textClassName="text-slate-600 dark:text-dracula-comment"
      />
    );
  }

  const editingRow = editingRowId
    ? rows.find((row) => row.id === editingRowId)
    : null;

  const startIndex =
    filteredRows.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedRows = filteredRows.slice(
    startIndex,
    startIndex + ROWS_PER_PAGE
  );
  const pageStartNumber = filteredRows.length === 0 ? 0 : startIndex + 1;
  const pageEndNumber =
    filteredRows.length === 0 ? 0 : startIndex + paginatedRows.length;

  return (
    <div className="space-y-8">
      {/* ===== INICIO DEL LAYOUT PARA ESCRITORIO ===== */}
      <div className="hidden flex-col gap-8 lg:flex">
        <header className="rounded-4xl border border-white/70 bg-white/95 p-4 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/95 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
                Matrices elaboradas bajo el modelo de la guía del ISP 2025, para
                dar cumplimiento al DS44
              </p>
              <h1 className="mt-2 text-xl font-semibold text-slate-800 dark:text-dracula-foreground sm:text-2xl">
                Matriz de identificación de peligros y evaluación de riesgos
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-dracula-comment">
                Identifica actividades críticas, evalúa su probabilidad y
                consecuencia, y documenta las medidas de control para mantener
                la trazabilidad de la gestión de riesgos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
              <button
                className="inline-flex items-center gap-1.5 rounded-full border border-celeste-200/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-celeste-300 hover:bg-celeste-50 hover:text-celeste-600 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-cyan dark:hover:border-dracula-purple dark:hover:bg-dracula-bg sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
                onClick={() => setShowCriteriaModal(true)}
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Ver criterios</span>
                <span className="sm:hidden">Criterios</span>
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-full border border-soft-gray-200/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-celeste-300 hover:bg-celeste-50 hover:text-celeste-600 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:bg-dracula-bg sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm">
                <Edit className="h-4 w-4" />
                Editar cabecera
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-md transition hover:shadow-lg dark:from-dracula-purple dark:via-dracula-pink dark:to-dracula-cyan dark:text-dracula-bg sm:gap-2 sm:px-6 sm:py-3 sm:text-sm"
                onClick={handleExportMatrix}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar matriz</span>
                <span className="sm:hidden">Exportar</span>
              </button>
            </div>
          </div>

          {remoteError ? (
            <div className="mt-4 rounded-3xl border border-rose-200/70 bg-rose-50/80 p-4 text-sm font-medium text-rose-600 dark:border-dracula-red/40 dark:bg-dracula-red/20 dark:text-dracula-red">
              {remoteError}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-mint-200/70 bg-mint-50/70 p-4 shadow-sm transition hover:border-mint-300 hover:bg-mint-100/70 hover:shadow-lg dark:border-dracula-green/30 dark:bg-dracula-current dark:hover:border-dracula-green/50 dark:hover:bg-dracula-green/10 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-mint-400 dark:text-dracula-green">
                Empresa
              </p>
              <p className="mt-2 text-base font-semibold text-slate-800 dark:text-dracula-foreground">
                {displayedCompanyName}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                {displayedCompanyRut === "No registrado"
                  ? "RUT no registrado"
                  : `RUT ${displayedCompanyRut}`}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                📍 {displayedCompanyAddress}
              </p>
            </div>
            <div className="rounded-3xl border border-celeste-200/70 bg-celeste-50/70 p-4 shadow-sm transition hover:border-celeste-300 hover:bg-celeste-100/70 hover:shadow-lg dark:border-dracula-cyan/40 dark:bg-dracula-current dark:hover:border-dracula-cyan/60 dark:hover:bg-dracula-cyan/10 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-celeste-500 dark:text-dracula-cyan">
                Centro de trabajo
              </p>
              <p className="mt-2 text-base font-semibold text-slate-800 dark:text-dracula-foreground">
                {matrixDocument.header.nombreCentroTrabajo}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                {matrixDocument.header.direccionCentroTrabajo}
              </p>
            </div>
            <div className="rounded-3xl border border-purple-200/70 bg-purple-50/60 p-4 shadow-sm transition hover:border-purple-300 hover:bg-purple-100/70 hover:shadow-lg dark:border-dracula-purple/40 dark:bg-dracula-current dark:hover:border-dracula-purple/60 dark:hover:bg-dracula-purple/10 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-purple-400 dark:text-dracula-purple">
                    Versionado matriz
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-800 dark:text-dracula-foreground">
                    {latestVersionNumber > 0
                      ? `Versión ${latestVersionNumber}`
                      : "Sin versiones"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                    Actualizada el {formatDate(matrixDocument.header.fechaActualizacion)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                    Revisor: {matrixDocument.header.nombreRevisor || "No registrado"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenVersionModal}
                  className="inline-flex items-center gap-1.5 rounded-full border border-purple-300/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-purple-500 transition hover:border-purple-400 hover:bg-purple-50/70 dark:border-dracula-purple/40 dark:text-dracula-purple dark:hover:border-dracula-purple/60 dark:hover:bg-dracula-purple/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo
                </button>
              </div>
              {orderedVersions.length > 0 ? (
                <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-dracula-comment">
                  {orderedVersions.slice(0, 3).map((version) => (
                    <li
                      key={version.id}
                      className="rounded-2xl border border-purple-100/70 bg-purple-50/50 px-3 py-2 dark:border-dracula-purple/30 dark:bg-dracula-purple/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-700 dark:text-dracula-foreground">
                          Versión {version.versionNumber}
                        </span>
                        <span>{formatDate(version.updatedAt)}</span>
                      </div>
                      <p className="mt-1">{version.comment || "Sin comentario"}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.2em]">
                        {version.updatedBy?.name ?? "Usuario desconocido"}
                        {version.updatedBy?.position
                          ? ` • ${version.updatedBy.position}`
                          : ""}
                      </p>
                    </li>
                  ))}
                  {orderedVersions.length > 3 ? (
                    <li className="pt-1 text-[11px] uppercase tracking-[0.2em] text-purple-400">
                      + {orderedVersions.length - 3} registros
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-3 rounded-2xl border border-dashed border-purple-200/70 bg-white/60 p-3 text-xs text-slate-400 dark:border-dracula-purple/40 dark:bg-dracula-current/20 dark:text-dracula-comment">
                  Aún no registras versiones de la matriz. Haz clic en "Nuevo" para crear el primer registro.
                </p>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 space-y-8">
          <section className="rounded-4xl border border-white/70 bg-white/95 p-4 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/90 sm:p-6 lg:p-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                Listado de riesgos
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {hasUnsavedChanges ? (
                  <>
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600 dark:border-dracula-orange/50 dark:bg-dracula-orange/10 dark:text-dracula-orange">
                      <Info className="h-3.5 w-3.5" />
                      Cambios sin guardar
                    </div>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg ring-2 ring-slate-900/30 ring-offset-2 ring-offset-white transition sm:gap-2 sm:px-6 sm:py-3 sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed animate-pulse dark:bg-gradient-to-r dark:from-[#a855f7] dark:via-[#ec4899] dark:to-[#38bdf8] dark:text-slate-900 dark:ring-dracula-cyan/60 dark:ring-offset-dracula-bg"
                      onClick={handleSaveMatrix}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                  </>
                ) : null}
                <button
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-md transition hover:shadow-lg dark:from-dracula-purple dark:via-dracula-pink dark:to-dracula-cyan dark:text-dracula-bg sm:gap-2 sm:px-6 sm:py-3 sm:text-sm"
                  onClick={handleAddRow}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Agregar fila</span>
                  <span className="sm:hidden">Agregar</span>
                </button>
              </div>
            </div>
            <div className="mb-6 space-y-3 rounded-3xl border border-soft-gray-200/70 bg-white/80 p-4 text-xs shadow-sm dark:border-dracula-selection dark:bg-dracula-current/30">
              <div className="scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600 dark:scrollbar-track-slate-800 dark:hover:scrollbar-thumb-slate-500 flex flex-nowrap items-end gap-3 overflow-x-auto pb-1">
                <label className="flex min-w-[220px] flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment">
                    Buscar
                  </span>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(event) =>
                      updateFilter("search", event.target.value)
                    }
                    placeholder="Actividad, riesgo, responsable..."
                    className="rounded-2xl border border-soft-gray-200 px-3 py-2 text-sm text-slate-600 placeholder-slate-400 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                  />
                </label>

                <label className="flex min-w-[180px] flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment">
                    Clasificación
                  </span>
                  <select
                    value={filters.classification}
                    onChange={(event) =>
                      updateFilter(
                        "classification",
                        event.target.value === "all"
                          ? "all"
                          : (event.target.value as RiskClassification | "all")
                      )
                    }
                    className="rounded-2xl border border-soft-gray-200 px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                  >
                    <option value="all">Todas</option>
                    {evaluationCriteria.classification.map((descriptor) => (
                      <option
                        key={descriptor.classification}
                        value={descriptor.classification}
                      >
                        {descriptor.classification}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-w-[180px] flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment">
                    Probabilidad
                  </span>
                  <select
                    value={filters.probability}
                    onChange={(event) =>
                      updateFilter(
                        "probability",
                        event.target.value === "all"
                          ? "all"
                          : (event.target.value as RiskProbabilityLevel | "all")
                      )
                    }
                    className="rounded-2xl border border-soft-gray-200 px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                  >
                    <option value="all">Todas</option>
                    {evaluationCriteria.probability.map((option) => (
                      <option key={option.level} value={option.level}>
                        {option.level} ({option.value})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-w-[180px] flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment">
                    Consecuencia
                  </span>
                  <select
                    value={filters.consequence}
                    onChange={(event) =>
                      updateFilter(
                        "consequence",
                        event.target.value === "all"
                          ? "all"
                          : (event.target.value as RiskConsequenceLevel | "all")
                      )
                    }
                    className="rounded-2xl border border-soft-gray-200 px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                  >
                    <option value="all">Todas</option>
                    {evaluationCriteria.consequence.map((option) => (
                      <option key={option.level} value={option.level}>
                        {option.level} ({option.value})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-w-[200px] flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment">
                    Factor de riesgo
                  </span>
                  <select
                    value={filters.riskFactor}
                    onChange={(event) =>
                      updateFilter(
                        "riskFactor",
                        event.target.value === "all"
                          ? "all"
                          : event.target.value
                      )
                    }
                    className="rounded-2xl border border-soft-gray-200 px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                  >
                    <option value="all">Todos</option>
                    {factorFilterOptions.slice(1).map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-[200px] flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment">
                    Riesgo
                  </span>
                  <select
                    value={filters.riskName}
                    onChange={(event) =>
                      updateFilter(
                        "riskName",
                        event.target.value === "all"
                          ? "all"
                          : event.target.value
                      )
                    }
                    className="rounded-2xl border border-soft-gray-200 px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                  >
                    <option value="all">Todos</option>
                    {riskFilterOptions.slice(1).map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-w-[160px] flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment">
                    Estado
                  </span>
                  <select
                    value={filters.controlled}
                    onChange={(event) =>
                      updateFilter(
                        "controlled",
                        event.target.value as ControlledFilterValue
                      )
                    }
                    className="rounded-2xl border border-soft-gray-200 px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                  >
                    {CONTROLLED_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex min-w-[150px] items-center justify-center gap-1 rounded-full border border-celeste-200/70 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-celeste-500 transition hover:border-celeste-300 hover:bg-celeste-50 hover:text-celeste-600 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-cyan"
                  disabled={!filtersActive}
                >
                  Limpiar filtros
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-dracula-comment">
                <span>Coincidencias: {filteredRows.length}</span>
                {saveError ? (
                  <span className="text-xs font-semibold text-rose-500">
                    {saveError}
                  </span>
                ) : hasUnsavedChanges ? (
                  <span className="text-xs font-medium text-celeste-500">
                    Cambios sin guardar
                  </span>
                ) : null}
              </div>
            </div>

            <div className="scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600 dark:scrollbar-track-slate-800 dark:hover:scrollbar-thumb-slate-500 w-full max-h-[520px] overflow-y-auto overflow-x-auto">
              <table className="w-full min-w-[1280px] table-auto divide-y divide-soft-gray-200 text-sm dark:divide-dracula-selection">
                <thead className="sticky top-0 z-10 bg-soft-gray-100 text-xs font-semibold uppercase text-slate-500 dark:bg-dracula-current/80 dark:text-dracula-comment">
                  <tr>
                    <th className="w-12 px-3 py-3 text-center whitespace-nowrap"></th>
                    <th className="min-w-[200px] px-4 py-3 text-left whitespace-nowrap">
                      Actividad
                    </th>
                    <th className="min-w-[200px] px-4 py-3 text-left whitespace-nowrap">
                      Tarea
                    </th>
                    <th className="min-w-[180px] px-4 py-3 text-left whitespace-nowrap">
                      Puesto
                    </th>
                    <th className="min-w-[200px] px-4 py-3 text-left whitespace-nowrap">
                      Lugar específico
                    </th>
                    <th className="w-14 px-3 py-3 text-center">Mujeres</th>
                    <th className="w-14 px-3 py-3 text-center">Hombres</th>
                    <th className="w-16 px-3 py-3 text-center">
                      Otras identidades
                    </th>
                    <th className="w-24 px-3 py-3 text-center whitespace-nowrap">
                      Rutina
                    </th>
                    <th className="min-w-[160px] px-4 py-3 text-left whitespace-nowrap">
                      Peligro
                    </th>
                    <th className="min-w-[160px] px-4 py-3 text-left whitespace-nowrap">
                      Factor de riesgo
                    </th>
                    <th className="min-w-[160px] px-4 py-3 text-left whitespace-nowrap">
                      Riesgo
                    </th>
                    <th className="min-w-[160px] px-4 py-3 text-left whitespace-nowrap">
                      Daño probable
                    </th>
                    <th className="w-16 px-3 py-3 text-center whitespace-nowrap">
                      Prob.
                    </th>
                    <th className="w-16 px-3 py-3 text-center whitespace-nowrap">
                      Cons.
                    </th>
                    <th className="w-16 px-3 py-3 text-center whitespace-nowrap">
                      Puntaje
                    </th>
                    <th className="w-32 px-4 py-3 text-center whitespace-nowrap">
                      Clasificación
                    </th>
                    <th className="min-w-[180px] px-4 py-3 text-left">
                      Evaluador
                    </th>
                    <th className="w-40 px-4 py-3 text-center">
                      Fecha de evaluación
                    </th>
                    <th className="w-24 px-3 py-3 text-center">Estado</th>
                    <th className="w-28 px-3 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft-gray-100 text-slate-600 dark:divide-dracula-selection dark:text-dracula-foreground">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={20}
                        className="px-4 py-6 text-center text-sm text-slate-400 dark:text-dracula-comment"
                      >
                        {rows.length === 0
                          ? "No hay registros. Usa “Agregar fila” para comenzar."
                          : filtersActive
                          ? "No hay registros que coincidan con los filtros actuales."
                          : "No hay registros en esta página."}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, index) => {
                      const { descriptor } = getScoreDetails(
                        row.probabilidad,
                        row.consecuencia
                      );
                      const rowStatus = resolveRowControlStatus(row);
                      const statusMeta =
                        CONTROL_STATUS_META[rowStatus] ??
                        CONTROL_STATUS_OPTIONS[0];
                      const controlsCount = row.controles?.length ?? 0;
                      return (
                        <tr
                          key={row.id}
                          className={
                            editingRowId === row.id
                              ? "bg-celeste-50/50 dark:bg-dracula-current/30"
                              : ""
                          }
                        >
                          <td className="w-12 px-3 py-3 text-center text-sm font-semibold text-slate-500 dark:text-dracula-comment align-top whitespace-nowrap">
                            {startIndex + index + 1}
                          </td>
                          <td className="px-4 py-3 align-top whitespace-normal break-words">
                            {renderTruncatedText(
                              row.id,
                              "actividad",
                              row.actividad
                            )}
                          </td>
                          <td className="px-4 py-3 align-top whitespace-normal break-words">
                            {renderTruncatedText(row.id, "tarea", row.tarea)}
                          </td>
                          <td className="px-4 py-3 align-top whitespace-normal break-words">
                            {renderTruncatedText(
                              row.id,
                              "puestoTrabajo",
                              row.puestoTrabajo
                            )}
                          </td>
                          <td className="px-4 py-3 align-top whitespace-normal break-words">
                            {renderTruncatedText(
                              row.id,
                              "lugarEspecifico",
                              row.lugarEspecifico
                            )}
                          </td>
                          <td className="w-14 px-3 py-3 text-center align-top whitespace-nowrap">
                            {row.numeroTrabajadores.femenino}
                          </td>
                          <td className="w-14 px-3 py-3 text-center align-top whitespace-nowrap">
                            {row.numeroTrabajadores.masculino}
                          </td>
                          <td className="w-16 px-3 py-3 text-center align-top whitespace-nowrap">
                            {row.numeroTrabajadores.otros}
                          </td>
                          <td className="w-24 px-3 py-3 text-center align-top whitespace-nowrap">
                            {row.rutina}
                          </td>
                          <td className="px-4 py-3 align-top whitespace-normal break-words">
                            {renderTruncatedText(
                              row.id,
                              "peligro",
                              row.peligro
                            )}
                          </td>
                          <td className="px-4 py-3 align-top whitespace-normal break-words">
                            {renderTruncatedText(
                              row.id,
                              "factorDeRiesgo",
                              row.factorDeRiesgo
                            )}
                          </td>
                          <td className="px-4 py-3 align-top whitespace-normal break-words">
                            {renderTruncatedText(row.id, "riesgo", row.riesgo)}
                          </td>
                          <td className="px-4 py-3 align-top whitespace-normal break-words">
                            {renderTruncatedText(
                              row.id,
                              "danoProbable",
                              row.danoProbable
                            )}
                          </td>
                          <td className="w-16 px-3 py-3 text-center align-top whitespace-nowrap">
                            {probabilityValueMap[row.probabilidad]}
                          </td>
                          <td className="w-16 px-3 py-3 text-center align-top whitespace-nowrap">
                            {consequenceValueMap[row.consecuencia]}
                          </td>
                          <td className="w-16 px-3 py-3 text-center align-top whitespace-nowrap">
                            {row.puntuacion}
                          </td>
                          <td className="w-32 px-4 py-3 text-center align-top whitespace-nowrap">
                            <span
                              className="rounded-full px-3 py-1 text-xs font-semibold uppercase text-white"
                              style={{ backgroundColor: descriptor.color }}
                            >
                              {descriptor.classification}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top whitespace-normal break-words">
                            {renderTruncatedText(
                              row.id,
                              "responsable",
                              row.responsable
                            )}
                          </td>
                          <td className="w-40 px-4 py-3 text-center align-top whitespace-nowrap">
                            {row.plazo ? formatDate(row.plazo) : "—"}
                          </td>
                          <td className="w-32 px-3 py-3 text-center align-top whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openControlModal(row)}
                                className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] transition focus:outline-none focus:ring-2 focus:ring-celeste-300"
                                style={{
                                  backgroundColor: statusMeta.background,
                                  borderColor: statusMeta.color,
                                  color: statusMeta.color,
                                }}
                              >
                                {statusMeta.label}
                              </button>
                              <span className="text-[10px] font-medium text-slate-400 dark:text-dracula-comment">
                                {controlsCount === 1
                                  ? "1 medida"
                                  : `${controlsCount} medidas`}
                              </span>
                            </div>
                          </td>
                          <td className="w-28 px-3 py-3 text-center align-top whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-celeste-200/70 bg-white/80 text-celeste-500 shadow-sm transition hover:border-celeste-300 hover:bg-celeste-50 hover:text-celeste-600 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-cyan"
                                onClick={() => handleEditRow(row.id)}
                                aria-label="Editar registro"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {pendingNewRowId !== row.id ? (
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/70 bg-white/80 text-rose-500 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-dracula-red/50 dark:bg-dracula-current dark:text-dracula-red"
                                  onClick={() => handleDeleteRow(row.id)}
                                  aria-label="Eliminar registro"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {rows.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-500 dark:text-dracula-comment">
                  Mostrando {pageStartNumber}-{pageEndNumber} de{" "}
                  {filteredRows.length} registros
                </p>
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage <= 1}
                    className="inline-flex items-center gap-1 rounded-full border border-soft-gray-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-celeste-300 hover:text-celeste-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dracula-selection dark:text-dracula-comment"
                  >
                    Anterior
                  </button>
                  <span className="text-xs font-semibold text-slate-500 dark:text-dracula-comment">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage >= totalPages}
                    className="inline-flex items-center gap-1 rounded-full border border-soft-gray-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-celeste-300 hover:text-celeste-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dracula-selection dark:text-dracula-comment"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </main>
      </div>

      {/* ===== LAYOUT PARA MÓVIL (SIN CAMBIOS) ===== */}
      <div className="flex flex-col items-center justify-center gap-5 rounded-4xl border border-white/70 bg-white/95 p-6 text-center shadow-[0_20px_40px_-30px_rgba(15,23,42,0.4)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/95 lg:hidden">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
            Gestión de riesgos
          </p>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
            Visualiza la matriz desde un dispositivo con pantalla más grande
          </h2>
          <p className="text-sm text-slate-500 dark:text-dracula-comment">
            Para editar, evaluar o registrar riesgos utiliza la versión de
            escritorio. Desde aquí puedes descargar la última matriz disponible.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg dark:from-dracula-purple dark:via-dracula-pink dark:to-dracula-cyan dark:text-dracula-bg"
          onClick={handleExportMatrix}
        >
          <Download className="h-4 w-4" />
          Exportar matriz
        </button>
      </div>

      {/* ===== MODALES (SIN CAMBIOS) ===== */}
      <RiskMatrixEditorModal
        open={Boolean(editingRow)}
        row={editingRow ?? null}
        descriptors={evaluationCriteria.classification}
        probabilityOptions={evaluationCriteria.probability}
        consequenceOptions={evaluationCriteria.consequence}
        onChange={handleRowChange}
        onClose={handleCancelEdit}
        onSave={handleSaveRow}
        onDelete={
          editingRow && pendingNewRowId !== editingRow.id
            ? () => handleDeleteRow(editingRow.id)
            : undefined
        }
        isNew={editingRow ? pendingNewRowId === editingRow.id : false}
        factorOptions={combinedFactorOptions}
        resolveRiskOptions={resolveRiskOptions}
      />

      <RiskControlModal
        open={Boolean(controlModalState)}
        state={controlModalState}
        onClose={closeControlModal}
        onSave={handleSaveControlModal}
        onAddControl={addControlToModal}
        onControlChange={updateControlInModal}
        onRemoveControl={removeControlFromModal}
        onToggleApplied={toggleControlAppliedInModal}
        deriveStatus={deriveControlStatus}
      />

      {previewModal ? (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-900/60 px-4 py-8 backdrop-blur-sm sm:px-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl rounded-[24px] border border-white/80 bg-white px-6 py-6 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.6)] dark:border-dracula-current dark:bg-dracula-bg">
            <button
              type="button"
              onClick={closePreviewModal}
              className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700 dark:border-dracula-selection dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground"
              aria-label="Cerrar vista completa"
            >
              <X className="h-4 w-4" />
            </button>

            <header className="mb-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400 dark:text-dracula-cyan">
                Vista completa
              </p>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                {previewModal.label}
              </h3>
            </header>

            <div className="rounded-2xl border border-soft-gray-200/80 bg-soft-gray-50/60 p-4 text-sm text-slate-700 dark:border-dracula-selection dark:bg-dracula-current/30 dark:text-dracula-foreground">
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {previewModal.value}
              </p>
            </div>

            <footer className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closePreviewModal}
                className="inline-flex items-center gap-2 rounded-full border border-soft-gray-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-celeste-300 hover:text-celeste-600 dark:border-dracula-selection dark:text-dracula-comment dark:hover:border-dracula-cyan"
              >
                Cerrar
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {showSaveToast ? (
        <div className="fixed right-6 top-6 z-[150] flex w-full max-w-sm items-start gap-3 rounded-2xl border border-emerald-200/70 bg-white/95 p-4 shadow-2xl backdrop-blur-sm transition dark:border-dracula-green/40 dark:bg-dracula-current/90">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/90 text-white dark:bg-dracula-green/70">
            <PartyPopper className="h-5 w-5" />
          </div>
          <div className="flex-1 text-sm text-slate-700 dark:text-dracula-foreground">
            <p className="font-semibold text-emerald-700 dark:text-dracula-green">
              Cambios guardados en la matriz
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
              Recuerda que, al finalizar tu jornada, registra una nueva versión para mantener el historial actualizado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSaveToast(false)}
            className="rounded-full p-1 text-slate-400 transition hover:bg-soft-gray-100 hover:text-slate-600 dark:text-dracula-comment dark:hover:bg-dracula-selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <RiskCriteriaModal
        open={showCriteriaModal}
        onClose={() => setShowCriteriaModal(false)}
        criteria={evaluationCriteria}
      />

      {versionModal.open ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/60 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/70 bg-white/90 p-6 shadow-2xl dark:border-dracula-current dark:bg-dracula-bg/95">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-purple-400 dark:text-dracula-purple">
                  Nuevo registro de versión
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                  Versión {latestVersionNumber + 1}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                  Registra cambios relevantes realizados el {formatDateTime(new Date().toISOString())}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseVersionModal}
                className="rounded-full p-2 text-slate-400 transition hover:bg-soft-gray-100 hover:text-slate-600 dark:text-dracula-comment dark:hover:bg-dracula-selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="rounded-2xl border border-soft-gray-200/70 bg-white/80 p-3 dark:border-dracula-current dark:bg-dracula-current/40">
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-dracula-comment">
                  Fecha de actualización
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                  {formatDateTime(new Date().toISOString())}
                </p>
              </div>
              <div className="rounded-2xl border border-soft-gray-200/70 bg-white/80 p-3 dark:border-dracula-current dark:bg-dracula-current/40">
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-dracula-comment">
                  Responsable
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                  {(() => {
                    const info = resolveCurrentUserInfo();
                    const base = info.name;
                    return info.position ? `${base} • ${info.position}` : base;
                  })()}
                </p>
              </div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-dracula-comment">
                Comentario de la actualización
                <textarea
                  rows={4}
                  value={versionModal.draftComment}
                  onChange={(event) =>
                    setVersionModal((prev) => ({
                      ...prev,
                      draftComment: event.target.value,
                    }))
                  }
                  placeholder="Ej: Se incorporó evaluación de riesgo por trabajos en altura."
                  className="mt-2 w-full rounded-2xl border border-soft-gray-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-purple-300 focus:ring-2 focus:ring-purple-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseVersionModal}
                className="w-full rounded-full border border-soft-gray-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-soft-gray-50 dark:border-dracula-current dark:text-dracula-comment dark:hover:bg-dracula-selection sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitVersion}
                disabled={versionModal.submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-celeste-500 px-6 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {versionModal.submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Guardar versión
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Riesgos;
