import { apiFetch, formatApiError, unwrapResults } from "./http";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  onboarding_status: string;
  created_at: string;
  updated_at: string;
};

export async function listOrganizations(): Promise<
  { ok: true; items: Organization[] } | { ok: false; message: string }
> {
  const res = await apiFetch("organizations/");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, items: unwrapResults<Organization>(data) };
}

export async function getOrganization(
  id: string,
): Promise<{ ok: true; organization: Organization } | { ok: false; message: string }> {
  const res = await apiFetch(`organizations/${id}/`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, organization: data as Organization };
}

export async function createOrganization(body: {
  name: string;
  slug: string;
  is_active?: boolean;
}): Promise<{ ok: true; organization: Organization } | { ok: false; message: string }> {
  const res = await apiFetch("organizations/", { method: "POST", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, organization: data as Organization };
}

export async function patchOrganization(
  id: string,
  body: Partial<{ name: string; slug: string; is_active: boolean; onboarding_status: string }>,
): Promise<{ ok: true; organization: Organization } | { ok: false; message: string }> {
  const res = await apiFetch(`organizations/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, organization: data as Organization };
}

export async function deleteOrganization(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(`organizations/${id}/`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}
