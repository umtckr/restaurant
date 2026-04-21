import { apiUrl } from "./client";

export type GuestSession = {
  id: string;
  location_id: string;
  location_name: string;
  organization_name: string;
  organization_logo: string;
  organization_color: string;
  table_label: string;
  status: "open" | "closed";
  token: string;
  currency_code: string;
  tip_mode: "off" | "suggested" | "customer_enters";
  tip_presets_percent: number[];
};

export type GuestModifier = {
  id: string;
  name: string;
  price_delta: string;
  sort_order: number;
};

export type GuestMenuItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string | null;
  is_available: boolean;
  sort_order: number;
  modifiers: GuestModifier[];
};

export type GuestCategory = {
  id: string;
  name: string;
  sort_order: number;
  items: GuestMenuItem[];
};

export type GuestMenu = {
  id: string;
  name: string;
  organization: string;
  categories: GuestCategory[];
};

export async function getSessionByToken(
  token: string,
): Promise<{ ok: true; session: GuestSession } | { ok: false; status: number }> {
  const res = await fetch(apiUrl(`dining-sessions/by-token/${token}`));
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, session: (await res.json()) as GuestSession };
}

export async function getPublicMenu(
  locationId: string,
): Promise<{ ok: true; menu: GuestMenu } | { ok: false; message: string }> {
  const res = await fetch(apiUrl(`menus/public/${locationId}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: (data as { detail?: string }).detail ?? "Menu not found" };
  return { ok: true, menu: data as GuestMenu };
}

export type GuestOrderLine = {
  menu_item: string;
  quantity: number;
  modifiers?: string[];
};

export type GuestOrder = {
  id: string;
  status: string;
  total: string;
  discount_amount: string;
  discount_code: string | null;
  notes: string;
  lines: {
    id: string;
    name_snapshot: string;
    unit_price: string;
    quantity: number;
    line_subtotal: string;
  }[];
  created_at: string;
};

export async function createGuestOrder(body: {
  session_token: string;
  lines: GuestOrderLine[];
  guest_email?: string;
  guest_phone?: string;
  tip_amount?: number;
  notes?: string;
}): Promise<{ ok: true; order: GuestOrder } | { ok: false; message: string }> {
  const res = await fetch(apiUrl("orders/customer-create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: (data as { detail?: string }).detail ?? "Order failed" };
  return { ok: true, order: data as GuestOrder };
}

export async function getGuestOrders(
  sessionToken: string,
): Promise<{ ok: true; orders: GuestOrder[] } | { ok: false; message: string }> {
  const res = await fetch(apiUrl(`orders/guest?session_token=${sessionToken}`));
  const data = await res.json().catch(() => []);
  if (!res.ok) return { ok: false, message: "Could not load orders" };
  return { ok: true, orders: data as GuestOrder[] };
}

export async function validateGuestDiscount(body: {
  session_token: string;
  code: string;
}): Promise<
  | { ok: true; discount: { code: string; discount_type: string; value: string; description: string } }
  | { ok: false; message: string }
> {
  const res = await fetch(apiUrl("discounts/guest-validate/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, message: (data as { detail?: string }).detail ?? "Request failed" };
  }
  const d = data as {
    valid?: boolean;
    detail?: string;
    code?: string;
    discount_type?: string;
    value?: string;
    description?: string;
  };
  if (d.valid === false) {
    return { ok: false, message: d.detail ?? "Invalid discount" };
  }
  if (d.valid === true && d.code && d.discount_type != null && d.value != null) {
    return {
      ok: true,
      discount: {
        code: d.code,
        discount_type: d.discount_type,
        value: d.value,
        description: typeof d.description === "string" ? d.description : "",
      },
    };
  }
  return { ok: false, message: "Unexpected response" };
}

export async function createCustomerRequest(body: {
  session_token: string;
  request_type: "waiter" | "bill" | "other";
  note?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiUrl("customer-requests/customer-create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, message: (data as { detail?: string }).detail ?? "Request failed" };
  }
  return { ok: true };
}
