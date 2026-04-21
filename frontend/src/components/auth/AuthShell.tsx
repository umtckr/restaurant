import Link from "next/link";

import { brand, panelCopy } from "@/content/auth";

import styles from "./AuthShell.module.css";

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M10 3L4.5 8.5L2 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type AuthShellProps = {
  children: React.ReactNode;
  mode: "login" | "register";
};

export function AuthShell({ children, mode }: AuthShellProps) {
  const altHref = mode === "login" ? "/register" : "/login";
  const altLabel = mode === "login" ? "Sign up" : "Log in";

  return (
    <div className={styles.shell}>
      <aside className={styles.panel}>
        <div className={styles.panelInner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark} />
            {brand.name}
          </Link>
          <h1 className={styles.panelTitle}>{panelCopy.title}</h1>
          <p className={styles.panelText}>{panelCopy.text}</p>
          <ul className={styles.bullets}>
            {panelCopy.bullets.map((line) => (
              <li key={line}>
                <span className={styles.bulletIcon}>
                  <CheckIcon />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.panelFooter}>
          © {new Date().getFullYear()} {brand.name}. ·{" "}
          <Link href={altHref}>{altLabel}</Link>
        </p>
      </aside>

      <div className={styles.main}>
        <div className={styles.mainTop}>
          <Link href="/" className={styles.logoMobile}>
            <span className={styles.logoMobileMark} />
            {brand.name}
          </Link>
          <Link href="/" className={styles.backLink}>
            ← Back to home
          </Link>
        </div>
        <div className={styles.mainBody}>
          <div className={styles.card}>{children}</div>
        </div>
      </div>
    </div>
  );
}
