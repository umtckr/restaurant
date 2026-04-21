import { apiFetch, formatApiError, unwrapPaged } from "./http";

export type StaffRole = "org_admin" | "manager" | "waiter" | "kitchen" | "host";

export type StaffAssignment = {
  id: string;
  user: number;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  organization: string;
  location: string | null;
  location_name: string;
  role: StaffRole;
  created_at: string;
  updated_at: string;
};

export type Shift = {
  id: string;
  user: number;
  location: string;
  starts_at: string;
  ends_at: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export const SINGLE_LOCATION_ROLES: StaffRole[] = ["waiter", "kitchen", "host"];

export async function listStaffAssignments(params?: {
  organization?: string;
  location?: string;
  user?: number;
  page?: number;
}): Promise<
  { ok: true; paged: import("./http").Paged<StaffAssignment> } | { ok: false; message: string }
> {
  const sp = new URLSearchParams();
  if (params?.organization) sp.set("organization", params.organization);
  if (params?.location) sp.set("location", params.location);
  if (params?.user) sp.set("user", String(params.user));
  if (params?.page) sp.set("page", String(params.page));
  const q = sp.toString();
  const res = await apiFetch(`staff-assignments/${q ? `?${q}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, paged: unwrapPaged<StaffAssignment>(data) };
}

export async function createStaffAssignment(body: {
  user: number;
  organization: string;
  location?: string | null;
  role: StaffRole;
}): Promise<{ ok: true; row: StaffAssignment } | { ok: false; message: string }> {
  const res = await apiFetch("staff-assignments/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, row: data as StaffAssignment };
}

export async function patchStaffAssignment(
  id: string,
  body: Partial<{ location: string | null; role: StaffRole }>,
): Promise<{ ok: true; row: StaffAssignment } | { ok: false; message: string }> {
  const res = await apiFetch(`staff-assignments/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, row: data as StaffAssignment };
}

export async function deleteStaffAssignment(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(`staff-assignments/${id}/`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}

export async function reassignStaff(
  assignmentId: string,
  locationId: string,
): Promise<{ ok: true; row: StaffAssignment } | { ok: false; message: string }> {
  const res = await apiFetch(`staff-assignments/${assignmentId}/reassign/`, {
    method: "POST",
    body: JSON.stringify({ location: locationId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, row: data as StaffAssignment };
}

export async function setStaffLocations(body: {
  user: number;
  organization: string;
  locations: string[];
}): Promise<{ ok: true; assignments: StaffAssignment[] } | { ok: false; message: string }> {
  const res = await apiFetch("staff-assignments/set-locations/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, assignments: data as StaffAssignment[] };
}

export async function listShifts(params?: {
  location?: string;
  user?: number;
  page?: number;
}): Promise<{ ok: true; paged: import("./http").Paged<Shift> } | { ok: false; message: string }> {
  const sp = new URLSearchParams();
  if (params?.location) sp.set("location", params.location);
  if (params?.user) sp.set("user", String(params.user));
  if (params?.page) sp.set("page", String(params.page));
  const q = sp.toString();
  const res = await apiFetch(`shifts/${q ? `?${q}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, paged: unwrapPaged<Shift>(data) };
}

export async function createShift(body: {
  user: number;
  location: string;
  starts_at: string;
  ends_at: string;
  notes?: string;
}): Promise<{ ok: true; shift: Shift } | { ok: false; message: string }> {
  const res = await apiFetch("shifts/", { method: "POST", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, shift: data as Shift };
}

export async function patchShift(
  id: string,
  body: Partial<{ starts_at: string; ends_at: string; notes: string }>,
): Promise<{ ok: true; shift: Shift } | { ok: false; message: string }> {
  const res = await apiFetch(`shifts/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, shift: data as Shift };
}

export async function deleteShift(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(`shifts/${id}/`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}

export async function createStaffMember(body: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role: StaffRole;
  organization?: string;
  location?: string;
  locations?: string[];
}): Promise<{ ok: true; member: { user: number; user_email: string; organization: string; role: StaffRole; locations: string[] } } | { ok: false; message: string }> {
  const res = await apiFetch("staff-members/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, member: data as { user: number; user_email: string; organization: string; role: StaffRole; locations: string[] } };
}

export async function updateStaffMember(body: {
  user_id: number;
  first_name?: string;
  last_name?: string;
  role?: StaffRole;
  password?: string;
}): Promise<
  | { ok: true; data: { user_id: number; email: string; first_name: string; last_name: string; role: StaffRole } }
  | { ok: false; message: string }
> {
  const res = await apiFetch("staff-members/", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, data: data as { user_id: number; email: string; first_name: string; last_name: string; role: StaffRole } };
}

export async function removeStaffMember(
  userId: number,
): Promise<{ ok: true; userDeactivated: boolean } | { ok: false; message: string }> {
  const res = await apiFetch("staff-members/", {
    method: "DELETE",
    body: JSON.stringify({ user_id: userId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, userDeactivated: (data as { user_deactivated?: boolean }).user_deactivated ?? false };
}
