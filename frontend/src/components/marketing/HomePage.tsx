import Link from "next/link";

import {
  brand,
  features,
  footer,
  hero,
  journey,
  pricingTeaser,
  quote,
  trustLogos,
  valueProps,
} from "@/content/home";

import styles from "./HomePage.module.css";
import { NavActions, NavLinks } from "./NavActions";

function IconLayers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconQr() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6zm15 0h3v3h-3v-3zM15 15h3v3h-3v-3zM15 12h6v3h-6v-3zM12 12v3H9v-3h3z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconPulse() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 12h-4l-3 9L9 3l-3 9H2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const icons = {
  layers: IconLayers,
  qr: IconQr,
  pulse: IconPulse,
} as const;

export function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark} aria-hidden />
            {brand.name}
          </Link>
          <NavLinks />
          <NavActions primaryCta={hero.primaryCta} primaryHref={hero.primaryHref} />
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.inner}>
            <div className={styles.heroGrid}>
              <div>
                <p className={styles.eyebrow}>
                  <span className={styles.eyebrowDot} aria-hidden />
                  {brand.tagline}
                </p>
                <h1 id="hero-heading" className={styles.heroTitle}>
                  {hero.title}
                </h1>
                <p className={styles.heroSubtitle}>{hero.subtitle}</p>
                <div className={styles.heroCtas}>
                  <Link href={hero.primaryHref} className={styles.btnPrimary}>
                    {hero.primaryCta}
                  </Link>
                  <Link href={hero.secondaryHref} className={styles.btnSecondary}>
                    {hero.secondaryCta}
                  </Link>
                </div>
              </div>
              <div className={styles.heroVisual}>
                <div className={styles.heroGlow} aria-hidden />
                <div className={`${styles.floatingCard} ${styles.fc1}`}>
                  <strong>Table 12 · Session live</strong>
                  <span style={{ color: "var(--ink-muted, #5c6570)" }}>
                    2 orders · Bill pending
                  </span>
                </div>
                <div className={`${styles.floatingCard} ${styles.fc2}`}>
                  <strong>Kitchen</strong>
                  <span style={{ color: "var(--ink-muted, #5c6570)" }}>
                    4 tickets in prep
                  </span>
                </div>
                <div className={styles.phone}>
                  <div className={styles.phoneInner}>
                    <div className={styles.phoneBar}>Dinebird · Guest</div>
                    <div className={styles.phoneBody}>
                      <div className={styles.phoneCard}>
                        <div className={styles.phoneCardMuted}>Your table</div>
                        <div className={styles.phoneCardTitle}>Table 12</div>
                        <div className={styles.phoneRow}>
                          <span>Grilled sea bass ×1</span>
                          <span className={styles.phonePill}>Sent</span>
                        </div>
                      </div>
                      <div className={styles.phoneCard}>
                        <div className={styles.phoneCardMuted}>Request</div>
                        <div className={styles.phoneCardTitle}>Ask for waiter</div>
                        <div className={styles.phoneRow}>
                          <span>Status</span>
                          <span className={styles.phonePill}>Queued</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.trust} aria-label="Trusted by">
          <div className={styles.inner}>
            <p className={styles.trustLabel}>Trusted by hospitality groups</p>
            <div className={styles.trustRow}>
              {trustLogos.map((name) => (
                <span key={name} className={styles.trustName}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.benefits} aria-labelledby="benefits-heading">
          <div className={styles.inner}>
            <h2 id="benefits-heading" className={styles.sectionTitle}>
              Everything operators fight with—unified
            </h2>
            <p className={styles.sectionSubtitle}>
              Fewer tools, clearer ownership, and a guest experience that still
              feels premium when the house is full.
            </p>
            <div className={styles.cardGrid}>
              {valueProps.map((v, i) => {
                const Icon = icons[v.icon as keyof typeof icons];
                return (
                  <article key={v.title} className={styles.card}>
                    <div
                      className={`${styles.cardIcon} ${i === 2 ? styles.cardIconTeal : ""}`}
                    >
                      <Icon />
                    </div>
                    <h3 className={styles.cardTitle}>{v.title}</h3>
                    <p className={styles.cardBody}>{v.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.journey} aria-labelledby="journey-heading">
          <div className={styles.inner}>
            <h2 id="journey-heading" className={styles.sectionTitle}>
              {journey.title}
            </h2>
            <p className={styles.sectionSubtitle}>{journey.subtitle}</p>
            <div className={styles.steps}>
              {journey.steps.map((s, idx) => (
                <div key={s.title} className={styles.step}>
                  <div className={styles.stepNum}>Step {idx + 1}</div>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.features} aria-labelledby="features-heading">
          <div className={styles.inner}>
            <h2 id="features-heading" className={styles.sectionTitle}>
              Depth when you need it
            </h2>
            <p className={styles.sectionSubtitle}>
              From the pass to the back office—structured for groups that scale.
            </p>
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`${styles.featureRow} ${i % 2 === 1 ? styles.featureRowReverse : ""}`}
              >
                <div className={styles.featureVisual}>
                  <div className={styles.featureMock}>
                    <div className={styles.featureMockLine} />
                    <div className={styles.featureMockLine} />
                    <div
                      className={`${styles.featureMockLine} ${styles.featureMockLineShort}`}
                    />
                    <div className={styles.featureMockLine} style={{ marginTop: 12 }} />
                    <div
                      className={`${styles.featureMockLine} ${styles.featureMockLineShort}`}
                    />
                  </div>
                </div>
                <div>
                  <span className={styles.featureBadge}>{f.badge}</span>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureBody}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.quote}>
          <div className={styles.inner}>
            <blockquote className={styles.quoteCard}>
              <p className={styles.quoteText}>“{quote.text}”</p>
              <footer className={styles.quoteMeta}>
                <strong>{quote.author}</strong>
                <br />
                {quote.role}
              </footer>
            </blockquote>
          </div>
        </section>

        <section className={styles.pricing} aria-labelledby="pricing-heading">
          <div className={styles.inner}>
            <h2 id="pricing-heading" className={styles.sectionTitle}>
              {pricingTeaser.title}
            </h2>
            <p className={styles.sectionSubtitle}>{pricingTeaser.subtitle}</p>
            <div className={styles.pricingGrid}>
              {pricingTeaser.tiers.map((t) => (
                <article
                  key={t.name}
                  className={`${styles.priceCard} ${t.featured ? styles.priceCardFeatured : ""}`}
                >
                  <h3 className={styles.priceName}>{t.name}</h3>
                  <div className={styles.priceAmount}>{t.price}</div>
                  <p className={styles.priceDesc}>{t.desc}</p>
                  <Link
                    href={t.href}
                    className={t.featured ? styles.btnPrimary : styles.btnGhost}
                  >
                    {t.cta}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.inner}>
          <div className={styles.footerTop}>
            <div>
              <p className={styles.footerBrand}>{brand.name}</p>
              <p className={styles.footerTagline}>{footer.tagline}</p>
            </div>
            <div className={styles.footerCols}>
              {footer.columns.map((col) => (
                <div key={col.title} className={styles.footerCol}>
                  <p className={styles.footerColTitle}>{col.title}</p>
                  <ul>
                    {col.links.map((l) => (
                      <li key={`${col.title}-${l.href}`}>
                        <Link href={l.href}>{l.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.footerBottom}>
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
