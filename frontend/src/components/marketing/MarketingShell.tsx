import Link from "next/link";

import { brand, footer, hero } from "@/content/home";

import homeStyles from "./HomePage.module.css";
import { NavActions, NavLinks } from "./NavActions";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={homeStyles.page}>
      <header className={homeStyles.nav}>
        <div className={homeStyles.navInner}>
          <Link href="/" className={homeStyles.logo}>
            <span className={homeStyles.logoMark} aria-hidden />
            {brand.name}
          </Link>
          <NavLinks />
          <NavActions primaryCta={hero.primaryCta} primaryHref={hero.primaryHref} />
        </div>
      </header>

      {children}

      <footer className={homeStyles.footer}>
        <div className={homeStyles.inner}>
          <div className={homeStyles.footerTop}>
            <div>
              <p className={homeStyles.footerBrand}>{brand.name}</p>
              <p className={homeStyles.footerTagline}>{footer.tagline}</p>
            </div>
            <div className={homeStyles.footerCols}>
              {footer.columns.map((col) => (
                <div key={col.title} className={homeStyles.footerCol}>
                  <p className={homeStyles.footerColTitle}>{col.title}</p>
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
          <div className={homeStyles.footerBottom}>
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
