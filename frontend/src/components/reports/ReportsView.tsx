"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/locations/Locations.module.css";
import { listAllOrders, type Order } from "@/lib/api/orders";
import { useLocationCtx } from "@/store/LocationContext";

function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatMoney(s: string) {
  const n = Number(s);
  if (Number.isNaN(n)) return s;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ReportsView() {
  const { locationId, locations } = useLocationCtx();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const load = useCallback(async () => {
    if (!locationId) return;
    setError(null);
    setLoading(true);
    const or = await listAllOrders({ location: locationId });
    setLoading(false);
    if (!or.ok) {
      setError(or.message);
      setOrders([]);
      return;
    }
    setOrders(or.items);
  }, [locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = useMemo(() => startOfLocalDay(new Date()), []);

  const stats = useMemo(() => {
    const dayOrders = orders.filter((o) => {
      const t = new Date(o.created_at);
      return t >= today;
    });
    const completed = dayOrders.filter((o) => o.status === "served");
    const sum = completed.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const byStatus: Record<string, number> = {};
    for (const o of dayOrders) {
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    }
    return {
      countToday: dayOrders.length,
      completedTotal: sum,
      completedCount: completed.length,
      byStatus,
    };
  }, [orders, today]);

  const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? id.slice(0, 8);

  return (
    <AdminInterior
      title="Reports"
      description="Same-day snapshot from stored orders (aggregated in the browser; capped by API pagination depth)."
    >
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <div className={styles.toolbar}>
        <button type="button" className={styles.btn} onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <div className={styles.cardGrid}>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Orders today</p>
            <p className={styles.statValue}>{stats.countToday}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Served orders (today)</p>
            <p className={styles.statValue}>{stats.completedCount}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Served revenue (today)</p>
            <p className={styles.statValue} style={{ fontSize: "1.25rem" }}>
              {formatMoney(String(stats.completedTotal))}
            </p>
          </div>
        </div>
      )}

      {!loading && orders.length > 0 ? (
        <>
          <h3 style={{ margin: "1.5rem 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>Today by status</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Count (today)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.byStatus).map(([k, v]) => (
                  <tr key={k}>
                    <td>{k.replaceAll("_", " ")}</td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: "1.5rem 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>Recent orders</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Location</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 25).map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontSize: "0.8125rem", color: "var(--admin-text-muted)" }}>
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td>{locName(o.location)}</td>
                    <td>
                      <span className={styles.badge}>{o.status.replaceAll("_", " ")}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>{formatMoney(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </AdminInterior>
  );
}
