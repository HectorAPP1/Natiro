import { useState, useMemo, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Briefcase,
  UserCheck,
  X,
  Pencil,
  Trash2,
  Phone,
  AlertCircle,
  Mail,
  MapPin,
  Grid3x3,
  List,
  ShieldCheck,
  ShieldOff,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useTrabajadoresFirestore, type TrabajadorFormData } from "../hooks/useTrabajadoresFirestore";

const AREAS_TRABAJO = [
  "Producción",
  "Mantenimiento",
  "Administración",
  "Logística",
  "Operaciones",
  "Calidad",
  "Seguridad",
  "Capital Humano",
  "Finanzas",
  "Ventas",
  "Compras",
  "Bodega",
  "Transporte",
  "Servicios Generales",
];

const LICENCIAS_CHILE = [
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "B",
  "C",
  "D",
  "E",
  "F",
];

const formatRut = (input: string): string => {
  const cleaned = input.replace(/[^0-9kK]/g, "").toUpperCase();
  if (cleaned.length <= 1) {
    return cleaned;
  }

  const cuerpo = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  const cuerpoFormateado = cuerpo
    .split("")
    .reverse()
    .reduce<string[]>((acc, digit, index) => {
      if (index !== 0 && index % 3 === 0) {
        acc.push(".");
      }
      acc.push(digit);
      return acc;
    }, [])
    .reverse()
    .join("");

  return `${cuerpoFormateado}-${dv}`;
};

const initialFormState = (): TrabajadorFormData => ({
  nombre: "",
  rut: "",
  fechaNacimiento: "",
  sexo: "masculino",
  cargo: "",
  areaTrabajo: "",
  subAreaTrabajo: "",
  nombreJefatura: "",
  fechaIngreso: "",
  tipoContrato: "indefinido",
  fechaVencimientoContrato: "",
  telefono: "",
  correoElectronico: "",
  numeroEmergencia: "",
  nombreContactoEmergencia: "",
  enfermedadCronica: "",
  alergias: "",
  alergiaCritica: false,
  tallaCamisa: "",
  tallaPantalon: "",
  tallaCalzado: "",
  grupoSanguineo: "",
  induccionHSE: false,
  fechaInduccionHSE: "",
  fechaUltimoExamen: "",
  fechaProximoExamen: "",
  restriccionesMedicas: "",
  mutualSeguridad: "",
  poseeLicencia: false,
  clasesLicencia: [],
  vigente: true,
});

export default function Trabajadores() {
  const {
    trabajadores,
    loading: firestoreLoading,
    error: firestoreError,
    addTrabajador,
    updateTrabajador,
    deleteTrabajador,
  } = useTrabajadoresFirestore();

  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [subAreaFilter, setSubAreaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("vigente");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TrabajadorFormData>(initialFormState());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "list">(() =>
    typeof window !== "undefined" && window.innerWidth >= 1024 ? "list" : "card"
  );
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const matches = window.innerWidth >= 1024;
      setIsDesktop(matches);
      setViewMode(matches ? "list" : "card");
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const subAreaOptions = useMemo(() => {
    const options = new Set<string>();
    trabajadores.forEach((trabajador) => {
      if (trabajador.subAreaTrabajo && trabajador.subAreaTrabajo.trim().length > 0) {
        options.add(trabajador.subAreaTrabajo.trim());
      }
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [trabajadores]);

  const filteredTrabajadores = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return trabajadores.filter((trabajador) => {
      const telefono = trabajador.telefono?.toLowerCase() ?? "";
      const correo = trabajador.correoElectronico?.toLowerCase() ?? "";
      const clases = Array.isArray(trabajador.clasesLicencia)
        ? trabajador.clasesLicencia.join(" ").toLowerCase()
        : "";

      const matchesSearch =
        normalizedQuery.length === 0 ||
        trabajador.nombre.toLowerCase().includes(normalizedQuery) ||
        trabajador.rut.toLowerCase().includes(normalizedQuery) ||
        trabajador.cargo.toLowerCase().includes(normalizedQuery) ||
        telefono.includes(normalizedQuery) ||
        correo.includes(normalizedQuery) ||
        clases.includes(normalizedQuery);

      const matchesArea =
        areaFilter === "all" || trabajador.areaTrabajo === areaFilter;

      const matchesSubArea =
        subAreaFilter === "all" || trabajador.subAreaTrabajo === subAreaFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "vigente" && trabajador.vigente) ||
        (statusFilter === "no_vigente" && !trabajador.vigente);

      return matchesSearch && matchesArea && matchesSubArea && matchesStatus;
    });
  }, [trabajadores, searchQuery, areaFilter, subAreaFilter, statusFilter]);

  const handleOpenModal = (trabajadorId?: string) => {
    if (trabajadorId) {
      const trabajador = trabajadores.find((t) => t.id === trabajadorId);
      if (trabajador) {
        setEditingId(trabajadorId);
        const { id, createdAt, updatedAt, ...formData } = trabajador;
        setFormState({
          ...initialFormState(),
          ...formData,
          poseeLicencia:
            formData.poseeLicencia ?? (formData.clasesLicencia?.length ?? 0) > 0,
          clasesLicencia: formData.clasesLicencia ?? [],
          telefono: formData.telefono ?? "",
          correoElectronico: formData.correoElectronico ?? "",
          vigente: typeof formData.vigente === "boolean" ? formData.vigente : true,
        });
      }
    } else {
      setEditingId(null);
      setFormState(initialFormState());
    }
    setIsModalOpen(true);
    setFormError(null);
  };

  const toggleLicenciaClase = (clase: string) => {
    setFormState((prev) => {
      const alreadySelected = prev.clasesLicencia.includes(clase);
      return {
        ...prev,
        clasesLicencia: alreadySelected
          ? prev.clasesLicencia.filter((item) => item !== clase)
          : [...prev.clasesLicencia, clase],
      };
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormState(initialFormState());
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const payload: TrabajadorFormData = {
        ...formState,
        clasesLicencia: formState.poseeLicencia ? formState.clasesLicencia : [],
        telefono: formState.telefono ?? "",
        correoElectronico: formState.correoElectronico ?? "",
        vigente: formState.vigente ?? true,
      };

      if (editingId) {
        await updateTrabajador(editingId, payload);
      } else {
        await addTrabajador(payload);
      }
      handleCloseModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar este trabajador?")) {
      try {
        await deleteTrabajador(id);
      } catch (err) {
        alert("Error al eliminar trabajador");
      }
    }
  };

  const handleToggleVigente = async (trabajadorId: string, vigenteActual: boolean) => {
    try {
      await updateTrabajador(trabajadorId, { vigente: !vigenteActual });
    } catch (err) {
      alert("Error al actualizar vigencia");
    }
  };

  const handleExportToExcel = () => {
    if (filteredTrabajadores.length === 0) return;

    const exportData = filteredTrabajadores.map((trabajador) => ({
      Nombre: trabajador.nombre,
      RUT: trabajador.rut,
      "Fecha de Nacimiento": trabajador.fechaNacimiento,
      Sexo: trabajador.sexo,
      Cargo: trabajador.cargo,
      "Área": trabajador.areaTrabajo,
      "Sub-área": trabajador.subAreaTrabajo || "—",
      Jefatura: trabajador.nombreJefatura || "—",
      "Fecha Ingreso": trabajador.fechaIngreso,
      "Tipo Contrato":
        trabajador.tipoContrato === "indefinido"
          ? "Indefinido"
          : trabajador.tipoContrato === "plazo_fijo"
          ? "Plazo Fijo"
          : "Faena",
      "Teléfono": trabajador.telefono || "—",
      "Correo": trabajador.correoElectronico || "—",
      "Contacto Emergencia": trabajador.nombreContactoEmergencia || "—",
      "Teléfono Emergencia": trabajador.numeroEmergencia || "—",
      "Mutual": trabajador.mutualSeguridad || "—",
      "Licencias": trabajador.poseeLicencia && trabajador.clasesLicencia.length > 0
        ? trabajador.clasesLicencia.sort().join(", ")
        : "—",
      Vigente: trabajador.vigente ? "Sí" : "No",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet["!cols"] = [
      { wch: 25 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 24 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 28 },
      { wch: 26 },
      { wch: 26 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 10 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trabajadores");

    const statusLabel =
      statusFilter === "vigente"
        ? "vigentes"
        : statusFilter === "no_vigente"
        ? "no_vigentes"
        : "todos";

    const fileName = `Trabajadores_${statusLabel}_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  const getAvatarIcon = (sexo: string) => {
    if (sexo === "femenino") {
      return "👷🏻‍♀️";
    }
    if (sexo === "masculino") {
      return "👷🏻‍♂️";
    }
    return "👷🏻‍♂️";
  };

  if (firestoreLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-celeste-300 border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-600 dark:text-dracula-comment">
            Cargando trabajadores...
          </p>
        </div>
      </div>
    );
  }

  if (firestoreError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-3xl border border-rose-200/80 bg-rose-50/80 p-8 text-center">
          <p className="text-sm text-rose-600">{firestoreError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-4xl border border-white/70 bg-white/95 p-4 sm:p-6 lg:p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/95">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
              Gestión de Personas
            </p>
            <h2 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
              Trabajadores
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-dracula-comment">
              Administra la información de los trabajadores, sus cargos, áreas y el historial de EPP asignados.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              onClick={handleExportToExcel}
              disabled={filteredTrabajadores.length === 0}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-mint-200/70 bg-white/80 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-600 shadow-sm transition hover:border-mint-300 hover:bg-mint-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-green dark:hover:border-dracula-green dark:hover:bg-dracula-bg"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
            <div className="flex items-center gap-2 rounded-full border border-soft-gray-200/70 bg-white p-1 shadow-sm dark:border-dracula-current dark:bg-dracula-current">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  viewMode === "card"
                    ? "bg-celeste-100 text-celeste-600 dark:bg-dracula-purple/30 dark:text-dracula-purple"
                    : "text-slate-500 hover:text-slate-700 dark:text-dracula-comment dark:hover:text-dracula-foreground"
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
                Tarjetas
              </button>
              {isDesktop && (
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    viewMode === "list"
                      ? "bg-celeste-100 text-celeste-600 dark:bg-dracula-purple/30 dark:text-dracula-purple"
                      : "text-slate-500 hover:text-slate-700 dark:text-dracula-comment dark:hover:text-dracula-foreground"
                  }`}
                >
                  <List className="h-4 w-4" />
                  Lista
                </button>
              )}
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg dark:from-dracula-purple dark:via-dracula-pink dark:to-dracula-cyan dark:text-dracula-bg"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Nuevo Trabajador</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-dracula-comment" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, RUT o cargo..."
              className="w-full rounded-2xl border border-soft-gray-200/70 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground dark:placeholder-dracula-comment"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <select
              value={areaFilter}
              onChange={(e) => {
                setAreaFilter(e.target.value);
                setSubAreaFilter("all");
              }}
              className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            >
              <option value="all">Todas las áreas</option>
              {AREAS_TRABAJO.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>

            <select
              value={subAreaFilter}
              onChange={(e) => setSubAreaFilter(e.target.value)}
              className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground disabled:opacity-60"
              disabled={subAreaOptions.length === 0}
            >
              <option value="all">Todas las sub-áreas</option>
              {subAreaOptions.map((subArea) => (
                <option key={subArea} value={subArea}>
                  {subArea}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
            >
              <option value="vigente">Vigentes</option>
              <option value="no_vigente">No vigentes</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>

        {/* Lista de trabajadores */}
        {filteredTrabajadores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="h-20 w-20 text-celeste-200 dark:text-dracula-cyan/30 mb-6" />
            <h3 className="text-2xl font-semibold text-slate-700 dark:text-dracula-foreground mb-3">
              {trabajadores.length === 0 ? "No hay trabajadores registrados" : "No se encontraron resultados"}
            </h3>
            <p className="text-slate-500 dark:text-dracula-comment max-w-md">
              {trabajadores.length === 0
                ? "Comienza agregando tu primer trabajador haciendo clic en el botón 'Nuevo Trabajador'."
                : "Intenta ajustar los filtros de búsqueda."}
            </p>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrabajadores.map((trabajador) => (
              <div
                key={trabajador.id}
                className="rounded-2xl border border-soft-gray-200/70 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-dracula-current dark:bg-dracula-current/50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-celeste-100 text-3xl dark:bg-dracula-cyan/20">
                      {getAvatarIcon(trabajador.sexo)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-dracula-foreground">
                        {trabajador.nombre}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-dracula-comment">
                        {trabajador.rut}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenModal(trabajador.id)}
                      className="rounded-lg p-2 text-slate-600 transition hover:bg-celeste-50 hover:text-celeste-600 dark:text-dracula-comment dark:hover:bg-dracula-cyan/10 dark:hover:text-dracula-cyan"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(trabajador.id)}
                      className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 dark:text-dracula-comment dark:hover:bg-dracula-red/10 dark:hover:text-dracula-red"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-dracula-comment">
                    <Briefcase className="h-4 w-4" />
                    <span>{trabajador.cargo}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-dracula-comment">
                    <MapPin className="h-4 w-4" />
                    <span>{trabajador.areaTrabajo}</span>
                  </div>
                  {trabajador.telefono && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-dracula-comment">
                      <Phone className="h-4 w-4" />
                      <span>{trabajador.telefono}</span>
                    </div>
                  )}
                  {trabajador.correoElectronico && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-dracula-comment">
                      <Mail className="h-4 w-4" />
                      <span>{trabajador.correoElectronico}</span>
                    </div>
                  )}
                  {trabajador.numeroEmergencia && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-dracula-comment">
                      <AlertCircle className="h-4 w-4" />
                      <span>{trabajador.numeroEmergencia}</span>
                    </div>
                  )}
                  {trabajador.poseeLicencia && trabajador.clasesLicencia.length > 0 && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-dracula-comment">
                      <UserCheck className="h-4 w-4" />
                      <span>
                        Licencias: {trabajador.clasesLicencia.sort().join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-soft-gray-200/70 text-xs dark:border-dracula-current">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-dracula-comment">
                      Ingreso: {new Date(trabajador.fechaIngreso).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          trabajador.vigente
                            ? "bg-mint-100 text-mint-700 dark:bg-dracula-green/20 dark:text-dracula-green"
                            : "bg-amber-100 text-amber-700 dark:bg-dracula-orange/20 dark:text-dracula-orange"
                        }`}
                      >
                        {trabajador.vigente ? "Vigente" : "No vigente"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 font-medium ${
                          trabajador.tipoContrato === "indefinido"
                            ? "bg-mint-100 text-mint-700 dark:bg-dracula-green/20 dark:text-dracula-green"
                            : "bg-amber-100 text-amber-700 dark:bg-dracula-orange/20 dark:text-dracula-orange"
                        }`}
                      >
                        {trabajador.tipoContrato === "indefinido"
                          ? "Indefinido"
                          : trabajador.tipoContrato === "plazo_fijo"
                          ? "Plazo Fijo"
                          : "Faena"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleToggleVigente(trabajador.id, trabajador.vigente)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                      trabajador.vigente
                        ? "border-amber-200/70 bg-white text-amber-500 hover:border-amber-300 hover:bg-amber-50 dark:border-dracula-orange/40 dark:bg-dracula-current dark:text-dracula-orange dark:hover:border-dracula-orange dark:hover:bg-dracula-orange/10"
                        : "border-mint-200/70 bg-white text-mint-500 hover:border-mint-300 hover:bg-mint-50 dark:border-dracula-green/40 dark:bg-dracula-current dark:text-dracula-green dark:hover:border-dracula-green dark:hover:bg-dracula-green/10"
                    }`}
                    aria-label={trabajador.vigente ? "Marcar como no vigente" : "Marcar como vigente"}
                  >
                    {trabajador.vigente ? (
                      <ShieldOff className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenModal(trabajador.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-celeste-200/70 bg-white text-celeste-500 transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-purple/40 dark:bg-dracula-current dark:text-dracula-cyan dark:hover:border-dracula-purple dark:hover:bg-dracula-cyan/10"
                    aria-label="Editar trabajador"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(trabajador.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/70 bg-white text-rose-500 transition hover:border-rose-300 hover:bg-rose-50 dark:border-dracula-red/40 dark:bg-dracula-current dark:text-dracula-red dark:hover:border-dracula-red dark:hover:bg-dracula-red/10"
                    aria-label="Eliminar trabajador"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400 dark:scrollbar-thumb-dracula-current dark:scrollbar-track-dracula-bg dark:hover:scrollbar-thumb-dracula-purple rounded-2xl border border-soft-gray-200/70 shadow-sm dark:border-dracula-current">
              <table className="w-full min-w-[960px] divide-y divide-soft-gray-200/70 bg-white dark:bg-dracula-bg dark:divide-dracula-current">
                <thead className="bg-soft-gray-50/60 text-slate-600 dark:bg-dracula-current/40 dark:text-dracula-comment">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em]">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em]">RUT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em]">Cargo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em]">Área</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em]">Teléfono</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em]">Correo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em]">Ingreso</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em]">Contrato</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em]">Licencias</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em]">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.3em]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft-gray-200/60 text-sm dark:divide-dracula-current/60">
                  {filteredTrabajadores.map((trabajador) => (
                    <tr key={trabajador.id} className="bg-white/95 hover:bg-celeste-50/40 transition dark:bg-dracula-current/30 dark:hover:bg-dracula-current/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-celeste-100 text-2xl dark:bg-dracula-cyan/20">
                            {getAvatarIcon(trabajador.sexo)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-dracula-foreground">
                              {trabajador.nombre}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-dracula-comment">{trabajador.rut}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-dracula-comment">{trabajador.cargo}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-dracula-comment">{trabajador.areaTrabajo}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-dracula-comment">{trabajador.telefono || "—"}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-dracula-comment">{trabajador.correoElectronico || "—"}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-dracula-comment">
                        {trabajador.fechaIngreso ? new Date(trabajador.fechaIngreso).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            trabajador.tipoContrato === "indefinido"
                              ? "bg-mint-100 text-mint-700 dark:bg-dracula-green/20 dark:text-dracula-green"
                              : "bg-amber-100 text-amber-700 dark:bg-dracula-orange/20 dark:text-dracula-orange"
                          }`}
                        >
                          {trabajador.tipoContrato === "indefinido"
                            ? "Indefinido"
                            : trabajador.tipoContrato === "plazo_fijo"
                            ? "Plazo Fijo"
                            : "Faena"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-dracula-comment">
                        {trabajador.poseeLicencia && trabajador.clasesLicencia.length > 0
                          ? trabajador.clasesLicencia.sort().join(", ")
                          : "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            trabajador.vigente
                              ? "bg-mint-100 text-mint-700 dark:bg-dracula-green/20 dark:text-dracula-green"
                              : "bg-amber-100 text-amber-700 dark:bg-dracula-orange/20 dark:text-dracula-orange"
                          }`}
                        >
                          {trabajador.vigente ? "Vigente" : "No vigente"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => handleToggleVigente(trabajador.id, trabajador.vigente)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                              trabajador.vigente
                                ? "border-amber-200/70 bg-white text-amber-500 hover:border-amber-300 hover:bg-amber-50 dark:border-dracula-orange/40 dark:bg-dracula-current dark:text-dracula-orange dark:hover:border-dracula-orange dark:hover:bg-dracula-orange/10"
                                : "border-mint-200/70 bg-white text-mint-500 hover:border-mint-300 hover:bg-mint-50 dark:border-dracula-green/40 dark:bg-dracula-current dark:text-dracula-green dark:hover:border-dracula-green dark:hover:bg-dracula-green/10"
                            }`}
                            aria-label={trabajador.vigente ? "Marcar como no vigente" : "Marcar como vigente"}
                          >
                            {trabajador.vigente ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenModal(trabajador.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-celeste-200/70 bg-white text-celeste-500 transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-purple/40 dark:bg-dracula-current dark:text-dracula-cyan dark:hover:border-dracula-purple dark:hover:bg-dracula-cyan/10"
                            aria-label="Editar trabajador"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(trabajador.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/70 bg-white text-rose-500 transition hover:border-rose-300 hover:bg-rose-50 dark:border-dracula-red/40 dark:bg-dracula-current dark:text-dracula-red dark:hover:border-dracula-red dark:hover:bg-dracula-red/10"
                            aria-label="Eliminar trabajador"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Modal de formulario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-screen items-start justify-center px-4 py-10 sm:px-6 lg:py-16">
            <div className="relative w-full max-w-5xl rounded-[28px] border border-white/70 bg-white/95 px-6 py-8 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.6)] dark:border-dracula-current dark:bg-dracula-bg/95 sm:px-8 lg:px-10 lg:py-10">
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground sm:right-6 sm:top-6 sm:h-10 sm:w-10"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
                  {editingId ? "Editar trabajador" : "Nuevo trabajador"}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
                  {editingId ? "Actualizar registro" : "Registrar trabajador"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-dracula-comment">
                  Completa o actualiza la información del trabajador para cumplir con los requisitos HSE, ISO 45001 y la ley 16.744.
                </p>
              </div>

              {formError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600 dark:border-dracula-red/30 dark:bg-dracula-red/10 dark:text-dracula-red">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Datos Personales */}
                <div className="rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 p-5 dark:border-dracula-current dark:bg-dracula-current/30">
                  <h4 className="mb-4 font-semibold text-slate-700 dark:text-dracula-foreground">
                    📋 Datos Personales
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.nombre}
                        onChange={(e) => setFormState({ ...formState, nombre: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        RUT *
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.rut}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            rut: formatRut(e.target.value),
                          })
                        }
                        placeholder="12.345.678-9"
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Fecha de Nacimiento *
                      </label>
                      <input
                        type="date"
                        required
                        value={formState.fechaNacimiento}
                        onChange={(e) => setFormState({ ...formState, fechaNacimiento: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Sexo *
                      </label>
                      <select
                        required
                        value={formState.sexo}
                        onChange={(e) => setFormState({ ...formState, sexo: e.target.value as any })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      >
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Teléfono de contacto
                      </label>
                      <input
                        type="tel"
                        value={formState.telefono}
                        onChange={(e) => setFormState({ ...formState, telefono: e.target.value })}
                        placeholder="+56 9 1234 5678"
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        value={formState.correoElectronico}
                        onChange={(e) => setFormState({ ...formState, correoElectronico: e.target.value })}
                        placeholder="nombre@empresa.cl"
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Datos Laborales */}
                <div className="rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 p-5 dark:border-dracula-current dark:bg-dracula-current/30">
                  <h4 className="mb-4 font-semibold text-slate-700 dark:text-dracula-foreground">
                    💼 Datos Laborales
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Cargo *
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.cargo}
                        onChange={(e) => setFormState({ ...formState, cargo: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Área de Trabajo *
                      </label>
                      <select
                        required
                        value={formState.areaTrabajo}
                        onChange={(e) => setFormState({ ...formState, areaTrabajo: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      >
                        <option value="">Seleccionar...</option>
                        {AREAS_TRABAJO.map((area) => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Sub-área de Trabajo
                      </label>
                      <input
                        type="text"
                        value={formState.subAreaTrabajo}
                        onChange={(e) => setFormState({ ...formState, subAreaTrabajo: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Nombre Jefatura
                      </label>
                      <input
                        type="text"
                        value={formState.nombreJefatura}
                        onChange={(e) => setFormState({ ...formState, nombreJefatura: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Fecha de Ingreso *
                      </label>
                      <input
                        type="date"
                        required
                        value={formState.fechaIngreso}
                        onChange={(e) => setFormState({ ...formState, fechaIngreso: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Tipo de Contrato *
                      </label>
                      <select
                        required
                        value={formState.tipoContrato}
                        onChange={(e) => setFormState({ ...formState, tipoContrato: e.target.value as any })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      >
                        <option value="indefinido">Indefinido</option>
                        <option value="plazo_fijo">Plazo Fijo</option>
                        <option value="faena">Faena</option>
                      </select>
                    </div>
                    {formState.tipoContrato !== "indefinido" && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                          Fecha Vencimiento Contrato
                        </label>
                        <input
                          type="date"
                          value={formState.fechaVencimientoContrato}
                          onChange={(e) => setFormState({ ...formState, fechaVencimientoContrato: e.target.value })}
                          className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Contacto de Emergencia */}
                <div className="rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 p-5 dark:border-dracula-current dark:bg-dracula-current/30">
                  <h4 className="mb-4 font-semibold text-slate-700 dark:text-dracula-foreground">
                    🚨 Contacto de Emergencia
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Nombre Contacto (opcional)
                      </label>
                      <input
                        type="text"
                        value={formState.nombreContactoEmergencia}
                        onChange={(e) => setFormState({ ...formState, nombreContactoEmergencia: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Teléfono Emergencia (opcional)
                      </label>
                      <input
                        type="tel"
                        value={formState.numeroEmergencia}
                        onChange={(e) => setFormState({ ...formState, numeroEmergencia: e.target.value })}
                        placeholder="+56 9 1234 5678"
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Datos de Salud */}
                <div className="rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 p-5 dark:border-dracula-current dark:bg-dracula-current/30">
                  <h4 className="mb-4 font-semibold text-slate-700 dark:text-dracula-foreground">
                    🏥 Datos de Salud
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Grupo Sanguíneo (opcional)
                      </label>
                      <select
                        value={formState.grupoSanguineo}
                        onChange={(e) => setFormState({ ...formState, grupoSanguineo: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Enfermedad Crónica (opcional)
                      </label>
                      <input
                        type="text"
                        value={formState.enfermedadCronica}
                        onChange={(e) => setFormState({ ...formState, enfermedadCronica: e.target.value })}
                        placeholder="Escribir 'no' si no tiene"
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Alergias (opcional)
                      </label>
                      <input
                        type="text"
                        value={formState.alergias}
                        onChange={(e) => setFormState({ ...formState, alergias: e.target.value })}
                        placeholder="Escribir 'no' si no tiene"
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="alergiaCritica"
                        checked={formState.alergiaCritica}
                        onChange={(e) => setFormState({ ...formState, alergiaCritica: e.target.checked })}
                        className="h-4 w-4 rounded border-soft-gray-300 text-celeste-500 focus:ring-celeste-500"
                      />
                      <label htmlFor="alergiaCritica" className="text-sm font-medium text-slate-700 dark:text-dracula-foreground">
                        ¿Alergia crítica?
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Restricciones Médicas (opcional)
                      </label>
                      <textarea
                        value={formState.restriccionesMedicas}
                        onChange={(e) => setFormState({ ...formState, restriccionesMedicas: e.target.value })}
                        placeholder="Escribir 'no' si no tiene restricciones"
                        rows={2}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Tallas para EPP */}
                <div className="rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 p-5 dark:border-dracula-current dark:bg-dracula-current/30">
                  <h4 className="mb-4 font-semibold text-slate-700 dark:text-dracula-foreground">
                    👕 Tallas para EPP
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Talla Polera (opcional)
                      </label>
                      <select
                        value={formState.tallaCamisa}
                        onChange={(e) => setFormState({ ...formState, tallaCamisa: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                        <option value="XXXL">XXXL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Talla Pantalón (opcional)
                      </label>
                      <input
                        type="text"
                        value={formState.tallaPantalon}
                        onChange={(e) => setFormState({ ...formState, tallaPantalon: e.target.value })}
                        placeholder="Ej: 32, 34, 36..."
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Talla Calzado (opcional)
                      </label>
                      <input
                        type="text"
                        value={formState.tallaCalzado}
                        onChange={(e) => setFormState({ ...formState, tallaCalzado: e.target.value })}
                        placeholder="Ej: 40, 41, 42..."
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Licencia de Conducir */}
                <div className="rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 p-5 dark:border-dracula-current dark:bg-dracula-current/30">
                  <h4 className="mb-4 font-semibold text-slate-700 dark:text-dracula-foreground">
                    🚗 Licencia de Conducir
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="poseeLicencia"
                        checked={formState.poseeLicencia}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            poseeLicencia: e.target.checked,
                            clasesLicencia: e.target.checked ? prev.clasesLicencia : [],
                          }))
                        }
                        className="h-4 w-4 rounded border-soft-gray-300 text-celeste-500 focus:ring-celeste-500"
                      />
                      <label htmlFor="poseeLicencia" className="text-sm font-medium text-slate-700 dark:text-dracula-foreground">
                        ¿Posee licencia de conducir?
                      </label>
                    </div>

                    {formState.poseeLicencia && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {LICENCIAS_CHILE.map((clase) => (
                          <label
                            key={clase}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                              formState.clasesLicencia.includes(clase)
                                ? "border-celeste-300 bg-celeste-50 text-celeste-700 dark:border-dracula-cyan dark:bg-dracula-cyan/10 dark:text-dracula-cyan"
                                : "border-soft-gray-200/70 bg-white text-slate-600 dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-comment"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formState.clasesLicencia.includes(clase)}
                              onChange={() => toggleLicenciaClase(clase)}
                              className="h-4 w-4 rounded border-soft-gray-300 text-celeste-500 focus:ring-celeste-500"
                            />
                            <span>Clase {clase}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Datos HSE (ISO 45001 / Ley 16744) */}
                <div className="rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 p-5 dark:border-dracula-current dark:bg-dracula-current/30">
                  <h4 className="mb-4 font-semibold text-slate-700 dark:text-dracula-foreground">
                    🛡️ Datos HSE (ISO 45001 / Ley 16744)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Mutual de Seguridad (opcional)
                      </label>
                      <select
                        value={formState.mutualSeguridad}
                        onChange={(e) => setFormState({ ...formState, mutualSeguridad: e.target.value as any })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="ACHS">ACHS</option>
                        <option value="Mutual">Mutual</option>
                        <option value="ISL">ISL</option>
                        <option value="otra">Otra</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="induccionHSE"
                        checked={formState.induccionHSE}
                        onChange={(e) => setFormState({ ...formState, induccionHSE: e.target.checked })}
                        className="h-4 w-4 rounded border-soft-gray-300 text-celeste-500 focus:ring-celeste-500"
                      />
                      <label htmlFor="induccionHSE" className="text-sm font-medium text-slate-700 dark:text-dracula-foreground">
                        ¿Ha recibido Inducción HSE?
                      </label>
                    </div>
                    {formState.induccionHSE && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                          Fecha Inducción HSE (opcional)
                        </label>
                        <input
                          type="date"
                          value={formState.fechaInduccionHSE}
                          onChange={(e) => setFormState({ ...formState, fechaInduccionHSE: e.target.value })}
                          className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Fecha Último Examen Ocupacional (opcional)
                      </label>
                      <input
                        type="date"
                        value={formState.fechaUltimoExamen}
                        onChange={(e) => setFormState({ ...formState, fechaUltimoExamen: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Fecha Próximo Examen (opcional)
                      </label>
                      <input
                        type="date"
                        value={formState.fechaProximoExamen}
                        onChange={(e) => setFormState({ ...formState, fechaProximoExamen: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="inline-flex items-center justify-center rounded-full border border-soft-gray-300 px-6 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-mint-200/90 via-white to-celeste-200 px-6 py-2 text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Guardando..."
                      : editingId
                      ? "Actualizar trabajador"
                      : "Guardar trabajador"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
