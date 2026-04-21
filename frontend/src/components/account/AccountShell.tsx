"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getAccessToken } from "@/lib/api/http";
import { fetchMe, type MeUser } from "@/lib/api/me";
import { logout } from "@/lib/auth/session";

import styles from "./AccountShell.module.css";

const NAV = [
  {
    href: "/account",
    label: "Overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/account/profile",
    label: "Profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: "/account/orders",
    label: "My orders",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/account") return pathname === "/account";
  return pathname.startsWith(href);
}

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeUser | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await fetchMe();
      if (cancelled) return;
      if (!r.ok) { logout(); return; }
      setMe(r.user);
    })();
    return () => { cancelled = true; };
  }, [router]);

  const initials = me
    ? `${me.first_name?.[0] ?? ""}${me.last_name?.[0] ?? ""}`.toUpperCase() || me.email[0].toUpperCase()
    : "";
  const displayName = me
    ? `${me.first_name} ${me.last_name}`.trim() || me.email
    : "";

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark} aria-hidden />
            Dinebird
          </Link>
          <div className={styles.topbarRight}>
            {me && (
              <span className={styles.topbarUser}>
                <span className={styles.avatar}>{initials}</span>
                <span>{displayName}</span>
              </span>
            )}
            <button type="button" className={styles.signOutBtn} onClick={() => logout()}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <nav className={styles.sidebar} aria-label="Account navigation">
          <span className={styles.sidebarLabel}>Account</span>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive(pathname, item.href) ? styles.navLinkActive : ""}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
