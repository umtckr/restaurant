export const pricingHero = {
  eyebrow: "Pricing",
  title: "Simple, transparent pricing for every restaurant",
  subtitle:
    "No hidden fees. Start with a 14-day free trial on any plan. All prices in Turkish Lira.",
};

export type PricingTier = {
  name: string;
  priceLabel: string;
  priceNote: string;
  description: string;
  cta: string;
  href: string;
  featured: boolean;
  features: string[];
};

export const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    priceLabel: "₺99/mo",
    priceNote: "or ₺1,000/year (save 16%)",
    description: "Perfect for a single-location cafe or restaurant getting started with digital operations.",
    cta: "Start free trial",
    href: "/register",
    featured: false,
    features: [
      "1 location",
      "Up to 10 tables",
      "3 staff accounts",
      "1 menu",
      "500 orders/month",
      "Cash payment tracking",
      "Basic reports (today)",
      "Guest QR ordering",
      "Kitchen & floor views",
    ],
  },
  {
    name: "Professional",
    priceLabel: "₺250/mo",
    priceNote: "or ₺2,500/year (save 17%)",
    description: "For growing restaurants with multiple locations. Everything you need to scale.",
    cta: "Start free trial",
    href: "/register",
    featured: true,
    features: [
      "Up to 3 locations",
      "Unlimited tables",
      "25 staff accounts",
      "10 menus",
      "Unlimited orders",
      "All payment methods",
      "Online payments (1.5% fee)",
      "Discount & promo codes",
      "Bill splitting",
      "Full date-range reports",
      "Custom logo & branding",
      "Email support",
    ],
  },
  {
    name: "Enterprise",
    priceLabel: "₺1,499/mo",
    priceNote: "or ₺15,000/year (save 17%)",
    description: "For restaurant chains and groups. Unlimited power with white-label capabilities.",
    cta: "Start free trial",
    href: "/register",
    featured: false,
    features: [
      "Up to 10 locations",
      "Unlimited tables",
      "Unlimited staff",
      "Unlimited menus",
      "Unlimited orders",
      "All payment methods",
      "Online payments (1.5% fee)",
      "Discount & promo codes",
      "Bill splitting",
      "Full reports + API access",
      "White-label guest pages",
      "Priority phone support",
    ],
  },
];

export const comparisonRows: Record<string, string>[] = [
  { feature: "Locations", Starter: "1", Professional: "3", Enterprise: "10" },
  { feature: "Tables", Starter: "10", Professional: "Unlimited", Enterprise: "Unlimited" },
  { feature: "Staff accounts", Starter: "3", Professional: "25", Enterprise: "Unlimited" },
  { feature: "Menus", Starter: "1", Professional: "10", Enterprise: "Unlimited" },
  { feature: "Orders/month", Starter: "500", Professional: "Unlimited", Enterprise: "Unlimited" },
  { feature: "Payment methods", Starter: "Cash", Professional: "All", Enterprise: "All" },
  { feature: "Online payments", Starter: "—", Professional: "✓ (1.5%)", Enterprise: "✓ (1.5%)" },
  { feature: "Discount codes", Starter: "—", Professional: "✓", Enterprise: "✓" },
  { feature: "Bill splitting", Starter: "—", Professional: "✓", Enterprise: "✓" },
  { feature: "Reports", Starter: "Basic", Professional: "Full", Enterprise: "Full" },
  { feature: "Custom branding", Starter: "—", Professional: "✓", Enterprise: "✓" },
  { feature: "White-label", Starter: "—", Professional: "—", Enterprise: "✓" },
];

export const faqItems = [
  {
    q: "Is there a free trial?",
    a: "Yes! Every plan includes a 14-day free trial. No credit card required. You can explore all features of your chosen plan before committing.",
  },
  {
    q: "What happens when I hit a plan limit?",
    a: "You'll see a clear notification. You can upgrade to a higher tier instantly, or contact us for a custom arrangement if you need specific adjustments.",
  },
  {
    q: "What's the 1.5% online payment fee?",
    a: "This only applies when customers pay through Dinebird's online payment gateway. Cash and card terminal payments tracked in the system are completely free.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes, you can upgrade or downgrade at any time. When upgrading, the new plan takes effect immediately. Downgrades apply at the end of your current billing period.",
  },
  {
    q: "What if I need more than 10 locations?",
    a: "Contact our sales team for a custom Enterprise arrangement. We offer volume pricing and dedicated support for large restaurant groups.",
  },
  {
    q: "Do guests need an account to order?",
    a: "No. Guests scan a QR code at their table and can order directly — no app download or account required.",
  },
];

export const pricingCta = {
  title: "Need more than 10 locations?",
  subtitle: "Contact us for custom Enterprise pricing tailored to your restaurant group.",
  primary: "Contact sales",
  href: "/contact",
};
