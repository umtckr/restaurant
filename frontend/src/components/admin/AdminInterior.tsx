import styles from "./AdminInterior.module.css";

export function AdminInterior({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {description ? <p className={styles.desc}>{description}</p> : null}
      </header>
      {children}
    </div>
  );
}
