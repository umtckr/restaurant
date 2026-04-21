import { AccountOrders } from "@/components/account/AccountOrders";

export const metadata = {
  title: "My Orders — Dinebird",
  description: "View your order history and track recent orders.",
};

export default function OrdersPage() {
  return <AccountOrders />;
}
