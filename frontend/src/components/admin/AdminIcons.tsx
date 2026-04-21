import type { AdminNavItem } from "./adminConfig";

const stroke = { stroke: "currentColor", strokeWidth: 1.75, fill: "none" as const };

export function NavIcon({ name }: { name: AdminNavItem["icon"] }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", "aria-hidden": true as const };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" {...stroke} />
          <rect x="14" y="3" width="7" height="7" rx="1.5" {...stroke} />
          <rect x="3" y="14" width="7" height="7" rx="1.5" {...stroke} />
          <rect x="14" y="14" width="7" height="7" rx="1.5" {...stroke} />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <path d="M4 21V8l8-4v17M4 13h8M9 9v.01M9 13v.01M9 17v.01M20 21V11l-4-2v12" {...stroke} />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" {...stroke} />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...common}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9V2z" {...stroke} />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z" {...stroke} />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="M9 20l-6-2V4l6 2 6-2 6 2v14l-6 2-6-2-6 2v-14l6-2zM15 4v16M9 6v14" {...stroke} />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" {...stroke} />
        </svg>
      );
    case "flame":
      return (
        <svg {...common}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 20h0a2.5 2.5 0 0 0 2.5-2.5c0-1.5-1-2-1-3.5a4 4 0 0 1 4 4c0 2.5-2.5 4.5-6 4.5-3.5 0-6-2.5-6-5 0-2.5 2-4.5 3-6.5 1 2 2 3.5 2 5.5z" {...stroke} />
        </svg>
      );
    case "utensils":
      return (
        <svg {...common}>
          <path d="M3 2v7c0 1.5 1.5 3 3 3h0M3 2h4M3 6h4M11 2v20M15 2v6l2 2 2-2V2" {...stroke} />
        </svg>
      );
    case "qr":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" {...stroke} />
          <rect x="14" y="3" width="7" height="7" {...stroke} />
          <rect x="3" y="14" width="7" height="7" {...stroke} />
          <path d="M14 14h3v3M17 17v4M14 21h7" {...stroke} />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path
            d="M4 19V5M12 19V9M20 19v-8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case "cog":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" {...stroke} />
          <path
            d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" {...stroke} />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" {...stroke} />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...stroke} />
        </svg>
      );
    case "credit-card":
      return (
        <svg {...common}>
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" {...stroke} />
          <path d="M1 10h22" {...stroke} />
        </svg>
      );
    default:
      return null;
  }
}
