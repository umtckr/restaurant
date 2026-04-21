"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/locations/Locations.module.css";
import { createShift, deleteShift, listShifts, type Shift } from "@/lib/api/staff";
import { useLocationCtx } from "@/store/LocationContext";
import { useMe } from "@/store/MeContext";

export function ShiftsView() {
  const { locationId } = useLocationCtx();
  const { me, loading: meLoading, hasRoleForLocation } = useMe();
  const canManage = locationId ? hasRoleForLocation(locationId, "org_admin", "manager") : false;
  const meId = me?.id ?? null;
  const boot = meLoading;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [userId, setUserId] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (meId) setUserId(String(meId));
  }, [meId]);

  const loadShifts = useCallback(async () => {
    if (!locationId) {
      setShifts([]);
      return;
    }
    setLoading(true);
    setError(null);
    const sr = await listShifts({ location: locationId });
    setLoading(false);
    if (!sr.ok) {
      setError(sr.message);
      setShifts([]);
      return;
    }
    setShifts(sr.paged.items);
  }, [locationId]);

  useEffect(() => {
    if (boot) return;
    void loadShifts();
  }, [boot, loadShifts]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const uid = Number(userId);
    if (!Number.isFinite(uid) || !locationId || !starts || !ends) return;
    setAdding(true);
    setError(null);
    const r = await createShift({
      user: uid,
      location: locationId,
      starts_at: new Date(starts).toISOString(),
      ends_at: new Date(ends).toISOString(),
      notes: notes.trim(),
    });
    setAdding(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setNotes("");
    await loadShifts();
  }

  async function remove(s: Shift) {
    if (!window.confirm("Delete this shift?")) return;
    const r = await deleteShift(s.id);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    await loadShifts();
  }

  if (boot) {
    return (
      <AdminInterior title="Shifts" description="">
        <div className={styles.loading}>Loading…</div>
      </AdminInterior>
    );
  }

  return (
    <AdminInterior
      title="Shifts"
      description="Planned coverage per location. Times are stored in UTC on the server."
    >
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <div className={styles.toolbar}>
        <button type="button" className={styles.btn} onClick={() => void loadShifts()} disabled={loading}>
          Refresh
        </button>
      </div>

      {canManage && (
        <form className={styles.form} onSubmit={handleAdd} style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>New shift</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="uid">
                User ID
              </label>
              <input id="uid" className={styles.input} value={userId} onChange={(e) => setUserId(e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="st">
                Starts (local)
              </label>
              <input
                id="st"
                className={styles.input}
                type="datetime-local"
                value={starts}
                onChange={(e) => setStarts(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="en">
                Ends (local)
              </label>
              <input
                id="en"
                className={styles.input}
                type="datetime-local"
                value={ends}
                onChange={(e) => setEnds(e.target.value)}
                required
              />
            </div>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.label} htmlFor="nt">
                Notes
              </label>
              <input id="nt" className={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={adding}>
              {adding ? "Saving…" : "Add shift"}
            </button>
            {meId != null ? (
              <button type="button" className={styles.btn} onClick={() => setUserId(String(meId))}>
                Use my user ID
              </button>
            ) : null}
          </div>
        </form>
      )}

      {loading && shifts.length === 0 ? (
        <div className={styles.loading}>Loading…</div>
      ) : shifts.length === 0 ? (
        <div className={styles.empty}>No shifts for this location.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Starts</th>
                <th scope="col">Ends</th>
                <th scope="col">Notes</th>
                {canManage && <th scope="col" />}
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id}>
                  <td>{s.user}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem" }}>
                    {new Date(s.starts_at).toLocaleString()}
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem" }}>
                    {new Date(s.ends_at).toLocaleString()}
                  </td>
                  <td>{s.notes || "—"}</td>
                  {canManage && (
                    <td>
                      <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => void remove(s)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminInterior>
  );
}
