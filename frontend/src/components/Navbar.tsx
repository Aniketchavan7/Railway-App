"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RailPulseLogo } from "@/components/brand/RailPulseLogo";
import { CommandPalette } from "@/components/CommandPalette";
import {
  Train,
  Building2,
  Ticket,
  LayoutGrid,
  Calculator,
  Bot,
  Activity,
  Search,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [istTime, setIstTime] = useState<string>("");
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setIstTime(
        now.toLocaleTimeString("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " IST"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navLinks = [
    { href: "/", label: "Fleet radar", icon: Train },
    { href: "/stations", label: "Station boards", icon: Building2 },
    { href: "/pnr", label: "PNR enquiry", icon: Ticket },
    { href: "/coach", label: "Coach layout", icon: LayoutGrid },
    { href: "/fare", label: "Fare calculator", icon: Calculator },
    { href: "/ai-assistant", label: "Assistant", icon: Bot },
    { href: "/admin", label: "Service status", icon: Activity },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-paper-2 border-b border-rule">
        <div className="max-w-[var(--container)] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
          {/* Brand */}
          <Link
            href="/"
            className="shrink-0 group focus-visible:outline-2 focus-visible:outline-accent active:opacity-85"
          >
            <RailPulseLogo size="md" />
          </Link>

          {/* SaaS Command Palette Omnibar Trigger */}
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="hidden md:flex items-center justify-between gap-3 flex-1 max-w-sm px-3.5 py-1.5 rounded-pill bg-paper-3 hover:bg-paper border border-rule text-xs text-muted transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="flex items-center gap-2 truncate">
              <Search
                className="w-3.5 h-3.5 text-muted group-hover:text-ink shrink-0"
                aria-hidden="true"
              />
              <span className="truncate">Quick search…</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-outlier text-muted bg-paper px-1.5 py-0.5 rounded border border-rule shrink-0">
              <span>Ctrl K</span>
            </div>
          </button>

          {/* Mobile Search Trigger Icon */}
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="md:hidden p-2 rounded-pill bg-paper-3 text-muted hover:text-ink border border-rule cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="Open command palette"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Live IST Telemetry Beacon */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-paper-3 rounded-pill border border-rule text-xs text-muted shrink-0">
            <span className="w-2 h-2 rounded-full bg-ok" aria-hidden="true" />
            <span className="font-medium text-ink font-outlier">{istTime || "LIVE IST"}</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none max-w-full">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill text-xs font-medium transition-colors shrink-0 active:opacity-80 ${
                    isActive
                      ? "bg-accent-soft text-accent border border-accent/40 font-semibold"
                      : "text-muted hover:text-ink hover:bg-paper-3"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </>
  );
}
