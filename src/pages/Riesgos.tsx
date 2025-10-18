import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Download, Edit, Plus, Trash2, X } from "lucide-react";
import { useRiskMatrix } from "../hooks/useRiskMatrix";
import type {
  RiskMatrixRow,
  RiskClassificationDescriptor,
  RiskEvaluationCriteria,
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

type RiskMatrixRowEditorProps = {
  row: RiskMatrixRow;
  descriptors: RiskClassificationDescriptor[];
  probabilityOptions: RiskEvaluationCriteria["probability"];
  consequenceOptions: RiskEvaluationCriteria["consequence"];
  onChange: (id: string, patch: Partial<RiskMatrixRow>) => void;
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
};

const RiskMatrixRowEditor = ({
  row,
  descriptors,
  probabilityOptions,
  consequenceOptions,
  onChange,
}: RiskMatrixRowEditorProps) => {
  const descriptor =
    descriptors.find(
      (item) =>
        row.puntuacion >= item.minScore && row.puntuacion <= item.maxScore
    ) ?? descriptors[0];

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
              👥 Trabajadores {key === "femenino" ? "F" : key === "masculino" ? "M" : "Otros"}
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
            ⚠️ Peligro / factor de riesgo
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Menciona el agente que podría causar daño (ruido, golpes...).
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
            🚨 Riesgo
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Describe la consecuencia posible (caídas, atrapamientos...).
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
            💥 Daño probable
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Indica el tipo de lesión o impacto que podría ocurrir.
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
            🛡️ Medidas de control
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Lista controles aplicados o por implementar para reducir el riesgo.
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
            🧰 Riesgo controlado
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            👤 Responsable
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Persona que implementará o supervisará las medidas.
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
            📅 Plazo
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-dracula-comment">
            Fecha comprometida para cerrar la acción de control.
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
}: RiskMatrixEditorModalProps) => {
  if (!open || !row) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-8 backdrop-blur-sm sm:px-6 lg:py-14">
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
            Actualiza los campos de la matriz para mantener trazabilidad y control del riesgo.
          </p>
        </header>

        <div className="space-y-6">
          <RiskMatrixRowEditor
            row={row}
            descriptors={descriptors}
            probabilityOptions={probabilityOptions}
            consequenceOptions={consequenceOptions}
            onChange={onChange}
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

const RiskCriteriaModal = ({ open, onClose, criteria }: RiskCriteriaModalProps) => {
  if (!open) {
    return null;
  }

  const { probability, consequence, classification } = criteria;

  return (
    <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-10 backdrop-blur-sm sm:px-6 lg:py-16">
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
            Consulta los criterios oficiales de probabilidad, consecuencia y clasificación antes de registrar o actualizar riesgos.
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
    header,
    loading,
    buildRiskRow,
    createEmptyDocument,
    evaluationCriteria,
    getScoreDetails,
  } = useRiskMatrix();
  const [rows, setRows] = useState<RiskMatrixRow[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [pendingNewRowId, setPendingNewRowId] = useState<string | null>(null);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);

  const isAnyModalOpen = useMemo(
    () => Boolean(editingRowId) || showCriteriaModal,
    [editingRowId, showCriteriaModal]
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
    const base = createEmptyDocument();
    return {
      ...base,
      header: header ?? base.header,
      rows,
      criterios: evaluationCriteria.classification,
    };
  }, [createEmptyDocument, evaluationCriteria.classification, header, rows]);

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

  const handleAddRow = () => {
    const newRow = buildRiskRow({});
    setRows((prev) => [...prev, newRow]);
    setEditingRowId(newRow.id);
    setPendingNewRowId(newRow.id);
  };

  const handleEditRow = (rowId: string) => {
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
    setRows((prev) => prev.filter((row) => row.id !== rowId));
    if (editingRowId === rowId) {
      setEditingRowId(null);
      setPendingNewRowId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-gray-50 dark:bg-dracula-bg">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-celeste-400" />
      </div>
    );
  }

  const editingRow = editingRowId
    ? rows.find((row) => row.id === editingRowId)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-soft-gray-50 via-white to-white px-4 py-8 dark:from-dracula-bg dark:via-dracula-secondary dark:to-dracula-bg">
      <div className="flex w-full flex-col gap-8">
        <header className="rounded-4xl border border-white/70 bg-white/95 p-4 sm:p-6 lg:p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/95">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
                Anexo DS 44
              </p>
              <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
                Matriz de identificación de peligros y evaluación de riesgos
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-dracula-comment">
                Identifica actividades críticas, evalúa su probabilidad y consecuencia, y documenta las medidas de control para mantener la trazabilidad de la gestión de riesgos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-celeste-200/70 bg-white/80 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-600 shadow-sm transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-cyan dark:hover:border-dracula-purple dark:hover:bg-dracula-bg"
                onClick={() => setShowCriteriaModal(true)}
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Ver criterios</span>
                <span className="sm:hidden">Criterios</span>
              </button>
              <button className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-soft-gray-200/70 bg-white/80 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-600 shadow-sm transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:bg-dracula-bg">
                <Edit className="h-4 w-4" />
                Editar cabecera
              </button>
              <button className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg dark:from-dracula-purple dark:via-dracula-pink dark:to-dracula-cyan dark:text-dracula-bg">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar matriz</span>
                <span className="sm:hidden">Exportar</span>
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-mint-200/70 bg-mint-50/70 p-4 sm:p-5 shadow-sm transition hover:border-mint-300 hover:bg-mint-100/70 hover:shadow-lg dark:border-dracula-green/30 dark:bg-dracula-current dark:hover:border-dracula-green/50 dark:hover:bg-dracula-green/10">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-mint-400 dark:text-dracula-green">
                Empresa
              </p>
              <p className="mt-2 text-base font-semibold text-slate-800 dark:text-dracula-foreground">
                {matrixDocument.header.nombreEmpresa}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                RUT {matrixDocument.header.rutEmpleador}
              </p>
            </div>
            <div className="rounded-3xl border border-celeste-200/70 bg-celeste-50/70 p-4 sm:p-5 shadow-sm transition hover:border-celeste-300 hover:bg-celeste-100/70 hover:shadow-lg dark:border-dracula-cyan/40 dark:bg-dracula-current dark:hover:border-dracula-cyan/60 dark:hover:bg-dracula-cyan/10">
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
            <div className="rounded-3xl border border-purple-200/70 bg-purple-50/60 p-4 sm:p-5 shadow-sm transition hover:border-purple-300 hover:bg-purple-100/70 hover:shadow-lg dark:border-dracula-purple/40 dark:bg-dracula-current dark:hover:border-dracula-purple/60 dark:hover:bg-dracula-purple/10">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-purple-400 dark:text-dracula-purple">
                Fecha de actualización
              </p>
              <p className="mt-2 text-base font-semibold text-slate-800 dark:text-dracula-foreground">
                {formatDate(matrixDocument.header.fechaActualizacion)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                Revisor: {matrixDocument.header.nombreRevisor}
              </p>
            </div>
          </div>
        </header>

        <main className="space-y-8">
          <section className="rounded-4xl border border-white/70 bg-white/95 p-4 sm:p-6 lg:p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/90">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                Listado de riesgos
              </h2>
              <button
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg dark:from-dracula-purple dark:via-dracula-pink dark:to-dracula-cyan dark:text-dracula-bg"
                onClick={handleAddRow}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar fila</span>
                <span className="sm:hidden">Agregar</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] table-auto divide-y divide-soft-gray-200 text-sm dark:divide-dracula-selection">
                <thead className="bg-soft-gray-100 text-xs font-semibold uppercase text-slate-500 dark:bg-dracula-current/40 dark:text-dracula-comment">
                  <tr>
                    <th className="px-4 py-3 text-left">Actividad</th>
                    <th className="px-4 py-3 text-left">Tarea</th>
                    <th className="px-4 py-3 text-left">Puesto</th>
                    <th className="px-4 py-3 text-left">Lugar específico</th>
                    <th className="px-4 py-3 text-center">F</th>
                    <th className="px-4 py-3 text-center">M</th>
                    <th className="px-4 py-3 text-center">Otros</th>
                    <th className="px-4 py-3 text-center">Rutina</th>
                    <th className="px-4 py-3 text-left">Peligro</th>
                    <th className="px-4 py-3 text-left">Riesgo</th>
                    <th className="px-4 py-3 text-left">Daño probable</th>
                    <th className="px-4 py-3 text-center">Prob.</th>
                    <th className="px-4 py-3 text-center">Cons.</th>
                    <th className="px-4 py-3 text-center">Puntaje</th>
                    <th className="px-4 py-3 text-center">Clasificación</th>
                    <th className="px-4 py-3 text-center">Controlado</th>
                    <th className="px-4 py-3 text-left">Responsable</th>
                    <th className="px-4 py-3 text-center">Plazo</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft-gray-100 text-slate-600 dark:divide-dracula-selection dark:text-dracula-foreground">
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={19}
                        className="px-4 py-6 text-center text-sm text-slate-400 dark:text-dracula-comment"
                      >
                        No hay registros. Usa “Agregar fila” para comenzar.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const { descriptor } = getScoreDetails(
                        row.probabilidad,
                        row.consecuencia
                      );
                      return (
                        <tr
                          key={row.id}
                          className={
                            editingRowId === row.id
                              ? "bg-celeste-50/50 dark:bg-dracula-current/30"
                              : ""
                          }
                        >
                          <td className="px-4 py-3">{row.actividad || "—"}</td>
                          <td className="px-4 py-3">{row.tarea || "—"}</td>
                          <td className="px-4 py-3">
                            {row.puestoTrabajo || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {row.lugarEspecifico || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.numeroTrabajadores.femenino}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.numeroTrabajadores.masculino}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.numeroTrabajadores.otros}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.rutina}
                          </td>
                          <td className="px-4 py-3">
                            {row.factorDeRiesgo || "—"}
                          </td>
                          <td className="px-4 py-3">{row.riesgo || "—"}</td>
                          <td className="px-4 py-3">
                            {row.danoProbable || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {probabilityValueMap[row.probabilidad]}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {consequenceValueMap[row.consecuencia]}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.puntuacion}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className="rounded-full px-3 py-1 text-xs font-semibold uppercase text-white"
                              style={{ backgroundColor: descriptor.color }}
                            >
                              {descriptor.classification}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.estaControlado ? "Sí" : "No"}
                          </td>
                          <td className="px-4 py-3">
                            {row.responsable || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.plazo ? formatDate(row.plazo) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
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
          </section>
        </main>
      </div>

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
      />

      <RiskCriteriaModal
        open={showCriteriaModal}
        onClose={() => setShowCriteriaModal(false)}
        criteria={evaluationCriteria}
      />
    </div>
  );
};

export default Riesgos;
