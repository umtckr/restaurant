"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Clock, Settings, Users, X } from "lucide-react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import styles from "@/components/locations/Locations.module.css";
import f from "./Floor.module.css";
import { listTables, listZones, type Table, type Zone } from "@/lib/api/locations";
import { useLocationCtx } from "@/store/LocationContext";
import {
  closeDiningSession,
  listDiningSessions,
  openDiningSession,
  type DiningSession,
} from "@/lib/api/sessions";
import {
  listCustomerRequests,
  listOrders,
  patchCustomerRequest,
  type CustomerRequest,
  type Order,
} from "@/lib/api/orders";
import { useLocationSocket, type LocationEvent } from "@/lib/realtime/useLocationSocket";
import { useMe } from "@/store/MeContext";

function formatMoney(s: string | null | undefined) {
  if (!s) return "—";
  const n = Number(s);
  if (Number.isNaN(n)) return s;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatElapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "0m";
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

export function FloorLiveView() {
  const { locationId, locations } = useLocationCtx();
  const { hasRoleForLocation } = useMe();
  const canManageSessions = locationId
    ? hasRoleForLocation(locationId, "org_admin", "manager", "waiter", "host")
    : false;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [sessions, setSessions] = useState<DiningSession[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [, setTick] = useState(0);

  // Close session confirmation modal
  const [closeTarget, setCloseTarget] = useState<{
    session: DiningSession;
    table: Table;
  } | null>(null);
  const [closeOrders, setCloseOrders] = useState<Order[]>([]);
  const [closeLoading, setCloseLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  // Tick every minute to keep elapsed times fresh
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => {
    tickRef.current = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(tickRef.current);
  }, []);

  const loadRequests = useCallback(async () => {
    const [crOpen, crAck] = await Promise.all([
      listCustomerRequests(undefined, { status: "open" }),
      listCustomerRequests(undefined, { status: "acknowledged" }),
    ]);
    const items: CustomerRequest[] = [];
    if (crOpen.ok) items.push(...crOpen.items);
    if (crAck.ok) {
      const ids = new Set(items.map((r) => r.id));
      items.push(...crAck.items.filter((r) => !ids.has(r.id)));
    }
    setRequests(items);
  }, []);

  const load = useCallback(async () => {
    if (!locationId) {
      setLoading(false);
      setTables([]);
      setZones([]);
      setSessions([]);
      setRequests([]);
      return;
    }
    setError(null);
    setLoading(true);
    const [tr, zr, sr] = await Promise.all([
      listTables(locationId),
      listZones(locationId),
      listDiningSessions({ location: locationId, status: "open" }),
    ]);
    setLoading(false);
    if (!tr.ok) {
      setError(tr.message);
      setTables([]);
    } else {
      setTables(
        [...tr.items].sort((a, b) => {
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.label.localeCompare(b.label);
        }),
      );
    }
    if (zr.ok) setZones(zr.items);
    if (!sr.ok) {
      setError((e) => (e ? `${e}; ${sr.message}` : sr.message));
      setSessions([]);
    } else {
      setSessions(sr.paged.items);
    }
    await loadRequests();
  }, [locationId, loadRequests]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleWsEvent = useCallback(
    (event: LocationEvent) => {
      switch (event.type) {
        case "connection.ready":
          setWsConnected(true);
          break;
        case "customer_request.updated":
          void loadRequests();
          break;
        case "order.updated":
          break;
        case "session.updated":
          if (locationId) {
            void listDiningSessions({ location: locationId, status: "open" }).then((sr) => {
              if (sr.ok) setSessions(sr.paged.items);
            });
          }
          break;
      }
    },
    [locationId, loadRequests],
  );

  useLocationSocket(locationId || null, handleWsEvent);

  const sessionByTable = useMemo(() => {
    const m = new Map<string, DiningSession>();
    for (const s of sessions) m.set(s.table, s);
    return m;
  }, [sessions]);

  const requestsBySession = useMemo(() => {
    const m = new Map<string, CustomerRequest[]>();
    for (const r of requests) {
      const arr = m.get(r.dining_session) ?? [];
      arr.push(r);
      m.set(r.dining_session, arr);
    }
    return m;
  }, [requests]);

  async function handleOpen(tableId: string) {
    setBusy(tableId);
    setError(null);
    const r = await openDiningSession(tableId);
    setBusy(null);
    if (!r.ok) { setError(r.message); return; }
    await load();
  }

  async function confirmClose(sess: DiningSession, table: Table) {
    setCloseTarget({ session: sess, table });
    setCloseLoading(true);
    setCloseOrders([]);
    const r = await listOrders({ dining_session: sess.id });
    setCloseLoading(false);
    if (r.ok) setCloseOrders(r.paged.items);
  }

  async function doClose() {
    if (!closeTarget) return;
    setClosing(true);
    setError(null);
    const r = await closeDiningSession(closeTarget.session.id);
    setClosing(false);
    if (!r.ok) { setError(r.message); setCloseTarget(null); return; }
    setCloseTarget(null);
    await load();
  }

  async function handleAcknowledge(reqId: string) {
    setBusy(reqId);
    const r = await patchCustomerRequest(reqId, { status: "acknowledged" });
    setBusy(null);
    if (!r.ok) { setError(r.message); return; }
    setRequests((prev) => prev.map((cr) => (cr.id === r.item.id ? r.item : cr)));
  }

  async function handleDone(reqId: string) {
    setBusy(reqId);
    const r = await patchCustomerRequest(reqId, { status: "done" });
    setBusy(null);
    if (!r.ok) { setError(r.message); return; }
    setRequests((prev) => prev.filter((cr) => cr.id !== r.item.id));
  }

  const tableGroups = useMemo(() => {
    if (zones.length === 0) return [{ zone: null as Zone | null, tables }];
    const grouped = new Map<string, Table[]>();
    const UNASSIGNED = "__unassigned__";
    for (const t of tables) {
      const key = t.zone ?? UNASSIGNED;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(t);
    }
    const result: { zone: Zone | null; tables: Table[] }[] = [];
    const sortedZones = [...zones].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
    for (const z of sortedZones) {
      if (grouped.has(z.id)) result.push({ zone: z, tables: grouped.get(z.id)! });
    }
    if (grouped.has(UNASSIGNED))
      result.push({ zone: null, tables: grouped.get(UNASSIGNED)! });
    return result;
  }, [tables, zones]);

  const loc = locations.find((l) => l.id === locationId);
  const occupiedCount = sessions.length;
  const totalCount = tables.length;
  const availableCount = totalCount - occupiedCount;
  const pendingReqs = requests.filter((r) => r.status === "open").length;

  /* ── Render ── */
  return (
    <AdminInterior
      title="Floor"
      description="Live overview of tables and guest sessions."
    >
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Toolbar */}
      <div className={f.toolbar}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh
        </button>
        {loc && (
          <Link
            href={`/dashboard/locations/${loc.id}/tables`}
            className={styles.link}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
          >
            <Settings size={13} /> Manage tables
          </Link>
        )}
        <div className={f.toolbarRight}>
          <span
            className={`${f.liveDot} ${wsConnected ? f.liveDotOn : f.liveDotOff}`}
            title={wsConnected ? "Real-time connection active" : "Connecting…"}
          >
            ● {wsConnected ? "Live" : "Connecting…"}
          </span>
        </div>
      </div>

      {/* Stats */}
      {!loading && tables.length > 0 && (
        <div className={f.statsBar}>
          <div className={f.statChip}>
            Total <span className={f.statChipValue}>{totalCount}</span>
          </div>
          <div className={f.statChip}>
            Occupied <span className={f.statChipValue}>{occupiedCount}</span>
          </div>
          <div className={f.statChip}>
            Available <span className={f.statChipValue}>{availableCount}</span>
          </div>
          {pendingReqs > 0 && (
            <div className={`${f.statChip} ${f.statChipAccent}`}>
              Requests <span className={f.statChipValue}>{pendingReqs}</span>
            </div>
          )}
        </div>
      )}

      {/* Customer requests */}
      {requests.length > 0 && (
        <div className={f.requestsSection}>
          <div className={f.requestsHeader}>
            <span className={f.requestsBadge}>{pendingReqs || requests.length}</span>
            Customer request{requests.length !== 1 ? "s" : ""}
          </div>
          <div className={f.requestGrid}>
            {requests.map((req) => {
              const sess = sessions.find((ss) => ss.id === req.dining_session);
              const isBill = req.request_type === "bill";
              const isOpen = req.status === "open";
              return (
                <div
                  key={req.id}
                  className={`${f.reqCard} ${isOpen ? f.reqCardOpen : ""}`}
                >
                  <div className={f.reqTop}>
                    <span className={f.reqTable}>
                      {req.table_label ?? sess?.table_label ?? "—"}
                    </span>
                    <span className={`${f.reqType} ${isBill ? f.reqTypeBill : ""}`}>
                      {req.request_type.replaceAll("_", " ")}
                    </span>
                    {isBill && (
                      <span className={f.reqAmount}>{formatMoney(req.session_total)}</span>
                    )}
                  </div>
                  {req.note && <div className={f.reqNote}>{req.note}</div>}
                  <div className={f.reqBottom}>
                    <span className={f.reqTime}>
                      {new Date(req.created_at).toLocaleTimeString()}
                    </span>
                    {isOpen && (
                      <button
                        type="button"
                        className={`${f.reqBtn} ${f.reqBtnPrimary}`}
                        disabled={busy === req.id}
                        onClick={() => void handleAcknowledge(req.id)}
                      >
                        {busy === req.id ? "…" : "Acknowledge"}
                      </button>
                    )}
                    <button
                      type="button"
                      className={f.reqBtn}
                      disabled={busy === req.id}
                      onClick={() => void handleDone(req.id)}
                    >
                      {busy === req.id ? "…" : "Done"}
                    </button>
                    {sess && (
                      <Link
                        href={`/dashboard/floor/sessions/${sess.id}`}
                        className={f.reqLink}
                      >
                        Session
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tables */}
      {!locationId ? (
        <div className={f.emptyFloor}>
          <div className={f.emptyTitle}>No location selected</div>
          <div className={f.emptyDesc}>
            Select a location from the dropdown above to view its floor.
          </div>
        </div>
      ) : loading ? (
        <div className={f.skeletonGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={f.skeleton} />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className={f.emptyFloor}>
          <Users size={40} className={f.emptyIcon} />
          <div className={f.emptyTitle}>No tables yet</div>
          <div className={f.emptyDesc}>
            Add tables to start managing your floor.
          </div>
          <Link
            href={`/dashboard/locations/${locationId}/tables`}
            className={f.emptyLink}
          >
            Add tables →
          </Link>
        </div>
      ) : (
        tableGroups.map((group) => {
          const hasZoneHeaders = zones.length > 0;
          const groupOccupied = group.tables.filter((t) =>
            sessionByTable.has(t.id),
          ).length;
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
                    {groupOccupied > 0 && (
                      <span className={f.zoneOccupied}>
                        {groupOccupied}/{group.tables.length} occupied
                      </span>
                    )}
                    {groupOccupied === 0 && (
                      <span>
                        {group.tables.length} table
                        {group.tables.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className={f.cardGrid}>
                {group.tables.map((t, i) => {
                  const sess = sessionByTable.get(t.id);
                  const reqs = sess ? requestsBySession.get(sess.id) ?? [] : [];
                  const openReqs = reqs.filter((r) => r.status === "open").length;
                  const hasAlert = openReqs > 0;

                  const variant = sess
                    ? hasAlert
                      ? f.cardAlert
                      : f.cardOccupied
                    : f.cardAvailable;
                  const dotClass = sess
                    ? hasAlert
                      ? f.statusDotAlert
                      : f.statusDotOccupied
                    : f.statusDotAvailable;

                  return (
                    <div
                      key={t.id}
                      className={`${f.card} ${variant}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      {/* Row 1: status dot + label + seats */}
                      <div className={f.cardRow1}>
                        <span className={`${f.statusDot} ${dotClass}`} />
                        <span className={f.cardLabel}>{t.label}</span>
                        <span className={f.cardSeats}>
                          <Users size={11} /> {t.capacity}
                        </span>
                      </div>

                      {/* Row 2: elapsed time + request badge */}
                      <div className={f.cardMid}>
                        {sess && (
                          <span className={f.cardElapsed}>
                            <Clock size={11} />
                            {formatElapsed(sess.created_at)}
                          </span>
                        )}
                        {hasAlert && (
                          <span className={f.cardReqBadge}>
                            {openReqs} req{openReqs !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Row 3: action buttons */}
                      <div className={f.cardActions}>
                        {canManageSessions ? (
                          sess ? (
                            <>
                              <Link
                                href={`/dashboard/floor/sessions/${sess.id}`}
                                className={`${f.cardBtn} ${f.cardBtnDetail}`}
                              >
                                Details
                              </Link>
                              <button
                                type="button"
                                className={`${f.cardBtn} ${f.cardBtnClose}`}
                                onClick={() => void confirmClose(sess, t)}
                              >
                                Close
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className={`${f.cardBtn} ${f.cardBtnOpen}`}
                              disabled={busy === t.id}
                              onClick={() => void handleOpen(t.id)}
                            >
                              {busy === t.id ? "Opening…" : "Open session"}
                            </button>
                          )
                        ) : (
                          <span className={f.cardStatusLabel}>
                            {sess ? "Occupied" : "Available"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
      {/* ── Close session confirmation modal ── */}
      {closeTarget && (() => {
        const { session: sess, table: tbl } = closeTarget;
        const activeOrders = closeOrders.filter(
          (o) => o.status !== "served" && o.status !== "cancelled",
        );
        const totalRevenue = closeOrders
          .filter((o) => o.status !== "cancelled")
          .reduce((sum, o) => sum + Number(o.total || 0), 0);
        const elapsedMs = Date.now() - new Date(sess.created_at).getTime();
        const elapsedMin = Math.floor(elapsedMs / 60_000);
        const elapsedStr =
          elapsedMin < 60
            ? `${elapsedMin}m`
            : `${Math.floor(elapsedMin / 60)}h ${elapsedMin % 60}m`;

        return (
          <div className={f.closeOverlay} onClick={() => !closing && setCloseTarget(null)}>
            <div className={f.closeModal} onClick={(e) => e.stopPropagation()}>
              <div className={f.closeModalHeader}>
                <div className={f.closeModalIcon}><X size={16} /></div>
                <h3 className={f.closeModalTitle}>Close session — {tbl.label}</h3>
              </div>

              <div className={f.closeModalBody}>
                {closeLoading ? (
                  <p style={{ textAlign: "center", color: "var(--admin-text-muted)", padding: "0.5rem 0" }}>
                    Loading session details…
                  </p>
                ) : (
                  <>
                    <div className={f.closeDetailGrid}>
                      <div className={f.closeDetailItem}>
                        <div className={f.closeDetailLabel}>Table</div>
                        <div className={f.closeDetailValue}>{tbl.label}</div>
                      </div>
                      <div className={f.closeDetailItem}>
                        <div className={f.closeDetailLabel}>Seats</div>
                        <div className={f.closeDetailValue}>{tbl.capacity}</div>
                      </div>
                      <div className={f.closeDetailItem}>
                        <div className={f.closeDetailLabel}>Duration</div>
                        <div className={f.closeDetailValue}>{elapsedStr}</div>
                      </div>
                      <div className={f.closeDetailItem}>
                        <div className={f.closeDetailLabel}>Orders</div>
                        <div className={f.closeDetailValue}>{closeOrders.length}</div>
                      </div>
                      <div className={`${f.closeDetailItem} ${f.closeDetailFull}`}>
                        <div className={f.closeDetailLabel}>Total Revenue</div>
                        <div className={f.closeDetailValue} style={{ fontSize: "1.1rem" }}>
                          {formatMoney(String(totalRevenue.toFixed(2)))}
                        </div>
                      </div>
                    </div>

                    {activeOrders.length > 0 && (
                      <div className={f.closeWarning}>
                        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                        {activeOrders.length} order{activeOrders.length !== 1 ? "s" : ""} still
                        in progress
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className={f.closeModalFooter}>
                <button
                  type="button"
                  className={f.closeModalBtn}
                  onClick={() => setCloseTarget(null)}
                  disabled={closing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${f.closeModalBtn} ${f.closeModalBtnDanger}`}
                  onClick={() => void doClose()}
                  disabled={closing || closeLoading}
                >
                  {closing ? "Closing…" : "Close session"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AdminInterior>
  );
}
