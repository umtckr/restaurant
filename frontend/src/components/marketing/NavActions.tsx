"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getAccessToken } from "@/lib/api/http";

import styles from "./HomePage.module.css";

export function NavLinks() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!getAccessToken());
  }, []);

  return (
    <nav className={styles.navLinks} aria-label="Primary">
      <Link href="/pricing">Pricing</Link>
      <Link href="/contact">Contact</Link>
      {authed ? (
        <Link href="/dashboard">Dashboard</Link>
      ) : (
        <Link href="/login">Product login</Link>
      )}
    </nav>
  );
}

export function NavActions({ primaryCta, primaryHref }: { primaryCta: string; primaryHref: string }) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!getAccessToken());
  }, []);

  return (
    <div className={styles.navActions}>
      {authed ? (
        <Link href="/dashboard" className={styles.btnPrimary}>
          Dashboard
        </Link>
      ) : (
        <>
          <Link href="/login" className={styles.btnGhost}>
            Log in
          </Link>
          <Link href={primaryHref} className={styles.btnPrimary}>
            {primaryCta}
          </Link>
        </>
      )}
    </div>
  );
}
