import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "RailPulse — Grounded Indian Railway Telemetry & Operations",
  description:
    "Direct Indian Railway operations platform featuring live GPS telemetry, station movement timelines, MapLibre GL routes, coach configurations, and grounded intelligence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="overflow-x-clip">
      <body className="min-h-screen flex flex-col bg-paper text-ink font-body antialiased overflow-x-clip">
        <Navbar />
        <main className="flex-1 w-full max-w-[var(--container)] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-rule bg-paper-3 py-8 text-xs text-muted">
          <div className="max-w-[var(--container)] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-ink-2">
                RailPulse Operations Platform
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                Grounded Indian Railway telemetry and transit diagnostics
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted">
              <span>CRIS and NTES observation feed</span>
              <span className="text-rule-2">/</span>
              <span>MapLibre GL open mapping</span>
              <span className="text-rule-2">/</span>
              <span>Mistral Small 24B telemetry runtime</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
