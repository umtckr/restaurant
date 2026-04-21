import { apiUrl } from "./client";
import { apiFetch, formatApiError, getAccessToken, unwrapResults } from "./http";

export type DocumentType = {
  id: string;
  slug: string;
  name: string;
  description: string;
  help_text: string;
  required_for_activation: boolean;
  max_files: number;
  allowed_extensions: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type OrganizationDocument = {
  id: string;
  organization: string;
  document_type: string;
  document_type_slug: string;
  document_type_name: string;
  file: string;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
};

export type ComplianceSubmission = {
  id: string;
  organization: string;
  organization_name: string;
  status: string;
  submitted_by: number | null;
  submitted_at: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  admin_notes: string;
  created_at: string;
  updated_at: string;
};

export async function listDocumentTypes(): Promise<
  { ok: true; items: DocumentType[] } | { ok: false; message: string }
> {
  const res = await apiFetch("document-types/");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, items: unwrapResults<DocumentType>(data) };
}

export async function createDocumentType(
  body: Partial<DocumentType>,
): Promise<{ ok: true; row: DocumentType } | { ok: false; message: string }> {
  const res = await apiFetch("document-types/", { method: "POST", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, row: data as DocumentType };
}

export async function patchDocumentType(
  id: string,
  body: Partial<DocumentType>,
): Promise<{ ok: true; row: DocumentType } | { ok: false; message: string }> {
  const res = await apiFetch(`document-types/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, row: data as DocumentType };
}

export async function deleteDocumentType(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(`document-types/${id}/`, { method: "DELETE" });
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}

export async function listOrganizationDocuments(
  organizationId: string,
): Promise<{ ok: true; items: OrganizationDocument[] } | { ok: false; message: string }> {
  const res = await apiFetch(
    `organization-documents/?organization=${encodeURIComponent(organizationId)}`,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, items: unwrapResults<OrganizationDocument>(data) };
}

export async function uploadOrganizationDocument(
  organizationId: string,
  documentTypeId: string,
  file: File,
): Promise<{ ok: true; doc: OrganizationDocument } | { ok: false; message: string }> {
  const form = new FormData();
  form.append("document_type", documentTypeId);
  form.append("file", file);
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(
    apiUrl(`organization-documents/?organization=${encodeURIComponent(organizationId)}`),
    { method: "POST", headers, body: form },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, doc: data as OrganizationDocument };
}

export async function deleteOrganizationDocument(
  id: string,
  organizationId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiFetch(
    `organization-documents/${id}/?organization=${encodeURIComponent(organizationId)}`,
    { method: "DELETE" },
  );
  if (res.status === 204 || res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, message: formatApiError(data) };
}

export async function submitCompliance(
  organizationId: string,
): Promise<{ ok: true; submission: ComplianceSubmission } | { ok: false; message: string }> {
  const res = await apiFetch("compliance/submit/", {
    method: "POST",
    body: JSON.stringify({ organization: organizationId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, submission: data as ComplianceSubmission };
}

export async function listComplianceQueue(): Promise<
  { ok: true; items: ComplianceSubmission[] } | { ok: false; message: string }
> {
  const res = await apiFetch("platform/compliance-queue/");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, items: Array.isArray(data) ? data : [] };
}

export async function approveComplianceSubmission(
  id: string,
  adminNotes?: string,
): Promise<{ ok: true; row: ComplianceSubmission } | { ok: false; message: string }> {
  const res = await apiFetch(`platform/compliance-submissions/${id}/approve/`, {
    method: "POST",
    body: JSON.stringify({ admin_notes: adminNotes ?? "" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, row: data as ComplianceSubmission };
}

export async function rejectComplianceSubmission(
  id: string,
  body: { admin_notes?: string; allow_resubmit?: boolean },
): Promise<{ ok: true; row: ComplianceSubmission } | { ok: false; message: string }> {
  const res = await apiFetch(`platform/compliance-submissions/${id}/reject/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: formatApiError(data) };
  return { ok: true, row: data as ComplianceSubmission };
}
