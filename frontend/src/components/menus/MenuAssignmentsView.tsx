"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/locations/Locations.module.css";
import { listLocations, type Location } from "@/lib/api/locations";
import {
  createMenuLocation,
  listMenuLocations,
  listMenus,
  patchMenuLocation,
  type Menu,
  type MenuLocation,
} from "@/lib/api/menus";

export function MenuAssignmentsView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MenuLocation[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [menuId, setMenuId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const [lr, mr, or] = await Promise.all([
      listMenuLocations(),
      listMenus(),
      listLocations(),
    ]);
    setLoading(false);
    if (!lr.ok) {
      setError(lr.message);
      return;
    }
    setRows(lr.items);
    if (mr.ok) {
      setMenus(mr.paged.items);
      setMenuId((prev) => prev || mr.paged.items[0]?.id || "");
    }
    if (or.ok) {
      setLocations(or.items);
      setLocationId((prev) => prev || or.items[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!menuId || !locationId) return;
    setAdding(true);
    setError(null);
    const r = await createMenuLocation({ menu: menuId, location: locationId, is_active: true });
    setAdding(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    await load();
  }

  async function toggle(row: MenuLocation) {
    setError(null);
    const r = await patchMenuLocation(row.id, { is_active: !row.is_active });
    if (!r.ok) {
      setError(r.message);
      return;
    }
    await load();
  }

  const menuName = (id: string) => menus.find((m) => m.id === id)?.name ?? id.slice(0, 8);
  const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? id.slice(0, 8);

  return (
    <AdminInterior
      title="Menu assignments"
      description="Attach menus to venues. Only one active menu per location is allowed by the server."
    >
      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <p style={{ marginBottom: "1rem" }}>
        <Link href="/dashboard/menus" className={styles.link}>
          ← Menus
        </Link>
      </p>

      <form className={styles.form} onSubmit={handleAdd} style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Assign menu to location</h3>
        <div className={styles.inlineInputs}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="mid">
              Menu
            </label>
            <select id="mid" className={styles.select} value={menuId} onChange={(e) => setMenuId(e.target.value)}>
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="lid">
              Location
            </label>
            <select id="lid" className={styles.select} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ alignSelf: "flex-end" }}
            disabled={adding || !menus.length || !locations.length}
          >
            {adding ? "Saving…" : "Assign"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className={styles.empty}>No assignments yet.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Menu</th>
                <th scope="col">Location</th>
                <th scope="col">Active</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{menuName(r.menu)}</td>
                  <td>{locName(r.location)}</td>
                  <td>{r.is_active ? "Yes" : "No"}</td>
                  <td>
                    <button type="button" className={styles.btn} onClick={() => void toggle(r)}>
                      Toggle active
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminInterior>
  );
}
