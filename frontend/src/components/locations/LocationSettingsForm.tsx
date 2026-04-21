"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import {
  getLocation,
  patchLocation,
  slugify,
  type Location,
  type TipMode,
  type ServiceChargeApply,
} from "@/lib/api/locations";
import { useMe } from "@/store/MeContext";

import {
  SERVICE_CHARGE_APPLY_OPTIONS,
  TIP_MODE_OPTIONS,
  TIMEZONE_OPTIONS,
} from "./locations.constants";
import styles from "./Locations.module.css";

export function LocationSettingsForm() {
  const params = useParams();
  const id = typeof params?.locationId === "string" ? params.locationId : "";
  const { me, hasRoleForLocation } = useMe();
  const canEdit = id ? hasRoleForLocation(id, "org_admin", "manager") : false;
  const canEditSlug = me?.is_platform_admin ?? false;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loc, setLoc] = useState<Location | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("TR");
  const [timezone, setTimezone] = useState("Europe/Istanbul");
  const [isActive, setIsActive] = useState(true);
  const [tipMode, setTipMode] = useState<TipMode>("suggested");
  const [tipA, setTipA] = useState(10);
  const [tipB, setTipB] = useState(15);
  const [tipC, setTipC] = useState(20);
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false);
  const [serviceChargeApply, setServiceChargeApply] = useState<ServiceChargeApply>("dine_in");
  const [serviceChargePercent, setServiceChargePercent] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState("0");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const res = await getLocation(id);
    if (!res.ok) {
      setError(res.message);
      setLoc(null);
      setLoading(false);
      return;
    }
    const l = res.location;
    setLoc(l);
    setName(l.name);
    setSlug(l.slug);
    setAddressLine1(l.address_line1);
    setAddressLine2(l.address_line2);
    setCity(l.city);
    setCountry(l.country);
    setTimezone(l.timezone);
    setIsActive(l.is_active);
    setTipMode(l.tip_mode);
    const presets = l.tip_presets_percent?.length ? l.tip_presets_percent : [10, 15, 20];
    setTipA(presets[0] ?? 10);
    setTipB(presets[1] ?? 15);
    setTipC(presets[2] ?? 20);
    setServiceChargeEnabled(l.service_charge_enabled);
    setServiceChargeApply(l.service_charge_apply);
    setServiceChargePercent(l.service_charge_percent ?? "");
    setTaxRatePercent(String(l.tax_rate_percent ?? "0"));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    const tip_presets_percent = [tipA, tipB, tipC].map((n) => Math.min(100, Math.max(0, Math.round(Number(n)) || 0)));
    const payload: Parameters<typeof patchLocation>[1] = {
      name: name.trim(),
      slug: slugify(slug),
      address_line1: addressLine1.trim(),
      address_line2: addressLine2.trim(),
      city: city.trim(),
      country: country.trim().toUpperCase().slice(0, 2),
      timezone,
      is_active: isActive,
      tip_mode: tipMode,
      tip_presets_percent,
      service_charge_enabled: serviceChargeEnabled,
      service_charge_apply: serviceChargeApply,
      tax_rate_percent: parseFloat(taxRatePercent) || 0,
    };
    if (serviceChargeEnabled) {
      const p = parseFloat(serviceChargePercent);
      payload.service_charge_percent = Number.isFinite(p) ? p : null;
    } else {
      payload.service_charge_percent = null;
    }

    const res = await patchLocation(id, payload);
    setSaving(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setLoc(res.location);
  }

  if (!id) {
    return (
      <AdminInterior title="Settings" description="">
        <div className={styles.errorBanner}>Invalid location.</div>
      </AdminInterior>
    );
  }

  if (loading) {
    return (
      <AdminInterior title="Location settings" description="">
        <div className={styles.loading}>Loading…</div>
      </AdminInterior>
    );
  }

  if (error && !loc) {
    return (
      <AdminInterior title="Location settings" description="">
        <div className={styles.errorBanner}>{error}</div>
        <Link href="/dashboard/locations" className={styles.link}>
          ← Locations
        </Link>
      </AdminInterior>
    );
  }

  return (
    <AdminInterior
      title="Location settings"
      description={loc ? `${loc.name} — address, tax, tips, and service charge.` : ""}
    >
      <p style={{ marginBottom: "1rem" }}>
        <Link href={`/dashboard/locations/${id}`} className={styles.link}>
          ← Overview
        </Link>
      </p>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 600 }}>Venue</h3>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Name
            </label>
            <input id="name" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="slug">
              Slug {canEditSlug ? null : <span style={{ fontWeight: 400 }}>(platform only)</span>}
            </label>
            <input
              id="slug"
              className={styles.input}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={!canEditSlug}
              required
            />
          </div>
          <div className={`${styles.field} ${styles.formGridFull}`}>
            <label className={styles.label} htmlFor="a1">
              Address line 1
            </label>
            <input id="a1" className={styles.input} value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
          </div>
          <div className={`${styles.field} ${styles.formGridFull}`}>
            <label className={styles.label} htmlFor="a2">
              Address line 2
            </label>
            <input id="a2" className={styles.input} value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="city">
              City
            </label>
            <input id="city" className={styles.input} value={city} onChange={(e) => setCity(e.target.value)} />
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
            <select id="tz" className={styles.select} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="active">
              Status
            </label>
            <select
              id="active"
              className={styles.select}
              value={isActive ? "1" : "0"}
              onChange={(e) => setIsActive(e.target.value === "1")}
            >
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
        </div>

        <h3 style={{ margin: "1.5rem 0 0.5rem", fontSize: "1rem", fontWeight: 600 }}>Tax & service</h3>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="tax">
              Tax rate (%)
            </label>
            <input
              id="tax"
              className={styles.input}
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={taxRatePercent}
              onChange={(e) => setTaxRatePercent(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="tipMode">
              Tip mode
            </label>
            <select
              id="tipMode"
              className={styles.select}
              value={tipMode}
              onChange={(e) => setTipMode(e.target.value as TipMode)}
            >
              {TIP_MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={`${styles.field} ${styles.formGridFull}`}>
            <span className={styles.label}>Suggested tip % (three presets)</span>
            <div className={styles.rowTip}>
              <input
                className={styles.input}
                type="number"
                min={0}
                max={100}
                value={tipA}
                onChange={(e) => setTipA(Number(e.target.value))}
              />
              <input
                className={styles.input}
                type="number"
                min={0}
                max={100}
                value={tipB}
                onChange={(e) => setTipB(Number(e.target.value))}
              />
              <input
                className={styles.input}
                type="number"
                min={0}
                max={100}
                value={tipC}
                onChange={(e) => setTipC(Number(e.target.value))}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="scEn">
              Service charge
            </label>
            <select
              id="scEn"
              className={styles.select}
              value={serviceChargeEnabled ? "1" : "0"}
              onChange={(e) => setServiceChargeEnabled(e.target.value === "1")}
            >
              <option value="0">Disabled</option>
              <option value="1">Enabled</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="scApply">
              Apply to
            </label>
            <select
              id="scApply"
              className={styles.select}
              value={serviceChargeApply}
              onChange={(e) => setServiceChargeApply(e.target.value as ServiceChargeApply)}
            >
              {SERVICE_CHARGE_APPLY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {serviceChargeEnabled ? (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="scp">
                Service charge (%)
              </label>
              <input
                id="scp"
                className={styles.input}
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={serviceChargePercent}
                onChange={(e) => setServiceChargePercent(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || !canEdit}>
            {!canEdit ? "View only" : saving ? "Saving…" : "Save changes"}
          </button>
          <Link href={`/dashboard/locations/${id}/tables`} className={styles.btn}>
            Manage tables
          </Link>
        </div>
      </form>
    </AdminInterior>
  );
}
