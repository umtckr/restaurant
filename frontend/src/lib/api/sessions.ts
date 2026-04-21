import { apiFetch, formatApiError, unwrapPaged } from "./http";

export type DiningSessionStatus = "open" | "closed";

export type DiningSession = {
  id: string;
  location: string;
  location_name: string;
  organization_name: string;
  table: string;
  table_label: string;
  token: string;
  status: DiningSessionStatus;
  closed_at: string | null;
  closed_by: number | null;
  created_at: string;
  updated_at: string;
};

export type ListSessionsParams = {
  location?: string;
  status?: DiningSessionStatus;
  page?: number;
};

export async function listDiningSessions(
  params?: ListSessionsParams,
): Promise<
  { ok: true; paged: import("./http").Paged<DiningSession> } | { ok: false; message: string }
> {
  const sp = new URLSearchParams();
  if (params?.location) sp.set("location", params.location);
  if (params?.status) sp.set("status", params.status);
  if (params?.page) sp.set("page", String(params.page));
  const q = sp.toString();
  const res = await apiFetch(`dining-sessions/${q ? `?${q}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, paged: unwrapPaged<DiningSession>(data) };
}

export async function getDiningSession(
  id: string,
): Promise<{ ok: true; session: DiningSession } | { ok: false; message: string }> {
  const res = await apiFetch(`dining-sessions/${id}/`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, session: data as DiningSession };
}

export async function openDiningSession(
  tableId: string,
): Promise<{ ok: true; session: DiningSession } | { ok: false; message: string }> {
  const res = await apiFetch("dining-sessions/open/", {
    method: "POST",
    body: JSON.stringify({ table_id: tableId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, session: data as DiningSession };
}

export async function closeDiningSession(
  id: string,
): Promise<{ ok: true; session: DiningSession } | { ok: false; message: string }> {
  const res = await apiFetch(`dining-sessions/${id}/close/`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, session: data as DiningSession };
}
