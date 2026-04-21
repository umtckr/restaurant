import { apiFetch, formatApiError, unwrapPaged } from "./http";

export type PaymentMethod = "cash" | "card_terminal" | "online" | "other";
export type PaymentStatus = "pending" | "requires_action" | "completed" | "failed" | "refunded" | "partially_refunded";

export type PaymentAllocation = {
  id: string;
  order: string;
  amount: string;
};

export type Payment = {
  id: string;
  organization: string;
  location: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  gateway: string;
  session: string | null;
  received_by: number | null;
  notes: string;
  allocations: PaymentAllocation[];
  created_at: string;
  updated_at: string;
};

export async function listPayments(
  params?: { location?: string; status?: PaymentStatus; organization?: string; page?: number },
): Promise<{ ok: true; paged: import("./http").Paged<Payment> } | { ok: false; message: string }> {
  const sp = new URLSearchParams();
  if (params?.location) sp.set("location", params.location);
  if (params?.status) sp.set("status", params.status);
  if (params?.organization) sp.set("organization", params.organization);
  if (params?.page) sp.set("page", String(params.page));
  const q = sp.toString();
  const res = await apiFetch(`payments/${q ? `?${q}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, paged: unwrapPaged<Payment>(data) };
}

export async function getPayment(
  id: string,
): Promise<{ ok: true; payment: Payment } | { ok: false; message: string }> {
  const res = await apiFetch(`payments/${id}/`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, payment: data as Payment };
}

export async function createPayment(body: {
  location: string;
  amount: string | number;
  currency?: string;
  method?: PaymentMethod;
  session?: string;
  notes?: string;
  allocations: { order_id: string; amount: string | number }[];
  idempotency_key?: string;
}): Promise<{ ok: true; payment: Payment } | { ok: false; message: string }> {
  const res = await apiFetch("payments/stub-create/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, payment: data as Payment };
}
