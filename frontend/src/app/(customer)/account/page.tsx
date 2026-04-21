import { AccountOverview } from "@/components/account/AccountOverview";

export const metadata = {
  title: "Account — Dinebird",
  description: "Manage your Dinebird account, profile, and order history.",
};

export default function AccountPage() {
  return <AccountOverview />;
}
