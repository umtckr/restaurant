"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import { listLocations, type Location } from "@/lib/api/locations";
import {
  createMenu,
  createMenuLocation,
  listMenuLocations,
  listMenus,
  type Menu,
  type MenuLocation,
} from "@/lib/api/menus";
import { listOrganizations, type Organization } from "@/lib/api/organizations";

import s from "./MenusList.module.css";

function elapsed(from: string) {
  const ms = Date.now() - new Date(from).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function MenusListView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [menuLocations, setMenuLocations] = useState<MenuLocation[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const [mr, or, lr, mlr] = await Promise.all([
      listMenus(),
      listOrganizations(),
      listLocations(),
      listMenuLocations(),
    ]);
    setLoading(false);
    if (!mr.ok) { setError(mr.message); return; }
    setMenus(mr.paged.items);
    if (or.ok) setOrgs(or.items);
    if (lr.ok) setLocations(lr.items);
    if (mlr.ok) setMenuLocations(mlr.items);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const menuLocationMap = useMemo(() => {
    const map = new Map<string, { name: string; active: boolean }[]>();
    for (const ml of menuLocations) {
      const loc = locations.find((l) => l.id === ml.location);
      if (!loc) continue;
      if (!map.has(ml.menu)) map.set(ml.menu, []);
      map.get(ml.menu)!.push({ name: loc.name, active: ml.is_active });
    }
    return map;
  }, [menuLocations, locations]);

  return (
    <AdminInterior
      title="Menus"
      description="Manage your menu catalogs — open one to edit categories, items, and pricing."
    >
      {error && <div className={s.errorBanner}>{error}</div>}

      <div className={s.toolbar}>
        <button type="button" className={s.createBtn} onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New menu
        </button>
        <button type="button" className={s.refreshBtn} onClick={() => void load()} disabled={loading}>
          <RefreshCw size={13} /> Refresh
        </button>
        <Link href="/dashboard/menus/assignments" className={s.assignLink}>
          <MapPin size={12} /> All assignments
        </Link>
      </div>

      {loading && menus.length === 0 ? (
        <div className={s.skeletonGrid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={s.skeleton} style={{ height: 140 }} />
          ))}
        </div>
      ) : menus.length === 0 ? (
        <div className={s.empty}>
          <BookOpen size={44} className={s.emptyIcon} />
          <div className={s.emptyTitle}>No menus yet</div>
          <div className={s.emptyDesc}>
            Create your first menu to start adding categories and items.
          </div>
          <button type="button" className={s.createBtn} onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Create menu
          </button>
        </div>
      ) : (
        <div className={s.grid}>
          {menus.map((m, i) => {
            const locs = menuLocationMap.get(m.id) ?? [];
            return (
              <Link
                key={m.id}
                href={`/dashboard/menus/${m.id}`}
                className={s.card}
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <div className={s.cardHeader}>
                  <span className={s.cardName}>{m.name}</span>
                  {m.is_archived && <span className={s.cardArchived}>Archived</span>}
                </div>

                <div className={s.cardMeta}>
                  <span><Clock size={10} /> {elapsed(m.updated_at)}</span>
                </div>

                <div className={s.cardLocations}>
                  {locs.length > 0 ? (
                    locs.map((l, li) => (
                      <span
                        key={li}
                        className={`${s.locChip} ${l.active ? s.locChipActive : s.locChipInactive}`}
                      >
                        <MapPin size={8} /> {l.name}
                      </span>
                    ))
                  ) : (
                    <span className={`${s.locChip} ${s.locChipNone}`}>
                      No locations assigned
                    </span>
                  )}
                </div>

                <div className={s.cardFooter}>
                  <span>Updated {new Date(m.updated_at).toLocaleDateString()}</span>
                  <span className={s.cardArrow}>
                    Edit <ChevronRight size={12} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateMenuModal
          orgs={orgs}
          locations={locations}
          menuLocations={menuLocations}
          menus={menus}
          onClose={() => setShowCreate(false)}
          onCreated={(menuId) => {
            setShowCreate(false);
            router.push(`/dashboard/menus/${menuId}`);
          }}
          setError={setError}
        />
      )}
    </AdminInterior>
  );
}

/* ══════════════════════════════════════
   Create menu modal with location assignment
   ══════════════════════════════════════ */

function CreateMenuModal({
  orgs,
  locations,
  menuLocations,
  menus,
  onClose,
  onCreated,
  setError,
}: {
  orgs: Organization[];
  locations: Location[];
  menuLocations: MenuLocation[];
  menus: Menu[];
  onClose: () => void;
  onCreated: (menuId: string) => void;
  setError: (msg: string | null) => void;
}) {
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [name, setName] = useState("");
  const [selectedLocs, setSelectedLocs] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const orgLocations = useMemo(
    () => locations.filter((l) => l.organization === orgId),
    [locations, orgId],
  );

  const activeMenuByLoc = useMemo(() => {
    const map = new Map<string, string>();
    for (const ml of menuLocations) {
      if (!ml.is_active) continue;
      const menu = menus.find((m) => m.id === ml.menu);
      if (menu) map.set(ml.location, menu.name);
    }
    return map;
  }, [menuLocations, menus]);

  function toggleLoc(locId: string) {
    setSelectedLocs((prev) => {
      const next = new Set(prev);
      if (next.has(locId)) next.delete(locId);
      else next.add(locId);
      return next;
    });
  }

  // Reset location selection when org changes
  useEffect(() => {
    setSelectedLocs(new Set());
  }, [orgId]);

  async function handleCreate() {
    if (!name.trim() || !orgId) return;
    setCreating(true);
    setError(null);

    const r = await createMenu({ organization: orgId, name: name.trim() });
    if (!r.ok) {
      setError(r.message);
      setCreating(false);
      return;
    }

    const menuId = r.menu.id;

    // Assign selected locations
    const assignPromises = Array.from(selectedLocs).map((locId) =>
      createMenuLocation({ menu: menuId, location: locId, is_active: true }),
    );
    await Promise.all(assignPromises);

    setCreating(false);
    onCreated(menuId);
  }

  return (
    <div className={s.modalOverlay} onClick={() => !creating && onClose()}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <div className={s.modalIcon}><BookOpen size={16} /></div>
          <h3 className={s.modalTitle}>Create menu</h3>
          <button type="button" className={s.modalClose} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className={s.modalBody}>
          {/* Organization */}
          <div className={s.field}>
            <label className={s.fieldLabel}>Organization</label>
            <select
              className={s.fieldSelect}
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className={s.field}>
            <label className={s.fieldLabel}>Menu name</label>
            <input
              className={s.fieldInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dinner, Lunch, Drinks"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) void handleCreate();
              }}
            />
          </div>

          {/* Location assignment */}
          <div className={s.locSection}>
            <span className={s.locSectionTitle}>
              Assign to locations (optional)
            </span>
            {orgLocations.length === 0 ? (
              <span className={s.locEmpty}>
                No locations for this organization yet.
              </span>
            ) : (
              <div className={s.locGrid}>
                {orgLocations.map((loc) => {
                  const checked = selectedLocs.has(loc.id);
                  const currentMenu = activeMenuByLoc.get(loc.id);
                  return (
                    <div
                      key={loc.id}
                      className={`${s.locOption} ${checked ? s.locOptionActive : ""}`}
                      onClick={() => toggleLoc(loc.id)}
                    >
                      <span className={`${s.locCheck} ${checked ? s.locCheckOn : ""}`}>
                        {checked && <Check size={10} className={s.locCheckMark} />}
                      </span>
                      <span className={s.locOptionName}>{loc.name}</span>
                      {currentMenu && (
                        <span className={s.locOptionHint}>
                          {checked ? `replaces "${currentMenu}"` : `active: ${currentMenu}`}
                        </span>
                      )}
                      {loc.city && <span className={s.locOptionCity}>{loc.city}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={s.modalFooter}>
          <button type="button" className={s.modalBtn} onClick={onClose} disabled={creating}>
            Cancel
          </button>
          <button
            type="button"
            className={`${s.modalBtn} ${s.modalBtnPrimary}`}
            onClick={() => void handleCreate()}
            disabled={creating || !name.trim() || !orgId}
          >
            {creating ? "Creating…" : "Create menu"}
          </button>
        </div>
      </div>
    </div>
  );
}
