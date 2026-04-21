"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { registerCopy } from "@/content/auth";
import { obtainTokenPair, registerAccount } from "@/lib/api/auth";
import { slugify } from "@/lib/api/locations";

import { AuthShell } from "./AuthShell";
import formStyles from "./AuthForms.module.css";
import styles from "./AuthShell.module.css";

export function RegisterForm() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"customer" | "organization">("customer");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [orgSlugTouched, setOrgSlugTouched] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!orgSlugTouched && organizationName) setOrganizationSlug(slugify(organizationName));
  }, [organizationName, orgSlugTouched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== password2) {
      setFieldErrors({ password2: "Passwords do not match." });
      return;
    }
    if (password.length < 8) {
      setFieldErrors({ password: "Use at least 8 characters." });
      return;
    }

    setLoading(true);
    try {
      const reg = await registerAccount({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone: phone || "",
        account_type: accountType,
        organization_name: accountType === "organization" ? organizationName.trim() : undefined,
        organization_slug: accountType === "organization" ? organizationSlug.trim() : undefined,
      });

      if (!reg.ok) {
        if (Object.keys(reg.fieldErrors).length) {
          setFieldErrors(reg.fieldErrors);
          setError(null);
        } else if (reg.message) {
          setError(reg.message);
        } else {
          setError("Could not create account. Try a different email.");
        }
        return;
      }

      const tokens = await obtainTokenPair(email, password);
      if (tokens && typeof window !== "undefined") {
        localStorage.setItem("access_token", tokens.access);
        localStorage.setItem("refresh_token", tokens.refresh);
        const dest = accountType === "organization" ? "/dashboard/onboarding" : "/account";
        router.push(dest);
        router.refresh();
        return;
      }

      router.push("/login?registered=1");
      router.refresh();
    } catch {
      setError("Network error. Is the API running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="register">
      <header className={styles.cardHeader}>
        <p className={styles.cardEyebrow}>{registerCopy.eyebrow}</p>
        <h2 className={styles.cardTitle}>{registerCopy.title}</h2>
        <p className={styles.cardSubtitle}>{registerCopy.subtitle}</p>
      </header>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        {error ? <div className={formStyles.errorBanner}>{error}</div> : null}

        <div className={formStyles.field}>
          <span className={formStyles.label}>Account type</span>
          <div className={formStyles.accountTypeRow} role="group" aria-label="Account type">
            <button
              type="button"
              className={`${formStyles.accountTypeBtn} ${accountType === "customer" ? formStyles.accountTypeBtnActive : ""}`}
              onClick={() => setAccountType("customer")}
            >
              Diner / guest
            </button>
            <button
              type="button"
              className={`${formStyles.accountTypeBtn} ${accountType === "organization" ? formStyles.accountTypeBtnActive : ""}`}
              onClick={() => setAccountType("organization")}
            >
              Restaurant / team
            </button>
          </div>
          <p className={formStyles.hint}>
            Choose <strong>Restaurant / team</strong> if you operate a venue and need the operations console. You will upload
            compliance documents before going live.
          </p>
        </div>

        {accountType === "organization" ? (
          <>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="reg-org-name">
                Organization name
              </label>
              <input
                id="reg-org-name"
                name="organization_name"
                type="text"
                autoComplete="organization"
                required
                className={`${formStyles.input} ${fieldErrors.organization_name ? formStyles.inputError : ""}`}
                placeholder="Cafe Marmara"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
              {fieldErrors.organization_name ? (
                <p className={formStyles.fieldError}>{fieldErrors.organization_name}</p>
              ) : null}
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="reg-org-slug">
                URL slug <span style={{ fontWeight: 400, color: "#8b939c" }}>(optional)</span>
              </label>
              <input
                id="reg-org-slug"
                name="organization_slug"
                type="text"
                className={`${formStyles.input} ${fieldErrors.organization_slug ? formStyles.inputError : ""}`}
                placeholder="cafe-marmara"
                value={organizationSlug}
                onChange={(e) => {
                  setOrgSlugTouched(true);
                  setOrganizationSlug(e.target.value);
                }}
              />
              <p className={formStyles.hint}>Leave blank to generate from the organization name. Must be unique.</p>
              {fieldErrors.organization_slug ? (
                <p className={formStyles.fieldError}>{fieldErrors.organization_slug}</p>
              ) : null}
            </div>
          </>
        ) : null}

        <div className={formStyles.row2}>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="reg-first">
              First name
            </label>
            <input
              id="reg-first"
              name="first_name"
              type="text"
              autoComplete="given-name"
              required
              className={formStyles.input}
              placeholder="Jane"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            {fieldErrors.first_name ? (
              <p className={formStyles.fieldError}>{fieldErrors.first_name}</p>
            ) : null}
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="reg-last">
              Last name
            </label>
            <input
              id="reg-last"
              name="last_name"
              type="text"
              autoComplete="family-name"
              required
              className={formStyles.input}
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            {fieldErrors.last_name ? (
              <p className={formStyles.fieldError}>{fieldErrors.last_name}</p>
            ) : null}
          </div>
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="reg-email">
            Work email
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={`${formStyles.input} ${fieldErrors.email ? formStyles.inputError : ""}`}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldErrors.email ? (
            <p className={formStyles.fieldError}>{fieldErrors.email}</p>
          ) : null}
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="reg-phone">
            Phone <span style={{ fontWeight: 400, color: "#8b939c" }}>(optional)</span>
          </label>
          <input
            id="reg-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className={`${formStyles.input} ${fieldErrors.phone ? formStyles.inputError : ""}`}
            placeholder="+90 …"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {fieldErrors.phone ? (
            <p className={formStyles.fieldError}>{fieldErrors.phone}</p>
          ) : null}
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="reg-password">
            Password
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className={`${formStyles.input} ${fieldErrors.password ? formStyles.inputError : ""}`}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className={formStyles.hint}>Use 8+ characters with a mix of letters and numbers.</p>
          {fieldErrors.password ? (
            <p className={formStyles.fieldError}>{fieldErrors.password}</p>
          ) : null}
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="reg-password2">
            Confirm password
          </label>
          <input
            id="reg-password2"
            name="password2"
            type="password"
            autoComplete="new-password"
            required
            className={`${formStyles.input} ${fieldErrors.password2 ? formStyles.inputError : ""}`}
            placeholder="Repeat password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
          {fieldErrors.password2 ? (
            <p className={formStyles.fieldError}>{fieldErrors.password2}</p>
          ) : null}
        </div>

        <button type="submit" className={formStyles.submit} disabled={loading}>
          {loading ? "Creating account…" : registerCopy.submit}
        </button>

        <p className={formStyles.legal}>
          {registerCopy.alternatePrompt}{" "}
          <Link href={registerCopy.alternateHref}>{registerCopy.alternateLink}</Link>
        </p>
        <p className={formStyles.legal} style={{ marginTop: "0.75rem" }}>
          {registerCopy.legalPrefix}{" "}
          <Link href={registerCopy.termsHref}>{registerCopy.terms}</Link>
          {" · "}
          <Link href={registerCopy.privacyHref}>{registerCopy.privacy}</Link>
        </p>
      </form>
    </AuthShell>
  );
}
