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
import type { CompanySettings } from "../types/company";
import { createDefaultCompanySettings } from "../types/company";

interface UseCompanySettingsState {
  data: CompanySettings | null;
  loading: boolean;
  error: string | null;
  save: (settings: CompanySettings) => Promise<void>;
}

const COLLECTION = "companySettings";
const DOCUMENT_ID = "primary";

export function useCompanySettings(): UseCompanySettingsState {
  const [data, setData] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const docRef = useMemo<DocumentReference>(() => doc(db, COLLECTION, DOCUMENT_ID), []);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    let isMounted = true;

    const initialize = async () => {
      try {
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
          const defaults = createDefaultCompanySettings();
          await setDoc(docRef, defaults);
        } else {
          const currentData = snapshot.data() as CompanySettings;
          if (isMounted) {
            setData(currentData);
          }
        }

        unsubscribe = onSnapshot(
          docRef,
          (snap) => {
            if (!snap.exists()) {
              return;
            }
            const settings = snap.data() as CompanySettings;
            if (isMounted) {
              setData(settings);
              setError(null);
              setLoading(false);
            }
          },
          (snapError) => {
            console.error("Error al escuchar configuraciones:", snapError);
            if (isMounted) {
              setError("No se pudieron cargar las configuraciones de la empresa.");
              setLoading(false);
            }
          },
        );

        if (isMounted) {
          setLoading(false);
        }
      } catch (initializationError) {
        console.error("Error al inicializar configuraciones:", initializationError);
        if (isMounted) {
          setError("No se pudieron cargar las configuraciones de la empresa.");
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [docRef]);

  const save = useCallback(
    async (settings: CompanySettings) => {
      try {
        await setDoc(docRef, settings, { merge: true });
      } catch (saveError) {
        console.error("Error al guardar configuraciones:", saveError);
        throw saveError;
      }
    },
    [docRef],
  );

  return {
    data,
    loading,
    error,
    save,
  };
}
