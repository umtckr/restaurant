"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiFetch, formatApiError, unwrapPaged, type Paged } from "@/lib/api/http";
import { PlatformPlansView } from "@/components/platform/PlatformPlansView";

import { AdminInterior } from "./AdminInterior";
import styles from "./AdminInterior.module.css";
import tabStyles from "@/components/platform/PlatformSettingsView.module.css";

type Tab = "plans" | "subscriptions";

function tabFromParam(raw: string | null): Tab {
  if (raw === "subscriptions") return "subscriptions";
  return "plans";
}

type OrgSubscription = {
  id: string;
  organization_name: string;
  plan_name: string;
  plan_slug: string;
  status: string;
  billing_cycle: "monthly" | "annual";
  trial_end: string | null;
  current_period_end: string | null;
  created_at: string;
};

const statusLabel: Record<string, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  cancelled: "Cancelled",
  expired: "Expired",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function OrgSubscriptionsPanel() {
  const [loading, setLoading] = useState(true);
  const [paged, setPaged] = useState<Paged<OrgSubscription> | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const q = new URLSearchParams({ page: String(page) });
    if (statusFilter !== "all") q.set("status", statusFilter);
    const res = await apiFetch(`platform/subscriptions/?${q}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(formatApiError(data));
    } else {
      setPaged(unwrapPaged<OrgSubscription>(data));
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = paged ? Math.max(1, Math.ceil(paged.count / 25)) : 1;

  return (
    <>
      <div className={styles.toolbar}>
        <select
          className={styles.btn}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="trialing">Trial</option>
          <option value="active">Active</option>
          <option value="past_due">Past due</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {error && <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Organization</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Cycle</th>
              <th>Trial ends</th>
              <th>Period ends</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                  Loading…
                </td>
              </tr>
            ) : !paged || paged.items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                  No subscriptions found.
                </td>
              </tr>
            ) : (
              paged.items.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.organization_name}</td>
                  <td>{sub.plan_name}</td>
                  <td>
                    <span
                      className={
                        sub.status === "active" || sub.status === "trialing"
                          ? styles.badge
                          : styles.badgeMuted
                      }
                    >
                      {statusLabel[sub.status] ?? sub.status}
                    </span>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{sub.billing_cycle}</td>
                  <td>{fmtDate(sub.trial_end)}</td>
                  <td>{fmtDate(sub.current_period_end)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paged && totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center" }}>
          <button
            className={styles.btn}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span style={{ display: "flex", alignItems: "center", fontSize: "0.8125rem", color: "#8b919d" }}>
            Page {page} of {totalPages}
          </span>
          <button
            className={styles.btn}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

function PlatformSubscriptionsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabKey = searchParams.get("tab");
  const tab = useMemo(() => tabFromParam(tabKey), [tabKey]);

  const setTab = useCallback(
    (next: Tab) => {
      const q = next === "plans" ? "" : `?tab=${next}`;
      router.replace(`/platform/subscriptions${q}`, { scroll: false });
    },
    [router],
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div className={tabStyles.tabList} role="tablist" aria-label="Subscriptions sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "plans"}
          className={`${tabStyles.tab} ${tab === "plans" ? tabStyles.tabActive : ""}`}
          onClick={() => setTab("plans")}
        >
          Plans
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "subscriptions"}
          className={`${tabStyles.tab} ${tab === "subscriptions" ? tabStyles.tabActive : ""}`}
          onClick={() => setTab("subscriptions")}
        >
          Organization subscriptions
        </button>
      </div>

      <div className={tabStyles.tabPanel} role="tabpanel">
        {tab === "plans" ? <PlatformPlansView /> : null}
        {tab === "subscriptions" ? (
          <AdminInterior
            title="Organization Subscriptions"
            description="View and manage active subscriptions across all organizations."
          >
            <OrgSubscriptionsPanel />
          </AdminInterior>
        ) : null}
      </div>
    </div>
  );
}

export function PlatformSubscriptions() {
  return (
    <Suspense
      fallback={
        <AdminInterior title="Subscriptions" description="">
          <div style={{ padding: "2rem", textAlign: "center", color: "#8b919d" }}>
            Loading…
          </div>
        </AdminInterior>
      }
    >
      <PlatformSubscriptionsInner />
    </Suspense>
  );
}
