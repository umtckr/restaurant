import { apiFetch, formatApiError, unwrapResults } from "./http";

export type TipMode = "off" | "suggested" | "customer_enters";
export type ServiceChargeApply = "off" | "dine_in" | "takeaway" | "delivery" | "all";

export type Location = {
  id: string;
  organization: string;
  name: string;
  slug: string;
  address_line1: string;
  address_line2: string;
  city: string;
  country: string;
  currency_code: string;
  timezone: string;
  is_active: boolean;
  tip_mode: TipMode;
  tip_presets_percent: number[];
  service_charge_enabled: boolean;
  service_charge_apply: ServiceChargeApply;
  service_charge_percent: string | null;
  tax_rate_percent: string;
  created_at: string;
  updated_at: string;
};

export type LocationWrite = {
  organization: string;
  name: string;
  slug: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  country?: string;
  timezone?: string;
  is_active?: boolean;
  tip_mode?: TipMode;
  tip_presets_percent?: number[];
  service_charge_enabled?: boolean;
  service_charge_apply?: ServiceChargeApply;
  service_charge_percent?: number | null;
  tax_rate_percent?: number | string;
};

export type Zone = {
  id: string;
  location: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Table = {
  id: string;
  location: string;
  zone: string | null;
  zone_name: string;
  label: string;
  capacity: number;
  sort_order: number;
  map_x: number | null;
  map_y: number | null;
  created_at: string;
  updated_at: string;
};

export async function listLocations(): Promise<
  { ok: true; items: Location[] } | { ok: false; message: string }
> {
  const res = await apiFetch("locations/");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, items: unwrapResults<Location>(data) };
}

export async function getLocation(id: string): Promise<
  { ok: true; location: Location } | { ok: false; message: string }
> {
  const res = await apiFetch(`locations/${id}/`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, location: data as Location };
}

export async function createLocation(
  body: LocationWrite,
): Promise<{ ok: true; location: Location } | { ok: false; message: string }> {
  const res = await apiFetch("locations/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, location: data as Location };
}

export async function patchLocation(
  id: string,
  body: Partial<LocationWrite>,
): Promise<{ ok: true; location: Location } | { ok: false; message: string }> {
  const res = await apiFetch(`locations/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, location: data as Location };
}

export async function deleteLocation(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(`locations/${id}/`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}

/* ── Zones ── */

export async function listZones(locationId: string): Promise<
  { ok: true; items: Zone[] } | { ok: false; message: string }
> {
  const res = await apiFetch(`zones/?location=${encodeURIComponent(locationId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, items: unwrapResults<Zone>(data) };
}

export async function createZone(body: {
  location: string;
  name: string;
  sort_order?: number;
}): Promise<{ ok: true; zone: Zone } | { ok: false; message: string }> {
  const res = await apiFetch("zones/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, zone: data as Zone };
}

export async function patchZone(
  id: string,
  body: Partial<{ name: string; sort_order: number }>,
): Promise<{ ok: true; zone: Zone } | { ok: false; message: string }> {
  const res = await apiFetch(`zones/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, zone: data as Zone };
}

export async function deleteZone(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(`zones/${id}/`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}

/* ── Tables ── */

export async function listTables(locationId: string): Promise<
  { ok: true; items: Table[] } | { ok: false; message: string }
> {
  const res = await apiFetch(`tables/?location=${encodeURIComponent(locationId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, items: unwrapResults<Table>(data) };
}

export async function createTable(body: {
  location: string;
  label: string;
  capacity?: number;
  sort_order?: number;
  zone?: string | null;
}): Promise<{ ok: true; table: Table } | { ok: false; message: string }> {
  const res = await apiFetch("tables/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, table: data as Table };
}

export async function patchTable(
  id: string,
  body: Partial<{ label: string; capacity: number; sort_order: number; zone: string | null }>,
): Promise<{ ok: true; table: Table } | { ok: false; message: string }> {
  const res = await apiFetch(`tables/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, table: data as Table };
}

export async function deleteTable(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(`tables/${id}/`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
