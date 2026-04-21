"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Pencil, Plus, Users, Shield, ShieldCheck, UtensilsCrossed, ChefHat, UserCheck, X } from "lucide-react";

import { AdminInterior } from "@/components/admin/AdminInterior";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import styles from "@/components/locations/Locations.module.css";
import { fetchMe, type MeUser } from "@/lib/api/me";
import { listLocations, type Location } from "@/lib/api/locations";
import {
  createStaffMember,
  deleteStaffAssignment,
  listStaffAssignments,
  removeStaffMember,
  setStaffLocations,
  updateStaffMember,
  SINGLE_LOCATION_ROLES,
  type StaffAssignment,
  type StaffRole,
} from "@/lib/api/staff";
import { listOrganizations, type Organization } from "@/lib/api/organizations";

const ROLES: { value: StaffRole; label: string }[] = [
  { value: "org_admin", label: "Organization Admin" },
  { value: "manager", label: "Manager" },
  { value: "waiter", label: "Waiter" },
  { value: "kitchen", label: "Kitchen" },
  { value: "host", label: "Host" },
];

function roleLabel(r: string) {
  return ROLES.find((x) => x.value === r)?.label ?? r;
}

function roleBadgeClass(r: string) {
  switch (r) {
    case "manager": return styles.roleManager;
    case "org_admin": return styles.roleOrgAdmin;
    case "waiter": return styles.roleWaiter;
    case "kitchen": return styles.roleKitchen;
    case "host": return styles.roleHost;
    default: return "";
  }
}

function roleIcon(r: string, size = 14) {
  switch (r) {
    case "manager": return <Shield size={size} />;
    case "org_admin": return <ShieldCheck size={size} />;
    case "waiter": return <UtensilsCrossed size={size} />;
    case "kitchen": return <ChefHat size={size} />;
    case "host": return <UserCheck size={size} />;
    default: return <Users size={size} />;
  }
}

type StaffMember = {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  orgId: string;
  assignments: StaffAssignment[];
  locationIds: string[];
};

export function StaffListView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffAssignment[]>([]);
  const [me, setMe] = useState<MeUser | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [saving, setSaving] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invPassword, setInvPassword] = useState("");
  const [invFirst, setInvFirst] = useState("");
  const [invLast, setInvLast] = useState("");
  const [invRole, setInvRole] = useState<StaffRole>("waiter");
  const [invOrgId, setInvOrgId] = useState("");
  const [invLocIds, setInvLocIds] = useState<string[]>([]);

  // Location management
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editLocIds, setEditLocIds] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editRole, setEditRole] = useState<StaffRole>("waiter");
  const [editPassword, setEditPassword] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  // Remove modal
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const isPlatformAdmin = me?.is_platform_admin ?? false;
  const adminOrgIds = (me?.organization_memberships ?? [])
    .filter((m) => m.role === "org_admin" && !m.location_id)
    .map((m) => m.organization_id);
  const managerOrgIds = [...new Set(
    (me?.organization_memberships ?? [])
      .filter((m) => m.role === "org_admin" || m.role === "manager")
      .map((m) => m.organization_id)
  )];
  const managerOnlyOrgIds = [...new Set(
    (me?.organization_memberships ?? [])
      .filter((m) => m.role === "manager")
      .map((m) => m.organization_id)
  )];
  const managerLocationIds = (me?.organization_memberships ?? [])
    .filter((m) => m.role === "manager" && m.location_id)
    .map((m) => ({ orgId: m.organization_id, locId: m.location_id! }));
  const managerOrgWide = (me?.organization_memberships ?? [])
    .filter((m) => m.role === "manager" && !m.location_id)
    .map((m) => m.organization_id);

  const isOrgAdmin = adminOrgIds.length > 0;
  const isManager = managerOrgIds.length > 0;
  const canManageStaff = isPlatformAdmin || isOrgAdmin || isManager;
  const canCreateStaff = isPlatformAdmin || isOrgAdmin || isManager;

  const OPERATIONAL_ROLES: StaffRole[] = ["waiter", "kitchen", "host"];

  function canManageTarget(member: StaffMember): boolean {
    if (isPlatformAdmin) return true;
    if (adminOrgIds.includes(member.orgId)) return true;
    if (!managerOnlyOrgIds.includes(member.orgId)) return false;
    if (!OPERATIONAL_ROLES.includes(member.role)) return false;
    if (managerOrgWide.includes(member.orgId)) return true;
    const myLocIds = managerLocationIds
      .filter((m) => m.orgId === member.orgId)
      .map((m) => m.locId);
    if (member.locationIds.length === 0) return false;
    return member.locationIds.every((lid) => myLocIds.includes(lid));
  }

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const meRes = await fetchMe();
    if (meRes.ok) setMe(meRes.user);

    const [sr, or, lr] = await Promise.all([
      listStaffAssignments(),
      listOrganizations(),
      listLocations(),
    ]);
    setLoading(false);
    if (!sr.ok) {
      setError(sr.message);
      return;
    }
    setRows(sr.paged.items);
    if (or.ok) {
      setOrgs(or.items);
      setInvOrgId((prev) => prev || or.items[0]?.id || "");
    }
    if (lr.ok) setLocations(lr.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!invOrgId) {
      const firstOrg = adminOrgIds[0] || managerOrgIds[0] || "";
      if (firstOrg) setInvOrgId(firstOrg);
    }
  }, [adminOrgIds, managerOrgIds, invOrgId]);

  const orgLocations = useMemo(() => {
    const targetOrg = invOrgId || adminOrgIds[0] || managerOrgIds[0] || "";
    const allLocs = locations.filter((l) => l.organization === targetOrg);
    if (isPlatformAdmin || adminOrgIds.includes(targetOrg)) return allLocs;
    const myManagedLocIds = managerLocationIds
      .filter((m) => m.orgId === targetOrg)
      .map((m) => m.locId);
    const hasOrgWide = managerOrgWide.includes(targetOrg);
    if (hasOrgWide) return allLocs;
    return allLocs.filter((l) => myManagedLocIds.includes(l.id));
  }, [locations, invOrgId, adminOrgIds, managerOrgIds, isPlatformAdmin, managerLocationIds, managerOrgWide]);

  const members = useMemo(() => {
    const map = new Map<string, StaffMember>();
    for (const a of rows) {
      const key = `${a.user}-${a.organization}`;
      const existing = map.get(key);
      if (existing) {
        existing.assignments.push(a);
        if (a.location) existing.locationIds.push(a.location);
      } else {
        map.set(key, {
          userId: a.user,
          email: a.user_email,
          firstName: a.user_first_name || "",
          lastName: a.user_last_name || "",
          role: a.role,
          orgId: a.organization,
          assignments: [a],
          locationIds: a.location ? [a.location] : [],
        });
      }
    }
    const all = Array.from(map.values());
    if (isPlatformAdmin) return all;
    return all.filter((m) => [...adminOrgIds, ...managerOrgIds].includes(m.orgId));
  }, [rows, isPlatformAdmin, adminOrgIds, managerOrgIds]);

  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);
  const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? id.slice(0, 8);

  function getOrgLocations(orgId: string) {
    return locations.filter((l) => l.organization === orgId);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!invEmail || !invPassword) {
      setError("Email and password are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const r = await createStaffMember({
      email: invEmail,
      password: invPassword,
      first_name: invFirst,
      last_name: invLast,
      role: invRole,
      organization: invOrgId || undefined,
      locations: invLocIds.length > 0 ? invLocIds : undefined,
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setInvEmail("");
    setInvPassword("");
    setInvFirst("");
    setInvLast("");
    setInvLocIds([]);
    setShowCreate(false);
    await load();
  }

  function startEditLocations(member: StaffMember) {
    setEditingUser(member.userId);
    setEditLocIds([...member.locationIds]);
  }

  async function saveLocations(member: StaffMember) {
    setEditSaving(true);
    setError(null);
    const r = await setStaffLocations({
      user: member.userId,
      organization: member.orgId,
      locations: editLocIds,
    });
    setEditSaving(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setEditingUser(null);
    await load();
  }

  function openEdit(member: StaffMember) {
    setEditTarget(member);
    setEditFirst(member.firstName);
    setEditLast(member.lastName);
    setEditRole(member.role);
    setEditPassword("");
  }

  async function saveEdit() {
    if (!editTarget) return;
    setEditBusy(true);
    setError(null);
    const body: Parameters<typeof updateStaffMember>[0] = {
      user_id: editTarget.userId,
    };
    if (editFirst !== editTarget.firstName) body.first_name = editFirst;
    if (editLast !== editTarget.lastName) body.last_name = editLast;
    if (editRole !== editTarget.role) body.role = editRole;
    if (editPassword.trim()) body.password = editPassword.trim();

    const r = await updateStaffMember(body);
    setEditBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setEditTarget(null);
    await load();
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    setError(null);
    if (isPlatformAdmin) {
      for (const a of removeTarget.assignments) {
        const r = await deleteStaffAssignment(a.id);
        if (!r.ok) { setError(r.message); break; }
      }
    } else {
      const r = await removeStaffMember(removeTarget.userId);
      if (!r.ok) setError(r.message);
    }
    setRemoving(false);
    setRemoveTarget(null);
    await load();
  }

  const isSingleLocRole = (r: StaffRole) => SINGLE_LOCATION_ROLES.includes(r);

  return (
    <AdminInterior
      title="Staff"
      description={
        isPlatformAdmin
          ? "Manage staff assignments across all organizations."
          : "Manage your restaurant's staff accounts and location assignments."
      }
    >
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* ── Toolbar ── */}
      {canCreateStaff && (
        <div className={styles.toolbar}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setShowCreate(!showCreate)}
          >
            <Plus size={16} style={{ marginRight: 6 }} />
            {showCreate ? "Cancel" : "Create Staff Account"}
          </button>
        </div>
      )}

      {/* ── Create form ── */}
      {showCreate && canCreateStaff && (
        <form className={styles.form} onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
          <div className={styles.staffSection}>
            <h3 className={styles.staffSectionTitle}>New Staff Account</h3>
            <p className={styles.hint} style={{ margin: "0 0 0.75rem" }}>
              Create a new user and assign them to your restaurant.
            </p>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="inv-email">Email</label>
                <input id="inv-email" type="email" className={styles.input} value={invEmail}
                  onChange={(e) => setInvEmail(e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="inv-pass">Password</label>
                <input id="inv-pass" type="password" className={styles.input} value={invPassword}
                  onChange={(e) => setInvPassword(e.target.value)} minLength={8} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="inv-first">First name</label>
                <input id="inv-first" className={styles.input} value={invFirst}
                  onChange={(e) => setInvFirst(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="inv-last">Last name</label>
                <input id="inv-last" className={styles.input} value={invLast}
                  onChange={(e) => setInvLast(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="inv-role">Role</label>
                <select id="inv-role" className={styles.select} value={invRole}
                  onChange={(e) => {
                    const newRole = e.target.value as StaffRole;
                    setInvRole(newRole);
                    if (isSingleLocRole(newRole) && invLocIds.length > 1) {
                      setInvLocIds(invLocIds.slice(0, 1));
                    }
                  }}>
                  {ROLES.filter((r) => {
                    if (isPlatformAdmin) return true;
                    if (isOrgAdmin) return r.value !== "org_admin";
                    return OPERATIONAL_ROLES.includes(r.value);
                  }).map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {(adminOrgIds.length > 1 || managerOrgIds.length > 1 || isPlatformAdmin) && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="inv-org">Organization</label>
                  <select id="inv-org" className={styles.select} value={invOrgId}
                    onChange={(e) => { setInvOrgId(e.target.value); setInvLocIds([]); }}>
                    {(isPlatformAdmin ? orgs : orgs.filter((o) =>
                      adminOrgIds.includes(o.id) || managerOrgIds.includes(o.id)
                    )).map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Location assignment */}
            {orgLocations.length > 0 && invRole !== "org_admin" && (
              <div style={{ marginTop: "1rem" }}>
                <label className={styles.label} style={{ marginBottom: 6, display: "block" }}>
                  <MapPin size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                  {isSingleLocRole(invRole) ? "Assign to Location" : "Assign to Locations"}
                </label>
                {isSingleLocRole(invRole) ? (
                  <select className={styles.select} value={invLocIds[0] || ""}
                    onChange={(e) => setInvLocIds(e.target.value ? [e.target.value] : [])}>
                    <option value="">No location assigned</option>
                    {orgLocations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className={styles.multiSelect}>
                    {orgLocations.map((l) => (
                      <label key={l.id} className={styles.multiOption}>
                        <input type="checkbox" checked={invLocIds.includes(l.id)}
                          onChange={(e) => {
                            setInvLocIds(e.target.checked
                              ? [...invLocIds, l.id]
                              : invLocIds.filter((id) => id !== l.id)
                            );
                          }} />
                        {l.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles.actions}>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
                {saving ? "Creating…" : "Create Staff Account"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── Staff list ── */}
      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : members.length === 0 ? (
        <div className={styles.empty}>No staff members yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {members.map((member) => {
            const isSelf = member.userId === me?.id;
            const isEditing = editingUser === member.userId;
            const memberOrgLocs = getOrgLocations(member.orgId);
            const isSingleLoc = isSingleLocRole(member.role);

            return (
              <div key={`${member.userId}-${member.orgId}`} className={styles.staffSection}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  {/* Identity */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span className={styles.staffName}>
                      {member.firstName || member.lastName
                        ? `${member.firstName} ${member.lastName}`.trim()
                        : member.email}
                    </span>
                    {(member.firstName || member.lastName) && (
                      <span className={styles.staffEmail}>{member.email}</span>
                    )}
                  </div>

                  {/* Role + Org */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                    <span className={`${styles.roleBadge} ${roleBadgeClass(member.role)}`}>
                      {roleIcon(member.role)} {roleLabel(member.role)}
                    </span>
                    {(isPlatformAdmin || orgs.length > 1) && (
                      <span className={styles.chip}>{orgName(member.orgId)}</span>
                    )}
                  </div>
                </div>

                {/* Locations */}
                {member.role !== "org_admin" && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <MapPin size={14} style={{ color: "var(--admin-text-muted)" }} />
                      <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--admin-text-muted)" }}>
                        {isSingleLoc ? "Location" : "Locations"}
                      </span>
                      {canManageStaff && !isSelf && !isEditing && canManageTarget(member) && (
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnSmall} ${styles.btnGhost}`}
                          onClick={() => startEditLocations(member)}
                        >
                          {member.locationIds.length === 0 ? "Assign" : "Change"}
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {isSingleLoc ? (
                          <select
                            className={styles.locationSelect}
                            value={editLocIds[0] || ""}
                            onChange={(e) => setEditLocIds(e.target.value ? [e.target.value] : [])}
                          >
                            <option value="">No location</option>
                            {memberOrgLocs.map((l) => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className={styles.multiSelect}>
                            {memberOrgLocs.map((l) => (
                              <label key={l.id} className={styles.multiOption}>
                                <input
                                  type="checkbox"
                                  checked={editLocIds.includes(l.id)}
                                  onChange={(e) => {
                                    setEditLocIds(e.target.checked
                                      ? [...editLocIds, l.id]
                                      : editLocIds.filter((id) => id !== l.id)
                                    );
                                  }}
                                />
                                {l.name}
                              </label>
                            ))}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                            disabled={editSaving}
                            onClick={() => void saveLocations(member)}
                          >
                            {editSaving ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnSmall}`}
                            onClick={() => setEditingUser(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.chips}>
                        {member.locationIds.length === 0 ? (
                          <span className={styles.chip}>
                            {member.role === "manager" ? "All locations (org-wide)" : "No location assigned"}
                          </span>
                        ) : (
                          member.locationIds.map((lid) => (
                            <span key={lid} className={`${styles.chip} ${styles.chipActive}`}>
                              <MapPin size={12} /> {locName(lid)}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {canManageStaff && !isSelf && canManageTarget(member) && (
                  <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSmall}`}
                      onClick={() => openEdit(member)}
                    >
                      <Pencil size={13} style={{ marginRight: 4 }} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => setRemoveTarget(member)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit modal ── */}
      {editTarget && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setEditTarget(null); }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Staff Member</h2>
              <button type="button" className={styles.modalClose} onClick={() => setEditTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input className={styles.input} value={editTarget.email} disabled />
              </div>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>First name</label>
                  <input
                    className={styles.input}
                    value={editFirst}
                    onChange={(e) => setEditFirst(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Last name</label>
                  <input
                    className={styles.input}
                    value={editLast}
                    onChange={(e) => setEditLast(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Role</label>
                <select
                  className={styles.select}
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as StaffRole)}
                >
                  {ROLES.filter((r) => {
                    if (isPlatformAdmin) return true;
                    const callerIsOrgAdmin = editTarget ? adminOrgIds.includes(editTarget.orgId) : isOrgAdmin;
                    if (callerIsOrgAdmin) return r.value !== "org_admin";
                    return OPERATIONAL_ROLES.includes(r.value);
                  }).map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>New password</label>
                <input
                  className={styles.input}
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  minLength={8}
                  autoComplete="new-password"
                />
                <span style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginTop: 2 }}>
                  Minimum 8 characters. Only fill in if you want to change the password.
                </span>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btn} onClick={() => setEditTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={editBusy}
                onClick={() => void saveEdit()}
              >
                {editBusy ? "Saving\u2026" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove confirmation ── */}
      <ConfirmModal
        open={removeTarget !== null}
        title="Remove staff member"
        body={
          removeTarget ? (
            <>
              Remove <strong>{removeTarget.email}</strong> from{" "}
              <strong>{orgName(removeTarget.orgId)}</strong>?
              {!isPlatformAdmin && (
                <span style={{ display: "block", marginTop: 8, color: "var(--admin-text-muted)", fontSize: "0.8125rem" }}>
                  If this is their only assignment, their account will be deactivated.
                </span>
              )}
            </>
          ) : null
        }
        confirmLabel="Remove"
        variant="danger"
        busy={removing}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </AdminInterior>
  );
}
