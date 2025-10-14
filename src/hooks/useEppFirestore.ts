import { useEffect, useState } from 'react'
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
  deleteField,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export type EppItem = {
  id: string
  eppId: string
  name: string
  category: string
  brand: string
  model: string
  price: number
  discontinued: boolean
  multiSize: boolean
  sizeVariants: {
    id: string
    label: string
    stockActual: number
    stockMinimo: number
    stockCritico: number
  }[]
  stockActual?: number
  stockMinimo?: number
  stockCritico?: number
  location: string
  certifications: string[]
  imageBase64?: string
  technicalSheetBase64?: string
  certificatesBase64?: string
  photoName?: string
  technicalSheetName?: string
  certificatesName?: string
  createdAt?: Date
  updatedAt?: Date
}

type FirestoreEppItem = Omit<EppItem, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp
  updatedAt: Timestamp
}

export function useEppFirestore() {
  const [items, setItems] = useState<EppItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Nota: Por ahora cargamos todos los EPP y filtramos en cliente
    // Para optimizar con muchos registros (>1000), considera:
    // 1. Paginación en servidor usando startAfter/limit
    // 2. Filtros en la query de Firestore (requiere índices compuestos)
    const q = query(collection(db, 'epp'), orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eppData: EppItem[] = snapshot.docs.map((doc) => {
          const data = doc.data() as FirestoreEppItem
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          }
        })
        setItems(eppData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching EPP:', err)
        setError('No se pudieron cargar los EPP. Verifica tu conexión.')
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  const addEpp = async (epp: Omit<EppItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = Timestamp.now()
      // Filtrar campos undefined para Firestore
      const cleanData = Object.fromEntries(
        Object.entries({
          ...epp,
          createdAt: now,
          updatedAt: now,
        }).filter(([_, value]) => value !== undefined)
      )
      await addDoc(collection(db, 'epp'), cleanData)
      return { success: true }
    } catch (err) {
      console.error('Error adding EPP:', err)
      return { success: false, error: 'No se pudo guardar el EPP.' }
    }
  }

  const updateEpp = async (id: string, updates: Partial<Omit<EppItem, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const eppRef = doc(db, 'epp', id)
      // Procesar campos: undefined se convierte en deleteField() para eliminar del documento
      const processedUpdates: Record<string, any> = {
        updatedAt: Timestamp.now(),
      }
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined) {
          // Marcar campo para eliminación en Firestore
          processedUpdates[key] = deleteField()
        } else {
          processedUpdates[key] = value
        }
      })
      
      await updateDoc(eppRef, processedUpdates)
      return { success: true }
    } catch (err) {
      console.error('Error updating EPP:', err)
      return { success: false, error: 'No se pudo actualizar el EPP.' }
    }
  }

  const deleteEpp = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'epp', id))
      return { success: true }
    } catch (err) {
      console.error('Error deleting EPP:', err)
      return { success: false, error: 'No se pudo eliminar el EPP.' }
    }
  }

  return {
    items,
    loading,
    error,
    addEpp,
    updateEpp,
    deleteEpp,
  }
}
