"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import styles from "@/components/locations/Locations.module.css";
import { getApiBase } from "@/lib/api/client";
import {
  approveComplianceSubmission,
  listComplianceQueue,
  listOrganizationDocuments,
  rejectComplianceSubmission,
  type ComplianceSubmission,
  type OrganizationDocument,
} from "@/lib/api/compliance";

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
  return name.length > 40 ? `${name.slice(0, 37)}…` : name;
}

type ModalIntent = { action: "approve" | "reject"; row: ComplianceSubmission } | null;

export function PlatformComplianceReviewView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ComplianceSubmission[]>([]);
  const [docsById, setDocsById] = useState<Record<string, OrganizationDocument[]>>({});
  const [docsLoading, setDocsLoading] = useState<Record<string, boolean>>({});
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [allowResubmitById, setAllowResubmitById] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const [modalIntent, setModalIntent] = useState<ModalIntent>(null);
  const [modalNote, setModalNote] = useState("");

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const r = await listComplianceQueue();
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setItems(r.items);
    const resubmit: Record<string, boolean> = {};
    for (const row of r.items) resubmit[row.id] = true;
    setAllowResubmitById((prev) => ({ ...resubmit, ...prev }));

    const loadingFlags: Record<string, boolean> = {};
    for (const row of r.items) loadingFlags[row.organization] = true;
    setDocsLoading(loadingFlags);

    const results = await Promise.all(
      r.items.map(async (row) => {
        const dr = await listOrganizationDocuments(row.organization);
        return { orgId: row.organization, docs: dr.ok ? dr.items : [] };
      }),
    );
    const map: Record<string, OrganizationDocument[]> = {};
    const cleared: Record<string, boolean> = {};
    for (const { orgId, docs } of results) {
      map[orgId] = docs;
      cleared[orgId] = false;
    }
    setDocsById(map);
    setDocsLoading(cleared);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setNote(id: string, v: string) {
    setNotesById((m) => ({ ...m, [id]: v }));
  }

  async function confirmModalAction() {
    if (!modalIntent) return;
    const { action, row } = modalIntent;
    setBusyId(row.id);
    setError(null);

    const notes = (modalNote || notesById[row.id] || "").trim();

    let ok = false;
    if (action === "approve") {
      const r = await approveComplianceSubmission(row.id, notes);
      ok = r.ok;
      if (!r.ok) setError(r.message);
    } else {
      const r = await rejectComplianceSubmission(row.id, {
        admin_notes: notes,
        allow_resubmit: allowResubmitById[row.id] !== false,
      });
      ok = r.ok;
      if (!r.ok) setError(r.message);
    }

    setBusyId(null);
    setModalIntent(null);
    setModalNote("");
    if (ok) await load();
  }

  const mc = modalIntent
    ? modalIntent.action === "approve"
      ? {
          title: "Approve submission",
          body: `This will approve "${modalIntent.row.organization_name}" and set their organization to active. They will gain full platform access.`,
          label: "Approve & activate",
          variant: "primary" as const,
        }
      : {
          title: "Reject submission",
          body: `This will reject the submission from "${modalIntent.row.organization_name}".${
            allowResubmitById[modalIntent.row.id] !== false
              ? " The restaurant will be allowed to resubmit."
              : " The restaurant will NOT be allowed to resubmit."
          }`,
          label: "Reject",
          variant: "danger" as const,
        }
    : null;

  return (
    <AdminInterior
      title="Compliance review"
      description="Submissions waiting for approval. Review uploaded documents, then approve or reject."
    >
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      {mc ? (
        <ConfirmModal
          open={!!modalIntent}
          title={mc.title}
          body={mc.body}
          confirmLabel={mc.label}
          variant={mc.variant}
          busy={busyId !== null}
          noteValue={modalNote}
          onNoteChange={setModalNote}
          notePlaceholder="Internal note or message to the applicant…"
          onConfirm={() => void confirmModalAction()}
          onCancel={() => setModalIntent(null)}
        />
      ) : null}

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : items.length === 0 ? (
        <p className={styles.hint}>No submissions in the queue.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {items.map((row) => {
            const orgDocs = docsById[row.organization] ?? [];
            const isDocsLoading = docsLoading[row.organization] ?? false;

            return (
              <article
                key={row.id}
                style={{
                  border: "1px solid var(--admin-border-strong, rgba(255,255,255,0.1))",
                  borderRadius: 12,
                  padding: "1rem 1.15rem",
                  background: "var(--admin-surface, #13161f)",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div>
                    <strong style={{ fontSize: "1rem" }}>{row.organization_name}</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginTop: "0.25rem" }}>
                      Submission {row.id}
                      {row.submitted_at ? ` · ${new Date(row.submitted_at).toLocaleString()}` : ""}
                    </div>
                  </div>
                  <Link href={`/platform/organizations/${row.organization}`} className={styles.link}>
                    Open organization
                  </Link>
                </div>

                {/* Uploaded documents */}
                <div
                  style={{
                    marginBottom: "0.75rem",
                    padding: "0.75rem 0.85rem",
                    borderRadius: 10,
                    background: "var(--admin-bg-elevated, #0e1016)",
                    border: "1px solid var(--admin-border, rgba(255,255,255,0.065))",
                  }}
                >
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                    Uploaded documents ({orgDocs.length})
                  </span>
                  {isDocsLoading ? (
                    <span style={{ fontSize: "0.8125rem", color: "var(--admin-text-muted)" }}>Loading files…</span>
                  ) : orgDocs.length === 0 ? (
                    <span style={{ fontSize: "0.8125rem", color: "var(--admin-text-muted)" }}>No documents found.</span>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      {orgDocs.map((doc) => (
                        <div key={doc.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
                          <span
                            style={{
                              padding: "0.15rem 0.45rem",
                              borderRadius: 6,
                              background: "var(--admin-accent-soft, rgba(196,92,38,0.14))",
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              color: "var(--admin-accent, #c45c26)",
                              flexShrink: 0,
                            }}
                          >
                            {doc.document_type_name}
                          </span>
                          <a
                            href={filePublicUrl(doc.file)}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.link}
                            style={{ fontSize: "0.8125rem" }}
                          >
                            {fileLabel(doc)}
                          </a>
                          <span style={{ fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Admin notes (optional for approve)</span>
                  <textarea
                    className={styles.input}
                    rows={2}
                    value={notesById[row.id] ?? ""}
                    onChange={(e) => setNote(row.id, e.target.value)}
                    placeholder="Internal notes or message to the applicant…"
                  />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", marginBottom: "0.75rem" }}>
                  <input
                    type="checkbox"
                    checked={allowResubmitById[row.id] !== false}
                    onChange={(e) =>
                      setAllowResubmitById((m) => ({
                        ...m,
                        [row.id]: e.target.checked,
                      }))
                    }
                  />
                  On reject: allow restaurant to resubmit (uncheck to permanently reject)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={busyId === row.id}
                    onClick={() => { setModalNote(""); setModalIntent({ action: "approve", row }); }}
                  >
                    Approve & activate
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    style={{ borderColor: "rgba(220,38,38,0.4)", color: "#ef4444" }}
                    disabled={busyId === row.id}
                    onClick={() => { setModalNote(""); setModalIntent({ action: "reject", row }); }}
                  >
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AdminInterior>
  );
}
