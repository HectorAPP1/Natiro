import { useCallback, useEffect, useMemo, useState } from "react";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type DocumentReference,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import type { RiskMatrixDocument, RiskMatrixRow } from "../types/riskMatrix";
import { DEFAULT_RISK_EVALUATION_CRITERIA } from "../constants/riskMatrix";

const COLLECTION = "riskMatrix";
const DOCUMENT_ID = "primary";

export const createDefaultRiskMatrixDocument = (): RiskMatrixDocument => {
  const now = new Date().toISOString();
  return {
    id: DOCUMENT_ID,
    header: {
      codigoIper: "",
      folioIper: "",
      rutEmpleador: "",
      nombreEmpresa: "",
      direccion: "",
      comuna: "",
      region: "",
      codigoActividadEconomica: "",
      nombreCentroTrabajo: "",
      direccionCentroTrabajo: "",
      jornadaCentroTrabajo: "",
      nTotalTrabajadores: 0,
      nTrabajadoras: 0,
      nTrabajadores: 0,
      fechaActualizacion: now,
      representanteLegal: "",
      nombreRevisor: "",
      nombreAprobador: "",
    },
    rows: [],
    criterios: DEFAULT_RISK_EVALUATION_CRITERIA.classification,
    createdAt: now,
    updatedAt: now,
    createdBy: "",
    updatedBy: "",
    reviewers: [],
  };
};

const normalizeRow = (row: RiskMatrixRow): RiskMatrixRow => {
  const controles = (row.controles ?? []).map((control) => ({
    ...control,
    id: control.id ?? crypto.randomUUID(),
  }));

  return {
    ...row,
    factorDeRiesgo: row.factorDeRiesgo.trim(),
    riesgo: row.riesgo.trim(),
    controles,
  };
};

const normalizeDocument = (doc: RiskMatrixDocument): RiskMatrixDocument => {
  const defaults = createDefaultRiskMatrixDocument();
  return {
    ...doc,
    header: doc.header ?? defaults.header,
    rows: (doc.rows ?? []).map((row) => normalizeRow(row)),
    criterios: doc.criterios ?? defaults.criterios,
  };
};

export interface UseRiskMatrixFirestoreState {
  data: RiskMatrixDocument | null;
  loading: boolean;
  error: string | null;
  save: (document: RiskMatrixDocument) => Promise<void>;
}

export const useRiskMatrixFirestore = (): UseRiskMatrixFirestoreState => {
  const [data, setData] = useState<RiskMatrixDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const docRef = useMemo<DocumentReference>(
    () => doc(db, COLLECTION, DOCUMENT_ID),
    []
  );

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    let mounted = true;

    const initialize = async () => {
      try {
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) {
          const defaults = createDefaultRiskMatrixDocument();
          await setDoc(docRef, defaults);
          if (mounted) {
            setData(defaults);
          }
        } else {
          const docData = snapshot.data() as RiskMatrixDocument;
          const normalized = normalizeDocument(docData);
          console.debug("useRiskMatrixFirestore: documento remoto", normalized);
          if (mounted) {
            setData(normalized);
          }
        }

        unsubscribe = onSnapshot(
          docRef,
          (snap) => {
            if (!snap.exists()) {
              return;
            }
            const liveData = snap.data() as RiskMatrixDocument;
            if (mounted) {
              setData(normalizeDocument(liveData));
              setError(null);
              setLoading(false);
            }
          },
          (snapError) => {
            console.error("Error al escuchar cambios en la matriz de riesgos:", snapError);
            if (mounted) {
              setError("No se pudo sincronizar la matriz de riesgos.");
              setLoading(false);
            }
          }
        );

        if (mounted) {
          setLoading(false);
        }
      } catch (initializationError) {
        console.error("Error al cargar la matriz de riesgos:", initializationError);
        if (mounted) {
          setError("No se pudo cargar la matriz de riesgos.");
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [docRef]);

  const save = useCallback(
    async (document: RiskMatrixDocument) => {
      try {
        const normalizedDoc = normalizeDocument(document);
        const sanitizedDoc = JSON.parse(JSON.stringify(normalizedDoc));
        if (!sanitizedDoc.rows || sanitizedDoc.rows.length === 0) {
          console.warn("Guardando matriz sin filas; revisa que se hayan agregado registros antes de guardar.");
        }
        console.debug("Guardando matriz de riesgos", sanitizedDoc);
        await setDoc(docRef, sanitizedDoc);
        setData(normalizedDoc);
      } catch (saveError) {
        console.error("Error al guardar la matriz de riesgos:", saveError);
        throw saveError;
      }
    },
    [docRef]
  );

  return {
    data,
    loading,
    error,
    save,
  };
};
