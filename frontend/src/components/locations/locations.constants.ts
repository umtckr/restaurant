export const TIMEZONE_OPTIONS = [
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "UTC",
] as const;

export const TIP_MODE_OPTIONS: { value: string; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "suggested", label: "Suggested amounts" },
  { value: "customer_enters", label: "Customer enters" },
];

export const SERVICE_CHARGE_APPLY_OPTIONS: { value: string; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "dine_in", label: "Dine-in only" },
  { value: "takeaway", label: "Takeaway only" },
  { value: "delivery", label: "Delivery only" },
  { value: "all", label: "All channels" },
];
