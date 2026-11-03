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
    { href: "/", label: "Live Tracker", icon: Train },
    { href: "/stations", label: "Station Board", icon: Building2 },
    { href: "/pnr", label: "PNR Enquiry", icon: Ticket },
    { href: "/coach", label: "Coach Layout", icon: LayoutGrid },
    { href: "/fare", label: "Fare Calculator", icon: Calculator },
    { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
    { href: "/admin", label: "Provider Health", icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm group-hover:bg-blue-600 transition-colors">
            <Train className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-1.5">
              RailPulse
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                SaaS
              </span>
            </span>
            <p className="text-[10px] text-slate-500 font-medium -mt-1 hidden sm:block">
              Indian Railway Intelligence
            </p>
          </div>
        </Link>

        {/* Global Quick Search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-xs relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search train (e.g. 12101) or station..."
            className="w-full text-xs bg-slate-100 hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-full pl-9 pr-3 py-2 border border-slate-200 transition-all outline-none"
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : ""}`} />
                <span className="hidden lg:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
