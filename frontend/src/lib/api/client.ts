/**
 * Resolve API base URL.
 * - `NEXT_PUBLIC_API_URL` wins when set (e.g. production or custom dev).
 * - In development, if unset, default to Django on :8000 so requests never go
 *   through Next’s :3000 proxy (avoids APPEND_SLASH / trailing-slash redirect loops).
 */
export function getApiBase(): string | null {
  const raw =
    typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL?.trim() ?? "") : "";
  if (raw.length > 0) {
    return raw.replace(/\/$/, "");
  }
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8000/api/v1";
  }
  return null;
}

/**
 * Build API URL. Ensures a trailing slash before any query string so Django
 * APPEND_SLASH does not try (and fail) to redirect POST requests.
 */
export function apiUrl(path: string): string {
  const base = getApiBase();
  const trimmed = path.trim().replace(/^\//, "");
  const qIndex = trimmed.indexOf("?");
  const pathPart = (qIndex === -1 ? trimmed : trimmed.slice(0, qIndex)).replace(
    /\/+$/,
    "",
  );
  const query = qIndex === -1 ? "" : trimmed.slice(qIndex);
  const slug = pathPart === "" ? "" : `${pathPart}/`;
  if (base) {
    return `${base}/${slug}${query}`;
  }
  return `/api/v1/${slug}${query}`;
}
