import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Edit,
  Plus,
  Save,
} from "lucide-react";
import { useRiskMatrix } from "../hooks/useRiskMatrix";
import { DEFAULT_RISK_EVALUATION_CRITERIA } from "../constants/riskMatrix";
import type {
  RiskMatrixRow,
  RiskClassificationDescriptor,
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

type RiskMatrixRowFormProps = {
  row: RiskMatrixRow;
  descriptors: RiskClassificationDescriptor[];
  onChange: (id: string, patch: Partial<RiskMatrixRow>) => void;
};

const RiskMatrixRowForm = ({
  row,
  descriptors,
  onChange,
}: RiskMatrixRowFormProps) => {
  const [expanded, setExpanded] = useState(false);
  const descriptor =
    descriptors.find(
      (item) =>
        row.puntuacion >= item.minScore && row.puntuacion <= item.maxScore
    ) ?? descriptors[0];

  return (
    <div className="rounded-3xl border border-soft-gray-200/70 bg-white shadow-sm transition hover:border-celeste-200/70 dark:border-dracula-current/40 dark:bg-dracula-current/30">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 rounded-3xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-celeste-50 dark:text-dracula-foreground dark:hover:bg-dracula-current/50"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex flex-col gap-1 text-left">
          <span className="text-xs uppercase tracking-wide text-celeste-500">
            Actividad
          </span>
          <span>{row.actividad || "Nueva actividad"}</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {expanded ? (
        <div className="grid gap-4 border-t border-soft-gray-200/60 px-4 py-4 text-sm dark:border-dracula-selection/60">
          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Actividad
              </span>
              <input
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                value={row.actividad}
                onChange={(event) =>
                  onChange(row.id, { actividad: event.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Tarea
              </span>
              <input
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                value={row.tarea}
                onChange={(event) =>
                  onChange(row.id, { tarea: event.target.value })
                }
              />
            </label>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Puesto de trabajo
              </span>
              <input
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                value={row.puestoTrabajo}
                onChange={(event) =>
                  onChange(row.id, { puestoTrabajo: event.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Lugar de trabajo específico
              </span>
              <input
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                value={row.lugarEspecifico}
                onChange={(event) =>
                  onChange(row.id, { lugarEspecifico: event.target.value })
                }
              />
            </label>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Trabajadoras
              </span>
              <input
                type="number"
                min={0}
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                value={row.numeroTrabajadores.femenino}
                onChange={(event) =>
                  onChange(row.id, {
                    numeroTrabajadores: {
                      ...row.numeroTrabajadores,
                      femenino: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Trabajadores
              </span>
              <input
                type="number"
                min={0}
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                value={row.numeroTrabajadores.masculino}
                onChange={(event) =>
                  onChange(row.id, {
                    numeroTrabajadores: {
                      ...row.numeroTrabajadores,
                      masculino: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Otros
              </span>
              <input
                type="number"
                min={0}
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                value={row.numeroTrabajadores.otros}
                onChange={(event) =>
                  onChange(row.id, {
                    numeroTrabajadores: {
                      ...row.numeroTrabajadores,
                      otros: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Rutina
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
                Peligro / factor de riesgo
              </span>
              <input
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                value={row.factorDeRiesgo}
                onChange={(event) =>
                  onChange(row.id, { factorDeRiesgo: event.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Riesgo
              </span>
              <input
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                value={row.riesgo}
                onChange={(event) =>
                  onChange(row.id, { riesgo: event.target.value })
                }
              />
            </label>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Daño probable
              </span>
              <input
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                value={row.danoProbable}
                onChange={(event) =>
                  onChange(row.id, { danoProbable: event.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Medidas de control
              </span>
              <textarea
                rows={3}
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                value={row.medidasDeControl}
                onChange={(event) =>
                  onChange(row.id, { medidasDeControl: event.target.value })
                }
              />
            </label>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Probabilidad
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
                {DEFAULT_RISK_EVALUATION_CRITERIA.probability.map((option) => (
                  <option key={option.level} value={option.level}>
                    {option.level} ({option.value})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Consecuencia
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
                {DEFAULT_RISK_EVALUATION_CRITERIA.consequence.map((option) => (
                  <option key={option.level} value={option.level}>
                    {option.level} ({option.value})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Evaluación
              </span>
              <div
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                style={{
                  backgroundColor: `${descriptor.color}20`,
                  borderColor: descriptor.color,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">
                    {row.puntuacion}
                  </span>
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
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-soft-gray-200 text-celeste-500 focus:ring-celeste-300"
                checked={row.estaControlado}
                onChange={(event) =>
                  onChange(row.id, { estaControlado: event.target.checked })
                }
              />
              <span className="text-xs font-semibold uppercase text-slate-500">
                Riesgo controlado
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Responsable
              </span>
              <input
                className="rounded-xl border border-soft-gray-200 px-3 py-2 text-slate-700 outline-none transition focus:border-celeste-300 focus:ring-2 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-foreground"
                value={row.responsable}
                onChange={(event) =>
                  onChange(row.id, { responsable: event.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Plazo
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
      ) : null}
    </div>
  );
};

const RiskMatrixLegend = () => {
  const { probability, consequence, classification } =
    DEFAULT_RISK_EVALUATION_CRITERIA;

  return (
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
  );
};

const Riesgos = () => {
  const {
    header,
    loading,
    buildRiskRow,
    createEmptyDocument,
    evaluationCriteria,
    getScoreDetails,
  } = useRiskMatrix();
  const [rows, setRows] = useState<RiskMatrixRow[]>([]);
  const matrixDocument = useMemo(() => {
    const base = createEmptyDocument();
    return {
      ...base,
      header: header ?? base.header,
      rows,
      criterios: evaluationCriteria.classification,
    };
  }, [createEmptyDocument, evaluationCriteria.classification, header, rows]);

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
    [getScoreDetails]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-gray-50 dark:bg-dracula-bg">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-celeste-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-soft-gray-50 via-white to-white px-4 py-8 dark:from-dracula-bg dark:via-dracula-secondary dark:to-dracula-bg">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-col gap-6 rounded-4xl border border-soft-gray-200/70 bg-white p-6 shadow-md dark:border-dracula-current/40 dark:bg-dracula-current/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-celeste-500">
                Anexo DS 44
              </p>
              <h1 className="text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
                Matriz de identificación de peligros y evaluación de riesgos
              </h1>
            </div>
            <div className="flex gap-3">
              <button className="inline-flex items-center gap-2 rounded-full border border-soft-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-celeste-200 hover:text-celeste-500 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-comment dark:hover:border-dracula-cyan/40 dark:hover:text-dracula-cyan">
                <Edit className="h-4 w-4" />
                Editar cabecera
              </button>
              <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md">
                <Download className="h-4 w-4" />
                Exportar matriz
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-soft-gray-200/70 bg-white/80 p-4 shadow-sm dark:border-dracula-current/40 dark:bg-dracula-current/30">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Empresa
              </p>
              <p className="text-sm text-slate-700 dark:text-dracula-foreground">
                {matrixDocument.header.nombreEmpresa}
              </p>
              <p className="text-xs text-slate-500 dark:text-dracula-comment">
                RUT {matrixDocument.header.rutEmpleador}
              </p>
            </div>
            <div className="rounded-3xl border border-soft-gray-200/70 bg-white/80 p-4 shadow-sm dark:border-dracula-current/40 dark:bg-dracula-current/30">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Centro de trabajo
              </p>
              <p className="text-sm text-slate-700 dark:text-dracula-foreground">
                {matrixDocument.header.nombreCentroTrabajo}
              </p>
              <p className="text-xs text-slate-500 dark:text-dracula-comment">
                {matrixDocument.header.direccionCentroTrabajo}
              </p>
            </div>
            <div className="rounded-3xl border border-soft-gray-200/70 bg-white/80 p-4 shadow-sm dark:border-dracula-current/40 dark:bg-dracula-current/30">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Fecha de actualización
              </p>
              <p className="text-sm text-slate-700 dark:text-dracula-foreground">
                {formatDate(matrixDocument.header.fechaActualizacion)}
              </p>
              <p className="text-xs text-slate-500 dark:text-dracula-comment">
                Revisor: {matrixDocument.header.nombreRevisor}
              </p>
            </div>
          </div>
        </header>

        <main className="grid gap-8 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                Listado de riesgos
              </h2>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
                onClick={() => setRows((prev) => [...prev, buildRiskRow({})])}
              >
                <Plus className="h-4 w-4" />
                Agregar fila
              </button>
            </div>

            <div className="space-y-3">
              {rows.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-celeste-200/70 bg-celeste-50/40 p-10 text-center text-sm text-celeste-600 dark:border-dracula-cyan/40 dark:bg-dracula-current/30 dark:text-dracula-cyan">
                  Comienza agregando actividades y tareas para evaluar los
                  riesgos asociados.
                </div>
              ) : null}

              {rows.map((row) => (
                <RiskMatrixRowForm
                  key={row.id}
                  row={row}
                  descriptors={evaluationCriteria.classification}
                  onChange={handleRowChange}
                />
              ))}
            </div>

            <div className="flex justify-end">
              <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg">
                <Save className="h-4 w-4" />
                Guardar matriz
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <RiskMatrixLegend />
          </aside>
        </main>
      </div>
    </div>
  );
};

export default Riesgos;
