import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { RailPulseLogo } from "@/components/brand/RailPulseLogo";

export const viewport: Viewport = {
  themeColor: "#0b0f19",
};

export const metadata: Metadata = {
  title: "RailPulse: Live Indian Train Tracker and Station Schedules",
  description:
    "Track Indian train locations in real time with live delay updates, station departure boards, coach layouts, and fare calculators.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="overflow-x-clip">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-paper text-ink font-body antialiased overflow-x-clip">
        <Navbar />
        <main className="flex-1 w-full max-w-[var(--container)] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-rule bg-paper-3 py-6 sm:py-8 text-xs text-muted">
          <div className="max-w-[var(--container)] mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <RailPulseLogo size="sm" />
              <p className="text-[11px] text-muted mt-1">
                Indian Railways live train tracking, station schedules, coach layouts, and fares
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted">
              <Link href="/stations" className="hover:text-ink transition-colors">
                Station boards
              </Link>
              <Link href="/pnr" className="hover:text-ink transition-colors">
                PNR status
              </Link>
              <Link href="/coach" className="hover:text-ink transition-colors">
                Coach layout
              </Link>
              <Link href="/fare" className="hover:text-ink transition-colors">
                Fare calculator
              </Link>
              <Link href="/admin" className="hover:text-ink transition-colors">
                Service status
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
