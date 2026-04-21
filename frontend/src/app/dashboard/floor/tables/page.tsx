import { Suspense } from "react";

import { FloorTablesPageView } from "@/components/floor/FloorTablesPageView";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "2rem", color: "var(--admin-text-muted, #8b919d)" }}>Loading…</div>
      }
    >
      <FloorTablesPageView />
    </Suspense>
  );
}
