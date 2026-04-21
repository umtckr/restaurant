"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { loginCopy } from "@/content/auth";
import { loginWithPassword } from "@/lib/api/auth";
import { getAccessToken } from "@/lib/api/http";
import { fetchMe } from "@/lib/api/me";

import { AuthShell } from "./AuthShell";
import formStyles from "./AuthForms.module.css";
import styles from "./AuthShell.module.css";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getAccessToken()) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await loginWithPassword(email, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const { tokens } = result;
      if (typeof window !== "undefined") {
        if (remember) {
          localStorage.setItem("access_token", tokens.access);
          localStorage.setItem("refresh_token", tokens.refresh);
        } else {
          sessionStorage.setItem("access_token", tokens.access);
          sessionStorage.setItem("refresh_token", tokens.refresh);
        }
      }
      let dest = "/dashboard";
      try {
        const me = await fetchMe();
        if (me.ok) {
          if (me.user.is_platform_admin) {
            dest = "/platform";
          } else if (me.user.organization_memberships.length === 0) {
            dest = "/account";
          } else {
            const allActive = me.user.organization_memberships.every(
              (m) => m.onboarding_status === "active",
            );
            if (!allActive) dest = "/dashboard/onboarding";
          }
        }
      } catch {
        // fetchMe failed after login — proceed to dashboard and let AdminShell handle it
      }
      router.push(dest);
      router.refresh();
    } catch {
      setError("Network error. Is the API running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="login">
      <header className={styles.cardHeader}>
        <p className={styles.cardEyebrow}>{loginCopy.eyebrow}</p>
        <h2 className={styles.cardTitle}>{loginCopy.title}</h2>
        <p className={styles.cardSubtitle}>{loginCopy.subtitle}</p>
      </header>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        {error ? <div className={formStyles.errorBanner}>{error}</div> : null}

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="login-email">
            Work email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={formStyles.input}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={formStyles.input}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className={formStyles.toolbar}>
          <label className={formStyles.checkboxRow}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            {loginCopy.remember}
          </label>
          <Link href={loginCopy.forgotHref} className={formStyles.link}>
            {loginCopy.forgot}
          </Link>
        </div>

        <button type="submit" className={formStyles.submit} disabled={loading}>
          {loading ? "Signing in…" : loginCopy.submit}
        </button>

        <p className={formStyles.legal}>
          {loginCopy.alternatePrompt}{" "}
          <Link href={loginCopy.alternateHref}>{loginCopy.alternateLink}</Link>
        </p>
      </form>
    </AuthShell>
  );
}
