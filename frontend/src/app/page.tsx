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
  Gauge,
  MapPin,
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
      dest: "HWH",
      originCity: "Mumbai",
      destCity: "Howrah",
      speed: "75 km/h",
      delay: "15m late",
      status: "In transit near Igatpuri",
    },
    {
      number: "12951",
      name: "Mumbai Tejas Rajdhani Express",
      origin: "MMCT",
      dest: "NDLS",
      originCity: "Mumbai",
      destCity: "New Delhi",
      speed: "110 km/h",
      delay: "On time",
      status: "Departed Mumbai Central",
    },
    {
      number: "22436",
      name: "Vande Bharat Express",
      origin: "NDLS",
      dest: "BSB",
      originCity: "New Delhi",
      destCity: "Varanasi",
      speed: "130 km/h",
      delay: "On time",
      status: "Approaching Kanpur Central",
    },
  ];

  const quickTrains = [
    { num: "12101", label: "12101 Jnaneswari" },
    { num: "12951", label: "12951 Rajdhani" },
    { num: "22436", label: "22436 Vande Bharat" },
  ];

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero Section */}
      <section className="bg-paper-2 border border-rule rounded-card p-5 sm:p-8 md:p-10 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight text-ink">
              Track any train across India
            </h1>

            <p className="lead text-ink-2 text-xs sm:text-sm md:text-base">
              Live location, station arrival schedules, coach layouts, and ticket fares.
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
                  className="w-full bg-paper text-ink placeholder:text-muted rounded-pill pl-9 pr-4 py-2.5 text-xs outline-none border border-rule transition-colors focus:border-accent disabled:opacity-40"
                />
              </div>
              <button
                type="submit"
                disabled={!trainQuery.trim()}
                className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-2 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span>Track train</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick Shortcuts */}
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="text-muted text-[11px] font-medium">Popular trains:</span>
              {quickTrains.map((item) => (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => {
                    setTrainQuery(item.num);
                    router.push(`/train?number=${item.num}`);
                  }}
                  className="px-2.5 py-0.5 rounded-pill bg-paper-3 hover:bg-paper active:opacity-80 text-muted hover:text-ink border border-rule transition-colors font-outlier text-[11px] cursor-pointer focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Feature Highlights */}
            <div className="pt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-6 text-xs text-muted border-t border-rule/60">
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
                <span>Route halts and fares</span>
              </div>
            </div>
          </div>

          {/* Hero Atmosphere Image Slot */}
          <div
            data-slot="hero-railway"
            className="lg:col-span-5 h-[240px] sm:h-[320px] rounded-pill overflow-hidden relative border border-rule"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/6/6e/Night_Train.jpg"
              alt="Night train in transit with lit passenger windows"
              width={1936}
              height={1288}
              className="w-full h-full object-cover"
            />
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {featuredTrains.map((train) => (
            <Link
              key={train.number}
              href={`/train?number=${train.number}`}
              className="group p-4 sm:p-5 bg-paper-2 rounded-card border border-rule hover:border-accent active:bg-paper-3 transition-colors flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-accent"
            >
              <div>
                {/* Header Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
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

                {/* Train Name */}
                <h3 className="font-display font-semibold text-ink text-sm transition-colors group-hover:text-accent">
                  {train.name}
                </h3>

                {/* Tactical Route Diagram */}
                <div className="mt-3 py-2 px-2.5 rounded-pill bg-paper-3 border border-rule flex items-center justify-between text-xs font-outlier">
                  <div>
                    <span className="font-bold text-ink">{train.origin}</span>
                    <span className="text-[10px] text-muted block -mt-0.5">{train.originCity}</span>
                  </div>
                  <div className="flex-1 mx-3 flex items-center gap-1 opacity-50">
                    <span className="h-px bg-rule-2 flex-1" />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="h-px bg-rule-2 flex-1" />
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-ink">{train.dest}</span>
                    <span className="text-[10px] text-muted block -mt-0.5">{train.destCity}</span>
                  </div>
                </div>
              </div>

              {/* Status and Speed Footer */}
              <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between text-xs text-muted">
                <div className="flex items-center gap-1.5 line-clamp-1">
                  <MapPin className="w-3 h-3 text-cool shrink-0" />
                  <span className="truncate">{train.status}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-outlier text-[11px] text-ink font-semibold flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-accent" />
                    {train.speed}
                  </span>
                  <span className="text-accent motion-safe:group-hover:translate-x-0.5 motion-safe:transition-transform font-medium">
                    Inspect
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Platform Services Grid */}
      <section className="space-y-4">
        <div className="border-b border-rule pb-2">
          <h2 className="text-sm sm:text-base font-display font-bold text-ink tracking-tight">
            Services
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/stations"
            className="p-4 sm:p-5 bg-paper-2 rounded-card border border-rule hover:border-cool active:bg-paper-3 transition-colors group focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="w-8 h-8 rounded-pill bg-paper-3 border border-rule text-cool flex items-center justify-center mb-3 group-hover:border-cool transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="font-display font-semibold text-sm text-ink mb-1 group-hover:text-cool transition-colors">
              Station live boards
            </h3>
            <p className="text-xs text-muted">
              Arrival and departure schedules at major junction stations.
            </p>
          </Link>

          <Link
            href="/pnr"
            className="p-4 sm:p-5 bg-paper-2 rounded-card border border-rule hover:border-ok active:bg-paper-3 transition-colors group focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="w-8 h-8 rounded-pill bg-paper-3 border border-rule text-ok flex items-center justify-center mb-3 group-hover:border-ok transition-colors">
              <Ticket className="w-4 h-4" />
            </div>
            <h3 className="font-display font-semibold text-sm text-ink mb-1 group-hover:text-ok transition-colors">
              PNR status enquiry
            </h3>
            <p className="text-xs text-muted">
              Current booking status, coach allotment, and chart preparation.
            </p>
          </Link>

          <Link
            href="/coach"
            className="p-4 sm:p-5 bg-paper-2 rounded-card border border-rule hover:border-accent active:bg-paper-3 transition-colors group focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="w-8 h-8 rounded-pill bg-paper-3 border border-rule text-accent flex items-center justify-center mb-3 group-hover:border-accent transition-colors">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <h3 className="font-display font-semibold text-sm text-ink mb-1 group-hover:text-accent transition-colors">
              Coach composition
            </h3>
            <p className="text-xs text-muted">
              Coach order and seat positions from engine to rear.
            </p>
          </Link>

          <Link
            href="/fare"
            className="p-4 sm:p-5 bg-paper-2 rounded-card border border-rule hover:border-ink active:bg-paper-3 transition-colors group focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="w-8 h-8 rounded-pill bg-paper-3 border border-rule text-ink flex items-center justify-center mb-3 group-hover:border-accent transition-colors">
              <Calculator className="w-4 h-4" />
            </div>
            <h3 className="font-display font-semibold text-sm text-ink mb-1 group-hover:text-accent transition-colors">
              Fare calculator
            </h3>
            <p className="text-xs text-muted">
              Base fares, reservation fees, Tatkal charges, and GST by distance.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
