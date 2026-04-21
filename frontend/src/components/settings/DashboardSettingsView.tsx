"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  KeyRound,
  MapPin,
  Shield,
  User as UserIcon,
} from "lucide-react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import { OrganizationDocumentsPanel } from "./OrganizationDocumentsPanel";
import {
  getLocation,
  patchLocation,
  type Location,
  type TipMode,
  type ServiceChargeApply,
} from "@/lib/api/locations";
import { listLocations } from "@/lib/api/locations";
import { changePassword, fetchMe, patchMe, type MeUser } from "@/lib/api/me";
import { useMe } from "@/store/MeContext";
import {
  SERVICE_CHARGE_APPLY_OPTIONS,
  TIP_MODE_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/components/locations/locations.constants";
import s from "./Settings.module.css";

type SettingsTab = "profile" | "location" | "documents";

function tabFromParam(raw: string | null, isManager: boolean): SettingsTab {
  if (raw === "location" && isManager) return "location";
  if (raw === "documents") return "documents";
  return "profile";
}

function DashboardSettingsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { me, hasRole } = useMe();

  const isManager = hasRole("org_admin", "manager");
  const isOrgAdmin = hasRole("org_admin");

  const tabKey = searchParams.get("tab");
  const tab = useMemo(() => tabFromParam(tabKey, isManager), [tabKey, isManager]);

  const setTab = useCallback(
    (next: SettingsTab) => {
      const q = next === "profile" ? "" : `?tab=${next}`;
      router.replace(`/dashboard/settings${q}`, { scroll: false });
    },
    [router],
  );

  const tabs = useMemo(() => {
    const list: { key: SettingsTab; label: string }[] = [
      { key: "profile", label: "Profile" },
    ];
    if (isManager) list.push({ key: "location", label: "Location" });
    if (isOrgAdmin) list.push({ key: "documents", label: "Documents" });
    return list;
  }, [isManager, isOrgAdmin]);

  return (
    <AdminInterior
      title="Settings"
      description="Manage your profile, preferences, and operational settings."
    >
      {tabs.length > 1 && (
        <div className={s.tabList} role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`${s.tab} ${tab === t.key ? s.tabActive : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className={s.tabPanel} role="tabpanel">
        {tab === "profile" && <ProfilePanel />}
        {tab === "location" && isManager && <LocationPanel />}
        {tab === "documents" && isOrgAdmin && <OrganizationDocumentsPanel />}
      </div>
    </AdminInterior>
  );
}

export function DashboardSettingsView() {
  return (
    <Suspense
      fallback={
        <AdminInterior title="Settings" description="">
          <div className={s.loading}>Loading…</div>
        </AdminInterior>
      }
    >
      <DashboardSettingsInner />
    </Suspense>
  );
}

/* ══════════════════════════════════════
   Profile Panel (all roles)
   ══════════════════════════════════════ */

function ProfilePanel() {
  const { me } = useMe();
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  const [curPassword, setCurPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showToast(msg: string, err = false) {
    setToast({ msg, err });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    void (async () => {
      const r = await fetchMe();
      setLoading(false);
      if (!r.ok) return;
      setUser(r.user);
      setFirstName(r.user.first_name);
      setLastName(r.user.last_name);
      setPhone(r.user.phone);
    })();
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await patchMe({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
    });
    setSaving(false);
    if (!r.ok) { showToast(r.message, true); return; }
    setUser(r.user);
    showToast("Profile updated");
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", true);
      return;
    }
    if (newPassword.length < 8) {
      showToast("Password must be at least 8 characters", true);
      return;
    }
    setChangingPw(true);
    const r = await changePassword({
      current_password: curPassword,
      new_password: newPassword,
    });
    setChangingPw(false);
    if (!r.ok) { showToast(r.message, true); return; }
    setCurPassword("");
    setNewPassword("");
    setConfirmPassword("");
    showToast("Password changed successfully");
  }

  if (loading) return <div className={s.loading}>Loading profile…</div>;

  const roles = me?.organization_memberships.map((m) => m.role) ?? [];
  const uniqueRoles = [...new Set(roles)];

  return (
    <>
      {/* Account info */}
      <div className={s.section}>
        <h3 className={s.sectionTitle}>
          <UserIcon size={15} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />
          Account
        </h3>
        <p className={s.sectionDesc}>Your personal information visible to your organization.</p>

        <div className={s.infoRow}>
          <span className={s.infoLabel}>Email</span>
          <span className={s.infoValue}>{user?.email}</span>
        </div>
        <div className={s.infoRow}>
          <span className={s.infoLabel}>Roles</span>
          <span>
            {uniqueRoles.map((r) => (
              <span key={r} className={s.roleBadge} style={{ marginRight: 4 }}>
                {r.replace("_", " ")}
              </span>
            ))}
            {uniqueRoles.length === 0 && (
              <span className={s.hint}>No roles assigned</span>
            )}
          </span>
        </div>

        <form onSubmit={handleProfileSave} style={{ marginTop: "1rem" }}>
          <div className={s.formGrid}>
            <div className={s.field}>
              <label className={s.label} htmlFor="pfn">First name</label>
              <input
                id="pfn"
                className={s.input}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="pln">Last name</label>
              <input
                id="pln"
                className={s.input}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="pph">Phone</label>
              <input
                id="pph"
                className={s.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 555 123 4567"
              />
            </div>
          </div>
          <div className={s.actions}>
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </div>

      {/* Password change */}
      <div className={s.section}>
        <h3 className={s.sectionTitle}>
          <KeyRound size={15} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />
          Change password
        </h3>
        <p className={s.sectionDesc}>
          Update your login credentials. You will need your current password.
        </p>

        <form onSubmit={handlePasswordChange}>
          <div className={s.formGrid}>
            <div className={s.field}>
              <label className={s.label} htmlFor="cpw">Current password</label>
              <input
                id="cpw"
                type="password"
                className={s.input}
                value={curPassword}
                onChange={(e) => setCurPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div style={{ display: "none" }} />
            <div className={s.field}>
              <label className={s.label} htmlFor="npw">New password</label>
              <input
                id="npw"
                type="password"
                className={s.input}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="cpw2">Confirm new password</label>
              <input
                id="cpw2"
                type="password"
                className={s.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className={s.actions}>
            <button
              type="submit"
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={changingPw || !curPassword || !newPassword || !confirmPassword}
            >
              {changingPw ? "Changing…" : "Change password"}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <div className={`${s.toast} ${toast.err ? s.toastError : ""}`}>{toast.msg}</div>
      )}
    </>
  );
}

/* ══════════════════════════════════════
   Location Panel (manager + org_admin)
   ══════════════════════════════════════ */

function LocationPanel() {
  const { me } = useMe();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [loc, setLoc] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Location form fields
  const [name, setName] = useState("");
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

  function showToast(msg: string, err = false) {
    setToast({ msg, err });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  function populateForm(l: Location) {
    setLoc(l);
    setName(l.name);
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
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const r = await listLocations();
      setLoading(false);
      if (!r.ok) return;

      const assignedLocIds = new Set(
        me?.organization_memberships
          .filter((m) => m.location_id)
          .map((m) => m.location_id!) ?? [],
      );
      const isOrgAdmin = me?.organization_memberships.some(
        (m) => m.role === "org_admin" && !m.location_id,
      );

      const visible = isOrgAdmin || me?.is_platform_admin
        ? r.items
        : r.items.filter((l) => assignedLocIds.has(l.id));

      setLocations(visible);
      if (visible.length > 0) {
        setSelectedLocId(visible[0].id);
      }
    })();
  }, [me]);

  useEffect(() => {
    if (!selectedLocId) return;
    void (async () => {
      setLoading(true);
      const r = await getLocation(selectedLocId);
      setLoading(false);
      if (!r.ok) return;
      populateForm(r.location);
    })();
  }, [selectedLocId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLocId) return;
    setSaving(true);

    const tipPresetsPercent = [tipA, tipB, tipC].map((n) =>
      Math.min(100, Math.max(0, Math.round(Number(n)) || 0)),
    );

    const payload: Parameters<typeof patchLocation>[1] = {
      name: name.trim(),
      address_line1: addressLine1.trim(),
      address_line2: addressLine2.trim(),
      city: city.trim(),
      country: country.trim().toUpperCase().slice(0, 2),
      timezone,
      is_active: isActive,
      tip_mode: tipMode,
      tip_presets_percent: tipPresetsPercent,
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

    const r = await patchLocation(selectedLocId, payload);
    setSaving(false);
    if (!r.ok) { showToast(r.message, true); return; }
    populateForm(r.location);
    showToast("Location settings saved");
  }

  if (loading && locations.length === 0) {
    return <div className={s.loading}>Loading locations…</div>;
  }

  if (locations.length === 0) {
    return <p className={s.hint}>No locations available for your account.</p>;
  }

  return (
    <>
      {/* Location selector */}
      {locations.length > 1 && (
        <div className={s.locGrid}>
          {locations.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`${s.locChip} ${selectedLocId === l.id ? s.locChipActive : ""}`}
              onClick={() => setSelectedLocId(l.id)}
            >
              <MapPin size={11} /> {l.name}
            </button>
          ))}
        </div>
      )}

      {loc && (
        <form onSubmit={handleSave}>
          {/* Venue info */}
          <div className={s.section}>
            <h3 className={s.sectionTitle}>Venue information</h3>
            <p className={s.sectionDesc}>Name, address, timezone, and status.</p>

            <div className={s.formGrid}>
              <div className={s.field}>
                <label className={s.label} htmlFor="lname">Name</label>
                <input id="lname" className={s.input} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="lcountry">Country (ISO-2)</label>
                <input
                  id="lcountry"
                  className={s.input}
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  maxLength={2}
                />
              </div>
              <div className={`${s.field} ${s.formGridFull}`}>
                <label className={s.label} htmlFor="la1">Address line 1</label>
                <input id="la1" className={s.input} value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
              </div>
              <div className={`${s.field} ${s.formGridFull}`}>
                <label className={s.label} htmlFor="la2">Address line 2</label>
                <input id="la2" className={s.input} value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="lcity">City</label>
                <input id="lcity" className={s.input} value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="ltz">Timezone</label>
                <select id="ltz" className={s.select} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="lstatus">Status</label>
                <select
                  id="lstatus"
                  className={s.select}
                  value={isActive ? "1" : "0"}
                  onChange={(e) => setIsActive(e.target.value === "1")}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tax & service */}
          <div className={s.section}>
            <h3 className={s.sectionTitle}>
              <Shield size={15} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />
              Tax, tips &amp; service charge
            </h3>
            <p className={s.sectionDesc}>Financial policies applied to orders at this location.</p>

            <div className={s.formGrid}>
              <div className={s.field}>
                <label className={s.label} htmlFor="ltax">Tax rate (%)</label>
                <input
                  id="ltax"
                  className={s.input}
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(e.target.value)}
                />
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="ltipMode">Tip mode</label>
                <select
                  id="ltipMode"
                  className={s.select}
                  value={tipMode}
                  onChange={(e) => setTipMode(e.target.value as TipMode)}
                >
                  {TIP_MODE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className={`${s.field} ${s.formGridFull}`}>
                <span className={s.label}>Suggested tip % (three presets)</span>
                <div className={s.rowTip}>
                  <input className={s.input} type="number" min={0} max={100} value={tipA} onChange={(e) => setTipA(Number(e.target.value))} />
                  <input className={s.input} type="number" min={0} max={100} value={tipB} onChange={(e) => setTipB(Number(e.target.value))} />
                  <input className={s.input} type="number" min={0} max={100} value={tipC} onChange={(e) => setTipC(Number(e.target.value))} />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="lscEn">Service charge</label>
                <select
                  id="lscEn"
                  className={s.select}
                  value={serviceChargeEnabled ? "1" : "0"}
                  onChange={(e) => setServiceChargeEnabled(e.target.value === "1")}
                >
                  <option value="0">Disabled</option>
                  <option value="1">Enabled</option>
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="lscApply">Apply to</label>
                <select
                  id="lscApply"
                  className={s.select}
                  value={serviceChargeApply}
                  onChange={(e) => setServiceChargeApply(e.target.value as ServiceChargeApply)}
                >
                  {SERVICE_CHARGE_APPLY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {serviceChargeEnabled && (
                <div className={s.field}>
                  <label className={s.label} htmlFor="lscp">Service charge (%)</label>
                  <input
                    id="lscp"
                    className={s.input}
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={serviceChargePercent}
                    onChange={(e) => setServiceChargePercent(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className={s.actions}>
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
              {saving ? "Saving…" : "Save location settings"}
            </button>
          </div>
        </form>
      )}

      {toast && (
        <div className={`${s.toast} ${toast.err ? s.toastError : ""}`}>{toast.msg}</div>
      )}
    </>
  );
}
