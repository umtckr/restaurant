"use client";

import { useEffect, useRef } from "react";
import locStyles from "@/components/locations/Locations.module.css";
import styles from "./ConfirmModal.module.css";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  busy?: boolean;
  /** Optional textarea for admin notes */
  noteValue?: string;
  onNoteChange?: (v: string) => void;
  notePlaceholder?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  busy = false,
  noteValue,
  onNoteChange,
  notePlaceholder,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector("button")?.focus();
    }
  }, [open]);

  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? `${locStyles.btn} ${locStyles.btnDanger}`
      : `${locStyles.btn} ${locStyles.btnPrimary}`;

  return (
    <div className={styles.overlay} onClick={busy ? undefined : onCancel}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-modal-title" className={styles.title}>
          {title}
        </h3>
        <div className={styles.body}>{body}</div>

        {onNoteChange !== undefined ? (
          <div className={styles.field}>
            <label className={styles.label}>Notes (optional)</label>
            <textarea
              className={styles.textarea}
              value={noteValue ?? ""}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={notePlaceholder ?? "Add a note…"}
              rows={3}
            />
          </div>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={locStyles.btn}
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClass}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
