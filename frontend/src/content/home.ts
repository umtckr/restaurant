import { marketingPaths } from "./marketingPaths";

export const brand = {
  name: "Dinebird",
  tagline: "Operations that feel as polished as your dining room.",
};

export const hero = {
  title: "One platform for every seat, kitchen, and payout.",
  subtitle:
    "Menus, QR sessions, floor and kitchen workflows, and payments—built for multi-location groups that cannot afford chaos.",
  primaryCta: "Book a demo",
  secondaryCta: "View pricing",
  primaryHref: "/contact",
  secondaryHref: "/pricing",
};

export const trustLogos = [
  "Harbor & Co.",
  "Maison North",
  "Urban Hearth",
  "Coastal Group",
  "Sterling Dining",
];

export const valueProps = [
  {
    title: "Menus without the mess",
    body: "Share a menu across selected locations—or fork for one venue. You stay in control of what lands on each floor.",
    icon: "layers",
  },
  {
    title: "QR sessions, not guesswork",
    body: "Guests scan, order, and request service on a session you open and close. No mystery tabs or abandoned tables.",
    icon: "qr",
  },
  {
    title: "Floor & kitchen, in sync",
    body: "Real-time updates keep hosts, servers, and the pass on the same beat—fewer misses, calmer rush hours.",
    icon: "pulse",
  },
];

export const journey = {
  title: "The guest journey your team can actually run",
  subtitle: "Designed for dine-in first: fast for guests, disciplined for staff.",
  steps: [
    { title: "Scan", desc: "Session-bound QR tied to the table." },
    { title: "Order", desc: "Cart, modifiers, and kitchen-ready tickets." },
    { title: "Signal", desc: "Waiter, bill, or custom requests in one queue." },
    { title: "Pay", desc: "Tab, per check, or split—your house rules." },
  ],
};

export const features = [
  {
    title: "Command center for each location",
    body: "Tables, open sessions, and live orders in one view—filtered by role so everyone sees what they need, nothing more.",
    badge: "Operations",
  },
  {
    title: "Revenue settings per venue",
    body: "Tax, service charge, and tip behavior follow each location’s policy—so compliance and receipts stay trustworthy.",
    badge: "Finance-ready",
  },
  {
    title: "Built for groups, not side projects",
    body: "Franchise-scoped admins, multi-location staff, and platform oversight when you need to scale support.",
    badge: "Enterprise posture",
  },
];

export const quote = {
  text: "We stopped juggling three apps for menus, tickets, and payouts. The floor finally feels like one team again.",
  author: "Elena M.",
  role: "Director of Ops · 9 locations",
};

export const pricingTeaser = {
  title: "Simple, transparent pricing",
  subtitle: "Start with a 14-day free trial on any plan. Upgrade as you grow.",
  tiers: [
    {
      name: "Starter",
      price: "₺99/mo",
      desc: "One location, up to 10 tables, QR ordering, and basic reports.",
      cta: "Start free trial",
      href: "/register",
      featured: false,
    },
    {
      name: "Professional",
      price: "₺250/mo",
      desc: "Up to 3 locations, unlimited tables, all payment methods, and full reports.",
      cta: "Start free trial",
      href: "/register",
      featured: true,
    },
    {
      name: "Enterprise",
      price: "₺1,499/mo",
      desc: "Up to 10 locations, white-label guest pages, and priority phone support.",
      cta: "Start free trial",
      href: "/register",
      featured: false,
    },
  ],
};

export const footer = {
  tagline: "Restaurant operations, orchestrated.",
  columns: [
    {
      title: "Product",
      links: [
        { label: "Overview", href: "/" },
        { label: "Pricing", href: "/pricing" },
        { label: "Security", href: "/contact" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Contact", href: "/contact" },
        { label: "Login", href: "/login" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy", href: marketingPaths.privacy },
        { label: "Terms", href: marketingPaths.terms },
      ],
    },
  ],
};
