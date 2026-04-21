"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/locations/Locations.module.css";
import {
  getOrder,
  listOrderActivityLogs,
  patchOrder,
  type Order,
  type OrderActivityLog,
  type OrderStatus,
} from "@/lib/api/orders";
import { useLocationSocket, type LocationEvent } from "@/lib/realtime/useLocationSocket";
import { useMe } from "@/store/MeContext";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  in_kitchen: "ready",
  ready: "served",
};

const STATUS_OPTIONS: OrderStatus[] = [
  "in_kitchen",
  "ready",
  "served",
  "cancelled",
];

function money(s: string) {
  const n = Number(s);
  if (Number.isNaN(n)) return s;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusColor(s: OrderStatus): React.CSSProperties | undefined {
  switch (s) {
    case "in_kitchen":
      return { background: "rgba(245,158,11,0.12)", color: "#fbbf24" };
    case "ready":
      return { background: "rgba(16,185,129,0.12)", color: "#34d399" };
    case "served":
      return { background: "rgba(100,116,139,0.12)", color: "#94a3b8" };
    case "cancelled":
      return { background: "rgba(220,38,38,0.12)", color: "#fecaca" };
    default:
      return undefined;
  }
}

export function OrderDetailView() {
  const params = useParams();
  const id = typeof params?.orderId === "string" ? params.orderId : "";
  const { hasRole } = useMe();
  const canChangeStatus = hasRole("org_admin", "manager", "waiter", "host", "kitchen");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [activityLogs, setActivityLogs] = useState<OrderActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!id) return;
    setLogsLoading(true);
    const r = await listOrderActivityLogs(id);
    setLogsLoading(false);
    if (r.ok) setActivityLogs(r.logs);
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const [r] = await Promise.all([getOrder(id), loadLogs()]);
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      setOrder(null);
      return;
    }
    setOrder(r.order);
  }, [id, loadLogs]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleWsEvent = useCallback(
    (event: LocationEvent) => {
      switch (event.type) {
        case "connection.ready":
          setWsConnected(true);
          break;
        case "order.updated":
          if (event.payload.order_id === id) {
            void load();
          }
          break;
      }
    },
    [id, load],
  );

  useLocationSocket(order?.location ?? null, handleWsEvent, {
    onOpen: () => setWsConnected(true),
    onClose: () => setWsConnected(false),
  });

  async function setStatus(st: OrderStatus) {
    if (!order) return;
    setSaving(true);
    setError(null);
    const r = await patchOrder(order.id, { status: st });
    setSaving(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOrder(r.order);
    void loadLogs();
  }

  if (!id) {
    return (
      <AdminInterior title="Order" description="">
        <div className={styles.errorBanner}>Invalid order.</div>
      </AdminInterior>
    );
  }

  if (loading && !order) {
    return (
      <AdminInterior title="Order" description="">
        <div className={styles.loading}>Loading…</div>
      </AdminInterior>
    );
  }

  if (error || !order) {
    return (
      <AdminInterior title="Order" description="">
        <div className={styles.errorBanner}>{error ?? "Not found"}</div>
        <Link href="/dashboard/orders" className={styles.link}>
          ← Orders
        </Link>
      </AdminInterior>
    );
  }

  const advance = NEXT_STATUS[order.status];
  const isTerminal = order.status === "served" || order.status === "cancelled";
  const hasFinancials =
    Number(order.service_charge_amount) > 0 || Number(order.tip_amount) > 0;

  return (
    <AdminInterior
      title={`Order #${order.id.slice(0, 8)}`}
      description={`${order.location_name || "Location"} · ${order.channel.replaceAll("_", " ")}`}
    >
      <p style={{ marginBottom: "1rem" }}>
        <Link href="/dashboard/orders" className={styles.link}>
          ← Orders
        </Link>
      </p>
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      {/* ── Info cards ── */}
      <div className={styles.cardGrid} style={{ marginBottom: "1.25rem" }}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Status</p>
          <p className={styles.statValue} style={{ fontSize: "1rem" }}>
            <span className={styles.badge} style={statusColor(order.status)}>
              {order.status.replaceAll("_", " ")}
            </span>
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Channel</p>
          <p className={styles.statValue} style={{ fontSize: "1rem", textTransform: "capitalize" }}>
            {order.channel.replaceAll("_", " ")}
          </p>
        </div>
        {order.table_label && (
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Table</p>
            <p className={styles.statValue} style={{ fontSize: "1rem", fontWeight: 700 }}>
              {order.table_label}
            </p>
          </div>
        )}
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Customer</p>
          <p className={styles.statValue} style={{ fontSize: "0.9rem" }}>
            {order.customer_display ?? "Guest (anonymous)"}
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Location</p>
          <p className={styles.statValue} style={{ fontSize: "0.9rem" }}>
            {order.location_name || order.location.slice(0, 8)}
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Items</p>
          <p className={styles.statValue} style={{ fontSize: "1rem" }}>
            {order.items_count}
          </p>
        </div>
      </div>

      {/* ── Timestamps ── */}
      <div
        style={{
          display: "flex",
          gap: "2rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
          fontSize: "0.8125rem",
          color: "var(--admin-text-muted)",
        }}
      >
        <span>
          <strong style={{ color: "var(--admin-text)" }}>Created</strong>{" "}
          {new Date(order.created_at).toLocaleString()}
        </span>
        <span>
          <strong style={{ color: "var(--admin-text)" }}>Updated</strong>{" "}
          {new Date(order.updated_at).toLocaleString()}
        </span>
        <span
          style={{
            fontSize: "0.6875rem",
            fontWeight: 600,
            color: wsConnected ? "#2dd4bf" : "var(--admin-text-muted)",
          }}
          title={wsConnected ? "Real-time connection active" : "Connecting…"}
        >
          ● {wsConnected ? "Live" : "Connecting…"}
        </span>
        {order.dining_session && (
          <span>
            <Link
              href={`/dashboard/floor/sessions/${order.dining_session}`}
              className={styles.link}
              style={{ fontSize: "0.8125rem" }}
            >
              View session →
            </Link>
          </span>
        )}
      </div>

      {/* ── Guest info ── */}
      {(order.guest_email || order.guest_phone) && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.75rem 1rem",
            borderRadius: 10,
            border: "1px solid var(--admin-border, rgba(255,255,255,0.065))",
            background: "var(--admin-surface, #13161f)",
            fontSize: "0.8125rem",
            display: "flex",
            gap: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          {order.guest_email && (
            <span>
              <strong>Email:</strong> {order.guest_email}
            </span>
          )}
          {order.guest_phone && (
            <span>
              <strong>Phone:</strong> {order.guest_phone}
            </span>
          )}
        </div>
      )}

      {/* ── Notes ── */}
      {order.notes && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.75rem 1rem",
            borderRadius: 10,
            border: "1px solid rgba(251, 191, 36, 0.25)",
            background: "rgba(251, 191, 36, 0.06)",
            fontSize: "0.8125rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "1rem", lineHeight: 1.3, flexShrink: 0 }}>📝</span>
          <div>
            <strong style={{ color: "#fbbf24" }}>Customer Notes</strong>
            <p style={{ margin: "0.3rem 0 0", whiteSpace: "pre-wrap" }}>{order.notes}</p>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      {!isTerminal && canChangeStatus && (
        <div className={styles.toolbar} style={{ marginBottom: "1.25rem" }}>
          <label className={styles.hint} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Set status
            <select
              className={styles.select}
              value={order.status}
              disabled={saving}
              onChange={(e) => void setStatus(e.target.value as OrderStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          {advance ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={saving}
              onClick={() => void setStatus(advance)}
            >
              {saving ? "Saving…" : `Advance → ${advance.replaceAll("_", " ")}`}
            </button>
          ) : null}
        </div>
      )}

      {/* ── Order lines ── */}
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>
        Order lines
        <span style={{ fontWeight: 400, fontSize: "0.8125rem", color: "var(--admin-text-muted)", marginLeft: 8 }}>
          {order.items_count} item{order.items_count !== 1 ? "s" : ""}
        </span>
      </h3>
      {order.lines.length === 0 ? (
        <div className={styles.empty}>No line items.</div>
      ) : (
        <div className={styles.tableWrap} style={{ marginBottom: "1.5rem" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col" style={{ textAlign: "center" }}>Qty</th>
                <th scope="col" style={{ textAlign: "right" }}>Unit price</th>
                <th scope="col" style={{ textAlign: "right" }}>Tax</th>
                <th scope="col" style={{ textAlign: "right" }}>Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => {
                const mods = Array.isArray(line.modifiers_snapshot) ? line.modifiers_snapshot : [];
                return (
                  <tr key={line.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{line.name_snapshot}</span>
                      {mods.length > 0 && (
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.75rem",
                            color: "var(--admin-text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {mods
                            .map((m: { name?: string; price_delta?: string }) => {
                              const delta = Number(m.price_delta ?? 0);
                              return delta !== 0
                                ? `${m.name} (+${money(String(delta))})`
                                : m.name;
                            })
                            .join(", ")}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>{line.quantity}</td>
                    <td style={{ textAlign: "right" }}>{money(line.unit_price)}</td>
                    <td style={{ textAlign: "right", color: "var(--admin-text-muted)", fontSize: "0.8125rem" }}>
                      {money(line.tax_snapshot)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{money(line.line_subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Financial summary ── */}
      <div
        style={{
          maxWidth: 340,
          marginLeft: "auto",
          padding: "1rem 1.25rem",
          borderRadius: 12,
          border: "1px solid var(--admin-border, rgba(255,255,255,0.065))",
          background: "var(--admin-surface, #13161f)",
          fontSize: "0.875rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "var(--admin-text-muted)" }}>Subtotal</span>
          <span>{money(order.subtotal)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "var(--admin-text-muted)" }}>Tax</span>
          <span>{money(order.tax_amount)}</span>
        </div>
        {hasFinancials && (
          <>
            {Number(order.service_charge_amount) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--admin-text-muted)" }}>Service charge</span>
                <span>{money(order.service_charge_amount)}</span>
              </div>
            )}
            {Number(order.tip_amount) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--admin-text-muted)" }}>Tip</span>
                <span>{money(order.tip_amount)}</span>
              </div>
            )}
          </>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 8,
            marginTop: 6,
            borderTop: "1px solid var(--admin-border, rgba(255,255,255,0.065))",
            fontWeight: 700,
            fontSize: "1rem",
          }}
        >
          <span>Total</span>
          <span>{money(order.total)}</span>
        </div>
      </div>
      {/* ── Activity log ── */}
      <h3
        style={{
          margin: "2rem 0 0.75rem",
          fontSize: "1rem",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        Activity log
        {logsLoading && (
          <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--admin-text-muted)" }}>
            loading…
          </span>
        )}
      </h3>
      {activityLogs.length === 0 && !logsLoading ? (
        <div
          style={{
            padding: "1.25rem",
            borderRadius: 12,
            border: "1px solid var(--admin-border, rgba(255,255,255,0.065))",
            background: "var(--admin-surface, #13161f)",
            fontSize: "0.8125rem",
            color: "var(--admin-text-muted)",
            textAlign: "center",
          }}
        >
          No activity recorded yet.
        </div>
      ) : (
        <div
          style={{
            position: "relative",
            paddingLeft: "1.75rem",
          }}
        >
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              left: "0.5rem",
              top: "0.25rem",
              bottom: "0.25rem",
              width: 2,
              borderRadius: 1,
              background: "var(--admin-border, rgba(255,255,255,0.065))",
            }}
          />

          {activityLogs.map((log, i) => {
            const isFirst = i === 0;
            const isLast = i === activityLogs.length - 1;
            const dotColor = logDotColor(log.new_status);
            return (
              <div
                key={log.id}
                style={{
                  position: "relative",
                  paddingBottom: isLast ? 0 : "1rem",
                }}
              >
                {/* Dot */}
                <div
                  style={{
                    position: "absolute",
                    left: "-1.75rem",
                    top: "0.15rem",
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: dotColor,
                    border: "2px solid var(--admin-bg-elevated, #0e1016)",
                    boxShadow: isLast ? `0 0 0 3px ${dotColor}33` : undefined,
                    zIndex: 1,
                  }}
                />

                {/* Content */}
                <div
                  style={{
                    padding: "0.55rem 0.85rem",
                    borderRadius: 10,
                    border: "1px solid var(--admin-border, rgba(255,255,255,0.065))",
                    background: isFirst || isLast
                      ? "var(--admin-surface, #13161f)"
                      : "transparent",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      marginBottom: "0.2rem",
                    }}
                  >
                    {log.old_status ? (
                      <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.1rem 0.4rem",
                            borderRadius: 5,
                            fontSize: "0.625rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            ...statusBadgeStyle(log.old_status),
                          }}
                        >
                          {log.old_status.replaceAll("_", " ")}
                        </span>
                        <span style={{ margin: "0 0.3rem", color: "var(--admin-text-muted)" }}>
                          &rarr;
                        </span>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.1rem 0.4rem",
                            borderRadius: 5,
                            fontSize: "0.625rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            ...statusBadgeStyle(log.new_status),
                          }}
                        >
                          {log.new_status.replaceAll("_", " ")}
                        </span>
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.1rem 0.4rem",
                          borderRadius: 5,
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          ...statusBadgeStyle(log.new_status),
                        }}
                      >
                        {log.new_status.replaceAll("_", " ")}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.65rem",
                      fontSize: "0.6875rem",
                      color: "var(--admin-text-muted)",
                    }}
                  >
                    <span
                      style={{ fontVariantNumeric: "tabular-nums" }}
                      title={new Date(log.created_at).toLocaleString()}
                    >
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" "}
                      {new Date(log.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {log.actor_label && (
                      <>
                        <span
                          style={{
                            width: 3,
                            height: 3,
                            borderRadius: "50%",
                            background: "var(--admin-text-muted)",
                            opacity: 0.35,
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>{log.actor_label}</span>
                      </>
                    )}
                    {log.note && (
                      <>
                        <span
                          style={{
                            width: 3,
                            height: 3,
                            borderRadius: "50%",
                            background: "var(--admin-text-muted)",
                            opacity: 0.35,
                          }}
                        />
                        <span style={{ fontStyle: "italic" }}>{log.note}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminInterior>
  );
}

function logDotColor(status: string): string {
  switch (status) {
    case "in_kitchen":
      return "#fbbf24";
    case "ready":
      return "#34d399";
    case "served":
      return "#64748b";
    case "cancelled":
      return "#f87171";
    case "draft":
      return "#6b7280";
    default:
      return "#8b919d";
  }
}

function statusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case "draft":
      return { background: "rgba(107,114,128,0.12)", color: "#9ca3af" };
    case "in_kitchen":
      return { background: "rgba(245,158,11,0.12)", color: "#fbbf24" };
    case "ready":
      return { background: "rgba(16,185,129,0.12)", color: "#34d399" };
    case "served":
      return { background: "rgba(100,116,139,0.12)", color: "#94a3b8" };
    case "cancelled":
      return { background: "rgba(220,38,38,0.12)", color: "#fecaca" };
    default:
      return { background: "rgba(139,145,157,0.12)", color: "#8b919d" };
  }
}
