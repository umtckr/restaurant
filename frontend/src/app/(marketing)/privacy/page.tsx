import { LegalPageView } from "@/components/marketing/LegalPageView";
import { privacyDocument } from "@/content/legal";

export const metadata = {
  title: privacyDocument.metaTitle,
  description:
    "How Dinebird collects, uses, and protects information when you use our restaurant operations platform.",
};

export default function PrivacyPage() {
  return (
    <LegalPageView
      doc={privacyDocument}
      siblingHref="/terms"
      siblingLabel="Terms of Service →"
    />
  );
}
