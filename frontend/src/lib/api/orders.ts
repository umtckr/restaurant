import { apiFetch, formatApiError, unwrapPaged, unwrapResults } from "./http";

export type OrderChannel = "dine_in" | "takeaway" | "delivery";

export type OrderStatus =
  | "draft"
  | "submitted"
  | "confirmed"
  | "in_kitchen"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export type OrderLine = {
  id: string;
  menu_item: string | null;
  name_snapshot: string;
  unit_price: string;
  quantity: number;
  modifiers_snapshot: unknown;
  line_subtotal: string;
  tax_snapshot: string;
};

export type Order = {
  id: string;
  organization: string;
  organization_name: string;
  location: string;
  location_name: string;
  dining_session: string | null;
  table_label: string | null;
  customer: number | null;
  customer_display: string | null;
  channel: OrderChannel;
  status: OrderStatus;
  guest_email: string;
  guest_phone: string;
  subtotal: string;
  tax_amount: string;
  service_charge_amount: string;
  tip_amount: string;
  total: string;
  discount: string | null;
  discount_amount: string;
  notes: string;
  items_count: number;
  lines: OrderLine[];
  created_at: string;
  updated_at: string;
};

export type DiscountType = "percentage" | "fixed";

export type Discount = {
  id: string;
  organization: string;
  code: string;
  description: string;
  discount_type: DiscountType;
  value: string;
  min_order_amount: string;
  max_discount_amount: string | null;
  max_uses: number | null;
  times_used: number;
  locations: string[];
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
};

export type BillSplitMethod = "equal" | "by_item" | "custom";

export type BillSplitPortion = {
  id: string;
  label: string;
  amount: string;
  is_paid: boolean;
  paid_at: string | null;
  payment: string | null;
  created_at: string;
};

export type BillSplit = {
  id: string;
  dining_session: string;
  method: BillSplitMethod;
  total_amount: string;
  num_guests: number;
  portions: BillSplitPortion[];
  created_at: string;
};

export type ReceiptData = {
  order_id: string;
  organization_name: string;
  location_name: string;
  location_address: string;
  table_label: string | null;
  channel: string;
  currency: string;
  items: {
    name: string;
    quantity: number;
    unit_price: string;
    subtotal: string;
    tax: string;
    modifiers: unknown;
  }[];
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  service_charge_amount: string;
  tip_amount: string;
  total: string;
  discount_code: string | null;
  notes: string;
  created_at: string;
  status: string;
};

export type ListOrdersParams = {
  location?: string;
  status?: OrderStatus;
  channel?: OrderChannel;
  dining_session?: string;
  page?: number;
};

export async function listOrders(
  params?: ListOrdersParams,
): Promise<{ ok: true; paged: import("./http").Paged<Order> } | { ok: false; message: string }> {
  const sp = new URLSearchParams();
  if (params?.location) sp.set("location", params.location);
  if (params?.status) sp.set("status", params.status);
  if (params?.channel) sp.set("channel", params.channel);
  if (params?.dining_session) sp.set("dining_session", params.dining_session);
  if (params?.page) sp.set("page", String(params.page));
  const q = sp.toString();
  const res = await apiFetch(`orders/${q ? `?${q}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, paged: unwrapPaged<Order>(data) };
}

const MAX_PAGES = 100;

/**
 * Fetch every page (PAGE_SIZE batches) for aggregations.
 * Caps at MAX_PAGES (100) to prevent runaway loops.
 * Returns `truncated: true` if the cap was hit before exhausting all pages.
 */
export async function listAllOrders(
  params?: Omit<ListOrdersParams, "page">,
): Promise<{ ok: true; items: Order[]; truncated: boolean } | { ok: false; message: string }> {
  const items: Order[] = [];
  let page = 1;
  for (;;) {
    const r = await listOrders({ ...params, page });
    if (!r.ok) return r;
    items.push(...r.paged.items);
    if (!r.paged.next || r.paged.items.length === 0) break;
    page += 1;
    if (page > MAX_PAGES) return { ok: true, items, truncated: true };
  }
  return { ok: true, items, truncated: false };
}

export async function getOrder(
  id: string,
): Promise<{ ok: true; order: Order } | { ok: false; message: string }> {
  const res = await apiFetch(`orders/${id}/`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, order: data as Order };
}

export async function patchOrder(
  id: string,
  body: Partial<{ status: OrderStatus; tip_amount: string | number }>,
): Promise<{ ok: true; order: Order } | { ok: false; message: string }> {
  const res = await apiFetch(`orders/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, order: data as Order };
}

export type OrderActivityLog = {
  id: string;
  order: string;
  old_status: string;
  new_status: string;
  changed_by: number | null;
  actor_label: string;
  note: string;
  created_at: string;
};

export async function listOrderActivityLogs(
  orderId: string,
): Promise<{ ok: true; logs: OrderActivityLog[] } | { ok: false; message: string }> {
  const res = await apiFetch(`orders/${orderId}/activity-logs/`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, logs: (Array.isArray(data) ? data : []) as OrderActivityLog[] };
}

export async function listCustomerRequests(
  diningSessionId?: string,
  params?: { status?: CustomerRequestStatus },
): Promise<
  { ok: true; items: CustomerRequest[] } | { ok: false; message: string }
> {
  const sp = new URLSearchParams();
  if (diningSessionId) sp.set("dining_session", diningSessionId);
  if (params?.status) sp.set("status", params.status);
  const q = sp.toString();
  const res = await apiFetch(`customer-requests/${q ? `?${q}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, items: unwrapResults<CustomerRequest>(data) };
}

export type CustomerRequestStatus = "open" | "acknowledged" | "done";

export type CustomerRequest = {
  id: string;
  dining_session: string;
  request_type: string;
  status: CustomerRequestStatus;
  note: string;
  table_label: string | null;
  session_total: string | null;
  created_at: string;
  updated_at: string;
};

export async function patchCustomerRequest(
  id: string,
  body: Partial<{ status: CustomerRequestStatus }>,
): Promise<{ ok: true; item: CustomerRequest } | { ok: false; message: string }> {
  const res = await apiFetch(`customer-requests/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, item: data as CustomerRequest };
}

// ---------------------------------------------------------------------------
// Discounts
// ---------------------------------------------------------------------------

export async function listDiscounts(
  params?: { organization?: string; is_active?: boolean },
): Promise<{ ok: true; paged: import("./http").Paged<Discount> } | { ok: false; message: string }> {
  const sp = new URLSearchParams();
  if (params?.organization) sp.set("organization", params.organization);
  if (params?.is_active !== undefined) sp.set("is_active", String(params.is_active));
  const q = sp.toString();
  const res = await apiFetch(`discounts/${q ? `?${q}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, paged: unwrapPaged<Discount>(data) };
}

export async function createDiscount(
  body: Partial<Discount> & {
    organization: string;
    code: string;
    discount_type: DiscountType;
    value: string | number;
  },
): Promise<{ ok: true; discount: Discount } | { ok: false; message: string }> {
  const res = await apiFetch("discounts/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, discount: data as Discount };
}

export async function patchDiscount(
  id: string,
  body: Partial<Discount>,
): Promise<{ ok: true; discount: Discount } | { ok: false; message: string }> {
  const res = await apiFetch(`discounts/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, discount: data as Discount };
}

export async function deleteDiscount(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(`discounts/${id}/`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}

export async function validateDiscount(body: {
  code: string;
  location: string;
  order_subtotal: string | number;
}): Promise<
  | {
      ok: true;
      discount_id: string;
      code: string;
      discount_type: string;
      value: string;
      calculated_amount: string;
    }
  | { ok: false; message: string }
> {
  const res = await apiFetch("discounts/validate/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  const d = data as {
    valid?: boolean;
    detail?: string;
    discount_id?: string;
    code?: string;
    discount_type?: string;
    value?: string;
    calculated_amount?: string;
  };
  if (d.valid === false) return { ok: false, message: d.detail ?? "Discount is not valid." };
  if (
    d.valid === true &&
    d.discount_id &&
    d.code &&
    d.discount_type != null &&
    d.value != null &&
    d.calculated_amount != null
  ) {
    return {
      ok: true,
      discount_id: d.discount_id,
      code: d.code,
      discount_type: d.discount_type,
      value: d.value,
      calculated_amount: d.calculated_amount,
    };
  }
  return { ok: false, message: formatApiError(data) };
}

// ---------------------------------------------------------------------------
// Bill splitting
// ---------------------------------------------------------------------------

export async function createBillSplit(body: {
  dining_session: string;
  method: BillSplitMethod;
  num_guests: number;
}): Promise<{ ok: true; bill_split: BillSplit } | { ok: false; message: string }> {
  const res = await apiFetch("bill-splits/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, bill_split: data as BillSplit };
}

export async function getBillSplit(
  id: string,
): Promise<{ ok: true; bill_split: BillSplit } | { ok: false; message: string }> {
  const res = await apiFetch(`bill-splits/${id}/`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, bill_split: data as BillSplit };
}

export async function listBillSplits(
  params?: { dining_session?: string },
): Promise<{ ok: true; paged: import("./http").Paged<BillSplit> } | { ok: false; message: string }> {
  const sp = new URLSearchParams();
  if (params?.dining_session) sp.set("dining_session", params.dining_session);
  const q = sp.toString();
  const res = await apiFetch(`bill-splits/${q ? `?${q}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, paged: unwrapPaged<BillSplit>(data) };
}

export async function markPortionPaid(
  billSplitId: string,
  portionId: string,
  paymentId?: string,
): Promise<{ ok: true; portion: BillSplitPortion } | { ok: false; message: string }> {
  const res = await apiFetch(`bill-splits/${billSplitId}/portions/${portionId}/mark-paid/`, {
    method: "POST",
    body: JSON.stringify(paymentId ? { payment_id: paymentId } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, portion: data as BillSplitPortion };
}

// ---------------------------------------------------------------------------
// Receipt & order discount
// ---------------------------------------------------------------------------

export async function getOrderReceipt(
  orderId: string,
): Promise<{ ok: true; receipt: ReceiptData } | { ok: false; message: string }> {
  const res = await apiFetch(`orders/${orderId}/receipt/`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, receipt: data as ReceiptData };
}

export async function applyDiscountToOrder(
  orderId: string,
  code: string,
): Promise<{ ok: true; order: Order } | { ok: false; message: string }> {
  const res = await apiFetch(`orders/${orderId}/`, {
    method: "PATCH",
    body: JSON.stringify({ discount_code: code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, order: data as Order };
}

export async function removeDiscountFromOrder(
  orderId: string,
): Promise<{ ok: true; order: Order } | { ok: false; message: string }> {
  const res = await apiFetch(`orders/${orderId}/`, {
    method: "PATCH",
    body: JSON.stringify({ discount_code: "" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, order: data as Order };
}
