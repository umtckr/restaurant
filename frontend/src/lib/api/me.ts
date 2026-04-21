import { apiFetch, formatApiError } from "./http";

export type OnboardingStatus =
  | "pending_documents"
  | "pending_review"
  | "changes_requested"
  | "rejected"
  | "active";

export type OrganizationMembership = {
  organization_id: string;
  organization_name: string;
  onboarding_status: OnboardingStatus;
  role: string;
  location_id: string | null;
};

export type MeUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_platform_admin: boolean;
  organization_memberships: OrganizationMembership[];
};

export async function fetchMe(): Promise<{ ok: true; user: MeUser } | { ok: false; message: string }> {
  const res = await apiFetch("auth/me/");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  const u = data as MeUser & { organization_memberships?: MeUser["organization_memberships"] };
  return {
    ok: true,
    user: { ...u, organization_memberships: u.organization_memberships ?? [] },
  };
}

export async function patchMe(
  body: Partial<{ first_name: string; last_name: string; phone: string }>,
): Promise<{ ok: true; user: MeUser } | { ok: false; message: string }> {
  const res = await apiFetch("auth/me/", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, user: data as MeUser };
}

export async function changePassword(body: {
  current_password: string;
  new_password: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch("auth/me/change-password/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true };
}
