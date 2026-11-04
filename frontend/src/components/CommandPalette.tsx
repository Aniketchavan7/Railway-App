"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
  Command as CommandIcon,
  MapPin,
  TrendingUp,
} from "lucide-react";

interface SearchItem {
  id: string;
  category: "trains" | "stations" | "modules" | "pnr";
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  href: string;
  icon: typeof Train;
}

const SEARCH_ITEMS: SearchItem[] = [
  // Operations Modules / Workspaces
  {
    id: "mod-train",
    category: "modules",
    title: "Fleet Live Radar",
    subtitle: "Real-time GNSS train tracking and route telemetry console",
    badge: "Console",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=22225",
    icon: Train,
  },
  {
    id: "mod-station",
    category: "modules",
    title: "Station Concourse Boards",
    subtitle: "Platform allocations, live arrivals and departures",
    badge: "Operations",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    href: "/stations",
    icon: Building2,
  },
  {
    id: "mod-pnr",
    category: "modules",
    title: "PNR Passenger Ledger",
    subtitle: "Check ticket booking, waitlist predictions, and coach allocation",
    badge: "Verification",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    href: "/pnr",
    icon: Ticket,
  },
  {
    id: "mod-fare",
    category: "modules",
    title: "Telescopic Tariff Calculator",
    subtitle: "Distance slab tariffs, Tatkal charges, and GST breakdown",
    badge: "Revenue",
    badgeColor: "text-ink/80 bg-paper-3 border-rule",
    href: "/fare",
    icon: Calculator,
  },
  {
    id: "mod-ai",
    category: "modules",
    title: "Operations AI Copilot",
    subtitle: "Timetable intelligence, route disruption and schedule queries",
    badge: "Intelligence",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/ai-assistant",
    icon: Bot,
  },
  {
    id: "mod-admin",
    category: "modules",
    title: "System Telemetry & Health",
    subtitle: "Circuit breakers, provider status, and sync latency metrics",
    badge: "Diagnostics",
    badgeColor: "text-muted bg-paper-3 border-rule",
    href: "/admin",
    icon: Activity,
  },

  // 32 Indian Railways Express Fleet
  {
    id: "train-22225",
    category: "trains",
    title: "22225 • Solapur Vande Bharat Express",
    subtitle: "Mumbai CSMT → Solapur Jn (16-Car Trainset • 130 km/h)",
    badge: "Semi-High Speed",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=22225",
    icon: Train,
  },
  {
    id: "train-22226",
    category: "trains",
    title: "22226 • Mumbai CSMT Vande Bharat Express",
    subtitle: "Solapur Jn SUR → Mumbai CSMT (Turnaround Rake)",
    badge: "Semi-High Speed",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=22226",
    icon: Train,
  },
  {
    id: "train-12115",
    category: "trains",
    title: "12115 • Siddheshwar Superfast Express",
    subtitle: "Mumbai CSMT → Solapur Jn (Overnight Express)",
    badge: "Daily Express",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    href: "/train?number=12115",
    icon: Train,
  },
  {
    id: "train-12116",
    category: "trains",
    title: "12116 • Siddheshwar Superfast Express",
    subtitle: "Solapur Jn → Mumbai CSMT (Overnight Express)",
    badge: "Daily Express",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    href: "/train?number=12116",
    icon: Train,
  },
  {
    id: "train-12123",
    category: "trains",
    title: "12123 • Deccan Queen Superfast Express",
    subtitle: "Mumbai CSMT → Pune Jn (Evening Commute Rake)",
    badge: "Heritage Express",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=12123",
    icon: Train,
  },
  {
    id: "train-12124",
    category: "trains",
    title: "12124 • Deccan Queen Superfast Express",
    subtitle: "Pune Jn → Mumbai CSMT (Morning Commute Rake)",
    badge: "Heritage Express",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=12124",
    icon: Train,
  },
  {
    id: "train-12951",
    category: "trains",
    title: "12951 • Mumbai Tejas Rajdhani Express",
    subtitle: "Mumbai Central MMCT → New Delhi NDLS (Tejas Rake)",
    badge: "Premier Rajdhani",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=12951",
    icon: Train,
  },
  {
    id: "train-12952",
    category: "trains",
    title: "12952 • New Delhi Mumbai Tejas Rajdhani",
    subtitle: "New Delhi NDLS → Mumbai Central MMCT (Tejas Rake)",
    badge: "Premier Rajdhani",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=12952",
    icon: Train,
  },
  {
    id: "train-22436",
    category: "trains",
    title: "22436 • Vande Bharat Express",
    subtitle: "New Delhi NDLS → Varanasi Jn BSB (130 km/h MPS)",
    badge: "Vande Bharat",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=22436",
    icon: Train,
  },
  {
    id: "train-22435",
    category: "trains",
    title: "22435 • Vande Bharat Express",
    subtitle: "Varanasi Jn BSB → New Delhi NDLS (130 km/h MPS)",
    badge: "Vande Bharat",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=22435",
    icon: Train,
  },
  {
    id: "train-12101",
    category: "trains",
    title: "12101 • Jnaneswari Super Deluxe Express",
    subtitle: "Mumbai LTT → Kolkata Shalimar SHM (Trans-India)",
    badge: "Super Deluxe",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    href: "/train?number=12101",
    icon: Train,
  },
  {
    id: "train-12102",
    category: "trains",
    title: "12102 • Jnaneswari Super Deluxe Express",
    subtitle: "Kolkata Shalimar SHM → Mumbai LTT (Trans-India)",
    badge: "Super Deluxe",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    href: "/train?number=12102",
    icon: Train,
  },
  {
    id: "train-12157",
    category: "trains",
    title: "12157 • Hutatma Express",
    subtitle: "Pune Jn → Solapur Jn (Intercity Link)",
    badge: "Intercity",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    href: "/train?number=12157",
    icon: Train,
  },
  {
    id: "train-12158",
    category: "trains",
    title: "12158 • Hutatma Express",
    subtitle: "Solapur Jn → Pune Jn (Intercity Link)",
    badge: "Intercity",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    href: "/train?number=12158",
    icon: Train,
  },
  {
    id: "train-11301",
    category: "trains",
    title: "11301 • Udyan Express",
    subtitle: "Mumbai CSMT → KSR Bengaluru SBC (Via Pune & Solapur)",
    badge: "Inter-State Express",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    href: "/train?number=11301",
    icon: Train,
  },
  {
    id: "train-11302",
    category: "trains",
    title: "11302 • Udyan Express",
    subtitle: "KSR Bengaluru SBC → Mumbai CSMT (Via Solapur & Pune)",
    badge: "Inter-State Express",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    href: "/train?number=11302",
    icon: Train,
  },
  {
    id: "train-12809",
    category: "trains",
    title: "12809 • Mumbai Howrah Mail",
    subtitle: "Mumbai CSMT → Howrah Jn HWH (Via Nagpur)",
    badge: "Mail Express",
    badgeColor: "text-ink/80 bg-paper-3 border-rule",
    href: "/train?number=12809",
    icon: Train,
  },
  {
    id: "train-12810",
    category: "trains",
    title: "12810 • Howrah Mumbai Mail",
    subtitle: "Howrah Jn HWH → Mumbai CSMT (Via Nagpur)",
    badge: "Mail Express",
    badgeColor: "text-ink/80 bg-paper-3 border-rule",
    href: "/train?number=12810",
    icon: Train,
  },
  {
    id: "train-11027",
    category: "trains",
    title: "11027 • Dadar Solapur Express",
    subtitle: "Mumbai Dadar DR → Solapur Jn SUR",
    badge: "Express",
    badgeColor: "text-muted bg-paper-3 border-rule",
    href: "/train?number=11027",
    icon: Train,
  },
  {
    id: "train-11028",
    category: "trains",
    title: "11028 • Solapur Dadar Express",
    subtitle: "Solapur Jn SUR → Mumbai Dadar DR",
    badge: "Express",
    badgeColor: "text-muted bg-paper-3 border-rule",
    href: "/train?number=11028",
    icon: Train,
  },
  {
    id: "train-12627",
    category: "trains",
    title: "12627 • Karnataka Express",
    subtitle: "KSR Bengaluru SBC → New Delhi NDLS",
    badge: "Superfast",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    href: "/train?number=12627",
    icon: Train,
  },
  {
    id: "train-12628",
    category: "trains",
    title: "12628 • Karnataka Express",
    subtitle: "New Delhi NDLS → KSR Bengaluru SBC",
    badge: "Superfast",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    href: "/train?number=12628",
    icon: Train,
  },
  {
    id: "train-12051",
    category: "trains",
    title: "12051 • Jan Shatabdi Express",
    subtitle: "Mumbai CSMT → Madgaon Jn MAO (Konkan Coastline)",
    badge: "Jan Shatabdi",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=12051",
    icon: Train,
  },
  {
    id: "train-12052",
    category: "trains",
    title: "12052 • Jan Shatabdi Express",
    subtitle: "Madgaon Jn MAO → Mumbai CSMT (Konkan Coastline)",
    badge: "Jan Shatabdi",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=12052",
    icon: Train,
  },
  {
    id: "train-12261",
    category: "trains",
    title: "12261 • Mumbai Howrah Duronto Express",
    subtitle: "Mumbai CSMT → Howrah Jn HWH (Point-to-Point Express)",
    badge: "Duronto Express",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    href: "/train?number=12261",
    icon: Train,
  },
  {
    id: "train-12262",
    category: "trains",
    title: "12262 • Howrah Mumbai Duronto Express",
    subtitle: "Howrah Jn HWH → Mumbai CSMT (Point-to-Point Express)",
    badge: "Duronto Express",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    href: "/train?number=12262",
    icon: Train,
  },
  {
    id: "train-12009",
    category: "trains",
    title: "12009 • Mumbai Ahmedabad Shatabdi Express",
    subtitle: "Mumbai Central MMCT → Ahmedabad Jn ADI",
    badge: "Shatabdi",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=12009",
    icon: Train,
  },
  {
    id: "train-12010",
    category: "trains",
    title: "12010 • Ahmedabad Mumbai Shatabdi Express",
    subtitle: "Ahmedabad Jn ADI → Mumbai Central MMCT",
    badge: "Shatabdi",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=12010",
    icon: Train,
  },
  {
    id: "train-20901",
    category: "trains",
    title: "20901 • Gandhinagar Capital Vande Bharat",
    subtitle: "Mumbai Central MMCT → Gandhinagar Capital GNC",
    badge: "Vande Bharat",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=20901",
    icon: Train,
  },
  {
    id: "train-20902",
    category: "trains",
    title: "20902 • Gandhinagar Mumbai Vande Bharat",
    subtitle: "Gandhinagar Capital GNC → Mumbai Central MMCT",
    badge: "Vande Bharat",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=20902",
    icon: Train,
  },
  {
    id: "train-12953",
    category: "trains",
    title: "12953 • August Kranti Tejas Rajdhani Express",
    subtitle: "Mumbai Central MMCT → Hazrat Nizamuddin NZM",
    badge: "Tejas Rajdhani",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=12953",
    icon: Train,
  },
  {
    id: "train-12954",
    category: "trains",
    title: "12954 • August Kranti Tejas Rajdhani Express",
    subtitle: "Hazrat Nizamuddin NZM → Mumbai Central MMCT",
    badge: "Tejas Rajdhani",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/train?number=12954",
    icon: Train,
  },

  // Major Terminal Stations
  {
    id: "stn-csmt",
    category: "stations",
    title: "CSMT · Mumbai Chhatrapati Shivaji Maharaj Terminus",
    subtitle: "Central Railway HQ · 18 Platforms · UNESCO World Heritage",
    badge: "Mega Concourse",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/stations?code=CSMT",
    icon: Building2,
  },
  {
    id: "stn-pune",
    category: "stations",
    title: "PUNE · Pune Junction",
    subtitle: "Central Railway · 6 Platforms · High-Density Hub",
    badge: "Junction",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    href: "/stations?code=PUNE",
    icon: Building2,
  },
  {
    id: "stn-ndls",
    category: "stations",
    title: "NDLS · New Delhi Railway Station",
    subtitle: "Northern Railway · 16 Platforms · National Capital Terminal",
    badge: "Capital Concourse",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/stations?code=NDLS",
    icon: Building2,
  },
  {
    id: "stn-hwh",
    category: "stations",
    title: "HWH · Howrah Junction",
    subtitle: "Eastern / South Eastern Railway · 23 Platforms",
    badge: "23 Platforms",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    href: "/stations?code=HWH",
    icon: Building2,
  },
  {
    id: "stn-sur",
    category: "stations",
    title: "SUR · Solapur Junction",
    subtitle: "Central Railway Division · 5 Platforms",
    badge: "Division Hub",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    href: "/stations?code=SUR",
    icon: Building2,
  },
  {
    id: "stn-mmct",
    category: "stations",
    title: "MMCT · Mumbai Central",
    subtitle: "Western Railway · Origin of Mumbai Rajdhani",
    badge: "WR Terminal",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    href: "/stations?code=MMCT",
    icon: Building2,
  },
  {
    id: "stn-sbc",
    category: "stations",
    title: "SBC · KSR Bengaluru City",
    subtitle: "South Western Railway · 10 Platforms",
    badge: "Tech Capital",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    href: "/stations?code=SBC",
    icon: Building2,
  },
  {
    id: "stn-mas",
    category: "stations",
    title: "MAS · Chennai Central",
    subtitle: "Southern Railway HQ · 17 Platforms",
    badge: "SR Terminal",
    badgeColor: "text-ink/80 bg-paper-3 border-rule",
    href: "/stations?code=MAS",
    icon: Building2,
  },
  {
    id: "stn-adi",
    category: "stations",
    title: "ADI · Ahmedabad Junction",
    subtitle: "Western Railway · Major Gujarat Concourse",
    badge: "Junction",
    badgeColor: "text-ink/80 bg-paper-3 border-rule",
    href: "/stations?code=ADI",
    icon: Building2,
  },
  {
    id: "stn-ltt",
    category: "stations",
    title: "LTT · Lokmanya Tilak Terminus",
    subtitle: "Mumbai Central Railway · Long-Distance Express Terminal",
    badge: "Express Hub",
    badgeColor: "text-muted bg-paper-3 border-rule",
    href: "/stations?code=LTT",
    icon: Building2,
  },

  // PNR Sample Records
  {
    id: "pnr-demo-1",
    category: "pnr",
    title: "PNR #1234567890",
    subtitle: "Mumbai CSMT → Solapur Jn • 3A Status • Coach B4 Berth 21 (CNF)",
    badge: "Verified Sample",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    href: "/pnr?pnr=1234567890",
    icon: Ticket,
  },
  {
    id: "pnr-demo-2",
    category: "pnr",
    title: "PNR #9876543210",
    subtitle: "New Delhi NDLS → Mumbai MMCT • 2A Status • Coach A1 Berth 15 (CNF)",
    badge: "Verified Sample",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    href: "/pnr?pnr=9876543210",
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
  const [activeCategory, setActiveCategory] = useState<
    "all" | "trains" | "stations" | "modules"
  >("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Global keyboard shortcut: Escape to close
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Filter items based on active category & fuzzy search string
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

  // Keep selected item within view bounds
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(0);
    }
  }, [filteredItems.length, selectedIndex]);

  // Keyboard navigation within list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev + 1 >= filteredItems.length ? 0 : prev + 1
      );
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
        } else {
          router.push(`/ai-assistant?q=${encodeURIComponent(q)}`);
        }
        onClose();
      }
    }
  };

  const handleSelect = (item: SearchItem) => {
    router.push(item.href);
    onClose();
  };

  const categories = [
    { id: "all", label: "All Items", count: SEARCH_ITEMS.length },
    {
      id: "trains",
      label: "Fleet Radar",
      count: SEARCH_ITEMS.filter((i) => i.category === "trains").length,
    },
    {
      id: "stations",
      label: "Concourses",
      count: SEARCH_ITEMS.filter((i) => i.category === "stations").length,
    },
    {
      id: "modules",
      label: "Operations",
      count: SEARCH_ITEMS.filter((i) => i.category === "modules").length,
    },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="RailPulse Operations Command Palette"
          className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-12 overflow-y-auto"
        >
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-paper-3/80 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Palette Modal (21st.dev Spotlight Command Design) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative z-10 w-full max-w-2xl bg-paper-2 border border-rule rounded-2xl shadow-lg overflow-hidden flex flex-col max-h-[85vh] mt-4 sm:mt-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar with Icon */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-rule/70 bg-paper">
              <Search
                className="w-4 h-4 text-muted shrink-0"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type train (e.g. 22225), station (CSMT), PNR, or ask copilot…"
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted outline-none font-medium"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-muted hover:text-ink p-1 rounded-pill cursor-pointer focus-visible:outline-2 focus-visible:outline-accent transition-colors"
                  aria-label="Clear query"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] font-outlier text-muted bg-paper-3 px-2 py-0.5 rounded-md border border-rule">
                  <kbd className="font-semibold">ESC</kbd>
                  <span className="text-[10px]">close</span>
                </div>
              )}
            </div>

            {/* Filter Pills with 21st.dev Sliding Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-rule/60 bg-paper-3/40 overflow-x-auto text-xs">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat.id as any);
                      setSelectedIndex(0);
                    }}
                    className={`relative px-3 py-1 rounded-pill font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      isActive ? "text-ink font-semibold" : "text-muted hover:text-ink"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="commandPaletteActiveTab"
                        className="absolute inset-0 bg-paper border border-rule/80 rounded-pill shadow-xs"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <span>{cat.label}</span>
                      <span className="text-[10px] font-outlier text-muted">
                        {cat.count}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Results List */}
            <div
              ref={listRef}
              className="overflow-y-auto max-h-[380px] p-2 space-y-1 divide-y divide-transparent"
            >
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => {
                  const Icon = item.icon;
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-paper-3 text-ink border border-rule shadow-xs"
                          : "text-ink hover:bg-paper-3/50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                            isSelected
                              ? "bg-paper text-accent border-accent/30"
                              : "bg-paper-3/70 text-muted border-rule/50"
                          }`}
                        >
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-ink truncate">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[10px] font-outlier px-2 py-0.5 rounded-md border shrink-0 ${
                                  item.badgeColor || "text-muted bg-paper border-rule"
                                }`}
                              >
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
                          <span className="hidden sm:flex items-center gap-1 text-[11px] font-outlier text-accent font-semibold">
                            <span>Open</span>
                            <CornerDownLeft
                              className="w-3.5 h-3.5"
                              aria-hidden="true"
                            />
                          </span>
                        )}
                        <ArrowRight
                          className={`w-3.5 h-3.5 transition-transform ${
                            isSelected
                              ? "text-accent translate-x-0.5"
                              : "text-muted"
                          }`}
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
                    Press <kbd className="px-1.5 py-0.5 bg-paper-3 border border-rule rounded">Enter</kbd> to query &ldquo;{query}&rdquo; directly
                  </p>
                </div>
              )}
            </div>

            {/* Footer shortcuts */}
            <div className="px-4 py-2.5 border-t border-rule/70 bg-paper text-[11px] text-muted flex items-center justify-between font-outlier">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-paper-3 border border-rule rounded text-[10px]">
                    ↑
                  </kbd>
                  <kbd className="px-1.5 py-0.5 bg-paper-3 border border-rule rounded text-[10px]">
                    ↓
                  </kbd>
                  <span className="text-[10px]">navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-paper-3 border border-rule rounded text-[10px]">
                    ↵
                  </kbd>
                  <span className="text-[10px]">select</span>
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted">
                <CommandIcon className="w-3 h-3" />
                <span>RailPulse Spotlight Core</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}