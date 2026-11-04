"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Train,
  Building2,
  Ticket,
  Bot,
  ArrowRight,
  Clock,
  Sparkles,
  X,
  CornerDownLeft,
} from "lucide-react";

export interface SearchSuggestion {
  id: string;
  type: "train" | "station" | "pnr" | "ai";
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  value: string;
  href: string;
}

const DEFAULT_SUGGESTIONS: SearchSuggestion[] = [
  {
    id: "train-22225",
    type: "train",
    title: "22225 • Solapur Vande Bharat Express",
    subtitle: "Mumbai CSMT → Solapur Jn (16-Car VB Rake)",
    badge: "Vande Bharat",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    value: "22225",
    href: "/train?number=22225",
  },
  {
    id: "train-22226",
    type: "train",
    title: "22226 • Mumbai CSMT Vande Bharat Express",
    subtitle: "Solapur Jn → Mumbai CSMT (Morning Run)",
    badge: "130 km/h MPS",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    value: "22226",
    href: "/train?number=22226",
  },
  {
    id: "train-12115",
    type: "train",
    title: "12115 • Siddheshwar Superfast Express",
    subtitle: "Mumbai CSMT → Solapur Jn (Overnight Express)",
    badge: "Superfast",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    value: "12115",
    href: "/train?number=12115",
  },
  {
    id: "train-12116",
    type: "train",
    title: "12116 • Siddheshwar Superfast Express",
    subtitle: "Solapur Jn → Mumbai CSMT (Overnight Express)",
    badge: "Daily",
    badgeColor: "text-muted bg-paper-3 border-rule",
    value: "12116",
    href: "/train?number=12116",
  },
  {
    id: "train-12123",
    type: "train",
    title: "12123 • Deccan Queen Superfast Express",
    subtitle: "Mumbai CSMT → Pune Jn (Evening Service)",
    badge: "Heritage",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    value: "12123",
    href: "/train?number=12123",
  },
  {
    id: "train-12124",
    type: "train",
    title: "12124 • Deccan Queen Superfast Express",
    subtitle: "Pune Jn → Mumbai CSMT (Morning Service)",
    badge: "Daily",
    badgeColor: "text-muted bg-paper-3 border-rule",
    value: "12124",
    href: "/train?number=12124",
  },
  {
    id: "train-12951",
    type: "train",
    title: "12951 • Mumbai Tejas Rajdhani Express",
    subtitle: "Mumbai Central MMCT → New Delhi NDLS",
    badge: "Rajdhani",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    value: "12951",
    href: "/train?number=12951",
  },
  {
    id: "train-12952",
    type: "train",
    title: "12952 • New Delhi Mumbai Tejas Rajdhani",
    subtitle: "New Delhi NDLS → Mumbai Central MMCT",
    badge: "Tejas Rake",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    value: "12952",
    href: "/train?number=12952",
  },
  {
    id: "train-22436",
    type: "train",
    title: "22436 • Vande Bharat Express",
    subtitle: "New Delhi NDLS → Varanasi BSB",
    badge: "130 km/h",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    value: "22436",
    href: "/train?number=22436",
  },
  {
    id: "train-12101",
    type: "train",
    title: "12101 • Jnaneswari Super Deluxe Express",
    subtitle: "Mumbai LTT → Kolkata Shalimar SHM",
    badge: "Super Deluxe",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    value: "12101",
    href: "/train?number=12101",
  },
  {
    id: "train-12158",
    type: "train",
    title: "12158 • Hutatma Express",
    subtitle: "Solapur Jn → Pune Jn (Intercity Link)",
    badge: "Morning Rake",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    value: "12158",
    href: "/train?number=12158",
  },
  {
    id: "train-11301",
    type: "train",
    title: "11301 • Udyan Express",
    subtitle: "Mumbai CSMT → KSR Bengaluru SBC",
    badge: "Inter-State",
    badgeColor: "text-muted bg-paper-3 border-rule",
    value: "11301",
    href: "/train?number=11301",
  },
  {
    id: "station-csmt",
    type: "station",
    title: "CSMT • Mumbai Chhatrapati Shivaji Terminus",
    subtitle: "Central Railway HQ • 18 Platforms",
    badge: "Terminal",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    value: "CSMT",
    href: "/stations?code=CSMT",
  },
  {
    id: "station-pune",
    type: "station",
    title: "PUNE • Pune Junction",
    subtitle: "Central Railway • 6 Platforms",
    badge: "Junction",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    value: "PUNE",
    href: "/stations?code=PUNE",
  },
  {
    id: "station-sur",
    type: "station",
    title: "SUR • Solapur Junction",
    subtitle: "Central Railway Division • 5 Platforms",
    badge: "Division Hub",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    value: "SUR",
    href: "/stations?code=SUR",
  },
  {
    id: "station-ndls",
    type: "station",
    title: "NDLS • New Delhi Railway Station",
    subtitle: "Northern Railway • 16 Platforms",
    badge: "Capital Hub",
    badgeColor: "text-accent bg-accent/10 border-accent/20",
    value: "NDLS",
    href: "/stations?code=NDLS",
  },
  {
    id: "station-hwh",
    type: "station",
    title: "HWH • Howrah Junction",
    subtitle: "Eastern Railway • 23 Platforms",
    badge: "Mega Concourse",
    badgeColor: "text-cool bg-cool/10 border-cool/20",
    value: "HWH",
    href: "/stations?code=HWH",
  },
  {
    id: "pnr-1",
    type: "pnr",
    title: "PNR 1234567890 • Solapur Vande Bharat",
    subtitle: "Coach B4 • Berth 21 • Confirmed Status",
    badge: "CNF",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    value: "1234567890",
    href: "/pnr?pnr=1234567890",
  },
  {
    id: "pnr-2",
    type: "pnr",
    title: "PNR 9876543210 • Mumbai Tejas Rajdhani",
    subtitle: "Coach A1 • Berth 15 • Confirmed Status",
    badge: "CNF",
    badgeColor: "text-ok bg-ok/10 border-ok/20",
    value: "9876543210",
    href: "/pnr?pnr=9876543210",
  },
];

const SEARCH_TABS = [
  { id: "all", label: "All", icon: Search },
  { id: "train", label: "Trains", icon: Train },
  { id: "station", label: "Stations", icon: Building2 },
  { id: "pnr", label: "PNR", icon: Ticket },
] as const;

export function ActionSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"all" | "train" | "station" | "pnr">("all");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("railpulse_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 4));
      }
    } catch {
      // Ignore
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    try {
      const next = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 4);
      setRecentSearches(next);
      localStorage.setItem("railpulse_recent_searches", JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEFAULT_SUGGESTIONS.filter((item) => {
      if (selectedTab !== "all" && item.type !== selectedTab) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q)
      );
    });
  }, [query, selectedTab]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 >= suggestions.length ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev === 0 ? Math.max(0, suggestions.length - 1) : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = suggestions[selectedIndex];
      if (current) {
        saveRecentSearch(current.title);
        router.push(current.href);
        setIsFocused(false);
      } else if (query.trim()) {
        const q = query.trim();
        saveRecentSearch(q);
        if (/^\d{5}$/.test(q)) {
          router.push(`/train?number=${q}`);
        } else if (/^[A-Za-z]{2,5}$/.test(q)) {
          router.push(`/stations?code=${q.toUpperCase()}`);
        } else if (/^\d{10}$/.test(q)) {
          router.push(`/pnr?pnr=${q}`);
        } else {
          router.push(`/ai-assistant?q=${encodeURIComponent(q)}`);
        }
        setIsFocused(false);
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSelectSuggestion = (item: SearchSuggestion) => {
    saveRecentSearch(item.title);
    router.push(item.href);
    setIsFocused(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto z-20">
      <div
        className={`relative flex flex-col bg-paper-2 rounded-2xl border transition-all duration-200 shadow-lg ${
          isFocused
            ? "border-accent ring-2 ring-accent/20 bg-paper"
            : "border-rule hover:border-rule-2 hover:bg-paper"
        }`}
      >
        <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 border-b border-rule/60 text-xs">
          {SEARCH_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedTab(tab.id as any);
                  setSelectedIndex(0);
                  inputRef.current?.focus();
                }}
                className={`relative px-3 py-1 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isActive ? "text-ink font-semibold" : "text-muted hover:text-ink"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSearchTab"
                    className="absolute inset-0 bg-paper-3 border border-rule rounded-pill shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <Search className="w-5 h-5 text-accent shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setIsFocused(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedTab === "train"
                ? "Enter 5-digit train number (e.g. 22225) or name…"
                : selectedTab === "station"
                ? "Enter station code (e.g. CSMT, PUNE, NDLS)…"
                : selectedTab === "pnr"
                ? "Enter 10-digit PNR booking number…"
                : "Search train #22225, station CSMT, PNR, or ask copilot…"
            }
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted outline-none font-medium"
          />

          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
              }}
              className="p-1 rounded-pill text-muted hover:text-ink cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-outlier text-muted bg-paper-3 px-2 py-0.5 rounded border border-rule">
              <span>⌘K</span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.99 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1.5 bg-paper-2 border border-rule/80 rounded-2xl shadow-xl overflow-hidden z-30 divide-y divide-rule/60"
          >
            {!query && recentSearches.length > 0 && (
              <div className="p-3 bg-paper-3/40">
                <div className="flex items-center gap-1.5 text-[11px] font-outlier text-muted font-semibold uppercase tracking-wider mb-2 px-1">
                  <Clock className="w-3 h-3 text-muted" />
                  <span>Recent searches</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setQuery(term);
                        setSelectedIndex(0);
                      }}
                      className="px-2.5 py-1 rounded-pill bg-paper border border-rule text-xs text-ink hover:border-accent hover:text-accent transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
              {suggestions.length > 0 ? (
                suggestions.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  const Icon =
                    item.type === "train"
                      ? Train
                      : item.type === "station"
                      ? Building2
                      : Ticket;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSuggestion(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-paper text-ink border border-rule shadow-xs"
                          : "text-ink hover:bg-paper-3/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                            isSelected
                              ? "bg-accent/10 text-accent border-accent/20"
                              : "bg-paper-3 text-muted border-rule"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-ink truncate">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[10px] font-outlier px-2 py-0.5 rounded-pill border shrink-0 ${
                                  item.badgeColor || "text-muted bg-paper-3 border-rule"
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
                            <CornerDownLeft className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <ArrowRight
                          className={`w-3.5 h-3.5 ${
                            isSelected ? "text-accent" : "text-muted"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs text-ink font-semibold">
                    No matching results for “{query}”
                  </p>
                  <p className="text-[11px] text-muted font-outlier">
                    Press Enter to query telemetry directly or ask the AI Assistant.
                  </p>
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 bg-paper flex items-center justify-between text-[11px] text-muted font-outlier">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-paper-3 border border-rule rounded text-[10px]">
                    ↑↓
                  </kbd>
                  <span>navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-paper-3 border border-rule rounded text-[10px]">
                    ↵
                  </kbd>
                  <span>select</span>
                </span>
              </div>
              <span className="text-muted">RailPulse Action Engine</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
