"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, FolderPlus, ImagePlus, Layers, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import { listLocations, type Location } from "@/lib/api/locations";
import {
  createCategory,
  createMenuItem,
  createMenuLocation,
  createModifier,
  deleteCategory,
  deleteMenuItem,
  deleteModifier,
  getMenu,
  listCategories,
  listMenuLocations,
  patchCategory,
  patchMenu,
  patchMenuItem,
  patchMenuLocation,
  type Category,
  type Menu,
  type MenuItem,
  type MenuItemModifier,
  type MenuLocation,
} from "@/lib/api/menus";
import { useMe } from "@/store/MeContext";
import s from "./MenuEditor.module.css";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function validateImage(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Only JPEG, PNG, WebP, and GIF images are allowed.";
  if (file.size > MAX_IMAGE_SIZE) return "Image must be under 5 MB.";
  return null;
}

function money(v: string | number) {
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type ModalMode =
  | { kind: "add"; categoryId: string }
  | { kind: "edit"; item: MenuItem };

type ToastState = { msg: string; err?: boolean } | null;

export function MenuEditorView() {
  const params = useParams();
  const menuId = typeof params?.menuId === "string" ? params.menuId : "";
  const { hasRole } = useMe();
  const canEdit = hasRole("org_admin", "manager");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuName, setMenuName] = useState("");
  const [savingMenu, setSavingMenu] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastState>(null);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalMode | null>(null);

  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [menuLocs, setMenuLocs] = useState<MenuLocation[]>([]);
  const [locBusy, setLocBusy] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const catInputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string, err = false) {
    setToast({ msg, err });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  const load = useCallback(async () => {
    if (!menuId) return;
    setLoading(true);
    setError(null);
    const [mr, cr, lr, mlr] = await Promise.all([
      getMenu(menuId),
      listCategories(menuId),
      listLocations(),
      listMenuLocations({ menu: menuId }),
    ]);
    if (!mr.ok) { setError(mr.message); setMenu(null); setLoading(false); return; }
    setMenu(mr.menu);
    setMenuName(mr.menu.name);
    setLoading(false);
    if (!cr.ok) { setError(cr.message); setCategories([]); return; }
    setCategories([...cr.items].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
    if (lr.ok) setAllLocations(lr.items);
    if (mlr.ok) setMenuLocs(mlr.items);
  }, [menuId]);

  const orgLocations = useMemo(() => {
    if (!menu) return [];
    return allLocations.filter((l) => l.organization === menu.organization);
  }, [allLocations, menu]);

  const menuLocMap = useMemo(() => {
    const m = new Map<string, MenuLocation>();
    for (const ml of menuLocs) m.set(ml.location, ml);
    return m;
  }, [menuLocs]);

  async function toggleLocation(locId: string) {
    if (!menuId) return;
    setLocBusy(locId);
    const existing = menuLocMap.get(locId);
    if (existing) {
      const r = await patchMenuLocation(existing.id, { is_active: !existing.is_active });
      if (!r.ok) { showToast(r.message, true); setLocBusy(null); return; }
      setMenuLocs((prev) =>
        prev.map((ml) => (ml.id === existing.id ? { ...ml, is_active: r.row.is_active } : ml)),
      );
    } else {
      const r = await createMenuLocation({ menu: menuId, location: locId, is_active: true });
      if (!r.ok) { showToast(r.message, true); setLocBusy(null); return; }
      setMenuLocs((prev) => [...prev, r.row]);
    }
    setLocBusy(null);
    showToast("Location assignment updated");
  }

  useEffect(() => { void load(); }, [load]);

  async function saveMenuMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!menuId || !menuName.trim()) return;
    setSavingMenu(true);
    const r = await patchMenu(menuId, { name: menuName.trim() });
    setSavingMenu(false);
    if (!r.ok) { showToast(r.message, true); return; }
    setMenu(r.menu);
    showToast("Menu name saved");
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!menuId || !newCat.trim()) return;
    const r = await createCategory({ menu: menuId, name: newCat.trim() });
    if (!r.ok) { showToast(r.message, true); return; }
    setNewCat("");
    showToast(`Category "${r.category.name}" added`);
    await load();
  }

  function startEditCat(cat: Category) {
    setEditingCat(cat.id);
    setEditingCatName(cat.name);
    setTimeout(() => catInputRef.current?.select(), 0);
  }

  async function saveEditCat(cat: Category) {
    setEditingCat(null);
    if (!editingCatName.trim() || editingCatName.trim() === cat.name) return;
    const r = await patchCategory(cat.id, { name: editingCatName.trim() });
    if (!r.ok) { showToast(r.message, true); return; }
    showToast("Category renamed");
    await load();
  }

  function requestDeleteCat(catId: string) {
    setConfirmDeleteCat(catId);
    clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmDeleteCat(null), 3500);
  }

  async function confirmRemoveCategory(cat: Category) {
    setConfirmDeleteCat(null);
    clearTimeout(confirmTimer.current);
    const r = await deleteCategory(cat.id);
    if (!r.ok) { showToast(r.message, true); return; }
    showToast("Category deleted");
    await load();
  }

  async function moveCat(cat: Category, direction: "up" | "down") {
    const idx = categories.findIndex((c) => c.id === cat.id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const other = categories[swapIdx];
    const catOrder = cat.sort_order;
    const otherOrder = other.sort_order;
    const sameOrder = catOrder === otherOrder;
    await Promise.all([
      patchCategory(cat.id, { sort_order: sameOrder ? otherOrder + (direction === "up" ? -1 : 1) : otherOrder }),
      patchCategory(other.id, { sort_order: sameOrder ? otherOrder : catOrder }),
    ]);
    showToast("Category reordered");
    await load();
  }

  function toggleCollapse(catId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  }

  async function toggleAvailability(item: MenuItem) {
    const r = await patchMenuItem(item.id, { is_available: !item.is_available });
    if (!r.ok) { showToast(r.message, true); return; }
    await load();
  }

  async function removeItem(item: MenuItem) {
    if (!window.confirm(`Remove "${item.name}"?`)) return;
    const r = await deleteMenuItem(item.id);
    if (!r.ok) { showToast(r.message, true); return; }
    showToast("Item removed");
    await load();
  }

  if (!menuId) {
    return <AdminInterior title="Menu" description=""><div className={s.error}>Invalid menu.</div></AdminInterior>;
  }
  if (loading && !menu) {
    return <AdminInterior title="Menu" description=""><div className={s.loading}>Loading…</div></AdminInterior>;
  }
  if (!menu) {
    return (
      <AdminInterior title="Menu" description="">
        <div className={s.error}>{error ?? "Not found"}</div>
        <Link href="/dashboard/menus" className={s.backLink}>← Menus</Link>
      </AdminInterior>
    );
  }

  return (
    <AdminInterior title={menu.name} description="Categories, items, pricing, images, and modifiers.">
      <div className={s.backRow}>
        <Link href="/dashboard/menus" className={s.backLink}>← Menus</Link>
        <span className={s.sep}>·</span>
        <Link href="/dashboard/menus/assignments" className={s.backLink}>Assignments</Link>
      </div>

      {error && <div className={s.error}>{error}</div>}

      {/* Menu name */}
      <form className={s.menuNameRow} onSubmit={saveMenuMeta}>
        <input
          className={s.menuNameInput}
          value={menuName}
          onChange={(e) => setMenuName(e.target.value)}
          placeholder="Menu name"
          readOnly={!canEdit}
        />
        {canEdit && (
          <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={savingMenu}>
            {savingMenu ? "Saving…" : "Save name"}
          </button>
        )}
      </form>

      {/* Location assignments */}
      {canEdit && orgLocations.length > 0 && (
        <div className={s.locSection}>
          <div className={s.locSectionHeader}>
            <MapPin size={14} />
            <span className={s.locSectionTitle}>Assigned locations</span>
          </div>
          <div className={s.locGrid}>
            {orgLocations.map((loc) => {
              const ml = menuLocMap.get(loc.id);
              const active = ml?.is_active ?? false;
              const busy = locBusy === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  className={`${s.locChip} ${active ? s.locChipActive : s.locChipInactive}`}
                  disabled={busy}
                  onClick={() => void toggleLocation(loc.id)}
                >
                  <span className={`${s.locDot} ${active ? s.locDotOn : ""}`} />
                  <span>{loc.name}</span>
                  {loc.city && <span className={s.locCity}>{loc.city}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length === 0 ? (
        <div className={s.emptyHero}>
          <Layers size={40} className={s.emptyIcon} />
          <p className={s.emptyTitle}>No categories yet</p>
          <p className={s.emptyDesc}>
            {canEdit ? "Categories organize your menu — e.g. Appetizers, Main Course, Desserts." : "No categories have been created for this menu."}
          </p>
          {canEdit && (
            <form className={s.emptyForm} onSubmit={addCategory}>
              <input
                className={s.addCatInputLg}
                placeholder="e.g. Appetizers"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                autoFocus
              />
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={!newCat.trim()}>
                <Plus size={16} /> Create first category
              </button>
            </form>
          )}
        </div>
      ) : (
        <>
        {/* Add category card */}
        {canEdit && (
          <form className={s.addCatCard} onSubmit={addCategory}>
            <FolderPlus size={18} className={s.addCatIcon} />
            <input
              className={s.addCatInputLg}
              placeholder="New category name"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
            />
            <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={!newCat.trim()}>
              <Plus size={14} /> Add
            </button>
          </form>
        )}

        {categories.map((cat, catIdx) => {
          const open = !collapsed.has(cat.id);
          const isEditing = editingCat === cat.id;
          const isConfirming = confirmDeleteCat === cat.id;
          return (
            <section key={cat.id} className={s.catSection}>
              <div className={s.catHeader} onClick={() => !isEditing && toggleCollapse(cat.id)}>
                <ChevronRight
                  size={16}
                  className={`${s.catChevron} ${open ? s.catChevronOpen : ""}`}
                />

                {isEditing ? (
                  <input
                    ref={catInputRef}
                    className={s.catNameInput}
                    value={editingCatName}
                    onChange={(e) => setEditingCatName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => void saveEditCat(cat)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); void saveEditCat(cat); }
                      if (e.key === "Escape") { setEditingCat(null); }
                    }}
                    autoFocus
                  />
                ) : (
                  <span className={s.catName}>{cat.name}</span>
                )}

                <span className={s.catCount}>
                  {cat.items.length} item{cat.items.length !== 1 ? "s" : ""}
                </span>

                {/* Reorder */}
                {canEdit && (
                  <div className={s.catOrderBtns} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={s.catOrderBtn}
                      disabled={catIdx === 0}
                      onClick={() => void moveCat(cat, "up")}
                      title="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className={s.catOrderBtn}
                      disabled={catIdx === categories.length - 1}
                      onClick={() => void moveCat(cat, "down")}
                      title="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                )}

                {/* Rename */}
                {canEdit && !isEditing && (
                  <button
                    type="button"
                    className={`${s.btnGhost} ${s.btnSm}`}
                    onClick={(e) => { e.stopPropagation(); startEditCat(cat); }}
                    title="Rename category"
                  >
                    <Pencil size={13} />
                  </button>
                )}

                {/* Delete (two-step) */}
                {canEdit && (isConfirming ? (
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnDanger} ${s.btnSm}`}
                    onClick={(e) => { e.stopPropagation(); void confirmRemoveCategory(cat); }}
                  >
                    Delete {cat.items.length > 0 ? `(${cat.items.length} items)` : ""}?
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${s.btnGhost} ${s.btnSm}`}
                    onClick={(e) => { e.stopPropagation(); requestDeleteCat(cat.id); }}
                    title="Delete category"
                  >
                    <Trash2 size={13} />
                  </button>
                ))}
              </div>

              {open && (
                <div className={s.catBody}>
                  {cat.items.length === 0 ? (
                    <div className={s.catEmpty}>No items in this category yet.</div>
                  ) : (
                    cat.items.map((item) => {
                      const unavailable = !item.is_available;
                      return (
                        <div
                          key={item.id}
                          className={`${s.itemCard} ${unavailable ? s.itemCardOff : ""}`}
                          onClick={canEdit ? () => setModal({ kind: "edit", item }) : undefined}
                          style={canEdit ? undefined : { cursor: "default" }}
                        >
                          {/* Image (display only) */}
                          <div className={s.itemImg}>
                            {item.image ? (
                              <img src={item.image} alt="" className={s.itemImgPreview} />
                            ) : (
                              <span className={s.itemImgAvatar}>
                                {item.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Body */}
                          <div className={s.itemBody}>
                            <div className={s.itemTop}>
                              <span className={s.itemNameText}>{item.name}</span>
                              <span className={s.itemPricePill}>{money(item.price)}</span>
                            </div>
                            {item.description && <p className={s.itemDesc}>{item.description}</p>}
                            <div className={s.itemBottom}>
                              <div className={s.itemBadges}>
                                {item.modifiers.length > 0 && (
                                  <span className={s.itemModBadge}>
                                    {item.modifiers.length} modifier{item.modifiers.length !== 1 ? "s" : ""}
                                  </span>
                                )}
                                {unavailable && (
                                  <span className={s.itemOffBadge}>Unavailable</span>
                                )}
                              </div>
                              {canEdit && (
                                <div className={s.itemActions}>
                                  <button
                                    type="button"
                                    className={`${s.itemToggle} ${item.is_available ? s.itemToggleOn : ""}`}
                                    onClick={(e) => { e.stopPropagation(); void toggleAvailability(item); }}
                                    title={item.is_available ? "Available" : "Unavailable"}
                                  />
                                  <button
                                    type="button"
                                    className={s.itemActionBtn}
                                    onClick={(e) => { e.stopPropagation(); setModal({ kind: "edit", item }); }}
                                    title="Edit item"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className={`${s.itemActionBtn} ${s.itemActionDanger}`}
                                    onClick={(e) => { e.stopPropagation(); void removeItem(item); }}
                                    title="Delete item"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {canEdit && (
                    <button
                      type="button"
                      className={s.addItemBtn}
                      onClick={() => setModal({ kind: "add", categoryId: cat.id })}
                    >
                      <Plus size={16} /> Add item
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
        </>
      )}

      {/* Item modal */}
      {modal && (
        <ItemModal
          mode={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); void load(); }}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`${s.toast} ${toast.err ? s.toastError : ""}`}>{toast.msg}</div>
      )}
    </AdminInterior>
  );
}

/* ════════════════════════════════════════
   Item modal — add / edit with modifiers
   ════════════════════════════════════════ */

function ItemModal({
  mode,
  onClose,
  onSaved,
  showToast,
}: {
  mode: ModalMode;
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, err?: boolean) => void;
}) {
  const isEdit = mode.kind === "edit";
  const item = isEdit ? mode.item : null;

  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price ?? "0");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(item?.image ?? null);
  const [removeImg, setRemoveImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modifiers, setModifiers] = useState<MenuItemModifier[]>(item?.modifiers ?? []);
  const [newModName, setNewModName] = useState("");
  const [newModDelta, setNewModDelta] = useState("");
  const [modBusy, setModBusy] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  function handleImageSelect(file: File) {
    const err = validateImage(file);
    if (err) { showToast(err, true); return; }
    setImageFile(file);
    setRemoveImg(false);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!name.trim()) { showToast("Name is required", true); return; }
    setSaving(true);

    if (isEdit && item) {
      const patch: Record<string, unknown> = {};
      if (name.trim() !== item.name) patch.name = name.trim();
      if (description !== item.description) patch.description = description;
      if (price !== item.price) patch.price = price;
      if (imageFile) patch.image = imageFile;
      else if (removeImg && item.image) patch.image = null;

      if (Object.keys(patch).length > 0) {
        const r = await patchMenuItem(item.id, patch as Parameters<typeof patchMenuItem>[1]);
        if (!r.ok) { showToast(r.message, true); setSaving(false); return; }
      }
      showToast("Item updated");
    } else {
      const categoryId = mode.kind === "add" ? mode.categoryId : "";
      const r = await createMenuItem({
        category: categoryId,
        name: name.trim(),
        description: description || undefined,
        price: price || "0",
        image: imageFile ?? undefined,
      });
      if (!r.ok) { showToast(r.message, true); setSaving(false); return; }
      showToast(`"${name.trim()}" added`);
    }

    setSaving(false);
    onSaved();
  }

  async function addMod() {
    if (!newModName.trim() || !item) return;
    setModBusy(true);
    const r = await createModifier({
      menu_item: item.id,
      name: newModName.trim(),
      price_delta: newModDelta || "0",
    });
    setModBusy(false);
    if (!r.ok) { showToast(r.message, true); return; }
    setModifiers((prev) => [...prev, r.modifier]);
    setNewModName("");
    setNewModDelta("");
    showToast("Modifier added");
  }

  async function removeMod(modId: string) {
    const r = await deleteModifier(modId);
    if (!r.ok) { showToast(r.message, true); return; }
    setModifiers((prev) => prev.filter((m) => m.id !== modId));
    showToast("Modifier removed");
  }

  return (
    <div className={s.modalOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <h2 className={s.modalTitle}>{isEdit ? "Edit item" : "New item"}</h2>
          <button type="button" className={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={s.modalBody}>
          {/* Image */}
          <div className={s.field}>
            <span className={s.fieldLabel}>Image</span>
            <div
              className={s.dropZone}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleImageSelect(f);
              }}
            >
              {imagePreview && !removeImg ? (
                <>
                  <img src={imagePreview} alt="" className={s.dropZonePreview} />
                  <div className={s.dropZoneOverlay}>Change image</div>
                </>
              ) : (
                <>
                  <ImagePlus size={24} style={{ color: "var(--admin-text-subtle)" }} />
                  <span className={s.dropZoneText}>Click or drop image here</span>
                </>
              )}
            </div>
            {imagePreview && !removeImg && (
              <button
                type="button"
                className={`${s.btn} ${s.btnDanger} ${s.btnSm}`}
                style={{ alignSelf: "flex-start", marginTop: "0.35rem" }}
                onClick={() => { setRemoveImg(true); setImageFile(null); setImagePreview(null); }}
              >
                Remove image
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={s.hiddenInput}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageSelect(f);
                e.target.value = "";
              }}
            />
          </div>

          {/* Name + Price */}
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label className={s.fieldLabel}>Name *</label>
              <input
                className={s.fieldInput}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Caesar Salad"
                autoFocus
              />
            </div>
            <div className={s.field} style={{ maxWidth: "7rem" }}>
              <label className={s.fieldLabel}>Price</label>
              <input
                className={s.fieldInput}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>
          </div>

          {/* Description */}
          <div className={s.field}>
            <label className={s.fieldLabel}>Description</label>
            <textarea
              className={s.fieldTextarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description guests will see…"
              rows={3}
            />
          </div>

          {/* Modifiers (only in edit mode) */}
          {isEdit && item && (
            <div className={s.modSection}>
              <h3 className={s.modTitle}>Modifiers</h3>
              {modifiers.length > 0 && (
                <div className={s.modList}>
                  {modifiers.map((m) => (
                    <div key={m.id} className={s.modRow}>
                      <span className={s.modName}>{m.name}</span>
                      <span className={s.modDelta}>
                        {Number(m.price_delta) > 0 ? "+" : ""}{money(m.price_delta)}
                      </span>
                      <button
                        type="button"
                        className={s.btnGhost}
                        onClick={() => void removeMod(m.id)}
                        title="Remove modifier"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className={s.modAddRow}>
                <input
                  className={s.modAddInput}
                  placeholder="Modifier name"
                  value={newModName}
                  onChange={(e) => setNewModName(e.target.value)}
                  style={{ flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); void addMod(); }
                  }}
                />
                <input
                  className={s.modAddInput}
                  placeholder="+0.00"
                  value={newModDelta}
                  onChange={(e) => setNewModDelta(e.target.value)}
                  style={{ width: "5rem" }}
                  inputMode="decimal"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); void addMod(); }
                  }}
                />
                <button
                  type="button"
                  className={`${s.btn} ${s.btnSm}`}
                  onClick={() => void addMod()}
                  disabled={modBusy || !newModName.trim()}
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={s.modalFooter}>
          <button type="button" className={s.btn} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`${s.btn} ${s.btnPrimary}`}
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add item"}
          </button>
        </div>
      </div>
    </div>
  );
}
