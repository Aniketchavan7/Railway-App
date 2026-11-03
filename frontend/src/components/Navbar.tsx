"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (/^\d{5}$/.test(q)) {
      router.push(`/train?number=${q}`);
    } else {
      router.push(`/?search=${encodeURIComponent(q)}`);
    }
  };

  const navLinks = [
    { href: "/", label: "Live tracker", icon: Train },
    { href: "/stations", label: "Station boards", icon: Building2 },
    { href: "/pnr", label: "PNR enquiry", icon: Ticket },
    { href: "/coach", label: "Coach layout", icon: LayoutGrid },
    { href: "/fare", label: "Fare engine", icon: Calculator },
    { href: "/ai-assistant", label: "Telemetry AI", icon: Bot },
    { href: "/admin", label: "Provider status", icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-30 bg-paper-2 border-b border-rule">
      <div className="max-w-[var(--container)] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-3 shrink-0 group focus-visible:outline-2 focus-visible:outline-accent active:opacity-85"
        >
          <div className="w-8 h-8 rounded-pill bg-paper-3 border border-rule flex items-center justify-center font-bold text-accent transition-colors group-hover:border-accent">
            <Train className="w-4 h-4 text-accent" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base tracking-tight text-ink">
                RailPulse
              </span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-pill bg-paper-3 text-muted border border-rule font-outlier">
                ops
              </span>
            </div>
            <span className="text-[11px] text-muted -mt-0.5 hidden sm:inline">
              Indian Railway telemetry
            </span>
          </div>
        </Link>

        {/* Global Quick Search */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex items-center flex-1 max-w-xs relative"
        >
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Train number (e.g. 12101) or station…"
            className="w-full text-xs bg-paper-3 text-ink placeholder:text-muted rounded-pill pl-8 pr-3 py-1.5 border border-rule outline-none transition-colors focus:border-accent focus-visible:border-accent disabled:opacity-40"
          />
        </form>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
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
                    ? "bg-accent-soft text-accent border border-accent/40"
                    : "text-muted hover:text-ink hover:bg-paper-3"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
