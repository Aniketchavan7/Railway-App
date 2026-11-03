import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "RailPulse — Live Indian Train Tracker and Station Schedules",
  description:
    "Track Indian train locations in real time with live delay updates, station departure boards, coach layouts, and fare calculators.",
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
              <p className="font-medium text-ink-2">
                RailPulse
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                Live train tracking, station schedules, coach layouts, and fare calculation
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 text-[11px] text-muted">
              <span>Live train tracking</span>
              <span className="text-rule-2">/</span>
              <span>Station departure boards</span>
              <span className="text-rule-2">/</span>
              <span>PNR status and fares</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
