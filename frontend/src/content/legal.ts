export type LegalDocument = {
  metaTitle: string;
  heroEyebrow: string;
  title: string;
  lastUpdated: string;
  intro: string;
  sections: {
    id: string;
    heading: string;
    body: string[];
  }[];
  disclaimer: string;
};

export const privacyDocument: LegalDocument = {
  metaTitle: "Privacy Policy — Dinebird",
  heroEyebrow: "Legal",
  title: "Privacy Policy",
  lastUpdated: "April 6, 2026",
  intro:
    "This policy describes how Dinebird (“we”, “us”) collects, uses, and shares information when you use our websites, applications, and related services for restaurant operations. It is a starting template—have qualified counsel review it before you rely on it in production.",
  sections: [
    {
      id: "collect",
      heading: "Information we collect",
      body: [
        "Account and profile data you provide, such as name, work email, phone number, and organization details.",
        "Operational data generated through the platform, including orders, sessions, staff actions, and configuration you enter (menus, locations, policies).",
        "Technical data such as device type, browser, IP address, and log data used for security and reliability.",
        "Payment-related metadata as needed to reconcile transactions; card processing may be handled by third-party processors under their own terms.",
      ],
    },
    {
      id: "use",
      heading: "How we use information",
      body: [
        "To provide, maintain, and improve the service—including authentication, multi-location administration, and real-time operational features.",
        "To communicate with you about the product, security, and billing where applicable.",
        "To detect abuse, enforce our terms, and comply with legal obligations.",
        "We do not sell your personal information. We may share data with subprocessors strictly to operate the service (e.g. hosting, email delivery) under appropriate agreements.",
      ],
    },
    {
      id: "retention",
      heading: "Retention",
      body: [
        "We retain information for as long as your account is active or as needed to provide the service, comply with law, resolve disputes, and enforce agreements.",
        "Retention periods may differ by data category and jurisdiction; your organization’s administrator may request deletion subject to legal holds.",
      ],
    },
    {
      id: "rights",
      heading: "Your rights",
      body: [
        "Depending on where you live, you may have rights to access, correct, delete, or export personal data, and to object to or restrict certain processing.",
        "To exercise these rights, contact us using the details on our Contact page. We may need to verify your identity before responding.",
      ],
    },
    {
      id: "transfers",
      heading: "International transfers",
      body: [
        "If we process data across borders, we use appropriate safeguards such as standard contractual clauses or equivalent mechanisms where required by law.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      body: [
        "We may update this policy from time to time. We will post the revised version and update the “Last updated” date. Material changes may require additional notice as required by law.",
      ],
    },
  ],
  disclaimer:
    "This document is provided for demonstration purposes only and does not constitute legal advice. Replace placeholders (company name, contact details, jurisdictions) and obtain professional review before publication.",
};

export const termsDocument: LegalDocument = {
  metaTitle: "Terms of Service — Dinebird",
  heroEyebrow: "Legal",
  title: "Terms of Service",
  lastUpdated: "April 6, 2026",
  intro:
    "These Terms of Service (“Terms”) govern your access to and use of Dinebird’s software and services. By using the service, you agree to these Terms on behalf of yourself or the organization you represent.",
  sections: [
    {
      id: "service",
      heading: "The service",
      body: [
        "Dinebird provides cloud software for restaurant groups to manage operations such as menus, table sessions, staff workflows, and related features as described in your order or subscription materials.",
        "We may update or discontinue features with reasonable notice where practicable. We are not responsible for third-party services or hardware you connect to the platform.",
      ],
    },
    {
      id: "accounts",
      heading: "Accounts and access",
      body: [
        "You are responsible for maintaining the confidentiality of credentials and for activity under your account. Notify us promptly of unauthorized use.",
        "Administrators may invite users and assign roles. You remain responsible for your personnel’s compliance with these Terms.",
      ],
    },
    {
      id: "acceptable",
      heading: "Acceptable use",
      body: [
        "You may not misuse the service—including attempting to gain unauthorized access, interfere with other customers, distribute malware, or use the service in violation of law.",
        "You must not use the service to process unlawful orders or to harass guests or staff. We may suspend access for material violations.",
      ],
    },
    {
      id: "data",
      heading: "Customer data",
      body: [
        "You retain rights to operational data you submit. You grant us a license to host, process, and display that data solely to provide and improve the service as described in our Privacy Policy.",
        "You represent that you have the rights and, where required, consents to provide guest and staff-related data to the platform.",
      ],
    },
    {
      id: "fees",
      heading: "Fees and taxes",
      body: [
        "Fees are set out in your order form or pricing agreement. Unless stated otherwise, fees are exclusive of taxes, which you are responsible for where applicable.",
        "Late payment may result in suspension after notice as permitted by contract.",
      ],
    },
    {
      id: "warranty",
      heading: "Disclaimers",
      body: [
        "Except where prohibited by law, the service is provided “as is” without warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant uninterrupted or error-free operation.",
      ],
    },
    {
      id: "liability",
      heading: "Limitation of liability",
      body: [
        "To the maximum extent permitted by law, our aggregate liability arising out of these Terms or the service is limited to the amounts you paid us in the twelve months preceding the claim (or, if none, a nominal cap).",
        "We are not liable for indirect, incidental, special, consequential, or punitive damages, or loss of profits, data, or goodwill.",
      ],
    },
    {
      id: "law",
      heading: "Governing law and disputes",
      body: [
        "These Terms are governed by the laws designated in your enterprise agreement, or otherwise by the laws of the jurisdiction where Dinebird’s contracting entity is organized, excluding conflict-of-law rules.",
        "Courts in that jurisdiction have exclusive venue unless mandatory consumer protections apply.",
      ],
    },
  ],
  disclaimer:
    "These Terms are a template for development and demonstration. Replace governing law, entity name, liability caps, and dispute resolution with language approved by your counsel before production use.",
};
