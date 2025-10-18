import { useMemo } from "react";

import { useAuth } from "../context/AuthContext";
import { useCompanyMembers } from "./useCompanyMembers";
import { createDefaultCompanySettings, type AccessModule, type AccessRole } from "../types/company";

type AccessCapabilities = {
  role: AccessRole;
  modules: AccessModule[];
  moduleSet: Set<AccessModule>;
  canAccessModule: (module: AccessModule) => boolean;
  canManageModule: (module: AccessModule) => boolean;
  isReadOnly: boolean;
};

export function useAccessControl(): AccessCapabilities {
  const { user } = useAuth();
  const { members } = useCompanyMembers();

  const roleDefaults = useMemo(
    () => createDefaultCompanySettings().access.roleDefaults,
    []
  );

  const normalizedEmail = user?.email?.toLowerCase() ?? null;

  const activeMember = useMemo(() => {
    if (!normalizedEmail) {
      return undefined;
    }
    return members.find(
      (member) => member.email.toLowerCase() === normalizedEmail
    );
  }, [members, normalizedEmail]);

  const resolvedRole: AccessRole = activeMember?.role ?? "Administrador";

  const modules = useMemo<AccessModule[]>(() => {
    return activeMember?.modules ?? roleDefaults[resolvedRole] ?? [];
  }, [activeMember, resolvedRole, roleDefaults]);

  const moduleSet = useMemo(() => new Set(modules), [modules]);

  const canAccessModule = (module: AccessModule) => moduleSet.has(module);

  const canManageModule = (module: AccessModule) => {
    if (!moduleSet.has(module)) {
      return false;
    }
    if (resolvedRole === "Lector") {
      return false;
    }
    return true;
  };

  const isReadOnly = resolvedRole === "Lector";

  return {
    role: resolvedRole,
    modules,
    moduleSet,
    canAccessModule,
    canManageModule,
    isReadOnly,
  };
}
