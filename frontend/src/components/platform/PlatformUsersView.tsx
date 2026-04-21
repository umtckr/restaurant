"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/admin/AdminInterior.module.css";
import { listOrganizations, type Organization } from "@/lib/api/organizations";
import { listStaffAssignments, type StaffAssignment } from "@/lib/api/staff";

export function PlatformUsersView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffAssignment[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [sr, or] = await Promise.all([listStaffAssignments(), listOrganizations()]);
    setLoading(false);
    if (!sr.ok) {
      setError(sr.message);
      return;
    }
    setRows(sr.paged.items);
    if (or.ok) setOrgs(or.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);

  return (
    <AdminInterior
      title="Users"
      description="Staff assignments across organizations (closest available to a global directory)."
    >
      {error ? (
        <div
          style={{
            padding: "0.85rem 1rem",
            borderRadius: 10,
            background: "rgba(220, 38, 38, 0.12)",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <p style={{ color: "var(--admin-text-muted)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "var(--admin-text-muted)" }}>No staff assignments yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">User ID</th>
                <th scope="col">Organization</th>
                <th scope="col">Role</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.user_email}</td>
                  <td style={{ color: "var(--admin-text-muted)" }}>{r.user}</td>
                  <td>{orgName(r.organization)}</td>
                  <td>{r.role.replaceAll("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminInterior>
  );
}
