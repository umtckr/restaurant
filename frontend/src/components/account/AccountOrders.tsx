"use client";

import { useCallback, useEffect, useState } from "react";

import { listOrders, type Order, type OrderStatus } from "@/lib/api/orders";
import type { Paged } from "@/lib/api/http";

import { AccountShell } from "./AccountShell";
import styles from "./AccountShell.module.css";

const STATUS_STYLE: Record<string, string> = {
  completed: styles.badgeGreen,
  served: styles.badgeGreen,
  ready: styles.badgeTeal ?? styles.badgeGreen,
  confirmed: styles.badgeAmber,
  in_kitchen: styles.badgeAmber,
  submitted: styles.badgeAmber,
  cancelled: styles.badgeRed,
  draft: styles.badgeMuted,
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  confirmed: "Confirmed",
  in_kitchen: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtPrice(amount: string) {
  const n = parseFloat(amount);
  if (isNaN(n)) return amount;
  return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AccountOrders() {
  const [loading, setLoading] = useState(true);
  const [paged, setPaged] = useState<Paged<Order> | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params: { page: number; status?: OrderStatus } = { page };
    if (filter !== "all") params.status = filter;
    const r = await listOrders(params);
    if (!r.ok) {
      setError(r.message);
    } else {
      setPaged(r.paged);
    }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = paged ? Math.max(1, Math.ceil(paged.count / 25)) : 1;

  return (
    <AccountShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>My orders</h1>
        <p className={styles.pageDesc}>
          View your order history and track the status of recent orders.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <h2 className={styles.cardTitle}>Order history</h2>
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value as OrderStatus | "all"); setPage(1); }}
            style={{
              padding: "0.4rem 0.7rem",
              fontSize: "0.8125rem",
              fontFamily: "inherit",
              borderRadius: 8,
              border: "1px solid var(--border-strong)",
              background: "var(--canvas)",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            <option value="all">All orders</option>
            <option value="submitted">Submitted</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_kitchen">Preparing</option>
            <option value="ready">Ready</option>
            <option value="served">Served</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {error && (
          <div style={{ padding: "0 1.5rem" }}>
            <div className={styles.errorBanner}>{error}</div>
          </div>
        )}

        {loading ? (
          <div className={styles.cardBody} style={{ textAlign: "center", color: "var(--ink-subtle)", padding: "3rem" }}>
            Loading orders...
          </div>
        ) : !paged || paged.items.length === 0 ? (
          <div className={styles.cardBody}>
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" />
                </svg>
              </div>
              <p className={styles.emptyTitle}>No orders yet</p>
              <p className={styles.emptyDesc}>
                When you place orders at a Dinebird restaurant, they will appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Restaurant</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.items.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.location_name}</div>
                        {order.table_label && (
                          <div style={{ fontSize: "0.75rem", color: "var(--ink-subtle)", marginTop: 2 }}>
                            Table {order.table_label}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(order.created_at)}</td>
                      <td>{order.items_count} item{order.items_count !== 1 ? "s" : ""}</td>
                      <td>
                        <span className={styles.price}>{fmtPrice(order.total)}</span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${STATUS_STYLE[order.status] ?? styles.badgeMuted}`}>
                          {STATUS_LABEL[order.status] ?? order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.75rem",
                padding: "1rem 1.5rem",
                borderTop: "1px solid var(--border)",
              }}>
                <button
                  className={styles.btnGhost}
                  style={{ padding: "0.4rem 0.85rem", fontSize: "0.8125rem" }}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span style={{ fontSize: "0.8125rem", color: "var(--ink-subtle)" }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className={styles.btnGhost}
                  style={{ padding: "0.4rem 0.85rem", fontSize: "0.8125rem" }}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AccountShell>
  );
}
