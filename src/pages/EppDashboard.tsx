import { useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Grid3x3,
  List,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEppFirestore } from "../hooks/useEppFirestore";
import * as XLSX from "xlsx";
import QRManager from "./QRManager";
import {
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type SizeVariantForm = {
  id: string;
  label: string;
  stockActual: string;
  stockMinimo: string;
  stockCritico: string;
};

type EppItem = {
  id: string;
  eppId: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  price: number;
  discontinued: boolean;
  multiSize: boolean;
  sizeVariants: {
    id: string;
    label: string;
    stockActual: number;
    stockMinimo: number;
    stockCritico: number;
  }[];
  stockActual?: number;
  stockMinimo?: number;
  stockCritico?: number;
  location: string;
  certifications: string[];
  imageBase64?: string;
  technicalSheetBase64?: string;
  certificatesBase64?: string;
  photoName?: string;
  technicalSheetName?: string;
  certificatesName?: string;
};

type EppFormState = {
  eppId: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  price: string;
  multiSize: boolean;
  stockActual: string;
  stockMinimo: string;
  stockCritico: string;
  location: string;
  certifications: string;
  sizeVariants: SizeVariantForm[];
  imageBase64?: string;
  technicalSheetBase64?: string;
  certificatesBase64?: string;
  photoName?: string;
  technicalSheetName?: string;
  certificatesName?: string;
};

const categories = [
  "Protección para cabeza",
  "Protección auditiva",
  "Protección ocular",
  "Protección respiratoria",
  "Protección para manos",
  "Protección para pies",
  "Protección corporal",
  "Arneses y líneas de vida",
  "Otros",
];

const categoryProtectionMap: Record<string, string> = {
  "Protección para cabeza":
    "Impactos, objetos en caída, electricidad y ambientes industriales exigentes.",
  "Protección auditiva":
    "Reducción de exposición a ruido continuo o intermitente en planta.",
  "Protección ocular":
    "Proyección de partículas, radiación lumínica y salpicaduras químicas.",
  "Protección respiratoria":
    "Filtrado de vapores, gases y material particulado en suspensión.",
  "Protección para manos":
    "Cortes, abrasión, químicos y riesgos eléctricos en extremidades.",
  "Protección para pies":
    "Impacto, compresión, perforaciones y resbalones en superficie.",
  "Protección corporal":
    "Agentes químicos, salpicaduras, fuego y condiciones climáticas.",
  "Arneses y líneas de vida":
    "Trabajo en altura y prevención de caídas desde distintos niveles.",
  Otros: "Protección especializada o multifuncional según normativa HSE.",
};

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

const createSizeVariant = (): SizeVariantForm => ({
  id: generateId(),
  label: "",
  stockActual: "",
  stockMinimo: "",
  stockCritico: "",
});

const createEppId = (totalItems: number) =>
  `EPP-${String(totalItems + 1).padStart(3, "0")}`;

const initialFormState = (totalItems = 0): EppFormState => ({
  eppId: createEppId(totalItems),
  name: "",
  category: "",
  brand: "",
  model: "",
  price: "",
  multiSize: false,
  stockActual: "",
  stockMinimo: "",
  stockCritico: "",
  location: "",
  certifications: "",
  sizeVariants: [createSizeVariant()],
  imageBase64: undefined,
  technicalSheetBase64: undefined,
  certificatesBase64: undefined,
  photoName: undefined,
  technicalSheetName: undefined,
  certificatesName: undefined,
});

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("No se pudo leer el archivo"));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Error al leer archivo"));
    reader.readAsDataURL(file);
  });

export default function EppDashboard() {
  const {
    items,
    loading: firestoreLoading,
    error: firestoreError,
    addEpp,
    updateEpp,
    deleteEpp,
  } = useEppFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formState, setFormState] = useState<EppFormState>(() =>
    initialFormState(0)
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [showCostModal, setShowCostModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.eppId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "vigente" && !item.discontinued) ||
        (statusFilter === "discontinuado" && item.discontinued);

      // Filtro de stock
      let matchesStock = true;
      if (stockFilter !== "all") {
        if (item.multiSize) {
          // Para multi-talla: verificar si alguna talla cumple la condición
          const hasMatchingStock = item.sizeVariants.some((variant) => {
            if (stockFilter === "critical") {
              return variant.stockActual <= variant.stockCritico;
            } else if (stockFilter === "low") {
              return (
                variant.stockActual <= variant.stockMinimo &&
                variant.stockActual > variant.stockCritico
              );
            } else if (stockFilter === "critical-or-low") {
              return variant.stockActual <= variant.stockMinimo;
            }
            return true;
          });
          matchesStock = hasMatchingStock;
        } else {
          // Para talla única: verificar condición
          const stockActual = item.stockActual ?? 0;
          const stockMinimo = item.stockMinimo ?? 0;
          const stockCritico = item.stockCritico ?? 0;

          if (stockFilter === "critical") {
            matchesStock = stockActual <= stockCritico;
          } else if (stockFilter === "low") {
            matchesStock =
              stockActual <= stockMinimo && stockActual > stockCritico;
          } else if (stockFilter === "critical-or-low") {
            matchesStock = stockActual <= stockMinimo;
          }
        }
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });
  }, [items, searchQuery, categoryFilter, statusFilter, stockFilter]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const totals = useMemo(() => {
    let totalUnits = 0;
    let lowStock = 0;
    let totalValue = 0;

    items.forEach((item) => {
      if (item.multiSize) {
        const units = item.sizeVariants.reduce(
          (acc, variant) => acc + variant.stockActual,
          0
        );
        totalUnits += units;
        totalValue += units * item.price;
        const hasLow = item.sizeVariants.some(
          (variant) => variant.stockActual <= variant.stockMinimo
        );
        if (hasLow) lowStock += 1;
      } else {
        const units = item.stockActual ?? 0;
        totalUnits += units;
        totalValue += units * item.price;
        if (units <= (item.stockMinimo ?? 0)) {
          lowStock += 1;
        }
      }
    });

    return {
      totalItems: items.length,
      totalUnits,
      lowStock,
      totalValue,
    };
  }, [items]);

  const costDataByCategory = useMemo(() => {
    const categoryData: Record<
      string,
      { value: number; units: number; items: number }
    > = {};

    items.forEach((item) => {
      if (!categoryData[item.category]) {
        categoryData[item.category] = { value: 0, units: 0, items: 0 };
      }

      if (item.multiSize) {
        const units = item.sizeVariants.reduce(
          (acc, variant) => acc + variant.stockActual,
          0
        );
        categoryData[item.category].units += units;
        categoryData[item.category].value += units * item.price;
      } else {
        const units = item.stockActual ?? 0;
        categoryData[item.category].units += units;
        categoryData[item.category].value += units * item.price;
      }
      categoryData[item.category].items += 1;
    });

    return Object.entries(categoryData)
      .map(([name, data]) => ({
        name,
        value: data.value,
        units: data.units,
        items: data.items,
      }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  const resetForm = (nextCount?: number) => {
    setFormState(initialFormState(nextCount ?? items.length));
    setFormError(null);
    setEditingItemId(null);
  };

  const handleEdit = (item: EppItem) => {
    setEditingItemId(item.id);
    setFormState({
      eppId: item.eppId,
      name: item.name,
      category: item.category,
      brand: item.brand,
      model: item.model,
      price: String(item.price ?? 0),
      multiSize: item.multiSize,
      stockActual: item.multiSize ? "" : String(item.stockActual ?? 0),
      stockMinimo: item.multiSize ? "" : String(item.stockMinimo ?? 0),
      stockCritico: item.multiSize ? "" : String(item.stockCritico ?? 0),
      location: item.location,
      certifications: item.certifications.join(", "),
      sizeVariants: item.multiSize
        ? item.sizeVariants.map((v) => ({
            id: v.id,
            label: v.label,
            stockActual: String(v.stockActual),
            stockMinimo: String(v.stockMinimo),
            stockCritico: String(v.stockCritico),
          }))
        : [createSizeVariant()],
      imageBase64: item.imageBase64,
      technicalSheetBase64: item.technicalSheetBase64,
      certificatesBase64: item.certificatesBase64,
      photoName: item.photoName,
      technicalSheetName: item.technicalSheetName,
      certificatesName: item.certificatesName,
    });
    setIsModalOpen(true);
  };

  const handleVariantChange = (
    variantId: string,
    field: keyof SizeVariantForm,
    value: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      sizeVariants: prev.sizeVariants.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              [field]: value,
            }
          : variant
      ),
    }));
  };

  const handleRemoveVariant = (variantId: string) => {
    setFormState((prev) => {
      if (prev.sizeVariants.length === 1) {
        return prev;
      }
      return {
        ...prev,
        sizeVariants: prev.sizeVariants.filter(
          (variant) => variant.id !== variantId
        ),
      };
    });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: "imageBase64" | "technicalSheetBase64" | "certificatesBase64",
    nameField: "photoName" | "technicalSheetName" | "certificatesName"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setFormState((prev) => ({
        ...prev,
        [field]: base64,
        [nameField]: file.name,
      }));
    } catch (error) {
      console.error(error);
      setFormError(
        "No se pudo convertir el archivo seleccionado. Intenta nuevamente."
      );
    }
  };

  const handleViewFile = (base64Data: string) => {
    // Convertir base64 a Blob
    const byteString = atob(base64Data.split(",")[1]);
    const mimeString = base64Data.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const url = URL.createObjectURL(blob);

    // Abrir en nueva ventana
    const newWindow = window.open(url, "_blank");
    if (newWindow) {
      newWindow.onload = () => {
        URL.revokeObjectURL(url);
      };
    }
  };

  const handleDelete = async (itemId: string) => {
    if (
      window.confirm(
        "¿Estás seguro de eliminar este EPP? Esta acción no se puede deshacer."
      )
    ) {
      const result = await deleteEpp(itemId);
      if (!result.success) {
        alert(result.error || "Error al eliminar");
      }
    }
  };

  const handleToggleDiscontinued = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      const result = await updateEpp(itemId, {
        discontinued: !item.discontinued,
      });
      if (!result.success) {
        alert(result.error || "Error al actualizar");
      }
    }
  };

  const handleExportToExcel = () => {
    // Preparar datos para exportar (sin archivos base64)
    const exportData = items
      .map((item) => {
        const baseData = {
          "Código EPP": item.eppId,
          Nombre: item.name,
          Categoría: item.category,
          Marca: item.brand,
          "Protección Principal": item.model,
          "Precio (CLP)": item.price,
          Estado: item.discontinued ? "Discontinuado" : "Vigente",
          Ubicación: item.location,
          Certificaciones: item.certifications.join(", "),
        };

        if (item.multiSize) {
          // Para EPP con tallas, crear una fila por cada talla
          return item.sizeVariants.map((variant) => ({
            ...baseData,
            Talla: variant.label,
            "Stock Actual": variant.stockActual,
            "Stock Mínimo": variant.stockMinimo,
            "Stock Crítico": variant.stockCritico,
            "Valor Total": variant.stockActual * item.price,
          }));
        } else {
          // Para EPP talla única
          return {
            ...baseData,
            Talla: "Única",
            "Stock Actual": item.stockActual ?? 0,
            "Stock Mínimo": item.stockMinimo ?? 0,
            "Stock Crítico": item.stockCritico ?? 0,
            "Valor Total": (item.stockActual ?? 0) * item.price,
          };
        }
      })
      .flat();

    // Crear libro de Excel
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario EPP");

    // Ajustar ancho de columnas
    const maxWidth = 30;
    worksheet["!cols"] = [
      { wch: 12 }, // Código EPP
      { wch: maxWidth }, // Nombre
      { wch: 20 }, // Categoría
      { wch: 15 }, // Marca
      { wch: maxWidth }, // Protección Principal
      { wch: 12 }, // Precio
      { wch: 12 }, // Estado
      { wch: 20 }, // Ubicación
      { wch: maxWidth }, // Certificaciones
      { wch: 10 }, // Talla
      { wch: 12 }, // Stock Actual
      { wch: 12 }, // Stock Mínimo
      { wch: 12 }, // Stock Crítico
      { wch: 15 }, // Valor Total
    ];

    // Descargar archivo
    const fileName = `Inventario_EPP_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const [showQRManager, setShowQRManager] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();
    setFormError(null);

    if (!formState.name.trim()) {
      setFormError("El nombre del EPP es obligatorio.");
      return;
    }

    if (!formState.category.trim()) {
      setFormError("Selecciona una categoría.");
      return;
    }

    // Validar stock crítico vs mínimo para talla única
    if (!formState.multiSize) {
      const stockCritico = Number(formState.stockCritico) || 0;
      const stockMinimo = Number(formState.stockMinimo) || 0;
      if (stockCritico > stockMinimo) {
        setFormError("El stock crítico no puede ser superior al stock mínimo.");
        return;
      }
    }

    setSaving(true);

    try {
      const preparedVariants = formState.multiSize
        ? formState.sizeVariants
            .filter((variant) => variant.label.trim())
            .map((variant) => ({
              id: variant.id,
              label: variant.label.trim(),
              stockActual: Number(variant.stockActual) || 0,
              stockMinimo: Number(variant.stockMinimo) || 0,
              stockCritico: Number(variant.stockCritico) || 0,
            }))
        : [];

      if (formState.multiSize && preparedVariants.length === 0) {
        setFormError("Agrega al menos una talla con información de stock.");
        setSaving(false);
        return;
      }

      // Validar stock crítico vs mínimo para cada talla
      if (formState.multiSize) {
        const invalidVariant = preparedVariants.find(
          (v) => v.stockCritico > v.stockMinimo
        );
        if (invalidVariant) {
          setFormError(
            `Talla "${invalidVariant.label}": el stock crítico no puede ser superior al stock mínimo.`
          );
          setSaving(false);
          return;
        }
      }

      const eppData = {
        eppId: formState.eppId,
        name: formState.name.trim(),
        category: formState.category,
        brand: formState.brand.trim(),
        model: formState.model.trim(),
        price: Number(formState.price) || 0,
        discontinued: editingItemId
          ? items.find((i) => i.id === editingItemId)?.discontinued ?? false
          : false,
        multiSize: formState.multiSize,
        sizeVariants: preparedVariants,
        stockActual: formState.multiSize
          ? undefined
          : Number(formState.stockActual) || 0,
        stockMinimo: formState.multiSize
          ? undefined
          : Number(formState.stockMinimo) || 0,
        stockCritico: formState.multiSize
          ? undefined
          : Number(formState.stockCritico) || 0,
        location: formState.location.trim(),
        certifications: formState.certifications
          .split(",")
          .map((cert) => cert.trim())
          .filter(Boolean),
        imageBase64: formState.imageBase64,
        technicalSheetBase64: formState.technicalSheetBase64,
        certificatesBase64: formState.certificatesBase64,
        photoName: formState.photoName,
        technicalSheetName: formState.technicalSheetName,
        certificatesName: formState.certificatesName,
      };

      let result;
      if (editingItemId) {
        result = await updateEpp(editingItemId, eppData);
      } else {
        result = await addEpp(eppData);
      }

      if (!result.success) {
        setFormError(result.error || "Error al guardar el EPP.");
        setSaving(false);
        return;
      }

      setIsModalOpen(false);
      resetForm(items.length);
    } finally {
      setSaving(false);
    }
  };

  if (firestoreLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-celeste-300 border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-500">Cargando EPP...</p>
        </div>
      </div>
    );
  }

  if (firestoreError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-3xl border border-rose-200/80 bg-rose-50/80 p-8 text-center">
          <p className="text-sm text-rose-600">{firestoreError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-200/60 bg-white/80 px-5 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (showQRManager) {
    return (
      <div className="space-y-8">
        <button
          onClick={() => setShowQRManager(false)}
          className="inline-flex items-center gap-2 rounded-full border border-soft-gray-200/70 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-celeste-300 hover:bg-celeste-50"
        >
          <X className="h-4 w-4" />
          Volver al inventario
        </button>
        <QRManager />
      </div>
    );
  }

  return (
    <div className="space-y-8 overflow-x-hidden">
      <section className="rounded-4xl border border-white/70 bg-white/95 p-4 sm:p-6 lg:p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/95">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
              Inventario de EPP
            </p>
            <h2 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
              Controla tu stock y certificaciones
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-dracula-comment">
              Agrega nuevos equipos, gestiona tamaños y adjunta la documentación
              necesaria para cumplir con los estándares HSE.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowQRManager(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-celeste-200/70 bg-white/80 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-600 shadow-sm transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-cyan dark:hover:border-dracula-purple dark:hover:bg-dracula-bg"
            >
              <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Gestión QR</span>
              <span className="sm:hidden">QR</span>
            </button>
            <button
              onClick={handleExportToExcel}
              disabled={items.length === 0}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-mint-200/70 bg-white/80 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-600 shadow-sm transition hover:border-mint-300 hover:bg-mint-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-green dark:hover:border-dracula-green dark:hover:bg-dracula-bg"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
            <button
              onClick={() => {
                resetForm(items.length);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg dark:from-dracula-purple dark:via-dracula-pink dark:to-dracula-cyan dark:text-dracula-bg"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Añadir EPP</span>
              <span className="sm:hidden">Añadir</span>
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => {
              setViewMode("list");
              setSearchQuery("");
              setCategoryFilter("all");
              setStatusFilter("all");
              setStockFilter("all");
              setCurrentPage(1);
              // Scroll suave a la sección de listado
              setTimeout(() => {
                document
                  .querySelector("section:nth-of-type(2)")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 100);
            }}
            className="rounded-3xl border border-mint-200/70 bg-mint-50/70 p-4 sm:p-5 text-left transition hover:border-mint-300 hover:bg-mint-100/70 hover:shadow-lg dark:border-dracula-green/30 dark:bg-dracula-current dark:hover:border-dracula-green/50 dark:hover:bg-dracula-green/10"
          >
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-mint-400 dark:text-dracula-green">
              Total de registros
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-dracula-foreground">
              {totals.totalItems}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
              Equipos registrados en el inventario.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-mint-500 dark:text-dracula-green">
              <List className="h-3.5 w-3.5" />
              Ver lista completa
            </p>
          </button>
          <button
            onClick={() => {
              setViewMode("card");
              setSearchQuery("");
              setCategoryFilter("all");
              setStatusFilter("all");
              setStockFilter("all");
              setCurrentPage(1);
              // Scroll suave a la sección de listado
              setTimeout(() => {
                document
                  .querySelector("section:nth-of-type(2)")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 100);
            }}
            className="rounded-3xl border border-celeste-200/70 bg-celeste-50/70 p-4 sm:p-5 text-left transition hover:border-celeste-300 hover:bg-celeste-100/70 hover:shadow-lg dark:border-dracula-cyan/30 dark:bg-dracula-current dark:hover:border-dracula-cyan/50 dark:hover:bg-dracula-cyan/10"
          >
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-celeste-400 dark:text-dracula-cyan">
              Unidades disponibles
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-dracula-foreground">
              {totals.totalUnits}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
              Suma de unidades considerando todas las tallas.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-celeste-500 dark:text-dracula-cyan">
              <Grid3x3 className="h-3.5 w-3.5" />
              Ver en tarjetas
            </p>
          </button>
          <button
            onClick={() => {
              setViewMode("list");
              setCategoryFilter("all");
              setStatusFilter("all");
              setStockFilter("critical");
              setSearchQuery("");
              setCurrentPage(1);
              // Scroll suave a la sección de listado
              setTimeout(() => {
                document
                  .querySelector("section:nth-of-type(2)")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 100);
            }}
            className="rounded-3xl border border-amber-200/70 bg-amber-50/60 p-4 sm:p-5 text-left transition hover:border-amber-300 hover:bg-amber-100/70 hover:shadow-lg dark:border-dracula-orange/30 dark:bg-dracula-current dark:hover:border-dracula-orange/50 dark:hover:bg-dracula-orange/10"
          >
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-400 dark:text-dracula-orange">
              En nivel crítico
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-dracula-foreground">
              {totals.lowStock}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
              EPP con stock igual o por debajo del mínimo.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-500 dark:text-dracula-orange">
              <List className="h-3.5 w-3.5" />
              Ver EPP críticos
            </p>
          </button>
          <button
            onClick={() => setShowCostModal(true)}
            className="rounded-3xl border border-purple-200/70 bg-purple-50/60 p-4 sm:p-5 text-left transition hover:border-purple-300 hover:bg-purple-100/70 hover:shadow-lg dark:border-dracula-purple/30 dark:bg-dracula-current dark:hover:border-dracula-purple/50 dark:hover:bg-dracula-purple/10"
          >
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-purple-400 dark:text-dracula-purple">
              Valor total inventario
            </p>
            <p className="mt-2 text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-800 dark:text-dracula-foreground">
              ${totals.totalValue.toLocaleString("es-CL")}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
              Valor total del stock actual en CLP.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-purple-500 dark:text-dracula-purple">
              <FileText className="h-3.5 w-3.5" />
              Ver análisis de costos
            </p>
          </button>
        </div>
      </section>

      <section className="rounded-4xl border border-white/70 bg-white/95 p-4 sm:p-6 lg:p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-dracula-current dark:bg-dracula-bg/95">
        <header className="mb-4 sm:mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                Listado de equipos
              </h3>
              <p className="text-sm text-slate-500 dark:text-dracula-comment">
                Mostrando {paginatedItems.length} de {filteredItems.length}{" "}
                equipos
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-soft-gray-200/70 bg-white p-1 shadow-sm dark:border-dracula-current dark:bg-dracula-current">
              <button
                onClick={() => setViewMode("card")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  viewMode === "card"
                    ? "bg-celeste-100 text-celeste-600 dark:bg-dracula-purple/30 dark:text-dracula-purple"
                    : "text-slate-500 hover:text-slate-700 dark:text-dracula-comment dark:hover:text-dracula-foreground"
                }`}
                aria-label="Vista de tarjetas"
              >
                <Grid3x3 className="h-4 w-4" />
                Tarjetas
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  viewMode === "list"
                    ? "bg-celeste-100 text-celeste-600 dark:bg-dracula-purple/30 dark:text-dracula-purple"
                    : "text-slate-500 hover:text-slate-700 dark:text-dracula-comment dark:hover:text-dracula-foreground"
                }`}
                aria-label="Vista de lista"
              >
                <List className="h-4 w-4" />
                Lista
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-dracula-comment" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por nombre o código..."
                className="w-full rounded-2xl border border-soft-gray-200/70 bg-white py-2 sm:py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground dark:placeholder-dracula-comment dark:focus:border-dracula-purple"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-2xl border border-soft-gray-200/70 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground dark:focus:border-dracula-purple"
            >
              <option value="all">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-2xl border border-soft-gray-200/70 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground dark:focus:border-dracula-purple"
            >
              <option value="all">Todos los estados</option>
              <option value="vigente">Vigente</option>
              <option value="discontinuado">Discontinuado</option>
            </select>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-2xl border border-soft-gray-200/70 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground dark:focus:border-dracula-purple"
            >
              <option value="all">Todos los niveles de stock</option>
              <option value="critical">Stock crítico</option>
              <option value="low">Stock mínimo (bajo)</option>
              <option value="critical-or-low">Stock crítico o mínimo</option>
            </select>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-celeste-200/70 bg-soft-gray-50/70 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-celeste-100/80 text-celeste-300">
              <Plus className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-700">
                Aún no has cargado EPP
              </h4>
              <p className="mt-2 text-sm text-slate-500">
                Registra tu primer equipo de protección para comenzar a
                controlar entregas, stock y certificaciones.
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-celeste-200/60 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-celeste-200 hover:text-slate-800"
            >
              <Plus className="h-4 w-4" />
              Registrar EPP
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-celeste-200/70 bg-soft-gray-50/70 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-celeste-100/80 text-celeste-300">
              <Search className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-700">
                No se encontraron resultados
              </h4>
              <p className="mt-2 text-sm text-slate-500">
                Intenta ajustar los filtros o la búsqueda para encontrar lo que
                necesitas.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("all");
                setStatusFilter("all");
                setStockFilter("all");
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-celeste-200/60 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-celeste-200 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            {viewMode === "card" ? (
              <div className="mt-8 space-y-6">
                {paginatedItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-4xl border border-soft-gray-200/70 bg-white/95 p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] transition hover:shadow-[0_22px_50px_-28px_rgba(15,23,42,0.45)] dark:border-dracula-current dark:bg-dracula-bg/95 lg:p-8"
                  >
                    <div className="flex flex-col gap-6 lg:flex-row">
                      <div className="flex w-full items-center justify-center rounded-3xl bg-soft-gray-50/70 p-4 dark:bg-dracula-current lg:w-40 lg:flex-shrink-0">
                        {item.imageBase64 ? (
                          <img
                            src={item.imageBase64}
                            alt={item.name}
                            className="h-28 w-28 rounded-2xl object-cover shadow-inner lg:h-32 lg:w-32"
                          />
                        ) : (
                          <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-dashed border-soft-gray-300 text-xs text-slate-400 dark:border-dracula-comment dark:text-dracula-comment lg:h-32 lg:w-32">
                            Sin imagen
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
                                {item.eppId}
                              </p>
                              {item.discontinued ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50/80 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:border-dracula-orange/50 dark:bg-dracula-orange/20 dark:text-dracula-orange">
                                  <Archive className="h-3 w-3" />
                                  Discontinuado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-mint-200/70 bg-mint-50/80 px-2.5 py-0.5 text-xs font-semibold text-mint-600 dark:border-dracula-green/50 dark:bg-dracula-green/20 dark:text-dracula-green">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Vigente
                                </span>
                              )}
                            </div>
                            <h4 className="mt-1 text-xl font-semibold text-slate-800 dark:text-dracula-foreground">
                              {item.name}
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-dracula-comment">
                              {item.category}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-celeste-400 dark:text-dracula-cyan">
                              ${item.price.toLocaleString("es-CL")}{" "}
                              <span className="text-xs text-slate-400 dark:text-dracula-comment">
                                CLP
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-celeste-200/70 bg-white/80 text-celeste-400 transition hover:border-celeste-300 hover:bg-celeste-50"
                              aria-label="Editar EPP"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDiscontinued(item.id)}
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                                item.discontinued
                                  ? "border-mint-200/70 bg-white/80 text-mint-500 hover:border-mint-300 hover:bg-mint-50"
                                  : "border-amber-200/70 bg-white/80 text-amber-500 hover:border-amber-300 hover:bg-amber-50"
                              }`}
                              aria-label={
                                item.discontinued
                                  ? "Poner en vigencia"
                                  : "Descontinuar"
                              }
                              title={
                                item.discontinued
                                  ? "Poner en vigencia"
                                  : "Descontinuar"
                              }
                            >
                              {item.discontinued ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Archive className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/70 bg-white/80 text-rose-400 transition hover:border-rose-300 hover:bg-rose-50"
                              aria-label="Eliminar EPP"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          {item.brand ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-soft-gray-200/80 bg-white/80 px-3 py-1 font-semibold">
                              Marca: {item.brand}
                            </span>
                          ) : null}
                          {item.location ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-soft-gray-200/80 bg-white/80 px-3 py-1">
                              <MapPin className="h-3.5 w-3.5 text-celeste-300" />
                              {item.location}
                            </span>
                          ) : null}
                          {item.certifications.length > 0 ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-soft-gray-200/80 bg-white/80 px-3 py-1">
                              <FileText className="h-3.5 w-3.5 text-mint-400" />
                              {item.certifications.join(", ")}
                            </span>
                          ) : null}
                        </div>

                        <div className="rounded-3xl bg-soft-gray-50/80 p-5 text-sm text-slate-600">
                          {item.multiSize ? (
                            <div className="space-y-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                Detalle por talla
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {item.sizeVariants.map((variant) => {
                                  const status =
                                    variant.stockActual <= variant.stockCritico
                                      ? "text-rose-400"
                                      : variant.stockActual <=
                                        variant.stockMinimo
                                      ? "text-amber-500"
                                      : "text-mint-500";
                                  return (
                                    <div
                                      key={variant.id}
                                      className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm"
                                    >
                                      <p className="text-sm font-semibold text-slate-700">
                                        Talla {variant.label}
                                      </p>
                                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                        <span>
                                          Stock: {variant.stockActual}
                                        </span>
                                        <span className={status}>
                                          Mín: {variant.stockMinimo}
                                        </span>
                                      </div>
                                      <p className={`mt-1 text-xs ${status}`}>
                                        Crítico: {variant.stockCritico}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                  Stock
                                </p>
                                <p
                                  className={`mt-1 text-lg font-semibold ${
                                    (item.stockActual ?? 0) <=
                                    (item.stockCritico ?? 0)
                                      ? "text-rose-500"
                                      : (item.stockActual ?? 0) <=
                                        (item.stockMinimo ?? 0)
                                      ? "text-amber-500"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {item.stockActual ?? 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                  Mínimo
                                </p>
                                <p className="mt-1 text-lg font-semibold text-slate-700">
                                  {item.stockMinimo ?? 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                  Crítico
                                </p>
                                <p className="mt-1 text-lg font-semibold text-slate-700">
                                  {item.stockCritico ?? 0}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {item.model ? (
                          <div className="rounded-2xl border border-celeste-100/70 bg-celeste-50/50 px-4 py-3 text-xs text-slate-600">
                            <p className="font-semibold text-slate-700">
                              Protección principal:
                            </p>
                            <p className="mt-1 leading-relaxed">{item.model}</p>
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-3 text-sm">
                          {item.technicalSheetBase64 &&
                          item.technicalSheetName ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleViewFile(item.technicalSheetBase64!)
                              }
                              className="inline-flex items-center gap-2 rounded-full border border-celeste-200/70 bg-white/80 px-5 py-2 font-semibold text-celeste-400 transition hover:border-celeste-300 hover:bg-celeste-50"
                            >
                              <FileText className="h-4 w-4" />
                              Ficha técnica
                            </button>
                          ) : null}
                          {item.certificatesBase64 && item.certificatesName ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleViewFile(item.certificatesBase64!)
                              }
                              className="inline-flex items-center gap-2 rounded-full border border-celeste-200/70 bg-white/80 px-5 py-2 font-semibold text-celeste-400 transition hover:border-celeste-300 hover:bg-celeste-50"
                            >
                              <FileText className="h-4 w-4" />
                              Certificados
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-8">
                {/* Indicador de scroll en móviles */}
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-500 dark:text-dracula-comment sm:hidden">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                  <span>Desliza para ver más información</span>
                </div>
                <div className="overflow-x-auto scrollbar-thin rounded-2xl border border-soft-gray-200/70 shadow-sm dark:border-dracula-current">
                  <table className="w-full min-w-[800px] border-collapse bg-white dark:bg-dracula-bg">
                    <thead>
                      <tr className="border-b-2 border-soft-gray-200/70 dark:border-dracula-current">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-dracula-comment">
                          Código
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-dracula-comment">
                          Nombre
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-dracula-comment">
                          Categoría
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-dracula-comment">
                          Marca
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-dracula-comment">
                          Stock
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-dracula-comment">
                          Precio
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-dracula-comment">
                          Ubicación
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-dracula-comment">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-dracula-comment">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-soft-gray-200/50 dark:divide-dracula-current">
                      {paginatedItems.map((item) => {
                        const totalStock = item.multiSize
                          ? item.sizeVariants.reduce(
                              (acc, v) => acc + v.stockActual,
                              0
                            )
                          : item.stockActual ?? 0;
                        const minStock = item.multiSize
                          ? Math.min(
                              ...item.sizeVariants.map((v) => v.stockMinimo)
                            )
                          : item.stockMinimo ?? 0;
                        const criticalStock = item.multiSize
                          ? Math.min(
                              ...item.sizeVariants.map((v) => v.stockCritico)
                            )
                          : item.stockCritico ?? 0;

                        // Contar tallas en estado crítico
                        const criticalSizes = item.multiSize
                          ? item.sizeVariants.filter(
                              (v) => v.stockActual <= v.stockCritico
                            )
                          : [];

                        const stockStatus =
                          totalStock <= criticalStock
                            ? "critical"
                            : totalStock <= minStock
                            ? "low"
                            : "ok";

                        return (
                          <tr
                            key={item.id}
                            className="transition hover:bg-soft-gray-50/50 dark:hover:bg-dracula-current/30"
                          >
                            <td className="px-4 py-4">
                              <span className="text-xs font-semibold text-celeste-400 dark:text-dracula-cyan">
                                {item.eppId}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                {item.imageBase64 ? (
                                  <img
                                    src={item.imageBase64}
                                    alt={item.name}
                                    className="h-10 w-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-soft-gray-300 text-xs text-slate-400 dark:border-dracula-comment dark:text-dracula-comment">
                                    -
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-slate-800 dark:text-dracula-foreground">
                                    {item.name}
                                  </p>
                                  {item.multiSize && (
                                    <p className="text-xs text-slate-500 dark:text-dracula-comment">
                                      {item.sizeVariants.length} tallas
                                      {criticalSizes.length > 0 && (
                                        <span className="ml-1.5 text-amber-500 dark:text-dracula-orange">
                                          ({criticalSizes.length} crítica
                                          {criticalSizes.length > 1 ? "s" : ""})
                                        </span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-slate-600 dark:text-dracula-comment">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-slate-600 dark:text-dracula-comment">
                                {item.brand || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-semibold ${
                                    stockStatus === "critical"
                                      ? "text-rose-500"
                                      : stockStatus === "low"
                                      ? "text-amber-500"
                                      : "text-slate-700 dark:text-dracula-foreground"
                                  }`}
                                >
                                  {totalStock}
                                </span>
                                {stockStatus !== "ok" && (
                                  <span
                                    className={`inline-flex h-2 w-2 rounded-full ${
                                      stockStatus === "critical"
                                        ? "bg-rose-500"
                                        : "bg-amber-500"
                                    }`}
                                    title={
                                      stockStatus === "critical"
                                        ? "Stock crítico"
                                        : "Stock bajo"
                                    }
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                                ${item.price.toLocaleString("es-CL")}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              {item.location ? (
                                <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-dracula-comment">
                                  <MapPin className="h-3.5 w-3.5 text-celeste-300 dark:text-dracula-cyan" />
                                  {item.location}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400 dark:text-dracula-comment">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {item.discontinued ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50/80 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:border-dracula-orange/50 dark:bg-dracula-orange/20 dark:text-dracula-orange">
                                  <Archive className="h-3 w-3" />
                                  Discontinuado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-mint-200/70 bg-mint-50/80 px-2.5 py-1 text-xs font-semibold text-mint-600 dark:border-dracula-green/50 dark:bg-dracula-green/20 dark:text-dracula-green">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Vigente
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(item)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-celeste-200/70 bg-white/80 text-celeste-400 transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-cyan/50 dark:bg-dracula-current dark:text-dracula-cyan dark:hover:bg-dracula-cyan/20"
                                  aria-label="Editar EPP"
                                  title="Editar"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleDiscontinued(item.id)
                                  }
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                                    item.discontinued
                                      ? "border-mint-200/70 bg-white/80 text-mint-500 hover:border-mint-300 hover:bg-mint-50 dark:border-dracula-green/50 dark:bg-dracula-current dark:text-dracula-green dark:hover:bg-dracula-green/20"
                                      : "border-amber-200/70 bg-white/80 text-amber-500 hover:border-amber-300 hover:bg-amber-50 dark:border-dracula-orange/50 dark:bg-dracula-current dark:text-dracula-orange dark:hover:bg-dracula-orange/20"
                                  }`}
                                  aria-label={
                                    item.discontinued
                                      ? "Poner en vigencia"
                                      : "Descontinuar"
                                  }
                                  title={
                                    item.discontinued
                                      ? "Poner en vigencia"
                                      : "Descontinuar"
                                  }
                                >
                                  {item.discontinued ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <Archive className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200/70 bg-white/80 text-rose-400 transition hover:border-rose-300 hover:bg-rose-50 dark:border-dracula-red/50 dark:bg-dracula-current dark:text-dracula-red dark:hover:bg-dracula-red/20"
                                  aria-label="Eliminar EPP"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-600 transition hover:border-celeste-200 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition ${
                          currentPage === pageNum
                            ? "border-celeste-300 bg-celeste-50 text-celeste-600"
                            : "border-soft-gray-200/80 text-slate-600 hover:border-celeste-200 hover:text-slate-800"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-600 transition hover:border-celeste-200 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
          <div className="flex min-h-screen items-start justify-center px-4 py-10 sm:px-6 lg:py-16">
            <div className="relative w-full max-w-5xl rounded-[28px] border border-white/70 bg-white/95 px-6 py-8 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.6)] dark:border-dracula-current dark:bg-dracula-bg/95 sm:px-8 lg:px-10 lg:py-10">
              <button
                type="button"
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground sm:right-6 sm:top-6 sm:h-10 sm:w-10"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mb-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-300 dark:text-dracula-cyan">
                  {editingItemId ? "Editar equipo" : "Nuevo equipo"}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
                  {editingItemId ? "Actualizar EPP" : "Registrar EPP"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-dracula-comment">
                  {editingItemId
                    ? "Modifica los datos del equipo y guarda los cambios. Los archivos actuales se mantendrán si no subes nuevos."
                    : "Completa la información del equipo, configura tallas y adjunta documentación de respaldo. Todos los archivos se almacenarán en formato base64."}
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1 text-sm text-slate-600">
                    ID interno / Código EPP
                    <div className="rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50 px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-inner">
                      {formState.eppId}
                    </div>
                  </div>
                  <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Nombre del EPP *
                    <input
                      type="text"
                      value={formState.name}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                      placeholder="Casco de seguridad dieléctrico"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Categoría *
                    <select
                      value={formState.category}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          category: event.target.value,
                          model: event.target.value
                            ? categoryProtectionMap[event.target.value] ?? ""
                            : "",
                        }))
                      }
                      className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                      required
                    >
                      <option value="">Selecciona una categoría</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-col gap-1 text-sm text-slate-600">
                    Protección principal
                    <div className="rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50 px-4 py-2.5 text-sm text-slate-600 shadow-inner">
                      {formState.model ||
                        "Selecciona una categoría para sugerir la protección principal."}
                    </div>
                  </div>
                  <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Marca
                    <input
                      type="text"
                      value={formState.brand}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          brand: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                      placeholder="3M, MSA, etc."
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Precio unitario (CLP) *
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formState.price}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          price: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                      placeholder="0"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Ubicación física
                    <input
                      type="text"
                      value={formState.location}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          location: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                      placeholder="Almacén central, Isla 3"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-slate-600 md:col-span-2">
                    Certificaciones (separadas por comas)
                    <input
                      type="text"
                      value={formState.certifications}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          certifications: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                      placeholder="ANSI Z89.1, EN397, NOM-231, etc."
                    />
                  </label>
                </div>

                <div className="rounded-3xl border border-soft-gray-200/70 bg-soft-gray-50/70 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700">
                        Gestión de stock
                      </h4>
                      <p className="text-xs text-slate-500">
                        Configura si este EPP maneja tallas o talla única.
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={formState.multiSize}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            multiSize: event.target.checked,
                            sizeVariants: event.target.checked
                              ? prev.sizeVariants
                              : [createSizeVariant()],
                          }))
                        }
                        className="h-4 w-4 rounded border-soft-gray-300 text-celeste-300 focus:ring-celeste-200"
                      />
                      Manejar por tallas
                    </label>
                  </div>

                  {formError ? (
                    <div className="mt-4 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-500">
                      {formError}
                    </div>
                  ) : null}

                  {formState.multiSize ? (
                    <div className="mt-4 space-y-4">
                      {formState.sizeVariants.map((variant, index) => (
                        <div
                          key={variant.id}
                          className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <h5 className="text-sm font-semibold text-slate-700">
                              Talla #{index + 1}
                            </h5>
                            {formState.sizeVariants.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(variant.id)}
                                className="text-xs font-semibold text-rose-400 hover:text-rose-500"
                              >
                                Eliminar
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-4">
                            <input
                              type="text"
                              value={variant.label}
                              onChange={(event) =>
                                handleVariantChange(
                                  variant.id,
                                  "label",
                                  event.target.value
                                )
                              }
                              placeholder="Talla (S, M, 42, etc.)"
                              className="rounded-2xl border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                            />
                            <input
                              type="number"
                              min={0}
                              value={variant.stockActual}
                              onChange={(event) =>
                                handleVariantChange(
                                  variant.id,
                                  "stockActual",
                                  event.target.value
                                )
                              }
                              placeholder="Stock actual"
                              className="rounded-2xl border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                            />
                            <input
                              type="number"
                              min={0}
                              value={variant.stockMinimo}
                              onChange={(event) =>
                                handleVariantChange(
                                  variant.id,
                                  "stockMinimo",
                                  event.target.value
                                )
                              }
                              placeholder="Stock mínimo"
                              className="rounded-2xl border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                            />
                            <input
                              type="number"
                              min={0}
                              value={variant.stockCritico}
                              onChange={(event) =>
                                handleVariantChange(
                                  variant.id,
                                  "stockCritico",
                                  event.target.value
                                )
                              }
                              placeholder="Stock crítico"
                              className="rounded-2xl border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setFormState((prev) => ({
                            ...prev,
                            sizeVariants: [
                              ...prev.sizeVariants,
                              createSizeVariant(),
                            ],
                          }))
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-celeste-200/70 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-celeste-200 hover:text-slate-800"
                      >
                        <Plus className="h-4 w-4" />
                        Añadir talla
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <label className="flex flex-col gap-1 text-xs text-slate-600">
                        Stock actual
                        <input
                          type="number"
                          min={0}
                          value={formState.stockActual}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              stockActual: event.target.value,
                            }))
                          }
                          className="rounded-2xl border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                          placeholder="Cantidad disponible"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-slate-600">
                        Stock mínimo
                        <input
                          type="number"
                          min={0}
                          value={formState.stockMinimo}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              stockMinimo: event.target.value,
                            }))
                          }
                          className="rounded-2xl border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                          placeholder="Umbral mínimo"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-slate-600">
                        Stock crítico
                        <input
                          type="number"
                          min={0}
                          value={formState.stockCritico}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              stockCritico: event.target.value,
                            }))
                          }
                          className="rounded-2xl border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none"
                          placeholder="Umbral crítico"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Fotografía del EPP
                    <div className="rounded-2xl border border-dashed border-celeste-200/70 bg-celeste-50/40 px-4 py-5 text-center">
                      {formState.imageBase64 ? (
                        <div className="space-y-3">
                          <img
                            src={formState.imageBase64}
                            alt="Preview"
                            className="mx-auto h-24 w-24 rounded-xl object-cover"
                          />
                          <p className="text-xs font-medium text-slate-600">
                            {formState.photoName}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <label
                              htmlFor="epp-photo-upload"
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-celeste-200/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-celeste-600 transition hover:border-celeste-300 hover:bg-celeste-50"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Cambiar
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setFormState((prev) => ({
                                  ...prev,
                                  imageBase64: undefined,
                                  photoName: undefined,
                                }))
                              }
                              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                            >
                              <X className="h-3.5 w-3.5" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <label
                            htmlFor="epp-photo-upload"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-celeste-200/70 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-celeste-200"
                          >
                            <Upload className="h-4 w-4" />
                            Subir imagen
                          </label>
                          <p className="mt-2 text-xs text-slate-500">
                            Formatos PNG o JPG. Se almacenará en base64.
                          </p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleFileUpload(event, "imageBase64", "photoName")
                        }
                        className="hidden"
                        id="epp-photo-upload"
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Ficha técnica (PDF)
                    <div className="rounded-2xl border border-dashed border-celeste-200/70 bg-celeste-50/40 px-4 py-5 text-center">
                      {formState.technicalSheetBase64 ? (
                        <div className="space-y-3">
                          <FileText className="mx-auto h-12 w-12 text-celeste-400" />
                          <p className="text-xs font-medium text-slate-600">
                            {formState.technicalSheetName}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <label
                              htmlFor="epp-tech-upload"
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-celeste-200/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-celeste-600 transition hover:border-celeste-300 hover:bg-celeste-50"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Cambiar
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setFormState((prev) => ({
                                  ...prev,
                                  technicalSheetBase64: undefined,
                                  technicalSheetName: undefined,
                                }))
                              }
                              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                            >
                              <X className="h-3.5 w-3.5" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <label
                            htmlFor="epp-tech-upload"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-celeste-200/70 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-celeste-200"
                          >
                            <Upload className="h-4 w-4" />
                            Adjuntar ficha técnica
                          </label>
                          <p className="mt-2 text-xs text-slate-500">
                            Máximo 5 MB. Se convierte a base64.
                          </p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(event) =>
                          handleFileUpload(
                            event,
                            "technicalSheetBase64",
                            "technicalSheetName"
                          )
                        }
                        className="hidden"
                        id="epp-tech-upload"
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Certificados (PDF)
                    <div className="rounded-2xl border border-dashed border-celeste-200/70 bg-celeste-50/40 px-4 py-5 text-center">
                      {formState.certificatesBase64 ? (
                        <div className="space-y-3">
                          <FileText className="mx-auto h-12 w-12 text-mint-400" />
                          <p className="text-xs font-medium text-slate-600">
                            {formState.certificatesName}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <label
                              htmlFor="epp-cert-upload"
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-celeste-200/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-celeste-600 transition hover:border-celeste-300 hover:bg-celeste-50"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Cambiar
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setFormState((prev) => ({
                                  ...prev,
                                  certificatesBase64: undefined,
                                  certificatesName: undefined,
                                }))
                              }
                              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                            >
                              <X className="h-3.5 w-3.5" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <label
                            htmlFor="epp-cert-upload"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-celeste-200/70 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-celeste-200"
                          >
                            <Upload className="h-4 w-4" />
                            Adjuntar certificados
                          </label>
                          <p className="mt-2 text-xs text-slate-500">
                            Puedes subir un archivo con todas las
                            certificaciones.
                          </p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(event) =>
                          handleFileUpload(
                            event,
                            "certificatesBase64",
                            "certificatesName"
                          )
                        }
                        className="hidden"
                        id="epp-cert-upload"
                      />
                    </div>
                  </label>
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm(items.length);
                    }}
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
                      : editingItemId
                      ? "Actualizar EPP"
                      : "Guardar EPP"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {showCostModal && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-2 sm:p-4">
          <div className="w-full max-w-6xl my-4 sm:my-10 lg:my-16">
            <div className="relative rounded-2xl sm:rounded-[28px] border border-white/70 bg-white/95 px-3 py-4 sm:px-6 sm:py-8 lg:px-10 lg:py-10 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.6)] dark:border-dracula-current dark:bg-dracula-bg/95 overflow-hidden">
              <button
                type="button"
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/80 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground sm:right-6 sm:top-6 sm:h-10 sm:w-10"
                onClick={() => setShowCostModal(false)}
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4 sm:mb-6 space-y-1 sm:space-y-2 pr-8">
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-purple-400 dark:text-dracula-purple">
                  Análisis de costos
                </p>
                <h3 className="mt-1 sm:mt-2 text-lg sm:text-xl lg:text-2xl font-semibold text-slate-800 dark:text-dracula-foreground">
                  Valor del inventario por categoría
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-dracula-comment">
                  Visualiza la distribución de costos y unidades de tu
                  inventario EPP
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4 lg:space-y-6 overflow-x-hidden">
                {/* Layout principal: Donas a la izquierda, líneas a la derecha */}
                <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-[380px_1fr]">
                  {/* Columna izquierda - Gráficos de dona */}
                  <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                    {/* Dona 1 - Distribución de valor */}
                    <div className="rounded-2xl sm:rounded-3xl border border-soft-gray-200/70 bg-white p-3 sm:p-4 lg:p-5 dark:border-dracula-current dark:bg-dracula-bg">
                      <h4 className="mb-2 sm:mb-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-dracula-foreground">
                        Distribución de valor
                      </h4>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie
                            data={costDataByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={false}
                            outerRadius={60}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            onMouseEnter={(_, index) =>
                              setActiveCategory(costDataByCategory[index].name)
                            }
                            onMouseLeave={() => setActiveCategory(null)}
                          >
                            {costDataByCategory.map((entry, index) => (
                              <Cell
                                key={`cell-value-${index}`}
                                fill={
                                  [
                                    "rgba(139, 92, 246, 0.85)",
                                    "rgba(167, 139, 250, 0.85)",
                                    "rgba(196, 181, 253, 0.85)",
                                    "rgba(221, 214, 254, 0.85)",
                                    "rgba(6, 182, 212, 0.85)",
                                    "rgba(34, 211, 238, 0.85)",
                                    "rgba(103, 232, 249, 0.85)",
                                    "rgba(165, 243, 252, 0.85)",
                                  ][index % 8]
                                }
                                opacity={
                                  activeCategory === null ||
                                  activeCategory === entry.name
                                    ? 1
                                    : 0.3
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) =>
                              `$${value.toLocaleString("es-CL")}`
                            }
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.98)",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              padding: "8px",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Leyenda personalizada */}
                      <div className="mt-2 sm:mt-3 lg:mt-4 space-y-1">
                        {costDataByCategory.map((cat, index) => {
                          const words = cat.name?.split(" ") || [];
                          const label =
                            words[0]?.toLowerCase() === "protección" &&
                            words.length > 1
                              ? words.slice(1).join(" ")
                              : cat.name || "";
                          const percentage = (
                            (cat.value / totals.totalValue) *
                            100
                          ).toFixed(0);
                          return (
                            <div
                              key={`legend-value-${index}`}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="h-3 w-3 rounded-sm flex-shrink-0"
                                style={{
                                  backgroundColor: [
                                    "rgba(139, 92, 246, 0.85)",
                                    "rgba(167, 139, 250, 0.85)",
                                    "rgba(196, 181, 253, 0.85)",
                                    "rgba(221, 214, 254, 0.85)",
                                    "rgba(6, 182, 212, 0.85)",
                                    "rgba(34, 211, 238, 0.85)",
                                    "rgba(103, 232, 249, 0.85)",
                                    "rgba(165, 243, 252, 0.85)",
                                  ][index % 8],
                                }}
                              />
                              <span className="text-[10px] sm:text-xs text-slate-600 dark:text-dracula-comment">
                                {label}: {percentage}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dona 2 - Distribución de unidades */}
                    <div className="rounded-2xl sm:rounded-3xl border border-soft-gray-200/70 bg-white p-3 sm:p-4 lg:p-5 dark:border-dracula-current dark:bg-dracula-bg">
                      <h4 className="mb-2 sm:mb-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-dracula-foreground">
                        Distribución de unidades
                      </h4>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie
                            data={costDataByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={false}
                            outerRadius={60}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="units"
                            onMouseEnter={(_, index) =>
                              setActiveCategory(costDataByCategory[index].name)
                            }
                            onMouseLeave={() => setActiveCategory(null)}
                          >
                            {costDataByCategory.map((entry, index) => (
                              <Cell
                                key={`cell-units-${index}`}
                                fill={
                                  [
                                    "rgba(6, 182, 212, 0.85)",
                                    "rgba(34, 211, 238, 0.85)",
                                    "rgba(103, 232, 249, 0.85)",
                                    "rgba(165, 243, 252, 0.85)",
                                    "rgba(139, 92, 246, 0.85)",
                                    "rgba(167, 139, 250, 0.85)",
                                    "rgba(196, 181, 253, 0.85)",
                                    "rgba(221, 214, 254, 0.85)",
                                  ][index % 8]
                                }
                                opacity={
                                  activeCategory === null ||
                                  activeCategory === entry.name
                                    ? 1
                                    : 0.3
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => `${value} unidades`}
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.98)",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              padding: "8px",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Leyenda personalizada */}
                      <div className="mt-4 space-y-1.5">
                        {costDataByCategory.map((cat, index) => {
                          const words = cat.name?.split(" ") || [];
                          const label =
                            words[0]?.toLowerCase() === "protección" &&
                            words.length > 1
                              ? words.slice(1).join(" ")
                              : cat.name || "";
                          const percentage = (
                            (cat.units / totals.totalUnits) *
                            100
                          ).toFixed(0);
                          return (
                            <div
                              key={`legend-units-${index}`}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="h-3 w-3 rounded-sm flex-shrink-0"
                                style={{
                                  backgroundColor: [
                                    "rgba(6, 182, 212, 0.85)",
                                    "rgba(34, 211, 238, 0.85)",
                                    "rgba(103, 232, 249, 0.85)",
                                    "rgba(165, 243, 252, 0.85)",
                                    "rgba(139, 92, 246, 0.85)",
                                    "rgba(167, 139, 250, 0.85)",
                                    "rgba(196, 181, 253, 0.85)",
                                    "rgba(221, 214, 254, 0.85)",
                                  ][index % 8],
                                }}
                              />
                              <span className="text-xs text-slate-600 dark:text-dracula-comment">
                                {label}: {percentage}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Columna derecha - Gráfico combinado (barras + línea) + Tabla resumen */}
                  <div className="grid grid-rows-[auto_auto] lg:grid-rows-[1fr_auto] gap-3 sm:gap-4 lg:gap-6 h-auto lg:h-full lg:min-h-[500px]">
                    <div className="rounded-2xl sm:rounded-3xl border border-soft-gray-200/70 bg-white p-3 sm:p-4 lg:p-5 dark:border-dracula-current dark:bg-dracula-bg flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-dracula-foreground">
                          Valor de inventario por categoría
                        </h4>
                        <span className="text-[10px] text-slate-400 dark:text-dracula-comment sm:hidden">
                          Desliza →
                        </span>
                      </div>
                      <div className="overflow-x-auto overflow-y-hidden -mx-3 sm:-mx-4 lg:-mx-5 px-3 sm:px-4 lg:px-5 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent dark:scrollbar-thumb-dracula-current">
                        <div className="h-[250px] sm:h-[300px] lg:h-[350px] min-w-[500px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={costDataByCategory}
                              margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 20,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e5e7eb"
                                opacity={0.3}
                              />
                              <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                interval={0}
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickFormatter={(value) => {
                                  const words = value?.split(" ") || [];
                                  return words[0]?.toLowerCase() ===
                                    "protección" && words.length > 1
                                    ? words.slice(1).join(" ")
                                    : value || "";
                                }}
                              />
                              <YAxis
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickFormatter={(value) => {
                                  if (value >= 1000000) {
                                    return `$${(value / 1000000).toLocaleString(
                                      "es-CL",
                                      { maximumFractionDigits: 1 }
                                    )}M`;
                                  }
                                  if (value >= 1000) {
                                    return `$${(value / 1000).toLocaleString(
                                      "es-CL"
                                    )}k`;
                                  }
                                  return `$${value.toLocaleString("es-CL")}`;
                                }}
                              />
                              <Tooltip
                                formatter={(value: number, name: string) => {
                                  if (name === "Unidades") {
                                    return [`${value} unidades`, name];
                                  }
                                  return [
                                    `$${value.toLocaleString("es-CL")}`,
                                    name,
                                  ];
                                }}
                                contentStyle={{
                                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "12px",
                                  padding: "10px",
                                  fontSize: "13px",
                                }}
                              />
                              <Bar
                                dataKey="value"
                                fill="rgba(16, 185, 129, 0.7)"
                                radius={[8, 8, 0, 0]}
                                name="Valor"
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="rgba(139, 92, 246, 0.9)"
                                strokeWidth={2.5}
                                dot={{
                                  fill: "rgba(139, 92, 246, 0.9)",
                                  r: 5,
                                  strokeWidth: 2,
                                  stroke: "#fff",
                                }}
                                activeDot={{ r: 7, fill: "#8b5cf6" }}
                                name="Tendencia"
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Tabla resumen compacta */}
                    <div className="rounded-2xl sm:rounded-3xl border border-soft-gray-200/70 bg-white p-3 sm:p-4 lg:p-5 dark:border-dracula-current dark:bg-dracula-bg overflow-hidden">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-dracula-foreground">
                          Resumen por categoría
                        </h4>
                        <span className="text-[10px] text-slate-400 dark:text-dracula-comment sm:hidden">
                          Desliza →
                        </span>
                      </div>
                      <div className="overflow-x-auto -mx-3 sm:-mx-4 lg:-mx-5 px-3 sm:px-4 lg:px-5 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent dark:scrollbar-thumb-dracula-current">
                        <table className="w-full min-w-[500px]">
                          <thead>
                            <tr className="border-b border-soft-gray-200 dark:border-dracula-current">
                              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-dracula-comment">
                                Categoría
                              </th>
                              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-dracula-comment">
                                Items
                              </th>
                              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-dracula-comment">
                                Unidades
                              </th>
                              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-dracula-comment">
                                Valor Total
                              </th>
                              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-dracula-comment">
                                %
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-soft-gray-200/50 dark:divide-dracula-current">
                            {costDataByCategory.map((cat) => (
                              <tr
                                key={cat.name}
                                className="transition hover:bg-soft-gray-50 dark:hover:bg-dracula-current/30"
                              >
                                <td className="px-3 py-2 text-xs font-medium text-slate-800 dark:text-dracula-foreground">
                                  {cat.name}
                                </td>
                                <td className="px-3 py-2 text-right text-xs text-slate-600 dark:text-dracula-comment">
                                  {cat.items}
                                </td>
                                <td className="px-3 py-2 text-right text-xs text-slate-600 dark:text-dracula-comment">
                                  {cat.units}
                                </td>
                                <td className="px-3 py-2 text-right text-xs font-semibold text-purple-600 dark:text-dracula-purple">
                                  ${cat.value.toLocaleString("es-CL")}
                                </td>
                                <td className="px-3 py-2 text-right text-xs text-slate-600 dark:text-dracula-comment">
                                  {(
                                    (cat.value / totals.totalValue) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 border-soft-gray-200 dark:border-dracula-current">
                            <tr className="bg-soft-gray-50 dark:bg-dracula-current">
                              <td className="px-3 py-2 text-xs font-bold text-slate-800 dark:text-dracula-foreground">
                                TOTAL
                              </td>
                              <td className="px-3 py-2 text-right text-xs font-bold text-slate-800 dark:text-dracula-foreground">
                                {totals.totalItems}
                              </td>
                              <td className="px-3 py-2 text-right text-xs font-bold text-slate-800 dark:text-dracula-foreground">
                                {totals.totalUnits}
                              </td>
                              <td className="px-3 py-2 text-right text-xs font-bold text-purple-600 dark:text-dracula-purple">
                                ${totals.totalValue.toLocaleString("es-CL")}
                              </td>
                              <td className="px-3 py-2 text-right text-xs font-bold text-slate-800 dark:text-dracula-foreground">
                                100%
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
