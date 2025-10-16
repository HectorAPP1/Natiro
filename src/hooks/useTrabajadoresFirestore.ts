import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export type Trabajador = {
  id: string;
  nombre: string;
  rut: string;
  fechaNacimiento: string;
  sexo: "masculino" | "femenino" | "otro";
  cargo: string;
  areaTrabajo: string;
  subAreaTrabajo: string;
  nombreJefatura: string;
  fechaIngreso: string;
  tipoContrato: "indefinido" | "plazo_fijo" | "faena";
  fechaVencimientoContrato?: string;
  numeroEmergencia: string;
  nombreContactoEmergencia: string;
  enfermedadCronica: string; // "no" o descripción de la enfermedad
  alergias: string; // "no" o descripción de alergias
  alergiaCritica: boolean;
  
  // Campos adicionales HSE
  tallaCamisa: string;
  tallaPantalon: string;
  tallaCalzado: string;
  grupoSanguineo: string;
  induccionHSE: boolean;
  fechaInduccionHSE?: string;
  fechaUltimoExamen?: string;
  fechaProximoExamen?: string;
  restriccionesMedicas: string;
  mutualSeguridad: "ISL" | "Mutual_ChileSeguro" | "ACHS" | "otra";
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type TrabajadorFormData = Omit<Trabajador, "id" | "createdAt" | "updatedAt">;

export function useTrabajadoresFirestore() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "trabajadores"),
      orderBy("nombre", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const trabajadoresData: Trabajador[] = [];
        snapshot.forEach((doc) => {
          trabajadoresData.push({ id: doc.id, ...doc.data() } as Trabajador);
        });
        setTrabajadores(trabajadoresData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching trabajadores:", err);
        setError("Error al cargar los trabajadores");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addTrabajador = async (trabajadorData: TrabajadorFormData) => {
    try {
      const now = Timestamp.now();
      await addDoc(collection(db, "trabajadores"), {
        ...trabajadorData,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      console.error("Error adding trabajador:", err);
      throw new Error("Error al agregar trabajador");
    }
  };

  const updateTrabajador = async (id: string, trabajadorData: Partial<TrabajadorFormData>) => {
    try {
      const trabajadorRef = doc(db, "trabajadores", id);
      await updateDoc(trabajadorRef, {
        ...trabajadorData,
        updatedAt: Timestamp.now(),
      });
    } catch (err) {
      console.error("Error updating trabajador:", err);
      throw new Error("Error al actualizar trabajador");
    }
  };

  const deleteTrabajador = async (id: string) => {
    try {
      await deleteDoc(doc(db, "trabajadores", id));
    } catch (err) {
      console.error("Error deleting trabajador:", err);
      throw new Error("Error al eliminar trabajador");
    }
  };

  return {
    trabajadores,
    loading,
    error,
    addTrabajador,
    updateTrabajador,
    deleteTrabajador,
  };
}
