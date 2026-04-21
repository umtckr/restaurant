import { apiUrl } from "./client";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token") ?? sessionStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token") ?? sessionStorage.getItem("refresh_token");
}

function storeAccessToken(token: string) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("refresh_token")) {
    localStorage.setItem("access_token", token);
  } else {
    sessionStorage.setItem("access_token", token);
  }
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(apiUrl("auth/token/refresh/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) {
        clearTokens();
        return false;
      }
      const data = (await res.json()) as { access?: string };
      if (data.access) {
        storeAccessToken(data.access);
        return true;
      }
      clearTokens();
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export type ApiErrorBody = Record<string, unknown> & { detail?: unknown };

export function formatApiError(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed";
  const d = data as ApiErrorBody;
  if (typeof d.detail === "string") return d.detail;
  if (Array.isArray(d.detail)) return d.detail.map(String).join(" ");
  const parts: string[] = [];
  for (const [k, v] of Object.entries(d)) {
    if (k === "detail") continue;
    if (Array.isArray(v) && v[0]) parts.push(`${k}: ${String(v[0])}`);
    else if (typeof v === "string") parts.push(`${k}: ${v}`);
  }
  if (parts.length) return parts.join(" ");
  if (typeof d.code === "string") return d.code;
  return "Request failed";
}

async function rawFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body != null && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(apiUrl(path), { ...init, headers });
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  let res = await rawFetch(path, init);
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await rawFetch(path, init);
    } else if (typeof window !== "undefined" && !path.includes("auth/token")) {
      clearTokens();
      window.location.href = "/login?expired=1";
    }
  }
  return res;
}

/** DRF may return a paginated envelope or a raw array. */
export function unwrapResults<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results: T[] }).results)
  ) {
    return (data as { results: T[] }).results;
  }
  return [];
}

export type Paged<T> = {
  items: T[];
  count: number;
  next: string | null;
  previous: string | null;
};

/** Prefer when you need total count / pagination links from DRF. */
export function unwrapPaged<T>(data: unknown): Paged<T> {
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results: T[] }).results)
  ) {
    const d = data as {
      results: T[];
      count?: number;
      next?: string | null;
      previous?: string | null;
    };
    return {
      items: d.results,
      count: typeof d.count === "number" ? d.count : d.results.length,
      next: d.next ?? null,
      previous: d.previous ?? null,
    };
  }
  const items = unwrapResults<T>(data);
  return { items, count: items.length, next: null, previous: null };
}
