import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  type Transaction,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export type CapacitacionChecklist = {
  instruccionUso: boolean;
  conoceLimitaciones: boolean;
  recibioFolletos: boolean;
  declaracionAceptada: boolean;
};

export type EntregaItem = {
  eppId: string;
  eppName: string;
  brand?: string | null;
  model?: string | null;
  variantId?: string | null;
  talla?: string | null;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  fechaRecambio?: string | null;
};

export type Entrega = {
  id: string;
  trabajadorId: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  trabajadorCargo: string;
  areaTrabajo: string;
  subAreaTrabajo: string;
  fechaEntrega: Date;
  firmaFecha: string;
  firmaHora: string;
  firmaDigitalToken?: string | null;
  firmaDigitalHash?: string | null;
  firmaDigitalDataUrl?: string | null;
  firmaDigitalTimestamp?: string | null;
  firmaResponsableToken?: string | null;
  firmaResponsableHash?: string | null;
  firmaResponsableDataUrl?: string | null;
  firmaResponsableTimestamp?: string | null;
  firmaTipo: "digital" | "manual";
  observaciones: string;
  capacitacion: CapacitacionChecklist;
  items: EntregaItem[];
  totalEntrega: number;
  autorizadoPorUid: string;
  autorizadoPorNombre: string;
  autorizadoPorEmail?: string;
  createdAt: Date;
  updatedAt: Date;
};

type FirestoreEntrega = Omit<
  Entrega,
  "id" | "fechaEntrega" | "items" | "createdAt" | "updatedAt"
> & {
  fechaEntrega: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  items: EntregaItem[];
};

export type CreateEntregaInput = {
  trabajadorId: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  trabajadorCargo: string;
  areaTrabajo: string;
  subAreaTrabajo: string;
  fechaEntrega: Date;
  firmaFecha: string;
  firmaHora: string;
  firmaDigitalToken?: string | null;
  firmaDigitalHash?: string | null;
  firmaDigitalDataUrl?: string | null;
  firmaDigitalTimestamp?: string | null;
  firmaResponsableToken?: string | null;
  firmaResponsableHash?: string | null;
  firmaResponsableDataUrl?: string | null;
  firmaResponsableTimestamp?: string | null;
  firmaTipo: "digital" | "manual";
  observaciones: string;
  capacitacion: CapacitacionChecklist;
  items: EntregaItem[];
  autorizadoPorUid: string;
  autorizadoPorNombre: string;
  autorizadoPorEmail?: string;
};

type UpdateEntregaInput = CreateEntregaInput;

type FirestoreEppVariant = {
  id: string;
  label: string;
  stockActual: number;
  stockMinimo: number;
  stockCritico: number;
};

type FirestoreEppDoc = {
  multiSize: boolean;
  stockActual?: number;
  sizeVariants?: FirestoreEppVariant[];
};

type Adjustment = {
  variantId?: string | null;
  delta: number;
};

export type EntregaMutationResult =
  | { success: true; id?: string }
  | { success: false; error: string };

const entregasCollection = collection(db, "entregas");

const calculateItemsTotals = (items: EntregaItem[]): EntregaItem[] =>
  items.map((item) => ({
    ...item,
    subtotal: Number(item.cantidad) * Number(item.costoUnitario),
  }));

const calculateTotalEntrega = (items: EntregaItem[]): number =>
  items.reduce((sum, item) => sum + item.subtotal, 0);

const ensurePositiveNumber = (value: number) => (Number.isFinite(value) ? value : 0);

const ensureDate = (value: Date | undefined, fallback = new Date()): Date =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? value : fallback;

function applySingleSizeAdjustment(
  transaction: Transaction,
  eppRef: ReturnType<typeof doc>,
  snapshotData: FirestoreEppDoc,
  delta: number,
  timestamp: Timestamp
) {
  const currentStock = ensurePositiveNumber(snapshotData.stockActual ?? 0);
  const nextStock = currentStock + delta;

  if (nextStock < 0) {
    throw new Error("Stock insuficiente para completar la entrega.");
  }

  transaction.update(eppRef, {
    stockActual: nextStock,
    updatedAt: timestamp,
  });
}

function applyMultiSizeAdjustments(
  transaction: Transaction,
  eppRef: ReturnType<typeof doc>,
  snapshotData: FirestoreEppDoc,
  adjustments: Adjustment[],
  timestamp: Timestamp
) {
  const variants = [...(snapshotData.sizeVariants ?? [])];

  adjustments.forEach(({ variantId, delta }) => {
    if (!variantId) {
      throw new Error("El identificador de talla es obligatorio para EPP con múltiples tallas.");
    }

    const index = variants.findIndex((variant) => variant.id === variantId);

    if (index === -1) {
      throw new Error("No se encontró la talla seleccionada en el inventario de EPP.");
    }

    const currentStock = ensurePositiveNumber(variants[index].stockActual);
    const nextStock = currentStock + delta;

    if (nextStock < 0) {
      throw new Error("Stock insuficiente para completar la entrega en la talla seleccionada.");
    }

    variants[index] = {
      ...variants[index],
      stockActual: nextStock,
    };
  });

  const aggregatedStock = variants.reduce((sum, variant) => sum + ensurePositiveNumber(variant.stockActual), 0);

  transaction.update(eppRef, {
    sizeVariants: variants,
    stockActual: aggregatedStock,
    updatedAt: timestamp,
  });
}

function groupAdjustmentsByEpp(
  previousItems: EntregaItem[],
  nextItems: EntregaItem[]
): Map<string, Adjustment[]> {
  const accumulator = new Map<string, Adjustment>();

  const register = (item: EntregaItem, delta: number) => {
    const key = `${item.eppId}::${item.variantId ?? "__default"}`;
    const current = accumulator.get(key);

    if (current) {
      accumulator.set(key, {
        ...current,
        delta: current.delta + delta,
      });
    } else {
      accumulator.set(key, {
        variantId: item.variantId ?? null,
        delta,
      });
    }
  };

  previousItems.forEach((item) => register(item, item.cantidad));
  nextItems.forEach((item) => register(item, -item.cantidad));

  const perEpp = new Map<string, Adjustment[]>();

  accumulator.forEach((adjustment, key) => {
    if (adjustment.delta === 0) return;
    const [eppId] = key.split("::");
    const entry = perEpp.get(eppId) ?? [];
    entry.push(adjustment);
    perEpp.set(eppId, entry);
  });

  return perEpp;
}

export function useEppEntregasFirestore() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(entregasCollection, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Entrega[] = snapshot.docs.map((entregaDoc) => {
          const raw = entregaDoc.data() as FirestoreEntrega;
          const safeItems = calculateItemsTotals(raw.items ?? []);

          return {
            id: entregaDoc.id,
            trabajadorId: raw.trabajadorId,
            trabajadorNombre: raw.trabajadorNombre,
            trabajadorRut: raw.trabajadorRut,
            trabajadorCargo: raw.trabajadorCargo ?? "",
            areaTrabajo: raw.areaTrabajo,
            subAreaTrabajo: raw.subAreaTrabajo,
            fechaEntrega: ensureDate(raw.fechaEntrega?.toDate()),
            firmaFecha: raw.firmaFecha ?? "",
            firmaHora: raw.firmaHora ?? "",
            firmaDigitalToken: raw.firmaDigitalToken ?? null,
            firmaDigitalHash: raw.firmaDigitalHash ?? null,
            firmaDigitalDataUrl: raw.firmaDigitalDataUrl ?? null,
            firmaDigitalTimestamp: raw.firmaDigitalTimestamp ?? null,
            firmaResponsableToken: raw.firmaResponsableToken ?? null,
            firmaResponsableHash: raw.firmaResponsableHash ?? null,
            firmaResponsableDataUrl: raw.firmaResponsableDataUrl ?? null,
            firmaResponsableTimestamp: raw.firmaResponsableTimestamp ?? null,
            firmaTipo: (raw as { firmaTipo?: "digital" | "manual" }).firmaTipo ?? "digital",
            observaciones: raw.observaciones ?? "",
            capacitacion: {
              instruccionUso: raw.capacitacion?.instruccionUso ?? false,
              conoceLimitaciones: raw.capacitacion?.conoceLimitaciones ?? false,
              recibioFolletos: raw.capacitacion?.recibioFolletos ?? false,
              declaracionAceptada: raw.capacitacion?.declaracionAceptada ?? false,
            },
            items: safeItems,
            totalEntrega: calculateTotalEntrega(safeItems),
            autorizadoPorUid: raw.autorizadoPorUid,
            autorizadoPorNombre: raw.autorizadoPorNombre,
            autorizadoPorEmail: raw.autorizadoPorEmail,
            createdAt: ensureDate(raw.createdAt?.toDate()),
            updatedAt: ensureDate(raw.updatedAt?.toDate()),
          };
        });

        setEntregas(data);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Error al obtener entregas de EPP:", snapshotError);
        setError("No se pudieron cargar las entregas.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addEntrega = async (input: CreateEntregaInput): Promise<EntregaMutationResult> => {
    const items = calculateItemsTotals(input.items);

    if (items.length === 0) {
      return { success: false, error: "Debes agregar al menos un EPP a la entrega." };
    }

    const entregaRef = doc(entregasCollection);
    const totalEntrega = calculateTotalEntrega(items);
    const now = Timestamp.now();
    const fechaEntrega = Timestamp.fromDate(input.fechaEntrega);
    const adjustments = groupAdjustmentsByEpp([], items);

    try {
      await runTransaction(db, async (transaction) => {
        const stockTimestamp = Timestamp.now();
        const eppSnapshots = new Map<
          string,
          { ref: ReturnType<typeof doc>; data: FirestoreEppDoc }
        >();

        for (const eppId of adjustments.keys()) {
          const eppRef = doc(db, "epp", eppId);
          const eppSnap = await transaction.get(eppRef);

          if (!eppSnap.exists()) {
            throw new Error("No se encontró el EPP seleccionado.");
          }

          eppSnapshots.set(eppId, {
            ref: eppRef,
            data: eppSnap.data() as FirestoreEppDoc,
          });
        }

        for (const [eppId, adjustmentList] of adjustments.entries()) {
          const cached = eppSnapshots.get(eppId);
          if (!cached) continue;

          if (cached.data.multiSize) {
            applyMultiSizeAdjustments(
              transaction,
              cached.ref,
              cached.data,
              adjustmentList,
              stockTimestamp
            );
          } else {
            const delta = adjustmentList.reduce((sum, adjustment) => sum + adjustment.delta, 0);
            applySingleSizeAdjustment(transaction, cached.ref, cached.data, delta, stockTimestamp);
          }
        }

        transaction.set(entregaRef, {
          trabajadorId: input.trabajadorId,
          trabajadorNombre: input.trabajadorNombre,
          trabajadorRut: input.trabajadorRut,
          trabajadorCargo: input.trabajadorCargo,
          areaTrabajo: input.areaTrabajo,
          subAreaTrabajo: input.subAreaTrabajo,
          fechaEntrega,
          firmaFecha: input.firmaFecha,
          firmaHora: input.firmaHora,
          firmaDigitalToken: input.firmaDigitalToken ?? null,
          firmaDigitalHash: input.firmaDigitalHash ?? null,
          firmaDigitalDataUrl: input.firmaDigitalDataUrl ?? null,
          firmaDigitalTimestamp: input.firmaDigitalTimestamp ?? null,
          firmaResponsableToken: input.firmaResponsableToken ?? null,
          firmaResponsableHash: input.firmaResponsableHash ?? null,
          firmaResponsableDataUrl: input.firmaResponsableDataUrl ?? null,
          firmaResponsableTimestamp: input.firmaResponsableTimestamp ?? null,
          firmaTipo: input.firmaTipo,
          observaciones: input.observaciones,
          capacitacion: input.capacitacion,
          items,
          totalEntrega,
          autorizadoPorUid: input.autorizadoPorUid,
          autorizadoPorNombre: input.autorizadoPorNombre,
          autorizadoPorEmail: input.autorizadoPorEmail ?? null,
          createdAt: now,
          updatedAt: now,
        });
      });

      return { success: true, id: entregaRef.id };
    } catch (transactionError) {
      console.error("Error al registrar entrega:", transactionError);
      return {
        success: false,
        error:
          transactionError instanceof Error
            ? transactionError.message
            : "No se pudo registrar la entrega.",
      };
    }
  };

  const updateEntrega = async (
    id: string,
    input: UpdateEntregaInput
  ): Promise<EntregaMutationResult> => {
    const items = calculateItemsTotals(input.items);

    if (items.length === 0) {
      return { success: false, error: "Debes agregar al menos un EPP a la entrega." };
    }

    const entregaRef = doc(entregasCollection, id);
    const totalEntrega = calculateTotalEntrega(items);
    const now = Timestamp.now();
    const fechaEntrega = Timestamp.fromDate(input.fechaEntrega);

    try {
      await runTransaction(db, async (transaction) => {
        const entregaSnap = await transaction.get(entregaRef);

        if (!entregaSnap.exists()) {
          throw new Error("La entrega que intentas actualizar no existe.");
        }

        const existingData = entregaSnap.data() as FirestoreEntrega;
        const previousItems = calculateItemsTotals(existingData.items ?? []);
        const adjustments = groupAdjustmentsByEpp(previousItems, items);
        const stockTimestamp = Timestamp.now();
        const eppSnapshots = new Map<
          string,
          { ref: ReturnType<typeof doc>; data: FirestoreEppDoc }
        >();

        for (const eppId of adjustments.keys()) {
          const eppRef = doc(db, "epp", eppId);
          const eppSnap = await transaction.get(eppRef);

          if (!eppSnap.exists()) {
            throw new Error("No se encontró el EPP asociado a la entrega.");
          }

          eppSnapshots.set(eppId, {
            ref: eppRef,
            data: eppSnap.data() as FirestoreEppDoc,
          });
        }

        for (const [eppId, adjustmentList] of adjustments.entries()) {
          const cached = eppSnapshots.get(eppId);
          if (!cached) continue;

          if (cached.data.multiSize) {
            applyMultiSizeAdjustments(
              transaction,
              cached.ref,
              cached.data,
              adjustmentList,
              stockTimestamp
            );
          } else {
            const delta = adjustmentList.reduce((sum, adjustment) => sum + adjustment.delta, 0);
            applySingleSizeAdjustment(transaction, cached.ref, cached.data, delta, stockTimestamp);
          }
        }

        transaction.update(entregaRef, {
          trabajadorId: input.trabajadorId,
          trabajadorNombre: input.trabajadorNombre,
          trabajadorRut: input.trabajadorRut,
          trabajadorCargo: input.trabajadorCargo,
          areaTrabajo: input.areaTrabajo,
          subAreaTrabajo: input.subAreaTrabajo,
          fechaEntrega,
          firmaFecha: input.firmaFecha,
          firmaHora: input.firmaHora,
          observaciones: input.observaciones,
          capacitacion: input.capacitacion,
          items,
          totalEntrega,
          autorizadoPorUid: input.autorizadoPorUid,
          autorizadoPorNombre: input.autorizadoPorNombre,
          autorizadoPorEmail: input.autorizadoPorEmail ?? null,
          updatedAt: now,
        });
      });

      return { success: true };
    } catch (transactionError) {
      console.error("Error al actualizar entrega:", transactionError);
      return {
        success: false,
        error:
          transactionError instanceof Error
            ? transactionError.message
            : "No se pudo actualizar la entrega.",
      };
    }
  };

  const deleteEntrega = async (id: string): Promise<EntregaMutationResult> => {
    const entregaRef = doc(entregasCollection, id);

    try {
      await runTransaction(db, async (transaction) => {
        const entregaSnap = await transaction.get(entregaRef);

        if (!entregaSnap.exists()) {
          throw new Error("La entrega que intentas eliminar no existe.");
        }

        const existingData = entregaSnap.data() as FirestoreEntrega;
        const previousItems = calculateItemsTotals(existingData.items ?? []);
        const adjustments = groupAdjustmentsByEpp(previousItems, []);
        const stockTimestamp = Timestamp.now();
        const eppSnapshots = new Map<
          string,
          { ref: ReturnType<typeof doc>; data: FirestoreEppDoc }
        >();

        for (const eppId of adjustments.keys()) {
          const eppRef = doc(db, "epp", eppId);
          const eppSnap = await transaction.get(eppRef);

          if (!eppSnap.exists()) {
            throw new Error("No se encontró el EPP asociado a la entrega.");
          }

          eppSnapshots.set(eppId, {
            ref: eppRef,
            data: eppSnap.data() as FirestoreEppDoc,
          });
        }

        for (const [eppId, adjustmentList] of adjustments.entries()) {
          const cached = eppSnapshots.get(eppId);
          if (!cached) continue;

          if (cached.data.multiSize) {
            applyMultiSizeAdjustments(
              transaction,
              cached.ref,
              cached.data,
              adjustmentList,
              stockTimestamp
            );
          } else {
            const delta = adjustmentList.reduce((sum, adjustment) => sum + adjustment.delta, 0);
            applySingleSizeAdjustment(transaction, cached.ref, cached.data, delta, stockTimestamp);
          }
        }

        transaction.delete(entregaRef);
      });

      return { success: true };
    } catch (transactionError) {
      console.error("Error al eliminar entrega:", transactionError);
      return {
        success: false,
        error:
          transactionError instanceof Error
            ? transactionError.message
            : "No se pudo eliminar la entrega.",
      };
    }
  };

  const resumenPorTrabajador = useMemo(() => {
    const grouped = new Map<string, number>();

    entregas.forEach((entrega) => {
      const totalPrevio = grouped.get(entrega.trabajadorId) ?? 0;
      grouped.set(entrega.trabajadorId, totalPrevio + entrega.totalEntrega);
    });

    return grouped;
  }, [entregas]);

  return {
    entregas,
    loading,
    error,
    addEntrega,
    updateEntrega,
    deleteEntrega,
    resumenPorTrabajador,
  };
}
