"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { logout } from "@/lib/auth/session";
import { useLocationCtx } from "@/store/LocationContext";
import { useMe } from "@/store/MeContext";

import {
  filterNavForRoles,
  operationsNav,
  platformAdminNav,
  type AdminNavItem,
  type StaffRole,
} from "./adminConfig";
import { NavIcon } from "./AdminIcons";
import styles from "./AdminShell.module.css";

type Variant = "platform" | "operations";

const titles: Record<Variant, { badge: string; home: string }> = {
  platform: { badge: "Platform", home: "/platform" },
  operations: { badge: "Console", home: "/dashboard" },
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/platform" || href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  variant,
  children,
  pageTitle,
}: {
  variant: Variant;
  children: React.ReactNode;
  pageTitle?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { me } = useMe();
  const meta = titles[variant];

  const nav = useMemo(() => {
    if (variant === "platform") return platformAdminNav;
    if (!me) return operationsNav;
    const userRoles = [...new Set(
      me.organization_memberships.map((m) => m.role as StaffRole)
    )];
    return filterNavForRoles(operationsNav, userRoles, me.is_platform_admin);
  }, [variant, me]);

  const resolvedTitle = useMemo(() => {
    if (pageTitle) return pageTitle;
    const match = nav.find((item) => isActive(pathname, item.href));
    return match?.label ?? "Overview";
  }, [pageTitle, pathname, nav]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!me) return;
    if (variant !== "operations") return;
    if (!pathname?.startsWith("/dashboard")) return;
    if (pathname.startsWith("/dashboard/onboarding")) return;
    if (me.is_platform_admin) return;

    const memberships = me.organization_memberships;
    if (memberships.length === 0) return;
    const allActive = memberships.every((m) => m.onboarding_status === "active");
    if (!allActive) {
      router.replace("/dashboard/onboarding");
    }
  }, [me, variant, pathname, router]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const initials = me
    ? `${me.first_name?.[0] ?? ""}${me.last_name?.[0] ?? ""}`.toUpperCase() || "TL"
    : "TL";
  const displayName = me
    ? `${me.first_name} ${me.last_name}`.trim() || me.email
    : "Signed in";

  return (
    <div className={styles.shell}>
      <button
        type="button"
        className={
          sidebarOpen
            ? `${styles.sidebarOverlay} ${styles.sidebarOverlayVisible}`
            : styles.sidebarOverlay
        }
        aria-label="Close menu"
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        id="admin-sidebar-nav"
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
        aria-label="Main navigation"
      >
        <div className={styles.sidebarHeader}>
          <Link href={meta.home} className={styles.brand} onClick={() => setSidebarOpen(false)}>
            <span className={styles.brandMark} aria-hidden />
            <span className={styles.brandText}>
              <span className={styles.brandName}>Dinebird</span>
              <span className={styles.brandBadge}>{meta.badge}</span>
            </span>
          </Link>
        </div>

        <nav className={styles.nav} aria-label="Workspace">
          <span className={styles.navLabel}>Navigate</span>
          {nav.map((item: AdminNavItem) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={styles.navIcon}>
                  <NavIcon name={item.icon} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar} aria-hidden>
              {initials}
            </div>
            <div className={styles.userMeta}>
              <div className={styles.userName}>{displayName}</div>
              <div className={styles.userRole}>
                {variant === "platform"
                  ? "Platform administrator"
                  : me?.is_platform_admin
                    ? "Platform admin"
                    : (() => {
                        const roles = [...new Set(me?.organization_memberships.map((m) => m.role) ?? [])];
                        const labels: Record<string, string> = {
                          org_admin: "Admin",
                          manager: "Manager",
                          waiter: "Waiter",
                          kitchen: "Kitchen",
                          host: "Host",
                        };
                        return roles.map((r) => labels[r] ?? r).join(", ") || "Member";
                      })()}
              </div>
            </div>
          </div>
          <button type="button" className={styles.exitLink} onClick={() => logout()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.menuBtn}
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar-nav"
              onClick={() => setSidebarOpen((o) => !o)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <h1 className={styles.pageTitle}>{resolvedTitle}</h1>
          </div>
          <div className={styles.headerRight}>
            {variant === "operations" && <LocationSwitcher />}
            <button type="button" className={styles.iconBtn} aria-label="Notifications" disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

function LocationSwitcher() {
  const { locations, locationId, setLocationId, loading } = useLocationCtx();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = locations.find((l) => l.id === locationId);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open, close]);

  if (locations.length === 0 && !loading) return null;

  return (
    <div className={styles.locSwitcher} ref={ref}>
      <button
        type="button"
        className={styles.locTrigger}
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={styles.locDot} aria-hidden />
        <span className={styles.locName}>{selected?.name ?? "Select location"}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={`${styles.locChevron} ${open ? styles.locChevronUp : ""}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className={styles.locDropdown} role="listbox">
          {locations.map((l) => {
            const active = l.id === locationId;
            return (
              <button
                key={l.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`${styles.locOption} ${active ? styles.locOptionActive : ""}`}
                onClick={() => {
                  setLocationId(l.id);
                  close();
                }}
              >
                <span className={styles.locOptDot} aria-hidden />
                <span className={styles.locOptName}>{l.name}</span>
                {active && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className={styles.locCheck}>
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
