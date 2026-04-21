import Link from "next/link";

import styles from "./AdminOverview.module.css";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function PlatformOverview() {
  const today = formatDate(new Date());

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <p className={styles.heroEyebrow}>Platform control</p>
        <h2 className={styles.heroTitle}>Good evening — here&apos;s your estate</h2>
        <p className={styles.heroSub}>
          {today}. Monitor organizations, compliance signals, and cross-tenant health from one
          console.
        </p>
      </header>

      <div className={styles.stats}>
        <article className={styles.stat}>
          <div className={styles.statIcon} aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 21V8l8-4v17M4 13h8M20 21V11l-4-2v12"
                stroke="currentColor"
                strokeWidth="1.75"
              />
            </svg>
          </div>
          <p className={styles.statLabel}>Organizations</p>
          <p className={styles.statValue}>24</p>
          <p className={styles.statHint}>+3 onboarded this quarter</p>
        </article>

        <article className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.statIconTeal}`} aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 20l-6-2V4l6 2 6-2 6 2v14l-6 2-6-2-6 2v-14l6-2z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
            </svg>
          </div>
          <p className={styles.statLabel}>Active locations</p>
          <p className={styles.statValue}>186</p>
          <p className={styles.statHint}>Across all tenants</p>
        </article>

        <article className={styles.stat}>
          <div className={styles.statIcon} aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
            </svg>
          </div>
          <p className={styles.statLabel}>Staff accounts</p>
          <p className={styles.statValue}>1,284</p>
          <p className={styles.statHint}>Role-scoped seats</p>
        </article>

        <article className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.statIconTeal}`} aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className={styles.statLabel}>Sessions (24h)</p>
          <p className={styles.statValue}>9.4k</p>
          <p className={styles.statHint}>QR dining sessions started</p>
        </article>
      </div>

      <div className={styles.grid2}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Tenant pulse</h3>
            <span className={styles.panelAction} style={{ cursor: "default" }}>
              Live mix (demo)
            </span>
          </div>
          <div className={styles.chartPlaceholder}>Chart connects to your analytics pipeline</div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Recent activity</h3>
            <Link href="/platform/audit" className={styles.panelAction}>
              View audit log
            </Link>
          </div>
          <ul className={styles.activity}>
            <li>
              <span className={styles.activityDot} aria-hidden />
              <div className={styles.activityBody}>
                <p className={styles.activityText}>New organization “Harbor Collective” verified</p>
                <p className={styles.activityMeta}>12 minutes ago · Provisioning</p>
              </div>
            </li>
            <li>
              <span className={`${styles.activityDot} ${styles.activityDotMuted}`} aria-hidden />
              <div className={styles.activityBody}>
                <p className={styles.activityText}>API rate limit policy updated (default tier)</p>
                <p className={styles.activityMeta}>2 hours ago · Platform</p>
              </div>
            </li>
            <li>
              <span className={`${styles.activityDot} ${styles.activityDotMuted}`} aria-hidden />
              <div className={styles.activityBody}>
                <p className={styles.activityText}>3 staff invites accepted · Northwind Bistro Group</p>
                <p className={styles.activityMeta}>Yesterday · Users</p>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <section className={styles.panel} style={{ marginTop: "1.25rem" }}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Quick actions</h3>
        </div>
        <div className={styles.quickLinks}>
          <Link href="/platform/organizations" className={styles.quickLink}>
            Review organizations <span>→</span>
          </Link>
          <Link href="/platform/users" className={styles.quickLink}>
            Search users & roles <span>→</span>
          </Link>
          <Link href="/platform/audit" className={styles.quickLink}>
            Export audit trail <span>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
