import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Calendar,
  Download,
  Layers,
  MoveHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  User,
  X,
  Grid3x3,
  List,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTrabajadoresFirestore } from "../hooks/useTrabajadoresFirestore";
import { useEppFirestore } from "../hooks/useEppFirestore";
import {
  useEppEntregasFirestore,
  type Entrega,
  type EntregaItem,
} from "../hooks/useEppEntregasFirestore";

type DraftItem = {
  tempId: string;
  eppId: string;
  variantId?: string | null;
  cantidad: number;
  initialCantidad: number;
};

type FormState = {
  trabajadorId: string;
  fechaEntrega: string;
  items: DraftItem[];
};

const initialFormState = (): FormState => ({
  trabajadorId: "",
  fechaEntrega: new Date().toISOString().split("T")[0],
  items: [],
});

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const formatDate = (value: Date | string | undefined) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CL");
};

const randomId = () => Math.random().toString(36).slice(2, 9);

const DELIVERIES_DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

const getInitialDeliveriesViewMode = () =>
  typeof window !== "undefined" && window.matchMedia(DELIVERIES_DESKTOP_MEDIA_QUERY).matches
    ? "list"
    : "card";

export default function EppEntregas() {
  const { user, loading: authLoading } = useAuth();
  const {
    trabajadores,
    loading: trabajadoresLoading,
    error: trabajadoresError,
  } = useTrabajadoresFirestore();
  const {
    items: eppItems,
    loading: eppLoading,
    error: eppError,
  } = useEppFirestore();
  const {
    entregas,
    loading: entregasLoading,
    error: entregasError,
    addEntrega,
    updateEntrega,
    deleteEntrega,
  } = useEppEntregasFirestore();

  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [trabajadorFilter, setTrabajadorFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const trabajadorOptions = useMemo(
    () =>
      trabajadores
        .filter((t) => t.vigente)
        .map((t) => ({ value: t.id, label: `${t.nombre} (${t.rut})` })),
    [trabajadores]
  );

  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    trabajadores.forEach((t) => {
      if (t.areaTrabajo) set.add(t.areaTrabajo);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [trabajadores]);

  const selectedTrabajador = useMemo(() => {
    if (!formState.trabajadorId) return null;
    return trabajadores.find((t) => t.id === formState.trabajadorId) ?? null;
  }, [formState.trabajadorId, trabajadores]);

  const getEppById = (id: string) => eppItems.find((item) => item.id === id) ?? null;

  const filteredEntregas = useMemo(() => {
    const queryLower = searchQuery.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return entregas.filter((entrega) => {
      const matchesSearch =
        queryLower.length === 0 ||
        entrega.trabajadorNombre.toLowerCase().includes(queryLower) ||
        entrega.trabajadorRut.toLowerCase().includes(queryLower) ||
        entrega.items.some((item) => item.eppName.toLowerCase().includes(queryLower));

      const matchesArea = areaFilter === "all" || entrega.areaTrabajo === areaFilter;
      const matchesTrabajador =
        trabajadorFilter === "all" || entrega.trabajadorId === trabajadorFilter;

      const matchesDate = (() => {
        if (!(entrega.fechaEntrega instanceof Date)) return true;
        const time = entrega.fechaEntrega.setHours(0, 0, 0, 0);
        const fromOk = !from || time >= from.setHours(0, 0, 0, 0);
        const toOk = !to || time <= to.setHours(0, 0, 0, 0);
        return fromOk && toOk;
      })();

      return matchesSearch && matchesArea && matchesTrabajador && matchesDate;
    });
  }, [entregas, searchQuery, areaFilter, trabajadorFilter, fromDate, toDate]);

  const totalFiltrado = useMemo(
    () => filteredEntregas.reduce((sum, entrega) => sum + entrega.totalEntrega, 0),
    [filteredEntregas]
  );

  const [viewMode, setViewMode] = useState<"card" | "list">(getInitialDeliveriesViewMode);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia(DELIVERIES_DESKTOP_MEDIA_QUERY);

    const update = (matches: boolean) => {
      setViewMode(matches ? "list" : "card");
    };

    update(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => update(event.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const isDateRangeValid = useMemo(() => {
    if (!fromDate || !toDate) return false;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;
    return from <= to;
  }, [fromDate, toDate]);

  const handleExportToExcel = () => {
    if (!isDateRangeValid) {
      alert("Debes seleccionar un rango de fechas válido para exportar.");
      return;
    }

    const dataToExport = filteredEntregas.filter((entrega) => {
      if (!(entrega.fechaEntrega instanceof Date)) return false;
      const fecha = entrega.fechaEntrega.setHours(0, 0, 0, 0);
      const from = new Date(fromDate).setHours(0, 0, 0, 0);
      const to = new Date(toDate).setHours(0, 0, 0, 0);
      return fecha >= from && fecha <= to;
    });

    if (dataToExport.length === 0) {
      alert("No hay entregas en el rango de fechas seleccionado.");
      return;
    }

    const rows = dataToExport.map((entrega) => {
      const itemsDetalle = entrega.items
        .map(
          (item) =>
            `${item.cantidad} x ${item.eppName}${item.talla ? ` (Talla: ${item.talla})` : ""} · ${currency.format(
              item.subtotal
            )}`
        )
        .join(" | ");

      return {
        Fecha: entrega.fechaEntrega.toISOString().split("T")[0],
        Trabajador: entrega.trabajadorNombre,
        RUT: entrega.trabajadorRut,
        Área: entrega.areaTrabajo,
        "Sub-área": entrega.subAreaTrabajo || "—",
        Detalle: itemsDetalle,
        "Total Entrega": entrega.totalEntrega,
        "Autorizado por": entrega.autorizadoPorNombre,
        "Correo autorizador": entrega.autorizadoPorEmail || "—",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 28 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 60 },
      { wch: 16 },
      { wch: 26 },
      { wch: 30 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entregas");

    const fileName = `Entregas_${fromDate}_a_${toDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const getAvailableStockForDraft = (draft: DraftItem): number | null => {
    const epp = getEppById(draft.eppId);
    if (!epp) return null;

    if (epp.multiSize) {
      const variant = epp.sizeVariants.find((option) => option.id === draft.variantId);
      if (!variant) return null;
      return Math.max(0, Number(variant.stockActual ?? 0)) + draft.initialCantidad;
    }

    const baseStock = Math.max(0, Number(epp.stockActual ?? 0));
    return baseStock + draft.initialCantidad;
  };

  const computeDraftSubtotal = (draft: DraftItem) => {
    const epp = getEppById(draft.eppId);
    if (!epp) return 0;
    return draft.cantidad * epp.price;
  };

  const formTotal = useMemo(
    () => formState.items.reduce((sum, item) => sum + computeDraftSubtotal(item), 0),
    [formState.items]
  );

  useEffect(() => {
    if (!isModalOpen) return;
    setFormState((prev) => {
      if (prev.items.length > 0) return prev;
      return {
        ...prev,
        items: [
          {
            tempId: randomId(),
            eppId: "",
            variantId: null,
            cantidad: 1,
            initialCantidad: 0,
          },
        ],
      };
    });
  }, [isModalOpen]);

  const handleOpenModal = (entrega?: Entrega) => {
    if (!user) {
      setFormError("Debes iniciar sesión para registrar entregas.");
      return;
    }

    if (entrega) {
      setEditingId(entrega.id);
      setFormState({
        trabajadorId: entrega.trabajadorId,
        fechaEntrega: entrega.fechaEntrega.toISOString().split("T")[0],
        items: entrega.items.map((item) => ({
          tempId: randomId(),
          eppId: item.eppId,
          variantId: item.variantId ?? null,
          cantidad: item.cantidad,
          initialCantidad: item.cantidad,
        })),
      });
    } else {
      setEditingId(null);
      setFormState(initialFormState());
    }

    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormState(initialFormState());
    setFormError(null);
    setSaving(false);
  };

  const handleItemChange = (
    tempId: string,
    updates: Partial<Omit<DraftItem, "tempId">>
  ) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.tempId !== tempId) return item;
        const next = { ...item, ...updates };
        if (updates.eppId !== undefined) {
          next.variantId = null;
          next.initialCantidad = 0;
          if (!updates.eppId) {
            next.cantidad = 0;
          } else {
            const epp = getEppById(updates.eppId);
            if (epp?.multiSize) {
              next.cantidad = 0;
            } else {
              const max = getAvailableStockForDraft(next);
              const base = max !== null && max < 1 ? max : 1;
              next.cantidad = max !== null ? Math.min(base, max) : base;
            }
          }
        }
        if (updates.variantId === "") next.variantId = null;
        if (updates.variantId !== undefined) {
          if (updates.variantId !== item.variantId) {
            next.initialCantidad = 0;
          }
          if (!updates.variantId) {
            next.cantidad = 0;
          } else {
            const max = getAvailableStockForDraft({ ...next, variantId: updates.variantId });
            if (max !== null) {
              if (max <= 0) {
                next.cantidad = 0;
              } else {
                const safeValue = next.cantidad > 0 ? next.cantidad : 1;
                next.cantidad = Math.min(safeValue, max);
              }
            }
          }
        }
        if (updates.cantidad !== undefined) {
          const parsed = Math.max(0, Number(updates.cantidad) || 0);
          const max = getAvailableStockForDraft(next);
          const limited = max !== null ? Math.min(parsed, max) : parsed;
          next.cantidad = limited;
        }
        return next;
      }),
    }));
  };

  const handleRemoveItem = (tempId: string) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.tempId !== tempId),
    }));
  };

  const handleAddItem = () => {
    setFormState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          tempId: randomId(),
          eppId: "",
          variantId: null,
          cantidad: 1,
          initialCantidad: 0,
        },
      ],
    }));
  };

  const buildEntregaItems = (items: DraftItem[]): EntregaItem[] => {
    return items.map((draft) => {
      const epp = getEppById(draft.eppId);
      if (!epp) {
        throw new Error("Debes seleccionar un EPP válido en cada fila.");
      }

      const variant = epp.multiSize
        ? epp.sizeVariants.find((v) => v.id === draft.variantId)
        : null;

      if (epp.multiSize && !variant) {
        throw new Error("Selecciona una talla para los EPP de múltiples tallas.");
      }

      if (!Number.isFinite(draft.cantidad) || draft.cantidad <= 0) {
        throw new Error("La cantidad debe ser mayor que cero.");
      }

      const stockDisponible = epp.multiSize
        ? variant?.stockActual ?? 0
        : epp.stockActual ?? 0;

      if (!editingId && draft.cantidad > stockDisponible) {
        throw new Error(
          `La cantidad solicitada de "${epp.name}" supera el stock disponible (${stockDisponible}).`
        );
      }

      return {
        eppId: epp.id,
        eppName: epp.name,
        variantId: variant?.id ?? null,
        talla: epp.multiSize ? variant?.label ?? "" : "Única",
        cantidad: draft.cantidad,
        costoUnitario: epp.price,
        subtotal: draft.cantidad * epp.price,
      } satisfies EntregaItem;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setFormError("Debes iniciar sesión para registrar entregas.");
      return;
    }

    if (!formState.trabajadorId) {
      setFormError("Selecciona un trabajador.");
      return;
    }

    const trabajador = trabajadores.find((t) => t.id === formState.trabajadorId);
    if (!trabajador) {
      setFormError("No se encontró la información del trabajador seleccionado.");
      return;
    }

    let items: EntregaItem[] = [];
    try {
      items = buildEntregaItems(formState.items);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo preparar la entrega.");
      return;
    }

    if (items.length === 0) {
      setFormError("Agrega al menos un EPP a la entrega.");
      return;
    }

    const payload = {
      trabajadorId: trabajador.id,
      trabajadorNombre: trabajador.nombre,
      trabajadorRut: trabajador.rut,
      areaTrabajo: trabajador.areaTrabajo,
      subAreaTrabajo: trabajador.subAreaTrabajo,
      fechaEntrega: new Date(formState.fechaEntrega),
      items,
      autorizadoPorUid: user.uid,
      autorizadoPorNombre: user.displayName ?? user.email ?? "Usuario",
      autorizadoPorEmail: user.email ?? undefined,
    } as const;

    setSaving(true);
    const result = editingId
      ? await updateEntrega(editingId, payload)
      : await addEntrega(payload);
    setSaving(false);

    if (!result.success) {
      setFormError(result.error ?? "No se pudo guardar la entrega.");
      return;
    }

    handleCloseModal();
  };

  const handleDelete = async (entregaId: string) => {
    const confirmed = window.confirm(
      "¿Eliminar esta entrega? Se revertirán los movimientos de stock."
    );
    if (!confirmed) return;

    const result = await deleteEntrega(entregaId);
    if (!result.success) {
      alert(result.error ?? "No se pudo eliminar la entrega.");
    }
  };

  const isLoading = authLoading || trabajadoresLoading || eppLoading || entregasLoading;
  const globalError = trabajadoresError || eppError || entregasError;

  return (
    <div className="space-y-8 overflow-x-hidden">
      <section className="rounded-4xl border border-white/70 bg-white/95 p-4 sm:p-6 lg:p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/95">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
              Control de Entregas
            </p>
            <h2 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
              Gestiona las entregas de EPP
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-dracula-comment">
              Registra movimientos, descuenta inventario automáticamente y mantén trazabilidad por trabajador, área y fecha.
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            disabled={isLoading || !user}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:from-dracula-purple dark:via-dracula-pink dark:to-dracula-cyan dark:text-dracula-bg"
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Nueva Entrega</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>

        <div className="mb-6 space-y-3 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:justify-between gap-4">
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-dracula-comment" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por trabajador, RUT o EPP"
              className="w-full rounded-2xl border border-soft-gray-200/70 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground dark:placeholder-dracula-comment"
            />
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
            <div className="flex items-center gap-2 rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm shadow-sm dark:border-dracula-current dark:bg-dracula-current w-full sm:w-auto">
              <User className="h-4 w-4 text-slate-400 dark:text-dracula-comment" />
              <select
                value={trabajadorFilter}
                onChange={(event) => setTrabajadorFilter(event.target.value)}
                className="flex-1 bg-transparent focus:outline-none dark:text-dracula-foreground"
              >
                <option value="all">Todos los trabajadores</option>
                {trabajadorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm shadow-sm dark:border-dracula-current dark:bg-dracula-current w-full sm:w-auto">
              <Layers className="h-4 w-4 text-slate-400 dark:text-dracula-comment" />
              <select
                value={areaFilter}
                onChange={(event) => setAreaFilter(event.target.value)}
                className="flex-1 bg-transparent focus:outline-none dark:text-dracula-foreground"
              >
                <option value="all">Todas las áreas</option>
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 shadow-sm dark:border-dracula-current dark:bg-dracula-current/30 dark:text-dracula-comment sm:w-auto">
              <label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-2 py-1 text-[11px] font-normal text-slate-600 focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
                />
              </label>
              <label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-2 py-1 text-[11px] font-normal text-slate-600 focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
                />
              </label>
            </div>

            <button
              onClick={handleExportToExcel}
              disabled={!isDateRangeValid || filteredEntregas.length === 0}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-mint-200/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-mint-300 hover:bg-mint-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-green dark:hover:border-dracula-green dark:hover:bg-dracula-bg sm:w-auto sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
          </div>
        </div>

        {globalError && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-600 dark:border-dracula-red/40 dark:bg-dracula-red/10 dark:text-dracula-red">
            {globalError}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/80 px-4 py-4 text-sm text-slate-600 dark:border-dracula-current dark:bg-dracula-current/30 dark:text-dracula-comment">
          <Layers className="h-5 w-5 text-celeste-400" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400">
              Resumen filtrado
            </p>
            <p className="text-base font-semibold text-slate-800 dark:text-dracula-foreground">
              {filteredEntregas.length} entregas · {currency.format(totalFiltrado)}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-full border border-soft-gray-200/70 bg-white p-1 shadow-sm dark:border-dracula-current dark:bg-dracula-current">
            {viewMode === "card" ? (
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 dark:text-dracula-comment">
                <Grid3x3 className="h-4 w-4" />
                Tarjetas
              </span>
            ) : (
              <span className="hidden lg:inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 dark:text-dracula-comment">
                <List className="h-4 w-4" />
                Tabla
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Truck className="mb-6 h-16 w-16 animate-pulse text-celeste-200 dark:text-dracula-cyan/40" />
            <p className="text-sm text-slate-500 dark:text-dracula-comment">
              Cargando inventario, trabajadores y entregas...
            </p>
          </div>
        ) : filteredEntregas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-celeste-200/60 bg-celeste-50/20 py-20 text-center dark:border-dracula-cyan/30 dark:bg-dracula-current/20">
            <Truck className="mb-6 h-16 w-16 text-celeste-200 dark:text-dracula-cyan/40" />
            <h3 className="mb-2 text-xl font-semibold text-slate-700 dark:text-dracula-foreground">
              Aún no hay entregas registradas
            </h3>
            <p className="max-w-md text-sm text-slate-500 dark:text-dracula-comment">
              Registra una nueva entrega para comenzar a llevar trazabilidad del stock asignado a cada trabajador.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {viewMode === "card" ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredEntregas.map((entrega) => (
                  <article
                    key={entrega.id}
                    className="w-full rounded-3xl border border-soft-gray-200/70 bg-white/95 p-4 shadow-sm transition hover:shadow-md dark:border-dracula-current dark:bg-dracula-current/40"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
                          {formatDate(entrega.fechaEntrega)}
                        </p>
                        <h4 className="text-base font-semibold text-slate-800 dark:text-dracula-foreground">
                          {entrega.trabajadorNombre}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-dracula-comment">
                          {entrega.trabajadorRut}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-dracula-comment">Total</p>
                        <p className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                          {currency.format(entrega.totalEntrega)}
                        </p>
                      </div>
                    </header>
                    <dl className="mt-3 grid grid-cols-1 gap-3 text-xs text-slate-500 dark:text-dracula-comment sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment/80">
                          Área
                        </dt>
                        <dd className="text-sm text-slate-700 dark:text-dracula-foreground">
                          {entrega.areaTrabajo || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment/80">
                          Sub-área
                        </dt>
                        <dd className="text-sm text-slate-700 dark:text-dracula-foreground">
                          {entrega.subAreaTrabajo || "Sin sub-área"}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment/80">
                          EPP entregados
                        </dt>
                        <ul className="mt-2 space-y-1">
                          {entrega.items.map((item) => (
                            <li
                              key={`${entrega.id}-${item.eppId}-${item.variantId ?? "default"}`}
                              className="flex items-center justify-between gap-2 rounded-xl bg-soft-gray-100/70 px-3 py-2 text-xs dark:bg-dracula-current/40"
                            >
                              <div>
                                <p className="font-semibold text-slate-700 dark:text-dracula-foreground">
                                  {item.cantidad}× {item.eppName}
                                </p>
                                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-dracula-comment/70">
                                  {item.talla || "Única"}
                                </p>
                              </div>
                              <span className="font-semibold text-slate-700 dark:text-dracula-foreground">
                                {currency.format(item.subtotal)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </dl>
                    <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-dracula-comment">
                      <div>
                        <p className="font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment/80">
                          Autorizado por
                        </p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                          {entrega.autorizadoPorNombre}
                        </p>
                        {entrega.autorizadoPorEmail && (
                          <p>{entrega.autorizadoPorEmail}</p>
                        )}
                      </div>
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleOpenModal(entrega)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-celeste-200/70 text-celeste-500 transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-purple/40 dark:text-dracula-cyan dark:hover:border-dracula-purple dark:hover:bg-dracula-cyan/10"
                          aria-label="Editar entrega"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entrega.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/70 text-rose-500 transition hover:border-rose-300 hover:bg-rose-50 dark:border-dracula-red/40 dark:text-dracula-red dark:hover:border-dracula-red dark:hover:bg-dracula-red/10"
                          aria-label="Eliminar entrega"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 rounded-full bg-soft-gray-100/70 px-3 py-1 text-xs font-semibold text-celeste-500 dark:bg-dracula-current/40 dark:text-dracula-cyan md:hidden">
                  <MoveHorizontal className="h-3.5 w-3.5" />
                  Desliza para ver más columnas
                </div>
                <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400 dark:scrollbar-thumb-dracula-current dark:scrollbar-track-dracula-bg dark:hover:scrollbar-thumb-dracula-purple rounded-2xl border border-soft-gray-200/70 shadow-sm dark:border-dracula-current">
                  <table className="w-full min-w-[1080px] divide-y divide-soft-gray-200/70 bg-white text-sm dark:divide-dracula-current dark:bg-dracula-bg">
                    <thead className="bg-soft-gray-50/80 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:bg-dracula-current/40 dark:text-dracula-comment">
                      <tr>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Trabajador</th>
                        <th className="px-4 py-3 text-left">Área / Sub-área</th>
                        <th className="px-4 py-3 text-left">Detalle</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-left">Autorizado por</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-soft-gray-200/60 dark:divide-dracula-current/50">
                      {filteredEntregas.map((entrega) => (
                        <tr
                          key={entrega.id}
                          className="bg-white/95 transition hover:bg-celeste-50/40 dark:bg-dracula-current/30 dark:hover:bg-dracula-current/50"
                        >
                          <td className="px-4 py-4 text-slate-600 dark:text-dracula-comment">
                            {formatDate(entrega.fechaEntrega)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-800 dark:text-dracula-foreground">
                              {entrega.trabajadorNombre}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-dracula-comment">
                              {entrega.trabajadorRut}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-600 dark:text-dracula-comment">
                            <div>{entrega.areaTrabajo || "—"}</div>
                            <div className="text-xs text-slate-400 dark:text-dracula-comment/70">
                              {entrega.subAreaTrabajo || "Sin sub-área"}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-600 dark:text-dracula-comment">
                            <ul className="space-y-1">
                              {entrega.items.map((item) => (
                                <li
                                  key={`${entrega.id}-${item.eppId}-${item.variantId ?? "default"}`}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-soft-gray-100/60 px-3 py-2 text-xs dark:bg-dracula-current/40"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-700 dark:text-dracula-foreground">
                                      {item.cantidad}× {item.eppName}
                                    </div>
                                    <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-dracula-comment/70">
                                      {item.talla || "Única"}
                                    </div>
                                  </div>
                                  <span className="font-semibold text-slate-700 dark:text-dracula-foreground">
                                    {currency.format(item.subtotal)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-4 py-4 text-right font-semibold text-slate-800 dark:text-dracula-foreground">
                            {currency.format(entrega.totalEntrega)}
                          </td>
                          <td className="px-4 py-4 text-slate-600 dark:text-dracula-comment">
                            <div>{entrega.autorizadoPorNombre}</div>
                            {entrega.autorizadoPorEmail && (
                              <div className="text-xs text-slate-400 dark:text-dracula-comment/70">
                                {entrega.autorizadoPorEmail}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => handleOpenModal(entrega)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-celeste-200/70 text-celeste-500 transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-purple/40 dark:text-dracula-cyan dark:hover;border-dracula-purple dark:hover:bg-dracula-cyan/10"
                                aria-label="Editar entrega"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(entrega.id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/70 text-rose-500 transition hover:border-rose-300 hover:bg-rose-50 dark:border-dracula-red/40 dark:text-dracula-red dark:hover:border-dracula-red dark:hover:bg-dracula-red/10"
                                aria-label="Eliminar entrega"
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
              </>
            )}
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-screen items-start justify-center px-4 py-10 sm:px-6 lg:py-16">
            <div className="relative w-full max-w-5xl rounded-[28px] border border-white/70 bg-white/95 px-6 py-8 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.6)] dark:border-dracula-current dark:bg-dracula-bg/95 sm:px-8 lg:px-10 lg:py-10">
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground sm:right-6 sm:top-6 sm:h-10 sm:w-10"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
                  {editingId ? "Editar entrega" : "Nueva entrega"}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
                  {editingId ? "Actualizar registro" : "Registrar entrega"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-dracula-comment">
                  Asocia el movimiento a un trabajador y descuenta stock de manera automática.
                </p>
              </div>

              {formError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600 dark:border-dracula-red/30 dark:bg-dracula-red/10 dark:text-dracula-red">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                      👷 Trabajador *
                    </label>
                    <select
                      required
                      value={formState.trabajadorId}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          trabajadorId: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                    >
                      <option value="">Selecciona un trabajador</option>
                      {trabajadorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                      📅 Fecha de entrega *
                    </label>
                    <input
                      type="date"
                      required
                      value={formState.fechaEntrega}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          fechaEntrega: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                    />
                  </div>
                </div>

                {selectedTrabajador && (
                  <div className="rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/70 px-4 py-3 text-sm text-slate-600 dark:border-dracula-current dark:bg-dracula-current/30 dark:text-dracula-comment">
                    <div className="font-semibold text-slate-800 dark:text-dracula-foreground">
                      {selectedTrabajador.areaTrabajo || "Sin área"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-dracula-comment">
                      {selectedTrabajador.subAreaTrabajo || "Sin sub-área"}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                      📦 Detalle de EPP entregados
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="inline-flex items-center gap-2 rounded-full border border-celeste-200/70 px-3 py-1.5 text-xs font-semibold text-celeste-600 transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-purple/40 dark:text-dracula-cyan dark:hover:border-dracula-purple dark:hover:bg-dracula-cyan/10"
                    >
                      <Plus className="h-3.5 w-3.5" /> Añadir EPP
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formState.items.map((item) => {
                      const epp = getEppById(item.eppId);
                      const variantOptions = epp?.multiSize
                        ? epp.sizeVariants.map((variant) => ({
                            value: variant.id,
                            label: `${variant.label} · Stock ${variant.stockActual}`,
                          }))
                        : [];
                      const maxCantidad = getAvailableStockForDraft(item);
                      const cantidadDisabled =
                        !item.eppId || (epp?.multiSize && !item.variantId) || maxCantidad === 0;

                      return (
                        <div
                          key={item.tempId}
                          className="grid grid-cols-1 gap-3 rounded-2xl border border-soft-gray-200/70 bg-white/90 p-4 shadow-sm dark:border-dracula-current dark:bg-dracula-current/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]"
                        >
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-dracula-comment">
                              EPP
                            </label>
                            <select
                              required
                              value={item.eppId}
                              onChange={(event) =>
                                handleItemChange(item.tempId, {
                                  eppId: event.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-3 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                            >
                              <option value="">Selecciona un EPP</option>
                              {eppItems.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-dracula-comment">
                              Talla
                            </label>
                            {epp?.multiSize ? (
                              <select
                                required
                                value={item.variantId ?? ""}
                                onChange={(event) =>
                                  handleItemChange(item.tempId, {
                                    variantId: event.target.value,
                                  })
                                }
                                className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-3 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                              >
                                <option value="">Selecciona talla</option>
                                {variantOptions.map((variant) => (
                                  <option key={variant.value} value={variant.value}>
                                    {variant.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="rounded-xl border border-dashed border-soft-gray-200/80 bg-soft-gray-50/70 px-3 py-2 text-sm text-slate-500 dark:border-dracula-current/40 dark:bg-dracula-current/30 dark:text-dracula-comment">
                                Única
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-dracula-comment">
                              Cantidad
                            </label>
                            <input
                              type="number"
                              min={cantidadDisabled ? 0 : 1}
                              max={maxCantidad ?? undefined}
                              value={item.cantidad}
                              onChange={(event) =>
                                handleItemChange(item.tempId, {
                                  cantidad: Number(event.target.value),
                                })
                              }
                              disabled={cantidadDisabled}
                              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-3 py-2 text-sm focus:border-celeste-300 focus:outline-none disabled:cursor-not-allowed disabled:bg-soft-gray-100 dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground dark:disabled:bg-dracula-current/40"
                            />
                            {maxCantidad !== null && (
                              <p className="mt-1 text-[11px] text-slate-400 dark:text-dracula-comment">
                                Stock disponible: {maxCantidad}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                            <div className="text-right text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                              {currency.format(computeDraftSubtotal(item))}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.tempId)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/70 text-slate-400 transition hover:border-rose-200 hover:text-rose-500 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-red dark:hover:text-dracula-red"
                              aria-label="Eliminar línea"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/80 px-4 py-3 text-sm text-slate-600 dark:border-dracula-current dark:bg-dracula-current/30 dark:text-dracula-comment">
                  <span>💰 Total estimado</span>
                  <span className="text-base font-semibold text-slate-800 dark:text-dracula-foreground">
                    {currency.format(formTotal)}
                  </span>
                </div>

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
                      ? "Actualizar entrega"
                      : "Registrar entrega"}
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
