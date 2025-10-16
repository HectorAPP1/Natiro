import { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  Briefcase,
  Calendar,
  UserCheck,
  X,
  Pencil,
  Trash2,
  UserCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { useTrabajadoresFirestore, type TrabajadorFormData } from "../hooks/useTrabajadoresFirestore";

const AREAS_TRABAJO = [
  "Producción",
  "Mantenimiento",
  "Administración",
  "Logística",
  "Operaciones",
  "Calidad",
  "Seguridad",
  "Recursos Humanos",
  "Finanzas",
  "Ventas",
  "Compras",
  "Bodega",
  "Transporte",
  "Servicios Generales",
];

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
  numeroEmergencia: "",
  nombreContactoEmergencia: "",
  enfermedadCronica: "no",
  alergias: "no",
  alergiaCritica: false,
  tallaCamisa: "",
  tallaPantalon: "",
  tallaCalzado: "",
  grupoSanguineo: "",
  induccionHSE: false,
  fechaInduccionHSE: "",
  fechaUltimoExamen: "",
  fechaProximoExamen: "",
  restriccionesMedicas: "no",
  mutualSeguridad: "ACHS",
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TrabajadorFormData>(initialFormState());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredTrabajadores = useMemo(() => {
    return trabajadores.filter((trabajador) => {
      const matchesSearch =
        trabajador.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trabajador.rut.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trabajador.cargo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesArea =
        areaFilter === "all" || trabajador.areaTrabajo === areaFilter;
      return matchesSearch && matchesArea;
    });
  }, [trabajadores, searchQuery, areaFilter]);

  const handleOpenModal = (trabajadorId?: string) => {
    if (trabajadorId) {
      const trabajador = trabajadores.find((t) => t.id === trabajadorId);
      if (trabajador) {
        setEditingId(trabajadorId);
        const { id, createdAt, updatedAt, ...formData } = trabajador;
        setFormState(formData);
      }
    } else {
      setEditingId(null);
      setFormState(initialFormState());
    }
    setIsModalOpen(true);
    setFormError(null);
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
      if (editingId) {
        await updateTrabajador(editingId, formState);
      } else {
        await addTrabajador(formState);
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

  const getAvatarIcon = (sexo: string) => {
    return sexo === "femenino" ? "👩" : sexo === "masculino" ? "👨" : "🧑";
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
              Gestión de Personal
            </p>
            <h2 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
              Trabajadores
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-dracula-comment">
              Administra la información de los trabajadores, sus cargos, áreas y el historial de EPP asignados.
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 rounded-full border border-celeste-200/70 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-cyan dark:hover:border-dracula-purple dark:hover:bg-dracula-bg"
          >
            <Plus className="h-4 w-4" />
            Nuevo Trabajador
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
              placeholder="Buscar por nombre, RUT o cargo..."
              className="w-full rounded-2xl border border-soft-gray-200/70 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground dark:placeholder-dracula-comment"
            />
          </div>
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
          >
            <option value="all">Todas las áreas</option>
            {AREAS_TRABAJO.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrabajadores.map((trabajador) => (
              <div
                key={trabajador.id}
                className="rounded-2xl border border-soft-gray-200/70 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-dracula-current dark:bg-dracula-current/50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-celeste-100 text-2xl dark:bg-dracula-cyan/20">
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
                  <div className="flex items-center gap-2 text-slate-600 dark:text-dracula-comment">
                    <Phone className="h-4 w-4" />
                    <span>{trabajador.numeroEmergencia}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-soft-gray-200/70 dark:border-dracula-current">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-dracula-comment">
                      Ingreso: {new Date(trabajador.fechaIngreso).toLocaleDateString()}
                    </span>
                    <span className={`rounded-full px-2 py-1 font-medium ${
                      trabajador.tipoContrato === "indefinido"
                        ? "bg-mint-100 text-mint-700 dark:bg-dracula-green/20 dark:text-dracula-green"
                        : "bg-amber-100 text-amber-700 dark:bg-dracula-orange/20 dark:text-dracula-orange"
                    }`}>
                      {trabajador.tipoContrato === "indefinido" ? "Indefinido" : 
                       trabajador.tipoContrato === "plazo_fijo" ? "Plazo Fijo" : "Faena"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal de formulario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-screen items-start justify-center px-4 py-10">
            <div className="relative w-full max-w-4xl rounded-3xl border border-white/70 bg-white/95 px-6 py-8 shadow-2xl dark:border-dracula-current dark:bg-dracula-bg/95">
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-soft-gray-100 hover:text-slate-700 dark:text-dracula-comment dark:hover:bg-dracula-current dark:hover:text-dracula-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
                  {editingId ? "Editar Trabajador" : "Nuevo Trabajador"}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-dracula-comment">
                  Completa la información del trabajador según normativas HSE
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
                        onChange={(e) => setFormState({ ...formState, rut: e.target.value })}
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
                        Nombre Contacto *
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.nombreContactoEmergencia}
                        onChange={(e) => setFormState({ ...formState, nombreContactoEmergencia: e.target.value })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Teléfono Emergencia *
                      </label>
                      <input
                        type="tel"
                        required
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
                        Grupo Sanguíneo
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
                        Enfermedad Crónica
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
                        Alergias
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
                        Restricciones Médicas
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
                        Talla Camisa
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
                        Talla Pantalón
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
                        Talla Calzado
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

                {/* Datos HSE (ISO 45001 / Ley 16744) */}
                <div className="rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 p-5 dark:border-dracula-current dark:bg-dracula-current/30">
                  <h4 className="mb-4 font-semibold text-slate-700 dark:text-dracula-foreground">
                    🛡️ Datos HSE (ISO 45001 / Ley 16744)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-dracula-foreground mb-1">
                        Mutual de Seguridad *
                      </label>
                      <select
                        required
                        value={formState.mutualSeguridad}
                        onChange={(e) => setFormState({ ...formState, mutualSeguridad: e.target.value as any })}
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      >
                        <option value="ACHS">ACHS</option>
                        <option value="Mutual_ChileSeguro">Mutual ChileSeguro</option>
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
                          Fecha Inducción HSE
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
                        Fecha Último Examen Ocupacional
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
                        Fecha Próximo Examen
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
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-full border border-soft-gray-200/70 bg-white px-6 py-2 text-sm font-semibold text-slate-600 transition hover:bg-soft-gray-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-comment dark:hover:bg-dracula-bg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-celeste-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-celeste-600 disabled:opacity-50 dark:bg-dracula-cyan dark:text-dracula-bg dark:hover:bg-dracula-cyan/80"
                  >
                    {saving ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
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
