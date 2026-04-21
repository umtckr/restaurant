"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/locations/Locations.module.css";
import { createOrganization, listOrganizations, type Organization } from "@/lib/api/organizations";
import { listLocations, slugify } from "@/lib/api/locations";

function onboardingBadge(status: string) {
  switch (status) {
    case "active":
      return { bg: "rgba(45,212,191,0.12)", fg: "#2dd4bf" };
    case "rejected":
      return { bg: "rgba(220,38,38,0.12)", fg: "#ef4444" };
    case "pending_review":
    case "changes_requested":
      return { bg: "rgba(234,179,8,0.12)", fg: "#eab308" };
    default:
      return { bg: "rgba(196,92,38,0.14)", fg: "#c45c26" };
  }
}

export function PlatformOrganizationsView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [locCounts, setLocCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const or = await listOrganizations();
    if (!or.ok) {
      setError(or.message);
      setLoading(false);
      return;
    }
    setOrgs(or.items);
    const lr = await listLocations();
    if (lr.ok) {
      const c: Record<string, number> = {};
      for (const l of lr.items) c[l.organization] = (c[l.organization] ?? 0) + 1;
      setLocCounts(c);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!slugTouched && name) setSlug(slugify(name));
  }, [name, slugTouched]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setCreating(true);
    setError(null);
    const r = await createOrganization({ name: name.trim(), slug: slugify(slug) });
    setCreating(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setName("");
    setSlug("");
    setSlugTouched(false);
    router.push(`/platform/organizations/${r.organization.id}`);
  }

  return (
    <AdminInterior
      title="Organizations"
      description="Tenants on the platform—create, open, and manage lifecycle from the API."
    >
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <form
        onSubmit={handleCreate}
        className={styles.toolbar}
        style={{ alignItems: "flex-end" }}
      >
        <div className={styles.field}>
          <label className={styles.label} htmlFor="oname">
            Name
          </label>
          <input
            id="oname"
            className={styles.input}
            style={{ minWidth: "12rem" }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="oslug">
            Slug
          </label>
          <input
            id="oslug"
            className={styles.input}
            style={{ minWidth: "10rem" }}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            required
          />
        </div>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={creating}>
          {creating ? "Creating…" : "Create organization"}
        </button>
      </form>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Organization</th>
                <th scope="col">Slug</th>
                <th scope="col">Locations</th>
                <th scope="col">Onboarding</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => {
                const ob = onboardingBadge(o.onboarding_status);
                return (
                  <tr key={o.id}>
                    <td>
                      <Link
                        href={`/platform/organizations/${o.id}`}
                        className={styles.link}
                      >
                        {o.name}
                      </Link>
                    </td>
                    <td style={{ color: "var(--admin-text-muted)", fontFamily: "monospace", fontSize: "0.8125rem" }}>
                      {o.slug}
                    </td>
                    <td>{locCounts[o.id] ?? 0}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.2rem 0.5rem",
                          borderRadius: 6,
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          textTransform: "capitalize",
                          background: ob.bg,
                          color: ob.fg,
                        }}
                      >
                        {o.onboarding_status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span className={o.is_active ? styles.badge : styles.badgeOff}>
                        {o.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminInterior>
  );
}
