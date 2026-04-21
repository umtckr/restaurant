"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Layers, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import {
  getLocation,
  listTables,
  listZones,
  createTable,
  patchTable,
  deleteTable,
  createZone,
  patchZone,
  deleteZone,
  type Location,
  type Table,
  type Zone,
} from "@/lib/api/locations";
import { useMe } from "@/store/MeContext";

import styles from "./Locations.module.css";
import f from "@/components/floor/Floor.module.css";

type TableGroup = { zone: Zone | null; tables: Table[] };

export function LocationTablesView() {
  const params = useParams();
  const id = typeof params?.locationId === "string" ? params.locationId : "";
  const { hasRoleForLocation } = useMe();
  const canManage = id ? hasRoleForLocation(id, "org_admin", "manager") : false;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loc, setLoc] = useState<Location | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);

  // Add table form
  const [newLabel, setNewLabel] = useState("");
  const [newCapacity, setNewCapacity] = useState(4);
  const [newSort, setNewSort] = useState(0);
  const [newZoneId, setNewZoneId] = useState<string>("");
  const [adding, setAdding] = useState(false);

  // Inline edit (modal-style overlay on card)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCapacity, setEditCapacity] = useState(4);
  const [editSort, setEditSort] = useState(0);
  const [editZoneId, setEditZoneId] = useState<string>("");

  // Zone management
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneSort, setNewZoneSort] = useState(0);
  const [addingZone, setAddingZone] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editZoneName, setEditZoneName] = useState("");
  const [editZoneSort, setEditZoneSort] = useState(0);

  // Collapsible groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const [lr, tr, zr] = await Promise.all([getLocation(id), listTables(id), listZones(id)]);
    if (!lr.ok) {
      setError(lr.message);
      setLoc(null);
      setLoading(false);
      return;
    }
    setLoc(lr.location);
    if (zr.ok) setZones(zr.items);
    if (!tr.ok) {
      setError(tr.message);
      setTables([]);
    } else {
      setTables(tr.items);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo<TableGroup[]>(() => {
    const sorted = [...tables].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.label.localeCompare(b.label);
    });

    const grouped = new Map<string, Table[]>();
    const UNASSIGNED = "__unassigned__";
    for (const t of sorted) {
      const key = t.zone ?? UNASSIGNED;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(t);
    }

    const result: TableGroup[] = [];
    const sortedZones = [...zones].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    for (const z of sortedZones) {
      if (grouped.has(z.id)) result.push({ zone: z, tables: grouped.get(z.id)! });
    }
    if (grouped.has(UNASSIGNED)) result.push({ zone: null, tables: grouped.get(UNASSIGNED)! });
    if (zones.length === 0 && sorted.length > 0 && result.length === 0) {
      result.push({ zone: null, tables: sorted });
    }
    return result;
  }, [tables, zones]);

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  /* ── Zone CRUD ── */
  async function handleAddZone(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !newZoneName.trim()) return;
    setAddingZone(true);
    setError(null);
    const res = await createZone({ location: id, name: newZoneName.trim(), sort_order: newZoneSort });
    setAddingZone(false);
    if (!res.ok) { setError(res.message); return; }
    setNewZoneName("");
    setNewZoneSort(0);
    setShowZoneForm(false);
    await load();
  }

  function startEditZone(z: Zone) {
    setEditingZoneId(z.id);
    setEditZoneName(z.name);
    setEditZoneSort(z.sort_order);
  }

  async function saveZone(zoneId: string) {
    setError(null);
    const res = await patchZone(zoneId, { name: editZoneName.trim(), sort_order: editZoneSort });
    if (!res.ok) { setError(res.message); return; }
    setEditingZoneId(null);
    await load();
  }

  async function handleDeleteZone(zoneId: string, name: string) {
    if (!window.confirm(`Delete zone "${name}"? Tables in this zone will become unassigned.`)) return;
    setError(null);
    const res = await deleteZone(zoneId);
    if (!res.ok) { setError(res.message); return; }
    await load();
  }

  /* ── Table CRUD ── */
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !newLabel.trim()) return;
    setAdding(true);
    setError(null);
    const res = await createTable({
      location: id,
      label: newLabel.trim(),
      capacity: newCapacity,
      sort_order: newSort,
      zone: newZoneId || null,
    });
    setAdding(false);
    if (!res.ok) { setError(res.message); return; }
    setNewLabel("");
    setNewCapacity(4);
    setNewSort(0);
    await load();
  }

  function startEdit(t: Table) {
    setEditingId(t.id);
    setEditLabel(t.label);
    setEditCapacity(t.capacity);
    setEditSort(t.sort_order);
    setEditZoneId(t.zone ?? "");
  }

  async function saveEdit(tableId: string) {
    setError(null);
    const res = await patchTable(tableId, {
      label: editLabel.trim(),
      capacity: editCapacity,
      sort_order: editSort,
      zone: editZoneId || null,
    });
    if (!res.ok) { setError(res.message); return; }
    setEditingId(null);
    await load();
  }

  async function handleDelete(tableId: string, label: string) {
    if (!window.confirm(`Remove table "${label}"?`)) return;
    setError(null);
    const res = await deleteTable(tableId);
    if (!res.ok) { setError(res.message); return; }
    await load();
  }

  /* ── Early returns ── */
  if (!id) {
    return (
      <AdminInterior title="Tables" description="">
        <div className={styles.errorBanner}>Invalid location.</div>
      </AdminInterior>
    );
  }

  if (loading) {
    return (
      <AdminInterior title="Tables" description="">
        <div className={styles.loading}>Loading…</div>
      </AdminInterior>
    );
  }

  if (!loc) {
    return (
      <AdminInterior title="Tables" description="">
        <div className={styles.errorBanner}>{error ?? "Location not found."}</div>
        <Link href="/dashboard/locations" className={styles.link}>← Locations</Link>
      </AdminInterior>
    );
  }

  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);

  return (
    <AdminInterior
      title={`Tables · ${loc.name}`}
      description="Manage zones and tables for QR sessions and service."
    >
      <p style={{ marginBottom: "1rem" }}>
        <Link href={`/dashboard/locations/${id}`} className={styles.link}>← Overview</Link>
        {" · "}
        <Link href={`/dashboard/locations/${id}/settings`} className={styles.link}>Settings</Link>
      </p>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Stats */}
      {tables.length > 0 && (
        <div className={f.statsBar}>
          <div className={f.statChip}>
            Tables <span className={f.statChipValue}>{tables.length}</span>
          </div>
          <div className={f.statChip}>
            Total seats <span className={f.statChipValue}>{totalSeats}</span>
          </div>
          {zones.length > 0 && (
            <div className={f.statChip}>
              Zones <span className={f.statChipValue}>{zones.length}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Zones Section ── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--admin-text, #f4f4f6)" }}>
            <Layers size={16} /> Zones
          </h3>
          {canManage && (
            <button
              type="button"
              className={styles.btn}
              onClick={() => setShowZoneForm(!showZoneForm)}
              style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
            >
              <Plus size={14} />
              {showZoneForm ? "Cancel" : "Add zone"}
            </button>
          )}
        </div>

        {showZoneForm && (
          <form onSubmit={handleAddZone} className={f.zoneAddCard}>
            <div className={f.zoneAddFields}>
              <div className={f.addTableField} style={{ minWidth: "10rem", flex: 1 }}>
                <label className={f.addTableLabel} htmlFor="zoneName">Name</label>
                <input
                  id="zoneName"
                  className={f.addTableInput}
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="e.g. Terrace, Ground Floor"
                  required
                />
              </div>
              <div className={f.addTableField} style={{ width: "5rem" }}>
                <label className={f.addTableLabel} htmlFor="zoneSort">Sort order</label>
                <input
                  id="zoneSort"
                  className={f.addTableInput}
                  type="number"
                  min={0}
                  value={newZoneSort}
                  onChange={(e) => setNewZoneSort(Number(e.target.value))}
                />
              </div>
              <button
                type="submit"
                className={f.addTableSubmit}
                style={{ alignSelf: "flex-end" }}
                disabled={addingZone}
              >
                {addingZone ? "Adding…" : "Add zone"}
              </button>
            </div>
          </form>
        )}

        {zones.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--admin-text-muted, #8b919d)" }}>
            No zones yet. Tables will appear in a single list. Create zones like &ldquo;Terrace&rdquo; or &ldquo;VIP&rdquo; to organize them.
          </p>
        ) : (
          <div className={f.cardGrid}>
            {zones
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
              .map((z) => {
                const count = tables.filter((t) => t.zone === z.id).length;
                const isEditing = editingZoneId === z.id;
                return (
                  <div key={z.id} className={f.tableManageCard}>
                    {isEditing ? (
                      <>
                        <div className={f.addTableField}>
                          <label className={f.addTableLabel}>Name</label>
                          <input
                            className={f.addTableInput}
                            value={editZoneName}
                            onChange={(e) => setEditZoneName(e.target.value)}
                          />
                        </div>
                        <div className={f.addTableField}>
                          <label className={f.addTableLabel}>Sort</label>
                          <input
                            className={f.addTableInput}
                            type="number"
                            min={0}
                            value={editZoneSort}
                            onChange={(e) => setEditZoneSort(Number(e.target.value))}
                          />
                        </div>
                        <div className={f.tableManageActions}>
                          <button type="button" className={f.addTableSubmit} style={{ flex: 1, fontSize: "0.6875rem", padding: "0.35rem 0" }} onClick={() => void saveZone(z.id)}>Save</button>
                          <button type="button" className={f.tableManageBtn} style={{ flex: 1 }} onClick={() => setEditingZoneId(null)}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={f.tableManageRow1}>
                          <MapPin size={13} style={{ color: "var(--admin-text-muted)", flexShrink: 0 }} />
                          <span className={f.tableManageLabel}>{z.name}</span>
                        </div>
                        <div className={f.tableManageMeta}>
                          {count} table{count !== 1 ? "s" : ""} · sort {z.sort_order}
                        </div>
                        {canManage && (
                          <div className={f.tableManageActions}>
                            <button type="button" className={f.tableManageBtn} onClick={() => startEditZone(z)}>
                              <Pencil size={10} /> Edit
                            </button>
                            <button type="button" className={`${f.tableManageBtn} ${f.tableManageBtnDanger}`} onClick={() => void handleDeleteZone(z.id, z.name)}>
                              <Trash2 size={10} /> Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* ── Add Table ── */}
      {canManage && (
        <form onSubmit={handleAdd} className={f.addTableCard}>
          <div className={f.addTableHeader}>
            <h3 className={f.addTableTitle}>
              <Plus size={16} /> Add table
            </h3>
          </div>
          <div className={f.addTableFields}>
            <div className={f.addTableField}>
              <label className={f.addTableLabel} htmlFor="newLabel">Label</label>
              <input
                id="newLabel"
                className={f.addTableInput}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. T1, A12"
                required
              />
            </div>
            <div className={f.addTableField}>
              <label className={f.addTableLabel} htmlFor="newCap">Seats</label>
              <input
                id="newCap"
                className={f.addTableInput}
                type="number"
                min={1}
                max={99}
                value={newCapacity}
                onChange={(e) => setNewCapacity(Number(e.target.value))}
              />
            </div>
            <div className={f.addTableField}>
              <label className={f.addTableLabel} htmlFor="newSort">Sort order</label>
              <input
                id="newSort"
                className={f.addTableInput}
                type="number"
                min={0}
                value={newSort}
                onChange={(e) => setNewSort(Number(e.target.value))}
              />
            </div>
            {zones.length > 0 && (
              <div className={f.addTableField}>
                <label className={f.addTableLabel} htmlFor="newZone">Zone</label>
                <select
                  id="newZone"
                  className={f.addTableSelect}
                  value={newZoneId}
                  onChange={(e) => setNewZoneId(e.target.value)}
                >
                  <option value="">No zone</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className={f.addTableSubmit} disabled={adding}>
              {adding ? "Adding…" : "Add table"}
            </button>
          </div>
        </form>
      )}

      {/* ── Tables (grouped by zone) ── */}
      {tables.length === 0 ? (
        <div className={f.emptyFloor}>
          <Users size={40} className={f.emptyIcon} />
          <div className={f.emptyTitle}>No tables yet</div>
          <div className={f.emptyDesc}>Use the form above to add your first table.</div>
        </div>
      ) : (
        groups.map((group) => {
          const groupKey = group.zone?.id ?? "__unassigned__";
          const collapsed = collapsedGroups.has(groupKey);
          const hasZones = zones.length > 0;

          return (
            <div key={groupKey} className={hasZones ? f.zoneSection : undefined}>
              {hasZones && (
                <button
                  type="button"
                  onClick={() => toggleGroup(groupKey)}
                  className={f.zoneHeader}
                  style={{ width: "100%", cursor: "pointer", marginBottom: collapsed ? 0 : undefined }}
                >
                  <MapPin size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                  <span className={f.zoneName}>
                    {group.zone ? group.zone.name : "Unassigned"}
                  </span>
                  <div className={f.zoneMeta}>
                    <span>
                      {group.tables.length} table{group.tables.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ChevronDown size={16} style={{
                    color: "var(--admin-text-muted)",
                    transition: "transform 0.2s",
                    transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  }} />
                </button>
              )}
              {!collapsed && (
                <div className={f.tableManageGrid}>
                  {group.tables.map((t, i) => {
                    const isEditing = editingId === t.id;
                    return (
                      <div
                        key={t.id}
                        className={f.tableManageCard}
                        style={{ animationDelay: `${i * 25}ms` }}
                      >
                        {isEditing ? (
                          <>
                            <div className={f.addTableField}>
                              <label className={f.addTableLabel}>Label</label>
                              <input className={f.addTableInput} value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <div className={f.addTableField} style={{ flex: 1 }}>
                                <label className={f.addTableLabel}>Seats</label>
                                <input className={f.addTableInput} type="number" min={1} value={editCapacity} onChange={(e) => setEditCapacity(Number(e.target.value))} />
                              </div>
                              <div className={f.addTableField} style={{ flex: 1 }}>
                                <label className={f.addTableLabel}>Sort</label>
                                <input className={f.addTableInput} type="number" min={0} value={editSort} onChange={(e) => setEditSort(Number(e.target.value))} />
                              </div>
                            </div>
                            {zones.length > 0 && (
                              <div className={f.addTableField}>
                                <label className={f.addTableLabel}>Zone</label>
                                <select className={f.addTableSelect} value={editZoneId} onChange={(e) => setEditZoneId(e.target.value)}>
                                  <option value="">No zone</option>
                                  {zones.map((z) => (
                                    <option key={z.id} value={z.id}>{z.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className={f.tableManageActions}>
                              <button type="button" className={f.addTableSubmit} style={{ flex: 1, fontSize: "0.6875rem", padding: "0.35rem 0" }} onClick={() => void saveEdit(t.id)}>Save</button>
                              <button type="button" className={f.tableManageBtn} style={{ flex: 1 }} onClick={() => setEditingId(null)}>Cancel</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={f.tableManageRow1}>
                              <span className={f.tableManageLabel}>{t.label}</span>
                              <span className={f.tableManageSeats}>
                                <Users size={11} /> {t.capacity}
                              </span>
                            </div>
                            <div className={f.tableManageMeta}>
                              Sort {t.sort_order}
                              {t.zone_name && (
                                <span className={f.tableManageZoneBadge}>{t.zone_name}</span>
                              )}
                            </div>
                            {canManage && (
                              <div className={f.tableManageActions}>
                                <button type="button" className={f.tableManageBtn} onClick={() => startEdit(t)}>
                                  <Pencil size={10} /> Edit
                                </button>
                                <button type="button" className={`${f.tableManageBtn} ${f.tableManageBtnDanger}`} onClick={() => void handleDelete(t.id, t.label)}>
                                  <Trash2 size={10} /> Delete
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* ── Edit table modal ── */}
    </AdminInterior>
  );
}
