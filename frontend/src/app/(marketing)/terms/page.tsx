import { LegalPageView } from "@/components/marketing/LegalPageView";
import { termsDocument } from "@/content/legal";

export const metadata = {
  title: termsDocument.metaTitle,
  description:
    "Terms of Service for using Dinebird’s restaurant operations software and related services.",
};

export default function TermsPage() {
  return (
    <LegalPageView
      doc={termsDocument}
      siblingHref="/privacy"
      siblingLabel="← Privacy Policy"
    />
  );
}
