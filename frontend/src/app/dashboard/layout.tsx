import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { LocationProvider } from "@/store/LocationContext";
import { MeProvider } from "@/store/MeContext";

export const metadata: Metadata = {
  title: "Console — Dinebird",
  description: "Restaurant operations console for locations, floor, kitchen, and orders.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MeProvider>
      <LocationProvider>
        <AdminShell variant="operations">{children}</AdminShell>
      </LocationProvider>
    </MeProvider>
  );
}
