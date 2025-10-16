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
            className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
          >
            <option value="all">Todas las áreas</option>
            <option value="produccion">Producción</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="administracion">Administración</option>
            <option value="logistica">Logística</option>
          </select>
        </div>

        {/* Contenido placeholder */}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-20 w-20 text-celeste-200 dark:text-dracula-cyan/30 mb-6" />
          <h3 className="text-2xl font-semibold text-slate-700 dark:text-dracula-foreground mb-3">
            Módulo en Construcción
          </h3>
          <p className="text-slate-500 dark:text-dracula-comment max-w-md mb-8">
            Estamos diseñando el sistema de gestión de trabajadores. Aquí podrás registrar y administrar 
            toda la información del personal, incluyendo datos de contacto, cargo, área y el historial de EPP asignados.
          </p>
          
          {/* Características planificadas */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
            <div className="p-6 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 dark:border-dracula-current dark:bg-dracula-current/30 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-celeste-100 dark:bg-dracula-cyan/20">
                  <UserCheck className="h-5 w-5 text-celeste-600 dark:text-dracula-cyan" />
                </div>
                <h4 className="font-semibold text-slate-700 dark:text-dracula-foreground">
                  Datos Personales
                </h4>
              </div>
              <p className="text-sm text-slate-500 dark:text-dracula-comment">
                Nombre, RUT, foto, contacto y datos laborales completos
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 dark:border-dracula-current dark:bg-dracula-current/30 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mint-100 dark:bg-dracula-green/20">
                  <Briefcase className="h-5 w-5 text-mint-600 dark:text-dracula-green" />
                </div>
                <h4 className="font-semibold text-slate-700 dark:text-dracula-foreground">
                  Cargo y Área
                </h4>
              </div>
              <p className="text-sm text-slate-500 dark:text-dracula-comment">
                Organiza por departamento, cargo y fecha de ingreso
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/50 dark:border-dracula-current dark:bg-dracula-current/30 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-dracula-purple/20">
                  <Calendar className="h-5 w-5 text-purple-600 dark:text-dracula-purple" />
                </div>
                <h4 className="font-semibold text-slate-700 dark:text-dracula-foreground">
                  Historial EPP
                </h4>
              </div>
              <p className="text-sm text-slate-500 dark:text-dracula-comment">
                Consulta todos los EPP entregados a cada trabajador
              </p>
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-8 p-4 rounded-xl bg-blue-50/50 border border-blue-200/50 dark:bg-dracula-cyan/10 dark:border-dracula-cyan/30 max-w-2xl">
            <p className="text-sm text-blue-700 dark:text-dracula-cyan">
              💡 <strong>Próximamente:</strong> Este módulo se integrará con el sistema de entregas de EPP 
              para llevar un control completo de qué equipos tiene asignado cada trabajador.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
