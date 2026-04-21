"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import { fetchMe } from "@/lib/api/me";
import { listLocations, type Location } from "@/lib/api/locations";
import { listOrganizations } from "@/lib/api/organizations";

import styles from "./Locations.module.css";

export function LocationsListView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [orgsById, setOrgsById] = useState<Record<string, string>>({});
  const [canCreate, setCanCreate] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const meRes = await fetchMe();
    if (!meRes.ok) {
      setError(meRes.message + " — try signing in again.");
      setLoading(false);
      return;
    }
    const hasOrg = meRes.user.organization_memberships.length > 0;
    setCanCreate(meRes.user.is_platform_admin || hasOrg);

    const [locRes, orgRes] = await Promise.all([listLocations(), listOrganizations()]);
    if (!locRes.ok) {
      setError(locRes.message);
      setLoading(false);
      return;
    }
    setLocations(locRes.items);
    if (orgRes.ok) {
      const map: Record<string, string> = {};
      for (const o of orgRes.items) map[o.id] = o.name;
      setOrgsById(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminInterior
      title="Locations"
      description="Venues across your organization—tax, tips, and service rules per site."
    >
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <div className={styles.toolbar}>
        {canCreate ? (
          <Link href="/dashboard/locations/new" className={`${styles.btn} ${styles.btnPrimary}`}>
            Add location
          </Link>
        ) : null}
        <button type="button" className={styles.btn} onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading locations…</div>
      ) : locations.length === 0 ? (
        <div className={styles.empty}>
          No locations yet.
          {canCreate ? (
            <>
              {" "}
              <Link href="/dashboard/locations/new" className={styles.link}>
                Create the first one
              </Link>
              .
            </>
          ) : null}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Organization</th>
                <th scope="col">City</th>
                <th scope="col">Timezone</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id}>
                  <td>
                    <Link href={`/dashboard/locations/${loc.id}`} className={styles.link}>
                      {loc.name}
                    </Link>
                    <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted, #8b919d)" }}>
                      {loc.slug}
                    </div>
                  </td>
                  <td>{orgsById[loc.organization] ?? loc.organization.slice(0, 8) + "…"}</td>
                  <td>{loc.city || "—"}</td>
                  <td style={{ fontSize: "0.75rem" }}>{loc.timezone}</td>
                  <td>
                    <span className={loc.is_active ? styles.badge : `${styles.badge} ${styles.badgeOff}`}>
                      {loc.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminInterior>
  );
}
