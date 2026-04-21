"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchMe, type MeUser } from "@/lib/api/me";

import { AccountShell } from "./AccountShell";
import styles from "./AccountShell.module.css";

export function AccountOverview() {
  const [me, setMe] = useState<MeUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetchMe();
      if (cancelled || !r.ok) return;
      setMe(r.user);
    })();
    return () => { cancelled = true; };
  }, []);

  const firstName = me?.first_name || "there";

  return (
    <AccountShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Welcome back, {firstName}</h1>
        <p className={styles.pageDesc}>
          Manage your profile, view your order history, and keep your account up to date.
        </p>
      </div>

      <div className={styles.overviewGrid}>
        <Link href="/account/profile" className={styles.overviewCard}>
          <span className={`${styles.overviewIcon} ${styles.overviewIconAccent}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <div>
            <p className={styles.overviewCardTitle}>Profile settings</p>
            <p className={styles.overviewCardDesc}>
              Update your name, phone number, and password.
            </p>
          </div>
        </Link>

        <Link href="/account/orders" className={styles.overviewCard}>
          <span className={`${styles.overviewIcon} ${styles.overviewIconTeal}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" />
            </svg>
          </span>
          <div>
            <p className={styles.overviewCardTitle}>Order history</p>
            <p className={styles.overviewCardDesc}>
              Browse past orders, view receipts and track status.
            </p>
          </div>
        </Link>
      </div>

      {me && (
        <div style={{ marginTop: "2rem" }}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Account details</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.formGrid} style={{ maxWidth: 480 }}>
                <div className={styles.field}>
                  <span className={styles.label}>Name</span>
                  <span style={{ fontSize: "0.9375rem", color: "var(--ink)" }}>
                    {me.first_name} {me.last_name}
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Email</span>
                  <span style={{ fontSize: "0.9375rem", color: "var(--ink)" }}>
                    {me.email}
                  </span>
                </div>
                {me.phone && (
                  <div className={styles.field}>
                    <span className={styles.label}>Phone</span>
                    <span style={{ fontSize: "0.9375rem", color: "var(--ink)" }}>
                      {me.phone}
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.actions} style={{ marginTop: "1rem" }}>
                <Link href="/account/profile" className={styles.btnGhost}>
                  Edit profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </AccountShell>
  );
}
