import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  type CollectionReference,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { createDefaultCompanySettings, type AccessMember, type AccessModule, type AccessRole } from "../types/company";

const COLLECTION = "companyMembers";

interface UseCompanyMembersResult {
  members: AccessMember[];
  loading: boolean;
  error: string | null;
  inviteMember: (params: {
    email: string;
    displayName?: string;
    role: AccessRole;
    modules?: AccessModule[];
    invitedBy?: string;
  }) => Promise<void>;
  updateMemberRole: (params: {
    id: string;
    role: AccessRole;
    modules?: AccessModule[];
  }) => Promise<void>;
  updateMemberModules: (params: {
    id: string;
    modules: AccessModule[];
  }) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
}

const membersCollection = collection(db, COLLECTION) as CollectionReference<DocumentData>;

export function useCompanyMembers(): UseCompanyMembersResult {
  const [members, setMembers] = useState<AccessMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    let isMounted = true;

    const listenMembers = () => {
      try {
        unsubscribe = onSnapshot(
          membersCollection,
          (snapshot) => {
            if (!isMounted) {
              return;
            }
            const nextMembers: AccessMember[] = snapshot.docs.map((docSnapshot) => {
              const data = docSnapshot.data();
              return {
                id: docSnapshot.id,
                displayName: data.displayName ?? "",
                email: data.email ?? "",
                role: data.role,
                modules: data.modules ?? [],
                invitedBy: data.invitedBy ?? "",
                invitedAt: data.invitedAt ?? new Date().toISOString(),
              } satisfies AccessMember;
            });
            setMembers(nextMembers);
            setLoading(false);
            setError(null);
          },
          (listenError) => {
            console.error("Error al escuchar miembros de la empresa:", listenError);
            if (isMounted) {
              setError("No se pudieron cargar los usuarios.");
              setLoading(false);
            }
          }
        );
      } catch (listenError) {
        console.error("Error al inicializar miembros:", listenError);
        if (isMounted) {
          setError("No se pudieron cargar los usuarios.");
          setLoading(false);
        }
      }
    };

    listenMembers();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const defaults = useMemo(() => createDefaultCompanySettings().access.roleDefaults, []);

  const inviteMember = useCallback<UseCompanyMembersResult["inviteMember"]>(
    async ({ email, displayName, role, modules, invitedBy }) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error("El correo del nuevo miembro es obligatorio.");
      }
      const defaultModules = modules ?? defaults[role] ?? [];
      await addDoc(membersCollection, {
        displayName: displayName?.trim() ?? normalizedEmail.split("@")[0],
        email: normalizedEmail,
        role,
        modules: defaultModules,
        invitedBy: invitedBy ?? "Administrador",
        invitedAt: new Date().toISOString(),
      });
    },
    [defaults]
  );

  const updateMemberRole = useCallback<UseCompanyMembersResult["updateMemberRole"]>(
    async ({ id, role, modules }) => {
      const memberDoc = doc(db, COLLECTION, id);
      const fallbackModules = modules ?? defaults[role] ?? [];
      await updateDoc(memberDoc, {
        role,
        modules: fallbackModules,
      });
    },
    [defaults]
  );

  const updateMemberModules = useCallback<UseCompanyMembersResult["updateMemberModules"]>(
    async ({ id, modules }) => {
      const memberDoc = doc(db, COLLECTION, id);
      await updateDoc(memberDoc, {
        modules,
      });
    },
    []
  );

  const removeMember = useCallback<UseCompanyMembersResult["removeMember"]>(async (id) => {
    const memberDoc = doc(db, COLLECTION, id);
    await deleteDoc(memberDoc);
  }, []);

  return {
    members,
    loading,
    error,
    inviteMember,
    updateMemberRole,
    updateMemberModules,
    removeMember,
  };
}
