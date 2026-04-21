"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { listLocations } from "@/lib/api/locations";
import { listAllOrders } from "@/lib/api/orders";
import { listDiningSessions } from "@/lib/api/sessions";
import { getMySubscription, type SubscriptionSummary } from "@/lib/api/subscriptions";

import styles from "./AdminOverview.module.css";

function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function OperationsOverview() {
  const [loading, setLoading] = useState(true);
  const [openSessions, setOpenSessions] = useState(0);
  const [locationsCount, setLocationsCount] = useState(0);
  const [ordersToday, setOrdersToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);

  const todayStart = useMemo(() => startOfLocalDay(new Date()), []);

  const load = useCallback(async () => {
    setLoading(true);
    const [lr, sr, or, subRes] = await Promise.all([
      listLocations(),
      listDiningSessions({ status: "open", page: 1 }),
      listAllOrders(),
      getMySubscription(),
    ]);
    if (lr.ok) setLocationsCount(lr.items.length);
    if (sr.ok) setOpenSessions(sr.paged.count);
    if (or.ok) {
      const day = or.items.filter((o) => {
        const t = new Date(o.created_at);
        return t >= todayStart && o.status === "completed";
      });
      setOrdersToday(
        or.items.filter((o) => {
          const t = new Date(o.created_at);
          return t >= todayStart;
        }).length,
      );
      setRevenueToday(day.reduce((acc, o) => acc + Number(o.total || 0), 0));
    }
    if (subRes.ok) setSubscription(subRes.summary);
    setLoading(false);
  }, [todayStart]);

  useEffect(() => {
    void load();
  }, [load]);

  const fmtMoney = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <p className={styles.heroEyebrow}>Operations</p>
        <h2 className={styles.heroTitle}>Tonight&apos;s service, at a glance</h2>
        <p className={styles.heroSub}>
          Live counts from your API—sessions, locations, and today&apos;s order volume.
        </p>
      </header>

      <div className={styles.stats}>
        <article className={styles.stat}>
          <div className={styles.statIcon} aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="1.75"
              />
            </svg>
          </div>
          <p className={styles.statLabel}>Open sessions</p>
          <p className={styles.statValue}>{loading ? "—" : openSessions}</p>
          <p className={styles.statHint}>
            {loading ? "…" : `${locationsCount} location${locationsCount === 1 ? "" : "s"} accessible`}
          </p>
        </article>

        <article className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.statIconTeal}`} aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
              <path
                d="M14 14h3v3M17 17v4M14 21h7"
                stroke="currentColor"
                strokeWidth="1.75"
              />
            </svg>
          </div>
          <p className={styles.statLabel}>Orders today</p>
          <p className={styles.statValue}>{loading ? "—" : ordersToday}</p>
          <p className={styles.statHint}>All statuses · paginated fetch</p>
        </article>

        <article className={styles.stat}>
          <div className={styles.statIcon} aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className={styles.statLabel}>Completed revenue today</p>
          <p className={styles.statValue}>{loading ? "—" : fmtMoney(revenueToday)}</p>
          <p className={styles.statHint}>Sum of completed orders since midnight (local)</p>
        </article>

        <article className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.statIconTeal}`} aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 20h0a2.5 2.5 0 0 0 2.5-2.5c0-1.5-1-2-1-3.5a4 4 0 0 1 4 4c0 2.5-2.5 4.5-6 4.5-3.5 0-6-2.5-6-5 0-2.5 2-4.5 3-6.5 1 2 2 3.5 2 5.5z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
            </svg>
          </div>
          <p className={styles.statLabel}>Kitchen queue</p>
          <p className={styles.statValue}>—</p>
          <p className={styles.statHint}>Use the kitchen board for live tickets</p>
        </article>
      </div>

      <div className={styles.grid2}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Service rhythm</h3>
            <span className={styles.panelAction} style={{ cursor: "default" }}>
              Live data
            </span>
          </div>
          <div className={styles.chartPlaceholder}>
            {loading
              ? "Loading metrics…"
              : `Open sessions: ${openSessions}. Orders since midnight: ${ordersToday}.`}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Shortcuts</h3>
            <Link href="/dashboard/orders" className={styles.panelAction}>
              Orders
            </Link>
          </div>
          <ul className={styles.activity}>
            <li>
              <span className={styles.activityDot} aria-hidden />
              <div className={styles.activityBody}>
                <p className={styles.activityText}>
                  {loading ? "Loading…" : `${openSessions} open guest sessions`}
                </p>
                <p className={styles.activityMeta}>Floor · QR dining</p>
              </div>
            </li>
            <li>
              <span className={`${styles.activityDot} ${styles.activityDotMuted}`} aria-hidden />
              <div className={styles.activityBody}>
                <p className={styles.activityText}>
                  {loading ? "…" : `${ordersToday} orders today (all statuses)`}
                </p>
                <p className={styles.activityMeta}>Operations</p>
              </div>
            </li>
          </ul>
        </section>
      </div>

      {subscription?.has_subscription && (
        <section className={styles.panel} style={{ marginTop: "1.25rem" }}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Subscription</h3>
            <Link href="/dashboard/settings" className={styles.panelAction}>
              Manage
            </Link>
          </div>
          <div style={{ padding: "1rem 1.35rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "1rem", fontWeight: 600 }}>
                {subscription.plan_name}
              </span>
              <span
                className={
                  subscription.status === "active" || subscription.status === "trialing"
                    ? styles.activityDot
                    : `${styles.activityDot} ${styles.activityDotMuted}`
                }
                style={{ width: 8, height: 8 }}
                aria-hidden
              />
              <span style={{ fontSize: "0.8125rem", color: "#8b919d", textTransform: "capitalize" }}>
                {subscription.status === "trialing" ? "Trial" : subscription.status}
                {subscription.billing_cycle ? ` · ${subscription.billing_cycle}` : ""}
              </span>
            </div>
            {subscription.trial_end && subscription.status === "trialing" && (
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.8125rem", color: "#8b919d" }}>
                Trial ends {new Date(subscription.trial_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
            {subscription.limits && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem" }}>
                {Object.entries(subscription.limits).map(([key, val]) => (
                  <div key={key} style={{ fontSize: "0.8125rem" }}>
                    <span style={{ color: "#8b919d", textTransform: "capitalize" }}>
                      {key.replace(/_/g, " ")}
                    </span>
                    <span style={{ display: "block", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {val.current} / {val.max === -1 ? "∞" : val.max}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className={styles.panel} style={{ marginTop: "1.25rem" }}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Shortcuts</h3>
        </div>
        <div className={styles.quickLinks}>
          <Link href="/dashboard/floor" className={styles.quickLink}>
            Floor live view <span>→</span>
          </Link>
          <Link href="/dashboard/kitchen" className={styles.quickLink}>
            Kitchen queue <span>→</span>
          </Link>
          <Link href="/dashboard/locations" className={styles.quickLink}>
            Locations <span>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
