"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import locStyles from "@/components/locations/Locations.module.css";
import { getApiBase } from "@/lib/api/client";
import {
  listOrganizationDocuments,
  type OrganizationDocument,
} from "@/lib/api/compliance";
import { listLocations, slugify } from "@/lib/api/locations";
import { getOrganization, patchOrganization, type Organization } from "@/lib/api/organizations";

const ONBOARDING_OPTIONS = [
  { value: "pending_documents", label: "Pending documents" },
  { value: "pending_review", label: "Pending review" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "rejected", label: "Rejected" },
  { value: "active", label: "Active" },
];

function filePublicUrl(path: string) {
  if (!path) return "#";
  if (path.startsWith("http")) return path;
  const api = getApiBase();
  const origin = api ? api.replace(/\/api\/v1\/?$/, "").replace(/\/api\/?$/, "") : "";
  return origin ? `${origin}${path}` : path;
}

function fileLabel(doc: OrganizationDocument) {
  const url = doc.file ?? "";
  const name = url.split("/").pop() ?? "file";
  return name.length > 50 ? `${name.slice(0, 47)}…` : name;
}

function statusColor(status: string): { bg: string; fg: string } {
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

type ModalIntent = { action: "approve" } | { action: "reject" } | { action: "changes" } | null;

export function PlatformOrganizationDetailView() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [locCount, setLocCount] = useState(0);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState("pending_documents");
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<OrganizationDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const [modalIntent, setModalIntent] = useState<ModalIntent>(null);
  const [modalNote, setModalNote] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const gr = await getOrganization(id);
    if (!gr.ok) {
      setError(gr.message);
      setOrg(null);
      setLoading(false);
      return;
    }
    const o = gr.organization;
    setOrg(o);
    setName(o.name);
    setSlug(o.slug);
    setIsActive(o.is_active);
    setOnboardingStatus(o.onboarding_status);
    const lr = await listLocations();
    if (lr.ok) {
      setLocCount(lr.items.filter((l) => l.organization === id).length);
    }
    setLoading(false);

    setDocsLoading(true);
    const dr = await listOrganizationDocuments(id);
    setDocsLoading(false);
    if (dr.ok) setDocs(dr.items);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    const r = await patchOrganization(id, {
      name: name.trim(),
      slug: slugify(slug),
      is_active: isActive,
      onboarding_status: onboardingStatus,
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOrg(r.organization);
    setOnboardingStatus(r.organization.onboarding_status);
    setIsActive(r.organization.is_active);
  }

  async function confirmModalAction() {
    if (!id || !modalIntent) return;
    const statusMap: Record<string, string> = {
      approve: "active",
      reject: "rejected",
      changes: "changes_requested",
    };
    const nextStatus = statusMap[modalIntent.action];
    if (!nextStatus) return;

    setSaving(true);
    setError(null);
    const r = await patchOrganization(id, { onboarding_status: nextStatus });
    setSaving(false);
    setModalIntent(null);
    setModalNote("");
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setOrg(r.organization);
    setOnboardingStatus(r.organization.onboarding_status);
    setIsActive(r.organization.is_active);
  }

  if (!id) {
    return (
      <AdminInterior title="Organization" description="">
        <p>Invalid organization.</p>
      </AdminInterior>
    );
  }

  if (loading && !org) {
    return (
      <AdminInterior title="Organization" description="">
        <div className={locStyles.loading}>Loading…</div>
      </AdminInterior>
    );
  }

  if (!org) {
    return (
      <AdminInterior title="Organization" description="">
        <div className={locStyles.errorBanner}>{error ?? "Not found"}</div>
        <Link href="/platform/organizations" className={locStyles.link}>
          ← Organizations
        </Link>
      </AdminInterior>
    );
  }

  const sc = statusColor(org.onboarding_status);
  const isNotActive = org.onboarding_status !== "active";

  const modalConfig: Record<string, { title: string; body: string; label: string; variant: "primary" | "danger" }> = {
    approve: {
      title: "Approve organization",
      body: `This will set "${org.name}" to active. The restaurant will gain full access to the operations console.`,
      label: "Approve & activate",
      variant: "primary",
    },
    reject: {
      title: "Reject organization",
      body: `This will reject "${org.name}". The restaurant will not be able to use the platform unless you change the status later.`,
      label: "Reject",
      variant: "danger",
    },
    changes: {
      title: "Request changes",
      body: `This will set "${org.name}" back to "changes requested". The restaurant will be asked to update their documents and resubmit.`,
      label: "Request changes",
      variant: "danger",
    },
  };

  const mc = modalIntent ? modalConfig[modalIntent.action] : null;

  return (
    <AdminInterior
      title={org.name}
      description={`Slug · ${org.slug} · ${locCount} location${locCount === 1 ? "" : "s"}`}
    >
      <p style={{ marginBottom: "1rem" }}>
        <Link href="/platform/organizations" className={locStyles.link}>
          ← Organizations
        </Link>
      </p>
      {error ? <div className={locStyles.errorBanner}>{error}</div> : null}

      {/* Onboarding status banner with quick actions */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.85rem 1.15rem",
          borderRadius: 12,
          border: "1px solid var(--admin-border, rgba(255,255,255,0.065))",
          background: "var(--admin-surface, #13161f)",
          marginBottom: "1.5rem",
        }}
      >
        <span style={{ fontSize: "0.8125rem", color: "var(--admin-text-muted)" }}>
          Onboarding:
        </span>
        <span
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: 6,
            fontSize: "0.75rem",
            fontWeight: 600,
            background: sc.bg,
            color: sc.fg,
            textTransform: "capitalize",
          }}
        >
          {org.onboarding_status.replaceAll("_", " ")}
        </span>
        <div style={{ flex: 1 }} />
        {isNotActive ? (
          <button
            type="button"
            className={`${locStyles.btn} ${locStyles.btnPrimary}`}
            onClick={() => { setModalNote(""); setModalIntent({ action: "approve" }); }}
          >
            Approve & activate
          </button>
        ) : null}
        {org.onboarding_status === "pending_review" ? (
          <button
            type="button"
            className={locStyles.btn}
            style={{ borderColor: "rgba(220,38,38,0.4)", color: "#ef4444" }}
            onClick={() => { setModalNote(""); setModalIntent({ action: "reject" }); }}
          >
            Reject
          </button>
        ) : null}
        {org.onboarding_status === "active" ? (
          <button
            type="button"
            className={locStyles.btn}
            onClick={() => { setModalNote(""); setModalIntent({ action: "changes" }); }}
          >
            Request changes
          </button>
        ) : null}
      </div>

      {/* Confirmation modal */}
      {mc ? (
        <ConfirmModal
          open={!!modalIntent}
          title={mc.title}
          body={mc.body}
          confirmLabel={mc.label}
          variant={mc.variant}
          busy={saving}
          noteValue={modalNote}
          onNoteChange={setModalNote}
          notePlaceholder="Internal note or message to the applicant…"
          onConfirm={() => void confirmModalAction()}
          onCancel={() => setModalIntent(null)}
        />
      ) : null}

      {/* Edit form */}
      <form
        className={locStyles.form}
        onSubmit={handleSave}
        style={{ maxWidth: "28rem", marginBottom: "2rem" }}
      >
        <div className={locStyles.formGrid}>
          <div className={locStyles.field}>
            <label className={locStyles.label} htmlFor="org-name">
              Name
            </label>
            <input
              id="org-name"
              className={locStyles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className={locStyles.field}>
            <label className={locStyles.label} htmlFor="org-slug">
              Slug
            </label>
            <input
              id="org-slug"
              className={locStyles.input}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </div>
          <div className={locStyles.field}>
            <label className={locStyles.label} htmlFor="org-active">
              Visibility
            </label>
            <select
              id="org-active"
              className={locStyles.select}
              value={isActive ? "1" : "0"}
              onChange={(e) => setIsActive(e.target.value === "1")}
            >
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
          <div className={locStyles.field}>
            <label className={locStyles.label} htmlFor="org-onboarding">
              Onboarding status
            </label>
            <select
              id="org-onboarding"
              className={locStyles.select}
              value={onboardingStatus}
              onChange={(e) => setOnboardingStatus(e.target.value)}
            >
              {ONBOARDING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={locStyles.actions}>
          <button
            type="submit"
            className={`${locStyles.btn} ${locStyles.btnPrimary}`}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {/* Compliance documents section */}
      <div
        style={{
          borderTop: "1px solid var(--admin-border, rgba(255,255,255,0.065))",
          paddingTop: "1.5rem",
        }}
      >
        <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Compliance documents
        </h3>
        {docsLoading ? (
          <div className={locStyles.loading}>Loading documents…</div>
        ) : docs.length === 0 ? (
          <p className={locStyles.hint}>No documents uploaded yet.</p>
        ) : (
          <div className={locStyles.tableWrap}>
            <table className={locStyles.table}>
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">File</th>
                  <th scope="col">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <span
                        style={{
                          padding: "0.15rem 0.5rem",
                          borderRadius: 6,
                          background: "var(--admin-accent-soft, rgba(196,92,38,0.14))",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--admin-accent, #c45c26)",
                        }}
                      >
                        {doc.document_type_name}
                      </span>
                    </td>
                    <td>
                      <a
                        href={filePublicUrl(doc.file)}
                        target="_blank"
                        rel="noreferrer"
                        className={locStyles.link}
                        style={{ fontSize: "0.8125rem" }}
                      >
                        {fileLabel(doc)}
                      </a>
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--admin-text-muted)" }}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminInterior>
  );
}
