import { Link } from "react-router-dom";
import { CalendarPlus, FileText, Settings, Users, MapPin } from "lucide-react";
import {
  DEFAULT_INSPECTION_TEMPLATES,
  type InspectionProgram,
} from "../../types/inspections";

const MOCK_PROGRAMS: InspectionProgram[] = [
  {
    id: "prog-001",
    name: "Ronda SST Planta Santiago",
    frequency: "Semanal",
    discipline: "Seguridad",
    location: "Planta Santiago",
    responsible: { name: "María Torres", email: "maria.torres@empresa.cl" },
    templateId: "iso-45001-general",
    nextDate: new Date().toISOString(),
    status: "Activa",
    notes: "Priorizar área de bodegas y estiba.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prog-002",
    name: "Auditoría ambiental relleno sur",
    frequency: "Mensual",
    discipline: "Medioambiente",
    location: "Planta Talcahuano",
    responsible: { name: "Jorge Medina", email: "jorge.medina@empresa.cl" },
    templateId: "iso-14001-residuos",
    nextDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    status: "Activa",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prog-003",
    name: "Higiene industrial laboratorio química",
    frequency: "Trimestral",
    discipline: "Salud e Higiene",
    location: "Laboratorio Central",
    responsible: { name: "Karla Paredes", email: "karla.paredes@empresa.cl" },
    templateId: "ds-594-higiene",
    nextDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25).toISOString(),
    status: "Pausada",
    notes: "Reactivar luego de mantención en curso.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function InspectionsProgramming() {
  return (
    <section className="rounded-4xl border border-white/70 bg-white/95 p-6 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/90">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
            Programación & plantillas
          </h2>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-dracula-comment">
            Define la frecuencia de tus inspecciones, asigna responsables y estandariza los checklist basados en ISO 45001, ISO 14001 y normativa chilena. Desde aquí podrás construir el plan maestro de visitas a terreno.
          </p>
        </div>
        <div className="grid gap-3 rounded-3xl border border-soft-gray-200/80 bg-white/80 p-4 text-sm text-slate-600 dark:border-dracula-current/60 dark:bg-dracula-current/40 dark:text-dracula-comment">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-500 dark:bg-dracula-green/20 dark:text-dracula-green">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-dracula-comment">
                Plantillas disponibles
              </p>
              <p className="font-semibold text-slate-700 dark:text-dracula-foreground">ISO 45001 · ISO 14001 · DS 594 · DS 148</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-celeste-100/80 text-celeste-500 dark:bg-dracula-cyan/20 dark:text-dracula-cyan">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-dracula-comment">
                Inspectores asignados
              </p>
              <p className="font-semibold text-slate-700 dark:text-dracula-foreground">5 inspectores activos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-soft-gray-200/80 bg-white/80 p-5 transition hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-dracula-current/60 dark:bg-dracula-current/30 dark:hover:border-dracula-green/40">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-100/80 p-2 text-emerald-500 dark:bg-dracula-green/20 dark:text-dracula-green">
              <Settings className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                Configura la planificación
              </h3>
              <p className="text-sm text-slate-500 dark:text-dracula-comment">
                Define la periodicidad (diaria, semanal, mensual, anual) y asigna responsables por planta o contratista. Muy pronto podrás integrar recordatorios automáticos y bloqueo de inspecciones vencidas.
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-600 dark:bg-dracula-green/20 dark:text-dracula-green">
                  Próximamente: Recurrencias inteligentes
                </span>
                <span className="rounded-full bg-soft-gray-100 px-3 py-1 text-slate-400 dark:bg-dracula-current dark:text-dracula-cyan/50">
                  Integración calendario
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-soft-gray-200/80 bg-white/80 p-5 transition hover:border-celeste-200 hover:bg-celeste-50/40 dark:border-dracula-current/60 dark:bg-dracula-current/30 dark:hover:border-dracula-cyan/40">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-celeste-100/80 p-2 text-celeste-500 dark:bg-dracula-cyan/20 dark:text-dracula-cyan">
              <FileText className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                Plantillas normativas
              </h3>
              <p className="text-sm text-slate-500 dark:text-dracula-comment">
                Accede a plantillas preconfiguradas para inspecciones de seguridad, medioambiente y higiene. Pronto podrás personalizarlas por área, idioma y versión histórica.
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-celeste-100 px-3 py-1 text-celeste-600 dark:bg-dracula-cyan/20 dark:text-dracula-cyan">
                  Próximamente: Editor colaborativo
                </span>
                <span className="rounded-full bg-soft-gray-100 px-3 py-1 text-slate-400 dark:bg-dracula-current dark:text-dracula-cyan/50">
                  Versionado
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-soft-gray-200/80 bg-white/80 p-6 dark:border-dracula-current/60 dark:bg-dracula-current/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                Programas activos
              </h3>
              <p className="text-xs text-slate-500 dark:text-dracula-comment">
                Vista de los programas piloto. En la siguiente iteración conectaremos con Firestore.
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase text-emerald-600 dark:bg-dracula-green/20 dark:text-dracula-green">
              Mock data
            </span>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-soft-gray-200/80 dark:border-dracula-current/50">
            <table className="w-full min-w-[680px] table-auto text-sm">
              <thead className="bg-emerald-50 text-slate-600 dark:bg-dracula-green/10 dark:text-dracula-green">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Programa</th>
                  <th className="px-4 py-3 text-left font-semibold">Disciplina</th>
                  <th className="px-4 py-3 text-left font-semibold">Frecuencia</th>
                  <th className="px-4 py-3 text-left font-semibold">Responsable</th>
                  <th className="px-4 py-3 text-left font-semibold">Próxima fecha</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PROGRAMS.map((program, index) => {
                  const template = DEFAULT_INSPECTION_TEMPLATES.find(
                    (item) => item.id === program.templateId,
                  );
                  const nextDate = new Date(program.nextDate);
                  const formatter = new Intl.DateTimeFormat("es-CL", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  const rowBg = index % 2 === 0 ? "bg-white/95" : "bg-emerald-50/40";

                  return (
                    <tr
                      key={program.id}
                      className={`${rowBg} text-slate-600 dark:text-dracula-comment`}
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800 dark:text-dracula-foreground">
                            {program.name}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-dracula-comment">
                            {template?.standard ?? "Plantilla personalizada"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex rounded-full bg-soft-gray-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-dracula-current dark:text-dracula-cyan/60">
                          {program.discipline}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">{program.frequency}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-700 dark:text-dracula-foreground">
                            {program.responsible.name}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-dracula-comment">
                            {program.responsible.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-600 shadow-sm dark:bg-dracula-current/40 dark:text-dracula-green">
                          <MapPin className="h-3.5 w-3.5" />
                          {formatter.format(nextDate)} · {program.location}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            program.status === "Activa"
                              ? "bg-emerald-100 text-emerald-600 dark:bg-dracula-green/20 dark:text-dracula-green"
                              : "bg-amber-100 text-amber-600 dark:bg-dracula-orange/20 dark:text-dracula-orange"
                          }`}
                        >
                          {program.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-soft-gray-200/80 bg-white/80 p-6 dark:border-dracula-current/60 dark:bg-dracula-current/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                Biblioteca de plantillas
              </h3>
              <p className="text-xs text-slate-500 dark:text-dracula-comment">
                Referencia rápida de los checklist disponibles y su alcance.
              </p>
            </div>
            <span className="rounded-full bg-soft-gray-100 px-3 py-1 text-[11px] font-semibold uppercase text-slate-400 dark:bg-dracula-current dark:text-dracula-cyan/50">
              Próximamente editable
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {DEFAULT_INSPECTION_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="rounded-2xl border border-soft-gray-200/70 bg-white/90 p-4 shadow-sm dark:border-dracula-current/50 dark:bg-dracula-current/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-dracula-foreground">
                      {template.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-dracula-comment">
                      {template.standard}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-dracula-comment">
                      {template.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-600 dark:bg-dracula-green/20 dark:text-dracula-green">
                    {template.discipline}
                  </span>
                </div>
                <div className="mt-3 text-xs text-slate-400 dark:text-dracula-comment">
                  {template.checklistLength} ítems en checklist estándar
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3 text-sm">
        <Link
          to="/inspecciones/ejecucion"
          className="inline-flex items-center gap-2 rounded-full border border-soft-gray-200 px-5 py-2 text-slate-600 transition hover:border-emerald-200 hover:text-emerald-600 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-green"
        >
          Ver módulo de ejecución (en construcción)
        </Link>
        <Link
          to="/inspecciones/hallazgos"
          className="inline-flex items-center gap-2 rounded-full border border-soft-gray-200 px-5 py-2 text-slate-600 transition hover:border-celeste-200 hover:text-celeste-600 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-cyan"
        >
          Ver hallazgos & acciones (en construcción)
        </Link>
      </div>
    </section>
  );
}
