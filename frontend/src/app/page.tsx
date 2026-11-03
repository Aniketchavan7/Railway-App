"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Train,
  Search,
  Building2,
  Ticket,
  LayoutGrid,
  Calculator,
  ArrowRight,
  ShieldCheck,
  Clock,
  HelpCircle,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [trainQuery, setTrainQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = trainQuery.trim();
    if (!q) return;
    router.push(`/train?number=${q}`);
  };

  const featuredTrains = [
    {
      number: "12101",
      name: "Jnaneswari Super Deluxe Express",
      origin: "LTT",
      destination: "HWH",
      route: "Mumbai to Howrah",
      delay: "15m late",
      status: "In transit near Igatpuri",
    },
    {
      number: "12951",
      name: "Mumbai Tejas Rajdhani Express",
      origin: "MMCT",
      destination: "NDLS",
      route: "Mumbai to New Delhi",
      delay: "On time",
      status: "Departed Mumbai Central",
    },
    {
      number: "22436",
      name: "Vande Bharat Express",
      origin: "NDLS",
      destination: "BSB",
      route: "New Delhi to Varanasi",
      delay: "On time",
      status: "Approaching Kanpur Central",
    },
  ];

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero Section */}
      <section className="bg-paper-2 border border-rule rounded-card p-5 sm:p-8 md:p-10">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-pill bg-paper-3 border border-rule text-muted text-xs font-outlier">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Live train status and schedules</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight text-ink">
            Track Any Indian Train with Precision
          </h1>

          <p className="lead text-ink-2 text-xs sm:text-sm md:text-base">
            Live GPS telemetry, station schedules, coach layouts and telescopic fares.
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="pt-2 flex flex-col sm:flex-row gap-2 max-w-lg"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={trainQuery}
                onChange={(e) => setTrainQuery(e.target.value)}
                placeholder="Enter 5-digit train number (e.g. 12101) …"
                className="w-full bg-paper text-ink placeholder:text-muted rounded-pill pl-9 pr-4 py-2.5 text-xs outline-none border border-rule transition-colors focus:border-accent"
              />
            </div>
            <button
              type="submit"
              disabled={!trainQuery.trim()}
              className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Track train</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Feature Highlights */}
          <div className="pt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-6 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-ok" />
              <span>Live location and delay updates</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cool" />
              <span>Platform and arrival times</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-accent" />
              <span>Instant route and fare answers</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Live Trains */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-rule pb-2">
          <h2 className="text-sm sm:text-base font-display font-bold text-ink tracking-tight flex items-center gap-2">
            <Train className="w-4 h-4 text-accent" />
            <span>Active express routes</span>
          </h2>
          <span className="text-xs text-muted">Tap to inspect live status</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {featuredTrains.map((train) => (
            <Link
              key={train.number}
              href={`/train?number=${train.number}`}
              className="group p-4 sm:p-5 bg-paper-2 rounded-card border border-rule hover:border-accent active:bg-paper-3 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                  <span className="text-xs font-outlier font-bold px-2 py-0.5 rounded-pill bg-paper-3 text-ink border border-rule">
                    #{train.number}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-pill font-outlier ${
                      train.delay === "On time"
                        ? "bg-ok-soft text-ok border border-ok/30"
                        : "bg-accent-soft text-accent border border-accent/30"
                    }`}
                  >
                    {train.delay}
                  </span>
                </div>

                <h3 className="font-display font-semibold text-ink text-sm transition-colors group-hover:text-accent">
                  {train.name}
                </h3>
                <p className="text-xs text-muted mt-1">{train.route}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between text-xs text-muted">
                <span className="line-clamp-1">{train.status}</span>
                <span className="text-accent shrink-0 motion-safe:group-hover:translate-x-0.5 motion-safe:transition-transform">
                  Inspect
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Platform Services Grid */}
      <section className="space-y-4">
        <div className="border-b border-rule pb-2">
          <h2 className="text-sm sm:text-base font-display font-bold text-ink tracking-tight">
            Railway operations suite
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/stations"
            className="p-4 sm:p-5 bg-paper-2 rounded-card border border-rule hover:border-rule-2 active:bg-paper-3 transition-colors group"
          >
            <div className="w-8 h-8 rounded-pill bg-paper-3 border border-rule text-cool flex items-center justify-center mb-3 group-hover:border-cool transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="font-display font-semibold text-sm text-ink mb-1">Station live boards</h3>
            <p className="text-xs text-muted">
              Live arrival and departure feeds for CSMT, PUNE, NDLS, and HWH terminals.
            </p>
          </Link>

          <Link
            href="/pnr"
            className="p-4 sm:p-5 bg-paper-2 rounded-card border border-rule hover:border-rule-2 active:bg-paper-3 transition-colors group"
          >
            <div className="w-8 h-8 rounded-pill bg-paper-3 border border-rule text-ok flex items-center justify-center mb-3 group-hover:border-ok transition-colors">
              <Ticket className="w-4 h-4" />
            </div>
            <h3 className="font-display font-semibold text-sm text-ink mb-1">PNR reservation status</h3>
            <p className="text-xs text-muted">
              Booking verification, coach berth allotment, and chart preparation state.
            </p>
          </Link>

          <Link
            href="/coach"
            className="p-4 sm:p-5 bg-paper-2 rounded-card border border-rule hover:border-rule-2 active:bg-paper-3 transition-colors group"
          >
            <div className="w-8 h-8 rounded-pill bg-paper-3 border border-rule text-accent flex items-center justify-center mb-3 group-hover:border-accent transition-colors">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <h3 className="font-display font-semibold text-sm text-ink mb-1">Coach composition</h3>
            <p className="text-xs text-muted">
              Interactive physical rake visualizer from Locomotive to SLR across classes.
            </p>
          </Link>

          <Link
            href="/fare"
            className="p-4 sm:p-5 bg-paper-2 rounded-card border border-rule hover:border-rule-2 active:bg-paper-3 transition-colors group"
          >
            <div className="w-8 h-8 rounded-pill bg-paper-3 border border-rule text-ink flex items-center justify-center mb-3 group-hover:border-accent transition-colors">
              <Calculator className="w-4 h-4" />
            </div>
            <h3 className="font-display font-semibold text-sm text-ink mb-1">Telescopic fare calculator</h3>
            <p className="text-xs text-muted">
              Railway Board distance formulas with Tatkal, Superfast, and GST breakdowns.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
