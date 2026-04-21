import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET?.trim() || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  /**
   * API base is resolved in `src/lib/api/client.ts` (dev defaults to :8000).
   * Optional env here for tools that read next.config only:
   */
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL?.trim() ||
      (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000/api/v1" : ""),
  },
  /**
   * If same-origin `/api/v1` is used, avoids slash fights with Django behind the proxy.
   */
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget.replace(/\/$/, "")}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
