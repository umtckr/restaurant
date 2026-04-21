"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings, Users } from "lucide-react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/locations/Locations.module.css";
import f from "./Floor.module.css";
import { listTables, listZones, type Table, type Zone } from "@/lib/api/locations";
import { useLocationCtx } from "@/store/LocationContext";

type TableGroup = { zone: Zone | null; tables: Table[] };

export function FloorTablesPageView() {
  const { locationId } = useLocationCtx();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);

  const load = useCallback(async () => {
    if (!locationId) {
      setTables([]);
      setZones([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [tr, zr] = await Promise.all([
      listTables(locationId),
      listZones(locationId),
    ]);
    setLoading(false);
    if (!tr.ok) {
      setError(tr.message);
      setTables([]);
      return;
    }
    setTables(
      [...tr.items].sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.label.localeCompare(b.label);
      }),
    );
    if (zr.ok) setZones(zr.items);
  }, [locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo<TableGroup[]>(() => {
    if (zones.length === 0) return [{ zone: null, tables }];
    const grouped = new Map<string, Table[]>();
    const UNASSIGNED = "__unassigned__";
    for (const t of tables) {
      const key = t.zone ?? UNASSIGNED;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(t);
    }
    const result: TableGroup[] = [];
    const sorted = [...zones].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
    for (const z of sorted) {
      if (grouped.has(z.id)) result.push({ zone: z, tables: grouped.get(z.id)! });
    }
    if (grouped.has(UNASSIGNED))
      result.push({ zone: null, tables: grouped.get(UNASSIGNED)! });
    return result;
  }, [tables, zones]);

  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);

  return (
    <AdminInterior
      title="Tables"
      description="All tables for the current location at a glance."
    >
      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={f.toolbar}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh
        </button>
        {locationId && (
          <Link
            href={`/dashboard/locations/${locationId}/tables`}
            className={styles.link}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
          >
            <Settings size={13} /> Manage tables
          </Link>
        )}
      </div>

      {/* Stats */}
      {!loading && tables.length > 0 && (
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

      {loading ? (
        <div className={f.skeletonGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={f.skeleton} style={{ height: 96 }} />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className={f.emptyFloor}>
          <Users size={40} className={f.emptyIcon} />
          <div className={f.emptyTitle}>No tables</div>
          <div className={f.emptyDesc}>
            {locationId
              ? "This location has no tables yet."
              : "Select a location above to view its tables."}
          </div>
          {locationId && (
            <Link
              href={`/dashboard/locations/${locationId}/tables`}
              className={f.emptyLink}
            >
              Add tables →
            </Link>
          )}
        </div>
      ) : (
        groups.map((group) => {
          const hasZoneHeaders = zones.length > 0;
          const groupSeats = group.tables.reduce((s, t) => s + t.capacity, 0);
          return (
            <div
              key={group.zone?.id ?? "__flat__"}
              className={hasZoneHeaders ? f.zoneSection : undefined}
            >
              {hasZoneHeaders && (
                <div className={f.zoneHeader}>
                  <span className={f.zoneName}>
                    {group.zone ? group.zone.name : "Unassigned"}
                  </span>
                  <div className={f.zoneMeta}>
                    <span>
                      {group.tables.length} table
                      {group.tables.length !== 1 ? "s" : ""} · {groupSeats} seats
                    </span>
                  </div>
                </div>
              )}

              <div className={f.tablesGrid}>
                {group.tables.map((t, i) => (
                  <div
                    key={t.id}
                    className={f.tableCard}
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <span className={f.tableCardLabel}>{t.label}</span>
                    <span className={f.tableCardSeats}>
                      <Users size={12} /> {t.capacity} seats
                    </span>
                    {t.zone_name && (
                      <span className={f.tableCardZone}>{t.zone_name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </AdminInterior>
  );
}
