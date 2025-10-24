import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BellRing,
  CalendarCheck,
  ClipboardList,
  ClipboardCheck,
  FileWarning,
  LineChart,
} from "lucide-react";

const SUBMODULES = [
  {
    id: "programacion",
    label: "Programación & plantillas",
    description:
      "Agenda inspecciones periódicas, define responsables y administra tus plantillas normalizadas.",
    to: "programacion",
    icon: CalendarCheck,
    status: "ready" as const,
  },
  {
    id: "ejecucion",
    label: "Ejecución en terreno",
    description:
      "Registra checklist en campo, adjunta evidencias y obtiene trazabilidad en tiempo real.",
    to: "ejecucion",
    icon: ClipboardList,
    status: "soon" as const,
  },
  {
    id: "hallazgos",
    label: "Hallazgos y acciones",
    description:
      "Centraliza no conformidades, asigna acciones correctivas y monitorea su eficacia.",
    to: "hallazgos",
    icon: FileWarning,
    status: "soon" as const,
  },
  {
    id: "reportes",
    label: "Reportes & analytics",
    description:
      "Obtén indicadores clave de desempeño y reportes audit-ready para ISO 45001/14001.",
    to: "reportes",
    icon: LineChart,
    status: "soon" as const,
  },
  {
    id: "automatizaciones",
    label: "Automatizaciones & integraciones",
    description:
      "Conecta alertas, notificaciones y sistemas externos para cerrar el ciclo de gestión.",
    to: "automatizaciones",
    icon: BellRing,
    status: "soon" as const,
  },
];

export default function InspectionsPage() {
  const location = useLocation();

  return (
    <div className="space-y-10">
      <section className="rounded-4xl border border-white/70 bg-white/95 p-6 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/90">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500 dark:bg-dracula-green/20 dark:text-dracula-green">
              <ClipboardCheck className="h-4 w-4" />
              Gestión de inspecciones HSE
            </span>
            <h1 className="text-3xl font-semibold text-slate-800 dark:text-dracula-foreground">
              Inspecciones integrales ISO 45001 / ISO 14001
            </h1>
            <p className="max-w-2xl text-sm text-slate-500 dark:text-dracula-comment">
              Planifica, ejecuta y da seguimiento a tus inspecciones de seguridad, higiene y medioambiente. Alinea checklists con la normativa chilena y las mejores prácticas internacionales.
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl border border-soft-gray-200/80 bg-white/80 p-4 text-sm text-slate-600 dark:border-dracula-current/60 dark:bg-dracula-current/40 dark:text-dracula-comment">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-500 dark:bg-dracula-green/20 dark:text-dracula-green">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-dracula-comment">
                  Próxima inspección
                </p>
                <p className="font-semibold text-slate-700 dark:text-dracula-foreground">25 Oct · Planta Santiago</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-celeste-100/80 text-celeste-500 dark:bg-dracula-cyan/20 dark:text-dracula-cyan">
                <LineChart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-dracula-comment">
                  Tasa cumplimiento anual
                </p>
                <p className="font-semibold text-slate-700 dark:text-dracula-foreground">87% · objetivo 95%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-4">
        {SUBMODULES.map((submodule) => {
          const Icon = submodule.icon;
          const isActive = location.pathname.endsWith(`/${submodule.id}`) ||
            (location.pathname === "/inspecciones" && submodule.id === "programacion") ||
            (location.pathname === "/inspecciones/" && submodule.id === "programacion");

          return (
            <NavLink
              key={submodule.id}
              to={submodule.id}
              end={submodule.id === "programacion"}
              className={({ isActive: navActive }) =>
                `group flex min-w-[220px] flex-1 flex-col rounded-3xl border px-5 py-4 transition ${
                  navActive || isActive
                    ? "border-emerald-300 bg-emerald-50/80 shadow-lg dark:border-dracula-green/50 dark:bg-dracula-green/15"
                    : "border-soft-gray-200/70 bg-white/80 hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-dracula-current/50 dark:bg-dracula-current/30 dark:hover:border-dracula-green/40"
                }`
              }
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-100/80 p-2 text-emerald-500 group-hover:bg-emerald-200/80 dark:bg-dracula-green/20 dark:text-dracula-green">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-dracula-foreground">
                      {submodule.label}
                    </span>
                    {submodule.status === "soon" ? (
                      <span className="rounded-full bg-soft-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-400 dark:bg-dracula-current dark:text-dracula-cyan/50">
                        Próximamente
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-600 dark:bg-dracula-green/20 dark:text-dracula-green">
                        Activo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-dracula-comment">
                    {submodule.description}
                  </p>
                </div>
              </div>
            </NavLink>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}
