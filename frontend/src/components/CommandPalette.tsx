"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Train,
  Building2,
  Ticket,
  LayoutGrid,
  Calculator,
  Bot,
  Activity,
  ArrowRight,
  X,
  CornerDownLeft,
} from "lucide-react";

interface SearchItem {
  id: string;
  category: "trains" | "stations" | "modules" | "pnr";
  title: string;
  subtitle: string;
  badge?: string;
  href: string;
  icon: typeof Train;
}

const SEARCH_ITEMS: SearchItem[] = [
  // Modules / Workspaces
  {
    id: "mod-train",
    category: "modules",
    title: "Fleet Live Radar",
    subtitle: "Real-time GNSS train tracking and route telemetry",
    badge: "Console",
    href: "/train?number=22225",
    icon: Train,
  },
  {
    id: "mod-station",
    category: "modules",
    title: "Station Concourse Boards",
    subtitle: "Platform allocations, arrivals and departures",
    badge: "Operations",
    href: "/stations",
    icon: Building2,
  },
  {
    id: "mod-pnr",
    category: "modules",
    title: "PNR Passenger Ledger",
    subtitle: "Check ticket booking and coach allocation status",
    badge: "Verification",
    href: "/pnr",
    icon: Ticket,
  },
  {
    id: "mod-coach",
    category: "modules",
    title: "Coach Consist Architect",
    subtitle: "Rolling stock rake sequence and platform positioning",
    badge: "Rolling Stock",
    href: "/coach",
    icon: LayoutGrid,
  },
  {
    id: "mod-fare",
    category: "modules",
    title: "Telescopic Tariff Calculator",
    subtitle: "Distance slab tariffs, Tatkal charges, and GST breakdown",
    badge: "Revenue",
    href: "/fare",
    icon: Calculator,
  },
  {
    id: "mod-ai",
    category: "modules",
    title: "Operations AI Copilot",
    subtitle: "Timetable intelligence, route disruption analysis",
    badge: "Intelligence",
    href: "/ai-assistant",
    icon: Bot,
  },
  {
    id: "mod-admin",
    category: "modules",
    title: "System Telemetry & Health",
    subtitle: "Circuit breakers, provider status, and sync latency",
    badge: "Diagnostics",
    href: "/admin",
    icon: Activity,
  },

  // Featured Trains
  {
    id: "train-22225",
    category: "trains",
    title: "#22225 Solapur Vande Bharat",
    subtitle: "Mumbai CSMT → Solapur Jn (16-Car Trainset • 130 km/h)",
    badge: "Semi-High Speed",
    href: "/train?number=22225",
    icon: Train,
  },
  {
    id: "train-12951",
    category: "trains",
    title: "#12951 Mumbai Tejas Rajdhani",
    subtitle: "Mumbai Central MMCT → New Delhi NDLS (Tejas Rake)",
    badge: "Premier Express",
    href: "/train?number=12951",
    icon: Train,
  },
  {
    id: "train-12101",
    category: "trains",
    title: "#12101 Jnaneswari Super Deluxe",
    subtitle: "Mumbai LTT → Howrah Jn HWH (Superfast Express)",
    badge: "Trans-India",
    href: "/train?number=12101",
    icon: Train,
  },
  {
    id: "train-22436",
    category: "trains",
    title: "#22436 Vande Bharat Express",
    subtitle: "New Delhi NDLS → Varanasi Jn BSB (130 km/h)",
    badge: "Semi-High Speed",
    href: "/train?number=22436",
    icon: Train,
  },
  {
    id: "train-22226",
    category: "trains",
    title: "#22226 Mumbai CSMT Vande Bharat",
    subtitle: "Solapur Jn SUR → Mumbai CSMT (Turnaround Rake)",
    badge: "Semi-High Speed",
    href: "/train?number=22226",
    icon: Train,
  },

  // Terminals / Stations
  {
    id: "stn-csmt",
    category: "stations",
    title: "CSMT · Mumbai Chhatrapati Shivaji Maharaj Terminus",
    subtitle: "Central Railway HQ · 18 Platforms · Major Junction",
    badge: "Terminal",
    href: "/stations?code=CSMT",
    icon: Building2,
  },
  {
    id: "stn-pune",
    category: "stations",
    title: "PUNE · Pune Junction",
    subtitle: "Central Railway · 6 Platforms · High-density junction",
    badge: "Junction",
    href: "/stations?code=PUNE",
    icon: Building2,
  },
  {
    id: "stn-ndls",
    category: "stations",
    title: "NDLS · New Delhi Railway Station",
    subtitle: "Northern Railway · 16 Platforms · National Capital Terminal",
    badge: "Terminal",
    href: "/stations?code=NDLS",
    icon: Building2,
  },
  {
    id: "stn-hwh",
    category: "stations",
    title: "HWH · Howrah Junction",
    subtitle: "Eastern / South Eastern Railway · 23 Platforms",
    badge: "Mega Terminal",
    href: "/stations?code=HWH",
    icon: Building2,
  },
  {
    id: "stn-sur",
    category: "stations",
    title: "SUR · Solapur Junction",
    subtitle: "Central Railway · 5 Platforms · Key Maharashtra junction",
    badge: "Junction",
    href: "/stations?code=SUR",
    icon: Building2,
  },

  // PNR Records
  {
    id: "pnr-demo-1",
    category: "pnr",
    title: "PNR #1234567890",
    subtitle: "Mumbai to Solapur • 3A status • Coach B4 Berth 21",
    badge: "Verified Record",
    href: "/pnr?pnr=1234567890",
    icon: Ticket,
  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "trains" | "stations" | "modules">("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter items
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEARCH_ITEMS.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q))
      );
    });
  }, [query, activeCategory]);

  // Keyboard navigation within list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (current) {
        router.push(current.href);
        onClose();
      } else if (query.trim()) {
        const q = query.trim();
        if (/^\d{5}$/.test(q)) {
          router.push(`/train?number=${q}`);
        } else if (/^[A-Za-z]{2,5}$/.test(q)) {
          router.push(`/stations?code=${q.toUpperCase()}`);
        } else if (/^\d{10}$/.test(q)) {
          router.push(`/pnr?pnr=${q}`);
        }
        onClose();
      }
    }
  };

  const handleSelect = (item: SearchItem) => {
    router.push(item.href);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Operations Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-12"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-paper-3/85 transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette Modal */}
      <div
        className="relative z-10 w-full max-w-2xl bg-paper-2 border border-rule rounded-card overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-rule bg-paper">
          <Search className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a train number (e.g. 22225), station (CSMT), or jump to module…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted hover:text-ink p-1 rounded-pill cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-outlier text-muted bg-paper-3 px-2 py-0.5 rounded border border-rule">
              <span>ESC</span>
              <span className="text-[10px]">to exit</span>
            </div>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-rule bg-paper-3/50 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`px-2.5 py-1 rounded-pill font-medium transition-colors cursor-pointer ${
              activeCategory === "all"
                ? "bg-paper text-ink border border-rule font-semibold"
                : "text-muted hover:text-ink"
            }`}
          >
            All results ({filteredItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("trains")}
            className={`px-2.5 py-1 rounded-pill font-medium transition-colors cursor-pointer ${
              activeCategory === "trains"
                ? "bg-paper text-ink border border-rule font-semibold"
                : "text-muted hover:text-ink"
            }`}
          >
            Express Fleet
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("stations")}
            className={`px-2.5 py-1 rounded-pill font-medium transition-colors cursor-pointer ${
              activeCategory === "stations"
                ? "bg-paper text-ink border border-rule font-semibold"
                : "text-muted hover:text-ink"
            }`}
          >
            Terminal Stations
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("modules")}
            className={`px-2.5 py-1 rounded-pill font-medium transition-colors cursor-pointer ${
              activeCategory === "modules"
                ? "bg-paper text-ink border border-rule font-semibold"
                : "text-muted hover:text-ink"
            }`}
          >
            Operations Modules
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto max-h-[380px] p-2 space-y-1">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-3 py-2.5 rounded-pill flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-paper-3 text-ink border border-rule"
                      : "text-ink hover:bg-paper-3/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? "text-accent" : "text-muted"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-outlier text-muted bg-paper px-1.5 py-0.5 rounded border border-rule/60 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted truncate mt-0.5 font-outlier">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-outlier text-accent">
                        <span>Select</span>
                        <CornerDownLeft className="w-3 h-3" aria-hidden="true" />
                      </span>
                    )}
                    <ArrowRight
                      className="w-3.5 h-3.5 text-muted"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs text-ink font-semibold">
                No matching telemetry records found
              </p>
              <p className="text-[11px] text-muted font-outlier">
                Press Enter to run direct search query for &ldquo;{query}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-rule bg-paper text-[11px] text-muted flex items-center justify-between font-outlier">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-paper-3 border border-rule rounded text-[10px]">
                ↑
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-paper-3 border border-rule rounded text-[10px]">
                ↓
              </kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-paper-3 border border-rule rounded text-[10px]">
                ↵
              </kbd>{" "}
              select
            </span>
          </div>
          <span className="text-[10px] text-muted">RailPulse Command Core v2.4</span>
        </div>
      </div>
    </div>
  );
}
