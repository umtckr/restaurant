import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { MeProvider } from "@/store/MeContext";

export const metadata: Metadata = {
  title: "Platform admin — Dinebird",
  description: "Dinebird platform administration and tenant oversight.",
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <MeProvider>
      <AdminShell variant="platform">{children}</AdminShell>
    </MeProvider>
  );
}
