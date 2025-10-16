import { useState } from "react";
import { Truck, Plus, Search, Calendar, User, Package } from "lucide-react";

export default function EppEntregas() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-8">
      <section className="rounded-4xl border border-white/70 bg-white/95 p-4 sm:p-6 lg:p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/95">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
              Control de Entregas
            </p>
            <h2 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
              Gestiona las entregas de EPP
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-dracula-comment">
              Registra y controla las entregas de equipos de protección personal a los trabajadores.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-celeste-200/70 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-cyan dark:hover:border-dracula-purple dark:hover:bg-dracula-bg"
          >
            <Plus className="h-4 w-4" />
            Nueva Entrega
          </button>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-dracula-comment" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar entregas..."
              className="w-full rounded-2xl border border-soft-gray-200/70 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground dark:placeholder-dracula-comment"
            />
          </div>
        </div>

        {/* Contenido placeholder */}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Truck className="h-20 w-20 text-celeste-200 dark:text-dracula-cyan/30 mb-6" />
          <h3 className="text-2xl font-semibold text-slate-700 dark:text-dracula-foreground mb-3">
            Módulo en Construcción
          </h3>
          <p className="text-slate-500 dark:text-dracula-comment max-w-md mb-8">
            Estamos diseñando el sistema de control de entregas. Aquí podrás registrar entregas, 
            generar actas de entrega, y llevar un historial completo de EPP entregados a cada trabajador.
          </p>
          
          {/* Características planificadas */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
            <div className="p-6 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 dark:border-dracula-current dark:bg-dracula-current/30 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-celeste-100 dark:bg-dracula-cyan/20">
                  <Calendar className="h-5 w-5 text-celeste-600 dark:text-dracula-cyan" />
                </div>
                <h4 className="font-semibold text-slate-700 dark:text-dracula-foreground">
                  Registro de Entregas
                </h4>
              </div>
              <p className="text-sm text-slate-500 dark:text-dracula-comment">
                Documenta cada entrega con fecha, trabajador y EPP entregado
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 dark:border-dracula-current dark:bg-dracula-current/30 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mint-100 dark:bg-dracula-green/20">
                  <User className="h-5 w-5 text-mint-600 dark:text-dracula-green" />
                </div>
                <h4 className="font-semibold text-slate-700 dark:text-dracula-foreground">
                  Actas Digitales
                </h4>
              </div>
              <p className="text-sm text-slate-500 dark:text-dracula-comment">
                Genera actas de entrega con firma digital del trabajador
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 dark:border-dracula-current dark:bg-dracula-current/30 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-dracula-purple/20">
                  <Package className="h-5 w-5 text-purple-600 dark:text-dracula-purple" />
                </div>
                <h4 className="font-semibold text-slate-700 dark:text-dracula-foreground">
                  Historial Completo
                </h4>
              </div>
              <p className="text-sm text-slate-500 dark:text-dracula-comment">
                Consulta el historial de entregas por trabajador o equipo
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
