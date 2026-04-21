export type StaffRole = "org_admin" | "manager" | "waiter" | "kitchen" | "host";

export type AdminNavItem = {
  label: string;
  href: string;
  icon:
    | "grid"
    | "building"
    | "users"
    | "clipboard"
    | "home"
    | "map"
    | "layers"
    | "qr"
    | "flame"
    | "utensils"
    | "chart"
    | "cog"
    | "file"
    | "shield"
    | "credit-card";
  /** If set, only these roles see this item. Omit for "visible to all roles". */
  roles?: StaffRole[];
};

export const platformAdminNav: AdminNavItem[] = [
  { label: "Overview", href: "/platform", icon: "grid" },
  { label: "Organizations", href: "/platform/organizations", icon: "building" },
  { label: "Subscriptions", href: "/platform/subscriptions", icon: "credit-card" },
  { label: "Users", href: "/platform/users", icon: "users" },
  { label: "Settings", href: "/platform/settings", icon: "cog" },
  { label: "Compliance review", href: "/platform/compliance-review", icon: "shield" },
  { label: "Audit log", href: "/platform/audit", icon: "clipboard" },
];

export const operationsNav: AdminNavItem[] = [
  { label: "Overview",     href: "/dashboard",              icon: "home" },
  { label: "Locations",    href: "/dashboard/locations",    icon: "map",      roles: ["org_admin", "manager"] },
  { label: "Floor",        href: "/dashboard/floor",        icon: "layers",   roles: ["org_admin", "manager", "waiter", "host"] },
  { label: "Kitchen",      href: "/dashboard/kitchen",      icon: "flame",    roles: ["org_admin", "manager", "kitchen"] },
  { label: "Menus",        href: "/dashboard/menus",        icon: "utensils", roles: ["org_admin", "manager"] },
  { label: "Orders",       href: "/dashboard/orders",       icon: "qr" },
  { label: "Staff",        href: "/dashboard/staff",        icon: "users",    roles: ["org_admin", "manager"] },
  { label: "Reports",      href: "/dashboard/reports",      icon: "chart",    roles: ["org_admin", "manager"] },
  { label: "Organization", href: "/dashboard/organization", icon: "building", roles: ["org_admin"] },
  { label: "Settings",     href: "/dashboard/settings",     icon: "cog" },
];

export function filterNavForRoles(
  items: AdminNavItem[],
  userRoles: StaffRole[],
  isPlatformAdmin: boolean,
): AdminNavItem[] {
  if (isPlatformAdmin) return items;
  return items.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((r) => userRoles.includes(r));
  });
}
