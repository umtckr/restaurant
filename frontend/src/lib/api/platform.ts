import { apiFetch, formatApiError, unwrapPaged } from "./http";

export type AuditLogRow = {
  id: string;
  actor: number | null;
  action: string;
  object_type: string;
  object_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function listAuditLogs(page?: number): Promise<
  { ok: true; paged: import("./http").Paged<AuditLogRow> } | { ok: false; message: string }
> {
  const q = page ? `?page=${page}` : "";
  const res = await apiFetch(`platform/audit-logs/${q}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, paged: unwrapPaged<AuditLogRow>(data) };
}
