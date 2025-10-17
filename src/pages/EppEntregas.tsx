import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFImage } from "pdf-lib";
import SignaturePad from "signature_pad";
import * as XLSX from "xlsx";
import {
  BarChart3,
  Calendar,
  Download,
  Fingerprint,
  Grid3x3,
  Layers,
  List,
  MoveHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  User,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTrabajadoresFirestore } from "../hooks/useTrabajadoresFirestore";
import { useEppFirestore } from "../hooks/useEppFirestore";
import {
  useEppEntregasFirestore,
  type Entrega,
  type EntregaItem,
  type CreateEntregaInput,
} from "../hooks/useEppEntregasFirestore";

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

const formatDate = (value: Date | string | undefined) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CL");
};

const randomId = () => Math.random().toString(36).slice(2, 9);

const wrapLines = (text: string, maxChars = 90): string[] => {
  if (!text) return ["—"];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length > maxChars) {
      if (current.length > 0) {
        lines.push(current);
        current = word;
      } else {
        lines.push(candidate);
        current = "";
      }
    } else {
      current = candidate;
    }
  });

  if (current.length > 0) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : ["—"];
};

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
    throw new Error("No se puede decodificar la firma digital en este entorno.");
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const ensureCrypto = () => {
  const cryptoObj = globalThis.crypto ?? (typeof window !== "undefined" ? window.crypto : undefined);
  if (!cryptoObj?.subtle) {
    throw new Error("La API de criptografía no está disponible en este navegador.");
  }
  return cryptoObj;
};

const sha256Hex = async (data: Uint8Array) => {
  const cryptoObj = ensureCrypto();
  const digest = await cryptoObj.subtle.digest("SHA-256", data);
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

const generateSignatureMetadata = async (dataUrl: string): Promise<SignatureMetadata> => {
  const bytes = dataUrlToUint8Array(dataUrl);
  const hash = await sha256Hex(bytes);
  const cryptoObj = ensureCrypto();
  const token = typeof cryptoObj.randomUUID === "function" ? cryptoObj.randomUUID() : hash.slice(0, 32);
  const timestamp = new Date().toISOString();
  return { dataUrl, hash, token, timestamp };
};

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
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadInstanceRef = useRef<SignaturePad | null>(null);
  const [signatureStatus, setSignatureStatus] = useState<"idle" | "dirty" | "saved">("idle");
  const [signatureError, setSignatureError] = useState<string | null>(null);
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
          label: "Firma manual seleccionada · se registrará en documento impreso",
          toneClass: "text-slate-500 dark:text-dracula-comment",
        };

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
    const digitalPercentage = total > 0 ? Math.round((digital / total) * 100) : 0;

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
          declaracionAceptada: entrega.capacitacion?.declaracionAceptada ?? false,
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
        entrega.firmaTipo === "digital" && entrega.firmaDigitalDataUrl ? "saved" : "idle"
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
      setSignatureError("No se pudo generar la firma digital. Intenta nuevamente.");
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
    const pdfDoc = await PDFDocument.create();
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 42;
    const lineHeight = 14;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let cursorY = pageHeight - margin;

    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const ensureSpace = (lines = 1) => {
      if (cursorY - lines * lineHeight < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        cursorY = pageHeight - margin;
      }
    };

    const drawHeading = (text: string, size = 20) => {
      ensureSpace(2);
      page.drawText(text, {
        x: margin,
        y: cursorY,
        font: boldFont,
        size,
        color: rgb(0.07, 0.18, 0.4),
      });
      cursorY -= size + 4;
    };

    const drawSectionTitle = (text: string) => {
      ensureSpace(2);
      cursorY -= lineHeight - 2;
      page.drawText(text, {
        x: margin,
        y: cursorY,
        font: boldFont,
        size: 13,
        color: rgb(0.08, 0.28, 0.45),
      });
      cursorY -= lineHeight / 2;
      page.drawLine({
        start: { x: margin, y: cursorY },
        end: { x: pageWidth - margin, y: cursorY },
        thickness: 1,
        color: rgb(0.85, 0.88, 0.94),
      });
      cursorY -= lineHeight / 2;
    };

    const drawTextLines = (
      lines: string[],
      options?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }
    ) => {
      const font = options?.bold ? boldFont : bodyFont;
      const size = options?.size ?? 11;
      const color = options?.color ?? rgb(0.1, 0.11, 0.13);
      lines.forEach((line) => {
        ensureSpace(1);
        page.drawText(line, {
          x: margin,
          y: cursorY,
          font,
          size,
          color,
        });
        cursorY -= lineHeight;
      });
    };

    const drawLabelValue = (label: string, value: string) => {
      ensureSpace(1.5);
      page.drawText(label, {
        x: margin,
        y: cursorY,
        font: boldFont,
        size: 11,
        color: rgb(0.08, 0.28, 0.45),
      });
      page.drawText(value, {
        x: margin + 160,
        y: cursorY,
        font: bodyFont,
        size: 11,
        color: rgb(0.15, 0.17, 0.2),
      });
      cursorY -= lineHeight;
    };

    const drawCheckbox = (checked: boolean, label: string) => {
      const boxSize = 12;
      const lineSpacing = 18;
      ensureSpace(lineSpacing / lineHeight + 0.3);
      const boxX = margin;
      const boxY = cursorY - 2;

      page.drawRectangle({
        x: boxX,
        y: boxY - boxSize + 4,
        width: boxSize,
        height: boxSize,
        borderWidth: 1.1,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.1, 0.28, 0.5),
      });

      if (checked) {
        page.drawLine({
          start: { x: boxX + 3, y: boxY - boxSize + 9 },
          end: { x: boxX + 6, y: boxY - boxSize + 3 },
          thickness: 1.6,
          color: rgb(0.1, 0.28, 0.5),
        });
        page.drawLine({
          start: { x: boxX + 6, y: boxY - boxSize + 3 },
          end: { x: boxX + 10, y: boxY - boxSize + 14 },
          thickness: 1.6,
          color: rgb(0.1, 0.28, 0.5),
        });
      }

      page.drawText(label, {
        x: boxX + boxSize + 10,
        y: boxY,
        font: bodyFont,
        size: 11,
        color: rgb(0.1, 0.11, 0.13),
      });

      cursorY -= lineSpacing;
    };

    const drawTableHeader = (columns: { title: string; width: number }[]) => {
      ensureSpace(1.6);
      const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
      page.drawRectangle({
        x: margin,
        y: cursorY - lineHeight - 2,
        width: totalWidth,
        height: lineHeight + 6,
        color: rgb(0.95, 0.97, 1),
      });

      let cursorX = margin + 4;
      columns.forEach((column) => {
        page.drawText(column.title, {
          x: cursorX,
          y: cursorY,
          font: boldFont,
          size: 11,
          color: rgb(0.05, 0.2, 0.42),
        });
        cursorX += column.width;
      });

      cursorY -= lineHeight + 6;
      page.drawLine({
        start: { x: margin, y: cursorY + 3 },
        end: { x: margin + totalWidth, y: cursorY + 3 },
        thickness: 0.6,
        color: rgb(0.8, 0.84, 0.9),
      });
    };

    const drawTableRow = (
      values: { text: string; width: number; wrap?: number }[],
      options?: { bold?: boolean }
    ) => {
      const totalWidth = values.reduce((sum, value) => sum + value.width, 0);
      const columnEdges: number[] = [margin];
      values.forEach((value) => {
        columnEdges.push(columnEdges[columnEdges.length - 1] + value.width);
      });

      const wrapped = values.map((value) => {
        const limit = value.wrap ?? 36;
        return wrapLines(value.text, limit);
      });
      const rowLines = Math.max(...wrapped.map((lines) => lines.length));
      ensureSpace(rowLines + 0.3);

      const startY = cursorY;

      for (let lineIndex = 0; lineIndex < rowLines; lineIndex += 1) {
        let cursorX = margin + 4;
        values.forEach((value, columnIndex) => {
          const lines = wrapped[columnIndex];
          const content = lines[lineIndex] ?? "";
          if (content) {
            page.drawText(content, {
              x: cursorX,
              y: cursorY,
              font: options?.bold ? boldFont : bodyFont,
              size: 10.2,
              color: rgb(0.16, 0.17, 0.22),
            });
          }
          cursorX += value.width;
        });
        cursorY -= lineHeight;
      }

      const topY = startY + lineHeight + 2;
      const bottomY = cursorY - 2;

      page.drawLine({
        start: { x: margin, y: topY },
        end: { x: margin + totalWidth, y: topY },
        thickness: 0.6,
        color: rgb(0.82, 0.86, 0.93),
      });
      page.drawLine({
        start: { x: margin, y: bottomY },
        end: { x: margin + totalWidth, y: bottomY },
        thickness: 0.6,
        color: rgb(0.82, 0.86, 0.93),
      });

      for (let edgeIndex = 1; edgeIndex < columnEdges.length - 1; edgeIndex += 1) {
        const edgeX = columnEdges[edgeIndex];
        page.drawLine({
          start: { x: edgeX, y: topY },
          end: { x: edgeX, y: bottomY },
          thickness: 0.5,
          color: rgb(0.9, 0.92, 0.96),
        });
      }

      cursorY = bottomY - 6;
    };

    type SignatureCardHelpers = {
      writeText: (
        lines: string | string[],
        options?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }
      ) => void;
      writeLabelValue: (label: string, value: string) => void;
      addSpacing: (units?: number) => void;
      drawSignatureUnderline: (label: string) => void;
      drawImageCentered: (image: PDFImage, width: number, height: number) => void;
      innerWidth: number;
    };

    const drawSignatureCard = async (
      title: string,
      height: number,
      render: (helpers: SignatureCardHelpers) => Promise<void> | void
    ) => {
      ensureSpace(height / lineHeight + 1.5);
      const cardTop = cursorY;
      const cardWidth = pageWidth - margin * 2;
      const radius = 12;
      const innerMargin = margin + 18;
      const innerWidth = cardWidth - 36;
      let innerCursorY = cardTop - 48;

      page.drawRectangle({
        x: margin,
        y: cardTop - height,
        width: cardWidth,
        height,
        color: rgb(0.99, 0.99, 1),
        borderColor: rgb(0.82, 0.86, 0.93),
        borderWidth: 1,
        borderRadius: radius,
      });

      page.drawText(title, {
        x: innerMargin,
        y: cardTop - 26,
        font: boldFont,
        size: 13,
        color: rgb(0.08, 0.28, 0.45),
      });

      const writeText = (
        text: string | string[],
        options?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }
      ) => {
        const lines = Array.isArray(text) ? text : [text];
        const font = options?.bold ? boldFont : bodyFont;
        const size = options?.size ?? 11;
        const color = options?.color ?? rgb(0.12, 0.13, 0.17);
        lines.forEach((line) => {
          page.drawText(line, {
            x: innerMargin,
            y: innerCursorY,
            font,
            size,
            color,
          });
          innerCursorY -= lineHeight;
        });
      };

      const writeLabelValue = (label: string, value: string) => {
        page.drawText(label, {
          x: innerMargin,
          y: innerCursorY,
          font: boldFont,
          size: 10.5,
          color: rgb(0.08, 0.28, 0.45),
        });
        page.drawText(value, {
          x: innerMargin + 170,
          y: innerCursorY,
          font: bodyFont,
          size: 10.5,
          color: rgb(0.15, 0.17, 0.2),
        });
        innerCursorY -= lineHeight;
      };

      const addSpacing = (units = 1) => {
        innerCursorY -= lineHeight * units;
      };

      const drawSignatureUnderline = (label: string) => {
        const underscores = "_".repeat(Math.max(Math.floor(innerWidth / 6), 18));
        page.drawText(underscores, {
          x: innerMargin,
          y: innerCursorY,
          font: bodyFont,
          size: 12,
          color: rgb(0.15, 0.17, 0.2),
        });
        page.drawText(label, {
          x: innerMargin,
          y: innerCursorY - 12,
          font: bodyFont,
          size: 10,
          color: rgb(0.32, 0.34, 0.4),
        });
        innerCursorY -= lineHeight * 2;
      };

      const drawImageCentered = (image: PDFImage, width: number, height: number) => {
        const x = innerMargin + Math.max(0, (innerWidth - width) / 2);
        const y = innerCursorY - height;
        page.drawImage(image, {
          x,
          y,
          width,
          height,
        });
        innerCursorY = y - 12;
      };

      await render({
        writeText,
        writeLabelValue,
        addSpacing,
        drawSignatureUnderline,
        drawImageCentered,
        innerWidth,
      });

      cursorY = cardTop - height - 16;
    };

    drawHeading("Registro de entrega de EPP");

    drawTextLines([
      `Código de entrega interno: ${data.id ?? "—"}`,
      `Fecha de entrega: ${formatDate(data.fechaEntrega)}`,
    ]);

    drawSectionTitle("Datos del trabajador");
    drawLabelValue("Nombre", data.trabajadorNombre);
    drawLabelValue("RUT", data.trabajadorRut);
    drawLabelValue("Cargo", data.trabajadorCargo || "—");
    drawLabelValue("Área", data.areaTrabajo || "—");
    drawLabelValue("Sub-área", data.subAreaTrabajo || "—");

    const tableColumns = [
      { title: "EPP", width: 280, wrap: 38 },
      { title: "Cantidad / Talla", width: 150, wrap: 24 },
      { title: "Recambio", width: 110, wrap: 16 },
    ] as const;

    drawTableHeader(tableColumns.map(({ title, width }) => ({ title, width })));

    for (const item of data.items) {
      drawTableRow(
        [
          { text: item.eppName, width: tableColumns[0].width, wrap: tableColumns[0].wrap },
          {
            text: `${item.cantidad} unidad(es)${item.talla ? ` · ${item.talla}` : ""}`,
            width: tableColumns[1].width,
            wrap: tableColumns[1].wrap,
          },
          {
            text: item.fechaRecambio ? formatDate(item.fechaRecambio) : "—",
            width: tableColumns[2].width,
            wrap: tableColumns[2].wrap,
          },
        ],
        { bold: false }
      );
      cursorY -= 6;
    }

    drawSectionTitle("Observaciones");
    const obsLines = wrapLines(data.observaciones?.trim() || "Sin observaciones", 100);
    drawTextLines(obsLines);

    drawSectionTitle("Declaraciones de capacitación");
    drawCheckbox(data.capacitacion.instruccionUso, "He sido instruido en el uso correcto de los EPP");
    drawCheckbox(data.capacitacion.conoceLimitaciones, "Conozco limitaciones y cuidados");
    drawCheckbox(data.capacitacion.recibioFolletos, "Recibí folletos informativos");
    drawCheckbox(
      data.capacitacion.declaracionAceptada,
      "Declaro conformidad con D.S. 44/2024"
    );

    await drawSignatureCard("Trabajador", 260, async ({
      writeLabelValue,
      addSpacing,
      writeText,
      drawImageCentered,
      drawSignatureUnderline,
    }) => {
      writeLabelValue("Nombre", data.trabajadorNombre);
      writeLabelValue("RUT", data.trabajadorRut);
      addSpacing(0.3);
      if (data.firmaTipo === "digital") {
        if (data.firmaDigitalDataUrl) {
          try {
            const signatureBytes = dataUrlToUint8Array(data.firmaDigitalDataUrl);
            const signatureImage = await pdfDoc.embedPng(signatureBytes);
            const maxWidth = 260;
            const maxHeight = 120;
            const widthScale = maxWidth / signatureImage.width;
            const heightScale = maxHeight / signatureImage.height;
            const scale = Math.min(widthScale, heightScale, 1);
            const dims = signatureImage.scale(scale);
            drawImageCentered(signatureImage, dims.width, dims.height);
          } catch (error) {
            console.error("No se pudo incrustar la firma digital en el PDF:", error);
            writeText("No se pudo incrustar la imagen de la firma digital.", {
              bold: true,
              color: rgb(0.62, 0.11, 0.11),
            });
          }
        } else {
          writeText("Firma digital no registrada.", {
            bold: true,
            color: rgb(0.4, 0.42, 0.48),
          });
        }

        addSpacing(0.5);
        writeText(
          [
            `Hash (SHA-256): ${data.firmaDigitalHash ?? "—"}`,
            `Token: ${data.firmaDigitalToken ?? "—"}`,
            `Fecha-hora firma: ${formatDateTime(data.firmaDigitalTimestamp)}`,
          ],
          { size: 10 }
        );
      } else {
        writeText(
          "Firma manual: el trabajador firmará sobre el documento físico entregado.",
          {
            bold: true,
            color: rgb(0.3, 0.22, 0.15),
          }
        );
        addSpacing(0.5);
        writeText(
          "No se generan hash ni token digitales para esta entrega.",
          {
            size: 10,
            color: rgb(0.36, 0.27, 0.18),
          }
        );
      }

      addSpacing(0.5);
      drawSignatureUnderline("Firma trabajador");
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `entrega-epp-${data.id ?? data.trabajadorRut}-${Date.now()}.pdf`;
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
          id: editingId ?? (result.id ?? null),
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

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-mint-200/70 bg-mint-50/70 p-4 sm:p-5 text-left shadow-sm transition hover:border-mint-300 hover:bg-mint-100/70 hover:shadow-lg dark:border-dracula-green/30 dark:bg-dracula-current dark:hover:border-dracula-green/50 dark:hover:bg-dracula-green/10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-mint-400 dark:text-dracula-green">
              Entregas registradas
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-dracula-foreground">
              {integerFormatter.format(overallSummary.total)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
              Movimientos totales almacenados en el historial.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-mint-500 dark:text-dracula-green">
              <List className="h-3.5 w-3.5" />
              Ver historial completo
            </p>
          </div>
          <div className="rounded-3xl border border-celeste-200/70 bg-celeste-50/70 p-4 sm:p-5 text-left shadow-sm transition hover:border-celeste-300 hover:bg-celeste-100/70 hover:shadow-lg dark:border-dracula-cyan/30 dark:bg-dracula-current dark:hover:border-dracula-cyan/50 dark:hover:bg-dracula-cyan/10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-celeste-400 dark:text-dracula-cyan">
              Trabajadores con entregas
            </p>
            <p className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-dracula-foreground">
              {integerFormatter.format(overallSummary.uniqueWorkers)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-dracula-comment">
              Colaboradores con al menos una asignación registrada.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-celeste-500 dark:text-dracula-cyan">
              <Users className="h-3.5 w-3.5" />
              Ver detalle por trabajador
            </p>
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
              {integerFormatter.format(overallSummary.manual)} entregas con firma manual.
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
              Promedio por entrega: {currency.format(overallSummary.average || 0)}.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-purple-500 dark:text-dracula-purple">
              <BarChart3 className="h-3.5 w-3.5" />
              Ver análisis económico
            </p>
          </div>
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

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-soft-gray-200/70 bg-soft-gray-50/80 px-4 py-4 text-sm text-slate-600 dark:border-dracula-current dark:bg-dracula-current/30 dark:text-dracula-comment sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 flex-shrink-0 text-celeste-400" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-celeste-400">
                Resumen filtrado
              </p>
              <p className="text-base font-semibold text-slate-800 dark:text-dracula-foreground">
                {filteredEntregas.length} entregas · {currency.format(totalFiltrado)}
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
                          const worker = trabajadores.find((t) => t.id === value) ?? null;
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
                              fechaRecambio: item.fechaRecambio || event.target.value,
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
                          {formState.trabajadorCargo || selectedTrabajador.cargo || "Sin cargo"}
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
                        !item.eppId || (epp?.multiSize && !item.variantId) || maxCantidad === 0;
                      const showNoStockAlert = Boolean(
                        item.eppId && maxCantidad !== null && maxCantidad <= 0
                      );

                      return (
                        <div
                          key={item.tempId}
                          className="grid grid-cols-1 gap-3 rounded-2xl border border-soft-gray-200/70 bg-white/90 p-4 shadow-sm dark:border-dracula-current dark:bg-dracula-current/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]"
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
                    Declaro haber recibido los Elementos de Protección Personal antes descritos, adecuados a los riesgos de mi labor, conforme a la evaluación de riesgos. He recibido instrucción teórica y práctica sobre su uso, mantenimiento, limitaciones y sustitución, conforme al D.S. 44/2024 y D.S. 594/1999.
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
                      <span>🧑‍🏫 He sido instruido en el uso correcto de los EPP.</span>
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
                      <span>🛡️ Comprendo las limitaciones y cuidados de cada elemento.</span>
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
                      <span>📄 Recibí los folletos informativos de cada EPP.</span>
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
                      <span>✅ Declaro haber recibido la capacitación conforme al D.S. 44/2024.</span>
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
                          <p className={`mt-1 text-xs font-medium ${signatureStatusInfo.toneClass}`}>
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
                                {formatDateTime(formState.firmaDigitalTimestamp)}
                              </p>
                            </div>
                          )}
                          <p className="mt-3 text-[11px] text-slate-400 dark:text-dracula-comment">
                            La firma digital queda asociada a esta entrega con sello de tiempo y hash. Asegúrate de guardarla antes de enviar.
                          </p>
                        </>
                      ) : (
                        <div className="mt-4 space-y-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-700 dark:border-amber-300/60 dark:bg-amber-300/10 dark:text-amber-200">
                          <p className="font-semibold">Firma manual seleccionada.</p>
                          <p className="text-xs">
                            El trabajador firmará el documento impreso. No se generarán sello de tiempo ni hash digitales para esta entrega.
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
                            <span>
                              Generar PDF al guardar (opcional)
                            </span>
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
    </div>
  );
}
