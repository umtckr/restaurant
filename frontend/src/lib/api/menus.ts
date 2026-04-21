import { apiFetch, formatApiError, unwrapPaged, unwrapResults } from "./http";

export type Menu = {
  id: string;
  organization: string;
  name: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type MenuLocation = {
  id: number | string;
  menu: string;
  location: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MenuItemModifier = {
  id: string;
  name: string;
  price_delta: string;
  sort_order: number;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string | null;
  is_available: boolean;
  sort_order: number;
  modifiers: MenuItemModifier[];
};

export type Category = {
  id: string;
  name: string;
  sort_order: number;
  items: MenuItem[];
};

export async function listMenus(params?: {
  organization?: string;
  is_archived?: boolean;
  page?: number;
}): Promise<{ ok: true; paged: import("./http").Paged<Menu> } | { ok: false; message: string }> {
  const sp = new URLSearchParams();
  if (params?.organization) sp.set("organization", params.organization);
  if (params?.is_archived !== undefined) sp.set("is_archived", String(params.is_archived));
  if (params?.page) sp.set("page", String(params.page));
  const q = sp.toString();
  const res = await apiFetch(`menus/${q ? `?${q}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, paged: unwrapPaged<Menu>(data) };
}

export async function getMenu(
  id: string,
): Promise<{ ok: true; menu: Menu } | { ok: false; message: string }> {
  const res = await apiFetch(`menus/${id}/`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, menu: data as Menu };
}

export async function createMenu(body: {
  organization: string;
  name: string;
  is_archived?: boolean;
}): Promise<{ ok: true; menu: Menu } | { ok: false; message: string }> {
  const res = await apiFetch("menus/", { method: "POST", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, menu: data as Menu };
}

export async function patchMenu(
  id: string,
  body: Partial<{ name: string; is_archived: boolean }>,
): Promise<{ ok: true; menu: Menu } | { ok: false; message: string }> {
  const res = await apiFetch(`menus/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, menu: data as Menu };
}

export async function deleteMenu(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(`menus/${id}/`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}

export async function listMenuLocations(params?: {
  menu?: string;
  location?: string;
}): Promise<{ ok: true; items: MenuLocation[] } | { ok: false; message: string }> {
  const sp = new URLSearchParams();
  if (params?.menu) sp.set("menu", params.menu);
  if (params?.location) sp.set("location", params.location);
  const q = sp.toString();
  const res = await apiFetch(`menu-locations/${q ? `?${q}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, items: unwrapResults<MenuLocation>(data) };
}

export async function createMenuLocation(body: {
  menu: string;
  location: string;
  is_active?: boolean;
}): Promise<{ ok: true; row: MenuLocation } | { ok: false; message: string }> {
  const res = await apiFetch("menu-locations/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, row: data as MenuLocation };
}

export async function patchMenuLocation(
  id: number | string,
  body: Partial<{ is_active: boolean }>,
): Promise<{ ok: true; row: MenuLocation } | { ok: false; message: string }> {
  const res = await apiFetch(`menu-locations/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, row: data as MenuLocation };
}

export async function listCategories(menuId: string): Promise<
  { ok: true; items: Category[] } | { ok: false; message: string }
> {
  const res = await apiFetch(`menu-categories/?menu=${encodeURIComponent(menuId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, items: unwrapResults<Category>(data) };
}

export async function createCategory(body: {
  menu: string;
  name: string;
  sort_order?: number;
}): Promise<{ ok: true; category: Category } | { ok: false; message: string }> {
  const res = await apiFetch("menu-categories/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, category: data as Category };
}

export async function patchCategory(
  id: string,
  body: Partial<{ name: string; sort_order: number }>,
): Promise<{ ok: true; category: Category } | { ok: false; message: string }> {
  const res = await apiFetch(`menu-categories/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, category: data as Category };
}

export async function deleteCategory(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(`menu-categories/${id}/`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}

export async function createMenuItem(body: {
  category: string;
  name: string;
  description?: string;
  price: string | number;
  image?: File;
  is_available?: boolean;
  sort_order?: number;
}): Promise<{ ok: true; item: MenuItem } | { ok: false; message: string }> {
  const fd = new FormData();
  fd.append("category", body.category);
  fd.append("name", body.name);
  if (body.description) fd.append("description", body.description);
  fd.append("price", String(body.price));
  if (body.image) fd.append("image", body.image);
  if (body.is_available !== undefined) fd.append("is_available", String(body.is_available));
  if (body.sort_order !== undefined) fd.append("sort_order", String(body.sort_order));
  const res = await apiFetch("menu-items/", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, item: data as MenuItem };
}

export async function patchMenuItem(
  id: string,
  body: Partial<{
    name: string;
    description: string;
    price: string | number;
    is_available: boolean;
    sort_order: number;
    image: File | null;
  }>,
): Promise<{ ok: true; item: MenuItem } | { ok: false; message: string }> {
  const hasImage = "image" in body;
  if (hasImage) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(body)) {
      if (k === "image") {
        if (v instanceof File) fd.append("image", v);
        else if (v === null) fd.append("image", "");
      } else if (v !== undefined) {
        fd.append(k, String(v));
      }
    }
    const res = await apiFetch(`menu-items/${id}/`, { method: "PATCH", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: formatApiError(data) };
    return { ok: true, item: data as MenuItem };
  }
  const res = await apiFetch(`menu-items/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, item: data as MenuItem };
}

export async function deleteMenuItem(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(`menu-items/${id}/`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}

export async function createModifier(body: {
  menu_item: string;
  name: string;
  price_delta?: string | number;
  sort_order?: number;
}): Promise<{ ok: true; modifier: MenuItemModifier } | { ok: false; message: string }> {
  const res = await apiFetch("menu-item-modifiers/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, modifier: data as MenuItemModifier };
}

export async function patchModifier(
  id: string,
  body: Partial<{ name: string; price_delta: string | number; sort_order: number }>,
): Promise<{ ok: true; modifier: MenuItemModifier } | { ok: false; message: string }> {
  const res = await apiFetch(`menu-item-modifiers/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, modifier: data as MenuItemModifier };
}

export async function deleteModifier(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(`menu-item-modifiers/${id}/`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}
