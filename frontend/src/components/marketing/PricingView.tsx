import Link from "next/link";

import {
  comparisonRows,
  faqItems,
  pricingCta,
  pricingHero,
  pricingTiers,
} from "@/content/pricingPage";

import { MarketingShell } from "./MarketingShell";
import styles from "./MarketingInterior.module.css";

export function PricingView() {
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
              {pricingTiers.map((t) => (
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
                    <th scope="col">Starter</th>
                    <th scope="col">Professional</th>
                    <th scope="col">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      <td>{row.starter}</td>
                      <td>{row.group}</td>
                      <td>{row.platform}</td>
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
