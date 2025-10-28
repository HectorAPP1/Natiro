import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Bell,
  X,
  Send,
  Settings,
  Building2,
  Loader2,
  Users,
  BarChart2,
  FileText,
  ShieldCheck,
  Trash2,
  UserPlus,
  Crown,
  Edit3,
  MessageCircle,
  Eye,
  Smile,
  Image,
  Camera,
  MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useCompanySettings } from "../hooks/useCompanySettings";
import { useCompanyMembers } from "../hooks/useCompanyMembers";
import type {
  AccessModule,
  AccessRole,
  AccessMember,
  CompanyRepresentative,
  CompanySettings,
  CompanySettingsSection,
  HealthAndSafetyInfo,
  JointCommitteeInfo,
  ISO45001Info,
  RiskLevel,
  WorkforceProfile,
} from "../types/company";
import {
  COMPANY_MUTUAL_OPTIONS,
  COMPANY_RISK_LEVELS,
  createDefaultCompanySettings,
} from "../types/company";

type SectionCardQuickInfo = {
  label: string;
  icon: string;
  value: string;
  containerClass?: string;
  valueClass?: string;
  labelClass?: string;
  href?: string;
};

type SectionCardAction = {
  label: string;
  variant?: "primary" | "secondary";
  openSectionKey: CompanySettingsSection;
};

type SectionCard = {
  key: CompanySettingsSection;
  title: string;
  description: string;
  icon: LucideIcon;
  summary: string;
  quickInfo?: SectionCardQuickInfo[];
  actions: SectionCardAction[];
};

export default function Configuracion() {
  const { permission, requestPermission, sendNotification } =
    usePushNotifications();
  const {
    data: remoteSettings,
    loading: settingsLoading,
    error: settingsError,
    save,
  } = useCompanySettings();
  const {
    members,
    loading: membersLoading,
    error: membersError,
    inviteMember,
    updateMemberRole,
    updateMemberModules,
    updateMemberAvatar,
    removeMember,
  } = useCompanyMembers();
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() =>
    createDefaultCompanySettings()
  );
  const [activeSection, setActiveSection] =
    useState<CompanySettingsSection | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("⚠️ Stock crítico en EPP");
  const [message, setMessage] = useState(
    "Tienes 3 equipos con stock bajo. Abre Clodi App para revisar tu inventario."
  );
  const [inviting, setInviting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<AccessRole>("Editor");
  const [newMemberModules, setNewMemberModules] = useState<AccessModule[]>([]);
  const [avatarEditorMemberId, setAvatarEditorMemberId] = useState<
    string | null
  >(null);
  const [avatarSavingId, setAvatarSavingId] = useState<string | null>(null);
  const [expandedModulesMemberId, setExpandedModulesMemberId] = useState<
    string | null
  >(null);
  const [newWorkArea, setNewWorkArea] = useState("");

  const defaultRoleModules = useMemo(
    () => createDefaultCompanySettings().access.roleDefaults,
    []
  );

  useEffect(() => {
    if (remoteSettings) {
      const defaults = createDefaultCompanySettings();
      setCompanySettings({
        ...defaults,
        ...remoteSettings,
        general: {
          ...defaults.general,
          ...remoteSettings.general,
        },
        representatives: {
          ...defaults.representatives,
          ...remoteSettings.representatives,
        },
        healthAndSafety: {
          ...defaults.healthAndSafety,
          ...remoteSettings.healthAndSafety,
        },
        workforce: {
          ...defaults.workforce,
          ...remoteSettings.workforce,
        },
        documents: {
          ...defaults.documents,
          ...remoteSettings.documents,
        },
        catalogs: {
          ...defaults.catalogs,
          ...remoteSettings.catalogs,
        },
        access: {
          ...defaults.access,
          ...remoteSettings.access,
          members:
            remoteSettings.access?.members?.map((member) => ({
              ...member,
              modules:
                member.modules ??
                defaults.access.roleDefaults[member.role] ??
                [],
            })) ?? defaults.access.members,
          roleDefaults:
            remoteSettings.access?.roleDefaults ?? defaults.access.roleDefaults,
        },
      });
    } else {
      setCompanySettings((prev) => ({
        ...prev,
        access: {
          ...prev.access,
          members:
            prev.access.members.map((member) => ({
              ...member,
              modules:
                member.modules ?? prev.access.roleDefaults[member.role] ?? [],
            })) ?? [],
        },
      }));
    }
  }, [remoteSettings]);

  useEffect(() => {
    setNewMemberModules(defaultRoleModules[newMemberRole]);
  }, [defaultRoleModules, newMemberRole]);

  useEffect(() => {
    if (activeSection !== "catalogs") {
      setNewWorkArea("");
    }
  }, [activeSection]);

  const sortedWorkAreas = useMemo(() => {
    return [...companySettings.catalogs.workAreas].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [companySettings.catalogs.workAreas]);

  const handleAddWorkArea = useCallback(() => {
    const trimmed = newWorkArea.trim();
    if (trimmed.length === 0) {
      return;
    }

    setCompanySettings((prev) => {
      const exists = prev.catalogs.workAreas.some(
        (area) => area.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        return prev;
      }
      const updatedAreas = [...prev.catalogs.workAreas, trimmed].sort((a, b) =>
        a.localeCompare(b)
      );
      return {
        ...prev,
        catalogs: {
          ...prev.catalogs,
          workAreas: updatedAreas,
        },
      };
    });
    setNewWorkArea("");
  }, [newWorkArea]);

  const handleRemoveWorkArea = useCallback((area: string) => {
    setCompanySettings((prev) => ({
      ...prev,
      catalogs: {
        ...prev.catalogs,
        workAreas: prev.catalogs.workAreas.filter(
          (item) => item.toLowerCase() !== area.toLowerCase()
        ),
      },
    }));
  }, []);

  const handleWorkAreaInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAddWorkArea();
      }
    },
    [handleAddWorkArea]
  );

  const roleOrder: AccessRole[] = useMemo(
    () => ["Administrador", "Editor", "Comentarista", "Lector"],
    []
  );

  const membersByRole = useMemo(() => {
    return members.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] ?? 0) + 1;
      return acc;
    }, {} as Record<AccessRole, number>);
  }, [members]);

  const defaultRoleEmojis: Record<AccessRole, string> = useMemo(
    () => ({
      Administrador: "👷🏻‍♂️",
      Editor: "👷🏻‍♂️",
      Comentarista: "👷🏻‍♀️",
      Lector: "👀",
    }),
    []
  );

  const memberAvatarOptions = useMemo(
    () => [
      { label: "Supervisora", emoji: "👩🏻‍💼" },
      { label: "Supervisor", emoji: "👨🏻‍💼" },
      { label: "Trabajadora", emoji: "👷🏻‍♀️" },
      { label: "Trabajador", emoji: "👷🏻‍♂️" },
      { label: "Seguridad", emoji: "🦺" },
      { label: "Ingeniería", emoji: "🛠️" },
    ],
    []
  );

  const accessSummaryCards = useMemo(() => {
    const roleStyles: Record<
      AccessRole,
      {
        icon: LucideIcon;
        gradient: string;
        iconBg: string;
        iconColor: string;
        valueColor: string;
        labelColor: string;
      }
    > = {
      Administrador: {
        icon: Crown,
        gradient: "from-purple-50/80 via-white/70 to-purple-100/70",
        iconBg: "bg-purple-100/80",
        iconColor: "text-purple-600",
        valueColor: "text-purple-700",
        labelColor: "text-purple-500",
      },
      Editor: {
        icon: Edit3,
        gradient: "from-mint-50/80 via-white/70 to-mint-100/70",
        iconBg: "bg-mint-100/80",
        iconColor: "text-mint-600",
        valueColor: "text-mint-700",
        labelColor: "text-mint-500",
      },
      Comentarista: {
        icon: MessageCircle,
        gradient: "from-amber-50/80 via-white/70 to-amber-100/70",
        iconBg: "bg-amber-100/80",
        iconColor: "text-amber-600",
        valueColor: "text-amber-700",
        labelColor: "text-amber-500",
      },
      Lector: {
        icon: Eye,
        gradient: "from-sky-50/80 via-white/70 to-sky-100/70",
        iconBg: "bg-sky-100/80",
        iconColor: "text-sky-600",
        valueColor: "text-sky-700",
        labelColor: "text-sky-500",
      },
    };

    const totalCard = {
      key: "total",
      label: "Total usuarios",
      value: members.length,
      icon: Users,
      gradient: "from-slate-50/80 via-white/70 to-slate-100/70",
      iconBg: "bg-slate-200/70",
      iconColor: "text-slate-600",
      valueColor: "text-slate-800",
      labelColor: "text-slate-500",
    } as const;

    const roleCards = roleOrder.map((role) => {
      const styles = roleStyles[role];
      return {
        key: role,
        label: role,
        value: membersByRole[role] ?? 0,
        icon: styles.icon,
        gradient: styles.gradient,
        iconBg: styles.iconBg,
        iconColor: styles.iconColor,
        valueColor: styles.valueColor,
        labelColor: styles.labelColor,
      };
    });

    return [totalCard, ...roleCards];
  }, [members.length, membersByRole, roleOrder]);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("No se pudo leer la imagen"));
        }
      };
      reader.onerror = () =>
        reject(reader.error ?? new Error("Error al leer archivo"));
      reader.readAsDataURL(file);
    });

  const handleAvatarEmojiSelect = async (
    member: AccessMember,
    emoji: string
  ) => {
    setActionError(null);
    setAvatarSavingId(member.id);
    try {
      await updateMemberAvatar({
        id: member.id,
        avatarEmoji: emoji,
        avatarUrl: null,
      });
    } catch (error) {
      console.error("Error al actualizar avatar emoji", error);
      setActionError("No se pudo actualizar el avatar. Intenta nuevamente.");
    } finally {
      setAvatarSavingId(null);
    }
  };

  const handleAvatarFileChange = async (
    member: AccessMember,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setActionError("La imagen debe pesar menos de 2 MB.");
      return;
    }
    setActionError(null);
    setAvatarSavingId(member.id);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await updateMemberAvatar({
        id: member.id,
        avatarEmoji: null,
        avatarUrl: dataUrl,
      });
    } catch (error) {
      console.error("Error al subir avatar", error);
      setActionError("No se pudo subir la imagen. Intenta nuevamente.");
    } finally {
      setAvatarSavingId(null);
      event.target.value = "";
    }
  };

  const handleAvatarReset = async (member: AccessMember) => {
    setActionError(null);
    setAvatarSavingId(member.id);
    try {
      await updateMemberAvatar({
        id: member.id,
        avatarEmoji: null,
        avatarUrl: null,
      });
    } catch (error) {
      console.error("Error al restablecer avatar", error);
      setActionError("No se pudo restablecer el avatar. Intenta nuevamente.");
    } finally {
      setAvatarSavingId(null);
    }
  };

  const getMemberAvatarDisplay = (member: AccessMember) => {
    if (member.avatarUrl) {
      return { type: "image" as const, value: member.avatarUrl };
    }
    const emoji = member.avatarEmoji ?? defaultRoleEmojis[member.role] ?? "🙂";
    return { type: "emoji" as const, value: emoji };
  };

  useEffect(() => {
    setCompanySettings((prev) => ({
      ...prev,
      access: {
        ...prev.access,
        members: members.map((member) => ({
          ...member,
          modules: member.modules ?? defaultRoleModules[member.role] ?? [],
        })),
      },
    }));
  }, [members, defaultRoleModules]);

  const handleGeneralChange = <K extends keyof CompanySettings["general"]>(
    field: K,
    value: CompanySettings["general"][K]
  ) => {
    setCompanySettings((prev) => ({
      ...prev,
      general: {
        ...prev.general,
        [field]: value,
      },
    }));
  };

  const handleWorkforceChange = <K extends keyof WorkforceProfile>(
    field: K,
    value: WorkforceProfile[K]
  ) => {
    setCompanySettings((prev) => ({
      ...prev,
      workforce: {
        ...prev.workforce,
        [field]: value,
      },
    }));
  };

  const handleHealthAndSafetyChange = <K extends keyof HealthAndSafetyInfo>(
    field: K,
    value: HealthAndSafetyInfo[K]
  ) => {
    setCompanySettings((prev) => ({
      ...prev,
      healthAndSafety: {
        ...prev.healthAndSafety,
        [field]: value,
      },
    }));
  };

  const handleJointCommitteeChange = <K extends keyof JointCommitteeInfo>(
    field: K,
    value: JointCommitteeInfo[K]
  ) => {
    setCompanySettings((prev) => ({
      ...prev,
      healthAndSafety: {
        ...prev.healthAndSafety,
        jointCommittee: {
          ...prev.healthAndSafety.jointCommittee,
          [field]: value,
        },
      },
    }));
  };

  const handleDocumentsChange = <K extends keyof CompanySettings["documents"]>(
    field: K,
    value: CompanySettings["documents"][K]
  ) => {
    setCompanySettings((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: value,
      },
    }));
  };

  const handleAccessMemberRoleChange = async (
    memberId: string,
    role: AccessRole
  ) => {
    setActionError(null);
    try {
      await updateMemberRole({ id: memberId, role });
    } catch (error) {
      console.error("Error al actualizar el rol del miembro", error);
      setActionError("No se pudo actualizar el rol. Intenta nuevamente.");
    }
  };

  const handleAccessMemberModulesToggle = async (
    memberId: string,
    module: AccessModule,
    enabled: boolean
  ) => {
    setActionError(null);
    const member = members.find((item) => item.id === memberId);
    if (!member) {
      return;
    }
    const modules = enabled
      ? Array.from(new Set([...member.modules, module]))
      : member.modules.filter((m) => m !== module);
    try {
      await updateMemberModules({ id: memberId, modules });
    } catch (error) {
      console.error("Error al actualizar permisos del miembro", error);
      setActionError(
        "No se pudieron cambiar los permisos. Intenta nuevamente."
      );
    }
  };

  const handleRemoveAccessMember = async (memberId: string) => {
    setActionError(null);
    try {
      await removeMember(memberId);
    } catch (error) {
      console.error("Error al eliminar miembro", error);
      setActionError("No se pudo eliminar el miembro.");
    }
  };

  const handleAddAccessMember = async () => {
    if (!newMemberEmail.trim()) {
      return;
    }
    setInviting(true);
    setActionError(null);
    try {
      await inviteMember({
        email: newMemberEmail,
        role: newMemberRole,
        modules: newMemberModules,
      });
      setNewMemberEmail("");
      setNewMemberModules(defaultRoleModules[newMemberRole]);
    } catch (error) {
      console.error("Error al invitar nuevo miembro", error);
      setActionError("No se pudo enviar la invitación. Verifica el correo.");
    } finally {
      setInviting(false);
    }
  };

  const handleISO45001Change = <K extends keyof ISO45001Info>(
    field: K,
    value: ISO45001Info[K]
  ) => {
    setCompanySettings((prev) => ({
      ...prev,
      healthAndSafety: {
        ...prev.healthAndSafety,
        iso45001: {
          ...prev.healthAndSafety.iso45001,
          [field]: value,
        },
      },
    }));
  };

  const handleAddressChange = <
    K extends keyof CompanySettings["general"]["address"]
  >(
    field: K,
    value: CompanySettings["general"]["address"][K]
  ) => {
    setCompanySettings((prev) => ({
      ...prev,
      general: {
        ...prev.general,
        address: {
          ...prev.general.address,
          [field]: value,
        },
      },
    }));
  };

  const handleRepresentativeChange = <
    K extends keyof CompanySettings["representatives"],
    F extends keyof CompanyRepresentative
  >(
    representative: K,
    field: F,
    value: CompanyRepresentative[F]
  ) => {
    setCompanySettings((prev) => ({
      ...prev,
      representatives: {
        ...prev.representatives,
        [representative]: {
          ...prev.representatives[representative],
          [field]: value,
        },
      },
    }));
  };

  const openSection = (section: CompanySettingsSection) => {
    setActiveSection(section);
  };

  const closeSection = () => {
    setActiveSection(null);
  };

  const handleModalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await save(companySettings);
      closeSection();
    } catch (error) {
      console.error("Error al guardar configuraciones", error);
      alert("No se pudieron guardar los cambios. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotification = async () => {
    if (permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) {
        alert("Necesitas activar las notificaciones primero");
        return;
      }
    }

    if (!title.trim() || !message.trim()) {
      alert("Por favor completa el título y el mensaje");
      return;
    }

    // Enviar notificación personalizada
    sendNotification(title, {
      body: message,
      tag: "custom-notification",
      requireInteraction: true,
      data: {
        url: window.location.origin + "/epp",
        action: "open-app",
      },
    });

    setShowModal(false);
    alert(
      "¡Notificación enviada! Los usuarios la verán cuando tengan la app en segundo plano."
    );
  };

  const quickMessages = [
    {
      title: "⚠️ Stock crítico en EPP",
      message:
        "Tienes equipos con stock bajo. Abre Clodi App para revisar tu inventario.",
    },
    {
      title: "📅 Recordatorio de inspección",
      message:
        "Es momento de realizar la inspección mensual de EPP. Ingresa a la app.",
    },
    {
      title: "✅ Actualización completada",
      message:
        "Se han actualizado los registros de EPP. Revisa los cambios en la app.",
    },
    {
      title: "🎯 Nueva capacitación disponible",
      message:
        "Hay un nuevo módulo de capacitación en seguridad. Accede ahora.",
    },
  ];

  const sectionCards = useMemo<SectionCard[]>(() => {
    const formatNumber = (value: number) =>
      Number.isFinite(value) ? value.toLocaleString("es-CL") : "0";

    const formatPercent = (value: number) => {
      const safeValue = Number.isFinite(value) ? value : 0;
      return `${safeValue.toFixed(1)}%`;
    };

    const safeText = (value: string | undefined, fallback = "Sin registro") => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : fallback;
    };

    const formatWebsite = (value: string | undefined) => {
      const trimmed = value?.trim();
      if (!trimmed) {
        return { value: "Sin sitio web", href: undefined };
      }

      const hasProtocol = /^https?:\/\//i.test(trimmed);
      const href = hasProtocol ? trimmed : `https://${trimmed}`;
      return {
        value: trimmed,
        href,
      };
    };

    const riskLevelStyles: Record<
      RiskLevel,
      { container: string; value: string }
    > = {
      Bajo: {
        container:
          "border-emerald-100 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-900/30",
        value: "text-emerald-600 dark:text-emerald-300",
      },
      Medio: {
        container:
          "border-amber-100 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-900/30",
        value: "text-amber-600 dark:text-amber-300",
      },
      Alto: {
        container:
          "border-orange-100 bg-orange-50/80 dark:border-orange-900/40 dark:bg-orange-900/30",
        value: "text-orange-600 dark:text-orange-300",
      },
      Crítico: {
        container:
          "border-red-100 bg-red-50/80 dark:border-red-900/40 dark:bg-red-900/30",
        value: "text-red-600 dark:text-red-300",
      },
    };

    const generalSummary = [
      companySettings.general.legalName,
      companySettings.general.contactEmail,
      companySettings.representatives.legalRepresentative.fullName,
    ]
      .filter(Boolean)
      .join(" • ");

    const healthSummary = `🏢 ${companySettings.healthAndSafety.mutualOrganization} • ⚖️ Riesgo ${companySettings.healthAndSafety.riskLevel}`;

    const workforceSummary = `Colab. ${formatNumber(
      companySettings.workforce.totalEmployees
    )} • Freq. ${formatPercent(
      companySettings.workforce.accidentFrequencyRate
    )} • Gravedad ${formatPercent(
      companySettings.workforce.accidentSeverityRate
    )}`;

    const documentsSummary = `📄 Política: ${
      companySettings.documents.occupationalHealthPolicy
        ? "Cargada"
        : "Pendiente"
    } • 🧯 Emergencia: ${
      companySettings.documents.emergencyPlan ? "Cargado" : "Pendiente"
    }`;

    return [
      {
        key: "general",
        title: "Datos generales",
        description: "Razón social, actividad económica y contacto principal",
        icon: Building2,
        summary:
          generalSummary || "Completa la información general de tu empresa",
        quickInfo: (() => {
          const websiteInfo = formatWebsite(companySettings.general.website);
          return [
            {
              label: "Razón social",
              icon: "🏢",
              value: safeText(
                companySettings.general.legalName,
                "Sin informar"
              ),
            },
            {
              label: "RUT",
              icon: "🆔",
              value: safeText(companySettings.general.rut, "Sin RUT"),
            },
            {
              label: "Representante legal",
              icon: "⚖️",
              value: safeText(
                companySettings.representatives.legalRepresentative.fullName,
                "Sin asignar"
              ),
              secondary: safeText(
                companySettings.representatives.legalRepresentative.rut,
                "Sin RUT"
              ),
            },
            {
              label: "Sitio web",
              icon: "🔗",
              value: websiteInfo.value,
              href: websiteInfo.href,
            },
          ];
        })(),
        actions: [
          {
            label: "Ver datos",
            variant: "secondary",
            openSectionKey: "general",
          },
          {
            label: "Editar",
            variant: "primary",
            openSectionKey: "general",
          },
        ],
      },
      {
        key: "healthAndSafety",
        title: "Salud y seguridad",
        description: "Cumplimiento normativo y gestión preventiva",
        icon: Settings,
        summary: healthSummary,
        quickInfo: [
          {
            label: "OAL",
            icon: "🏢",
            value: companySettings.healthAndSafety.mutualOrganization,
          },
          {
            label: "N° afiliado",
            icon: "🆔",
            value:
              companySettings.healthAndSafety.mutualAffiliateNumber ||
              "Sin registro",
          },
          {
            label: "Riesgo",
            icon: "⚖️",
            value: companySettings.healthAndSafety.riskLevel,
            containerClass:
              riskLevelStyles[companySettings.healthAndSafety.riskLevel]
                .container,
            valueClass:
              riskLevelStyles[companySettings.healthAndSafety.riskLevel].value,
            labelClass:
              riskLevelStyles[companySettings.healthAndSafety.riskLevel].value,
          },
        ],
        actions: [
          {
            label: "Ver datos",
            variant: "secondary",
            openSectionKey: "healthAndSafety",
          },
          {
            label: "Editar",
            variant: "primary",
            openSectionKey: "healthAndSafety",
          },
        ],
      },
      {
        key: "workforce",
        title: "Perfil de dotación",
        description: "Distribución de colaboradores y métricas laborales",
        icon: BarChart2,
        summary: workforceSummary,
        quickInfo: [
          {
            label: "Colaboradores",
            icon: "👥",
            value: formatNumber(companySettings.workforce.totalEmployees),
          },
          {
            label: "Índice de frecuencia",
            icon: "⚠️",
            value: formatPercent(
              companySettings.workforce.accidentFrequencyRate
            ),
          },
          {
            label: "Índice de gravedad",
            icon: "🚑",
            value: formatPercent(
              companySettings.workforce.accidentSeverityRate
            ),
          },
        ],
        actions: [
          {
            label: "Ver datos",
            variant: "secondary",
            openSectionKey: "workforce",
          },
          {
            label: "Editar",
            variant: "primary",
            openSectionKey: "workforce",
          },
        ],
      },
      {
        key: "documents",
        title: "Documentos clave",
        description: "Planes y políticas esenciales para la operación",
        icon: FileText,
        summary: documentsSummary,
        quickInfo: [
          {
            label: "Política SST",
            icon: "📄",
            value:
              companySettings.documents.occupationalHealthPolicy || "Pendiente",
          },
          {
            label: "Plan emergencia",
            icon: "🧯",
            value: companySettings.documents.emergencyPlan || "Pendiente",
          },
          {
            label: "Matriz riesgos",
            icon: "⚠️",
            value: companySettings.documents.riskMatrix || "Pendiente",
          },
        ],
        actions: [
          {
            label: "Ver datos",
            variant: "secondary",
            openSectionKey: "documents",
          },
          {
            label: "Editar",
            variant: "primary",
            openSectionKey: "documents",
          },
        ],
      },
      {
        key: "catalogs",
        title: "Catálogos compartidos",
        description:
          "Mantén listas maestras reutilizables en todos los módulos",
        icon: MapPin,
        summary:
          sortedWorkAreas.length > 0
            ? `${sortedWorkAreas.length} áreas registradas`
            : "Define las áreas de trabajo de tu empresa",
        quickInfo: [
          {
            label: "Áreas de trabajo",
            icon: "🏢",
            value:
              sortedWorkAreas.length > 0
                ? sortedWorkAreas.slice(0, 3).join(", ") +
                  (sortedWorkAreas.length > 3 ? "…" : "")
                : "Sin áreas registradas",
          },
        ],
        actions: [
          {
            label: "Ver catálogo",
            variant: "secondary",
            openSectionKey: "catalogs",
          },
          {
            label: "Editar",
            variant: "primary",
            openSectionKey: "catalogs",
          },
        ],
      },
    ];
  }, [companySettings]);

  const renderModal = (
    modalTitle: string,
    modalDescription: string,
    modalContent: ReactNode
  ) => (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 sm:items-center">
      <div className="flex w-full max-w-3xl flex-col rounded-3xl border border-white/70 bg-white/95 p-5 shadow-2xl dark:border-dracula-current dark:bg-dracula-bg/95 sm:rounded-2xl sm:p-6 max-h-[calc(100vh-2rem)] sm:max-h-[70vh] overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
              Configuración
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-800 dark:text-dracula-foreground">
              {modalTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-dracula-comment">
              {modalDescription}
            </p>
          </div>
          <button
            onClick={closeSection}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-soft-gray-100 hover:text-slate-600 dark:text-dracula-comment dark:hover:bg-dracula-selection"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={handleModalSubmit}
          className="mt-4 flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-6 overflow-y-auto pr-1">
            {modalContent}
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeSection}
              className="w-full rounded-full border border-soft-gray-300 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-soft-gray-50 dark:border-dracula-current dark:text-dracula-comment dark:hover:bg-dracula-selection sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderGeneralModal = () =>
    renderModal(
      "Datos generales",
      "Actualiza la razón social, contacto y dirección principal.",
      <>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Logo corporativo 🖼️
            </label>
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-soft-gray-300 bg-white/70 p-4 dark:border-dracula-selection dark:bg-dracula-current/40">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-soft-gray-200 bg-soft-gray-50 shadow-sm dark:border-dracula-selection dark:bg-dracula-bg">
                    {companySettings.general.logoUrl ? (
                      <img
                        src={companySettings.general.logoUrl}
                        alt="Logo de la empresa"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Image className="h-8 w-8 text-slate-300 dark:text-dracula-comment" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                      {companySettings.general.logoUrl
                        ? "Logo actual"
                        : "Añade un logo"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-dracula-comment">
                      Formato PNG/JPG, máximo 2 MB. Se mostrará en reportes y
                      dashboards.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow-md">
                    <Camera className="h-4 w-4" />
                    {companySettings.general.logoUrl
                      ? "Actualizar logo"
                      : "Subir logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          return;
                        }
                        if (file.size > 2 * 1024 * 1024) {
                          alert("El logo debe pesar menos de 2 MB.");
                          event.target.value = "";
                          return;
                        }
                        try {
                          const dataUrl = await readFileAsDataUrl(file);
                          handleGeneralChange("logoUrl", dataUrl);
                        } catch (error) {
                          console.error("Error al leer logo", error);
                          alert(
                            "No pudimos cargar el logo. Intenta nuevamente."
                          );
                        } finally {
                          event.target.value = "";
                        }
                      }}
                    />
                  </label>
                  {companySettings.general.logoUrl ? (
                    <button
                      type="button"
                      onClick={() => handleGeneralChange("logoUrl", "")}
                      className="inline-flex items-center gap-2 rounded-full border border-soft-gray-300 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-rose-200 hover:text-rose-500 dark:border-dracula-selection dark:text-dracula-comment dark:hover:border-dracula-red/60 dark:hover:text-dracula-red"
                    >
                      <Trash2 className="h-4 w-4" /> Quitar logo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Razón social 🏢
            </label>
            <input
              type="text"
              value={companySettings.general.legalName}
              onChange={(event) =>
                handleGeneralChange("legalName", event.target.value)
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="Ej: Clodi Spa"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Nombre de fantasía 🎭
            </label>
            <input
              type="text"
              value={companySettings.general.tradeName}
              onChange={(event) =>
                handleGeneralChange("tradeName", event.target.value)
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="Ej: Clodi"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              RUT empresa 🆔
            </label>
            <input
              type="text"
              value={companySettings.general.rut}
              onChange={(event) =>
                handleGeneralChange("rut", event.target.value)
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="12.345.678-9"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Correo de contacto 📧
            </label>
            <input
              type="email"
              value={companySettings.general.contactEmail}
              onChange={(event) =>
                handleGeneralChange("contactEmail", event.target.value)
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="contacto@empresa.cl"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Teléfono 📞
            </label>
            <input
              type="tel"
              value={companySettings.general.contactPhone}
              onChange={(event) =>
                handleGeneralChange("contactPhone", event.target.value)
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="+56 9 1234 5678"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Sitio web 🔗
            </label>
            <input
              type="url"
              value={companySettings.general.website}
              onChange={(event) =>
                handleGeneralChange("website", event.target.value)
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="https://empresa.cl"
            />
          </div>
          <div className="md:col-span-2 rounded-xl border border-dashed border-soft-gray-200/80 bg-white/70 p-4 dark:border-dracula-selection dark:bg-dracula-current/30">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
              Representante legal ⚖️
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
              Estos datos se muestran también en la tarjeta de datos generales.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={
                  companySettings.representatives.legalRepresentative.fullName
                }
                onChange={(event) =>
                  handleRepresentativeChange(
                    "legalRepresentative",
                    "fullName",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
                placeholder="Nombre completo"
              />
              <input
                type="text"
                value={companySettings.representatives.legalRepresentative.rut}
                onChange={(event) =>
                  handleRepresentativeChange(
                    "legalRepresentative",
                    "rut",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
                placeholder="RUT"
              />
              <input
                type="text"
                value={
                  companySettings.representatives.legalRepresentative.position
                }
                onChange={(event) =>
                  handleRepresentativeChange(
                    "legalRepresentative",
                    "position",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
                placeholder="Cargo"
              />
              <input
                type="email"
                value={
                  companySettings.representatives.legalRepresentative.email
                }
                onChange={(event) =>
                  handleRepresentativeChange(
                    "legalRepresentative",
                    "email",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
                placeholder="Correo electrónico"
              />
              <input
                type="tel"
                value={
                  companySettings.representatives.legalRepresentative.phone
                }
                onChange={(event) =>
                  handleRepresentativeChange(
                    "legalRepresentative",
                    "phone",
                    event.target.value
                  )
                }
                className="md:col-span-2 w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
                placeholder="Teléfono"
              />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-soft-gray-200/70 bg-white p-4 dark:border-dracula-current dark:bg-dracula-current">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
            Dirección principal 🏠
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={companySettings.general.address.street}
              onChange={(event) =>
                handleAddressChange("street", event.target.value)
              }
              className="col-span-2 w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
              placeholder="Calle 📍"
            />
            <input
              type="text"
              value={companySettings.general.address.number}
              onChange={(event) =>
                handleAddressChange("number", event.target.value)
              }
              className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
              placeholder="Número"
            />
            <input
              type="text"
              value={companySettings.general.address.office}
              onChange={(event) =>
                handleAddressChange("office", event.target.value)
              }
              className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
              placeholder="Oficina"
            />
            <input
              type="text"
              value={companySettings.general.address.region}
              onChange={(event) =>
                handleAddressChange("region", event.target.value)
              }
              className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
              placeholder="Región"
            />
            <input
              type="text"
              value={companySettings.general.address.city}
              onChange={(event) =>
                handleAddressChange("city", event.target.value)
              }
              className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
              placeholder="Ciudad"
            />
            <input
              type="text"
              value={companySettings.general.address.commune}
              onChange={(event) =>
                handleAddressChange("commune", event.target.value)
              }
              className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
              placeholder="Comuna"
            />
            <input
              type="text"
              value={companySettings.general.address.country}
              onChange={(event) =>
                handleAddressChange("country", event.target.value)
              }
              className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
              placeholder="País"
            />
          </div>
        </div>
      </>
    );

  const renderHealthAndSafetyModal = () =>
    renderModal(
      "Salud y seguridad",
      "Gestiona mutual, prevencionistas y cumplimiento normativo.",
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              OAL (Organismo Administrador de la Ley 16.744) 🏢
            </label>
            <select
              value={companySettings.healthAndSafety.mutualOrganization}
              onChange={(event) =>
                handleHealthAndSafetyChange(
                  "mutualOrganization",
                  event.target
                    .value as HealthAndSafetyInfo["mutualOrganization"]
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            >
              {COMPANY_MUTUAL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Nivel de riesgo ⚖️
            </label>
            <select
              value={companySettings.healthAndSafety.riskLevel}
              onChange={(event) =>
                handleHealthAndSafetyChange(
                  "riskLevel",
                  event.target.value as HealthAndSafetyInfo["riskLevel"]
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            >
              {COMPANY_RISK_LEVELS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Número afiliado 🆔
            </label>
            <input
              type="text"
              value={companySettings.healthAndSafety.mutualAffiliateNumber}
              onChange={(event) =>
                handleHealthAndSafetyChange(
                  "mutualAffiliateNumber",
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="000000"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Encargado de Departamento HSE 🧑‍🚒
            </label>
            <input
              type="text"
              value={companySettings.healthAndSafety.hseManagerName}
              onChange={(event) =>
                handleHealthAndSafetyChange(
                  "hseManagerName",
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Número de credencial HSE 🪪
            </label>
            <input
              type="text"
              value={companySettings.healthAndSafety.hseManagerIdCard}
              onChange={(event) =>
                handleHealthAndSafetyChange(
                  "hseManagerIdCard",
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="ID o credencial del encargado"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Correo encargado HSE 📧
            </label>
            <input
              type="email"
              value={companySettings.healthAndSafety.hseManagerEmail}
              onChange={(event) =>
                handleHealthAndSafetyChange(
                  "hseManagerEmail",
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="hse@empresa.cl"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Teléfono encargado HSE 📞
            </label>
            <input
              type="tel"
              value={companySettings.healthAndSafety.hseManagerPhone}
              onChange={(event) =>
                handleHealthAndSafetyChange(
                  "hseManagerPhone",
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="+56 9 9876 5432"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Seguro Ley 16.744 🛡️
            </label>
            <input
              type="text"
              value={companySettings.healthAndSafety.ley16744InsurancePolicy}
              onChange={(event) =>
                handleHealthAndSafetyChange(
                  "ley16744InsurancePolicy",
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="Número de póliza"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Cobertura Ley 16.744 📄
            </label>
            <textarea
              value={companySettings.healthAndSafety.ley16744CoverageNotes}
              onChange={(event) =>
                handleHealthAndSafetyChange(
                  "ley16744CoverageNotes",
                  event.target.value
                )
              }
              rows={3}
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
              placeholder="Notas de cobertura"
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-soft-gray-200/70 bg-white p-4 dark:border-dracula-current dark:bg-dracula-current">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                ISO 45001 🏆
              </span>
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-dracula-comment">
                <input
                  type="checkbox"
                  checked={companySettings.healthAndSafety.iso45001.isCertified}
                  onChange={(event) =>
                    handleISO45001Change("isCertified", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-soft-gray-300 text-emerald-500 focus:ring-emerald-200 dark-border-dracula-selection dark:bg-dracula-bg"
                />
                Certificada
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-dracula-comment">
              Registra el alcance, organismo certificador y cronograma de
              auditorías para mantener la norma ISO 45001 al día.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={
                  companySettings.healthAndSafety.iso45001.certificationScope
                }
                onChange={(event) =>
                  handleISO45001Change("certificationScope", event.target.value)
                }
                className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                placeholder="Alcance"
              />
              <input
                type="text"
                value={
                  companySettings.healthAndSafety.iso45001.certificationBody
                }
                onChange={(event) =>
                  handleISO45001Change("certificationBody", event.target.value)
                }
                className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                placeholder="Organismo"
              />
              <p className="col-span-2 text-xs text-slate-500 dark:text-dracula-comment">
                Usa formato dd-mm-aaaa para las fechas. Mantén las renovaciones
                y auditorías planificadas.
              </p>
              <input
                type="date"
                value={
                  companySettings.healthAndSafety.iso45001.certificationDate
                }
                onChange={(event) =>
                  handleISO45001Change("certificationDate", event.target.value)
                }
                className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
              />
              <input
                type="date"
                value={
                  companySettings.healthAndSafety.iso45001.certificationExpiry
                }
                onChange={(event) =>
                  handleISO45001Change(
                    "certificationExpiry",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus-border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
              />
              <input
                type="date"
                value={companySettings.healthAndSafety.iso45001.nextAuditDate}
                onChange={(event) =>
                  handleISO45001Change("nextAuditDate", event.target.value)
                }
                className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus-border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
              />
              <textarea
                value={
                  companySettings.healthAndSafety.iso45001.lastAuditFindings
                }
                onChange={(event) =>
                  handleISO45001Change("lastAuditFindings", event.target.value)
                }
                rows={3}
                className="col-span-2 w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                placeholder="Hallazgos última auditoría"
              />
            </div>
          </div>
          <div className="rounded-xl border border-soft-gray-200/70 bg-white p-4 dark:border-dracula-current dark:bg-dracula-current">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                Comité paritario 🤝
              </span>
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-dracula-comment">
                <input
                  type="checkbox"
                  checked={
                    companySettings.healthAndSafety.jointCommittee.hasCommittee
                  }
                  onChange={(event) =>
                    handleJointCommitteeChange(
                      "hasCommittee",
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 rounded border-soft-gray-300 text-celeste-500 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-bg"
                />
                Activo
              </label>
            </div>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={
                  companySettings.healthAndSafety.jointCommittee
                    .resolutionNumber
                }
                onChange={(event) =>
                  handleJointCommitteeChange(
                    "resolutionNumber",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                placeholder="Resolución"
              />
              <input
                type="date"
                value={
                  companySettings.healthAndSafety.jointCommittee.resolutionDate
                }
                onChange={(event) =>
                  handleJointCommitteeChange(
                    "resolutionDate",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-soft-gray-200/70 bg-soft-gray-50/70 p-3 dark:border-dracula-selection dark:bg-dracula-bg/60">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-dracula-comment">
                    Titulares empresa 🏢
                  </h4>
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={
                        companySettings.healthAndSafety.jointCommittee
                          .titularCompanyMember1
                      }
                      onChange={(event) =>
                        handleJointCommitteeChange(
                          "titularCompanyMember1",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-xs text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                      placeholder="Representante empresa 1"
                    />
                    <input
                      type="text"
                      value={
                        companySettings.healthAndSafety.jointCommittee
                          .titularCompanyMember2
                      }
                      onChange={(event) =>
                        handleJointCommitteeChange(
                          "titularCompanyMember2",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-xs text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                      placeholder="Representante empresa 2"
                    />
                    <input
                      type="text"
                      value={
                        companySettings.healthAndSafety.jointCommittee
                          .titularCompanyMember3
                      }
                      onChange={(event) =>
                        handleJointCommitteeChange(
                          "titularCompanyMember3",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-xs text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                      placeholder="Representante empresa 3"
                    />
                  </div>
                  <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-dracula-comment">
                    Titulares trabajadores 👷‍♂️
                  </h4>
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={
                        companySettings.healthAndSafety.jointCommittee
                          .titularWorkerMember1
                      }
                      onChange={(event) =>
                        handleJointCommitteeChange(
                          "titularWorkerMember1",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-xs text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                      placeholder="Trabajador titular 1"
                    />
                    <input
                      type="text"
                      value={
                        companySettings.healthAndSafety.jointCommittee
                          .titularWorkerMember2
                      }
                      onChange={(event) =>
                        handleJointCommitteeChange(
                          "titularWorkerMember2",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-xs text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                      placeholder="Trabajador titular 2"
                    />
                    <input
                      type="text"
                      value={
                        companySettings.healthAndSafety.jointCommittee
                          .titularWorkerMember3
                      }
                      onChange={(event) =>
                        handleJointCommitteeChange(
                          "titularWorkerMember3",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-xs text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                      placeholder="Trabajador titular 3"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-soft-gray-200/70 bg-soft-gray-50/70 p-3 dark:border-dracula-selection dark:bg-dracula-bg/60">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-dracula-comment">
                    Suplentes empresa 🏢
                  </h4>
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={
                        companySettings.healthAndSafety.jointCommittee
                          .alternateCompanyMember1
                      }
                      onChange={(event) =>
                        handleJointCommitteeChange(
                          "alternateCompanyMember1",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-xs text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                      placeholder="Representante empresa suplente 1"
                    />
                    <input
                      type="text"
                      value={
                        companySettings.healthAndSafety.jointCommittee
                          .alternateCompanyMember2
                      }
                      onChange={(event) =>
                        handleJointCommitteeChange(
                          "alternateCompanyMember2",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-xs text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                      placeholder="Representante empresa suplente 2"
                    />
                    <input
                      type="text"
                      value={
                        companySettings.healthAndSafety.jointCommittee
                          .alternateCompanyMember3
                      }
                      onChange={(event) =>
                        handleJointCommitteeChange(
                          "alternateCompanyMember3",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-xs text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                      placeholder="Representante empresa suplente 3"
                    />
                  </div>
                  <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-dracula-comment">
                    Suplentes trabajadores 👷‍♀️
                  </h4>
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={
                        companySettings.healthAndSafety.jointCommittee
                          .alternateWorkerMember1
                      }
                      onChange={(event) =>
                        handleJointCommitteeChange(
                          "alternateWorkerMember1",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-xs text-slate-700 transition focus-border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                      placeholder="Trabajador suplente 1"
                    />
                    <input
                      type="text"
                      value={
                        companySettings.healthAndSafety.jointCommittee
                          .alternateWorkerMember2
                      }
                      onChange={(event) =>
                        handleJointCommitteeChange(
                          "alternateWorkerMember2",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-xs text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                      placeholder="Trabajador suplente 2"
                    />
                    <input
                      type="text"
                      value={
                        companySettings.healthAndSafety.jointCommittee
                          .alternateWorkerMember3
                      }
                      onChange={(event) =>
                        handleJointCommitteeChange(
                          "alternateWorkerMember3",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-xs text-slate-700 transition focus-border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
                      placeholder="Trabajador suplente 3"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  const renderCatalogsModal = () =>
    renderModal(
      "Catálogos compartidos",
      "Configura listas maestras reutilizables en todos los módulos.",
      <div className="space-y-6">
        <section className="rounded-2xl border border-soft-gray-200/80 bg-white p-4 shadow-sm dark:border-dracula-selection dark:bg-dracula-current/40">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                Áreas de trabajo
              </h3>
              <p className="text-xs text-slate-500 dark:text-dracula-comment">
                Estas áreas estarán disponibles como opciones en módulos como
                Riesgos, Trabajadores e Inspecciones.
              </p>
            </div>
          </header>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-soft-gray-200/80 bg-white px-3 py-2 shadow-sm transition focus-within:border-celeste-300 focus-within:ring-2 focus-within:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-current/60">
              <MapPin className="h-4 w-4 text-celeste-400 dark:text-dracula-cyan" />
              <input
                value={newWorkArea}
                onChange={(event) => setNewWorkArea(event.target.value)}
                onKeyDown={handleWorkAreaInputKeyDown}
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none dark:text-dracula-foreground"
                placeholder="Ej. Planta de producción"
              />
            </div>
            <button
              type="button"
              onClick={handleAddWorkArea}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              disabled={newWorkArea.trim().length === 0}
            >
              Agregar área
            </button>
          </div>

          <div className="mt-5">
            {sortedWorkAreas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-soft-gray-200/80 bg-soft-gray-50/60 p-4 text-center text-sm text-slate-500 dark:border-dracula-selection/60 dark:bg-dracula-current/30 dark:text-dracula-comment">
                Aún no registras áreas de trabajo. Agrega la primera para
                reutilizarla en toda la plataforma.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sortedWorkAreas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center gap-2 rounded-full border border-celeste-200/70 bg-celeste-50/60 px-3 py-1 text-xs font-semibold text-celeste-700 shadow-sm dark:border-dracula-purple/50 dark:bg-dracula-purple/20 dark:text-dracula-purple"
                  >
                    {area}
                    <button
                      type="button"
                      onClick={() => handleRemoveWorkArea(area)}
                      className="rounded-full p-1 text-celeste-500 transition hover:bg-white/80 hover:text-celeste-700 dark:text-dracula-comment dark:hover:bg-dracula-current/60 dark:hover:text-dracula-foreground"
                      aria-label={`Quitar área ${area}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    );

  const renderDocumentsModal = () =>
    renderModal(
      "Documentos clave",
      "Carga y mantén actualizados tus principales documentos de seguridad y operación.",
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-soft-gray-200/70 bg-white p-4 dark:border-dracula-current dark:bg-dracula-current">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
            Política de SST 📄
          </label>
          <p className="text-xs text-slate-500 dark:text-dracula-comment">
            Describe el compromiso de la empresa con la seguridad y salud en el
            trabajo (SST).
          </p>
          <textarea
            value={companySettings.documents.occupationalHealthPolicy}
            onChange={(event) =>
              handleDocumentsChange(
                "occupationalHealthPolicy",
                event.target.value
              )
            }
            rows={4}
            className="mt-3 w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
            placeholder="Indica dónde está almacenada o un enlace directo"
          />
        </div>
        <div className="rounded-xl border border-soft-gray-200/70 bg-white p-4 dark:border-dracula-current dark:bg-dracula-current">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
            Plan de emergencia 🧯
          </label>
          <p className="text-xs text-slate-500 dark:text-dracula-comment">
            Incluye procedimientos para actuar ante incendios, sismos u otras
            emergencias.
          </p>
          <textarea
            value={companySettings.documents.emergencyPlan}
            onChange={(event) =>
              handleDocumentsChange("emergencyPlan", event.target.value)
            }
            rows={4}
            className="mt-3 w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
            placeholder="Enlace o ubicación interna del plan"
          />
        </div>
        <div className="rounded-xl border border-soft-gray-200/70 bg-white p-4 dark:border-dracula-current dark:bg-dracula-current">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
            Matriz de riesgos ⚠️
          </label>
          <p className="text-xs text-slate-500 dark:text-dracula-comment">
            Detalla los peligros identificados y las medidas de control
            vigentes.
          </p>
          <textarea
            value={companySettings.documents.riskMatrix}
            onChange={(event) =>
              handleDocumentsChange("riskMatrix", event.target.value)
            }
            rows={4}
            className="mt-3 w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
            placeholder="Nombre del archivo o link a la carpeta"
          />
        </div>
        <div className="rounded-xl border border-soft-gray-200/70 bg-white p-4 dark:border-dracula-current dark:bg-dracula-current">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
            Programa de inducción 📘
          </label>
          <p className="text-xs text-slate-500 dark:text-dracula-comment">
            Contiene el material para capacitar a nuevos colaboradores y
            contratistas.
          </p>
          <textarea
            value={companySettings.documents.inductionProgram}
            onChange={(event) =>
              handleDocumentsChange("inductionProgram", event.target.value)
            }
            rows={4}
            className="mt-3 w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
            placeholder="Ruta o link de la documentación"
          />
        </div>
        <div className="rounded-xl border border-soft-gray-200/70 bg-white p-4 dark:border-dracula-current dark:bg-dracula-current md:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
            Plan de control de contratistas 🤝
          </label>
          <p className="text-xs text-slate-500 dark:text-dracula-comment">
            Describe los requisitos y seguimiento para empresas contratistas.
          </p>
          <textarea
            value={companySettings.documents.contractorControlPlan}
            onChange={(event) =>
              handleDocumentsChange("contractorControlPlan", event.target.value)
            }
            rows={4}
            className="mt-3 w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-selection dark:bg-dracula-bg dark-text-dracula-foreground"
            placeholder="Link a repositorio o carpeta compartida"
          />
        </div>
      </div>
    );

  const accessModules: {
    id: AccessModule;
    label: string;
    description: string;
  }[] = [
    {
      id: "dashboard",
      label: "Panel",
      description: "Resumen general y métricas.",
    },
    {
      id: "epp",
      label: "EPP",
      description: "Gestión de equipos de protección personal.",
    },
    {
      id: "trabajadores",
      label: "Trabajadores",
      description: "Información y seguimiento del personal.",
    },
    {
      id: "ajustes",
      label: "Ajustes",
      description: "Preferencias personales del usuario.",
    },
    {
      id: "configuracion",
      label: "Configuraciones",
      description: "Ajustes de la empresa y modales.",
    },
    {
      id: "documentos",
      label: "Documentos",
      description: "Repositorio de políticas y planes.",
    },
    {
      id: "reportes",
      label: "Reportes",
      description: "Indicadores y estadísticas avanzadas.",
    },
    {
      id: "inspecciones",
      label: "Inspecciones",
      description: "Módulo de inspecciones y hallazgos.",
    },
    {
      id: "capacitaciones",
      label: "Capacitaciones",
      description: "Formaciones y entrenamientos.",
    },
    {
      id: "riesgos",
      label: "Riesgos",
      description: "Gestión de riesgos y matrices.",
    },
    {
      id: "protocolos",
      label: "Protocolos",
      description: "Protocolos HSE y procedimientos.",
    },
    {
      id: "proximamente",
      label: "Próximamente",
      description: "Módulos en desarrollo.",
    },
  ];

  const renderAccessModal = () =>
    renderModal(
      "Gestionar acceso",
      "Invita colaboradores y asigna permisos por módulo.",
      <div className="space-y-6">
        <div className="rounded-xl border border-soft-gray-200/70 bg-white p-4 dark:border-dracula-current dark:bg-dracula-current">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
            Invitar nuevo miembro 👤
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
            Envía una invitación indicando correo y rol inicial. Podrás ajustar
            los módulos después.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              type="email"
              value={newMemberEmail}
              onChange={(event) => setNewMemberEmail(event.target.value)}
              placeholder="correo@empresa.cl"
              className="md:col-span-2 w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
            />
            <select
              value={newMemberRole}
              onChange={(event) =>
                setNewMemberRole(event.target.value as AccessRole)
              }
              className="w-full rounded-lg border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
            >
              <option value="Administrador">Administrador</option>
              <option value="Editor">Editor</option>
              <option value="Comentarista">Comentarista</option>
              <option value="Lector">Lector</option>
            </select>
            <div className="md:col-span-3 flex flex-wrap gap-2">
              {accessModules.map((module) => {
                const isAdminRole = newMemberRole === "Administrador";
                if (module.id === "configuracion" && !isAdminRole) {
                  return null;
                }
                const selected = newMemberModules.includes(module.id);
                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => {
                      if (isAdminRole) {
                        return;
                      }
                      setNewMemberModules((prev) => {
                        const exists = prev.includes(module.id);
                        if (exists) {
                          return prev.filter((item) => item !== module.id);
                        }
                        return [...prev, module.id];
                      });
                    }}
                    disabled={isAdminRole}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      selected
                        ? "border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-500/60 dark:bg-purple-500/20 dark:text-purple-200"
                        : "border-soft-gray-300 text-slate-500 hover:border-purple-200 hover:bg-purple-50"
                    } ${isAdminRole ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {module.label}
                  </button>
                );
              })}
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="button"
                onClick={handleAddAccessMember}
                disabled={inviting}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                {inviting ? "Invitando..." : "Invitar"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-soft-gray-200/70 bg-white p-4 dark:border-dracula-current dark:bg-dracula-current">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
            Miembros actuales 👥
          </h3>
          {membersLoading ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-dracula-comment">
              Cargando usuarios...
            </p>
          ) : members.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-dracula-comment">
              Aún no hay miembros asignados. Invita a tu equipo para empezar.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-lg border border-soft-gray-200/70 bg-white p-3 dark:border-dracula-selection dark:bg-dracula-bg"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                        {member.displayName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-dracula-comment">
                        {member.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(event) =>
                          handleAccessMemberRoleChange(
                            member.id,
                            event.target.value as AccessRole
                          )
                        }
                        className="rounded-lg border border-soft-gray-200/70 bg-white px-2 py-1 text-xs text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-foreground"
                      >
                        <option value="Administrador">Administrador</option>
                        <option value="Editor">Editor</option>
                        <option value="Comentarista">Comentarista</option>
                        <option value="Lector">Lector</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveAccessMember(member.id)}
                        className="rounded-full border border-red-200 p-1 text-red-400 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {accessModules.map((module) => {
                      const enabled = member.modules.includes(module.id);
                      const isAdminMember = member.role === "Administrador";
                      if (module.id === "configuracion" && !isAdminMember) {
                        return null;
                      }
                      return (
                        <label
                          key={`${member.id}-${module.id}`}
                          className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium ${
                            enabled
                              ? "border-celeste-300 bg-celeste-100 text-celeste-700 dark:border-celeste-500/40 dark:bg-celeste-500/15 dark:text-celeste-200"
                              : "border-soft-gray-300 text-slate-500 dark:border-dracula-selection dark:text-dracula-comment"
                          } ${isAdminMember ? "opacity-70" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            disabled={isAdminMember}
                            onChange={(event) =>
                              handleAccessMemberModulesToggle(
                                member.id,
                                module.id,
                                event.target.checked
                              )
                            }
                            className="h-3 w-3 rounded border-soft-gray-300 text-celeste-500 focus:ring-celeste-200 dark:border-dracula-selection dark:bg-dracula-bg"
                          />
                          {module.label}
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400 dark:text-dracula-comment">
                    Invitado el{" "}
                    {new Date(member.invitedAt).toLocaleDateString()} por{" "}
                    {member.invitedBy || "Administrador"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );

  const renderWorkforceModal = () =>
    renderModal(
      "Perfil de dotación",
      "Registra la distribución de colaboradores y contratistas.",
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Total colaboradores 👥
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Cantidad total de trabajadores directos.
            </p>
            <input
              type="number"
              min={0}
              value={companySettings.workforce.totalEmployees}
              onChange={(event) =>
                handleWorkforceChange(
                  "totalEmployees",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Colaboradoras 👩
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Número de mujeres en la dotación.
            </p>
            <input
              type="number"
              min={0}
              value={companySettings.workforce.femaleEmployees}
              onChange={(event) =>
                handleWorkforceChange(
                  "femaleEmployees",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Colaboradores 👨
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Número de hombres en la dotación.
            </p>
            <input
              type="number"
              min={0}
              value={companySettings.workforce.maleEmployees}
              onChange={(event) =>
                handleWorkforceChange(
                  "maleEmployees",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Otro género 🌈
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Personas que se identifican con otro género.
            </p>
            <input
              type="number"
              min={0}
              value={companySettings.workforce.nonBinaryEmployees}
              onChange={(event) =>
                handleWorkforceChange(
                  "nonBinaryEmployees",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Subcontratistas 🤝
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Personal externo que trabaja para la empresa.
            </p>
            <input
              type="number"
              min={0}
              value={companySettings.workforce.subcontractorCount}
              onChange={(event) =>
                handleWorkforceChange(
                  "subcontractorCount",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-current dark:bg-dracula-current dark-text-dracula-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Sindicalización (%) 🧑‍🤝‍🧑
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Porcentaje de colaboradores afiliados a sindicatos.
            </p>
            <input
              type="number"
              min={0}
              max={100}
              value={companySettings.workforce.unionizedPercentage}
              onChange={(event) =>
                handleWorkforceChange(
                  "unionizedPercentage",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-current dark:bg-dracula-current dark-text-dracula-foreground"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Promedio de años colaboradores 📈
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Años promedio que llevan en la empresa.
            </p>
            <input
              type="number"
              min={0}
              step="0.1"
              value={companySettings.workforce.averageSeniorityYears}
              onChange={(event) =>
                handleWorkforceChange(
                  "averageSeniorityYears",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-current dark:bg-dracula-current dark-text-dracula-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Índice frecuencia ⚠️
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Accidentes con tiempo perdido por millón de horas.
            </p>
            <input
              type="number"
              min={0}
              step="0.01"
              value={companySettings.workforce.accidentFrequencyRate}
              onChange={(event) =>
                handleWorkforceChange(
                  "accidentFrequencyRate",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark-border-dracula-current dark:bg-dracula-current dark-text-dracula-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Índice gravedad 🚑
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Días perdidos por accidentes por millón de horas.
            </p>
            <input
              type="number"
              min={0}
              step="0.01"
              value={companySettings.workforce.accidentSeverityRate}
              onChange={(event) =>
                handleWorkforceChange(
                  "accidentSeverityRate",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Tasa de incidencia 📊
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Accidentes registrados por cada 100 trabajadores.
            </p>
            <input
              type="number"
              min={0}
              step="0.01"
              value={companySettings.workforce.accidentIncidenceRate}
              onChange={(event) =>
                handleWorkforceChange(
                  "accidentIncidenceRate",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Tasa de ausentismo 🛌
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Porcentaje de días perdidos por ausencias.
            </p>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={companySettings.workforce.absenteeismRate}
              onChange={(event) =>
                handleWorkforceChange(
                  "absenteeismRate",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Tasa de rotación 🔄
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Porcentaje de salidas respecto al total anual.
            </p>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={companySettings.workforce.turnoverRate}
              onChange={(event) =>
                handleWorkforceChange(
                  "turnoverRate",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Tasa enfermedad profesional 🩺
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Casos de enfermedad ocupacional por 100 trabajadores.
            </p>
            <input
              type="number"
              min={0}
              step="0.01"
              value={companySettings.workforce.occupationalIllnessRate}
              onChange={(event) =>
                handleWorkforceChange(
                  "occupationalIllnessRate",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Tasa de accidentabilidad 🦺
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Accidentes con tiempo perdido por cada 100 trabajadores.
            </p>
            <input
              type="number"
              min={0}
              step="0.01"
              value={companySettings.workforce.accidentabilityRate}
              onChange={(event) =>
                handleWorkforceChange(
                  "accidentabilityRate",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
              Tasa de siniestralidad ⚙️
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-dracula-comment">
              Eventos totales (accidentes + enfermedades) por 100 trabajadores.
            </p>
            <input
              type="number"
              min={0}
              step="0.01"
              value={companySettings.workforce.siniestralityRate}
              onChange={(event) =>
                handleWorkforceChange(
                  "siniestralityRate",
                  Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber
                )
              }
              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            />
          </div>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
          CONFIGURACIÓN
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
          Ajustes de la aplicación
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-dracula-comment">
          Configura las opciones y preferencias de Clodi App
        </p>
      </div>

      {settingsError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/40 dark:text-red-200">
          {settingsError}
        </div>
      )}

      {settingsLoading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-soft-gray-200/70 bg-white p-6 text-slate-600 shadow-sm dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-comment">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando configuraciones de la empresa...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sectionCards.map((card) => (
            <div
              key={card.key}
              className="rounded-2xl border border-soft-gray-200/70 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-celeste-200 hover:shadow-md dark:border-dracula-current dark:bg-dracula-bg"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-celeste-200/50 to-mint-200/50 text-celeste-500 dark:from-dracula-purple/20 dark:to-dracula-cyan/20 dark:text-dracula-cyan">
                  <card.icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                    {card.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-dracula-comment">
                    {card.description}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-600 dark:text-dracula-comment">
                {card.summary}
              </p>

              {card.quickInfo && card.quickInfo.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {card.quickInfo.map((info) => {
                    const baseContainerClasses =
                      "flex flex-col rounded-xl p-3 text-xs";
                    const defaultContainerClasses =
                      "border border-soft-gray-200/70 bg-soft-gray-50/70 dark:border-dracula-current dark:bg-dracula-current";

                    const containerClasses = info.containerClass
                      ? `${baseContainerClasses} ${info.containerClass}`
                      : `${baseContainerClasses} ${defaultContainerClasses}`;

                    const href = info.href?.trim();

                    return (
                      <div key={info.label} className={containerClasses}>
                        <span
                          className={`font-semibold ${
                            info.labelClass ??
                            "text-slate-600 dark:text-dracula-foreground"
                          }`}
                        >
                          {info.icon} {info.label}
                        </span>
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-1 inline-flex items-center gap-1 text-base font-semibold underline-offset-2 hover:underline ${
                              info.valueClass ??
                              "text-celeste-600 dark:text-dracula-cyan"
                            }`}
                          >
                            {info.value}
                          </a>
                        ) : (
                          <span
                            className={`mt-1 text-base font-semibold ${
                              info.valueClass ??
                              "text-slate-800 dark:text-dracula-cyan"
                            }`}
                          >
                            {info.value}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                {card.actions.map((action) => {
                  const isPrimary = action.variant !== "secondary";
                  return (
                    <button
                      key={action.label}
                      onClick={() => openSection(action.openSectionKey)}
                      className={
                        isPrimary
                          ? "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                          : "inline-flex items-center justify-center gap-2 rounded-full border border-soft-gray-300 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-soft-gray-50 dark:border-dracula-current dark:text-dracula-comment dark:hover:bg-dracula-selection"
                      }
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-soft-gray-200/70 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-celeste-200 hover:shadow-md dark:border-dracula-current dark:bg-dracula-bg">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/15 to-pink-500/15 text-purple-500 dark:from-purple-500/20 dark:to-pink-500/20 dark:text-purple-300">
                <Bell className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                  Notificaciones Push
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-dracula-comment">
                  Envía notificaciones personalizadas a todos los usuarios de la
                  aplicación
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {quickMessages.slice(0, 3).map((msg) => (
                <button
                  key={msg.title}
                  onClick={() => {
                    setTitle(msg.title);
                    setMessage(msg.message);
                    setShowModal(true);
                  }}
                  className="rounded-xl border border-purple-100/70 bg-purple-50/60 p-3 text-left text-xs text-purple-700 transition hover:border-purple-300 hover:bg-purple-100/70 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-200 dark:hover:border-purple-300/60 dark:hover:bg-purple-500/20"
                >
                  <p className="font-semibold">{msg.title}</p>
                  <p className="mt-1 text-[11px] text-purple-600/80 dark:text-purple-200/80">
                    {msg.message}
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex sm:justify-end">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
              >
                <Send className="h-4 w-4" />
                Enviar Notificación
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-soft-gray-200/70 bg-white p-6 shadow-sm dark:border-dracula-current dark:bg-dracula-bg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-celeste-500/20 text-purple-500 dark:from-purple-500/20 dark:to-celeste-500/20 dark:text-purple-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                Gestionar acceso
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-dracula-comment">
                Controla roles, invitaciones y permisos por módulo para cada
                miembro del equipo.
              </p>
            </div>
          </div>
          <button
            onClick={() => openSection("access")}
            className="inline-flex items-center gap-2 self-start rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
          >
            <ShieldCheck className="h-4 w-4" />
            Administrar
          </button>
        </div>

        {membersError && (
          <p className="mt-3 text-sm text-red-500 dark:text-red-300">
            {membersError}
          </p>
        )}
        {actionError && (
          <p className="mt-3 text-sm text-red-500 dark:text-red-300">
            {actionError}
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {accessSummaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.key}
                className={`rounded-2xl border border-white/60 bg-gradient-to-br ${card.gradient} p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-dracula-current/40`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${card.labelColor} dark:text-dracula-comment`}
                    >
                      {card.label}
                    </p>
                    <p
                      className={`mt-2 text-2xl font-semibold ${card.valueColor} dark:text-dracula-foreground`}
                    >
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${card.iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
            Miembros recientes
          </h3>
          {membersLoading ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-dracula-comment">
              Cargando usuarios...
            </p>
          ) : members.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-dracula-comment">
              Todavía no hay integrantes registrados. Invita a tu equipo para
              comenzar.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {members.slice(0, 4).map((member) => {
                const avatar = getMemberAvatarDisplay(member);
                const uploadInputId = `avatar-upload-${member.id}`;
                const isSaving = avatarSavingId === member.id;
                return (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-soft-gray-200/70 bg-white p-4 dark:border-dracula-selection dark:bg-dracula-bg"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex flex-shrink-0 items-center justify-center">
                        {avatar.type === "image" ? (
                          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-soft-gray-200/70 bg-soft-gray-100 shadow-sm">
                            <img
                              src={avatar.value}
                              alt={`Avatar de ${member.displayName}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-celeste-100 text-2xl shadow-sm dark:bg-celeste-500/20">
                            {avatar.value}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                            {member.displayName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-dracula-comment">
                            {member.email}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className="inline-flex items-center rounded-full bg-celeste-100 px-2 py-0.5 text-[11px] font-semibold text-celeste-700 dark:bg-celeste-500/20 dark:text-celeste-200">
                            {member.role}
                          </span>
                          {member.modules.slice(0, 3).map((module) => (
                            <span
                              key={`${member.id}-${module}`}
                              className="inline-flex items-center rounded-full border border-soft-gray-200/70 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-dracula-selection dark:text-dracula-comment"
                            >
                              {module}
                            </span>
                          ))}
                          {member.modules.length > 3 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedModulesMemberId((prev) =>
                                  prev === member.id ? null : member.id
                                )
                              }
                              className="inline-flex items-center rounded-full border border-soft-gray-200/70 px-2 py-0.5 text-[10px] font-semibold text-celeste-600 transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-selection dark:text-dracula-cyan dark:hover:border-dracula-purple"
                            >
                              +{member.modules.length - 3}
                            </button>
                          ) : null}
                        </div>
                        {member.modules.length > 3 &&
                        expandedModulesMemberId === member.id ? (
                          <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-soft-gray-200/70 bg-soft-gray-50/80 p-2 text-[10px] text-slate-500 dark:border-dracula-selection dark:bg-dracula-current/20 dark:text-dracula-comment">
                            {member.modules.slice(3).map((module) => (
                              <span
                                key={`${member.id}-extra-${module}`}
                                className="inline-flex items-center rounded-full border border-soft-gray-200/70 px-2 py-0.5 font-medium dark:border-dracula-selection"
                              >
                                {module}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setAvatarEditorMemberId((prev) =>
                                prev === member.id ? null : member.id
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-celeste-200/70 px-3 py-1.5 text-xs font-semibold text-celeste-600 transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-purple/40 dark:text-dracula-cyan dark:hover:border-dracula-purple dark:hover:bg-dracula-cyan/10"
                          >
                            <Smile className="h-4 w-4" /> Personalizar avatar
                          </button>
                        </div>
                        {avatarEditorMemberId === member.id ? (
                          <div className="space-y-3 rounded-xl border border-soft-gray-200/70 bg-soft-gray-50/80 p-3 text-xs dark:border-dracula-selection dark:bg-dracula-current/20">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-slate-600 dark:text-dracula-comment">
                                Opciones rápidas
                              </p>
                              <button
                                type="button"
                                onClick={() => setAvatarEditorMemberId(null)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-soft-gray-200/70 text-slate-400 transition hover:border-rose-200 hover:text-rose-500 dark:border-dracula-selection dark:text-dracula-comment dark:hover:border-dracula-red/60 dark:hover:text-dracula-red"
                                aria-label="Cerrar panel de avatar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {memberAvatarOptions.map((option) => (
                                <button
                                  key={option.emoji}
                                  type="button"
                                  onClick={() =>
                                    handleAvatarEmojiSelect(
                                      member,
                                      option.emoji
                                    )
                                  }
                                  disabled={isSaving}
                                  className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-[11px] font-medium transition ${
                                    option.emoji === member.avatarEmoji
                                      ? "border-celeste-300 bg-white text-celeste-600 shadow-sm"
                                      : "border-soft-gray-200 bg-white/70 text-slate-500 hover:border-celeste-200 hover:text-celeste-600"
                                  } disabled:opacity-60`}
                                >
                                  <span className="text-xl">
                                    {option.emoji}
                                  </span>
                                  <span className="mt-1 line-clamp-1">
                                    {option.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  document
                                    .getElementById(uploadInputId)
                                    ?.click()
                                }
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-60"
                              >
                                <Camera className="h-4 w-4" />{" "}
                                {isSaving ? "Guardando..." : "Subir foto"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAvatarReset(member)}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-full border border-soft-gray-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-celeste-200 hover:text-celeste-600 disabled:opacity-60 dark:border-dracula-selection dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-cyan"
                              >
                                <Image className="h-4 w-4" /> Restablecer
                              </button>
                              <input
                                id={uploadInputId}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) =>
                                  handleAvatarFileChange(member, event)
                                }
                              />
                            </div>
                          </div>
                        ) : null}
                        <p className="text-[11px] text-slate-400 dark:text-dracula-comment">
                          Invitado el{" "}
                          {new Date(member.invitedAt).toLocaleDateString()} por{" "}
                          {member.invitedBy || "Administrador"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Próximamente */}
      <div className="rounded-2xl border border-soft-gray-200/70 bg-white p-6 shadow-sm dark:border-dracula-current dark:bg-dracula-bg">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-celeste-200/50 to-mint-200/50">
            <Settings className="h-6 w-6 text-celeste-500 dark:text-dracula-cyan" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
              Más configuraciones
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-dracula-comment">
              Próximamente agregaremos más opciones de configuración para
              personalizar tu experiencia
            </p>
            <span className="mt-4 inline-block rounded-full bg-soft-gray-100 px-4 py-2 text-xs font-semibold uppercase text-slate-400 dark:bg-dracula-current dark:text-dracula-comment">
              Próximamente
            </span>
          </div>
        </div>
      </div>

      {/* Modal de Notificaciones */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/70 bg-white/95 p-6 shadow-2xl dark:border-dracula-current dark:bg-dracula-bg/95">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-800 dark:text-dracula-foreground">
                Enviar Notificación Push
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-soft-gray-100 hover:text-slate-600 dark:text-dracula-comment dark:hover:bg-dracula-selection"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Mensajes rápidos */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
                  Mensajes rápidos
                </label>
                <div className="grid gap-2">
                  {quickMessages.map((msg, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setTitle(msg.title);
                        setMessage(msg.message);
                      }}
                      className="rounded-xl border border-soft-gray-200/70 bg-white p-3 text-left text-xs transition hover:border-celeste-200 hover:bg-celeste-50/50 dark:border-dracula-current dark:bg-dracula-current dark:hover:border-dracula-purple dark:hover:bg-dracula-selection"
                    >
                      <p className="font-semibold text-slate-700 dark:text-dracula-foreground">
                        {msg.title}
                      </p>
                      <p className="mt-1 text-slate-500 dark:text-dracula-comment">
                        {msg.message}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
                  Título de la notificación
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: ⚠️ Stock crítico en EPP"
                  className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
                  maxLength={50}
                />
                <p className="mt-1 text-xs text-slate-400 dark:text-dracula-comment">
                  {title.length}/50 caracteres
                </p>
              </div>

              {/* Mensaje */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-dracula-comment">
                  Mensaje
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe el mensaje que verán los usuarios..."
                  rows={4}
                  className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200/50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
                  maxLength={150}
                />
                <p className="mt-1 text-xs text-slate-400 dark:text-dracula-comment">
                  {message.length}/150 caracteres
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-full border border-soft-gray-300 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-soft-gray-50 dark:border-dracula-current dark:text-dracula-comment dark:hover:bg-dracula-selection"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendNotification}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                >
                  <Send className="h-4 w-4" />
                  Enviar Notificación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === "general" && renderGeneralModal()}
      {activeSection === "healthAndSafety" && renderHealthAndSafetyModal()}
      {activeSection === "workforce" && renderWorkforceModal()}
      {activeSection === "documents" && renderDocumentsModal()}
      {activeSection === "catalogs" && renderCatalogsModal()}
      {activeSection === "access" && renderAccessModal()}
    </div>
  );
}
