import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import SignaturePad from "signature_pad";
import * as XLSX from "xlsx";
import {
  BarChart3,
  Calendar,
  Download,
  Fingerprint,
  Grid3x3,
  ChevronDown,
  HardHat,
  Layers,
  List,
  MoveHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Truck,
  User,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
  Bar,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { useTrabajadoresFirestore } from "../hooks/useTrabajadoresFirestore";
import { useEppFirestore } from "../hooks/useEppFirestore";
import {
  useEppEntregasFirestore,
  type Entrega,
  type EntregaItem,
  type CreateEntregaInput,
} from "../hooks/useEppEntregasFirestore";
import { useAccessControl } from "../hooks/useAccessControl";

type DraftItem = {
  tempId: string;
  eppId: string;
  variantId?: string | null;
  cantidad: number;
  initialCantidad: number;
  fechaRecambio: string;
};

type FormState = {
  trabajadorId: string;
  trabajadorCargo: string;
  fechaEntrega: string;
  firmaFecha: string;
  firmaHora: string;
  observaciones: string;
  capacitacion: {
    instruccionUso: boolean;
    conoceLimitaciones: boolean;
    recibioFolletos: boolean;
    declaracionAceptada: boolean;
  };
  items: DraftItem[];
  firmaDigitalDataUrl: string | null;
  firmaDigitalToken: string | null;
  firmaDigitalHash: string | null;
  firmaDigitalTimestamp: string | null;
  firmaResponsableDataUrl: string | null;
  firmaResponsableToken: string | null;
  firmaResponsableHash: string | null;
  firmaResponsableTimestamp: string | null;
  firmaTipo: "digital" | "manual";
  generarPdf: boolean;
};

const getTodayDate = () => new Date().toISOString().split("T")[0];
const getCurrentTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const initialFormState = (): FormState => ({
  trabajadorId: "",
  trabajadorCargo: "",
  fechaEntrega: getTodayDate(),
  firmaFecha: getTodayDate(),
  firmaHora: getCurrentTime(),
  observaciones: "",
  capacitacion: {
    instruccionUso: true,
    conoceLimitaciones: true,
    recibioFolletos: true,
    declaracionAceptada: true,
  },
  items: [],
  firmaDigitalDataUrl: null,
  firmaDigitalToken: null,
  firmaDigitalHash: null,
  firmaDigitalTimestamp: null,
  firmaResponsableDataUrl: null,
  firmaResponsableToken: null,
  firmaResponsableHash: null,
  firmaResponsableTimestamp: null,
  firmaTipo: "manual",
  generarPdf: false,
});

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const integerFormatter = new Intl.NumberFormat("es-CL");

const TOP_AREA_WINDOW_DAYS_OPTIONS = [7, 30, 90];
const TOP_EPP_ROTATION_MONTHS = 3;
const ROTATION_CHART_COLORS = ["#14b8a6", "#0ea5e9", "#f59e0b", "#a855f7"];
const AREA_TREND_CHART_COLORS = [
  "#0ea5e9",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#22c55e",
];

type SpendingPeriod = "week" | "month" | "year";

type SpendingSeriesPoint = {
  key: string;
  label: string;
  totalValue: number;
  deliveries: number;
  averagePerEntrega: number;
};

const SPENDING_PERIODS: {
  value: SpendingPeriod;
  label: string;
  description: string;
}[] = [
  { value: "week", label: "Semanal", description: "Últimas 12 semanas" },
  { value: "month", label: "Mensual", description: "Últimos 12 meses" },
  { value: "year", label: "Anual", description: "Últimos 5 años" },
];

const SPENDING_BAR_COLOR = "#a855f7";

const formatDate = (value: Date | string | undefined) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CL");
};

const randomId = () => Math.random().toString(36).slice(2, 9);

const formatDateTime = (value: Date | string | undefined | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
  const parts = dataUrl.split(",");
  if (parts.length < 2) return new Uint8Array();
  const base64 = parts[1];
  if (typeof atob !== "function") {
    throw new Error(
      "No se puede decodificar la firma digital en este entorno."
    );
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const toArrayBuffer = (view: Uint8Array): ArrayBuffer => {
  if (
    view.byteOffset === 0 &&
    view.byteLength === view.buffer.byteLength &&
    view.buffer instanceof ArrayBuffer
  ) {
    return view.buffer;
  }
  return new Uint8Array(view).buffer;
};

const ensureCrypto = () => {
  const cryptoObj =
    globalThis.crypto ??
    (typeof window !== "undefined" ? window.crypto : undefined);
  if (!cryptoObj?.subtle) {
    throw new Error(
      "La API de criptografía no está disponible en este navegador."
    );
  }
  return cryptoObj;
};

const sha256Hex = async (data: Uint8Array) => {
  const cryptoObj = ensureCrypto();
  const digestInput = toArrayBuffer(data);
  const digest = await cryptoObj.subtle.digest("SHA-256", digestInput);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};
type SignatureMetadata = {
  dataUrl: string;
  hash: string;
  token: string;
  timestamp: string;
};

const generateSignatureMetadata = async (
  dataUrl: string
): Promise<SignatureMetadata> => {
  const bytes = dataUrlToUint8Array(dataUrl);
  const hash = await sha256Hex(bytes);
  const cryptoObj = ensureCrypto();
  const token =
    typeof cryptoObj.randomUUID === "function"
      ? cryptoObj.randomUUID()
      : hash.slice(0, 32);
  const timestamp = new Date().toISOString();
  return { dataUrl, hash, token, timestamp };
};

const DELIVERIES_DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

const getInitialDeliveriesViewMode = () =>
  typeof window !== "undefined" &&
  window.matchMedia(DELIVERIES_DESKTOP_MEDIA_QUERY).matches
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
  const { canManageModule, role } = useAccessControl();
  const canManageDeliveries = canManageModule("epp");

  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [subAreaFilter, setSubAreaFilter] = useState("all");
  const [trabajadorFilter, setTrabajadorFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const canDeleteDeliveries = canManageDeliveries && role !== "Comentarista";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadInstanceRef = useRef<SignaturePad | null>(null);
  const [signatureStatus, setSignatureStatus] = useState<
    "idle" | "dirty" | "saved"
  >("idle");
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [openEppDropdown, setOpenEppDropdown] = useState<string | null>(null);
  const signatureStatusMessages = {
    idle: {
      label: "Pendiente de firma",
      toneClass: "text-slate-500 dark:text-dracula-comment",
    },
    dirty: {
      label: "Firma modificada · guarda antes de enviar",
      toneClass: "text-amber-600 dark:text-amber-400",
    },
    saved: {
      label: "Firma guardada correctamente",
      toneClass: "text-emerald-600 dark:text-emerald-400",
    },
  } as const;
  const signatureStatusInfo =
    formState.firmaTipo === "digital"
      ? signatureStatusMessages[signatureStatus]
      : {
          label:
            "Firma manual seleccionada · se registrará en documento impreso",
          toneClass: "text-slate-500 dark:text-dracula-comment",
        };

  const trabajadorOptions = useMemo(
    () =>
      trabajadores
        .filter((t) => t.vigente)
        .map((t) => ({ value: t.id, label: `${t.nombre} (${t.rut})` })),
    [trabajadores]
  );

  const eppOptionsByCategory = useMemo(() => {
    const groups = new Map<
      string,
      {
        category: string;
        items: typeof eppItems;
      }
    >();

    eppItems.forEach((item) => {
      const category = item.category?.trim() || "Sin categoría";
      if (!groups.has(category)) {
        groups.set(category, { category, items: [] });
      }
      groups.get(category)!.items.push(item);
    });

    return Array.from(groups.values())
      .sort((a, b) =>
        a.category.localeCompare(b.category, "es", { sensitivity: "base" })
      )
      .map((group) => ({
        category: group.category,
        items: [...group.items].sort((a, b) =>
          a.name.localeCompare(b.name, "es", { sensitivity: "base" })
        ),
      }));
  }, [eppItems]);

  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    trabajadores.forEach((t) => {
      if (t.areaTrabajo) set.add(t.areaTrabajo);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [trabajadores]);

  const subAreaOptions = useMemo(() => {
    if (areaFilter === "all") return []; // Si no hay área, no hay sub-áreas

    const set = new Set<string>();
    trabajadores
      .filter((t) => t.areaTrabajo === areaFilter) // Filtra trabajadores por el área seleccionada
      .forEach((t) => {
        if (t.subAreaTrabajo) set.add(t.subAreaTrabajo); // Agrega solo las sub-áreas de esa área
      });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [trabajadores, areaFilter]); // Depende de los trabajadores y del filtro de área

  const selectedTrabajador = useMemo(() => {
    if (!formState.trabajadorId) return null;
    return trabajadores.find((t) => t.id === formState.trabajadorId) ?? null;
  }, [formState.trabajadorId, trabajadores]);

  const getEppById = (id: string) =>
    eppItems.find((item) => item.id === id) ?? null;

  const filteredEntregas = useMemo(() => {
    const queryLower = searchQuery.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return entregas.filter((entrega) => {
      const matchesSearch =
        queryLower.length === 0 ||
        entrega.trabajadorNombre.toLowerCase().includes(queryLower) ||
        entrega.trabajadorRut.toLowerCase().includes(queryLower) ||
        entrega.items.some((item) =>
          item.eppName.toLowerCase().includes(queryLower)
        );

      const matchesArea =
        areaFilter === "all" || entrega.areaTrabajo === areaFilter;
      const matchesTrabajador =
        trabajadorFilter === "all" || entrega.trabajadorId === trabajadorFilter;

      const matchesSubArea =
        subAreaFilter === "all" || entrega.subAreaTrabajo === subAreaFilter;

      const matchesDate = (() => {
        if (!(entrega.fechaEntrega instanceof Date)) return true;
        const time = entrega.fechaEntrega.setHours(0, 0, 0, 0);
        const fromOk = !from || time >= from.setHours(0, 0, 0, 0);
        const toOk = !to || time <= to.setHours(0, 0, 0, 0);
        return fromOk && toOk;
      })();

      return (
        matchesSearch &&
        matchesArea &&
        matchesSubArea &&
        matchesTrabajador &&
        matchesDate
      );
    });
  }, [
    entregas,
    searchQuery,
    areaFilter,
    subAreaFilter,
    trabajadorFilter,
    fromDate,
    toDate,
  ]);

  const totalFiltrado = useMemo(
    () =>
      filteredEntregas.reduce((sum, entrega) => sum + entrega.totalEntrega, 0),
    [filteredEntregas]
  );

  const [topAreaWindowDays, setTopAreaWindowDays] = useState<number>(30);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [showAreaTrendModal, setShowAreaTrendModal] = useState(false);

  const overallSummary = useMemo(() => {
    const total = entregas.length;
    const uniqueWorkers = new Set<string>();
    let totalValue = 0;
    let digital = 0;

    entregas.forEach((entrega) => {
      uniqueWorkers.add(entrega.trabajadorId);
      totalValue += entrega.totalEntrega;
      if (entrega.firmaTipo === "digital") {
        digital += 1;
      }
    });

    const manual = total - digital;
    const average = total > 0 ? totalValue / total : 0;
    const digitalPercentage =
      total > 0 ? Math.round((digital / total) * 100) : 0;

    return {
      total,
      uniqueWorkers: uniqueWorkers.size,
      totalValue,
      digital,
      manual,
      average,
      digitalPercentage,
    };
  }, [entregas]);

  const areaTrendInsights = useMemo(() => {
    if (entregas.length === 0) return null;
    const now = new Date();
    const cutoff = new Date(
      now.getTime() - topAreaWindowDays * 24 * 60 * 60 * 1000
    );

    const aggregate = new Map<
      string,
      {
        totalValue: number;
        deliveries: number;
      }
    >();
    const perDay = new Map<string, Map<string, number>>();
    const dayLabels = new Map<string, string>();
    const dayKeys = new Set<string>();

    entregas.forEach((entrega) => {
      const fecha =
        entrega.fechaEntrega instanceof Date
          ? entrega.fechaEntrega
          : new Date(entrega.fechaEntrega);
      if (Number.isNaN(fecha.getTime())) return;
      if (fecha < cutoff) return;

      const area = entrega.areaTrabajo?.trim() || "Sin área";
      const current = aggregate.get(area) ?? {
        totalValue: 0,
        deliveries: 0,
      };
      current.totalValue += entrega.totalEntrega;
      current.deliveries += 1;
      aggregate.set(area, current);

      const dayKey = fecha.toISOString().slice(0, 10);
      dayLabels.set(
        dayKey,
        fecha.toLocaleDateString("es-CL", {
          day: "numeric",
          month: "short",
        })
      );
      dayKeys.add(dayKey);

      const dayData = perDay.get(dayKey) ?? new Map<string, number>();
      dayData.set(area, (dayData.get(area) ?? 0) + entrega.totalEntrega);
      perDay.set(dayKey, dayData);
    });

    if (aggregate.size === 0) return null;

    const sortedDays = Array.from(dayKeys).sort();
    const dayCount = Math.max(sortedDays.length, 1);

    const entries = Array.from(aggregate.entries())
      .map(([area, data]) => ({
        area,
        totalValue: data.totalValue,
        deliveries: data.deliveries,
        averagePerDay: data.totalValue / dayCount,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const topAreas = entries.slice(0, 3);

    const chartData = sortedDays.map((dayKey) => {
      const label = dayLabels.get(dayKey) ?? dayKey;
      const dayData = perDay.get(dayKey);
      const entry: Record<string, number | string> = { day: label };
      topAreas.forEach((series) => {
        entry[series.area] = dayData?.get(series.area) ?? 0;
      });
      return entry;
    });

    return {
      topAreas,
      chartData,
      dayCount,
      totalDays: sortedDays.length,
    };
  }, [entregas, topAreaWindowDays]);

  const topAreaByWindow = areaTrendInsights?.topAreas[0] ?? null;
  const areaTrendSeries = areaTrendInsights?.topAreas ?? [];
  const areaTrendChartData = areaTrendInsights?.chartData ?? [];

  const [spendingPeriod, setSpendingPeriod] = useState<SpendingPeriod>("month");
  const [showSpendingModal, setShowSpendingModal] = useState(false);

  const spendingTrend = useMemo(() => {
    if (entregas.length === 0) return null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const periodCount = spendingPeriod === "year" ? 5 : 12;

    type PeriodDefinition = {
      key: string;
      label: string;
      start: Date;
      end: Date;
    };

    const getWeekStart = (date: Date) => {
      const start = new Date(date);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };

    const periodDefinitions: PeriodDefinition[] = Array.from(
      { length: periodCount },
      (_, index) => {
        const offset = periodCount - 1 - index;

        if (spendingPeriod === "week") {
          const currentWeekStart = getWeekStart(now);
          const start = new Date(currentWeekStart);
          start.setDate(start.getDate() - offset * 7);
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          const label = `${start.toLocaleDateString("es-CL", {
            day: "numeric",
            month: "short",
          })} - ${end.toLocaleDateString("es-CL", {
            day: "numeric",
            month: "short",
          })}`;
          return {
            key: start.toISOString().slice(0, 10),
            label,
            start,
            end,
          };
        }

        if (spendingPeriod === "month") {
          const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
          const end = new Date(
            start.getFullYear(),
            start.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );
          return {
            key: `${start.getFullYear()}-${String(
              start.getMonth() + 1
            ).padStart(2, "0")}`,
            label: start.toLocaleDateString("es-CL", {
              month: "short",
              year: "numeric",
            }),
            start,
            end,
          };
        }

        const start = new Date(now.getFullYear() - offset, 0, 1);
        const end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
        return {
          key: `${start.getFullYear()}`,
          label: `${start.getFullYear()}`,
          start,
          end,
        };
      }
    );

    const aggregate = new Map<
      string,
      { totalValue: number; deliveries: number }
    >();
    periodDefinitions.forEach((period) => {
      aggregate.set(period.key, { totalValue: 0, deliveries: 0 });
    });

    entregas.forEach((entrega) => {
      const fecha =
        entrega.fechaEntrega instanceof Date
          ? entrega.fechaEntrega
          : new Date(entrega.fechaEntrega);
      if (Number.isNaN(fecha.getTime())) return;

      const normalized = new Date(fecha);
      normalized.setHours(0, 0, 0, 0);

      for (const period of periodDefinitions) {
        if (normalized >= period.start && normalized <= period.end) {
          const bucket = aggregate.get(period.key);
          if (!bucket) return;
          bucket.totalValue += entrega.totalEntrega;
          bucket.deliveries += 1;
          break;
        }
      }
    });

    const series: SpendingSeriesPoint[] = periodDefinitions.map((period) => {
      const data = aggregate.get(period.key) ?? {
        totalValue: 0,
        deliveries: 0,
      };
      return {
        key: period.key,
        label: period.label,
        totalValue: data.totalValue,
        deliveries: data.deliveries,
        averagePerEntrega:
          data.deliveries > 0 ? data.totalValue / data.deliveries : 0,
      };
    });

    const totals = series.reduce(
      (acc, point) => {
        acc.totalValue += point.totalValue;
        acc.deliveries += point.deliveries;
        return acc;
      },
      { totalValue: 0, deliveries: 0 }
    );

    const averagePerEntrega = totals.deliveries
      ? totals.totalValue / totals.deliveries
      : 0;

    return {
      series,
      totals,
      averagePerEntrega,
      rangeStart: periodDefinitions[0]?.start ?? null,
      rangeEnd: periodDefinitions[periodDefinitions.length - 1]?.end ?? null,
    };
  }, [entregas, spendingPeriod]);

  const spendingSeries = spendingTrend?.series ?? [];
  const spendingTotals = spendingTrend?.totals ?? {
    totalValue: 0,
    deliveries: 0,
  };
  const spendingAverage = spendingTrend?.averagePerEntrega ?? 0;
  const spendingChartData = spendingSeries.map((point) => ({
    label: point.label,
    totalValue: point.totalValue,
    averagePerEntrega: point.averagePerEntrega,
    deliveries: point.deliveries,
  }));
  const spendingRangeLabel =
    spendingTrend?.rangeStart && spendingTrend?.rangeEnd
      ? `${spendingTrend.rangeStart.toLocaleDateString("es-CL", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })} - ${spendingTrend.rangeEnd.toLocaleDateString("es-CL", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`
      : null;
  const currentSpendingPeriod =
    SPENDING_PERIODS.find((option) => option.value === spendingPeriod) ??
    SPENDING_PERIODS[0];
  const hasSpendingData = spendingSeries.some((point) => point.totalValue > 0);
  const latestSpendingEntries = spendingSeries.slice(-3).reverse();
  const latestSpending = latestSpendingEntries[0] ?? null;

  const rotationInsights = useMemo(() => {
    if (entregas.length === 0) return null;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - TOP_EPP_ROTATION_MONTHS);

    const aggregate = new Map<
      string,
      {
        name: string;
        totalUnits: number;
        deliveries: number;
      }
    >();
    const perMonth = new Map<string, Map<string, number>>();
    const monthLabels = new Map<string, string>();
    const monthsSet = new Set<string>();

    entregas.forEach((entrega) => {
      const fecha =
        entrega.fechaEntrega instanceof Date
          ? entrega.fechaEntrega
          : new Date(entrega.fechaEntrega);
      if (Number.isNaN(fecha.getTime())) return;
      if (fecha < cutoff) return;

      const monthKey = `${fecha.getFullYear()}-${String(
        fecha.getMonth() + 1
      ).padStart(2, "0")}`;
      monthLabels.set(
        monthKey,
        fecha.toLocaleDateString("es-CL", {
          month: "short",
          year: "numeric",
        })
      );
      monthsSet.add(monthKey);

      const monthData = perMonth.get(monthKey) ?? new Map<string, number>();

      entrega.items.forEach((item) => {
        const key = item.eppId;
        const current = aggregate.get(key) ?? {
          name: item.eppName,
          totalUnits: 0,
          deliveries: 0,
        };
        current.totalUnits += item.cantidad;
        current.deliveries += 1;
        aggregate.set(key, current);

        monthData.set(key, (monthData.get(key) ?? 0) + item.cantidad);
      });

      perMonth.set(monthKey, monthData);
    });

    if (aggregate.size === 0) return null;

    const monthsSorted = Array.from(monthsSet).sort();
    const monthCount = Math.max(monthsSorted.length, 1);

    const entries = Array.from(aggregate.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalUnits: data.totalUnits,
        deliveries: data.deliveries,
        averagePerMonth: data.totalUnits / monthCount,
      }))
      .sort((a, b) => b.totalUnits - a.totalUnits);

    const topSeries = entries.slice(0, 3);

    const chartData = monthsSorted.map((monthKey) => {
      const label = monthLabels.get(monthKey) ?? monthKey;
      const monthData = perMonth.get(monthKey);
      const entry: Record<string, number | string> = { month: label };
      topSeries.forEach((series) => {
        entry[series.name] = monthData?.get(series.id) ?? 0;
      });
      return entry;
    });

    return {
      topSeries,
      chartData,
      monthCount,
    };
  }, [entregas]);

  const topEppRotation = rotationInsights?.topSeries[0] ?? null;
  const rotationSeries = rotationInsights?.topSeries ?? [];
  const rotationChartData = rotationInsights?.chartData ?? [];

  const [viewMode, setViewMode] = useState<"card" | "list">(
    getInitialDeliveriesViewMode
  );

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

  useEffect(() => {
    if (!openEppDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`[data-epp-dropdown="${openEppDropdown}"]`)) {
        setOpenEppDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openEppDropdown]);

  const isDateRangeValid = useMemo(() => {
    if (!fromDate || !toDate) return false;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
      return false;
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
            `${item.cantidad} x ${item.eppName}${
              item.talla ? ` (Talla: ${item.talla})` : ""
            } · ${currency.format(item.subtotal)}`
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
      const variant = epp.sizeVariants.find(
        (option) => option.id === draft.variantId
      );
      if (!variant) return null;
      return (
        Math.max(0, Number(variant.stockActual ?? 0)) + draft.initialCantidad
      );
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
    () =>
      formState.items.reduce(
        (sum, item) => sum + computeDraftSubtotal(item),
        0
      ),
    [formState.items]
  );

  useEffect(() => {
    if (!isModalOpen) return;
    setFormState((prev) => {
      const withSignature = {
        ...prev,
        firmaFecha: prev.firmaFecha || getTodayDate(),
        firmaHora: getCurrentTime(),
      };

      if (withSignature.items.length > 0) return withSignature;

      return {
        ...withSignature,
        items: [
          {
            tempId: randomId(),
            eppId: "",
            variantId: null,
            cantidad: 1,
            initialCantidad: 0,
            fechaRecambio: withSignature.fechaEntrega ?? "",
          },
        ],
      };
    });
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (formState.firmaTipo !== "digital") {
      signaturePadInstanceRef.current?.clear();
      return;
    }
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const displayWidth = canvas.offsetWidth || 520;
      const displayHeight = canvas.offsetHeight || 200;
      canvas.width = displayWidth * ratio;
      canvas.height = displayHeight * ratio;
      const context = canvas.getContext("2d");
      if (context) {
        context.scale(ratio, ratio);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, displayWidth, displayHeight);
      }
    };

    resizeCanvas();

    const signaturePad = new SignaturePad(canvas, {
      minWidth: 0.8,
      maxWidth: 2.4,
      penColor: "#0f172a",
      backgroundColor: "#ffffff",
      throttle: 16,
    });

    signaturePadInstanceRef.current = signaturePad;

    const markDirty = () => {
      setSignatureStatus((prev) => (prev === "dirty" ? prev : "dirty"));
      setSignatureError(null);
    };

    canvas.addEventListener("pointerdown", markDirty);

    try {
      if (formState.firmaDigitalDataUrl) {
        signaturePad.fromDataURL(formState.firmaDigitalDataUrl);
        setSignatureStatus("saved");
      } else {
        signaturePad.clear();
      }
    } catch (error) {
      console.error("No se pudo cargar la firma digital guardada:", error);
      signaturePad.clear();
    }

    const handleResize = () => {
      const currentData = signaturePad.toData();
      resizeCanvas();
      signaturePad.clear();
      if (currentData.length > 0) {
        signaturePad.fromData(currentData);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("pointerdown", markDirty);
      signaturePad.clear();
      signaturePadInstanceRef.current = null;
    };
  }, [isModalOpen, formState.firmaDigitalDataUrl, formState.firmaTipo]);

  const handleOpenModal = (entrega?: Entrega) => {
    if (!user) {
      setFormError("Debes iniciar sesión para registrar entregas.");
      return;
    }

    if (entrega) {
      setEditingId(entrega.id);
      setFormState({
        trabajadorId: entrega.trabajadorId,
        trabajadorCargo: entrega.trabajadorCargo,
        fechaEntrega: entrega.fechaEntrega.toISOString().split("T")[0],
        firmaFecha: entrega.firmaFecha || getTodayDate(),
        firmaHora: entrega.firmaHora || getCurrentTime(),
        observaciones: entrega.observaciones ?? "",
        capacitacion: {
          instruccionUso: entrega.capacitacion?.instruccionUso ?? false,
          conoceLimitaciones: entrega.capacitacion?.conoceLimitaciones ?? false,
          recibioFolletos: entrega.capacitacion?.recibioFolletos ?? false,
          declaracionAceptada:
            entrega.capacitacion?.declaracionAceptada ?? false,
        },
        items: entrega.items.map((item) => ({
          tempId: randomId(),
          eppId: item.eppId,
          variantId: item.variantId ?? null,
          cantidad: item.cantidad,
          initialCantidad: item.cantidad,
          fechaRecambio: item.fechaRecambio ?? "",
        })),
        firmaDigitalDataUrl: entrega.firmaDigitalDataUrl ?? null,
        firmaDigitalHash: entrega.firmaDigitalHash ?? null,
        firmaDigitalToken: entrega.firmaDigitalToken ?? null,
        firmaDigitalTimestamp: entrega.firmaDigitalTimestamp ?? null,
        firmaResponsableDataUrl: entrega.firmaResponsableDataUrl ?? null,
        firmaResponsableHash: entrega.firmaResponsableHash ?? null,
        firmaResponsableToken: entrega.firmaResponsableToken ?? null,
        firmaResponsableTimestamp: entrega.firmaResponsableTimestamp ?? null,
        firmaTipo: entrega.firmaTipo ?? "digital",
        generarPdf: entrega.firmaTipo === "digital",
      });
      setSignatureStatus(
        entrega.firmaTipo === "digital" && entrega.firmaDigitalDataUrl
          ? "saved"
          : "idle"
      );
      setSignatureError(null);
    } else {
      setEditingId(null);
      setFormState(initialFormState());
      setSignatureStatus("idle");
      setSignatureError(null);
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
    signaturePadInstanceRef.current?.clear();
    clearWorkerSignatureData();
    setSignatureStatus("idle");
    setSignatureError(null);
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
            const max = getAvailableStockForDraft({
              ...next,
              variantId: updates.variantId,
            });
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
    setOpenEppDropdown((prev) => (prev === tempId ? null : prev));
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
          fechaRecambio: prev.fechaEntrega,
        },
      ],
    }));
  };

  const clearWorkerSignatureData = () => {
    setFormState((prev) => ({
      ...prev,
      firmaDigitalDataUrl: null,
      firmaDigitalHash: null,
      firmaDigitalToken: null,
      firmaDigitalTimestamp: null,
    }));
  };

  const handleSignatureClear = () => {
    signaturePadInstanceRef.current?.clear();
    clearWorkerSignatureData();
    setSignatureStatus("idle");
    setSignatureError(null);
  };

  const handleSignatureSave = async (): Promise<SignatureMetadata | null> => {
    if (formState.firmaTipo !== "digital") {
      return null;
    }
    const pad = signaturePadInstanceRef.current;
    if (!pad) {
      setSignatureError("No se pudo acceder al lienzo de firma.");
      return null;
    }

    if (pad.isEmpty()) {
      setSignatureError("Dibuja la firma del trabajador antes de guardarla.");
      return null;
    }

    try {
      const dataUrl = pad.toDataURL("image/png");
      const metadata = await generateSignatureMetadata(dataUrl);
      setFormState((prev) => ({
        ...prev,
        firmaDigitalDataUrl: metadata.dataUrl,
        firmaDigitalHash: metadata.hash,
        firmaDigitalToken: metadata.token,
        firmaDigitalTimestamp: metadata.timestamp,
      }));
      setSignatureStatus("saved");
      setSignatureError(null);
      setFormError(null);
      return metadata;
    } catch (error) {
      console.error("Error al generar la firma digital:", error);
      setSignatureError(
        "No se pudo generar la firma digital. Intenta nuevamente."
      );
      return null;
    }
  };

  const handleSignatureModeChange = (mode: "digital" | "manual") => {
    setFormState((prev) => ({
      ...prev,
      firmaTipo: mode,
      generarPdf: mode === "digital" ? true : false,
    }));

    if (mode === "digital") {
      setSignatureStatus("idle");
      setSignatureError(null);
      return;
    }

    signaturePadInstanceRef.current?.clear();
    clearWorkerSignatureData();
    setSignatureStatus("idle");
    setSignatureError(null);
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
        throw new Error(
          "Selecciona una talla para los EPP de múltiples tallas."
        );
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
        brand: epp.brand ?? null,
        model: epp.model ?? null,
        variantId: variant?.id ?? null,
        talla: epp.multiSize ? variant?.label ?? "" : "Única",
        cantidad: draft.cantidad,
        costoUnitario: epp.price,
        subtotal: draft.cantidad * epp.price,
        fechaRecambio: draft.fechaRecambio || "",
      } satisfies EntregaItem;
    });
  };

  type PdfEntregaData = {
    id?: string | null;
    trabajadorNombre: string;
    trabajadorRut: string;
    trabajadorCargo: string;
    areaTrabajo: string;
    subAreaTrabajo: string;
    fechaEntrega: Date;
    firmaFecha: string;
    firmaHora: string;
    observaciones: string;
    capacitacion: FormState["capacitacion"];
    items: EntregaItem[];
    totalEntrega: number;
    autorizadoPorNombre: string;
    autorizadoPorEmail?: string | null;
    firmaDigitalDataUrl?: string | null;
    firmaDigitalHash?: string | null;
    firmaDigitalToken?: string | null;
    firmaDigitalTimestamp?: string | null;
    firmaTipo: "digital" | "manual";
  };

  const generateEntregaPdf = async (data: PdfEntregaData) => {
    // 1. --- PALETA DE COLORES (TEMA CLARO) ---
    const colors = {
      bgLight: rgb(0.972, 0.976, 0.98), // #F8F9FA
      bgWhite: rgb(1, 1, 1), // #FFFFFF
      textDark: rgb(0.129, 0.145, 0.16), // #212529
      textMuted: rgb(0.42, 0.46, 0.5), // #6C757D
      accentBlue: rgb(0.05, 0.43, 0.99), // #0D6EFD
      border: rgb(0.91, 0.92, 0.94), // #E9ECEF
    };

    const pdfDoc = await PDFDocument.create();
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 42;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);

    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: colors.bgLight,
    });

    let cursorY = pageHeight - margin;

    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const ensureSpace = (lines = 1) => {
      if (cursorY - lines * 14 < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawRectangle({
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
          color: colors.bgLight,
        });
        cursorY = pageHeight - margin;
      }
    };

    // 2. --- ENCABEZADO CON ESPACIO PARA EL LOGO ---
    const drawHeader = () => {
      const logoHeight = 40;
      const logoWidth = 140;
      page.drawRectangle({
        x: margin,
        y: cursorY - logoHeight,
        width: logoWidth,
        height: logoHeight,
        borderColor: colors.border,
        borderWidth: 1,
        borderDashArray: [5, 5],
      });
      page.drawText("Espacio para el Logo", {
        x: margin + 25,
        y: cursorY - 25,
        font: bodyFont,
        size: 9,
        color: colors.textMuted,
      });

      page.drawText("Comprobante de Entrega de EPP", {
        x: pageWidth - margin - 220,
        y: cursorY - 15,
        font: boldFont,
        size: 14,
        color: colors.textMuted,
      });

      cursorY -= 55;
      page.drawLine({
        start: { x: margin, y: cursorY },
        end: { x: pageWidth - margin, y: cursorY },
        thickness: 1,
        color: colors.border,
      });
      cursorY -= 25;
    };

    // 3. --- TARJETAS CON TEMA CLARO ---
    const drawInfoCard = (
      title: string,
      items: { label: string; value: string }[]
    ) => {
      page.drawText(title, {
        x: margin,
        y: cursorY,
        font: boldFont,
        size: 12,
        color: colors.accentBlue,
      });
      cursorY -= 20;

      const cardWidth = pageWidth - margin * 2;
      const cardHeight = items.length * 22 + 15;

      page.drawRectangle({
        x: margin,
        y: cursorY - cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: colors.bgWhite,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
      });

      let itemY = cursorY - 18;
      items.forEach((item) => {
        page.drawText(item.label, {
          x: margin + 15,
          y: itemY,
          font: bodyFont,
          size: 10,
          color: colors.textMuted,
        });
        page.drawText(item.value, {
          x: margin + 140,
          y: itemY,
          font: boldFont,
          size: 11,
          color: colors.textDark,
        });
        itemY -= 22;
      });

      cursorY -= cardHeight + 20;
    };

    // 4. --- TABLA DE EPP CON TEMA CLARO ---
    const drawEppTable = (items: EntregaItem[]) => {
      const tableTop = cursorY;
      const tableWidth = pageWidth - margin * 2;
      const rowHeight = 30;
      const headerHeight = 28;

      page.drawRectangle({
        x: margin,
        y: tableTop - headerHeight,
        width: tableWidth,
        height: headerHeight,
        color: colors.bgLight,
        borderRadius: 4,
      });

      const col1X = margin + 10;
      const col2X = margin + 270;
      const col3X = margin + 400;

      page.drawText("Elemento de Protección Personal (EPP)", {
        x: col1X,
        y: tableTop - 18,
        font: boldFont,
        size: 10,
        color: colors.textMuted,
      });
      page.drawText("Cantidad / Talla", {
        x: col2X,
        y: tableTop - 18,
        font: boldFont,
        size: 10,
        color: colors.textMuted,
      });
      page.drawText("Fecha Recambio", {
        x: col3X,
        y: tableTop - 18,
        font: boldFont,
        size: 10,
        color: colors.textMuted,
      });

      let currentY = tableTop - headerHeight;

      items.forEach((item) => {
        ensureSpace(3);
        currentY -= rowHeight;
        page.drawLine({
          start: { x: margin, y: currentY },
          end: { x: pageWidth - margin, y: currentY },
          thickness: 1,
          color: colors.border,
        });
        page.drawText(item.eppName, {
          x: col1X,
          y: currentY + 11,
          font: boldFont,
          size: 11,
          color: colors.textDark,
        });
        page.drawText(`${item.cantidad} x ${item.talla || "Única"}`, {
          x: col2X,
          y: currentY + 11,
          font: bodyFont,
          size: 11,
          color: colors.textDark,
        });
        page.drawText(
          item.fechaRecambio ? formatDate(item.fechaRecambio) : "—",
          {
            x: col3X,
            y: currentY + 11,
            font: bodyFont,
            size: 11,
            color: colors.textDark,
          }
        );
      });

      cursorY = currentY - 20;
    };

    // 5. --- DECLARACIONES CON TEMA CLARO ---
    const drawDeclarations = (capacitacion: FormState["capacitacion"]) => {
      ensureSpace(8);
      page.drawText("Declaraciones de Capacitación", {
        x: margin,
        y: cursorY,
        font: boldFont,
        size: 12,
        color: colors.accentBlue,
      });
      cursorY -= 20;

      const drawCheckbox = (label: string, checked: boolean) => {
        const boxSize = 12;
        page.drawRectangle({
          x: margin,
          y: cursorY - boxSize,
          width: boxSize,
          height: boxSize,
          borderColor: colors.accentBlue,
          borderWidth: 1.5,
          borderRadius: 3,
        });
        if (checked) {
          page.drawLine({
            start: { x: margin + 3, y: cursorY - 6 },
            end: { x: margin + 5, y: cursorY - 9 },
            thickness: 1.5,
            color: colors.accentBlue,
          });
          page.drawLine({
            start: { x: margin + 5, y: cursorY - 9 },
            end: { x: margin + 9, y: cursorY - 3 },
            thickness: 1.5,
            color: colors.accentBlue,
          });
        }
        page.drawText(label, {
          x: margin + boxSize + 8,
          y: cursorY - 10,
          font: bodyFont,
          size: 10,
          color: colors.textDark,
        });
        cursorY -= 20;
      };

      drawCheckbox(
        "Instruido en el uso correcto de los EPP.",
        capacitacion.instruccionUso
      );
      drawCheckbox(
        "Conozco limitaciones y cuidados de cada elemento.",
        capacitacion.conoceLimitaciones
      );
      drawCheckbox(
        "Recibí folletos informativos de respaldo.",
        capacitacion.recibioFolletos
      );
      drawCheckbox(
        "Declaro conformidad con D.S. 44/2024.",
        capacitacion.declaracionAceptada
      );
    };

    // 6. --- TARJETA DE FIRMA CON TEMA CLARO ---
    const drawSignatureArea = async () => {
      ensureSpace(15);
      cursorY -= 20;
      const cardWidth = pageWidth - margin * 2;
      const cardHeight = 180;
      const cardY = cursorY - cardHeight;

      page.drawRectangle({
        x: margin,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
        color: colors.bgWhite,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
      });
      page.drawText("Firma del Trabajador", {
        x: margin + 15,
        y: cardY + cardHeight - 25,
        font: boldFont,
        size: 11,
        color: colors.accentBlue,
      });

      if (data.firmaTipo === "digital" && data.firmaDigitalDataUrl) {
        try {
          const signatureBytes = dataUrlToUint8Array(data.firmaDigitalDataUrl);
          const signatureImage = await pdfDoc.embedPng(signatureBytes);
          const maxWidth = 180;
          const maxHeight = 70;
          const scale = Math.min(
            maxWidth / signatureImage.width,
            maxHeight / signatureImage.height,
            1
          );
          const dims = signatureImage.scale(scale);
          page.drawImage(signatureImage, {
            x: margin + (cardWidth - dims.width) / 2,
            y: cardY + 70,
            width: dims.width,
            height: dims.height,
          });
          page.drawText(`Hash (SHA-256): ${data.firmaDigitalHash ?? "—"}`, {
            x: margin + 15,
            y: cardY + 35,
            font: bodyFont,
            size: 8,
            color: colors.textMuted,
          });
          page.drawText(
            `Fecha/Hora Firma: ${formatDateTime(data.firmaDigitalTimestamp)}`,
            {
              x: margin + 15,
              y: cardY + 15,
              font: bodyFont,
              size: 8,
              color: colors.textMuted,
            }
          );
        } catch (e) {
          /* Fallback */
        }
      } else {
        page.drawText("FIRMA MANUAL SOBRE DOCUMENTO IMPRESO", {
          x:
            margin +
            (cardWidth -
              boldFont.widthOfTextAtSize(
                "FIRMA MANUAL SOBRE DOCUMENTO IMPRESO",
                12
              )) /
              2,
          y: cardY + 90,
          font: boldFont,
          size: 12,
          color: colors.textMuted,
        });
      }

      page.drawLine({
        start: { x: margin + 40, y: cardY + 60 },
        end: { x: pageWidth - margin - 40, y: cardY + 60 },
        thickness: 0.5,
        color: colors.textMuted,
      });
      page.drawText(`${data.trabajadorNombre} (${data.trabajadorRut})`, {
        x:
          margin +
          (cardWidth -
            bodyFont.widthOfTextAtSize(
              `${data.trabajadorNombre} (${data.trabajadorRut})`,
              10
            )) /
            2,
        y: cardY + 45,
        font: bodyFont,
        size: 10,
        color: colors.textDark,
      });
    };

    // --- CONSTRUCCIÓN DEL DOCUMENTO ---
    drawHeader();
    drawInfoCard("Detalles del Trabajador y Entrega", [
      { label: "Nombre", value: data.trabajadorNombre },
      { label: "RUT", value: data.trabajadorRut },
      { label: "Cargo", value: data.trabajadorCargo || "—" },
      {
        label: "Área / Sub-área",
        value: `${data.areaTrabajo || "—"} / ${data.subAreaTrabajo || "—"}`,
      },
      { label: "Fecha de Entrega", value: formatDate(data.fechaEntrega) },
      { label: "Código Entrega", value: data.id ?? "—" },
    ]);
    drawEppTable(data.items);
    drawDeclarations(data.capacitacion);
    await drawSignatureArea();

    // --- GUARDAR Y DESCARGAR ---
    const pdfBytes = await pdfDoc.save();

    // ✅ CORRECCIÓN FINAL
    const blob = new Blob([toArrayBuffer(pdfBytes)], {
      type: "application/pdf",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const fileName = `Clodiapp-Entrega-Epp-${data.trabajadorNombre.replace(
      /\s+/g,
      "_"
    )}.pdf`;
    link.download = fileName;

    link.click();
    URL.revokeObjectURL(url);
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

    const trabajador = trabajadores.find(
      (t) => t.id === formState.trabajadorId
    );
    if (!trabajador) {
      setFormError(
        "No se encontró la información del trabajador seleccionado."
      );
      return;
    }

    let items: EntregaItem[] = [];
    try {
      items = buildEntregaItems(formState.items);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo preparar la entrega."
      );
      return;
    }

    if (items.length === 0) {
      setFormError("Agrega al menos un EPP a la entrega.");
      return;
    }

    const isFirmaDigital = formState.firmaTipo === "digital";

    const existingSignature =
      formState.firmaDigitalDataUrl &&
      formState.firmaDigitalHash &&
      formState.firmaDigitalToken &&
      formState.firmaDigitalTimestamp
        ? {
            dataUrl: formState.firmaDigitalDataUrl,
            hash: formState.firmaDigitalHash,
            token: formState.firmaDigitalToken,
            timestamp: formState.firmaDigitalTimestamp,
          }
        : null;

    let signatureMetadata = existingSignature;

    if (isFirmaDigital) {
      if (!signatureMetadata || signatureStatus !== "saved") {
        signatureMetadata = await handleSignatureSave();
        if (!signatureMetadata) {
          setFormError(
            "Captura y guarda la firma digital del trabajador antes de registrar la entrega."
          );
          return;
        }
      }
    } else {
      signatureMetadata = null;
    }

    const payload: CreateEntregaInput = {
      trabajadorId: trabajador.id,
      trabajadorNombre: trabajador.nombre,
      trabajadorRut: trabajador.rut,
      trabajadorCargo: formState.trabajadorCargo.trim() || trabajador.cargo,
      areaTrabajo: trabajador.areaTrabajo,
      subAreaTrabajo: trabajador.subAreaTrabajo,
      fechaEntrega: new Date(formState.fechaEntrega),
      firmaFecha: formState.firmaFecha || getTodayDate(),
      firmaHora: formState.firmaHora || getCurrentTime(),
      observaciones: formState.observaciones.trim(),
      capacitacion: formState.capacitacion,
      items,
      autorizadoPorUid: user.uid,
      autorizadoPorNombre: user.displayName ?? user.email ?? "Usuario",
      autorizadoPorEmail: user.email ?? undefined,
      firmaDigitalDataUrl: signatureMetadata?.dataUrl ?? null,
      firmaDigitalHash: signatureMetadata?.hash ?? null,
      firmaDigitalToken: signatureMetadata?.token ?? null,
      firmaDigitalTimestamp: signatureMetadata?.timestamp ?? null,
      firmaTipo: formState.firmaTipo,
    };

    setSaving(true);
    const result = editingId
      ? await updateEntrega(editingId, payload)
      : await addEntrega(payload);
    setSaving(false);

    if (!result.success) {
      setFormError(result.error ?? "No se pudo guardar la entrega.");
      return;
    }

    const totalEntrega = items.reduce((sum, item) => sum + item.subtotal, 0);

    const shouldGeneratePdf =
      formState.firmaTipo === "digital" || formState.generarPdf === true;

    if (shouldGeneratePdf) {
      try {
        await generateEntregaPdf({
          ...payload,
          id: editingId ?? result.id ?? null,
          totalEntrega,
        });
      } catch (pdfError) {
        console.error("No se pudo generar el PDF de la entrega:", pdfError);
      }
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

  const isLoading =
    authLoading || trabajadoresLoading || eppLoading || entregasLoading;
  const globalError = trabajadoresError || eppError || entregasError;

  return (
    <>
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
                Registra movimientos, descuenta inventario automáticamente y
                mantén trazabilidad por trabajador, área y fecha.
              </p>
            </div>
            {canManageDeliveries ? (
              <button
                onClick={() => handleOpenModal()}
                disabled={isLoading || !user}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-mint-200/80 via-white to-celeste-200/70 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:from-dracula-purple dark:via-dracula-pink dark:to-dracula-cyan dark:text-dracula-bg"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Nueva Entrega</span>
                <span className="sm:hidden">Nueva</span>
              </button>
            ) : null}
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-mint-200/70 bg-mint-50/70 p-4 sm:p-5 text-left shadow-sm transition hover:border-mint-300 hover:bg-mint-100/70 hover:shadow-lg dark:border-dracula-green/30 dark:bg-dracula-current dark:hover:border-dracula-green/50 dark:hover:bg-dracula-green/10">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-mint-400 dark:text-dracula-green">
                EPP con mayor rotación (últimos {TOP_EPP_ROTATION_MONTHS} meses)
              </p>
              {topEppRotation ? (
                <>
                  <p className="mt-2 text-lg sm:text-xl font-semibold text-slate-800 dark:text-dracula-foreground">
                    {topEppRotation.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                    {integerFormatter.format(topEppRotation.totalUnits)}{" "}
                    unidades entregadas · promedio{" "}
                    {integerFormatter.format(
                      Math.round(topEppRotation.averagePerMonth)
                    )}{" "}
                    u/mes.
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-mint-500 dark:text-dracula-green">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {integerFormatter.format(topEppRotation.deliveries)}{" "}
                    movimientos registrados
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowRotationModal(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-mint-300/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-mint-600 transition hover:border-mint-400 hover:text-mint-700 dark:border-dracula-green/40 dark:bg-dracula-current dark:text-dracula-green"
                    >
                      Ver tendencia
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2 text-lg sm:text-xl font-semibold text-slate-500 dark:text-dracula-comment">
                    Sin datos recientes
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                    Registra entregas para analizar la rotación de los EPP.
                  </p>
                </>
              )}

              {showSpendingModal && (
                <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-900/70 px-4 py-8 backdrop-blur-sm">
                  <div className="relative w-full max-w-5xl rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl dark:border-dracula-current dark:bg-dracula-bg/95">
                    <button
                      type="button"
                      onClick={() => setShowSpendingModal(false)}
                      className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/70 text-slate-500 transition hover:border-purple-200 hover:text-slate-700 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground"
                      aria-label="Cerrar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="space-y-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-400 dark:text-dracula-purple">
                            Análisis económico de entregas
                          </p>
                          <h3 className="text-xl font-semibold text-slate-800 dark:text-dracula-foreground">
                            Tendencia de gasto{" "}
                            {currentSpendingPeriod.label.toLowerCase()}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-dracula-comment">
                            Evalúa el total entregado y el promedio por entrega
                            para cada período seleccionado.
                          </p>
                          {spendingRangeLabel && (
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-purple-400/70 dark:text-dracula-comment">
                              Rango analizado: {spendingRangeLabel}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-purple-200/70 bg-purple-50/60 px-3 py-2 text-xs font-semibold text-purple-600 dark:border-dracula-purple/60 dark:bg-dracula-current dark:text-dracula-purple sm:mt-8 sm:self-start sm:ml-auto">
                          <label
                            htmlFor="spending-period"
                            className="flex items-center gap-1"
                          >
                            <span>Período</span>
                          </label>
                          <select
                            id="spending-period"
                            value={spendingPeriod}
                            onChange={(event) =>
                              setSpendingPeriod(
                                event.target.value as SpendingPeriod
                              )
                            }
                            className="rounded-full border border-purple-300/60 bg-white px-2 py-1 text-[11px] font-semibold text-purple-600 focus:border-purple-400 focus:outline-none dark:border-dracula-purple/60 dark:bg-dracula-current dark:text-dracula-purple"
                          >
                            {SPENDING_PERIODS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {hasSpendingData ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-purple-200/70 bg-white/80 p-3 text-sm shadow-sm dark:border-dracula-purple/40 dark:bg-dracula-current/30">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-400 dark:text-dracula-purple">
                                Total entregado
                              </p>
                              <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                                {currency.format(spendingTotals.totalValue)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-purple-200/70 bg-white/80 p-3 text-sm shadow-sm dark:border-dracula-purple/40 dark:bg-dracula-current/30">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-400 dark:text-dracula-purple">
                                Entregas registradas
                              </p>
                              <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                                {integerFormatter.format(
                                  spendingTotals.deliveries
                                )}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-purple-200/70 bg-white/80 p-3 text-sm shadow-sm dark:border-dracula-purple/40 dark:bg-dracula-current/30">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-400 dark:text-dracula-purple">
                                Promedio por entrega
                              </p>
                              <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-dracula-foreground">
                                {currency.format(spendingAverage)}
                              </p>
                            </div>
                          </div>

                          <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart
                                data={spendingChartData}
                                margin={{
                                  top: 20,
                                  right: 30,
                                  left: 0,
                                  bottom: 0,
                                }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#e2e8f0"
                                />
                                <XAxis
                                  dataKey="label"
                                  stroke="#475569"
                                  tick={{ fontSize: 11 }}
                                />
                                <YAxis
                                  yAxisId="left"
                                  stroke="#475569"
                                  tickFormatter={(value) =>
                                    currency.format(Number(value))
                                  }
                                  width={100}
                                />
                                <YAxis
                                  yAxisId="right"
                                  orientation="right"
                                  stroke="#475569"
                                  tickFormatter={(value) =>
                                    currency.format(Number(value))
                                  }
                                  width={90}
                                />
                                <Tooltip
                                  formatter={(value: number, name) => [
                                    currency.format(value),
                                    name === "totalValue"
                                      ? "Total entregado"
                                      : "Promedio por entrega",
                                  ]}
                                  labelFormatter={(label) =>
                                    `Período: ${label}`
                                  }
                                />
                                <Legend />
                                <Bar
                                  yAxisId="left"
                                  dataKey="totalValue"
                                  name="Total entregado"
                                  fill={SPENDING_BAR_COLOR}
                                  radius={[8, 8, 0, 0]}
                                />
                                <Line
                                  yAxisId="right"
                                  type="monotone"
                                  dataKey="averagePerEntrega"
                                  name="Promedio por entrega"
                                  stroke="#0ea5e9"
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                  activeDot={{ r: 5 }}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="space-y-2 rounded-2xl border border-purple-200/70 bg-white/80 p-4 text-sm text-slate-600 dark:border-dracula-purple/40 dark:bg-dracula-current/30 dark:text-dracula-comment">
                            {latestSpendingEntries.map((entry) => (
                              <div
                                key={entry.key}
                                className="flex items-center justify-between gap-3"
                              >
                                <div className="font-semibold text-slate-700 dark:text-dracula-foreground">
                                  {entry.label}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-dracula-comment">
                                  {currency.format(entry.totalValue)} ·{" "}
                                  {integerFormatter.format(entry.deliveries)}{" "}
                                  entregas · promedio{" "}
                                  {currency.format(entry.averagePerEntrega)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="rounded-2xl border border-purple-200/70 bg-purple-50/60 p-6 text-center text-sm text-purple-600 dark:border-dracula-purple/40 dark:bg-dracula-current/20 dark:text-dracula-purple">
                          Aún no hay datos suficientes para generar este
                          análisis. Registra entregas en el período
                          seleccionado.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {showAreaTrendModal && areaTrendSeries.length > 0 && (
                <div className="fixed inset-0 z-[135] flex items-center justify-center bg-slate-900/70 px-4 py-8 backdrop-blur-sm">
                  <div className="relative w-full max-w-4xl rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl dark:border-dracula-current dark:bg-dracula-bg/95">
                    <button
                      type="button"
                      onClick={() => setShowAreaTrendModal(false)}
                      className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/70 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground"
                      aria-label="Cerrar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400 dark:text-dracula-cyan">
                          Tendencia de consumo por área
                        </p>
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-dracula-foreground">
                          {topAreaByWindow?.area ?? "Áreas con mayor consumo"}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-dracula-comment">
                          Visualiza la evolución diaria del valor total
                          entregado para las áreas con mayor consumo.
                        </p>
                      </div>
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={areaTrendChartData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e2e8f0"
                            />
                            <XAxis dataKey="day" stroke="#475569" />
                            <YAxis
                              stroke="#475569"
                              tickFormatter={(value) =>
                                currency.format(Number(value))
                              }
                              width={90}
                            />
                            <Tooltip
                              formatter={(value: number, name) => [
                                currency.format(value),
                                name,
                              ]}
                              labelFormatter={(label) => `Fecha: ${label}`}
                            />
                            <Legend />
                            {areaTrendSeries.map((series, index) => (
                              <Line
                                key={series.area}
                                type="monotone"
                                dataKey={series.area}
                                stroke={
                                  AREA_TREND_CHART_COLORS[
                                    index % AREA_TREND_CHART_COLORS.length
                                  ]
                                }
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            ))}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/80 p-4 text-sm text-slate-600 dark:border-dracula-current dark:bg-dracula-current/20 dark:text-dracula-comment">
                        {areaTrendSeries.map((series, index) => (
                          <div
                            key={series.area}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    AREA_TREND_CHART_COLORS[
                                      index % AREA_TREND_CHART_COLORS.length
                                    ],
                                }}
                              />
                              <span className="font-semibold text-slate-700 dark:text-dracula-foreground">
                                {series.area}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-dracula-comment">
                              {currency.format(series.totalValue)} total
                              entregado ·{" "}
                              {integerFormatter.format(series.deliveries)}{" "}
                              entregas · promedio diario{" "}
                              {currency.format(series.averagePerDay)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-celeste-200/70 bg-celeste-50/70 p-4 sm:p-5 text-left shadow-sm transition hover:border-celeste-300 hover:bg-celeste-100/70 hover:shadow-lg dark:border-dracula-cyan/30 dark:bg-dracula-current dark:hover:border-dracula-cyan/50 dark:hover:bg-dracula-cyan/10">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-celeste-400 dark:text-dracula-cyan">
                Área con mayor consumo ({topAreaWindowDays} días)
              </p>
              <div className="mt-2 flex items-center gap-2">
                <label className="text-[11px] font-semibold text-celeste-500 dark:text-dracula-cyan">
                  Rango
                </label>
                <select
                  value={topAreaWindowDays}
                  onChange={(event) =>
                    setTopAreaWindowDays(Number(event.target.value))
                  }
                  className="rounded-full border border-celeste-200/70 bg-white px-2 py-1 text-[11px] font-semibold text-celeste-500 focus:border-celeste-400 focus:outline-none dark:border-dracula-cyan/40 dark:bg-dracula-current dark:text-dracula-cyan"
                >
                  {TOP_AREA_WINDOW_DAYS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} días
                    </option>
                  ))}
                </select>
              </div>
              {topAreaByWindow ? (
                <>
                  <p className="mt-2 text-lg sm:text-xl font-semibold text-slate-800 dark:text-dracula-foreground">
                    {topAreaByWindow.area}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                    {integerFormatter.format(topAreaByWindow.deliveries)}{" "}
                    entregas · consumo{" "}
                    {currency.format(topAreaByWindow.totalValue)}.
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-celeste-500 dark:text-dracula-cyan">
                    <Layers className="h-3.5 w-3.5" />
                    Ver detalles del área
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowAreaTrendModal(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-celeste-300/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-celeste-600 transition hover:border-celeste-400 hover:text-celeste-700 dark:border-dracula-cyan/40 dark:bg-dracula-current dark:text-dracula-cyan"
                    >
                      Ver tendencia de consumo
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2 text-lg sm:text-xl font-semibold text-slate-500 dark:text-dracula-comment">
                    Sin entregas recientes
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                    Registra entregas para analizar el consumo por área.
                  </p>
                </>
              )}
            </div>
            <div className="rounded-3xl border border-amber-200/70 bg-amber-50/60 p-4 sm:p-5 text-left shadow-sm transition hover:border-amber-300 hover:bg-amber-100/70 hover:shadow-lg dark:border-dracula-orange/30 dark:bg-dracula-current dark:hover:border-dracula-orange/50 dark:hover:bg-dracula-orange/10">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-500 dark:text-dracula-orange">
                Firmas digitales
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-dracula-foreground">
                {integerFormatter.format(overallSummary.digital)}
                <span className="ml-2 text-sm font-medium text-amber-500 dark:text-dracula-orange">
                  ({overallSummary.digitalPercentage}% digital)
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                {integerFormatter.format(overallSummary.manual)} entregas con
                firma manual.
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-500 dark:text-dracula-orange">
                <Fingerprint className="h-3.5 w-3.5" />
                Analizar registros de firma
              </p>
            </div>
            <div className="rounded-3xl border border-purple-200/70 bg-purple-50/60 p-4 sm:p-5 text-left shadow-sm transition hover:border-purple-300 hover:bg-purple-100/70 hover:shadow-lg dark:border-dracula-purple/30 dark:bg-dracula-current dark:hover:border-dracula-purple/50 dark:hover:bg-dracula-purple/10">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-purple-400 dark:text-dracula-purple">
                Valor total entregado
              </p>
              <p className="mt-2 text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-800 dark:text-dracula-foreground">
                {currency.format(overallSummary.totalValue)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
                Promedio por entrega:{" "}
                {currency.format(overallSummary.average || 0)}.
              </p>
              {latestSpending ? (
                <p className="mt-1 text-[11px] text-purple-500 dark:text-dracula-purple/80">
                  Último {currentSpendingPeriod.label.toLowerCase()}:{" "}
                  {currency.format(latestSpending.totalValue)} ·{" "}
                  {integerFormatter.format(latestSpending.deliveries)} entregas
                  · promedio {currency.format(latestSpending.averagePerEntrega)}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-purple-500 dark:text-dracula-purple/80">
                  Registra entregas recientes para ver la tendencia económica.
                </p>
              )}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowSpendingModal(true)}
                  disabled={!hasSpendingData}
                  className="inline-flex items-center gap-1 rounded-full border border-purple-300/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-purple-600 transition hover:border-purple-400 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dracula-purple/40 dark:bg-dracula-current dark:text-dracula-purple"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Ver análisis económico
                </button>
              </div>
            </div>
          </div>
          <div className="mb-6 flex w-full flex-wrap items-center gap-3">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-dracula-comment" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar por trabajador, RUT o EPP"
                className="w-full rounded-2xl border border-soft-gray-200/70 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground dark:placeholder-dracula-comment"
              />
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm shadow-sm dark:border-dracula-current dark:bg-dracula-current w-full sm:w-auto">
              <User className="h-4 w-4 text-slate-400 dark:text-dracula-comment" />
              <select
                value={trabajadorFilter}
                onChange={(event) => setTrabajadorFilter(event.target.value)}
                className="bg-transparent focus:outline-none dark:text-dracula-foreground w-full sm:w-auto"
              >
                <option value="all">Todos los trabajadores</option>
                {trabajadorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm shadow-sm dark:border-dracula-current dark:bg-dracula-current w-full sm:w-auto">
              <Layers className="h-4 w-4 text-slate-400 dark:text-dracula-comment" />
              <select
                value={areaFilter}
                onChange={(event) => {
                  setAreaFilter(event.target.value);
                  setSubAreaFilter("all");
                }}
                className="bg-transparent focus:outline-none dark:text-dracula-foreground w-full sm:w-auto"
              >
                <option value="all">Todas las áreas</option>
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown de Sub-Área (versión corregida) */}
            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm shadow-sm dark:border-dracula-current dark:bg-dracula-current w-full sm:w-auto">
              <Grid3x3 className="h-4 w-4 text-slate-400 dark:text-dracula-comment" />
              <select
                value={subAreaFilter}
                onChange={(event) => setSubAreaFilter(event.target.value)}
                disabled={areaFilter === "all" || subAreaOptions.length === 0}
                className="bg-transparent focus:outline-none dark:text-dracula-foreground disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-dracula-comment w-full sm:w-auto"
              >
                {/* V-- ESTA LÍNEA ES LA QUE CAMBIA --V */}
                <option value="all">
                  {areaFilter === "all"
                    ? "Selecciona un área primero"
                    : "Todas las sub-áreas"}
                </option>
                {subAreaOptions.map((subArea) => (
                  <option key={subArea} value={subArea}>
                    {subArea}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 shadow-sm dark:border-dracula-current dark:bg-dracula-current/30 dark:text-dracula-comment sm:flex sm:flex-nowrap sm:items-center sm:gap-3 sm:w-auto shrink-0">
              <label className="flex items-center gap-2 sm:gap-1">
                <Calendar className="h-4 w-4" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-2 py-1 text-[11px] font-normal text-slate-600 focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
                />
              </label>
              <label className="flex items-center gap-2 sm:gap-1">
                <Calendar className="h-4 w-4" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-2 py-1 text-[11px] font-normal text-slate-600 focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-foreground"
                />
              </label>
            </div>

            <div className="flex flex-col items-start gap-1">
              <button
                onClick={handleExportToExcel}
                disabled={
                  !canManageDeliveries ||
                  !isDateRangeValid ||
                  filteredEntregas.length === 0
                }
                className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full border border-mint-200/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-mint-300 hover:bg-mint-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dracula-current dark:bg-dracula-current dark:text-dracula-green dark:hover:border-dracula-green dark:hover:bg-dracula-bg sm:w-auto sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Exportar Excel</span>
                <span className="sm:hidden">Excel</span>
              </button>
              {!canManageDeliveries ? (
                <span className="text-[11px] text-slate-400 dark:text-dracula-comment">
                  Solo administradores o editores pueden exportar inventario.
                </span>
              ) : null}
            </div>
          </div>

          {globalError && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-600 dark:border-dracula-red/40 dark:bg-dracula-red/10 dark:text-dracula-red">
              {globalError}
            </div>
          )}

          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/80 px-4 py-4 text-sm text-slate-600 dark:border-dracula-current dark:bg-dracula-current/30 dark:text-dracula-comment sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-start gap-3">
              <Layers className="h-5 w-5 flex-shrink-0 text-celeste-400" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400">
                  Resumen filtrado
                </p>
                <p className="text-base font-semibold text-slate-800 dark:text-dracula-foreground">
                  {filteredEntregas.length} entregas ·{" "}
                  {currency.format(totalFiltrado)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-soft-gray-200/70 bg-white p-1 shadow-sm dark:border-dracula-current dark:bg-dracula-current sm:ml-auto">
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
                Registra una nueva entrega para comenzar a llevar trazabilidad
                del stock asignado a cada trabajador.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {viewMode === "card" ? (
                <div className="grid grid-cols-1 gap-3">
                  {filteredEntregas.map((entrega) => (
                    <article
                      key={entrega.id}
                      className="w-full min-w-0 rounded-3xl border border-soft-gray-200/70 bg-white/95 p-4 shadow-sm transition hover:shadow-md dark:border-dracula-current dark:bg-dracula-current/40"
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
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-dracula-comment">
                            Total
                          </p>
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
                                key={`${entrega.id}-${item.eppId}-${
                                  item.variantId ?? "default"
                                }`}
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
                          {canManageDeliveries ? (
                            <button
                              onClick={() => handleOpenModal(entrega)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-celeste-200/70 text-celeste-500 transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-purple/40 dark:text-dracula-cyan dark:hover:border-dracula-purple dark:hover:bg-dracula-cyan/10"
                              aria-label="Editar entrega"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}
                          {canDeleteDeliveries ? (
                            <button
                              onClick={() => handleDelete(entrega.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/70 text-rose-500 transition hover:border-rose-300 hover:bg-rose-50 dark:border-dracula-red/40 dark:text-dracula-red dark:hover:border-dracula-red dark:hover:bg-dracula-red/10"
                              aria-label="Eliminar entrega"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
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
                          <th className="px-4 py-3 text-left">
                            Área / Sub-área
                          </th>
                          <th className="px-4 py-3 text-left">Detalle</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-left">
                            Autorizado por
                          </th>
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
                                    key={`${entrega.id}-${item.eppId}-${
                                      item.variantId ?? "default"
                                    }`}
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
                                {canManageDeliveries ? (
                                  <button
                                    onClick={() => handleOpenModal(entrega)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-celeste-200/70 text-celeste-500 transition hover:border-celeste-300 hover:bg-celeste-50 dark:border-dracula-purple/40 dark:text-dracula-cyan dark:hover;border-dracula-purple dark:hover:bg-dracula-cyan/10"
                                    aria-label="Editar entrega"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                ) : null}
                                {canDeleteDeliveries ? (
                                  <button
                                    onClick={() => handleDelete(entrega.id)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/70 text-rose-500 transition hover:border-rose-300 hover:bg-rose-50 dark:border-dracula-red/40 dark:text-dracula-red dark:hover;border-dracula-red dark:hover:bg-dracula-red/10"
                                    aria-label="Eliminar entrega"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                ) : null}
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
      </div>

      {showRotationModal && rotationSeries.length > 0 && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/70 px-4 py-8 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl dark:border-dracula-current dark:bg-dracula-bg/95">
            <button
              type="button"
              onClick={() => setShowRotationModal(false)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-gray-200/70 text-slate-500 transition hover:border-celeste-200 hover:text-slate-700 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-purple dark:hover:text-dracula-foreground"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-mint-400 dark:text-dracula-green">
                  Tendencia de EPP entregados
                </p>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-dracula-foreground">
                  Rotación mensual últimos{" "}
                  {rotationInsights?.monthCount ?? TOP_EPP_ROTATION_MONTHS}{" "}
                  meses
                </h3>
                <p className="text-sm text-slate-500 dark:text-dracula-comment">
                  Visualiza la evolución mensual de las unidades entregadas para
                  los EPP con mayor demanda.
                </p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={rotationChartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#475569" />
                    <YAxis stroke="#475569" />
                    <Tooltip
                      formatter={(value: number) => [
                        integerFormatter.format(value),
                        "Unidades",
                      ]}
                    />
                    <Legend />
                    {rotationSeries.map((series, index) => (
                      <Line
                        key={series.id}
                        type="monotone"
                        dataKey={series.name}
                        stroke={
                          ROTATION_CHART_COLORS[
                            index % ROTATION_CHART_COLORS.length
                          ]
                        }
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/80 p-4 text-sm text-slate-600 dark:border-dracula-current dark:bg-dracula-current/20 dark:text-dracula-comment">
                {rotationSeries.map((series, index) => (
                  <div
                    key={series.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            ROTATION_CHART_COLORS[
                              index % ROTATION_CHART_COLORS.length
                            ],
                        }}
                      />
                      <span className="font-semibold text-slate-700 dark:text-dracula-foreground">
                        {series.name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-dracula-comment">
                      {integerFormatter.format(series.totalUnits)} unidades
                      totales · promedio{" "}
                      {integerFormatter.format(
                        Math.round(series.averagePerMonth)
                      )}{" "}
                      u/mes · {integerFormatter.format(series.deliveries)}{" "}
                      movimientos
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
                  Asocia el movimiento a un trabajador y descuenta stock de
                  manera automática.
                </p>
              </div>

              {formError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600 dark:border-dracula-red/30 dark:bg-dracula-red/10 dark:text-dracula-red">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <section className="space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-celeste-300 dark:text-dracula-cyan">
                    Identificación general
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-dracula-foreground">
                        👷 Trabajador *
                      </label>
                      <select
                        required
                        value={formState.trabajadorId}
                        onChange={(event) => {
                          const value = event.target.value;
                          const worker =
                            trabajadores.find((t) => t.id === value) ?? null;
                          setFormState((prev) => ({
                            ...prev,
                            trabajadorId: value,
                            trabajadorCargo: worker?.cargo ?? "",
                          }));
                        }}
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
                            items: prev.items.map((item) => ({
                              ...item,
                              fechaRecambio:
                                item.fechaRecambio || event.target.value,
                            })),
                          }))
                        }
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                  </div>

                  {selectedTrabajador && (
                    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/70 px-4 py-3 text-sm text-slate-600 dark:border-dracula-current dark:bg-dracula-current/30 dark:text-dracula-comment md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment/80">
                          Área / Sub-área
                        </p>
                        <p className="font-semibold text-slate-800 dark:text-dracula-foreground">
                          {selectedTrabajador.areaTrabajo || "Sin área"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-dracula-comment">
                          {selectedTrabajador.subAreaTrabajo || "Sin sub-área"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400 dark:text-dracula-comment/80">
                          Cargo
                        </p>
                        <p className="font-semibold text-slate-800 dark:text-dracula-foreground">
                          {formState.trabajadorCargo ||
                            selectedTrabajador.cargo ||
                            "Sin cargo"}
                        </p>
                      </div>
                    </div>
                  )}
                </section>

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
                        !item.eppId ||
                        (epp?.multiSize && !item.variantId) ||
                        maxCantidad === 0;
                      const showNoStockAlert = Boolean(
                        item.eppId && maxCantidad !== null && maxCantidad <= 0
                      );

                      return (
                        <div
                          key={item.tempId}
                          className="grid grid-cols-1 gap-3 rounded-2xl border border-soft-gray-200/70 bg-white/90 p-4 shadow-sm dark:border-dracula-current dark:bg-dracula-current/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]"
                        >
                          <div
                            className="relative"
                            data-epp-dropdown={item.tempId}
                          >
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-dracula-comment">
                              EPP
                            </label>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-soft-gray-200/70 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-celeste-300 focus:outline-none focus:ring-2 focus:ring-celeste-200 dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                              onClick={() =>
                                setOpenEppDropdown((prev) =>
                                  prev === item.tempId ? null : item.tempId
                                )
                              }
                              aria-haspopup="listbox"
                              aria-expanded={openEppDropdown === item.tempId}
                            >
                              <span className="flex min-w-0 flex-1 items-center gap-3">
                                {epp?.imageBase64 ? (
                                  <img
                                    src={epp.imageBase64}
                                    alt={epp.name}
                                    className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
                                  />
                                ) : (
                                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-soft-gray-200 bg-soft-gray-50 text-celeste-400 dark:border-dracula-current/40 dark:bg-dracula-current/30 dark:text-dracula-cyan">
                                    <HardHat className="h-5 w-5" />
                                  </span>
                                )}
                                <span className="line-clamp-1 text-left">
                                  {epp?.name || "Selecciona un EPP"}
                                </span>
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 flex-shrink-0 transition-transform ${
                                  openEppDropdown === item.tempId
                                    ? "rotate-180"
                                    : ""
                                }`}
                              />
                            </button>
                            {openEppDropdown === item.tempId ? (
                              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-soft-gray-200/80 bg-white p-1 shadow-xl dark:border-dracula-current dark:bg-dracula-bg">
                                <div
                                  role="listbox"
                                  aria-label="Selecciona un EPP"
                                  className="space-y-2"
                                >
                                  {eppOptionsByCategory.map((group) => (
                                    <div
                                      key={group.category}
                                      className="space-y-1"
                                    >
                                      <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-celeste-400 dark:text-dracula-cyan">
                                        {group.category}
                                      </p>
                                      <ul className="space-y-1">
                                        {group.items.map((option) => {
                                          const isSelected =
                                            option.id === item.eppId;
                                          return (
                                            <li key={option.id}>
                                              <button
                                                type="button"
                                                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-celeste-50 hover:text-celeste-600 dark:hover:bg-dracula-current/40 ${
                                                  isSelected
                                                    ? "bg-celeste-50 text-celeste-600 dark:bg-dracula-current/40"
                                                    : "text-slate-600 dark:text-dracula-comment"
                                                }`}
                                                onClick={() => {
                                                  handleItemChange(
                                                    item.tempId,
                                                    {
                                                      eppId: option.id,
                                                    }
                                                  );
                                                  setOpenEppDropdown(null);
                                                }}
                                              >
                                                <span className="flex items-center gap-3">
                                                  {option.imageBase64 ? (
                                                    <img
                                                      src={option.imageBase64}
                                                      alt={option.name}
                                                      className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
                                                    />
                                                  ) : (
                                                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-soft-gray-200 bg-soft-gray-50 text-celeste-400 dark:border-dracula-current/40 dark:bg-dracula-current/30 dark:text-dracula-cyan">
                                                      <HardHat className="h-5 w-5" />
                                                    </span>
                                                  )}
                                                  <span className="line-clamp-1">
                                                    {option.name}
                                                  </span>
                                                </span>
                                              </button>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
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
                                  <option
                                    key={variant.value}
                                    value={variant.value}
                                  >
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
                            {showNoStockAlert && (
                              <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2 text-xs font-semibold text-rose-600 dark:border-dracula-red/50 dark:bg-dracula-red/10 dark:text-dracula-red">
                                La cantidad debe ser mayor que cero.
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-dracula-comment">
                              Fecha probable de recambio
                            </label>
                            <input
                              type="date"
                              value={item.fechaRecambio}
                              onChange={(event) =>
                                handleItemChange(item.tempId, {
                                  fechaRecambio: event.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-3 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                            />
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

                <section className="space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-celeste-300 dark:text-dracula-cyan">
                    📘 Capacitación y entrega informada
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-dracula-comment">
                    Declaro haber recibido los Elementos de Protección Personal
                    antes descritos, adecuados a los riesgos de mi labor,
                    conforme a la evaluación de riesgos. He recibido instrucción
                    teórica y práctica sobre su uso, mantenimiento, limitaciones
                    y sustitución, conforme al D.S. 44/2024 y D.S. 594/1999.
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="flex items-start gap-3 rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm transition hover:border-celeste-200 dark:border-dracula-current dark:bg-dracula-current/40 dark:text-dracula-comment">
                      <input
                        type="checkbox"
                        checked={formState.capacitacion.instruccionUso}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            capacitacion: {
                              ...prev.capacitacion,
                              instruccionUso: event.target.checked,
                            },
                          }))
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-celeste-500 focus:ring-celeste-400"
                      />
                      <span>
                        🧑‍🏫 He sido instruido en el uso correcto de los EPP.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm transition hover:border-celeste-200 dark:border-dracula-current dark:bg-dracula-current/40 dark:text-dracula-comment">
                      <input
                        type="checkbox"
                        checked={formState.capacitacion.conoceLimitaciones}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            capacitacion: {
                              ...prev.capacitacion,
                              conoceLimitaciones: event.target.checked,
                            },
                          }))
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-celeste-500 focus:ring-celeste-400"
                      />
                      <span>
                        🛡️ Comprendo las limitaciones y cuidados de cada
                        elemento.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm transition hover:border-celeste-200 dark:border-dracula-current dark:bg-dracula-current/40 dark:text-dracula-comment">
                      <input
                        type="checkbox"
                        checked={formState.capacitacion.recibioFolletos}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            capacitacion: {
                              ...prev.capacitacion,
                              recibioFolletos: event.target.checked,
                            },
                          }))
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-celeste-500 focus:ring-celeste-400"
                      />
                      <span>
                        📄 Recibí los folletos informativos de cada EPP.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm transition hover:border-celeste-200 dark:border-dracula-current dark:bg-dracula-current/40 dark:text-dracula-comment">
                      <input
                        type="checkbox"
                        checked={formState.capacitacion.declaracionAceptada}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            capacitacion: {
                              ...prev.capacitacion,
                              declaracionAceptada: event.target.checked,
                            },
                          }))
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-celeste-500 focus:ring-celeste-400"
                      />
                      <span>
                        ✅ Declaro haber recibido la capacitación conforme al
                        D.S. 44/2024.
                      </span>
                    </label>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-celeste-300 dark:text-dracula-cyan">
                    📝 Observaciones y firmas
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-dracula-comment">
                        🗒️ Observaciones
                      </label>
                      <textarea
                        value={formState.observaciones}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            observaciones: event.target.value,
                          }))
                        }
                        placeholder="Cambios de talla, EPP defectuoso, indicaciones especiales, etc."
                        className="h-24 w-full rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-3 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-dracula-comment">
                        📅 Fecha firma trabajador
                      </label>
                      <input
                        type="date"
                        value={formState.firmaFecha}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            firmaFecha: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-dracula-comment">
                        ⏰ Hora firma trabajador
                      </label>
                      <input
                        type="time"
                        value={formState.firmaHora}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            firmaHora: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-soft-gray-200/70 bg-white px-4 py-2 text-sm focus:border-celeste-300 focus:outline-none dark:border-dracula-current dark:bg-dracula-bg dark:text-dracula-foreground"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
                    <div className="rounded-2xl border border-soft-gray-200/70 bg-white px-4 py-4 shadow-sm dark:border-dracula-current dark:bg-dracula-current/20">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-dracula-comment">
                            ✍️ Firma del trabajador
                          </p>
                          <p
                            className={`mt-1 text-xs font-medium ${signatureStatusInfo.toneClass}`}
                          >
                            {signatureStatusInfo.label}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-dracula-comment">
                          <button
                            type="button"
                            onClick={() => handleSignatureModeChange("digital")}
                            className={`rounded-full border px-3 py-1.5 transition ${
                              formState.firmaTipo === "digital"
                                ? "border-celeste-400 bg-celeste-50 text-celeste-600 dark:border-dracula-cyan dark:bg-dracula-cyan/20 dark:text-dracula-cyan"
                                : "border-soft-gray-200 text-slate-500 hover:border-celeste-300 hover:text-celeste-500 dark:border-dracula-current/60 dark:hover:border-dracula-cyan dark:hover:text-dracula-cyan"
                            }`}
                          >
                            Digital
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSignatureModeChange("manual")}
                            className={`rounded-full border px-3 py-1.5 transition ${
                              formState.firmaTipo === "manual"
                                ? "border-amber-400 bg-amber-50 text-amber-600 dark:border-amber-300 dark:bg-amber-300/20 dark:text-amber-200"
                                : "border-soft-gray-200 text-slate-500 hover:border-amber-300 hover:text-amber-600 dark:border-dracula-current/60 dark:hover:border-amber-300 dark:hover:text-amber-200"
                            }`}
                          >
                            Manual
                          </button>
                        </div>
                      </div>
                      {formState.firmaTipo === "digital" ? (
                        <>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSignatureClear}
                              className="inline-flex items-center gap-1 rounded-full border border-soft-gray-200/70 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-rose-200 hover:text-rose-500 dark:border-dracula-current dark:text-dracula-comment dark:hover:border-dracula-red dark:hover:text-dracula-red"
                            >
                              Limpiar
                            </button>
                            <button
                              type="button"
                              onClick={handleSignatureSave}
                              className="inline-flex items-center gap-1 rounded-full bg-celeste-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-celeste-500"
                            >
                              Guardar firma
                            </button>
                          </div>
                          <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-soft-gray-300 bg-soft-gray-50/80">
                            <canvas
                              ref={signatureCanvasRef}
                              className="h-48 w-full touch-manipulation bg-white"
                            />
                          </div>
                          {signatureError && (
                            <p className="mt-3 text-xs font-semibold text-rose-600 dark:text-dracula-red">
                              {signatureError}
                            </p>
                          )}
                          {formState.firmaDigitalHash && (
                            <div className="mt-4 space-y-1 rounded-xl bg-soft-gray-100/70 p-3 text-[11px] text-slate-600 dark:bg-dracula-current/40 dark:text-dracula-comment">
                              <p>
                                <span className="font-semibold text-slate-700 dark:text-dracula-foreground">
                                  Hash (SHA-256):
                                </span>{" "}
                                {formState.firmaDigitalHash}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700 dark:text-dracula-foreground">
                                  Token:
                                </span>{" "}
                                {formState.firmaDigitalToken}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700 dark:text-dracula-foreground">
                                  Fecha-hora de firma:
                                </span>{" "}
                                {formatDateTime(
                                  formState.firmaDigitalTimestamp
                                )}
                              </p>
                            </div>
                          )}
                          <p className="mt-3 text-[11px] text-slate-400 dark:text-dracula-comment">
                            La firma digital queda asociada a esta entrega con
                            sello de tiempo y hash. Asegúrate de guardarla antes
                            de enviar.
                          </p>
                        </>
                      ) : (
                        <div className="mt-4 space-y-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-700 dark:border-amber-300/60 dark:bg-amber-300/10 dark:text-amber-200">
                          <p className="font-semibold">
                            Firma manual seleccionada.
                          </p>
                          <p className="text-xs">
                            El trabajador firmará el documento impreso. No se
                            generarán sello de tiempo ni hash digitales para
                            esta entrega.
                          </p>
                          <label className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-white/80 px-3 py-2 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-300 dark:border-amber-300/40 dark:bg-transparent dark:text-amber-200">
                            <input
                              type="checkbox"
                              checked={formState.generarPdf}
                              onChange={(event) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  generarPdf: event.target.checked,
                                }))
                              }
                              className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-500 focus:ring-amber-400"
                            />
                            <span>Generar PDF al guardar (opcional)</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

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
    </>
  );
}
