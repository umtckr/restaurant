import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dinebird — Restaurant operations, orchestrated",
  description:
    "Menus, QR sessions, floor and kitchen workflows, and payments for multi-location restaurant groups.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className={dmSans.className}>{children}</body>
    </html>
  );
}
