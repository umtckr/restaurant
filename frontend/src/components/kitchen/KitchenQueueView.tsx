"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChefHat, Clock, FileText, RefreshCw } from "lucide-react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import { listOrders, patchOrder, type Order, type OrderStatus } from "@/lib/api/orders";
import { useLocationCtx } from "@/store/LocationContext";
import { useLocationSocket, type LocationEvent } from "@/lib/realtime/useLocationSocket";
import { useMe } from "@/store/MeContext";

import s from "./Kitchen.module.css";

const KITCHEN_STATUSES: OrderStatus[] = ["in_kitchen", "ready"];

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  in_kitchen: "ready",
  ready: "served",
};

type Filter = "all" | "in_kitchen" | "ready";

function formatMoney(v: string) {
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function elapsed(from: string): { text: string; level: "ok" | "warn" | "danger" } {
  const ms = Date.now() - new Date(from).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return { text: "Just now", level: "ok" };
  if (mins < 10) return { text: `${mins}m ago`, level: "ok" };
  if (mins < 20) return { text: `${mins}m ago`, level: "warn" };
  if (mins < 60) return { text: `${mins}m ago`, level: "danger" };
  const hrs = Math.floor(mins / 60);
  return { text: `${hrs}h ${mins % 60}m ago`, level: "danger" };
}

export function KitchenQueueView() {
  const { locationId } = useLocationCtx();
  const { hasRoleForLocation } = useMe();
  const canBump = locationId
    ? hasRoleForLocation(locationId, "org_admin", "manager", "kitchen")
    : false;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [, setTick] = useState(0);

  // Update elapsed timers every 30s
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  const load = useCallback(async () => {
    if (!locationId) return;
    setError(null);
    setLoading(true);
    const r = await listOrders({ location: locationId, page: 1 });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      setOrders([]);
      return;
    }
    setOrders(r.paged.items.filter((o) => KITCHEN_STATUSES.includes(o.status)));
  }, [locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleWsEvent = useCallback(
    (event: LocationEvent) => {
      switch (event.type) {
        case "connection.ready":
          setWsConnected(true);
          break;
        case "order.updated":
          void load();
          break;
      }
    },
    [load],
  );

  useLocationSocket(locationId || null, handleWsEvent, {
    onOpen: () => setWsConnected(true),
    onClose: () => setWsConnected(false),
  });

  const counts = useMemo(() => {
    let kitchen = 0;
    let ready = 0;
    for (const o of orders) {
      if (o.status === "in_kitchen") kitchen++;
      else if (o.status === "ready") ready++;
    }
    return { all: orders.length, in_kitchen: kitchen, ready };
  }, [orders]);

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  async function bump(order: Order) {
    const next = NEXT[order.status];
    if (!next) return;
    setBusy(order.id);
    setError(null);
    const r = await patchOrder(order.id, { status: next });
    setBusy(null);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    await load();
  }

  return (
    <AdminInterior title="Kitchen" description="Orders being prepared or ready for pickup.">
      {error && <div className={s.errorBanner}>{error}</div>}

      {/* Toolbar */}
      <div className={s.toolbar}>
        <button
          type="button"
          className={s.refreshBtn}
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
        <span
          className={s.liveIndicator}
          style={{ color: wsConnected ? "#2dd4bf" : "var(--admin-text-muted)" }}
          title={wsConnected ? "Real-time connection active" : "Connecting…"}
        >
          <span className={`${s.liveDot} ${wsConnected ? s.liveDotOn : s.liveDotOff}`} />
          {wsConnected ? "Live" : "Connecting…"}
        </span>
      </div>

      {/* Stats */}
      {!loading && orders.length > 0 && (
        <div className={s.statsBar}>
          <div className={s.statChip}>
            In queue <span className={s.statChipValue}>{counts.all}</span>
          </div>
          <div className={s.statChip}>
            Preparing <span className={s.statChipValue}>{counts.in_kitchen}</span>
          </div>
          <div className={s.statChip}>
            Ready <span className={s.statChipValue}>{counts.ready}</span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {!loading && orders.length > 0 && (
        <div className={s.filterTabs}>
          {(
            [
              { key: "all" as Filter, label: "All", count: counts.all },
              { key: "in_kitchen" as Filter, label: "Preparing", count: counts.in_kitchen },
              { key: "ready" as Filter, label: "Ready", count: counts.ready },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`${s.filterTab} ${filter === tab.key ? s.filterTabActive : ""}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              <span className={s.filterCount}>{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading && orders.length === 0 ? (
        <div className={s.skeletonGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={s.skeleton} style={{ height: 180 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={s.empty}>
          <ChefHat size={44} className={s.emptyIcon} />
          <div className={s.emptyTitle}>
            {orders.length === 0 ? "Queue is clear" : "No orders match this filter"}
          </div>
          <div className={s.emptyDesc}>
            {orders.length === 0
              ? "New orders will appear here in real time."
              : "Try switching to a different filter tab."}
          </div>
        </div>
      ) : (
        <div className={s.cardGrid}>
          {filtered.map((o, i) => {
            const next = NEXT[o.status];
            const time = elapsed(o.created_at);
            const mods = (line: (typeof o.lines)[0]) => {
              const arr = Array.isArray(line.modifiers_snapshot)
                ? line.modifiers_snapshot
                : [];
              return arr as { name?: string; price_delta?: string }[];
            };

            return (
              <div
                key={o.id}
                className={`${s.orderCard} ${o.status === "in_kitchen" ? s.cardKitchen : s.cardReady}`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Header */}
                <div className={s.cardHeader}>
                  <span className={s.cardTable}>
                    {o.table_label ?? "No table"}
                  </span>
                  <span className={s.cardOrderId}>#{o.id.slice(0, 8)}</span>
                  <span
                    className={`${s.cardBadge} ${o.status === "in_kitchen" ? s.badgeKitchen : s.badgeReady}`}
                  >
                    {o.status === "in_kitchen" ? "Preparing" : "Ready"}
                  </span>
                </div>

                {/* Timer */}
                <div
                  className={`${s.cardTimer} ${time.level === "warn" ? s.timerWarn : ""} ${time.level === "danger" ? s.timerDanger : ""}`}
                >
                  <Clock size={11} />
                  {time.text}
                </div>

                {/* Items */}
                <div className={s.cardItems}>
                  {o.lines.slice(0, 6).map((line) => {
                    const lineMods = mods(line);
                    return (
                      <div key={line.id}>
                        <div className={s.cardItem}>
                          <span className={s.itemQty}>{line.quantity}</span>
                          <span className={s.itemTimes}>&times;</span>
                          <span className={s.itemName}>{line.name_snapshot}</span>
                        </div>
                        {lineMods.length > 0 && (
                          <div className={s.itemMods}>
                            {lineMods.map((m) => m.name).join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {o.lines.length > 6 && (
                    <div className={s.cardItemsMore}>
                      +{o.lines.length - 6} more item{o.lines.length - 6 !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {o.notes && (
                  <div className={s.cardNotes}>
                    <FileText size={12} className={s.cardNotesIcon} />
                    <span className={s.cardNotesText}>{o.notes}</span>
                  </div>
                )}

                {/* Footer */}
                <div className={s.cardFooter}>
                  <span className={s.cardTotal}>{formatMoney(o.total)}</span>
                  <span className={s.cardMeta}>
                    {o.items_count} item{o.items_count !== 1 ? "s" : ""}
                  </span>
                  {next && canBump ? (
                    <button
                      type="button"
                      className={`${s.bumpBtn} ${next === "ready" ? s.bumpReady : s.bumpServed}`}
                      disabled={busy === o.id}
                      onClick={() => void bump(o)}
                    >
                      {busy === o.id
                        ? "…"
                        : next === "ready"
                          ? "Mark Ready"
                          : "Mark Served"}
                    </button>
                  ) : (
                    <Link href={`/dashboard/orders/${o.id}`} className={s.viewLink}>
                      View &rarr;
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminInterior>
  );
}
