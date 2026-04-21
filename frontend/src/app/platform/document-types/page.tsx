import { redirect } from "next/navigation";

/** Legacy URL: document types now live under Platform settings → Required documents. */
export default function PlatformDocumentTypesRedirectPage() {
  redirect("/platform/settings?tab=documents");
}
