"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/locations/Locations.module.css";
import {
  createPlan,
  deletePlan,
  listAdminPlans,
  updatePlan,
  type Plan,
  type PlanWrite,
} from "@/lib/api/subscriptions";

const EMPTY_PLAN: PlanWrite = {
  name: "",
  slug: "",
  description: "",
  sort_order: 0,
  monthly_price: "0",
  annual_price: "0",
  currency: "TRY",
  max_locations: 1,
  max_tables: 0,
  max_staff: 0,
  max_menus: 0,
  max_orders_per_month: 0,
  has_discounts: false,
  has_bill_splitting: false,
  has_online_payments: false,
  has_full_reports: false,
  has_custom_branding: false,
  has_white_label: false,
  allowed_payment_methods: ["cash"],
  online_payment_fee_percent: "0",
  trial_days: 14,
  is_active: true,
  is_featured: false,
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card_terminal", label: "Card terminal" },
  { value: "online", label: "Online" },
  { value: "other", label: "Other" },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function PlanModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: Plan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = plan !== null;
  const [form, setForm] = useState<PlanWrite>(plan ? { ...plan } : { ...EMPTY_PLAN });
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof PlanWrite>(key: K, value: PlanWrite[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setNum(key: keyof PlanWrite, raw: string) {
    const n = parseInt(raw, 10);
    set(key, isNaN(n) ? 0 : n);
  }

  function togglePayment(method: string) {
    setForm((f) => {
      const has = f.allowed_payment_methods.includes(method);
      return {
        ...f,
        allowed_payment_methods: has
          ? f.allowed_payment_methods.filter((m) => m !== method)
          : [...f.allowed_payment_methods, method],
      };
    });
  }

  useEffect(() => {
    if (!slugTouched && form.name) {
      set("slug", slugify(form.name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, slugTouched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const result = isEdit
      ? await updatePlan(plan.id, form)
      : await createPlan(form);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {isEdit ? `Edit "${plan.name}"` : "New plan"}
          </h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--admin-text, #f4f4f6)" }}>
                Identity
              </legend>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Name</label>
                  <input
                    className={styles.input}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    required
                    placeholder="e.g. Starter"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Slug</label>
                  <input
                    className={styles.input}
                    value={form.slug}
                    onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }}
                    required
                    placeholder="e.g. starter"
                  />
                </div>
                <div className={`${styles.field} ${styles.formGridFull}`}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    className={styles.textarea}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Shown on the pricing page"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--admin-text, #f4f4f6)" }}>
                Pricing
              </legend>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Monthly price</label>
                  <input
                    className={styles.input}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.monthly_price}
                    onChange={(e) => set("monthly_price", e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Annual price</label>
                  <input
                    className={styles.input}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.annual_price}
                    onChange={(e) => set("annual_price", e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Currency</label>
                  <input
                    className={styles.input}
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value.toUpperCase())}
                    maxLength={3}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Online payment fee %</label>
                  <input
                    className={styles.input}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.online_payment_fee_percent}
                    onChange={(e) => set("online_payment_fee_percent", e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--admin-text, #f4f4f6)" }}>
                Limits <span style={{ fontWeight: 400, fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>(0 = unlimited)</span>
              </legend>
              <div className={styles.formGrid}>
                {([
                  ["max_locations", "Locations"],
                  ["max_tables", "Tables"],
                  ["max_staff", "Staff accounts"],
                  ["max_menus", "Menus"],
                  ["max_orders_per_month", "Orders/month"],
                ] as [keyof PlanWrite, string][]).map(([key, label]) => (
                  <div className={styles.field} key={key}>
                    <label className={styles.label}>{label}</label>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      value={form[key] as number}
                      onChange={(e) => setNum(key, e.target.value)}
                    />
                  </div>
                ))}
                <div className={styles.field}>
                  <label className={styles.label}>Trial days</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    value={form.trial_days}
                    onChange={(e) => setNum("trial_days", e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--admin-text, #f4f4f6)" }}>
                Features
              </legend>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {([
                  ["has_discounts", "Discount codes"],
                  ["has_bill_splitting", "Bill splitting"],
                  ["has_online_payments", "Online payments"],
                  ["has_full_reports", "Full reports"],
                  ["has_custom_branding", "Custom branding"],
                  ["has_white_label", "White-label"],
                ] as [keyof PlanWrite, string][]).map(([key, label]) => (
                  <label key={key} className={styles.multiOption}>
                    <input
                      type="checkbox"
                      checked={form[key] as boolean}
                      onChange={(e) => set(key, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--admin-text, #f4f4f6)" }}>
                Payment methods
              </legend>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {PAYMENT_METHODS.map((pm) => (
                  <label key={pm.value} className={styles.multiOption}>
                    <input
                      type="checkbox"
                      checked={form.allowed_payment_methods.includes(pm.value)}
                      onChange={() => togglePayment(pm.value)}
                    />
                    {pm.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--admin-text, #f4f4f6)" }}>
                Display
              </legend>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Sort order</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    value={form.sort_order}
                    onChange={(e) => setNum("sort_order", e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", justifyContent: "center" }}>
                  <label className={styles.multiOption}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => set("is_active", e.target.checked)}
                    />
                    Active (visible to users)
                  </label>
                  <label className={styles.multiOption}>
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(e) => set("is_featured", e.target.checked)}
                    />
                    Featured (most popular badge)
                  </label>
                </div>
              </div>
            </fieldset>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={saving}
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function limitDisplay(val: number) {
  return val === 0 ? "∞" : String(val);
}

export function PlatformPlansView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editPlan, setEditPlan] = useState<Plan | null | "new">(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const r = await listAdminPlans();
    if (!r.ok) setError(r.message);
    else setPlans(r.plans);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(plan: Plan) {
    if (!confirm(`Delete "${plan.name}"? This cannot be undone. Plans with active subscriptions cannot be deleted.`)) return;
    setDeleting(plan.id);
    const r = await deletePlan(plan.id);
    setDeleting(null);
    if (!r.ok) { setError(r.message); return; }
    void load();
  }

  return (
    <AdminInterior
      title="Subscription Plans"
      description="Create, edit, and manage pricing plans. Changes take effect immediately — limits are enforced on all new actions."
    >
      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.toolbar}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => setEditPlan("new")}
        >
          + New plan
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : plans.length === 0 ? (
        <div className={styles.empty}>No plans created yet. Click "New plan" to add one.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Price (mo/yr)</th>
                <th>Locations</th>
                <th>Tables</th>
                <th>Staff</th>
                <th>Menus</th>
                <th>Orders/mo</th>
                <th>Status</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    {p.is_featured && (
                      <span
                        style={{
                          marginLeft: 6,
                          padding: "0.15rem 0.4rem",
                          borderRadius: 5,
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          background: "rgba(196,92,38,0.18)",
                          color: "#f59e0b",
                          textTransform: "uppercase",
                        }}
                      >
                        Popular
                      </span>
                    )}
                  </td>
                  <td>
                    {p.currency} {p.monthly_price} / {p.annual_price}
                  </td>
                  <td>{limitDisplay(p.max_locations)}</td>
                  <td>{limitDisplay(p.max_tables)}</td>
                  <td>{limitDisplay(p.max_staff)}</td>
                  <td>{limitDisplay(p.max_menus)}</td>
                  <td>{limitDisplay(p.max_orders_per_month)}</td>
                  <td>
                    <span className={p.is_active ? styles.badge : styles.badgeOff}>
                      {p.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        className={`${styles.btn} ${styles.btnSmall}`}
                        onClick={() => setEditPlan(p)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnSmall} ${styles.btnDanger}`}
                        onClick={() => handleDelete(p)}
                        disabled={deleting === p.id}
                      >
                        {deleting === p.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editPlan !== null && (
        <PlanModal
          plan={editPlan === "new" ? null : editPlan}
          onClose={() => setEditPlan(null)}
          onSaved={() => { setEditPlan(null); void load(); }}
        />
      )}
    </AdminInterior>
  );
}
