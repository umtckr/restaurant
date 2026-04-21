"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/locations/Locations.module.css";
import { getApiBase } from "@/lib/api/client";
import {
  deleteOrganizationDocument,
  listDocumentTypes,
  listOrganizationDocuments,
  submitCompliance,
  uploadOrganizationDocument,
  type DocumentType,
  type OrganizationDocument,
} from "@/lib/api/compliance";
import { fetchMe, type OrganizationMembership } from "@/lib/api/me";

const ACTIVE = "active";

function filePublicUrl(path: string) {
  if (!path) return "#";
  if (path.startsWith("http")) return path;
  const api = getApiBase();
  const origin = api ? api.replace(/\/api\/v1\/?$/, "") : "";
  return origin ? `${origin}${path}` : path;
}

export function OnboardingWizard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrgs, setPendingOrgs] = useState<OrganizationMembership[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [orgName, setOrgName] = useState("");
  const [status, setStatus] = useState<string>("");
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [docs, setDocs] = useState<OrganizationDocument[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [allActive, setAllActive] = useState(false);

  const loadOrgData = useCallback(async (membership: OrganizationMembership) => {
    setOrgId(membership.organization_id);
    setOrgName(membership.organization_name);
    setStatus(membership.onboarding_status);
    setError(null);
    setLoading(true);
    const [tr, dr] = await Promise.all([
      listDocumentTypes(),
      listOrganizationDocuments(membership.organization_id),
    ]);
    setLoading(false);
    if (!tr.ok) {
      setError(tr.message);
      return;
    }
    setTypes(tr.items.filter((t) => t.is_active && t.required_for_activation));
    if (!dr.ok) {
      setError(dr.message);
      return;
    }
    setDocs(dr.items);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const me = await fetchMe();
    if (!me.ok) {
      setError(me.message);
      setLoading(false);
      return;
    }
    const memberships = me.user.organization_memberships;
    const pending = memberships.filter((m) => m.onboarding_status !== ACTIVE);
    if (pending.length === 0) {
      setAllActive(true);
      setPendingOrgs([]);
      setLoading(false);
      return;
    }
    setAllActive(false);
    setPendingOrgs(pending);
    const target = orgId ? pending.find((m) => m.organization_id === orgId) ?? pending[0]! : pending[0]!;
    await loadOrgData(target);
  }, [loadOrgData, orgId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countByType = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) m.set(d.document_type, (m.get(d.document_type) ?? 0) + 1);
    return m;
  }, [docs]);

  async function onUpload(dt: DocumentType, file: File | null) {
    if (!file || !orgId) return;
    setError(null);
    const r = await uploadOrganizationDocument(orgId, dt.id, file);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    await load();
  }

  async function onRemove(doc: OrganizationDocument) {
    if (!orgId) return;
    if (!window.confirm("Remove this file?")) return;
    setError(null);
    const r = await deleteOrganizationDocument(doc.id, orgId);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    await load();
  }

  async function onSubmit() {
    if (!orgId) return;
    setSubmitting(true);
    setError(null);
    const r = await submitCompliance(orgId);
    setSubmitting(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    await load();
  }

  async function switchOrg(membership: OrganizationMembership) {
    await loadOrgData(membership);
  }

  if (loading && !orgId) {
    return (
      <AdminInterior title="Organization onboarding" description="">
        <div className={styles.loading}>Loading…</div>
      </AdminInterior>
    );
  }

  if (allActive) {
    return (
      <AdminInterior
        title="You are all set"
        description="Your organization is active on the platform."
      >
        <p className={styles.hint} style={{ marginBottom: "1rem" }}>
          You can continue to the operations console.
        </p>
        <a href="/dashboard" className={`${styles.btn} ${styles.btnPrimary}`}>
          Go to dashboard
        </a>
      </AdminInterior>
    );
  }

  const labels: Record<string, string> = {
    pending_documents: "Upload required documents",
    pending_review: "Under review",
    changes_requested: "Changes requested — please update documents",
    rejected: "Application not approved",
  };

  return (
    <AdminInterior
      title="Organization onboarding"
      description={orgName ? `${orgName} · ${labels[status] ?? status}` : labels[status] ?? status}
    >
      {pendingOrgs.length > 1 ? (
        <div style={{ marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
            Select organization
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {pendingOrgs.map((m) => (
              <button
                key={m.organization_id}
                type="button"
                className={styles.btn}
                style={
                  m.organization_id === orgId
                    ? {
                        background: "var(--admin-accent-soft, rgba(196,92,38,0.14))",
                        borderColor: "var(--admin-accent, #c45c26)",
                        color: "var(--admin-text, #f4f4f6)",
                      }
                    : undefined
                }
                onClick={() => void switchOrg(m)}
              >
                {m.organization_name}
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.6875rem",
                    opacity: 0.7,
                  }}
                >
                  ({labels[m.onboarding_status] ?? m.onboarding_status})
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <>
          {status === "pending_review" ? (
            <div className={styles.empty} style={{ textAlign: "left", maxWidth: "36rem" }}>
              Your documents were submitted. A platform administrator will review them shortly. You will be able to use
              the full console once your organization is marked active.
            </div>
          ) : null}

          {status === "rejected" ? (
            <div className={styles.errorBanner}>
              This organization was not approved. Contact support if you believe this is an error.
            </div>
          ) : null}

          {(status === "pending_documents" || status === "changes_requested") && orgId ? (
            <>
              <p className={styles.hint} style={{ marginBottom: "1.25rem", maxWidth: "40rem" }}>
                Upload each required document type. Accepted formats depend on the type (usually PDF or images). When
                everything is complete, submit for review.
              </p>
              <div className={styles.tableWrap} style={{ marginBottom: "1.5rem" }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Document</th>
                      <th scope="col">Required</th>
                      <th scope="col">Uploaded</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((dt) => {
                      const n = countByType.get(dt.id) ?? 0;
                      const typeDocs = docs.filter((d) => d.document_type === dt.id);
                      return (
                        <tr key={dt.id}>
                          <td>
                            <strong>{dt.name}</strong>
                            {dt.help_text ? (
                              <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginTop: "0.25rem" }}>
                                {dt.help_text}
                              </div>
                            ) : null}
                          </td>
                          <td>{dt.max_files} file(s)</td>
                          <td>
                            {n}/{dt.max_files}
                            {typeDocs.map((d) => (
                              <div key={d.id} style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                                <a href={filePublicUrl(d.file)} className={styles.link} target="_blank" rel="noreferrer">
                                  View upload
                                </a>{" "}
                                <button type="button" className={styles.btn} onClick={() => void onRemove(d)}>
                                  Remove
                                </button>
                              </div>
                            ))}
                          </td>
                          <td>
                            {n < dt.max_files ? (
                              <label className={styles.btn} style={{ cursor: "pointer" }}>
                                Upload
                                <input
                                  type="file"
                                  accept={(dt.allowed_extensions ?? []).map((x) => `.${x}`).join(",")}
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = "";
                                    void onUpload(dt, f ?? null);
                                  }}
                                />
                              </label>
                            ) : (
                              <span style={{ color: "var(--admin-text-muted)" }}>Complete</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={submitting}
                onClick={() => void onSubmit()}
              >
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
            </>
          ) : null}
        </>
      )}
    </AdminInterior>
  );
}
