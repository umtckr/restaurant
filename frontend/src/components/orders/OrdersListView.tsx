"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardList,
  FileText,
  RefreshCw,
  User,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import { listOrders, patchOrder, type Order, type OrderStatus } from "@/lib/api/orders";
import { useLocationCtx } from "@/store/LocationContext";
import { useLocationSocket, type LocationEvent } from "@/lib/realtime/useLocationSocket";
import { useMe } from "@/store/MeContext";

import s from "./Orders.module.css";

type Filter = "" | OrderStatus;

const FILTERS: { value: Filter; label: string; dot: string }[] = [
  { value: "", label: "All", dot: "transparent" },
  { value: "in_kitchen", label: "Preparing", dot: "#fbbf24" },
  { value: "ready", label: "Ready", dot: "#34d399" },
  { value: "served", label: "Served", dot: "#64748b" },
  { value: "cancelled", label: "Cancelled", dot: "#f87171" },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  in_kitchen: "ready",
  ready: "served",
};

function nextActionLabel(st: OrderStatus): string | null {
  switch (st) {
    case "in_kitchen":
      return "Mark Ready";
    case "ready":
      return "Mark Served";
    default:
      return null;
  }
}

function nextActionClass(st: OrderStatus): string {
  const next = NEXT_STATUS[st];
  if (next === "ready") return s.actionReady;
  if (next === "served") return s.actionServed;
  return "";
}

function formatMoney(v: string) {
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function elapsed(from: string) {
  const ms = Date.now() - new Date(from).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function accentClass(st: OrderStatus) {
  switch (st) {
    case "in_kitchen":
      return s.accentKitchen;
    case "ready":
      return s.accentReady;
    case "served":
      return s.accentServed;
    case "cancelled":
      return s.accentCancelled;
    default:
      return "";
  }
}

function badgeClass(st: OrderStatus) {
  switch (st) {
    case "in_kitchen":
      return s.badgeKitchen;
    case "ready":
      return s.badgeReady;
    case "served":
      return s.badgeServed;
    case "cancelled":
      return s.badgeCancelled;
    default:
      return "";
  }
}

function statusLabel(st: OrderStatus) {
  switch (st) {
    case "in_kitchen":
      return "Preparing";
    case "ready":
      return "Ready";
    case "served":
      return "Served";
    case "cancelled":
      return "Cancelled";
    default:
      return st.replaceAll("_", " ");
  }
}

export function OrdersListView() {
  const { locationId } = useLocationCtx();
  const { hasRoleForLocation } = useMe();
  const canAct = locationId
    ? hasRoleForLocation(locationId, "org_admin", "manager", "waiter", "host", "kitchen")
    : false;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Filter>("");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const r = await listOrders({
      location: locationId || undefined,
      status: status || undefined,
      page,
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOrders(r.paged.items);
    setTotal(r.paged.count);
    setHasNext(!!r.paged.next);
  }, [locationId, status, page]);

  useEffect(() => {
    if (!locationId) return;
    setPage(1);
  }, [locationId]);

  useEffect(() => {
    if (!locationId) return;
    void load();
  }, [load]);

  const handleWsEvent = useCallback(
    (event: LocationEvent) => {
      switch (event.type) {
        case "connection.ready":
          setWsConnected(true);
          break;
        case "order.updated":
          void load();
          break;
      }
    },
    [load],
  );

  useLocationSocket(locationId || null, handleWsEvent, {
    onOpen: () => setWsConnected(true),
    onClose: () => setWsConnected(false),
  });

  async function advanceOrder(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setBusy(order.id);
    setError(null);
    const r = await patchOrder(order.id, { status: next });
    setBusy(null);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    await load();
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setError(null);
    const r = await patchOrder(cancelTarget.id, { status: "cancelled" });
    setCancelling(false);
    if (!r.ok) {
      setError(r.message);
      setCancelTarget(null);
      return;
    }
    setCancelTarget(null);
    await load();
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / 20)), [total]);

  return (
    <AdminInterior
      title="Orders"
      description="Dine-in and other channels for your venues — newest first."
    >
      {error && <div className={s.errorBanner}>{error}</div>}

      {/* Toolbar */}
      <div className={s.toolbar}>
        <button
          type="button"
          className={s.refreshBtn}
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
        <span
          className={s.liveIndicator}
          style={{ color: wsConnected ? "#2dd4bf" : "var(--admin-text-muted)" }}
          title={wsConnected ? "Real-time connection active" : "Connecting…"}
        >
          <span className={`${s.liveDot} ${wsConnected ? s.liveDotOn : s.liveDotOff}`} />
          {wsConnected ? "Live" : "Connecting…"}
        </span>
      </div>

      {/* Filters */}
      <div className={s.filterRow}>
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            className={`${s.filterPill} ${status === f.value ? s.filterActive : ""}`}
            onClick={() => {
              setPage(1);
              setStatus(f.value);
            }}
          >
            {f.dot !== "transparent" && (
              <span className={s.filterDot} style={{ background: f.dot }} />
            )}
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && orders.length === 0 ? (
        <div className={s.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={s.skeleton} style={{ height: 180 }} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className={s.empty}>
          <ClipboardList size={44} className={s.emptyIcon} />
          <div className={s.emptyTitle}>No orders found</div>
          <div className={s.emptyDesc}>
            {status
              ? "Try switching to a different status filter."
              : "Orders will appear here as guests place them."}
          </div>
        </div>
      ) : (
        <>
          <div className={s.grid}>
            {orders.map((o, i) => {
              const mods = (line: (typeof o.lines)[0]) => {
                const arr = Array.isArray(line.modifiers_snapshot)
                  ? line.modifiers_snapshot
                  : [];
                return arr as { name?: string; price_delta?: string }[];
              };
              const isTerminal =
                o.status === "served" || o.status === "cancelled";
              const nextLabel = nextActionLabel(o.status);

              return (
                <div
                  key={o.id}
                  className={`${s.card} ${accentClass(o.status)}`}
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  {/* Header */}
                  <div className={s.cardHeader}>
                    <span className={s.cardTable}>
                      {o.table_label ?? "No table"}
                    </span>
                    <span className={s.cardId}>#{o.id.slice(0, 8)}</span>
                    <span className={`${s.cardBadge} ${badgeClass(o.status)}`}>
                      {statusLabel(o.status)}
                    </span>
                  </div>

                  {/* Meta row */}
                  <div className={s.cardMeta}>
                    <span className={s.metaItem}>
                      <Clock size={10} />
                      {elapsed(o.created_at)}
                    </span>
                    <span className={s.metaDivider} />
                    <span className={s.metaItem}>
                      <UtensilsCrossed size={10} />
                      {o.channel.replaceAll("_", " ")}
                    </span>
                    {o.customer_display && (
                      <>
                        <span className={s.metaDivider} />
                        <span className={s.metaItem}>
                          <User size={10} />
                          {o.customer_display}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Items */}
                  <div className={s.cardItems}>
                    {o.lines.slice(0, 4).map((line) => {
                      const lineMods = mods(line);
                      return (
                        <div key={line.id}>
                          <div className={s.lineItem}>
                            <span className={s.lineQty}>{line.quantity}</span>
                            <span className={s.lineTimes}>&times;</span>
                            <span className={s.lineName}>{line.name_snapshot}</span>
                            <span className={s.linePrice}>{formatMoney(line.line_subtotal)}</span>
                          </div>
                          {lineMods.length > 0 && (
                            <div className={s.lineMods}>
                              {lineMods.map((m) => m.name).join(", ")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {o.lines.length > 4 && (
                      <div className={s.linesMore}>
                        +{o.lines.length - 4} more item
                        {o.lines.length - 4 !== 1 ? "s" : ""}
                      </div>
                    )}
                    {o.lines.length === 0 && o.items_count > 0 && (
                      <div className={s.linesMore}>
                        {o.items_count} item{o.items_count !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {o.notes && (
                    <div className={s.cardNotes}>
                      <FileText size={11} className={s.notesIcon} />
                      <span className={s.notesText}>{o.notes}</span>
                    </div>
                  )}

                  {/* Footer with actions */}
                  <div className={s.cardFooter}>
                    <span className={s.cardTotal}>{formatMoney(o.total)}</span>
                    <div className={s.cardActions}>
                      {canAct && !isTerminal && nextLabel && (
                        <button
                          type="button"
                          className={`${s.actionBtn} ${nextActionClass(o.status)}`}
                          disabled={busy === o.id}
                          onClick={() => void advanceOrder(o)}
                        >
                          {busy === o.id ? (
                            "…"
                          ) : (
                            <>
                              <ArrowRight size={11} />
                              {nextLabel}
                            </>
                          )}
                        </button>
                      )}
                      {canAct && !isTerminal && (
                        <button
                          type="button"
                          className={`${s.actionBtn} ${s.actionCancel}`}
                          disabled={busy === o.id}
                          onClick={() => setCancelTarget(o)}
                        >
                          <X size={11} />
                          Cancel
                        </button>
                      )}
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className={s.detailsLink}
                      >
                        Details <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className={s.pager}>
            <span className={s.pageInfo}>
              {total} order{total !== 1 ? "s" : ""} &middot; page {page} of {totalPages}
            </span>
            <button
              type="button"
              className={s.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={13} />
              Previous
            </button>
            <button
              type="button"
              className={s.pageBtn}
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight size={13} />
            </button>
          </div>
        </>
      )}
      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <div
          className={s.modalOverlay}
          onClick={() => !cancelling && setCancelTarget(null)}
        >
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div className={s.modalIcon}>
                <X size={16} />
              </div>
              <h3 className={s.modalTitle}>Cancel order</h3>
            </div>

            <div className={s.modalBody}>
              <p className={s.modalDesc}>
                Are you sure you want to cancel this order? This action cannot be undone.
              </p>

              <div className={s.modalDetails}>
                <div className={s.modalDetailRow}>
                  <span className={s.modalDetailLabel}>Table</span>
                  <span className={s.modalDetailValue}>
                    {cancelTarget.table_label ?? "No table"}
                  </span>
                </div>
                <div className={s.modalDetailRow}>
                  <span className={s.modalDetailLabel}>Order</span>
                  <span className={s.modalDetailValue}>
                    #{cancelTarget.id.slice(0, 8)}
                  </span>
                </div>
                <div className={s.modalDetailRow}>
                  <span className={s.modalDetailLabel}>Items</span>
                  <span className={s.modalDetailValue}>
                    {cancelTarget.items_count} item
                    {cancelTarget.items_count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className={s.modalDetailRow}>
                  <span className={s.modalDetailLabel}>Total</span>
                  <span className={s.modalDetailValue} style={{ fontWeight: 800 }}>
                    {formatMoney(cancelTarget.total)}
                  </span>
                </div>
              </div>

              {cancelTarget.lines.length > 0 && (
                <div className={s.modalItems}>
                  {cancelTarget.lines.slice(0, 5).map((line) => (
                    <div key={line.id} className={s.modalItemRow}>
                      <span className={s.modalItemQty}>{line.quantity}&times;</span>
                      <span className={s.modalItemName}>{line.name_snapshot}</span>
                    </div>
                  ))}
                  {cancelTarget.lines.length > 5 && (
                    <div className={s.modalItemMore}>
                      +{cancelTarget.lines.length - 5} more
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={s.modalFooter}>
              <button
                type="button"
                className={s.modalBtn}
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
              >
                Keep order
              </button>
              <button
                type="button"
                className={`${s.modalBtn} ${s.modalBtnDanger}`}
                onClick={() => void confirmCancel()}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling…" : "Cancel order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminInterior>
  );
}
