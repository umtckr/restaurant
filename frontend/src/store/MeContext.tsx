"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { fetchMe, type MeUser } from "@/lib/api/me";
import { logout } from "@/lib/auth/session";

type MeCtx = {
  me: MeUser | null;
  loading: boolean;
  hasRole: (...roles: string[]) => boolean;
  hasRoleForLocation: (locationId: string, ...roles: string[]) => boolean;
};

const Ctx = createContext<MeCtx>({
  me: null,
  loading: true,
  hasRole: () => false,
  hasRoleForLocation: () => false,
});

export function useMe() {
  return useContext(Ctx);
}

export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    void (async () => {
      const result = await fetchMe();
      if (cancelledRef.current) return;
      if (!result.ok) {
        logout();
        return;
      }
      setMe(result.user);
      setLoading(false);
    })();
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!me) return false;
      if (me.is_platform_admin) return true;
      const roleSet = new Set(roles);
      return me.organization_memberships.some((m) => roleSet.has(m.role));
    },
    [me],
  );

  const hasRoleForLocation = useCallback(
    (locationId: string, ...roles: string[]) => {
      if (!me) return false;
      if (me.is_platform_admin) return true;
      const roleSet = new Set(roles);
      const memberships = me.organization_memberships;
      if (memberships.some((m) => m.location_id === locationId && roleSet.has(m.role)))
        return true;
      return memberships.some(
        (m) =>
          m.location_id === null &&
          (m.role === "org_admin" || m.role === "manager") &&
          roleSet.has(m.role),
      );
    },
    [me],
  );

  return (
    <Ctx.Provider value={{ me, loading, hasRole, hasRoleForLocation }}>
      {children}
    </Ctx.Provider>
  );
}
