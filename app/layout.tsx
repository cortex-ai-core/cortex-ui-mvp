import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cortéx | Sollucio Partners",
  description: "Sollucio's private intelligence engine",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
