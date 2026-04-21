"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/locations/Locations.module.css";
import { fetchMe } from "@/lib/api/me";
import {
  getOrganization,
  listOrganizations,
  patchOrganization,
  type Organization,
} from "@/lib/api/organizations";
import { slugify } from "@/lib/api/locations";

export function OrganizationSettingsView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [org, setOrg] = useState<Organization | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEditSlug, setCanEditSlug] = useState(false);

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const me = await fetchMe();
    if (!me.ok) {
      setError(me.message);
      setLoading(false);
      return;
    }
    setCanEditSlug(me.user.is_platform_admin);

    const list = await listOrganizations();
    if (!list.ok || list.items.length === 0) {
      setError(list.ok ? "No organization linked to your account." : list.message);
      setOrgs([]);
      setOrg(null);
      setLoading(false);
      return;
    }
    setOrgs(list.items);
    setSelectedOrgId((prev) => prev || list.items[0]!.id);
    setLoading(false);
  }, []);

  const loadOrg = useCallback(async () => {
    if (!selectedOrgId) return;
    setLoading(true);
    setError(null);
    const gr = await getOrganization(selectedOrgId);
    setLoading(false);
    if (!gr.ok) {
      setError(gr.message);
      return;
    }
    const o = gr.organization;
    setOrg(o);
    setName(o.name);
    setSlug(o.slug);
    setIsActive(o.is_active);
  }, [selectedOrgId]);

  useEffect(() => {
    void loadOrgs();
  }, [loadOrgs]);

  useEffect(() => {
    void loadOrg();
  }, [loadOrg]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    setError(null);
    const r = await patchOrganization(org.id, {
      name: name.trim(),
      slug: canEditSlug ? slugify(slug) : undefined,
      is_active: isActive,
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOrg(r.organization);
    setName(r.organization.name);
    setSlug(r.organization.slug);
    setIsActive(r.organization.is_active);
  }

  if (loading && !org) {
    return (
      <AdminInterior title="Organization" description="">
        <div className={styles.loading}>Loading…</div>
      </AdminInterior>
    );
  }

  if (!org && !loading) {
    return (
      <AdminInterior title="Organization" description="">
        <div className={styles.errorBanner}>{error ?? "Unavailable"}</div>
      </AdminInterior>
    );
  }

  return (
    <AdminInterior
      title="Organization settings"
      description="Name and visibility for your tenant. Slug changes may be restricted."
    >
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      {orgs.length > 1 ? (
        <div className={styles.toolbar} style={{ marginBottom: "1rem" }}>
          <label className={styles.hint} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Organization
            <select
              className={styles.select}
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {org ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="oname">
                Name
              </label>
              <input
                id="oname"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="oslug">
                Slug {!canEditSlug ? <span style={{ fontWeight: 400 }}>(read-only)</span> : null}
              </label>
              <input
                id="oslug"
                className={styles.input}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={!canEditSlug}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="oact">
                Status
              </label>
              <select
                id="oact"
                className={styles.select}
                value={isActive ? "1" : "0"}
                onChange={(e) => setIsActive(e.target.value === "1")}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      ) : null}
    </AdminInterior>
  );
}
