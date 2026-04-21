import { redirect } from "next/navigation";

/** Legacy URL: organization now has its own page at /dashboard/organization. */
export default function DashboardSettingsOrganizationRedirectPage() {
  redirect("/dashboard/organization");
}
