import { useState, useEffect, useMemo } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ClipboardCheck,
  HardHat,
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
  Truck,
  Package,
  ChevronDown,
  ShieldQuestion,
  UserCog,
  User,
  ChevronsLeft,
  ChevronsRight,
  Network,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCompanyMembers } from "../hooks/useCompanyMembers";
import {
  createDefaultCompanySettings,
  type AccessModule,
  type AccessRole,
} from "../types/company";
import ThemeToggle from "../components/ThemeToggle";
import { LayoutStateProvider } from "./LayoutStateContext";
import FullScreenLoader from "../components/FullScreenLoader";

const APP_VERSION = __APP_VERSION__;

export default function ProtectedLayout() {
  const { user, loading, signOutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { members, loading: membersLoading } = useCompanyMembers();

  const roleDefaults = useMemo(
    () => createDefaultCompanySettings().access.roleDefaults,
    []
  );

  const normalizedEmail = user?.email?.toLowerCase() ?? null;

  const activeMember = useMemo(() => {
    if (!normalizedEmail) {
      return undefined;
    }
    return members.find(
      (member) => member.email.toLowerCase() === normalizedEmail
    );
  }, [members, normalizedEmail]);

  const resolvedRole: AccessRole = activeMember?.role ?? "Administrador";

  const allowedModules = useMemo<AccessModule[]>(() => {
    return activeMember?.modules ?? roleDefaults[resolvedRole] ?? [];
  }, [activeMember, resolvedRole, roleDefaults]);

  const allowedModuleSet = useMemo(
    () => new Set(allowedModules),
    [allowedModules]
  );

  const roleDescriptions: Record<
    AccessRole,
    { title: string; capabilities: string[] }
  > = {
    Administrador: {
      title: "Administrador",
      capabilities: [
        "Acceso total a los módulos habilitados",
        "Puede crear, editar y eliminar registros",
        "Gestiona configuración y miembros de la empresa",
      ],
    },
    Editor: {
      title: "Editor",
      capabilities: [
        "Puede administrar datos dentro de los módulos asignados",
        "Puede crear y actualizar registros",
        "Puede eliminar cuando el módulo lo permite",
      ],
    },
    Comentarista: {
      title: "Comentarista",
      capabilities: [
        "Puede revisar información y dejar comentarios",
        "No puede eliminar registros",
        "Dependiendo del módulo, puede editar registros específicos",
      ],
    },
    Lector: {
      title: "Lector",
      capabilities: [
        "Acceso solo de lectura a los módulos asignados",
        "Puede exportar información cuando el módulo lo permita",
        "No puede crear ni modificar registros",
      ],
    },
  };

  const roleInfo = roleDescriptions[resolvedRole];

  const defaultRoleAvatars: Record<AccessRole, string> = useMemo(
    () => ({
      Administrador: "👷🏻‍♂️",
      Editor: "👷🏻‍♂️",
      Comentarista: "👷🏻‍♀️",
      Lector: "👀",
    }),
    []
  );

  const headerAvatar = useMemo(() => {
    if (activeMember?.avatarUrl) {
      return { type: "image" as const, value: activeMember.avatarUrl };
    }
    const emoji =
      activeMember?.avatarEmoji ?? defaultRoleAvatars[resolvedRole] ?? "🙂";
    return { type: "emoji" as const, value: emoji };
  }, [activeMember, defaultRoleAvatars, resolvedRole]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResponsiveSidebar = () => {
      const width = window.innerWidth;
      setDesktopCollapsed(width < 1440);
    };

    handleResponsiveSidebar();
    window.addEventListener("resize", handleResponsiveSidebar);

    return () => {
      window.removeEventListener("resize", handleResponsiveSidebar);
    };
  }, []);

  const roleBadge = (
    <button
      type="button"
      onClick={() => setRoleDialogOpen(true)}
      className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-celeste-200 hover:text-slate-800 dark:border-dracula-current/70 dark:bg-dracula-current/30 dark:text-dracula-cyan"
      aria-haspopup="dialog"
      aria-expanded={roleDialogOpen}
    >
      <ShieldQuestion className="h-4 w-4" />
      <span className="hidden sm:inline">Rol:</span>
      <span>{roleInfo.title}</span>
    </button>
  );

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
    to?: string;
    soon?: boolean;
    module?: AccessModule;
    subItems?: {
      label: string;
      to: string;
      icon: LucideIcon;
      module?: AccessModule;
    }[];
  };

  const navigation: NavigationItem[] = useMemo(
    () => [
      {
        label: "Epp",
        icon: HardHat,
        module: "epp",
        subItems: [
          { label: "Inventario", to: "/epp", icon: Package, module: "epp" },
          {
            label: "Entregas",
            to: "/epp/entregas",
            icon: Truck,
            module: "epp",
          },
        ],
      },
      {
        label: "Trabajadores",
        to: "/trabajadores",
        icon: Users,
        module: "trabajadores",
      },
      {
        label: "Inspecciones",
        to: "/inspecciones",
        icon: ClipboardCheck,
        module: "inspecciones",
      },
      {
        label: "Capacitaciones",
        to: "/capacitaciones",
        icon: Users,
        soon: true,
        module: "capacitaciones",
      },
      {
        label: "Riesgos",
        to: "/riesgos",
        icon: AlertTriangle,
        soon: true,
        module: "riesgos",
      },
      {
        label: "Protocolos",
        to: "/protocolos",
        icon: ShieldCheck,
        soon: true,
        module: "protocolos",
      },
      {
        label: "Reportes",
        to: "/reportes",
        icon: Layers,
        soon: true,
        module: "reportes",
      },
      {
        label: "Ajustes",
        to: "/ajustes",
        icon: UserCog,
        module: "ajustes",
      },
      {
        label: "Configuración",
        to: "/configuracion",
        icon: Settings,
        module: "configuracion",
      },
    ],
    []
  );

  const filteredNavigation = useMemo(() => {
    const filterItems = (items: NavigationItem[]): NavigationItem[] => {
      const result: NavigationItem[] = [];
      items.forEach((item) => {
        if (item.subItems && item.subItems.length > 0) {
          const filteredSubItems = item.subItems.filter((subItem) =>
            allowedModuleSet.has(subItem.module ?? item.module ?? "dashboard")
          );

          if (filteredSubItems.length > 0) {
            result.push({ ...item, subItems: filteredSubItems });
          }
          return;
        }

        if (!item.to) {
          return;
        }

        const moduleKey = item.module ?? "dashboard";
        if (allowedModuleSet.has(moduleKey)) {
          result.push(item);
        }
      });

      return result;
    };

    return filterItems(navigation);
  }, [navigation, allowedModuleSet]);

  useEffect(() => {
    if (!filteredNavigation.some((item) => item.label === openSubmenu)) {
      setOpenSubmenu(null);
    }
  }, [filteredNavigation, openSubmenu]);

  const getSectionTitle = () => {
    const { pathname } = location;

    if (pathname.startsWith("/trabajadores")) {
      return "Gestión de Personas";
    }

    if (pathname.startsWith("/epp")) {
      return "Gestión de EPP";
    }

    if (pathname.startsWith("/inspecciones")) {
      return "Gestión de Inspecciones";
    }

    if (pathname.startsWith("/capacitaciones")) {
      return "Gestión de Capacitaciones";
    }

    if (pathname.startsWith("/riesgos")) {
      return "Gestión de Riesgos";
    }

    if (pathname.startsWith("/protocolos")) {
      return "Gestión de Protocolos";
    }

    if (pathname.startsWith("/reportes")) {
      return "Reportes HSE";
    }

    if (pathname.startsWith("/ajustes")) {
      return "Ajustes personales";
    }

    if (pathname.startsWith("/configuracion")) {
      return "Configuración";
    }

    return "Panel HSE";
  };

  const renderNavigation = (items: NavigationItem[], onNavigate?: () => void, forceExpanded: boolean = false) =>
    items.map((item) => {
      const Icon = item.icon;
      const hasSubItems = item.subItems && item.subItems.length > 0;
      const isAnySubItemActive =
        hasSubItems &&
        item.subItems!.some((sub) => location.pathname === sub.to);

      // Si tiene sub-items, renderizar menú desplegable
      if (hasSubItems) {
        const isOpen = openSubmenu === item.label;

        const handleParentClick = () => {
          setOpenSubmenu((prev) => (prev === item.label ? null : item.label));
        };

        type SubItem = NonNullable<NavigationItem["subItems"]>[number];

        const renderSubItemLink = (subItem: SubItem) => {
          const SubIcon = subItem.icon;
          return (
            <NavLink
              key={subItem.label}
              to={subItem.to}
              onClick={() => {
                setOpenSubmenu(null);
                if (onNavigate) {
                  onNavigate();
                }
              }}
              className={({ isActive }) => {
                const activeClasses = isActive
                  ? "border-celeste-200/80 bg-celeste-50/50 text-slate-800 dark:border-dracula-cyan/50 dark:bg-dracula-cyan/10 dark:text-dracula-cyan"
                  : "border-transparent text-slate-500 hover:border-celeste-100/60 hover:bg-white/60 hover:text-slate-700 dark:text-dracula-comment/70 dark:hover:border-dracula-cyan/20 dark:hover:bg-dracula-current/30 dark:hover:text-dracula-cyan/80";
                if (desktopCollapsed && !forceExpanded) {
                  return `group flex flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${activeClasses}`;
                }
                return `group flex items-center gap-3 rounded-xl border py-2 px-4 text-sm font-medium transition-all ${activeClasses}`;
              }}
            >
              {({ isActive }) => (
                <>
                  <SubIcon
                    className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                      isActive
                        ? "text-celeste-400 dark:text-dracula-cyan"
                        : "text-celeste-300/70 group-hover:text-celeste-400 dark:text-dracula-cyan/50 dark:group-hover:text-dracula-cyan"
                    }`}
                  />
                  {! (desktopCollapsed && !forceExpanded) ? (
                    <span
                      className={`flex-1 text-left ${
                        isActive
                          ? "text-slate-800 dark:text-dracula-cyan"
                          : "text-slate-700 dark:text-dracula-cyan/70"
                      }`}
                    >
                      {subItem.label}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          );
        };

        return (
          <div
            key={item.label}
            className={`space-y-1 ${desktopCollapsed ? "relative" : ""}`}
          >
            <button
              onClick={handleParentClick}
              className={`group flex w-full items-center rounded-2xl border py-3 text-sm font-semibold transition-all ${
               (desktopCollapsed && !forceExpanded) ? "justify-center px-3" : "gap-4 px-6"
              } ${
                isAnySubItemActive || isOpen
                  ? "border-mint-200/80 bg-white text-slate-800 shadow-sm dark:border-dracula-purple/50 dark:bg-dracula-current dark:text-dracula-foreground"
                  : "border-transparent text-slate-600 hover:border-celeste-200/60 hover:bg-white/80 hover:text-slate-700 dark:text-dracula-comment dark:hover:border-dracula-purple/30 dark:hover:bg-dracula-current/50 dark:hover:text-dracula-foreground"
              }`}
            >
              <Icon
                className={`h-6 w-6 flex-shrink-0 transition-colors duration-200 ${
                  isAnySubItemActive || isOpen
                    ? "text-celeste-400 dark:text-dracula-cyan"
                    : "text-celeste-300/70 group-hover:text-celeste-400 dark:text-dracula-cyan/50 dark:group-hover:text-dracula-cyan"
                }`}
              />
             {! (desktopCollapsed && !forceExpanded) && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
            </button>

           {/* Sub-items */}
        {!(desktopCollapsed && !forceExpanded) && isOpen ? (
          <div className="ml-6 space-y-1">
            {item.subItems!.map((subItem) => renderSubItemLink(subItem))}
          </div>
        ) : null}
        
        {(desktopCollapsed && !forceExpanded) && isOpen ? (
          <div className="absolute left-1/2 top-full z-40 mt-2 flex -translate-x-1/2 flex-col items-center gap-3 rounded-2xl border border-soft-gray-200/70 bg-white/95 px-3 py-3 shadow-xl transition dark:border-dracula-current/40 dark:bg-dracula-bg/95">
            {item.subItems!.map((subItem) => renderSubItemLink(subItem))}
          </div>
        ) : null}
      </div>
    );
  }

      // Items normales sin sub-items
      return (
        <NavLink
          key={item.label}
          to={item.to!}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center rounded-2xl border py-3 text-sm font-semibold transition-all ${
             (desktopCollapsed && !forceExpanded) ? "justify-center px-3" : "gap-4 px-6"
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
            {(desktopCollapsed && !forceExpanded) ? null : (
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
                      {item.module === "riesgos" ? "Beta" : "Próximamente"}
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
    return <FullScreenLoader message="" />;
  }

  if (membersLoading) {
    return <FullScreenLoader message="" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const mapPathToModule = (path: string): AccessModule => {
    if (path.startsWith("/epp")) return "epp";
    if (path.startsWith("/trabajadores")) return "trabajadores";
    if (path.startsWith("/ajustes")) return "ajustes";
    if (path.startsWith("/configuracion")) return "configuracion";
    if (path.startsWith("/reportes")) return "reportes";
    if (path.startsWith("/inspecciones")) return "inspecciones";
    if (path.startsWith("/capacitaciones")) return "capacitaciones";
    if (path.startsWith("/riesgos")) return "riesgos";
    if (path.startsWith("/protocolos")) return "protocolos";
    return "dashboard";
  };

  const currentModule = mapPathToModule(location.pathname);
  const hasAccessToCurrent = allowedModuleSet.has(currentModule);

  const findFirstRoute = (items: NavigationItem[]): string | null => {
    for (const item of items) {
      if (item.subItems && item.subItems.length > 0) {
        const subRoute = item.subItems[0]?.to;
        if (subRoute) {
          return subRoute;
        }
      } else if (item.to) {
        return item.to;
      }
    }
    return null;
  };

  const defaultRoute = findFirstRoute(filteredNavigation) ?? "/epp";
  const defaultRouteModule = mapPathToModule(defaultRoute);
  const hasFallbackRoute = allowedModuleSet.has(defaultRouteModule);

  if (!hasAccessToCurrent) {
    if (hasFallbackRoute && location.pathname !== defaultRoute) {
      return <Navigate to={defaultRoute} replace />;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-gray-50">
        <div className="flex flex-col gap-4 rounded-3xl border border-soft-gray-200 bg-white px-8 py-6 text-center shadow-lg dark:border-dracula-current/60 dark:bg-dracula-bg">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
            No tienes permisos para acceder a esta sección
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-dracula-comment">
            Comunícate con un administrador para solicitar acceso.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {hasFallbackRoute ? (
              <button
                type="button"
                onClick={() => navigate(defaultRoute, { replace: true })}
                className="inline-flex items-center gap-2 rounded-full border border-celeste-200/70 bg-white px-4 py-2 text-sm font-semibold text-celeste-500 transition hover:border-celeste-300 hover:bg-celeste-50"
              >
                Ir a sección permitida
              </button>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                await signOutUser();
                navigate("/login", { replace: true });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-800 to-slate-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LayoutStateProvider value={{ desktopCollapsed }}>
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
            <nav className="space-y-2">
              {renderNavigation(filteredNavigation)}
            </nav>
          </div>
          <div className="flex flex-col items-center gap-2">
            {desktopCollapsed ? null : (
              <div className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-xs text-slate-500 shadow-sm backdrop-blur dark:border-dracula-current/50 dark:bg-dracula-current/30">
                <div className="mb-2 flex items-center gap-2">
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
            {desktopCollapsed ? null : (
              <div className="text-[10px] mt-4 inline-flex items-center gap-1 text-slate-400 dark:text-dracula-comment/70">
                <Network className="h-3 w-3" />
                Versión {APP_VERSION}
              </div>
            )}
          </div>
        </aside>

        <div
          className={`flex min-w-0 flex-1 flex-col ${
            desktopCollapsed ? "lg:ml-24" : "lg:ml-80 xl:ml-[23rem]"
          }`}
        >
          <header className="fixed lg:sticky top-0 left-0 right-0 z-30 border-b border-soft-gray-200/70 bg-gradient-to-r from-celeste-100/40 via-white/80 to-mint-100/40 shadow-md backdrop-blur-xl dark:border-dracula-current dark:bg-gradient-to-r dark:from-dracula-current/40 dark:via-dracula-bg/80 dark:to-dracula-current/40 lg:left-auto pt-12 pb-3 lg:py-6 flex items-center">
            <div
              className="flex w-full items-center justify-between px-4 sm:px-6"
              style={{
                paddingLeft: "max(1rem, env(safe-area-inset-left))",
                paddingRight: "max(1rem, env(safe-area-inset-right))",
              }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-600 transition hover:border-celeste-200 hover:text-slate-800 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Abrir menú de navegación"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <h1 className="truncate text-base font-semibold text-slate-700 dark:text-dracula-foreground sm:text-lg">
                  {getSectionTitle()}
                </h1>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setDesktopCollapsed((prev) => !prev)}
                  className="hidden h-10 w-10 items-center justify-center rounded-full border border-soft-gray-200/70 bg-white/80 text-slate-600 shadow-sm transition hover:border-celeste-200 hover:bg-celeste-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-cyan lg:inline-flex"
                  aria-label={
                    desktopCollapsed
                      ? "Expandir barra lateral"
                      : "Colapsar barra lateral"
                  }
                >
                  {desktopCollapsed ? (
                    <ChevronsRight className="h-5 w-5" />
                  ) : (
                    <ChevronsLeft className="h-5 w-5" />
                  )}
                </button>
                <div className="hidden md:block">{roleBadge}</div>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-soft-gray-200/70 bg-white/80 px-2 py-1 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-celeste-200 hover:bg-celeste-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-cyan"
                  aria-haspopup="dialog"
                  aria-expanded={userMenuOpen}
                >
                  <span className="hidden max-w-[120px] truncate sm:block">
                    Bienvenid@
                  </span>
                  <span className="hidden max-w-[180px] truncate text-slate-500 dark:text-dracula-comment lg:block">
                    {activeMember?.displayName ||
                      user?.displayName ||
                      user?.email ||
                      "Usuario"}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-celeste-100 text-base dark:bg-dracula-current/40">
                    {headerAvatar.type === "image" ? (
                      <img
                        src={headerAvatar.value}
                        alt={
                          activeMember?.displayName ??
                          user?.displayName ??
                          "Avatar"
                        }
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      headerAvatar.value
                    )}
                  </span>
                </button>
              </div>
            </div>
          </header>

          {userMenuOpen ? (
            <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/40 px-4 py-8 backdrop-blur-sm dark:bg-dracula-bg/70">
              <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/95 p-5 text-center shadow-xl dark:border-dracula-current/60 dark:bg-dracula-bg/95">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(false)}
                  className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-soft-gray-200/70 text-slate-400 transition hover:border-celeste-200 hover:text-celeste-500 dark:border-dracula-selection dark:text-dracula-comment"
                  aria-label="Cerrar menú de usuario"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mt-2 flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-celeste-100 text-3xl shadow-sm dark:bg-dracula-current/40">
                    {headerAvatar.type === "image" ? (
                      <img
                        src={headerAvatar.value}
                        alt={
                          activeMember?.displayName ??
                          user?.displayName ??
                          "Avatar"
                        }
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      headerAvatar.value
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400 dark:text-dracula-cyan/70">
                      Bienvenid@
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                      {activeMember?.displayName ||
                        user?.displayName ||
                        user?.email ||
                        "Usuario"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-dracula-comment">
                      {activeMember?.email || user?.email || "Sin correo"}
                    </p>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/ajustes");
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
                  >
                    <User className="h-4 w-4" />
                    Ir a Ajustes
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await signOutUser();
                      navigate("/login", { replace: true });
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-soft-gray-200/70 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-500 dark:border-dracula-selection dark:bg-dracula-current/40 dark:text-dracula-comment dark:hover:border-dracula-red/50 dark:hover:text-dracula-red"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <main className="flex-1 px-3 pt-3 pb-6 sm:px-6 sm:pb-10 lg:pt-6 lg:pb-10">
            <Outlet />
          </main>
        </div>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-[190] flex justify-start lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="relative flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto border-r border-soft-gray-200/70 bg-white/95 px-5 py-8 shadow-xl backdrop-blur-xl sm:w-96 sm:px-7 sm:py-10 dark:border-dracula-current dark:bg-dracula-bg/95">
              <div className="mb-8">
                <div className="mb-4 flex justify-end">
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
                {renderNavigation(filteredNavigation, () =>
                  setSidebarOpen(false), true
                )}
              </nav>
              <div className="mt-8 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/80 px-4 py-3 text-xs text-slate-500 shadow-sm dark:border-dracula-current/50 dark:bg-dracula-current/30">
                <div className="mb-2 flex items-center gap-2">
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

      {roleDialogOpen ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setRoleDialogOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl animate-in fade-in zoom-in duration-200 dark:border-dracula-current dark:bg-dracula-bg/95">
            <button
              type="button"
              onClick={() => setRoleDialogOpen(false)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground"
              aria-label="Cerrar información de rol"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-celeste-100 text-celeste-600 dark:bg-dracula-current/40 dark:text-dracula-cyan">
                <ShieldQuestion className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-celeste-300 dark:text-dracula-cyan/70">
                  Rol actual
                </p>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-dracula-foreground">
                  {roleInfo.title}
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-dracula-comment">
              Estas son las capacidades principales asociadas a tu rol dentro de
              ClodiApp:
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-dracula-comment">
              {roleInfo.capabilities.map((capability) => (
                <li
                  key={capability}
                  className="flex items-start gap-2 rounded-xl border border-soft-gray-200/70 bg-soft-gray-50/70 px-3 py-2 dark:border-dracula-current/50 dark:bg-dracula-current/20"
                >
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-celeste-400 dark:bg-dracula-cyan" />
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-2xl border border-celeste-200/70 bg-celeste-50/60 px-4 py-3 text-xs text-celeste-700 dark:border-dracula-purple/50 dark:bg-dracula-current/20 dark:text-dracula-cyan">
              <p>
                Para ampliar tus permisos, ponte en contacto con un
                administrador de tu organización.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </LayoutStateProvider>
  );
}
