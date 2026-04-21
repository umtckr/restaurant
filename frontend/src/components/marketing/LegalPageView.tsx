import Link from "next/link";

import type { LegalDocument } from "@/content/legal";

import { MarketingShell } from "./MarketingShell";
import interior from "./MarketingInterior.module.css";
import styles from "./LegalPage.module.css";

export type { LegalDocument };

type LegalPageViewProps = {
  doc: LegalDocument;
  siblingHref: string;
  siblingLabel: string;
};

export function LegalPageView({ doc, siblingHref, siblingLabel }: LegalPageViewProps) {
  return (
    <MarketingShell>
      <main className={interior.main}>
        <section className={interior.hero} aria-labelledby="legal-title">
          <div className={interior.inner}>
            <p className={interior.eyebrow}>
              <span className={interior.eyebrowDot} aria-hidden />
              {doc.heroEyebrow}
            </p>
            <h1 id="legal-title" className={interior.title}>
              {doc.title}
            </h1>
          </div>
        </section>

        <article className={styles.article}>
          <div className={interior.inner}>
            <div className={styles.doc}>
              <p className={styles.meta}>
                <strong>Last updated:</strong> {doc.lastUpdated}
              </p>
              <p className={styles.intro}>{doc.intro}</p>

              {doc.sections.map((sec) => (
                <section
                  key={sec.id}
                  id={sec.id}
                  className={styles.section}
                  aria-labelledby={`heading-${sec.id}`}
                >
                  <h2 id={`heading-${sec.id}`} className={styles.sectionHeading}>
                    {sec.heading}
                  </h2>
                  <ul className={styles.sectionBody}>
                    {sec.body.map((para, i) => (
                      <li key={i}>{para}</li>
                    ))}
                  </ul>
                </section>
              ))}

              <p className={styles.disclaimer}>{doc.disclaimer}</p>

              <nav className={styles.navRow} aria-label="Related legal pages">
                <Link href={siblingHref}>{siblingLabel}</Link>
                <Link href="/contact">Contact</Link>
                <Link href="/">Home</Link>
              </nav>
            </div>
          </div>
        </article>
      </main>
    </MarketingShell>
  );
}
