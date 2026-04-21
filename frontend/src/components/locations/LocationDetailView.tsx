"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  CreditCard,
  Globe,
  Landmark,
  MapPin,
  Percent,
  Settings,
  SquareMenu,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import { getLocation, deleteLocation, listTables, type Location, type Table } from "@/lib/api/locations";
import { listOrganizations } from "@/lib/api/organizations";
import { listMenuLocations, type MenuLocation } from "@/lib/api/menus";
import { listDiningSessions } from "@/lib/api/sessions";
import { useMe } from "@/store/MeContext";
import { TIP_MODE_OPTIONS, SERVICE_CHARGE_APPLY_OPTIONS } from "./locations.constants";

import styles from "./Locations.module.css";

function tipModeLabel(val: string) {
  return TIP_MODE_OPTIONS.find((o) => o.value === val)?.label ?? val;
}

function serviceChargeApplyLabel(val: string) {
  return SERVICE_CHARGE_APPLY_OPTIONS.find((o) => o.value === val)?.label ?? val;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatAddress(loc: Location): string {
  const parts = [loc.address_line1, loc.address_line2, loc.city, loc.country].filter(Boolean);
  return parts.join(", ") || "—";
}

export function LocationDetailView() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.locationId === "string" ? params.locationId : "";
  const { me } = useMe();
  const isPlatformAdmin = me?.is_platform_admin ?? false;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loc, setLoc] = useState<Location | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [tables, setTables] = useState<Table[]>([]);
  const [activeMenuName, setActiveMenuName] = useState<string | null>(null);
  const [openSessionCount, setOpenSessionCount] = useState<number>(0);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);

    const locRes = await getLocation(id);

    if (!locRes.ok) {
      setError(locRes.message);
      setLoc(null);
      setLoading(false);
      return;
    }
    const location = locRes.location;
    setLoc(location);

    const [orgsRes, tablesRes, menuLocsRes, sessionsRes] = await Promise.all([
      listOrganizations(),
      listTables(id),
      listMenuLocations({ location: id }),
      listDiningSessions({ location: id, status: "open" }),
    ]);

    if (orgsRes.ok) {
      const o = orgsRes.items.find((x) => x.id === location.organization);
      setOrgName(o?.name ?? "");
    }
    if (tablesRes.ok) setTables(tablesRes.items);
    if (menuLocsRes.ok) {
      const active = menuLocsRes.items.find((ml: MenuLocation) => ml.is_active);
      if (active) {
        const { listMenus } = await import("@/lib/api/menus");
        const menusRes = await listMenus({ organization: location.organization });
        if (menusRes.ok) {
          const m = menusRes.paged.items.find((x) => x.id === active.menu);
          setActiveMenuName(m?.name ?? null);
        }
      }
    }
    if (sessionsRes.ok) setOpenSessionCount(sessionsRes.paged.count);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete() {
    if (!loc || !isPlatformAdmin) return;
    if (!window.confirm(`Delete location "${loc.name}"? This cannot be undone.`)) return;
    const res = await deleteLocation(loc.id);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push("/dashboard/locations");
    router.refresh();
  }

  if (!id) {
    return (
      <AdminInterior title="Location" description="">
        <div className={styles.errorBanner}>Invalid location.</div>
      </AdminInterior>
    );
  }

  if (loading) {
    return (
      <AdminInterior title="Location" description="">
        <div className={styles.loading}>Loading…</div>
      </AdminInterior>
    );
  }

  if (error || !loc) {
    return (
      <AdminInterior title="Location" description="">
        <div className={styles.errorBanner}>{error ?? "Not found"}</div>
        <Link href="/dashboard/locations" className={styles.link}>
          ← All locations
        </Link>
      </AdminInterior>
    );
  }

  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);

  return (
    <AdminInterior
      title={loc.name}
      description={`${orgName || "Organization"} · ${loc.slug}`}
    >
      <p style={{ marginBottom: "1.25rem" }}>
        <Link href="/dashboard/locations" className={styles.link}>
          ← Locations
        </Link>
      </p>

      {/* ── Status + quick stats ── */}
      <div className={styles.cardGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Status</p>
          <p className={styles.statValue} style={{ fontSize: "1rem" }}>
            <span className={loc.is_active ? styles.badge : `${styles.badge} ${styles.badgeOff}`}>
              {loc.is_active ? "Active" : "Inactive"}
            </span>
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Tables</p>
          <p className={styles.statValue} style={{ fontSize: "1.1rem" }}>
            {tables.length}
            <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--admin-text-muted, #8b919d)", marginLeft: "0.35rem" }}>
              ({totalCapacity} seats)
            </span>
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Open sessions</p>
          <p className={styles.statValue} style={{ fontSize: "1.1rem" }}>
            {openSessionCount}
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Active menu</p>
          <p className={styles.statValue} style={{ fontSize: "0.95rem" }}>
            {activeMenuName ?? <span style={{ color: "var(--admin-text-muted, #8b919d)" }}>None assigned</span>}
          </p>
        </div>
      </div>

      {/* ── Detail sections ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.5rem" }}>

        {/* Address & Region */}
        <div className={styles.statCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <MapPin size={16} style={{ color: "#c45c26", flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Address & Region</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem 1.5rem" }}>
            <div>
              <p className={styles.statLabel}>Address</p>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>{formatAddress(loc)}</p>
            </div>
            <div>
              <p className={styles.statLabel}>City</p>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>{loc.city || "—"}</p>
            </div>
            <div>
              <p className={styles.statLabel}>Country</p>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>{loc.country || "—"}</p>
            </div>
            <div>
              <p className={styles.statLabel}>Timezone</p>
              <p style={{ margin: 0, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Globe size={13} style={{ color: "var(--admin-text-muted, #8b919d)" }} />
                {loc.timezone}
              </p>
            </div>
            <div>
              <p className={styles.statLabel}>Currency</p>
              <p style={{ margin: 0, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <CreditCard size={13} style={{ color: "var(--admin-text-muted, #8b919d)" }} />
                {loc.currency_code}
              </p>
            </div>
          </div>
        </div>

        {/* Tax & Service Charge */}
        <div className={styles.statCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Percent size={16} style={{ color: "#c45c26", flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Tax & Service Charge</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem 1.5rem" }}>
            <div>
              <p className={styles.statLabel}>Tax rate</p>
              <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>{loc.tax_rate_percent}%</p>
            </div>
            <div>
              <p className={styles.statLabel}>Service charge</p>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>
                {loc.service_charge_enabled ? (
                  <span className={styles.badge}>{loc.service_charge_percent ?? 0}% — {serviceChargeApplyLabel(loc.service_charge_apply)}</span>
                ) : (
                  <span className={`${styles.badge} ${styles.badgeOff}`}>Disabled</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tip Configuration */}
        <div className={styles.statCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Landmark size={16} style={{ color: "#c45c26", flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Tip Configuration</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem 1.5rem" }}>
            <div>
              <p className={styles.statLabel}>Tip mode</p>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>{tipModeLabel(loc.tip_mode)}</p>
            </div>
            {loc.tip_mode === "suggested" && loc.tip_presets_percent.length > 0 && (
              <div>
                <p className={styles.statLabel}>Suggested presets</p>
                <p style={{ margin: 0, fontSize: "0.875rem", display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {loc.tip_presets_percent.map((p) => (
                    <span key={p} className={styles.badge}>{p}%</span>
                  ))}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div className={styles.statCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Calendar size={16} style={{ color: "#c45c26", flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Timestamps</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem 1.5rem" }}>
            <div>
              <p className={styles.statLabel}>Created</p>
              <p style={{ margin: 0, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Clock size={13} style={{ color: "var(--admin-text-muted, #8b919d)" }} />
                {formatDate(loc.created_at)}
              </p>
            </div>
            <div>
              <p className={styles.statLabel}>Last updated</p>
              <p style={{ margin: 0, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Clock size={13} style={{ color: "var(--admin-text-muted, #8b919d)" }} />
                {formatDate(loc.updated_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className={styles.actions}>
        <Link href={`/dashboard/locations/${loc.id}/settings`} className={`${styles.btn} ${styles.btnPrimary}`}>
          <Settings size={14} style={{ marginRight: "0.3rem" }} />
          Settings & pricing
        </Link>
        <Link href={`/dashboard/locations/${loc.id}/tables`} className={styles.btn}>
          <UtensilsCrossed size={14} style={{ marginRight: "0.3rem" }} />
          Tables
        </Link>
        <Link href="/dashboard/menus/assignments" className={styles.btn}>
          <SquareMenu size={14} style={{ marginRight: "0.3rem" }} />
          Menu assignments
        </Link>
        {isPlatformAdmin && (
          <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => void handleDelete()}>
            <Trash2 size={14} style={{ marginRight: "0.3rem" }} />
            Delete location
          </button>
        )}
      </div>
    </AdminInterior>
  );
}
