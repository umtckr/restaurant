"use client";

import { Suspense, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/locations/Locations.module.css";

import { PlatformDocumentTypesPanel } from "./PlatformDocumentTypesPanel";
import tabStyles from "./PlatformSettingsView.module.css";

type SettingsTab = "documents" | "general";

function tabFromParam(raw: string | null): SettingsTab {
  if (raw === "general") return "general";
  return "documents";
}

function PlatformSettingsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabKey = searchParams.get("tab");
  const tab = useMemo(() => tabFromParam(tabKey), [tabKey]);

  const setTab = useCallback(
    (next: SettingsTab) => {
      const q = next === "documents" ? "" : `?tab=${next}`;
      router.replace(`/platform/settings${q}`, { scroll: false });
    },
    [router],
  );

  return (
    <AdminInterior
      title="Platform settings"
      description="Configure platform-wide rules. Required documents control what restaurants must upload before activation."
    >
      <div className={tabStyles.tabList} role="tablist" aria-label="Settings sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "documents"}
          className={`${tabStyles.tab} ${tab === "documents" ? tabStyles.tabActive : ""}`}
          onClick={() => setTab("documents")}
        >
          Required documents
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "general"}
          className={`${tabStyles.tab} ${tab === "general" ? tabStyles.tabActive : ""}`}
          onClick={() => setTab("general")}
        >
          General
        </button>
      </div>

      <div className={tabStyles.tabPanel} role="tabpanel">
        {tab === "documents" ? <PlatformDocumentTypesPanel /> : null}
        {tab === "general" ? (
          <p className={styles.hint} style={{ maxWidth: "36rem" }}>
            Additional platform options (billing, feature flags, email templates) can live here later.
          </p>
        ) : null}
      </div>
    </AdminInterior>
  );
}

export function PlatformSettingsView() {
  return (
    <Suspense
      fallback={
        <AdminInterior title="Platform settings" description="">
          <div className={styles.loading}>Loading…</div>
        </AdminInterior>
      }
    >
      <PlatformSettingsInner />
    </Suspense>
  );
}
