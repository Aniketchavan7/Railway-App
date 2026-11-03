"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RailPulseLogo } from "@/components/brand/RailPulseLogo";
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
  const [istTime, setIstTime] = useState<string>("");

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
    { href: "/fare", label: "Fare calculator", icon: Calculator },
    { href: "/ai-assistant", label: "Assistant", icon: Bot },
    { href: "/admin", label: "Service status", icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-30 bg-paper-2 border-b border-rule">
      <div className="max-w-[var(--container)] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand */}
        <Link
          href="/"
          className="shrink-0 group focus-visible:outline-2 focus-visible:outline-accent active:opacity-85"
        >
          <RailPulseLogo size="md" />
        </Link>

        {/* Global Quick Search (Desktop) */}
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

        {/* Live IST Telemetry Beacon */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-paper-3 rounded-pill border border-rule text-[11px] font-outlier text-muted shrink-0">
          <span className="w-2 h-2 rounded-full bg-ok" />
          <span className="font-semibold text-ink">{istTime || "LIVE IST"}</span>
          <span className="text-rule-2">/</span>
          <span className="text-[10px] text-muted">LIVE RADAR</span>
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
                    ? "bg-accent-soft text-accent border border-accent/40"
                    : "text-muted hover:text-ink hover:bg-paper-3"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
