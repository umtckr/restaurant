"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChefHat,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  Clock,
  Hand,
  Link2Off,
  Minus,
  PackageCheck,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  X,
} from "lucide-react";

import {
  createCustomerRequest,
  createGuestOrder,
  getGuestOrders,
  getPublicMenu,
  getSessionByToken,
  type GuestCategory,
  type GuestMenuItem,
  type GuestModifier,
  type GuestOrder,
  type GuestSession,
} from "@/lib/api/guest";
import { useGuestSocket, type GuestEvent } from "@/lib/realtime/useGuestSocket";
import s from "./GuestSession.module.css";

/* ── Types ── */
type CartItem = {
  menuItem: GuestMenuItem;
  qty: number;
  selectedModifiers: string[];
  itemNote: string;
};

type Tab = "menu" | "orders";
type ToastKind = "success" | "error" | "info";

const ORDER_STEPS = ["in_kitchen", "ready", "served"] as const;
const STEP_LABELS = ["Preparing", "Ready", "Served"];

/* ── Helpers ── */
function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function badgeClass(status: string) {
  switch (status) {
    case "in_kitchen": case "preparing": return s.badgePreparing;
    case "ready": return s.badgeReady;
    case "served": case "delivered": return s.badgeServed;
    case "cancelled": return s.badgeCancelled;
    default: return s.badgePreparing;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "in_kitchen": return "Preparing";
    case "ready": return "Ready";
    case "served": return "Served";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(8);
  }
}

/* ═══════════════════════════════════════════════ */
export function GuestSessionView() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";

  /* ── State ── */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<GuestSession | null>(null);
  const [categories, setCategories] = useState<GuestCategory[]>([]);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [cartOpen, setCartOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("menu");
  const [orders, setOrders] = useState<GuestOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [customTipStr, setCustomTipStr] = useState("");

  const [detailItem, setDetailItem] = useState<GuestMenuItem | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [detailModifiers, setDetailModifiers] = useState<Set<string>>(new Set());
  const [detailNote, setDetailNote] = useState("");

  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const categoryNavRef = useRef<HTMLElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const currency = session?.currency_code ?? "TRY";
  const money = useCallback((v: string | number) => formatCurrency(typeof v === "string" ? Number(v) : v, currency), [currency]);

  const showToast = useCallback((msg: string, kind: ToastKind = "success") => {
    setToast({ msg, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── Brand color CSS variables ── */
  const brandStyle = useMemo(() => {
    const c = session?.organization_color;
    if (!c || !/^#[0-9a-fA-F]{6}$/.test(c)) return undefined;
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    const darker = `rgb(${Math.round(r * 0.8)},${Math.round(g * 0.8)},${Math.round(b * 0.8)})`;
    const lighter = `rgba(${r},${g},${b},0.08)`;
    return {
      "--accent": c,
      "--accent-dark": darker,
      "--accent-light": lighter,
    } as React.CSSProperties;
  }, [session?.organization_color]);

  /* ── WebSocket ── */
  const handleWs = useCallback((evt: GuestEvent) => {
    if (evt.type === "order.updated") {
      setOrders((prev) => prev.map((o) => o.id === evt.payload.order_id ? { ...o, status: evt.payload.status } : o));
      const nice = statusLabel(evt.payload.status);
      if (["ready", "served"].includes(evt.payload.status)) {
        showToast(`Your order is ${nice.toLowerCase()}!`, "success");
        haptic();
      }
    }
    if (evt.type === "session.updated" && evt.payload.status === "closed") {
      setSessionClosed(true);
    }
    if (evt.type === "customer_request.updated" && evt.payload.status === "acknowledged") {
      showToast("Staff acknowledged your request", "info");
    }
  }, [showToast]);

  useGuestSocket(token || null, handleWs, {
    onOpen: () => setWsConnected(true),
    onClose: () => setWsConnected(false),
  });

  /* ── Load session + menu ── */
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    const sr = await getSessionByToken(token);
    if (!sr.ok) {
      setError(sr.status === 404 ? "Session not found or already closed." : "Something went wrong.");
      setLoading(false);
      return;
    }
    setSession(sr.session);
    const mr = await getPublicMenu(sr.session.location_id);
    setLoading(false);
    if (!mr.ok) {
      setError(mr.message.toLowerCase().includes("no active menu") ? "No menu has been assigned to this location yet." : mr.message);
      return;
    }
    const cats = mr.menu.categories.filter((c) => c.items.length > 0).sort((a, b) => a.sort_order - b.sort_order);
    setCategories(cats);
    if (cats.length > 0) setActiveCategory((prev) => prev || cats[0].id);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  /* ── Load orders ── */
  const loadOrders = useCallback(async () => {
    if (!token) return;
    setOrdersLoading(true);
    const r = await getGuestOrders(token);
    setOrdersLoading(false);
    if (r.ok) setOrders(r.orders);
  }, [token]);

  useEffect(() => { if (tab === "orders") void loadOrders(); }, [tab, loadOrders]);

  /* ── Scroll spy ── */
  useEffect(() => {
    if (categories.length === 0) return;
    const observers: IntersectionObserver[] = [];
    categories.forEach((cat) => {
      const el = sectionRefs.current.get(cat.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveCategory(cat.id); },
        { threshold: 0.3, rootMargin: "-120px 0px -60% 0px" },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [categories]);

  useEffect(() => {
    if (!categoryNavRef.current || !activeCategory) return;
    const btn = categoryNavRef.current.querySelector(`[data-cat-id="${activeCategory}"]`);
    if (btn) btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeCategory]);

  /* ── Search ── */
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({ ...cat, items: cat.items.filter((i) => i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q)) }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, searchQuery]);

  /* ── Cart helpers ── */
  function cartKey(itemId: string, modifiers: string[]) {
    return [itemId, ...modifiers.slice().sort()].join("|");
  }

  function addFromSheet() {
    if (!detailItem) return;
    haptic();
    setCartBump(true);
    setTimeout(() => setCartBump(false), 250);
    const mods = Array.from(detailModifiers);
    const key = cartKey(detailItem.id, mods);
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);
      if (existing) next.set(key, { ...existing, qty: existing.qty + detailQty, itemNote: detailNote || existing.itemNote });
      else next.set(key, { menuItem: detailItem, qty: detailQty, selectedModifiers: mods, itemNote: detailNote });
      return next;
    });
    setDetailItem(null);
    showToast("Added to cart", "success");
  }

  function removeFromCart(key: string) {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);
      if (!existing) return prev;
      if (existing.qty <= 1) next.delete(key);
      else next.set(key, { ...existing, qty: existing.qty - 1 });
      return next;
    });
  }

  function addToCartByKey(key: string) {
    haptic();
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);
      if (!existing) return prev;
      next.set(key, { ...existing, qty: existing.qty + 1 });
      return next;
    });
  }

  const cartItems = useMemo(() => Array.from(cart.entries()).map(([k, v]) => ({ key: k, ...v })), [cart]);
  const cartCount = useMemo(() => cartItems.reduce((sum, i) => sum + i.qty, 0), [cartItems]);
  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, i) => {
      const modDelta = i.selectedModifiers.reduce((md, mid) => {
        const mod = i.menuItem.modifiers?.find((m) => m.id === mid);
        return md + (mod ? Number(mod.price_delta) : 0);
      }, 0);
      return sum + (Number(i.menuItem.price) + modDelta) * i.qty;
    }, 0),
    [cartItems],
  );

  const tipAmount = useMemo(() => {
    if (customTipStr) return Number(customTipStr) || 0;
    if (selectedTip !== null) return cartSubtotal * (selectedTip / 100);
    return 0;
  }, [cartSubtotal, selectedTip, customTipStr]);

  const cartGrandTotal = cartSubtotal + tipAmount;

  function getQty(itemId: string) {
    let total = 0;
    cart.forEach((v) => { if (v.menuItem.id === itemId) total += v.qty; });
    return total;
  }

  /* ── Item detail sheet ── */
  function openItemDetail(item: GuestMenuItem) {
    if (!item.is_available) return;
    setDetailItem(item);
    setDetailQty(1);
    setDetailModifiers(new Set());
    setDetailNote("");
  }

  function toggleModifier(modId: string) {
    setDetailModifiers((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId); else next.add(modId);
      return next;
    });
  }

  const detailPrice = useMemo(() => {
    if (!detailItem) return 0;
    const modDelta = Array.from(detailModifiers).reduce((sum, mid) => {
      const mod = detailItem.modifiers?.find((m: GuestModifier) => m.id === mid);
      return sum + (mod ? Number(mod.price_delta) : 0);
    }, 0);
    return (Number(detailItem.price) + modDelta) * detailQty;
  }, [detailItem, detailModifiers, detailQty]);

  /* ── Place order ── */
  async function placeOrder() {
    if (!session || cartItems.length === 0) return;
    setOrdering(true);
    const itemNotes = cartItems
      .filter((ci) => ci.itemNote.trim())
      .map((ci) => `${ci.menuItem.name}: ${ci.itemNote.trim()}`);
    const allNotes = [orderNotes.trim(), ...itemNotes].filter(Boolean).join("\n");

    const r = await createGuestOrder({
      session_token: session.token,
      lines: cartItems.map((ci) => ({
        menu_item: ci.menuItem.id,
        quantity: ci.qty,
        modifiers: ci.selectedModifiers.length > 0 ? ci.selectedModifiers : undefined,
      })),
      tip_amount: tipAmount > 0 ? tipAmount : undefined,
      notes: allNotes || undefined,
    });
    setOrdering(false);
    if (!r.ok) { showToast(r.message, "error"); return; }
    setCart(new Map());
    setCartOpen(false);
    setOrderNotes("");
    setSelectedTip(null);
    setCustomTipStr("");
    setShowConfirm(true);
    haptic();
  }

  /* ── Customer request ── */
  async function sendRequest(type: "waiter" | "bill" | "other", note?: string) {
    if (!session) return;
    setRequestBusy(true);
    const r = await createCustomerRequest({ session_token: session.token, request_type: type, note });
    setRequestBusy(false);
    if (!r.ok) { showToast(r.message, "error"); return; }
    haptic();
    showToast(type === "waiter" ? "Waiter has been notified!" : type === "bill" ? "Bill request sent!" : "Request sent!", "info");
  }

  /* ── Reorder ── */
  function reorder(order: GuestOrder) {
    if (!categories.length) return;
    const allItems = categories.flatMap((c) => c.items);
    const newCart = new Map(cart);
    for (const line of order.lines) {
      const menuItem = allItems.find((i) => i.name === line.name_snapshot);
      if (!menuItem || !menuItem.is_available) continue;
      const key = cartKey(menuItem.id, []);
      const existing = newCart.get(key);
      if (existing) newCart.set(key, { ...existing, qty: existing.qty + line.quantity });
      else newCart.set(key, { menuItem, qty: line.quantity, selectedModifiers: [], itemNote: "" });
    }
    setCart(newCart);
    setTab("menu");
    showToast("Items added to cart!", "success");
    haptic();
  }

  function toggleOrder(orderId: string) {
    setExpandedOrders((prev) => { const next = new Set(prev); if (next.has(orderId)) next.delete(orderId); else next.add(orderId); return next; });
  }

  function toggleCategory(catId: string) {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  }

  function scrollToCategory(catId: string) {
    setActiveCategory(catId);
    setCollapsedCats((prev) => { const next = new Set(prev); next.delete(catId); return next; });
    const el = sectionRefs.current.get(catId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ── Keyboard escape ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (detailItem) setDetailItem(null);
        else if (cartOpen) setCartOpen(false);
        else if (showConfirm) setShowConfirm(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailItem, cartOpen, showConfirm]);

  const sessionTotal = useMemo(() => orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total || 0), 0), [orders]);

  /* ── Cart content (shared between mobile sheet and desktop sidebar) ── */
  function renderCartLines() {
    return cartItems.map((ci) => (
      <div key={ci.key} className={s.cartLine}>
        {ci.menuItem.image ? (
          <img src={ci.menuItem.image} alt="" className={s.cartLineThumb} />
        ) : (
          <div className={s.cartLineThumbPlaceholder}><UtensilsCrossed size={14} /></div>
        )}
        <div className={s.cartLineBody}>
          <p className={s.cartLineName}>{ci.menuItem.name}</p>
          {ci.selectedModifiers.length > 0 && (
            <p className={s.cartLineMods}>
              {ci.selectedModifiers.map((mid) => ci.menuItem.modifiers?.find((m) => m.id === mid)?.name).filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className={s.itemActions}>
          <button type="button" className={s.qtyBtn} onClick={() => removeFromCart(ci.key)} aria-label="Remove one"><Minus size={12} /></button>
          <span className={s.qtyValue}>{ci.qty}</span>
          <button type="button" className={`${s.qtyBtn} ${s.qtyBtnAdd}`} onClick={() => addToCartByKey(ci.key)} aria-label="Add one"><Plus size={12} /></button>
        </div>
        <span className={s.cartLinePrice}>
          {money((Number(ci.menuItem.price) + ci.selectedModifiers.reduce((d, mid) => d + Number(ci.menuItem.modifiers?.find((m) => m.id === mid)?.price_delta ?? 0), 0)) * ci.qty)}
        </span>
      </div>
    ));
  }

  function renderTipSection() {
    if (!session || session.tip_mode === "off") return null;
    return (
      <div className={s.tipSection}>
        <p className={s.tipLabel}>Add a tip</p>
        <div className={s.tipOptions}>
          {session.tip_mode === "suggested" && session.tip_presets_percent.length > 0 ? (
            <>
              {session.tip_presets_percent.map((pct) => (
                <button key={pct} type="button" className={`${s.tipBtn} ${selectedTip === pct && !customTipStr ? s.tipBtnActive : ""}`}
                  onClick={() => { setSelectedTip(pct); setCustomTipStr(""); }}>
                  {pct}%
                </button>
              ))}
              <button type="button" className={`${s.tipBtn} ${customTipStr ? s.tipBtnActive : ""}`}
                onClick={() => { setSelectedTip(null); setCustomTipStr(""); }}>
                Custom
              </button>
            </>
          ) : (
            <div className={s.tipCustom}>
              <span>Tip:</span>
              <input className={s.tipCustomInput} type="number" min="0" step="0.50" placeholder="0.00" value={customTipStr} onChange={(e) => { setCustomTipStr(e.target.value); setSelectedTip(null); }} />
            </div>
          )}
        </div>
        {tipAmount > 0 && <p className={s.tipAmount}>Tip: {money(tipAmount)}</p>}
      </div>
    );
  }

  function renderCartFooter() {
    return (
      <div className={s.cartFooter}>
        <div className={s.cartTotalRow}><span>Subtotal</span><span>{money(cartSubtotal)}</span></div>
        {tipAmount > 0 && <div className={s.cartTotalRow}><span>Tip</span><span>{money(tipAmount)}</span></div>}
        <div className={s.cartGrandRow}><span>Total</span><span>{money(cartGrandTotal)}</span></div>
        <button type="button" className={s.placeOrderBtn} disabled={ordering || cartCount === 0} onClick={() => void placeOrder()}>
          {ordering ? "Placing order…" : `Place order · ${money(cartGrandTotal)}`}
        </button>
        <button type="button" className={s.clearCartBtn} onClick={() => { setCart(new Map()); setCartOpen(false); }}>Clear cart</button>
      </div>
    );
  }

  /* ═══════════════════════════════════════════ */
  /* ── Render: Invalid link ── */
  if (!token) {
    return (
      <div className={s.page}>
        <div className={s.centered}>
          <div className={s.centeredIcon}><Link2Off size={48} /></div>
          <p className={s.centeredTitle}>Invalid link</p>
          <p className={s.centeredSub}>This session link is not valid. Please scan the QR code at your table.</p>
        </div>
      </div>
    );
  }

  /* ── Render: Loading ── */
  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.skeleton}>
          <div className={s.skeletonHeader} />
          <div className={s.skeletonTabs}>{[1, 2, 3].map((i) => <div key={i} className={s.skeletonTab} />)}</div>
          <div className={s.skeletonCards}>{[1, 2, 3, 4, 5].map((i) => <div key={i} className={s.skeletonCard} />)}</div>
        </div>
      </div>
    );
  }

  /* ── Render: Fatal error ── */
  if (error && !session) {
    return (
      <div className={s.page}>
        <div className={s.centered}>
          <div className={s.centeredIcon}><CircleAlert size={48} /></div>
          <p className={s.centeredTitle}>Session unavailable</p>
          <p className={s.centeredSub}>{error}</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className={s.page} style={brandStyle}>
      {/* ── Branded header ── */}
      <header className={s.header}>
        <div className={s.headerLeft}>
          {session.organization_logo ? (
            <img src={session.organization_logo} alt="" className={s.headerLogo} />
          ) : (
            <div className={s.headerLogoFallback}><Store size={18} /></div>
          )}
          <div className={s.headerInfo}>
            {session.organization_name && <p className={s.brandName}>{session.organization_name}</p>}
            <h1 className={s.tableName}>{session.table_label}</h1>
            <div className={s.sessionMeta}>
              <span className={`${s.liveDot} ${!wsConnected ? s.liveDotDisconnected : ""}`} />
              <span className={s.sessionHint}>
                {session.location_name ? `${session.location_name} · Dine-in` : "Dine-in session"}
              </span>
            </div>
          </div>
        </div>
        <div className={s.headerActions}>
          <button type="button" className={s.headerBtn} disabled={requestBusy} onClick={() => void sendRequest("waiter")} aria-label="Call waiter">
            <Hand size={14} className={s.headerBtnIcon} /> Waiter
          </button>
          <button type="button" className={s.headerBtn} disabled={requestBusy} onClick={() => void sendRequest("bill")} aria-label="Request bill">
            <Receipt size={14} className={s.headerBtnIcon} /> Bill
          </button>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className={s.errorBanner} role="alert">
          <span className={s.errorBannerText}>{error}</span>
          <button type="button" className={s.errorDismiss} onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button>
        </div>
      )}

      {/* ── 3-column layout ── */}
      <div className={s.layout}>
        {/* ── LEFT: Desktop sidebar (categories) ── */}
        <aside className={s.desktopSidebar}>
          <div className={s.desktopSidebarHeader}>
            <p className={s.desktopSidebarTitle}>Menu</p>
          </div>
          <nav className={s.sidebarCategoryList} aria-label="Menu categories">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${s.sidebarCategoryBtn} ${activeCategory === cat.id ? s.sidebarCategoryBtnActive : ""}`}
                onClick={() => { setTab("menu"); scrollToCategory(cat.id); }}
              >
                {cat.name}
                <span className={s.sidebarCategoryCount}>{cat.items.length}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ── CENTER: Main content ── */}
        <main className={s.mainArea}>
          {/* Menu / Orders tabs */}
          <div className={s.viewTabs} role="tablist">
            <button role="tab" type="button" aria-selected={tab === "menu"} className={`${s.viewTab} ${tab === "menu" ? s.viewTabActive : ""}`} onClick={() => setTab("menu")}>
              <UtensilsCrossed size={16} className={s.viewTabIcon} /> Menu
            </button>
            <button role="tab" type="button" aria-selected={tab === "orders"} className={`${s.viewTab} ${tab === "orders" ? s.viewTabActive : ""}`} onClick={() => setTab("orders")}>
              <ClipboardList size={16} className={s.viewTabIcon} /> My Orders
              {orders.length > 0 && <span className={s.viewTabBadge}>{orders.length}</span>}
            </button>
          </div>

          {/* ═══ MENU TAB ═══ */}
          {tab === "menu" && (
            <div className={s.tabContent} role="tabpanel">
              {/* Search */}
              <div className={s.searchWrap}>
                <div className={s.searchInner}>
                  <Search size={16} className={s.searchIcon} />
                  <input className={s.searchInput} type="text" placeholder="Search menu…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="Search menu items" />
                  {searchQuery && (
                    <button type="button" className={s.searchClear} onClick={() => setSearchQuery("")} aria-label="Clear search"><X size={14} /></button>
                  )}
                </div>
              </div>

              {/* Mobile category nav */}
              {categories.length > 1 && !searchQuery && (
                <nav className={s.categoryNav} ref={categoryNavRef} aria-label="Menu categories">
                  {categories.map((cat) => (
                    <button key={cat.id} data-cat-id={cat.id} type="button" className={`${s.categoryTab} ${activeCategory === cat.id ? s.categoryTabActive : ""}`} onClick={() => scrollToCategory(cat.id)}>
                      {cat.name}
                    </button>
                  ))}
                </nav>
              )}

              {/* Menu items */}
              <div className={s.menuScroll}>
                {filteredCategories.length === 0 ? (
                  <div className={s.centered}>
                    <div className={s.centeredIcon}><UtensilsCrossed size={48} /></div>
                    <p className={s.centeredTitle}>{searchQuery ? "No results" : "No menu available"}</p>
                    <p className={s.centeredSub}>{searchQuery ? `No items match "${searchQuery}"` : "This location hasn't set up their menu yet."}</p>
                  </div>
                ) : (
                  <>
                  {filteredCategories.map((cat) => {
                    const collapsed = collapsedCats.has(cat.id);
                    return (
                      <div key={cat.id} ref={(el) => { if (el) sectionRefs.current.set(cat.id, el); }} className={s.section}>
                        <button
                          type="button"
                          className={s.sectionHeader}
                          onClick={() => toggleCategory(cat.id)}
                          aria-expanded={!collapsed}
                        >
                          <h2 className={s.sectionTitle}>{cat.name}</h2>
                          <div className={s.sectionMeta}>
                            <span className={s.sectionCount}>{cat.items.length} item{cat.items.length !== 1 ? "s" : ""}</span>
                            <ChevronDown size={18} className={`${s.sectionChevron} ${collapsed ? "" : s.sectionChevronOpen}`} />
                          </div>
                        </button>
                        {!collapsed && (
                          <div className={s.itemGrid}>
                            {cat.items.sort((a, b) => a.sort_order - b.sort_order).map((item, idx) => {
                              const qty = getQty(item.id);
                              const available = item.is_available;
                              return (
                                <div
                                  key={item.id}
                                  className={`${s.itemCard} ${!available ? s.unavailable : ""} ${s.staggerItem}`}
                                  style={{ animationDelay: `${idx * 0.04}s` }}
                                  onClick={() => openItemDetail(item)}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`${item.name}, ${money(item.price)}`}
                                >
                                  {qty > 0 && <span className={s.itemCardBadge}>×{qty}</span>}
                                  {item.image && (
                                    <img src={item.image} alt={item.name} className={s.itemThumb} loading="lazy" />
                                  )}
                                  <div className={s.itemBody}>
                                    <p className={s.itemName}>{item.name}</p>
                                    {item.description && <p className={s.itemDesc}>{item.description}</p>}
                                    <div className={s.itemBottom}>
                                      <span className={s.itemPrice}>{money(item.price)}</span>
                                      {!available && <span className={s.unavailableTag}>Unavailable</span>}
                                      {available && <span className={s.itemAdd}><Plus size={15} /></span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ═══ ORDERS TAB ═══ */}
          {tab === "orders" && (
            <div className={`${s.ordersContainer} ${s.tabContent}`} role="tabpanel">
              {ordersLoading && orders.length === 0 ? (
                <div className={s.skeletonCards}>{[1, 2, 3].map((i) => <div key={i} className={s.skeletonCard} />)}</div>
              ) : orders.length === 0 ? (
                <div className={s.emptyOrders}>
                  <div className={s.emptyOrdersIcon}><ClipboardList size={48} /></div>
                  <p className={s.emptyOrdersTitle}>No orders yet</p>
                  <p className={s.emptyOrdersSub}>Browse the menu and place your first order!</p>
                  <button type="button" className={`${s.btn} ${s.btnPrimary}`} style={{ marginTop: "0.75rem" }} onClick={() => setTab("menu")}>View Menu</button>
                </div>
              ) : (
                <>
                  {orders.map((order, idx) => {
                    const expanded = expandedOrders.has(order.id);
                    const stepIdx = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number]);
                    return (
                      <div key={order.id} className={`${s.orderCard} ${s.staggerItem}`} style={{ animationDelay: `${idx * 0.05}s` }}>
                        <div className={s.orderCardHeader} onClick={() => toggleOrder(order.id)} role="button" tabIndex={0} aria-expanded={expanded} aria-label={`Order ${order.id.slice(-6)}`}>
                          <div className={s.orderCardLeft}>
                            <p className={s.orderCardTitle}>Order #{order.id.slice(-6).toUpperCase()}</p>
                            <span className={s.orderCardTime}><Clock size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />{timeAgo(order.created_at)}</span>
                          </div>
                          <div className={s.orderCardRight}>
                            <span className={`${s.orderBadge} ${badgeClass(order.status)}`}>{statusLabel(order.status)}</span>
                            <span className={s.orderCardTotal}>{money(order.total)}</span>
                            <ChevronDown size={16} className={`${s.orderCardChevron} ${expanded ? s.orderCardChevronOpen : ""}`} />
                          </div>
                        </div>

                        {stepIdx >= 0 && order.status !== "cancelled" && (
                          <>
                            <div className={s.statusProgress}>
                              {ORDER_STEPS.map((step, i) => (
                                <span key={step} style={{ display: "contents" }}>
                                  <span className={`${s.progressDot} ${i <= stepIdx ? s.progressDotActive : ""}`} />
                                  {i < ORDER_STEPS.length - 1 && <span className={`${s.progressLine} ${i < stepIdx ? s.progressLineActive : ""}`} />}
                                </span>
                              ))}
                            </div>
                            <div className={s.progressLabels}>
                              {STEP_LABELS.map((lbl, i) => (
                                <span key={lbl} className={`${s.progressLabel} ${i <= stepIdx ? s.progressLabelActive : ""}`}>{lbl}</span>
                              ))}
                            </div>
                          </>
                        )}

                        {expanded && order.notes && (
                          <div className={s.orderNotes}>
                            <span className={s.orderNotesIcon}>📝</span>
                            <span>{order.notes}</span>
                          </div>
                        )}

                        {expanded && order.lines && order.lines.length > 0 && (
                          <div className={s.orderLines}>
                            {order.lines.map((line) => (
                              <div key={line.id} className={s.orderLineRow}>
                                <span className={s.orderLineName}>
                                  <span className={s.orderLineQty}>{line.quantity}×</span>
                                  <span className={s.orderLineLabel}>{line.name_snapshot}</span>
                                </span>
                                <span className={s.orderLinePrice}>{money(line.line_subtotal)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {expanded && order.lines && order.lines.length > 0 && (
                          <button type="button" className={s.reorderBtn} onClick={() => reorder(order)}>
                            <RefreshCcw size={14} className={s.reorderBtnIcon} /> Reorder these items
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div className={s.sessionTotal}>
                    <span className={s.sessionTotalLabel}>Session Total</span>
                    <span className={s.sessionTotalValue}>{money(sessionTotal)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </main>

        {/* ── RIGHT: Desktop persistent cart ── */}
        <aside className={s.desktopCartPanel}>
          <div className={s.desktopCart}>
            <div className={s.desktopCartHeader}>
              <p className={s.desktopCartTitle}>Your Order</p>
              <p className={s.desktopCartSub}>{cartCount} item{cartCount !== 1 ? "s" : ""}</p>
            </div>

            <div className={s.desktopCartBody}>
              {cartItems.length === 0 ? (
                <div className={s.desktopCartEmpty}>
                  <div className={s.desktopCartEmptyIcon}><ShoppingBag size={32} /></div>
                  <p className={s.desktopCartEmptyText}>Your cart is empty</p>
                </div>
              ) : (
                <>
                  {renderCartLines()}
                  {/* Notes */}
                  <div className={s.cartNotesWrap} style={{ padding: "0.75rem 0 0.5rem" }}>
                    <p className={s.cartNotesLabel}>Special instructions</p>
                    <textarea className={s.cartNotesInput} placeholder="Any allergies or requests?" rows={2} value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
                  </div>
                  {renderTipSection()}
                </>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className={s.desktopCartFooter}>
                <div className={s.cartTotalRow}><span>Subtotal</span><span>{money(cartSubtotal)}</span></div>
                {tipAmount > 0 && <div className={s.cartTotalRow}><span>Tip</span><span>{money(tipAmount)}</span></div>}
                <div className={s.cartGrandRow}><span>Total</span><span>{money(cartGrandTotal)}</span></div>
                <button type="button" className={s.placeOrderBtn} disabled={ordering || cartCount === 0} onClick={() => void placeOrder()}>
                  {ordering ? "Placing order…" : `Place order · ${money(cartGrandTotal)}`}
                </button>
                <button type="button" className={s.clearCartBtn} onClick={() => setCart(new Map())}>Clear cart</button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Mobile floating cart bar ── */}
      {cartCount > 0 && tab === "menu" && (
        <div className={s.cartBar}>
          <div className={s.cartSummary}>
            <span className={s.cartCount}>
              <span className={`${s.cartCountNum} ${cartBump ? s.cartCountBump : ""}`}>{cartCount}</span> item{cartCount !== 1 ? "s" : ""}
            </span>
            <span className={s.cartTotal}>{money(cartSubtotal)}</span>
          </div>
          <button type="button" className={s.cartViewBtn} onClick={() => setCartOpen(true)} aria-label="View cart">
            <ShoppingBag size={16} /> View cart
          </button>
        </div>
      )}

      {/* ── Mobile cart panel (bottom sheet) ── */}
      {cartOpen && (
        <>
          <div className={s.cartOverlay} onClick={() => setCartOpen(false)} />
          <div className={s.cartPanel} role="dialog" aria-label="Cart">
            <div className={s.cartHandle}><div className={s.cartHandleBar} /></div>
            <div className={s.cartHeader}>
              <h3 className={s.cartTitle}>Your order</h3>
              <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnGhost}`} onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={16} /></button>
            </div>
            <div className={s.cartBody}>{renderCartLines()}</div>

            <div className={s.cartNotesWrap}>
              <p className={s.cartNotesLabel}>Special instructions</p>
              <textarea className={s.cartNotesInput} placeholder="Any allergies or requests?" rows={2} value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
            </div>

            {renderTipSection()}
            {renderCartFooter()}
          </div>
        </>
      )}

      {/* ── Item detail sheet ── */}
      {detailItem && (
        <>
          <div className={s.sheetOverlay} onClick={() => setDetailItem(null)} />
          <div className={s.sheet} role="dialog" aria-label={detailItem.name}>
            <div className={s.sheetHandle}><div className={s.sheetHandleBar} /></div>
            {detailItem.image ? (
              <img src={detailItem.image} alt={detailItem.name} className={s.sheetImage} />
            ) : (
              <div className={s.sheetImagePlaceholder}><UtensilsCrossed size={48} /></div>
            )}
            <div className={s.sheetBody}>
              <h3 className={s.sheetName}>{detailItem.name}</h3>
              {detailItem.description && <p className={s.sheetDesc}>{detailItem.description}</p>}
              <span className={s.sheetPrice}>{money(detailItem.price)}</span>
            </div>

            {detailItem.modifiers && detailItem.modifiers.length > 0 && (
              <div className={s.sheetSection}>
                <p className={s.sheetSectionTitle}>Customize</p>
                {detailItem.modifiers.sort((a, b) => a.sort_order - b.sort_order).map((mod) => (
                  <div key={mod.id} className={s.modifierRow} onClick={() => toggleModifier(mod.id)} role="checkbox" tabIndex={0} aria-checked={detailModifiers.has(mod.id)}>
                    <div className={s.modifierLeft}>
                      <span className={`${s.modifierCheck} ${detailModifiers.has(mod.id) ? s.modifierCheckActive : ""}`}>
                        {detailModifiers.has(mod.id) && <Check size={12} />}
                      </span>
                      <span className={s.modifierName}>{mod.name}</span>
                    </div>
                    {Number(mod.price_delta) !== 0 && (
                      <span className={s.modifierDelta}>+{money(mod.price_delta)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={s.sheetSection}>
              <p className={s.sheetSectionTitle}>Special instructions</p>
              <textarea className={s.sheetNotes} placeholder="e.g. No onions, extra spicy…" rows={2} value={detailNote} onChange={(e) => setDetailNote(e.target.value)} />
            </div>

            <div className={s.sheetFooter}>
              <div className={s.sheetQty}>
                <button type="button" className={s.sheetQtyBtn} onClick={() => setDetailQty(Math.max(1, detailQty - 1))} aria-label="Decrease quantity"><Minus size={16} /></button>
                <span className={s.sheetQtyVal}>{detailQty}</span>
                <button type="button" className={s.sheetQtyBtn} onClick={() => setDetailQty(detailQty + 1)} aria-label="Increase quantity"><Plus size={16} /></button>
              </div>
              <button type="button" className={s.sheetAddBtn} onClick={addFromSheet}>
                Add to cart · {money(detailPrice)}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Confirmation overlay ── */}
      {showConfirm && (
        <div className={s.confirmOverlay} onClick={() => setShowConfirm(false)}>
          <div className={s.confirmCard} onClick={(e) => e.stopPropagation()}>
            <div className={s.confirmIcon}><PackageCheck size={48} /></div>
            <p className={s.confirmTitle}>Order placed!</p>
            <p className={s.confirmSub}>Your order is now being prepared! Track its progress in the Orders tab.</p>
            <button type="button" className={s.confirmBtn} onClick={() => { setShowConfirm(false); setTab("orders"); void loadOrders(); }}>
              View my orders
            </button>
          </div>
        </div>
      )}

      {/* ── Session closed overlay ── */}
      {sessionClosed && (
        <div className={s.closedOverlay}>
          <div className={s.closedCard}>
            <div className={s.closedIcon}><ChefHat size={48} /></div>
            <p className={s.closedTitle}>Session ended</p>
            <p className={s.closedSub}>This dining session has been closed. Thank you for visiting!</p>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`${s.toast} ${toast.kind === "success" ? s.toastSuccess : toast.kind === "error" ? s.toastError : s.toastInfo}`}>
          {toast.kind === "success" && <Check size={16} className={s.toastIcon} />}
          {toast.kind === "error" && <CircleAlert size={16} className={s.toastIcon} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
