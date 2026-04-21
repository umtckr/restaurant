import { apiUrl } from "./client";

export type TokenPair = {
  access: string;
  refresh: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  account_type?: "customer" | "organization";
  organization_name?: string;
  organization_slug?: string;
};

/** Flatten DRF / SimpleJWT error payloads into a single message. */
export function formatAuthError(data: unknown): string {
  if (data == null || typeof data !== "object") {
    return "Something went wrong. Please try again.";
  }
  const d = data as Record<string, unknown>;

  if (typeof d.detail === "string") {
    return d.detail;
  }

  if (Array.isArray(d.non_field_errors) && d.non_field_errors.length) {
    return String(d.non_field_errors[0]);
  }

  const parts: string[] = [];
  for (const [key, val] of Object.entries(d)) {
    if (key === "detail") continue;
    if (Array.isArray(val) && val.length) {
      parts.push(`${key}: ${String(val[0])}`);
    } else if (typeof val === "string") {
      parts.push(`${key}: ${val}`);
    }
  }
  if (parts.length) return parts.join(" ");

  return "Something went wrong. Please try again.";
}

/** Field-level errors from DRF validation (e.g. register). */
export function parseFieldErrors(data: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (data == null || typeof data !== "object") return out;
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (key === "detail") continue;
    if (Array.isArray(val) && val[0] != null) {
      out[key] = String(val[0]);
    } else if (typeof val === "string") {
      out[key] = val;
    }
  }
  return out;
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ ok: true; tokens: TokenPair } | { ok: false; message: string }> {
  const res = await fetch(apiUrl("auth/token/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, message: formatAuthError(data) };
  }
  const tokens = data as TokenPair;
  if (!tokens.access || !tokens.refresh) {
    return { ok: false, message: "Invalid response from server." };
  }
  return { ok: true, tokens };
}

export async function registerAccount(
  payload: RegisterPayload,
): Promise<
  | { ok: true; body: unknown }
  | { ok: false; fieldErrors: Record<string, string>; message?: string }
> {
  const res = await fetch(apiUrl("auth/register/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      first_name: payload.first_name,
      last_name: payload.last_name,
      phone: payload.phone ?? "",
      account_type: payload.account_type ?? "customer",
      organization_name: payload.organization_name ?? "",
      organization_slug: payload.organization_slug ?? "",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fieldErrors = parseFieldErrors(data);
    const message =
      Object.keys(fieldErrors).length === 0 ? formatAuthError(data) : undefined;
    return { ok: false, fieldErrors, message };
  }
  return { ok: true, body: data };
}

export async function obtainTokenPair(
  email: string,
  password: string,
): Promise<TokenPair | null> {
  const result = await loginWithPassword(email, password);
  return result.ok ? result.tokens : null;
}
