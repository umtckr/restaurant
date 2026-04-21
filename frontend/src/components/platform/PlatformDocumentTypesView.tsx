"use client";

import { AdminInterior } from "@/components/admin/AdminInterior";

import { PlatformDocumentTypesPanel } from "./PlatformDocumentTypesPanel";

/** @deprecated Prefer `/platform/settings` (Required documents tab). Kept for direct imports if any. */
export function PlatformDocumentTypesView() {
  return (
    <AdminInterior
      title="Document types"
      description="Define which files restaurants must upload before activation. Prefer Platform → Settings → Required documents."
    >
      <PlatformDocumentTypesPanel />
    </AdminInterior>
  );
}
