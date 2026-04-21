"use client";

import { useEffect, useState } from "react";

import { changePassword, fetchMe, patchMe, type MeUser } from "@/lib/api/me";

import { AccountShell } from "./AccountShell";
import styles from "./AccountShell.module.css";

export function AccountProfile() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetchMe();
      if (cancelled || !r.ok) return;
      setMe(r.user);
      setFirstName(r.user.first_name);
      setLastName(r.user.last_name);
      setPhone(r.user.phone ?? "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileSaving(true);
    const r = await patchMe({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
    });
    setProfileSaving(false);
    if (!r.ok) {
      setProfileMsg({ type: "err", text: r.message });
      return;
    }
    setMe(r.user);
    setProfileMsg({ type: "ok", text: "Profile updated successfully." });
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== newPw2) {
      setPwMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: "err", text: "Password must be at least 8 characters." });
      return;
    }
    setPwSaving(true);
    const r = await changePassword({ current_password: curPw, new_password: newPw });
    setPwSaving(false);
    if (!r.ok) {
      setPwMsg({ type: "err", text: r.message });
      return;
    }
    setCurPw("");
    setNewPw("");
    setNewPw2("");
    setPwMsg({ type: "ok", text: "Password changed successfully." });
  }

  return (
    <AccountShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Profile</h1>
        <p className={styles.pageDesc}>
          Keep your personal information up to date.
        </p>
      </div>

      {loading ? (
        <div className={styles.card}>
          <div className={styles.cardBody} style={{ textAlign: "center", color: "var(--ink-subtle)", padding: "3rem" }}>
            Loading...
          </div>
        </div>
      ) : (
        <>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Personal information</h2>
              <p className={styles.cardSubtitle}>Your name, email, and phone number.</p>
            </div>
            <div className={styles.cardBody}>
              {profileMsg && (
                <div className={profileMsg.type === "ok" ? styles.successBanner : styles.errorBanner}>
                  {profileMsg.text}
                </div>
              )}
              <form onSubmit={handleProfileSave}>
                <div className={`${styles.formGrid} ${styles.formGrid2}`}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="p-first">First name</label>
                    <input
                      id="p-first"
                      className={styles.input}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="p-last">Last name</label>
                    <input
                      id="p-last"
                      className={styles.input}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="p-email">Email</label>
                    <input
                      id="p-email"
                      className={styles.input}
                      value={me?.email ?? ""}
                      disabled
                    />
                    <span className={styles.hint}>Contact support to change your email address.</span>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="p-phone">Phone</label>
                    <input
                      id="p-phone"
                      className={styles.input}
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+90 ..."
                    />
                  </div>
                </div>
                <div className={styles.actions}>
                  <button type="submit" className={styles.btnPrimary} disabled={profileSaving}>
                    {profileSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className={styles.card} style={{ marginTop: "1.5rem" }}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Change password</h2>
              <p className={styles.cardSubtitle}>Use a strong password you don't use elsewhere.</p>
            </div>
            <div className={styles.cardBody}>
              {pwMsg && (
                <div className={pwMsg.type === "ok" ? styles.successBanner : styles.errorBanner}>
                  {pwMsg.text}
                </div>
              )}
              <form onSubmit={handlePasswordChange}>
                <div className={styles.formGrid} style={{ maxWidth: 400 }}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="pw-cur">Current password</label>
                    <input
                      id="pw-cur"
                      className={styles.input}
                      type="password"
                      autoComplete="current-password"
                      value={curPw}
                      onChange={(e) => setCurPw(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="pw-new">New password</label>
                    <input
                      id="pw-new"
                      className={styles.input}
                      type="password"
                      autoComplete="new-password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      required
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="pw-confirm">Confirm new password</label>
                    <input
                      id="pw-confirm"
                      className={styles.input}
                      type="password"
                      autoComplete="new-password"
                      value={newPw2}
                      onChange={(e) => setNewPw2(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className={styles.actions}>
                  <button type="submit" className={styles.btnPrimary} disabled={pwSaving}>
                    {pwSaving ? "Changing..." : "Change password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </AccountShell>
  );
}
