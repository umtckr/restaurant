"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "@/components/locations/Locations.module.css";
import { getApiBase } from "@/lib/api/client";
import {
  listDocumentTypes,
  listOrganizationDocuments,
  uploadOrganizationDocument,
  deleteOrganizationDocument,
  type DocumentType,
  type OrganizationDocument,
} from "@/lib/api/compliance";
import { fetchMe } from "@/lib/api/me";
import { listOrganizations } from "@/lib/api/organizations";

function filePublicUrl(relativePath: string): string {
  if (relativePath.startsWith("http")) return relativePath;
  const base = (getApiBase() ?? "").replace(/\/api\/?$/, "");
  return `${base}${relativePath.startsWith("/") ? "" : "/"}${relativePath}`;
}

export function OrganizationDocumentsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [docs, setDocs] = useState<OrganizationDocument[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);

    const me = await fetchMe();
    if (!me.ok) {
      setError(me.message);
      setLoading(false);
      return;
    }

    const membership = me.user.organization_memberships[0];
    if (!membership) {
      setError("No organization linked to your account.");
      setLoading(false);
      return;
    }

    const oId = membership.organization_id;
    setOrgId(oId);

    const [dt, od] = await Promise.all([
      listDocumentTypes(),
      listOrganizationDocuments(oId),
    ]);
    setLoading(false);

    if (!dt.ok) {
      setError(dt.message);
      return;
    }
    setDocTypes(dt.items.filter((t) => t.is_active));

    if (od.ok) {
      setDocs(od.items);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(docTypeId: string, file: File) {
    if (!orgId) return;
    setUploading(docTypeId);
    setError(null);
    const r = await uploadOrganizationDocument(orgId, docTypeId, file);
    setUploading(null);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    const od = await listOrganizationDocuments(orgId);
    if (od.ok) setDocs(od.items);
  }

  async function handleDelete(docId: string) {
    if (!orgId) return;
    if (!window.confirm("Remove this document?")) return;
    const r = await deleteOrganizationDocument(docId, orgId);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    const od = await listOrganizationDocuments(orgId);
    if (od.ok) setDocs(od.items);
  }

  if (loading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  return (
    <>
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <p className={styles.hint} style={{ marginBottom: "1.25rem", maxWidth: "40rem" }}>
        These are the documents required for your organization. Upload files to satisfy each
        requirement, then submit for review from the onboarding page.
      </p>

      {docTypes.length === 0 ? (
        <div className={styles.empty}>No document types have been configured yet.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Document</th>
                <th scope="col">Required</th>
                <th scope="col">Uploaded files</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docTypes.map((dt) => {
                const uploaded = docs.filter((d) => d.document_type === dt.id);
                const canUpload = uploaded.length < dt.max_files;
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
                    <td>{dt.required_for_activation ? "Yes" : "No"}</td>
                    <td>
                      {uploaded.length === 0 ? (
                        <span style={{ color: "var(--admin-text-muted)" }}>None</span>
                      ) : (
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {uploaded.map((d) => {
                            const fname = d.file?.split("/").pop() ?? "file";
                            return (
                              <li key={d.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                <a
                                  href={filePublicUrl(d.file)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={styles.link}
                                  style={{ fontSize: "0.8125rem" }}
                                >
                                  {fname}
                                </a>
                                <button
                                  type="button"
                                  className={styles.btn}
                                  style={{ fontSize: "0.75rem", padding: "0.15rem 0.4rem" }}
                                  onClick={() => void handleDelete(d.id)}
                                >
                                  Remove
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </td>
                    <td>
                      {canUpload ? (
                        <label className={`${styles.btn} ${styles.btnPrimary}`} style={{ cursor: "pointer" }}>
                          {uploading === dt.id ? "Uploading…" : "Upload"}
                          <input
                            type="file"
                            accept={dt.allowed_extensions.map((e) => `.${e}`).join(",")}
                            hidden
                            disabled={uploading === dt.id}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void handleUpload(dt.id, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      ) : (
                        <span style={{ color: "var(--admin-text-muted)", fontSize: "0.8125rem" }}>
                          Max reached
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
