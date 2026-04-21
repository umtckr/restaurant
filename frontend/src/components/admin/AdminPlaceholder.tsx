import { AdminInterior } from "./AdminInterior";
import styles from "./AdminInterior.module.css";

export function AdminPlaceholder({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <AdminInterior
      title={title}
      description={hint ?? "This area is scaffolded for your team—wire it to the API when ready."}
    >
      <div className={styles.card}>
        <div className={styles.placeholderIcon} aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="1.75"
            />
          </svg>
        </div>
        <p>Module placeholder — layout, routing, and shell are in place.</p>
      </div>
    </AdminInterior>
  );
}
