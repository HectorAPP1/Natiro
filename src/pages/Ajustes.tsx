import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Bell,
  ShieldCheck,
  Smartphone,
  UserCircle,
  Palette,
  Save,
  Smile,
  Camera,
  Image,
  Loader2,
  Monitor,
  SunMedium,
  MoonStar,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAccessControl } from "../hooks/useAccessControl";
import { useCompanyMembers } from "../hooks/useCompanyMembers";
import type { AccessMember, AccessRole } from "../types/company";
import { useTheme } from "../context/ThemeContext";

const notificationPresets = [
  {
    id: "inventory",
    title: "Alertas de inventario",
    description: "Recibe notificaciones cuando el stock de EPP llegue a niveles críticos.",
  },
  {
    id: "deliveries",
    title: "Confirmaciones de entrega",
    description: "Sigue el estado de las entregas a trabajadores y sus firmas digitales.",
  },
  {
    id: "reports",
    title: "Reportes programados",
    description: "Obtén resúmenes semanales de actividad y métricas clave.",
  },
];

export default function Ajustes() {
  const { user } = useAuth();
  const { role } = useAccessControl();
  const {
    members,
    loading: membersLoading,
    updateMemberAvatar,
  } = useCompanyMembers();
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>({
    inventory: true,
    deliveries: true,
    reports: false,
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { preference: themePreference, setPreference: setThemePreference, theme } = useTheme();

  const normalizedEmail = user?.email?.toLowerCase() ?? null;
  const activeMember = useMemo<AccessMember | undefined>(() => {
    if (!normalizedEmail) {
      return undefined;
    }
    return members.find((member) => member.email.toLowerCase() === normalizedEmail);
  }, [members, normalizedEmail]);

  const defaultRoleEmojis = useMemo<Record<AccessRole, string>>(
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

  const avatarDisplay = useMemo(() => {
    if (activeMember?.avatarUrl) {
      return { type: "image" as const, value: activeMember.avatarUrl };
    }
    const fallbackRole: AccessRole = activeMember?.role ?? role;
    const baseEmoji = activeMember?.avatarEmoji ?? defaultRoleEmojis[fallbackRole] ?? "🙂";
    return { type: "emoji" as const, value: baseEmoji };
  }, [activeMember, defaultRoleEmojis, role]);

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
      reader.onerror = () => reject(reader.error ?? new Error("Error al leer archivo"));
      reader.readAsDataURL(file);
    });

  const handleAvatarEmojiSelect = async (emoji: string) => {
    if (!activeMember) {
      return;
    }
    setActionError(null);
    setAvatarSaving(true);
    try {
      await updateMemberAvatar({ id: activeMember.id, avatarEmoji: emoji, avatarUrl: null });
    } catch (error) {
      console.error("Error al actualizar avatar", error);
      setActionError("No se pudo actualizar el avatar. Intenta nuevamente.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!activeMember) {
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setActionError("La imagen debe pesar menos de 2 MB.");
      event.target.value = "";
      return;
    }
    setActionError(null);
    setAvatarSaving(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await updateMemberAvatar({ id: activeMember.id, avatarEmoji: null, avatarUrl: dataUrl });
    } catch (error) {
      console.error("Error al subir avatar", error);
      setActionError("No se pudo subir la imagen. Intenta nuevamente.");
    } finally {
      setAvatarSaving(false);
      event.target.value = "";
    }
  };

  const handleAvatarReset = async () => {
    if (!activeMember) {
      return;
    }
    setActionError(null);
    setAvatarSaving(true);
    try {
      await updateMemberAvatar({ id: activeMember.id, avatarEmoji: null, avatarUrl: null });
    } catch (error) {
      console.error("Error al restablecer avatar", error);
      setActionError("No se pudo restablecer el avatar. Intenta nuevamente.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const uploadInputId = "ajustes-avatar-upload";

  const handleToggleNotification = (id: string) => {
    setNotificationPrefs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-8">
      <section className="rounded-4xl border border-white/70 bg-white/95 p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/95">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-celeste-100 text-3xl dark:bg-dracula-cyan/20">
              {membersLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-celeste-500" />
              ) : (
                <UserCircle className="h-8 w-8 text-celeste-500 dark:text-dracula-cyan" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan/70">
                Ajustes personales
              </p>
              <h1 className="text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
                Preferencias de usuario
              </h1>
              <p className="text-sm text-slate-500 dark:text-dracula-comment">
                Personaliza tu experiencia en ClodiApp. Los cambios se aplican solo a tu cuenta.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full border border-celeste-200/70 px-4 py-1.5 text-xs font-semibold text-celeste-600 dark:border-dracula-purple/40 dark:text-dracula-cyan">
            Rol actual: {role}
          </span>
        </header>

        {activeMember ? (
          <div className="mt-4 flex flex-col gap-4 rounded-3xl border border-celeste-200/60 bg-white/90 p-4 text-xs shadow-sm dark:border-dracula-selection dark:bg-dracula-current/20">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-celeste-50 text-2xl dark:bg-dracula-current/40">
                {avatarDisplay.type === "image" ? (
                  <img
                    src={avatarDisplay.value}
                    alt={`Avatar de ${activeMember.displayName}`}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <span>{avatarDisplay.value}</span>
                )}
              </div>
              <div className="min-w-[200px]">
                <p className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                  {activeMember.displayName || user?.displayName || "Usuario"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-dracula-comment">
                  {activeMember.email}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAvatarEditorOpen((prev) => !prev)}
                  disabled={avatarSaving}
                  className="inline-flex items-center gap-2 rounded-full border border-celeste-200/70 bg-white px-3 py-1.5 text-xs font-semibold text-celeste-600 transition hover:border-celeste-300 hover:bg-celeste-50 disabled:opacity-60 dark:border-dracula-purple/40 dark:bg-dracula-current/40 dark:text-dracula-cyan"
                >
                  <Smile className="h-4 w-4" /> Personalizar avatar
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById(uploadInputId)?.click()}
                  disabled={avatarSaving}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-60"
                >
                  <Camera className="h-4 w-4" /> {avatarSaving ? "Guardando..." : "Subir foto"}
                </button>
                <button
                  type="button"
                  onClick={handleAvatarReset}
                  disabled={avatarSaving || (!activeMember.avatarEmoji && !activeMember.avatarUrl)}
                  className="inline-flex items-center gap-2 rounded-full border border-soft-gray-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-celeste-200 hover:text-celeste-600 disabled:opacity-60 dark:border-dracula-selection dark:text-dracula-comment"
                >
                  <Image className="h-4 w-4" /> Restablecer
                </button>
                <input
                  id={uploadInputId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
              </div>
            </div>
            {avatarEditorOpen ? (
              <div>
                <p className="font-semibold text-slate-600 dark:text-dracula-comment">
                  Opciones rápidas
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {memberAvatarOptions.map((option) => (
                    <button
                      key={option.emoji}
                      type="button"
                      onClick={() => handleAvatarEmojiSelect(option.emoji)}
                      disabled={avatarSaving}
                      className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-[11px] font-medium transition ${
                        option.emoji === activeMember.avatarEmoji
                          ? "border-celeste-300 bg-celeste-50 text-celeste-600 shadow-sm dark:border-dracula-cyan/40 dark:bg-dracula-current/30 dark:text-dracula-cyan"
                          : "border-soft-gray-200 bg-white text-slate-500 hover:border-celeste-200 hover:text-celeste-600 dark:border-dracula-selection dark:bg-dracula-bg/80 dark:text-dracula-comment"
                      } disabled:opacity-60`}
                    >
                      <span className="text-xl">{option.emoji}</span>
                      <span className="mt-1 line-clamp-1">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {actionError ? (
              <p className="text-[11px] text-rose-500">{actionError}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-celeste-200/60 bg-white/90 p-4 text-sm shadow-sm dark:border-dracula-selection dark:bg-dracula-current/25">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400 dark:text-dracula-cyan">
              Usuario
            </p>
            <p className="mt-2 text-base font-semibold text-slate-800 dark:text-dracula-foreground line-clamp-1">
              {activeMember?.displayName || user?.displayName || "Sin nombre"}
            </p>
            <p className="text-xs text-slate-500 dark:text-dracula-comment line-clamp-1">
              {activeMember?.email || user?.email || "Sin correo"}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-200/60 bg-rose-50/70 p-4 text-sm shadow-sm dark:border-dracula-red/40 dark:bg-dracula-red/10">
            <div className="flex items-center gap-2 text-rose-500 dark:text-dracula-red">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Seguridad</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-dracula-red">
              Activa el doble factor (2FA)
            </p>
            <p className="text-xs text-rose-500/80 dark:text-dracula-comment">
              Protege tu cuenta con un código adicional cada vez que inicies sesión.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200/60 bg-amber-50/70 p-4 text-sm shadow-sm dark:border-dracula-orange/40 dark:bg-dracula-orange/10">
            <div className="flex items-center gap-2 text-amber-600 dark:text-dracula-orange">
              <Bell className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Aviso</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-amber-600 dark:text-dracula-orange">
              Configura tus notificaciones
            </p>
            <p className="text-xs text-amber-600/80 dark:text-dracula-comment">
              Elige qué alertas recibirás por correo o dentro de ClodiApp.
            </p>
          </div>
          <div className="rounded-2xl border border-mint-200/60 bg-mint-50/70 p-4 text-sm shadow-sm dark:border-dracula-green/40 dark:bg-dracula-green/10">
            <div className="flex items-center gap-2 text-mint-600 dark:text-dracula-green">
              <Palette className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Personalización</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-mint-600 dark:text-dracula-green">
              Ajusta tu experiencia visual
            </p>
            <p className="text-xs text-mint-600/80 dark:text-dracula-comment">
              Define tema, idioma y accesibilidad según tu estilo de trabajo.
            </p>
          </div>
        </div>

      </section>

      <section className="rounded-4xl border border-white/70 bg-white/95 p-6 shadow-sm dark:border-dracula-current dark:bg-dracula-bg/95">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-celeste-100 text-celeste-600 dark:bg-dracula-cyan/20 dark:text-dracula-cyan">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
              Preferencias de apariencia
            </h2>
            <p className="text-sm text-slate-500 dark:text-dracula-comment">
              Selecciona cómo deseas visualizar ClodiApp en este dispositivo.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(
            [
              {
                value: "system" as const,
                label: "Automático",
                description: "Se adapta al tema del sistema.",
                icon: Monitor,
              },
              {
                value: "light" as const,
                label: "Claro",
                description: "Interfaz luminosa y definida.",
                icon: SunMedium,
              },
              {
                value: "dark" as const,
                label: "Oscuro",
                description: "Ideal para ambientes con poca luz.",
                icon: MoonStar,
              },
            ]
          ).map(({ value, label, description, icon: Icon }) => {
            const isActive = themePreference === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setThemePreference(value)}
                className={`rounded-2xl border p-4 text-left transition ${
                  isActive
                    ? "border-celeste-300 bg-celeste-50/80 text-celeste-700 shadow-sm dark:border-dracula-purple/40 dark:bg-dracula-current/30 dark:text-dracula-cyan"
                    : "border-soft-gray-200/70 bg-white text-slate-600 hover:border-celeste-200 hover:text-celeste-600 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-comment"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition ${
                      isActive
                        ? "border-celeste-300 bg-celeste-100 text-celeste-600 dark:border-dracula-purple/40 dark:bg-dracula-current/40 dark:text-dracula-cyan"
                        : "border-soft-gray-200 bg-soft-gray-50 text-slate-500 dark:border-dracula-selection dark:bg-dracula-current/30 dark:text-dracula-comment"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="mt-1 text-xs opacity-80">{description}</p>
                    {value === "system" ? (
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-dracula-comment">
                        Tema actual: {theme === "light" ? "Claro" : "Oscuro"}
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-4xl border border-white/70 bg-white/95 p-6 shadow-sm dark:border-dracula-current dark:bg-dracula-bg/95">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-dracula-purple/20 dark:text-dracula-purple">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
              Notificaciones
            </h2>
            <p className="text-sm text-slate-500 dark:text-dracula-comment">
              Activa o desactiva las alertas que recibirás por correo o en la aplicación.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {notificationPresets.map((preset) => {
            const enabled = notificationPrefs[preset.id];
            return (
              <label
                key={preset.id}
                className={`flex flex-col gap-2 rounded-2xl border p-4 transition ${
                  enabled
                    ? "border-purple-300 bg-purple-50/70 shadow-sm dark:border-dracula-purple/40 dark:bg-dracula-current/30"
                    : "border-soft-gray-200/70 bg-white hover:border-purple-200 dark:border-dracula-selection dark:bg-dracula-bg"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                      {preset.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-dracula-comment">
                      {preset.description}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => handleToggleNotification(preset.id)}
                    className="h-4 w-4 rounded border-purple-300 text-purple-500 focus:ring-purple-200"
                  />
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-4xl border border-white/70 bg-white/95 p-6 shadow-sm dark:border-dracula-current dark:bg-dracula-bg/95">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-500 dark:bg-dracula-red/20 dark:text-dracula-red">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
              Seguridad de la cuenta
            </h2>
            <p className="text-sm text-slate-500 dark:text-dracula-comment">
              Refuerza el acceso a tu cuenta activando medidas adicionales.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <label className="flex items-start gap-3 rounded-2xl border border-rose-200/60 bg-rose-50/60 p-4 text-sm text-rose-600 dark:border-dracula-red/40 dark:bg-dracula-red/10 dark:text-dracula-red">
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={(event) => setTwoFactorEnabled(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-rose-300 text-rose-500 focus:ring-rose-200"
            />
            <span>
              <strong className="block font-semibold">Activar doble factor (2FA)</strong>
              <span className="block text-xs text-rose-500/80 dark:text-dracula-comment">
                Requerirá un código enviado a tu correo o dispositivo móvil cada vez que inicies sesión.
              </span>
            </span>
          </label>
          <div className="rounded-2xl border border-soft-gray-200/70 bg-white/80 p-4 text-xs text-slate-500 dark:border-dracula-selection dark:bg-dracula-bg dark:text-dracula-comment">
            <p className="font-semibold text-slate-600 dark:text-dracula-foreground">
              Consejo rápido
            </p>
            <p className="mt-1 leading-relaxed">
              Actualiza tu contraseña al menos cada 90 días y evita reutilizar claves de otros servicios corporativos.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-4xl border border-white/70 bg-white/95 p-6 shadow-sm dark:border-dracula-current dark:bg-dracula-bg/95">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-dracula-current/30 dark:text-dracula-comment">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
              Dispositivos y sesiones
            </h2>
            <p className="text-sm text-slate-500 dark:text-dracula-comment">
              Revisa dónde se ha iniciado sesión con tu cuenta y cierra sesiones que no reconozcas.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-dracula-comment">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/70 p-3 dark:border-dracula-selection dark:bg-dracula-current/30">
            <span>
              Último inicio de sesión: {new Date().toLocaleString("es-CL")}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-500 dark:border-dracula-selection dark:text-dracula-comment dark:hover:border-dracula-red/60 dark:hover:text-dracula-red"
            >
              Cerrar todas las sesiones
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-dracula-comment">
            Nota: Estas acciones se sincronizarán cuando las funciones multi-dispositivo estén disponibles.
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-celeste-500 to-mint-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
        >
          <Save className="h-4 w-4" />
          Guardar preferencias (próximamente)
        </button>
      </div>
    </div>
  );
}
