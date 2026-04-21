"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  faqItems,
  pricingCta,
  pricingHero,
  pricingTiers as fallbackTiers,
  comparisonRows as fallbackRows,
  type PricingTier,
} from "@/content/pricingPage";
import { listPublicPlans, type Plan } from "@/lib/api/subscriptions";

import { MarketingShell } from "./MarketingShell";
import styles from "./MarketingInterior.module.css";

function limitLabel(val: number): string {
  return val === 0 ? "Unlimited" : String(val);
}

function buildFeaturesFromPlan(p: Plan): string[] {
  const feats: string[] = [];
  feats.push(
    p.max_locations === 0
      ? "Unlimited locations"
      : p.max_locations === 1
        ? "1 location"
        : `Up to ${p.max_locations} locations`,
  );
  feats.push(p.max_tables === 0 ? "Unlimited tables" : `Up to ${p.max_tables} tables`);
  feats.push(
    p.max_staff === 0
      ? "Unlimited staff accounts"
      : `${p.max_staff} staff account${p.max_staff !== 1 ? "s" : ""}`,
  );
  feats.push(
    p.max_menus === 0
      ? "Unlimited menus"
      : `${p.max_menus} menu${p.max_menus !== 1 ? "s" : ""}`,
  );
  feats.push(
    p.max_orders_per_month === 0
      ? "Unlimited orders"
      : `${p.max_orders_per_month.toLocaleString()} orders/month`,
  );

  const pmLabels = p.allowed_payment_methods.map((m) =>
    m === "cash" ? "Cash" : m === "card_terminal" ? "Card terminal" : m === "online" ? "Online" : m,
  );
  if (pmLabels.length > 0) feats.push(`${pmLabels.join(", ")} payments`);

  if (p.has_online_payments) {
    const fee = parseFloat(p.online_payment_fee_percent);
    feats.push(fee > 0 ? `Online payments (${fee}% fee)` : "Online payments");
  }
  if (p.has_discounts) feats.push("Discount & promo codes");
  if (p.has_bill_splitting) feats.push("Bill splitting");
  if (p.has_full_reports) feats.push("Full reports");
  if (p.has_custom_branding) feats.push("Custom branding");
  if (p.has_white_label) feats.push("White-label guest pages");

  return feats;
}

function formatPrice(price: string, currency: string): string {
  const n = parseFloat(price);
  if (isNaN(n) || n === 0) return "Free";
  const sym = currency === "TRY" ? "₺" : currency === "USD" ? "$" : currency === "EUR" ? "€" : `${currency} `;
  return `${sym}${n.toLocaleString()}/mo`;
}

function planToTier(p: Plan): PricingTier {
  const mo = parseFloat(p.monthly_price);
  const yr = parseFloat(p.annual_price);
  let priceNote = "";
  if (yr > 0 && mo > 0) {
    const savings = Math.round(100 - (yr / (mo * 12)) * 100);
    const sym = p.currency === "TRY" ? "₺" : p.currency === "USD" ? "$" : p.currency === "EUR" ? "€" : `${p.currency} `;
    priceNote = `or ${sym}${yr.toLocaleString()}/year${savings > 0 ? ` (save ${savings}%)` : ""}`;
  }
  return {
    name: p.name,
    priceLabel: formatPrice(p.monthly_price, p.currency),
    priceNote,
    description: p.description,
    cta: p.trial_days > 0 ? "Start free trial" : "Get started",
    href: "/register",
    featured: p.is_featured,
    features: buildFeaturesFromPlan(p),
  };
}

type ComparisonRow = { feature: string; [planName: string]: string };

function buildComparisonRows(plans: Plan[]): ComparisonRow[] {
  const cols = plans.map((p) => p.name);
  const rows: ComparisonRow[] = [];

  function row(feature: string, fn: (p: Plan) => string) {
    const r: ComparisonRow = { feature };
    plans.forEach((p) => { r[p.name] = fn(p); });
    rows.push(r);
  }

  row("Locations", (p) => limitLabel(p.max_locations));
  row("Tables", (p) => limitLabel(p.max_tables));
  row("Staff accounts", (p) => limitLabel(p.max_staff));
  row("Menus", (p) => limitLabel(p.max_menus));
  row("Orders/month", (p) =>
    p.max_orders_per_month === 0 ? "Unlimited" : p.max_orders_per_month.toLocaleString(),
  );
  row("Online payments", (p) => {
    if (!p.has_online_payments) return "—";
    const fee = parseFloat(p.online_payment_fee_percent);
    return fee > 0 ? `✓ (${fee}%)` : "✓";
  });
  row("Discount codes", (p) => (p.has_discounts ? "✓" : "—"));
  row("Bill splitting", (p) => (p.has_bill_splitting ? "✓" : "—"));
  row("Reports", (p) => (p.has_full_reports ? "Full" : "Basic"));
  row("Custom branding", (p) => (p.has_custom_branding ? "✓" : "—"));
  row("White-label", (p) => (p.has_white_label ? "✓" : "—"));

  void cols;
  return rows;
}

export function PricingView() {
  const [tiers, setTiers] = useState<PricingTier[]>(fallbackTiers);
  const [compRows, setCompRows] = useState(fallbackRows);
  const [planNames, setPlanNames] = useState<string[]>(["Starter", "Professional", "Enterprise"]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await listPublicPlans();
      if (cancelled || !r.ok || r.plans.length === 0) return;
      const sorted = [...r.plans].sort((a, b) => a.sort_order - b.sort_order);
      setTiers(sorted.map(planToTier));
      setPlanNames(sorted.map((p) => p.name));
      setCompRows(buildComparisonRows(sorted));
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <MarketingShell>
      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="pricing-title">
          <div className={styles.inner}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden />
              {pricingHero.eyebrow}
            </p>
            <h1 id="pricing-title" className={styles.title}>
              {pricingHero.title}
            </h1>
            <p className={styles.subtitle}>{pricingHero.subtitle}</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="plans-heading">
          <div className={styles.inner}>
            <h2 id="plans-heading" className="sr-only">
              Plans
            </h2>
            <div className={styles.tierGrid}>
              {tiers.map((t) => (
                <article
                  key={t.name}
                  className={`${styles.tier} ${t.featured ? styles.tierFeatured : ""}`}
                >
                  {t.featured ? (
                    <span className={styles.tierBadge}>Most popular</span>
                  ) : null}
                  <h3 className={styles.tierName}>{t.name}</h3>
                  <div className={styles.tierPrice}>{t.priceLabel}</div>
                  <p className={styles.tierNote}>{t.priceNote}</p>
                  <p className={styles.tierDesc}>{t.description}</p>
                  <ul className={styles.featureList}>
                    {t.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <Link
                    href={t.href}
                    className={`${styles.tierCta} ${t.featured ? styles.tierCtaPrimary : styles.tierCtaGhost}`}
                  >
                    {t.cta}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionMuted}`}>
          <div className={styles.inner}>
            <h2 className={styles.sectionTitle}>Compare at a glance</h2>
            <p className={styles.sectionLead}>
              Exact entitlements are confirmed in your order form—we keep this
              table honest for steering conversations.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Capability</th>
                    {planNames.map((name) => (
                      <th key={name} scope="col">{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compRows.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      {planNames.map((name) => (
                        <td key={name}>{row[name] ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.inner}>
            <h2 className={styles.sectionTitle}>Frequently asked</h2>
            <p className={styles.sectionLead}>
              Straight answers for finance, IT, and ops—before the first call.
            </p>
            <div className={styles.faqList}>
              {faqItems.map((item) => (
                <details key={item.q} className={styles.details}>
                  <summary className={styles.summary}>{item.q}</summary>
                  <p className={styles.answer}>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.ctaBand} aria-labelledby="cta-title">
          <div className={styles.inner}>
            <h2 id="cta-title" className={styles.ctaTitle}>
              {pricingCta.title}
            </h2>
            <p className={styles.ctaSubtitle}>{pricingCta.subtitle}</p>
            <Link href={pricingCta.href} className={styles.ctaBtn}>
              {pricingCta.primary}
            </Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
