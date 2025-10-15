import { useState, useEffect } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ClipboardCheck,
  HardHat,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
  Lightbulb,
  Heart,
  Award,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function ProtectedLayout() {
  const { user, loading, signOutUser } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Categorías y contenido HSE - Mezclados para variedad
  const hseContent = [
    // Mezclando todas las categorías con iconos y colores específicos
    {
      category: "Consejo HSE",
      icon: BookOpen,
      color: "text-blue-500 dark:text-blue-400",
      text: "Mantén tu inventario actualizado para garantizar la seguridad de tu equipo en todo momento.",
    },
    {
      category: "Idea HSE",
      icon: Lightbulb,
      color: "text-amber-500 dark:text-amber-400",
      text: "ISO 45001: Implementa un sistema de gestión de seguridad y salud ocupacional certificado.",
    },
    {
      category: "Motivación HSE",
      icon: Heart,
      color: "text-rose-500 dark:text-rose-400",
      text: '"La seguridad no es un accidente, es una elección inteligente que hacemos cada día."',
    },
    {
      category: "Líderes HSE",
      icon: Award,
      color: "text-purple-500 dark:text-purple-400",
      text: "Frank Bird: Pionero en seguridad industrial, creó la pirámide de Bird que relaciona incidentes menores con accidentes graves. Su legado: prevenir lo pequeño evita lo grande.",
    },

    {
      category: "Consejo HSE",
      icon: BookOpen,
      color: "text-blue-500 dark:text-blue-400",
      text: "Revisa regularmente el stock de EPP críticos para evitar desabastecimiento en operaciones.",
    },
    {
      category: "Idea HSE",
      icon: Lightbulb,
      color: "text-amber-500 dark:text-amber-400",
      text: "Crea un código QR para cada EPP y facilita el seguimiento digital de tu inventario.",
    },
    {
      category: "Motivación HSE",
      icon: Heart,
      color: "text-rose-500 dark:text-rose-400",
      text: '"Tu familia te espera en casa. Trabaja seguro, regresa sano." - Cultura HSE',
    },
    {
      category: "Líderes HSE",
      icon: Award,
      color: "text-purple-500 dark:text-purple-400",
      text: "Heinrich: Desarrolló la teoría del dominó de accidentes. Demostró que el 88% de los accidentes son causados por actos inseguros. Su trabajo revolucionó la prevención.",
    },

    {
      category: "Consejo HSE",
      icon: BookOpen,
      color: "text-blue-500 dark:text-blue-400",
      text: "La documentación completa es clave para cumplir con los estándares HSE y auditorías.",
    },
    {
      category: "Idea HSE",
      icon: Lightbulb,
      color: "text-amber-500 dark:text-amber-400",
      text: "Establece un programa de inspecciones mensuales para identificar riesgos antes de que ocurran.",
    },
    {
      category: "Motivación HSE",
      icon: Heart,
      color: "text-rose-500 dark:text-rose-400",
      text: '"La excelencia en seguridad no es un acto, sino un hábito que construimos juntos."',
    },
    {
      category: "Líderes HSE",
      icon: Award,
      color: "text-purple-500 dark:text-purple-400",
      text: 'W. Edwards Deming: "La calidad y la seguridad no son gastos, son inversiones." Transformó la gestión de calidad y seguridad en las organizaciones modernas.',
    },

    {
      category: "Consejo HSE",
      icon: BookOpen,
      color: "text-blue-500 dark:text-blue-400",
      text: "Inspecciona periódicamente el estado de los EPP para detectar desgaste o daños.",
    },
    {
      category: "Idea HSE",
      icon: Lightbulb,
      color: "text-amber-500 dark:text-amber-400",
      text: "Implementa reuniones de 5 minutos de seguridad antes de cada turno para reforzar cultura HSE.",
    },
    {
      category: "Motivación HSE",
      icon: Heart,
      color: "text-rose-500 dark:text-rose-400",
      text: '"Cada día sin accidentes es una victoria del equipo. ¡Celebremos la seguridad!"',
    },
    {
      category: "Líderes HSE",
      icon: Award,
      color: "text-purple-500 dark:text-purple-400",
      text: "James Reason: Creador del modelo del queso suizo para análisis de accidentes. Enseñó que los fallos ocurren cuando múltiples barreras fallan simultáneamente.",
    },

    {
      category: "Consejo HSE",
      icon: BookOpen,
      color: "text-blue-500 dark:text-blue-400",
      text: "Un EPP en buen estado puede salvar vidas. Reemplázalo cuando sea necesario.",
    },
    {
      category: "Idea HSE",
      icon: Lightbulb,
      color: "text-amber-500 dark:text-amber-400",
      text: "Digitaliza tus registros HSE para acceder a información crítica en tiempo real desde cualquier lugar.",
    },
    {
      category: "Motivación HSE",
      icon: Heart,
      color: "text-rose-500 dark:text-rose-400",
      text: '"No hay tarea tan urgente que no pueda hacerse de manera segura. Prioriza tu bienestar."',
    },
    {
      category: "Líderes HSE",
      icon: Award,
      color: "text-purple-500 dark:text-purple-400",
      text: 'Sidney Dekker: Revolucionó la investigación de accidentes con el enfoque de "Seguridad II". Propone aprender de lo que funciona, no solo de lo que falla.',
    },

    {
      category: "Consejo HSE",
      icon: BookOpen,
      color: "text-blue-500 dark:text-blue-400",
      text: "Registra todas las entregas de EPP para mantener trazabilidad completa y control.",
    },
    {
      category: "Idea HSE",
      icon: Lightbulb,
      color: "text-amber-500 dark:text-amber-400",
      text: "Crea un sistema de recompensas para equipos que mantengan cero accidentes durante el mes.",
    },
    {
      category: "Motivación HSE",
      icon: Heart,
      color: "text-rose-500 dark:text-rose-400",
      text: '"Ser líder en HSE significa inspirar con el ejemplo y cuidar de cada miembro del equipo."',
    },
    {
      category: "Líderes HSE",
      icon: Award,
      color: "text-purple-500 dark:text-purple-400",
      text: 'Dan Petersen: "La seguridad es responsabilidad de todos, pero comienza con el liderazgo." Enfatizó el rol crucial de la gerencia en la cultura de seguridad.',
    },

    {
      category: "Consejo HSE",
      icon: BookOpen,
      color: "text-blue-500 dark:text-blue-400",
      text: "La prevención es más económica que atender accidentes laborales. Invierte en seguridad.",
    },
    {
      category: "Idea HSE",
      icon: Lightbulb,
      color: "text-amber-500 dark:text-amber-400",
      text: "Establece indicadores KPI de seguridad y compártelos visualmente con todo el equipo.",
    },
    {
      category: "Motivación HSE",
      icon: Heart,
      color: "text-rose-500 dark:text-rose-400",
      text: '"La cultura de seguridad comienza contigo. Sé el cambio que quieres ver en tu organización."',
    },
    {
      category: "Líderes HSE",
      icon: Award,
      color: "text-purple-500 dark:text-purple-400",
      text: 'Trevor Kletz: Experto en seguridad de procesos, autor de "What Went Wrong?". Enseñó que aprender de los errores del pasado salva vidas en el futuro.',
    },

    {
      category: "Consejo HSE",
      icon: BookOpen,
      color: "text-blue-500 dark:text-blue-400",
      text: "Asegúrate de que cada trabajador tenga el EPP adecuado para su tarea específica.",
    },
    {
      category: "Idea HSE",
      icon: Lightbulb,
      color: "text-amber-500 dark:text-amber-400",
      text: "Implementa la metodología 5S en tu área de trabajo para mantener orden y prevenir accidentes.",
    },
    {
      category: "Motivación HSE",
      icon: Heart,
      color: "text-rose-500 dark:text-rose-400",
      text: '"Un ambiente de trabajo seguro es el mejor regalo que puedes dar a tu equipo."',
    },
    {
      category: "Líderes HSE",
      icon: Award,
      color: "text-purple-500 dark:text-purple-400",
      text: "Erik Hollnagel: Padre de la Ingeniería de Resiliencia. Propone que las organizaciones deben adaptarse y aprender continuamente para mantener la seguridad.",
    },

    {
      category: "Consejo HSE",
      icon: BookOpen,
      color: "text-blue-500 dark:text-blue-400",
      text: "Los certificados de calidad garantizan que tus EPP cumplen las normativas vigentes.",
    },
    {
      category: "Idea HSE",
      icon: Lightbulb,
      color: "text-amber-500 dark:text-amber-400",
      text: "Realiza simulacros de emergencia trimestrales para mantener al equipo preparado ante cualquier situación.",
    },
    {
      category: "Motivación HSE",
      icon: Heart,
      color: "text-rose-500 dark:text-rose-400",
      text: '"La prevención de hoy es la tranquilidad de mañana. Invierte en seguridad siempre."',
    },
    {
      category: "Líderes HSE",
      icon: Award,
      color: "text-purple-500 dark:text-purple-400",
      text: "Fred Manuele: Pionero en la gestión de riesgos ocupacionales. Desarrolló metodologías para identificar y controlar peligros antes de que causen daño.",
    },

    {
      category: "Consejo HSE",
      icon: BookOpen,
      color: "text-blue-500 dark:text-blue-400",
      text: "Capacita a tu equipo en el uso correcto de equipos de protección personal regularmente.",
    },
    {
      category: "Idea HSE",
      icon: Lightbulb,
      color: "text-amber-500 dark:text-amber-400",
      text: "Usa tecnología móvil para reportes de incidentes en tiempo real y respuesta inmediata.",
    },
    {
      category: "Motivación HSE",
      icon: Heart,
      color: "text-rose-500 dark:text-rose-400",
      text: '"Juntos construimos una cultura donde la seguridad es lo primero, siempre y en todo momento."',
    },
    {
      category: "Líderes HSE",
      icon: Award,
      color: "text-purple-500 dark:text-purple-400",
      text: "Andrew Hopkins: Investigador de desastres industriales. Sus análisis de Deepwater Horizon y otros accidentes enseñan lecciones vitales sobre cultura de seguridad.",
    },
  ];

  // Cambiar contenido cada 20 segundos - Centro de Ayuda Inteligente HSE
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % hseContent.length);
    }, 20000); // 20 segundos

    return () => clearInterval(interval);
  }, [hseContent.length]);

  type NavigationItem = {
    label: string;
    icon: LucideIcon;
    to: string;
    soon?: boolean;
  };

  const navigation: NavigationItem[] = [
    { label: "Epp", to: "/epp", icon: HardHat },
    {
      label: "Inspecciones",
      to: "/inspecciones",
      icon: ClipboardCheck,
      soon: true,
    },
    { label: "Capacitaciones", to: "/capacitaciones", icon: Users, soon: true },
    { label: "Riesgos", to: "/riesgos", icon: AlertTriangle, soon: true },
    { label: "Protocolos", to: "/protocolos", icon: ShieldCheck, soon: true },
    { label: "Reportes", to: "/reportes", icon: Layers, soon: true },
    { label: "Configuración", to: "/configuracion", icon: Settings },
  ];

  const renderNavigation = (onNavigate?: () => void) =>
    navigation.map((item) => {
      const Icon = item.icon;

      return (
        <NavLink
          key={item.label}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center rounded-2xl border py-3 text-sm font-semibold transition-all ${
              desktopCollapsed ? "justify-center px-3" : "gap-4 px-6"
            } ${
              isActive
                ? "border-mint-200/80 bg-white text-slate-800 shadow-sm dark:border-dracula-purple/50 dark:bg-dracula-current dark:text-dracula-foreground"
                : "border-transparent text-slate-600 hover:border-celeste-200/60 hover:bg-white/80 hover:text-slate-700 dark:text-dracula-comment dark:hover:border-dracula-purple/30 dark:hover:bg-dracula-current/50 dark:hover:text-dracula-foreground"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                className={`h-6 w-6 flex-shrink-0 transition-colors duration-200 ${
                  isActive
                    ? "text-celeste-400 dark:text-dracula-cyan"
                    : "text-celeste-300/70 group-hover:text-celeste-400 dark:text-dracula-cyan/50 dark:group-hover:text-dracula-cyan"
                }`}
              />
              {desktopCollapsed ? null : (
                <>
                  <span
                    className={`flex-1 text-left ${
                      isActive
                        ? "text-slate-800 dark:text-dracula-cyan"
                        : "text-slate-700 dark:text-dracula-cyan/70"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.soon ? (
                    <span className="ml-auto rounded-full bg-soft-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-400 dark:bg-dracula-current dark:text-dracula-cyan/50">
                      Próximamente
                    </span>
                  ) : null}
                </>
              )}
            </>
          )}
        </NavLink>
      );
    });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-mint-300" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-soft-gray-50 via-celeste-100/30 to-soft-gray-50 dark:from-dracula-bg dark:via-dracula-current/50 dark:to-dracula-bg">
      <aside
        className={`fixed left-0 top-0 hidden h-screen flex-col justify-between border-r border-soft-gray-200/70 bg-gradient-to-br from-celeste-50/50 via-white/70 to-mint-50/50 py-10 shadow-sm backdrop-blur-2xl dark:border-dracula-current dark:bg-gradient-to-br dark:from-dracula-current/40 dark:via-dracula-bg/60 dark:to-dracula-current/40 lg:flex overflow-y-auto ${
          desktopCollapsed ? "w-24 px-4" : "w-80 px-8 xl:w-[23rem]"
        }`}
      >
        <div className="space-y-8">
          <div className="flex flex-col items-center text-center">
            {desktopCollapsed ? (
              <div className="flex justify-center">
                <img
                  src="/Logo Clodi Light.png"
                  alt="Clodi App"
                  className="h-12 w-auto dark:hidden"
                />
                <img
                  src="/Logo Clodi Dark.png"
                  alt="Clodi App"
                  className="hidden h-12 w-auto dark:block"
                />
              </div>
            ) : (
              <>
                <img
                  src="/IsoLogo Clodi Light.png"
                  alt="Clodi App"
                  className="h-16 w-auto dark:hidden"
                />
                <img
                  src="/IsoLogo Clodi Dark.png"
                  alt="Clodi App"
                  className="hidden h-16 w-auto dark:block"
                />
                <p className="mt-4 text-sm text-slate-500 dark:text-dracula-cyan/60">
                  Gestión integral de seguridad, salud ocupacional y
                  medioambiente.
                </p>
              </>
            )}
          </div>
          <nav className="space-y-2">{renderNavigation()}</nav>
        </div>
        {desktopCollapsed ? null : (
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-xs text-slate-500 shadow-sm backdrop-blur dark:border-dracula-current/50 dark:bg-dracula-current/30">
            <div className="flex items-center gap-2 mb-2">
              {(() => {
                const Icon = hseContent[currentTipIndex].icon;
                const color = hseContent[currentTipIndex].color;
                return (
                  <Icon
                    className={`h-4 w-4 ${color} animate-pulse`}
                    key={`icon-${currentTipIndex}`}
                  />
                );
              })()}
              <p
                key={`category-${currentTipIndex}`}
                className="font-semibold text-slate-600 dark:text-dracula-cyan animate-in fade-in duration-300"
              >
                {hseContent[currentTipIndex].category}
              </p>
            </div>
            <p
              key={`text-${currentTipIndex}`}
              className="leading-relaxed dark:text-dracula-cyan/60 animate-in fade-in slide-in-from-bottom-2 duration-500"
            >
              {hseContent[currentTipIndex].text}
            </p>
          </div>
        )}
      </aside>

      <div
        className={`flex flex-1 flex-col ${
          desktopCollapsed ? "lg:ml-24" : "lg:ml-80 xl:ml-[23rem]"
        }`}
      >
        <header className="top-0 z-30 border-b border-soft-gray-200/70 bg-gradient-to-r from-celeste-100/40 via-white/80 to-mint-100/40 shadow-md backdrop-blur-xl dark:border-dracula-current dark:bg-gradient-to-r dark:from-dracula-current/40 dark:via-dracula-bg/80 dark:to-dracula-current/40 py-2 sm:py-3">
          <div className="flex items-center justify-between px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                type="button"
                className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-600 transition hover:border-celeste-200 hover:text-slate-800 lg:hidden flex-shrink-0"
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menú de navegación"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-dracula-foreground truncate">
                Gestión de EPP
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <ThemeToggle />
              <button
                type="button"
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-600 transition hover:border-celeste-200 hover:text-slate-800 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground lg:inline-flex"
                onClick={() => setDesktopCollapsed((value) => !value)}
                aria-label={
                  desktopCollapsed
                    ? "Expandir panel lateral"
                    : "Colapsar panel lateral"
                }
              >
                {desktopCollapsed ? (
                  <ChevronsRight className="h-5 w-5" />
                ) : (
                  <ChevronsLeft className="h-5 w-5" />
                )}
              </button>
              <div className="hidden items-center gap-3 rounded-full border border-white/70 bg-soft-gray-100/80 px-4 py-2 text-sm text-slate-600 md:flex">
                <span className="font-medium">{user?.email}</span>
              </div>
              <button
                onClick={signOutUser}
                className="rounded-full border border-soft-gray-200/80 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 transition-colors hover:border-celeste-200 hover:text-slate-800"
              >
                <span className="hidden sm:inline">Cerrar sesión</span>
                <span className="sm:hidden">Salir</span>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-6 sm:py-10">
          <Outlet />
        </main>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto border-r border-soft-gray-200/70 bg-white/95 px-5 py-8 shadow-xl backdrop-blur-xl sm:w-96 sm:px-7 sm:py-10 dark:border-dracula-current dark:bg-dracula-bg/95">
            <div className="mb-8">
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/80 bg-white text-slate-600 shadow-sm transition hover:border-celeste-200 hover:text-slate-800 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Cerrar menú de navegación"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex justify-center">
                <img
                  src="/IsoLogo Clodi Light.png"
                  alt="Clodi App"
                  className="h-14 w-auto dark:hidden"
                />
                <img
                  src="/IsoLogo Clodi Dark.png"
                  alt="Clodi App"
                  className="hidden h-14 w-auto dark:block"
                />
              </div>
            </div>
            <nav className="flex-1 space-y-1.5">
              {renderNavigation(() => setSidebarOpen(false))}
            </nav>
            <div className="mt-8 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/80 px-4 py-3 text-xs text-slate-500 shadow-sm dark:border-dracula-current/50 dark:bg-dracula-current/30">
              <div className="flex items-center gap-2 mb-2">
                {(() => {
                  const Icon = hseContent[currentTipIndex].icon;
                  const color = hseContent[currentTipIndex].color;
                  return (
                    <Icon
                      className={`h-4 w-4 ${color} animate-pulse`}
                      key={`icon-mobile-${currentTipIndex}`}
                    />
                  );
                })()}
                <p
                  key={`category-mobile-${currentTipIndex}`}
                  className="font-semibold text-slate-600 dark:text-dracula-cyan animate-in fade-in duration-300"
                >
                  {hseContent[currentTipIndex].category}
                </p>
              </div>
              <p
                key={`text-mobile-${currentTipIndex}`}
                className="leading-relaxed dark:text-dracula-cyan/60 animate-in fade-in slide-in-from-bottom-2 duration-500"
              >
                {hseContent[currentTipIndex].text}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
