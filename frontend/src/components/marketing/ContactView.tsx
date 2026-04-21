import Link from "next/link";

import { contactChannels, contactHero } from "@/content/contactPage";

import { ContactForm } from "./ContactForm";
import { MarketingShell } from "./MarketingShell";
import styles from "./MarketingInterior.module.css";

export function ContactView() {
  return (
    <MarketingShell>
      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="contact-title">
          <div className={styles.inner}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden />
              {contactHero.eyebrow}
            </p>
            <h1 id="contact-title" className={styles.title}>
              {contactHero.title}
            </h1>
            <p className={styles.subtitle}>{contactHero.subtitle}</p>
          </div>
        </section>

        <div className={styles.inner}>
          <div className={styles.contactGrid}>
            <div>
              <h2 className={styles.sideTitle}>Other ways to reach us</h2>
              <p className={styles.sideText}>
                Prefer email? Pick the inbox that matches your request—we’ll
                route you faster than a catch-all.
              </p>
              {contactChannels.map((ch) => (
                <div key={ch.title} className={styles.channel}>
                  <p className={styles.channelTitle}>{ch.title}</p>
                  <p className={styles.channelBody}>{ch.body}</p>
                  <Link href={ch.href} className={styles.channelLink}>
                    {ch.action}
                  </Link>
                </div>
              ))}
            </div>
            <ContactForm />
          </div>
        </div>
      </main>
    </MarketingShell>
  );
}
