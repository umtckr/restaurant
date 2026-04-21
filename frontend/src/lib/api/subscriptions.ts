import { apiUrl } from "./client";
import { apiFetch, formatApiError } from "./http";

export type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  monthly_price: string;
  annual_price: string;
  currency: string;
  max_locations: number;
  max_tables: number;
  max_staff: number;
  max_menus: number;
  max_orders_per_month: number;
  has_discounts: boolean;
  has_bill_splitting: boolean;
  has_online_payments: boolean;
  has_full_reports: boolean;
  has_custom_branding: boolean;
  has_white_label: boolean;
  allowed_payment_methods: string[];
  online_payment_fee_percent: string;
  trial_days: number;
  is_featured: boolean;
};

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled" | "expired";

export type SubscriptionSummary = {
  has_subscription: boolean;
  plan_name?: string;
  plan_slug?: string;
  status?: SubscriptionStatus;
  billing_cycle?: "monthly" | "annual";
  trial_end?: string | null;
  current_period_end?: string | null;
  limits?: {
    locations: { current: number; max: number };
    tables: { current: number; max: number };
    staff: { current: number; max: number };
    menus: { current: number; max: number };
    orders_this_month: { current: number; max: number };
  };
  features?: Record<string, boolean>;
  allowed_payment_methods?: string[];
  online_payment_fee_percent?: string;
  custom_overrides?: Record<string, unknown>;
};

export async function listPublicPlans(): Promise<
  { ok: true; plans: Plan[] } | { ok: false; message: string }
> {
  const res = await fetch(apiUrl("plans/public/"));
  const data = await res.json().catch(() => []);
  if (!res.ok) return { ok: false, message: "Failed to load plans" };
  return { ok: true, plans: data as Plan[] };
}

export async function getMySubscription(): Promise<
  { ok: true; summary: SubscriptionSummary } | { ok: false; message: string }
> {
  const res = await apiFetch("my-subscription/");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, summary: data as SubscriptionSummary };
}
