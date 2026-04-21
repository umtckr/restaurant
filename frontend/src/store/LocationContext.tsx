"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { listLocations, type Location } from "@/lib/api/locations";

type LocationCtx = {
  locations: Location[];
  locationId: string;
  setLocationId: (id: string) => void;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const Ctx = createContext<LocationCtx>({
  locations: [],
  locationId: "",
  setLocationId: () => {},
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useLocationCtx() {
  return useContext(Ctx);
}

const STORAGE_KEY = "tl_active_location";

export function LocationProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationIdRaw] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setLocationId = useCallback((id: string) => {
    setLocationIdRaw(id);
    try {
      sessionStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const r = await listLocations();
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setLocations(r.items);
    setLocationIdRaw((prev) => {
      if (prev && r.items.some((l) => l.id === prev)) return prev;
      let stored = "";
      try {
        stored = sessionStorage.getItem(STORAGE_KEY) ?? "";
      } catch {}
      if (stored && r.items.some((l) => l.id === stored)) return stored;
      return r.items[0]?.id ?? "";
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Ctx.Provider
      value={{ locations, locationId, setLocationId, loading, error, refresh: load }}
    >
      {children}
    </Ctx.Provider>
  );
}
