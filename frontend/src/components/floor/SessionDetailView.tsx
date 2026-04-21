"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { listMenuLocations } from "@/lib/api/menus";
import {
  listOrders,
  listCustomerRequests,
  patchCustomerRequest,
  patchOrder,
  type Order,
  type OrderStatus,
  type CustomerRequest,
  type CustomerRequestStatus,
} from "@/lib/api/orders";
import {
  closeDiningSession,
  getDiningSession,
  type DiningSession,
} from "@/lib/api/sessions";
import {
  useLocationSocket,
  type LocationEvent,
} from "@/lib/realtime/useLocationSocket";
import s from "./SessionDetail.module.css";

/* ── Helpers ── */

function money(v: string | number) {
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

const ORDER_STEPS: OrderStatus[] = [
  "in_kitchen",
  "ready",
  "served",
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  in_kitchen: "ready",
  ready: "served",
};

const REQ_NEXT: Record<CustomerRequestStatus, CustomerRequestStatus | null> = {
  open: "acknowledged",
  acknowledged: "done",
  done: null,
};

function badgeClass(st: OrderStatus): string {
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
      return s.badgeDraft;
  }
}

/* ── Component ── */

export function SessionDetailView() {
  const params = useParams();
  const id = typeof params?.sessionId === "string" ? params.sessionId : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<DiningSession | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [closeModal, setCloseModal] = useState(false);
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuAssigned, setMenuAssigned] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [wsConnected, setWsConnected] = useState(false);

  // Live duration ticker
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  /* ── Data loading ── */
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const sr = await getDiningSession(id);
    if (!sr.ok) {
      setError(sr.message);
      setSession(null);
      setLoading(false);
      return;
    }
    setSession(sr.session);
    setLoading(false);
    const [or, cr, ml] = await Promise.all([
      listOrders({ dining_session: sr.session.id }),
      listCustomerRequests(sr.session.id),
      listMenuLocations({ location: sr.session.location }),
    ]);
    if (or.ok) setOrders(or.paged.items);
    else setError((e) => (e ? `${e}; ${or.message}` : or.message));
    if (cr.ok) setRequests(cr.items);
    else setError((e) => (e ? `${e}; ${cr.message}` : cr.message));
    if (ml.ok) setMenuAssigned(ml.items.some((r) => r.is_active));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const reloadOrdersAndRequests = useCallback(async () => {
    if (!session) return;
    const [or, cr] = await Promise.all([
      listOrders({ dining_session: session.id }),
      listCustomerRequests(session.id),
    ]);
    if (or.ok) setOrders(or.paged.items);
    if (cr.ok) setRequests(cr.items);
  }, [session]);

  /* ── WebSocket ── */
  const handleWsEvent = useCallback(
    (event: LocationEvent) => {
      if (!session) return;
      switch (event.type) {
        case "customer_request.updated":
          if (event.payload.session_id === session.id) {
            void reloadOrdersAndRequests();
          }
          break;
        case "order.updated":
          if (event.payload.dining_session_id === session.id) {
            void reloadOrdersAndRequests();
          }
          break;
        case "session.updated":
          if (event.payload.session_id === session.id) {
            void load();
          }
          break;
      }
    },
    [session, reloadOrdersAndRequests, load],
  );

  useLocationSocket(session?.location ?? null, handleWsEvent, {
    onOpen: () => setWsConnected(true),
    onClose: () => setWsConnected(false),
  });

  /* ── Actions ── */
  async function handleClose() {
    if (!session || session.status !== "open") return;
    setClosing(true);
    const r = await closeDiningSession(session.id);
    setClosing(false);
    setCloseModal(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setSession(r.session);
  }

  async function advanceOrder(orderId: string, st: OrderStatus) {
    setBusy(orderId);
    const r = await patchOrder(orderId, { status: st });
    setBusy(null);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === r.order.id ? r.order : o)),
    );
  }

  async function advanceRequest(
    reqId: string,
    st: CustomerRequestStatus,
  ) {
    setBusy(reqId);
    const r = await patchCustomerRequest(reqId, { status: st });
    setBusy(null);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setRequests((prev) =>
      prev.map((c) => (c.id === r.item.id ? r.item : c)),
    );
  }

  function toggleExpand(orderId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  async function copyLink() {
    if (!guestUrl) return;
    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  /* ── Computed ── */
  const guestUrl =
    typeof window !== "undefined" && session
      ? `${window.location.origin}/session/${session.token}`
      : "";

  const isOpen = session?.status === "open";

  const orderSummary = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let service = 0;
    let tip = 0;
    let total = 0;
    let active = 0;
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      subtotal += Number(o.subtotal);
      tax += Number(o.tax_amount);
      service += Number(o.service_charge_amount);
      tip += Number(o.tip_amount);
      total += Number(o.total);
      if (o.status !== "served") active += 1;
    }
    return {
      count: orders.length,
      active,
      subtotal,
      tax,
      service,
      tip,
      total,
    };
  }, [orders]);

  const openRequests = useMemo(
    () => requests.filter((r) => r.status !== "done"),
    [requests],
  );

  const durationMs = session
    ? now -
      new Date(session.created_at).getTime()
    : 0;

  /* ── Early returns ── */
  if (!id) {
    return (
      <AdminInterior title="Session" description="">
        <div className={s.errorBanner}>Invalid session.</div>
      </AdminInterior>
    );
  }

  if (loading && !session) {
    return (
      <AdminInterior title="Session" description="">
        <p style={{ textAlign: "center", color: "var(--admin-text-muted)", padding: "3rem 0" }}>
          Loading session…
        </p>
      </AdminInterior>
    );
  }

  if (!session) {
    return (
      <AdminInterior title="Session" description="">
        <div className={s.errorBanner}>{error ?? "Not found"}</div>
        <Link href="/dashboard/floor" className={s.back}>
          ← Floor
        </Link>
      </AdminInterior>
    );
  }

  /* ── Render ── */
  return (
    <AdminInterior title="" description="">
      {/* Back */}
      <Link href="/dashboard/floor" className={s.back}>
        ← Back to floor
      </Link>

      {error ? <div className={s.errorBanner}>{error}</div> : null}

      {/* ── Hero header ── */}
      <div className={s.hero}>
        <div className={s.heroLeft}>
          <span className={s.breadcrumb}>
            {session.organization_name}
            {session.organization_name && session.location_name ? " → " : ""}
            {session.location_name}
          </span>
          <h1 className={s.tableName}>{session.table_label}</h1>
          <div className={s.heroMeta}>
            <span
              className={`${s.statusPill} ${isOpen ? s.statusOpen : s.statusClosed}`}
            >
              {isOpen && <span className={s.pulsingDot} />}
              {isOpen ? "Open" : "Closed"}
            </span>
            {isOpen && (
              <span className={s.duration}>{formatDuration(durationMs)}</span>
            )}
            <span
              className={`${s.liveBadge} ${wsConnected ? "" : s.liveBadgeOff}`}
            >
              <span
                className={`${s.liveDot} ${wsConnected ? "" : s.liveDotOff}`}
              />
              {wsConnected ? "Live" : "Connecting…"}
            </span>
          </div>
        </div>
        <div className={s.heroRight}>
          <button
            type="button"
            className={s.btn}
            onClick={() => void load()}
          >
            Refresh
          </button>
          {isOpen && (
            <button
              type="button"
              className={`${s.btn} ${s.btnDanger}`}
              onClick={() => setCloseModal(true)}
            >
              Close session
            </button>
          )}
        </div>
      </div>

      {/* ── Menu warning ── */}
      {menuAssigned === false && (
        <div className={s.warningBanner}>
          <span>
            No active menu assigned to this location — guests won&apos;t see a
            menu.
          </span>
          <Link href="/dashboard/menus/assignments" className={s.warningLink}>
            Assign menu →
          </Link>
        </div>
      )}

      {/* ── Customer request alerts ── */}
      {openRequests.length > 0 && (
        <div className={s.alertBanner}>
          <div className={s.alertHeader}>
            <span className={s.alertIcon}>🔔</span>
            <span className={s.alertTitle}>Pending requests</span>
            <span className={s.alertCount}>{openRequests.length}</span>
          </div>
          {openRequests.map((req) => {
            const next = REQ_NEXT[req.status];
            const isBill = req.request_type === "bill";
            return (
              <div key={req.id} className={s.requestCard}>
                <span className={s.requestType}>
                  {req.request_type.replaceAll("_", " ")}
                </span>
                {isBill && req.session_total && (
                  <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--admin-text, #f4f4f6)" }}>
                    {money(req.session_total)}
                  </span>
                )}
                <span className={s.requestNote}>{req.note || "—"}</span>
                <span className={s.requestTime}>{elapsed(req.created_at)}</span>
                <div className={s.requestActions}>
                  {next && (
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnPrimary} ${s.btnSmall}`}
                      disabled={busy === req.id}
                      onClick={() => void advanceRequest(req.id, next)}
                    >
                      {busy === req.id
                        ? "…"
                        : next === "acknowledged"
                          ? "Acknowledge"
                          : "Done"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className={s.statGrid}>
        <div className={s.statCard}>
          <p className={s.statLabel}>Orders</p>
          <p className={s.statValue}>{orderSummary.count}</p>
          {orderSummary.active > 0 && (
            <span className={s.statSub}>{orderSummary.active} active</span>
          )}
        </div>
        <div className={s.statCard}>
          <p className={s.statLabel}>Total</p>
          <p className={s.statValue}>{money(orderSummary.total)}</p>
        </div>
        <div className={s.statCard}>
          <p className={s.statLabel}>Requests</p>
          <p className={s.statValue}>{requests.length}</p>
          {openRequests.length > 0 && (
            <span className={s.statSub} style={{ color: "#fbbf24" }}>
              {openRequests.length} pending
            </span>
          )}
        </div>
        <div className={s.statCard}>
          <p className={s.statLabel}>Opened</p>
          <p className={s.statValue} style={{ fontSize: "0.9rem" }}>
            {new Date(session.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <span className={s.statSub}>
            {new Date(session.created_at).toLocaleDateString()}
          </span>
        </div>
        {session.closed_at && (
          <div className={s.statCard}>
            <p className={s.statLabel}>Closed</p>
            <p className={s.statValue} style={{ fontSize: "0.9rem" }}>
              {new Date(session.closed_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <span className={s.statSub}>
              {new Date(session.closed_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* ── Guest link + QR ── */}
      {guestUrl && isOpen && (
        <div className={s.guestCard}>
          <div className={s.qrWrap}>
            <QRCodeSVG value={guestUrl} size={80} level="M" />
          </div>
          <div className={s.guestLinkInfo}>
            <span className={s.guestLinkLabel}>Guest session link</span>
            <code className={s.guestLinkUrl}>{guestUrl}</code>
          </div>
          <div className={s.guestLinkActions}>
            <button
              type="button"
              className={`${s.btn} ${s.btnSmall}`}
              onClick={() => void copyLink()}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <a
              href={guestUrl}
              target="_blank"
              rel="noreferrer"
              className={`${s.btn} ${s.btnSmall}`}
            >
              Open ↗
            </a>
          </div>
        </div>
      )}

      {/* ── All customer requests (historical) ── */}
      {requests.length > 0 && (
        <>
          <div className={s.sectionHeader}>
            <h3 className={s.sectionTitle}>Customer requests</h3>
            <span className={s.sectionCount}>{requests.length}</span>
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            {requests
              .filter((r) => r.status === "done")
              .map((req) => (
                <div
                  key={req.id}
                  className={s.requestCard}
                  style={{
                    opacity: 0.55,
                    borderColor: "var(--admin-border, rgba(255,255,255,0.065))",
                    background: "transparent",
                  }}
                >
                  <span className={s.requestType}>
                    {req.request_type.replaceAll("_", " ")}
                  </span>
                  {req.request_type === "bill" && req.session_total && (
                    <span style={{ fontWeight: 700, fontSize: "0.8125rem" }}>
                      {money(req.session_total)}
                    </span>
                  )}
                  <span className={s.requestNote}>{req.note || "—"}</span>
                  <span className={s.requestTime}>
                    {elapsed(req.created_at)}
                  </span>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      color: "var(--admin-text-muted)",
                    }}
                  >
                    Done
                  </span>
                </div>
              ))}
          </div>
        </>
      )}

      {/* ── Orders ── */}
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Orders</h3>
        <span className={s.sectionCount}>{orders.length}</span>
      </div>

      {orders.length === 0 ? (
        <div className={s.emptyState}>No orders on this session yet.</div>
      ) : (
        orders.map((o) => {
          const advance = NEXT_STATUS[o.status];
          const isExpanded = expanded.has(o.id);
          const stepIdx = ORDER_STEPS.indexOf(o.status);
          const isCancelled = o.status === "cancelled";
          const mods = (line: (typeof o.lines)[number]) =>
            Array.isArray(line.modifiers_snapshot)
              ? (line.modifiers_snapshot as {
                  name?: string;
                  price_delta?: string;
                }[])
              : [];

          return (
            <div key={o.id} className={s.orderCard}>
              {/* Main row */}
              <div
                className={s.orderRow}
                onClick={() => toggleExpand(o.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toggleExpand(o.id);
                }}
              >
                <span className={s.orderIdCol}>#{o.id.slice(0, 8)}</span>
                <span className={s.orderItemsPreview}>
                  {o.items_count > 0
                    ? o.lines
                        .slice(0, 3)
                        .map((l) => `${l.quantity}× ${l.name_snapshot}`)
                        .join(", ")
                    : "—"}
                  {o.lines.length > 3 && (
                    <span className={s.orderItemsMore}>
                      {" "}
                      +{o.lines.length - 3}
                    </span>
                  )}
                </span>
                <div className={s.orderMeta}>
                  <span className={`${s.badge} ${badgeClass(o.status)}`}>
                    {o.status.replaceAll("_", " ")}
                  </span>
                  <span className={s.orderTotal}>{money(o.total)}</span>
                  <span className={s.orderTime} title={new Date(o.created_at).toLocaleString()}>
                    {elapsed(o.created_at)}
                  </span>
                </div>
                <div className={s.orderActions}>
                  {advance && (
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnPrimary} ${s.btnSmall}`}
                      disabled={busy === o.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void advanceOrder(o.id, advance);
                      }}
                    >
                      {busy === o.id
                        ? "…"
                        : advance.replaceAll("_", " ")}
                    </button>
                  )}
                  <Link
                    href={`/dashboard/orders/${o.id}`}
                    className={s.link}
                    style={{ fontSize: "0.75rem" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Full detail
                  </Link>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`${s.expandIcon} ${isExpanded ? s.expandIconOpen : ""}`}
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Order notes */}
              {o.notes && (
                <div style={{ padding: "0 1.15rem 0.45rem" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.4rem",
                    padding: "0.5rem 0.75rem",
                    borderRadius: 8,
                    background: "rgba(251, 191, 36, 0.08)",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    fontSize: "0.8125rem",
                    color: "var(--admin-text, #f4f4f6)",
                    lineHeight: 1.45,
                  }}>
                    <span style={{ flexShrink: 0, fontSize: "0.75rem" }}>📝</span>
                    <span>{o.notes}</span>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              {!isCancelled && (
                <div style={{ padding: "0 1.15rem 0.45rem" }}>
                  <div className={s.progressBar}>
                    {ORDER_STEPS.map((step, i) => {
                      let cls = s.progressStep;
                      if (i < stepIdx) cls += ` ${s.progressStepDone}`;
                      else if (i === stepIdx) cls += ` ${s.progressStepActive}`;
                      return <div key={step} className={cls} />;
                    })}
                  </div>
                  <div className={s.progressLabels}>
                    <span>Kitchen</span>
                    <span>Ready</span>
                    <span>Served</span>
                  </div>
                </div>
              )}
              {isCancelled && (
                <div style={{ padding: "0 1.15rem 0.55rem" }}>
                  <div className={s.progressBar}>
                    {ORDER_STEPS.map((step) => (
                      <div
                        key={step}
                        className={`${s.progressStep} ${s.progressStepCancelled}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Expanded lines */}
              {isExpanded && (
                <div className={s.orderExpanded}>
                  {o.lines.length === 0 ? (
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8125rem",
                        color: "var(--admin-text-muted)",
                      }}
                    >
                      No line items.
                    </p>
                  ) : (
                    <div className={s.lineGrid}>
                      <span className={s.lineGridHeader}>Item</span>
                      <span
                        className={s.lineGridHeader}
                        style={{ textAlign: "center" }}
                      >
                        Qty
                      </span>
                      <span
                        className={s.lineGridHeader}
                        style={{ textAlign: "right" }}
                      >
                        Price
                      </span>
                      <span
                        className={s.lineGridHeader}
                        style={{ textAlign: "right" }}
                      >
                        Total
                      </span>
                      {o.lines.map((line) => {
                        const lineMods = mods(line);
                        return (
                          <div
                            key={line.id}
                            style={{
                              display: "contents",
                            }}
                          >
                            <span className={s.lineName}>
                              {line.name_snapshot}
                            </span>
                            <span className={s.lineQty}>{line.quantity}</span>
                            <span className={s.linePrice}>
                              {money(line.unit_price)}
                            </span>
                            <span className={s.lineTotal}>
                              {money(line.line_subtotal)}
                            </span>
                            {lineMods.length > 0 && (
                              <span className={s.lineMods}>
                                {lineMods
                                  .map((m) => {
                                    const d = Number(m.price_delta ?? 0);
                                    return d !== 0
                                      ? `${m.name} (+${money(d)})`
                                      : m.name;
                                  })
                                  .join(", ")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* ── Financial summary ── */}
      {orders.length > 0 && (
        <div className={s.financialCard}>
          <div className={s.finRow}>
            <span className={s.finLabel}>Subtotal</span>
            <span className={s.finValue}>{money(orderSummary.subtotal)}</span>
          </div>
          <div className={s.finRow}>
            <span className={s.finLabel}>Tax</span>
            <span className={s.finValue}>{money(orderSummary.tax)}</span>
          </div>
          {orderSummary.service > 0 && (
            <div className={s.finRow}>
              <span className={s.finLabel}>Service charge</span>
              <span className={s.finValue}>
                {money(orderSummary.service)}
              </span>
            </div>
          )}
          {orderSummary.tip > 0 && (
            <div className={s.finRow}>
              <span className={s.finLabel}>Tip</span>
              <span className={s.finValue}>{money(orderSummary.tip)}</span>
            </div>
          )}
          <hr className={s.finDivider} />
          <div className={s.finRow}>
            <span className={`${s.finLabel} ${s.finTotal}`}>Total</span>
            <span className={`${s.finValue} ${s.finTotal}`}>
              {money(orderSummary.total)}
            </span>
          </div>
        </div>
      )}

      {/* ── Close confirmation ── */}
      <ConfirmModal
        open={closeModal}
        title="Close session"
        body={
          <>
            Close the session for <strong>{session.table_label}</strong>?
            {orderSummary.active > 0 && (
              <span
                style={{
                  display: "block",
                  marginTop: 8,
                  color: "#f59e0b",
                  fontSize: "0.8125rem",
                }}
              >
                There {orderSummary.active === 1 ? "is" : "are"} still{" "}
                {orderSummary.active} active order
                {orderSummary.active !== 1 ? "s" : ""}.
              </span>
            )}
          </>
        }
        confirmLabel="Close session"
        variant="danger"
        busy={closing}
        onConfirm={() => void handleClose()}
        onCancel={() => setCloseModal(false)}
      />
    </AdminInterior>
  );
}
