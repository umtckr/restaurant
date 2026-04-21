"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import { fetchMe, type MeUser } from "@/lib/api/me";
import { createLocation, slugify } from "@/lib/api/locations";
import { listOrganizations, type Organization } from "@/lib/api/organizations";

import { TIMEZONE_OPTIONS } from "./locations.constants";
import styles from "./Locations.module.css";

export function NewLocationView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const [organizationId, setOrganizationId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [city, setCity] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [country, setCountry] = useState("TR");
  const [timezone, setTimezone] = useState("Europe/Istanbul");

  const load = useCallback(async () => {
    setLoading(true);
    const me = await fetchMe();
    if (!me.ok) {
      setError(me.message);
      setLoading(false);
      return;
    }

    const user = me.user;
    setIsPlatformAdmin(user.is_platform_admin);

    if (user.is_platform_admin) {
      const o = await listOrganizations();
      if (o.ok) {
        setOrgs(o.items);
        setOrganizationId((prev) => prev || (o.items[0]?.id ?? ""));
      }
    } else {
      const activeOrgs = user.organization_memberships.filter(
        (m) => m.onboarding_status === "active",
      );
      if (activeOrgs.length === 0) {
        setError("Your organization must be approved before you can create locations.");
        setLoading(false);
        return;
      }
      const mapped: Organization[] = activeOrgs.map((m) => ({
        id: m.organization_id,
        name: m.organization_name,
        slug: "",
        is_active: true,
        onboarding_status: m.onboarding_status,
        created_at: "",
        updated_at: "",
      }));
      setOrgs(mapped);
      setOrganizationId((prev) => prev || mapped[0]!.id);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!slugTouched && name) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!organizationId || !name.trim() || !slug.trim()) {
      setError("Organization, name, and slug are required.");
      return;
    }
    setSaving(true);
    const res = await createLocation({
      organization: organizationId,
      name: name.trim(),
      slug: slugify(slug),
      city: city.trim(),
      address_line1: addressLine1.trim(),
      country: country.trim().toUpperCase().slice(0, 2),
      timezone,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push(`/dashboard/locations/${res.location.id}`);
    router.refresh();
  }

  if (loading) {
    return (
      <AdminInterior title="New location" description="Create a venue for your organization.">
        <div className={styles.loading}>Loading…</div>
      </AdminInterior>
    );
  }

  const singleOrg = orgs.length === 1;

  return (
    <AdminInterior
      title="New location"
      description="Add a venue to your organization. You can configure tax and service rules afterward."
    >
      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {orgs.length === 0 && !error ? (
        <div className={styles.errorBanner}>
          No organizations available.{" "}
          {isPlatformAdmin ? (
            <>
              Create one under{" "}
              <Link href="/platform/organizations" className={styles.link}>
                Platform → Organizations
              </Link>{" "}
              first.
            </>
          ) : (
            "Contact your platform administrator."
          )}
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          {singleOrg ? (
            <div className={styles.field}>
              <label className={styles.label}>Organization</label>
              <div
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: 10,
                  border: "1px solid var(--admin-border, rgba(255,255,255,0.065))",
                  background: "var(--admin-bg-elevated, #0e1016)",
                  color: "var(--admin-text, #f4f4f6)",
                  fontSize: "0.875rem",
                }}
              >
                {orgs[0]!.name}
              </div>
            </div>
          ) : (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="org">
                Organization
              </label>
              <select
                id="org"
                className={styles.select}
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                required
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Location name
            </label>
            <input
              id="name"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Riverside"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="slug">
              URL slug
            </label>
            <input
              id="slug"
              className={styles.input}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
              placeholder="riverside"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="city">
              City
            </label>
            <input
              id="city"
              className={styles.input}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Istanbul"
            />
          </div>
          <div className={`${styles.field} ${styles.formGridFull}`}>
            <label className={styles.label} htmlFor="addr">
              Address line 1
            </label>
            <input
              id="addr"
              className={styles.input}
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="country">
              Country (ISO-2)
            </label>
            <input
              id="country"
              className={styles.input}
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              maxLength={2}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="tz">
              Timezone
            </label>
            <select
              id="tz"
              className={styles.select}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={saving || orgs.length === 0}
          >
            {saving ? "Creating…" : "Create location"}
          </button>
          <Link href="/dashboard/locations" className={styles.btn}>
            Cancel
          </Link>
        </div>
      </form>
    </AdminInterior>
  );
}
