"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "@/components/locations/Locations.module.css";
import {
  createDocumentType,
  deleteDocumentType,
  listDocumentTypes,
  patchDocumentType,
  type DocumentType,
} from "@/lib/api/compliance";
import { slugify } from "@/lib/api/locations";

function parseExtensions(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
}

/**
 * Platform admin UI for compliance document types (required uploads before org activation).
 */
export function PlatformDocumentTypesPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DocumentType[]>([]);
  const [creating, setCreating] = useState(false);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [helpText, setHelpText] = useState("");
  const [extensionsRaw, setExtensionsRaw] = useState("pdf, jpg, png");
  const [maxFiles, setMaxFiles] = useState(1);
  const [sortOrder, setSortOrder] = useState(0);
  const [required, setRequired] = useState(true);
  const [activeNew, setActiveNew] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const r = await listDocumentTypes();
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setItems(r.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!slugTouched && name) setSlug(slugify(name));
  }, [name, slugTouched]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const s = slugify(slug);
    const n = name.trim();
    if (!s || !n) return;
    setCreating(true);
    setError(null);
    const ext = parseExtensions(extensionsRaw);
    const r = await createDocumentType({
      slug: s,
      name: n,
      help_text: helpText,
      description: "",
      required_for_activation: required,
      max_files: Math.max(1, Math.min(20, maxFiles)),
      allowed_extensions: ext.length ? ext : ["pdf"],
      sort_order: sortOrder,
      is_active: activeNew,
    });
    setCreating(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setName("");
    setSlug("");
    setSlugTouched(false);
    setHelpText("");
    setExtensionsRaw("pdf, jpg, png");
    setMaxFiles(1);
    setSortOrder(0);
    setRequired(true);
    setActiveNew(true);
    await load();
  }

  async function toggleRow(row: DocumentType, patch: Partial<DocumentType>) {
    setError(null);
    const r = await patchDocumentType(row.id, patch);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    await load();
  }

  async function onDelete(row: DocumentType) {
    if (!window.confirm(`Delete document type “${row.name}”? This cannot be undone.`)) return;
    setError(null);
    const r = await deleteDocumentType(row.id);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    await load();
  }

  return (
    <>
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <>
          <p className={styles.hint} style={{ marginBottom: "1.25rem", maxWidth: "40rem" }}>
            Restaurants must upload at least one file per type that is <strong>active</strong> and marked{" "}
            <strong>required for activation</strong> before they can submit for review. Inactive types stay in the
            database but are hidden from onboarding.
          </p>

          <form
            className={styles.toolbar}
            onSubmit={(e) => void onCreate(e)}
            style={{
              flexDirection: "column",
              alignItems: "stretch",
              gap: "0.75rem",
              marginBottom: "1.5rem",
              maxWidth: "32rem",
            }}
          >
            <strong style={{ fontSize: "0.875rem" }}>Add document type</strong>
            <div className={styles.row2} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <label className={styles.field} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Name</span>
                <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label className={styles.field} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Slug</span>
                <input
                  className={styles.input}
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  required
                />
              </label>
            </div>
            <label className={styles.field} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Help text (shown to restaurants)</span>
              <textarea className={styles.input} rows={2} value={helpText} onChange={(e) => setHelpText(e.target.value)} />
            </label>
            <label className={styles.field} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Allowed extensions (comma-separated, no dot)</span>
              <input className={styles.input} value={extensionsRaw} onChange={(e) => setExtensionsRaw(e.target.value)} />
            </label>
            <div className={styles.row2} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <label className={styles.field} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Max files per organization</span>
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  max={20}
                  value={maxFiles}
                  onChange={(e) => setMaxFiles(Number(e.target.value))}
                />
              </label>
              <label className={styles.field} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Sort order</span>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                />
              </label>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
              <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
              Required for activation
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
              <input type="checkbox" checked={activeNew} onChange={(e) => setActiveNew(e.target.checked)} />
              Active (visible in restaurant onboarding)
            </label>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={creating}>
              {creating ? "Saving…" : "Create document type"}
            </button>
          </form>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Slug</th>
                  <th scope="col">Extensions</th>
                  <th scope="col">Max</th>
                  <th scope="col">Required</th>
                  <th scope="col">Active</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      {row.help_text ? (
                        <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginTop: "0.25rem" }}>
                          {row.help_text}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{row.slug}</td>
                    <td style={{ fontSize: "0.8125rem" }}>{(row.allowed_extensions ?? []).join(", ")}</td>
                    <td>{row.max_files}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.btn}
                        onClick={() => void toggleRow(row, { required_for_activation: !row.required_for_activation })}
                      >
                        {row.required_for_activation ? "Yes" : "No"}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.btn}
                        onClick={() => void toggleRow(row, { is_active: !row.is_active })}
                      >
                        {row.is_active ? "On" : "Off"}
                      </button>
                    </td>
                    <td>
                      <button type="button" className={styles.btn} onClick={() => void onDelete(row)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
