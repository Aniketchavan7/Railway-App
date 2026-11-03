import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "RailPulse — AI-Powered Indian Railway Tracking SaaS",
  description:
    "Production-grade Indian Railway tracking SaaS with live telemetry, MapLibre maps, coach layouts, telescopic fare engine, and LangGraph AI assistant.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
            <p>
              &copy; {new Date().getFullYear()} <strong>RailPulse SaaS</strong>. Honest Indian Railway telemetry & intelligence.
            </p>
            <p className="text-[11px] text-slate-400">
              Railway Engine • RailRadar • MapLibre & OpenStreetMap • LangGraph & xKiro AI
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
