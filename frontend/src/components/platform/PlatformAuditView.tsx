"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/admin/AdminInterior.module.css";
import { listAuditLogs, type AuditLogRow } from "@/lib/api/platform";

export function PlatformAuditView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await listAuditLogs(page);
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      setRows([]);
      return;
    }
    setRows(r.paged.items);
    setHasNext(!!r.paged.next);
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminInterior
      title="Audit log"
      description="Privileged actions recorded by the platform (read-only)."
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

      {loading && rows.length === 0 ? (
        <p style={{ color: "var(--admin-text-muted)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "var(--admin-text-muted)" }}>No audit entries.</p>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Time (UTC)</th>
                  <th scope="col">Action</th>
                  <th scope="col">Object</th>
                  <th scope="col">Target id</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontVariantNumeric: "tabular-nums", color: "var(--admin-text-muted, #8b919d)" }}>
                      {new Date(e.created_at).toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td>
                      <code
                        style={{
                          fontSize: "0.75rem",
                          background: "var(--admin-bg-elevated, #0e1016)",
                          padding: "0.2rem 0.45rem",
                          borderRadius: 6,
                        }}
                      >
                        {e.action}
                      </code>
                    </td>
                    <td>{e.object_type}</td>
                    <td>{e.object_id || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.toolbar}>
            <button type="button" className={styles.btn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </button>
            <button type="button" className={styles.btn} disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </AdminInterior>
  );
}
