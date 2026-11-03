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
  const [searchMode, setSearchMode] = useState<"train" | "station" | "pnr">("train");
  const [trainQuery, setTrainQuery] = useState("");
  const [stationQuery, setStationQuery] = useState("");
  const [pnrQuery, setPnrQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode === "train") {
      const q = trainQuery.trim();
      if (!q) return;
      router.push(`/train?number=${encodeURIComponent(q)}`);
    } else if (searchMode === "station") {
      const q = stationQuery.trim();
      if (!q) return;
      router.push(`/stations?code=${encodeURIComponent(q.toUpperCase())}`);
    } else if (searchMode === "pnr") {
      const clean = pnrQuery.replace(/\D/g, "");
      if (clean.length !== 10) return;
      router.push(`/pnr?pnr=${clean}`);
    }
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

  const popularTrains = [
    { num: "12101", label: "12101 Jnaneswari" },
    { num: "12951", label: "12951 Rajdhani" },
    { num: "22436", label: "22436 Vande Bharat" },
    { num: "22225", label: "22225 Solapur VB" },
  ];

  const popularStations = [
    { code: "CSMT", label: "Mumbai CSMT" },
    { code: "PUNE", label: "Pune Jn" },
    { code: "NDLS", label: "New Delhi" },
    { code: "HWH", label: "Howrah Jn" },
    { code: "SUR", label: "Solapur Jn" },
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

            {/* Tactical Multi-Mode Hero Search Bar Console */}
            <div className="pt-2 space-y-3">
              {/* Mode Tabs */}
              <div className="inline-flex items-center p-1 rounded-pill bg-paper-3 border border-rule gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSearchMode("train")}
                  className={`px-3 py-1 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent ${
                    searchMode === "train"
                      ? "bg-accent text-accent-ink font-semibold"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <Train className="w-3.5 h-3.5" />
                  <span>Train status</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchMode("station")}
                  className={`px-3 py-1 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent ${
                    searchMode === "station"
                      ? "bg-accent text-accent-ink font-semibold"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Station board</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchMode("pnr")}
                  className={`px-3 py-1 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent ${
                    searchMode === "pnr"
                      ? "bg-accent text-accent-ink font-semibold"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>PNR enquiry</span>
                </button>
              </div>

              {/* Mode Input Forms */}
              {searchMode === "train" && (
                <form
                  onSubmit={handleSearch}
                  className="flex flex-col sm:flex-row gap-2 max-w-xl"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={trainQuery}
                      onChange={(e) => setTrainQuery(e.target.value)}
                      placeholder="Enter 5-digit train number (e.g. 12101, 12951) …"
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
              )}

              {searchMode === "station" && (
                <form
                  onSubmit={handleSearch}
                  className="flex flex-col sm:flex-row gap-2 max-w-xl"
                >
                  <div className="relative flex-1">
                    <Building2 className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={stationQuery}
                      onChange={(e) => setStationQuery(e.target.value.toUpperCase())}
                      placeholder="Enter station code (e.g. CSMT, PUNE, NDLS, HWH) …"
                      className="w-full bg-paper text-ink placeholder:text-muted rounded-pill pl-9 pr-4 py-2.5 text-xs outline-none border border-rule transition-colors focus:border-accent disabled:opacity-40 font-outlier font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!stationQuery.trim()}
                    className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-2 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span>View board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {searchMode === "pnr" && (
                <form
                  onSubmit={handleSearch}
                  className="flex flex-col sm:flex-row gap-2 max-w-xl"
                >
                  <div className="relative flex-1">
                    <Ticket className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      maxLength={10}
                      value={pnrQuery}
                      onChange={(e) =>
                        setPnrQuery(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Enter 10-digit PNR number (e.g. 1234567890) …"
                      className="w-full bg-paper text-ink placeholder:text-muted rounded-pill pl-9 pr-4 py-2.5 text-xs outline-none border border-rule transition-colors focus:border-accent disabled:opacity-40 font-outlier font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={pnrQuery.trim().length !== 10}
                    className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-2 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span>Check PNR</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {/* Mode-Specific Quick Shortcuts */}
              {searchMode === "train" && (
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className="text-muted text-[11px] font-medium">
                    Popular trains:
                  </span>
                  {popularTrains.map((item) => (
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
              )}

              {searchMode === "station" && (
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className="text-muted text-[11px] font-medium">
                    Major terminals:
                  </span>
                  {popularStations.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        setStationQuery(item.code);
                        router.push(`/stations?code=${item.code}`);
                      }}
                      className="px-2.5 py-0.5 rounded-pill bg-paper-3 hover:bg-paper active:opacity-80 text-muted hover:text-ink border border-rule transition-colors font-outlier text-[11px] cursor-pointer focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
                    >
                      {item.label} ({item.code})
                    </button>
                  ))}
                </div>
              )}

              {searchMode === "pnr" && (
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className="text-muted text-[11px] font-medium">
                    Demo test:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPnrQuery("1234567890");
                      router.push(`/pnr?pnr=1234567890`);
                    }}
                    className="px-2.5 py-0.5 rounded-pill bg-paper-3 hover:bg-paper active:opacity-80 text-muted hover:text-ink border border-rule transition-colors font-outlier text-[11px] cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    Demo #1234567890
                  </button>
                </div>
              )}
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

          {/* Hero Live Telemetry Radar Cockpit */}
          <Link
            href="/train?number=22225"
            data-slot="hero-railway"
            className="group lg:col-span-5 h-[260px] sm:h-[320px] rounded-pill overflow-hidden relative border border-rule bg-paper-3 flex flex-col justify-between p-5 text-ink transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {/* Background Atmosphere Image with Vignette */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/6/6e/Night_Train.jpg"
                alt="Night express in transit"
                width={1936}
                height={1288}
                className="w-full h-full object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-paper-2/80" />
            </div>

            {/* Top Row: Live Radar Beacon */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-paper border border-rule text-[11px] font-outlier">
                <span className="w-2 h-2 rounded-full bg-ok" />
                <span className="font-semibold text-ink">LIVE RADAR</span>
                <span className="text-muted">#22225</span>
              </span>
              <span className="text-[11px] font-outlier text-muted bg-paper px-2 py-0.5 rounded-pill border border-rule">
                Vande Bharat
              </span>
            </div>

            {/* Bottom Cockpit Telemetry Block */}
            <div className="relative z-10 space-y-2">
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-display font-bold text-ink leading-tight group-hover:text-accent transition-colors">
                    Solapur Vande Bharat
                  </h3>
                  <p className="text-[11px] text-muted font-outlier mt-0.5">
                    CSMT (Mumbai) → SUR (Solapur)
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1 font-outlier">
                    <span className="text-xl sm:text-2xl font-bold text-ink tracking-tight">118</span>
                    <span className="text-[10px] text-muted">km/h</span>
                  </div>
                  <span className="text-[10px] font-semibold text-ok block -mt-0.5">On time</span>
                </div>
              </div>

              {/* Action Banner */}
              <div className="pt-2 border-t border-rule/50 flex items-center justify-between text-xs">
                <span className="text-[11px] text-muted truncate">
                  Approaching Karjat Jn • PF 2
                </span>
                <span className="text-accent font-medium flex items-center gap-1 shrink-0 font-outlier text-[11px]">
                  <span>Track live</span>
                  <ArrowRight className="w-3 h-3 motion-safe:group-hover:translate-x-1 motion-safe:transition-transform" />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* National Rail Telemetry Metrics Strip */}
      <section className="bg-paper-2 rounded-card border border-rule overflow-hidden grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-rule">
        <div className="p-4 sm:p-5">
          <span className="text-[10px] font-outlier text-muted block">Active telemetry</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-outlier font-bold text-ink">42</span>
            <span className="text-xs text-muted font-outlier">expresses</span>
          </div>
          <span className="text-[11px] text-muted mt-0.5 block">Live GNSS tracking</span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-[10px] font-outlier text-muted block">Network punctuality</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-outlier font-bold text-ok">98.4%</span>
          </div>
          <span className="text-[11px] text-muted mt-0.5 block">On-time running index</span>
        </div>

        <div className="p-4 sm:p-5 pt-4 sm:pt-5">
          <span className="text-[10px] font-outlier text-muted block">Monitored divisions</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-outlier font-bold text-ink">14</span>
            <span className="text-xs text-muted font-outlier">zones</span>
          </div>
          <span className="text-[11px] text-muted mt-0.5 block">CR, NR, WR, ER, SR</span>
        </div>

        <div className="p-4 sm:p-5 pt-4 sm:pt-5">
          <span className="text-[10px] font-outlier text-muted block">Positioning cadence</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-outlier font-bold text-accent">&lt; 3s</span>
            <span className="text-xs text-muted font-outlier">latency</span>
          </div>
          <span className="text-[11px] text-muted mt-0.5 block">WebSocket real-time push</span>
        </div>
      </section>

      {/* Featured Live Trains - Unified Departures Board Panel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <Train className="w-4 h-4 text-accent" />
            <h2 className="text-sm sm:text-base font-display font-bold text-ink tracking-tight">
              Active express corridor
            </h2>
          </div>
          <span className="text-xs text-muted font-outlier">Real-time status</span>
        </div>

        {/* Cohesive Transit Board Panel - No nested card-in-a-card */}
        <div className="bg-paper-2 rounded-card border border-rule overflow-hidden">
          {/* Table Header (Desktop/Tablet) */}
          <div className="hidden md:grid md:grid-cols-12 px-5 py-2.5 bg-paper-3 border-b border-rule text-[11px] font-medium text-muted">
            <span className="col-span-4">TRAIN & SERVICE</span>
            <span className="col-span-3">ROUTE CORRIDOR</span>
            <span className="col-span-3">STATUS & SPEED</span>
            <span className="col-span-2 text-right">ACTION</span>
          </div>

          <div className="divide-y divide-rule">
            {featuredTrains.map((train) => (
              <Link
                key={train.number}
                href={`/train?number=${train.number}`}
                className="group p-4 sm:px-5 sm:py-3.5 flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 hover:bg-paper-3/60 active:bg-paper-3 transition-colors focus-visible:outline-2 focus-visible:outline-accent"
              >
                {/* Col 1: Train & Number */}
                <div className="md:col-span-4 flex items-start sm:items-center gap-3">
                  <span className="font-outlier font-bold text-xs text-ink shrink-0 tracking-wide">
                    #{train.number}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-ink text-sm transition-colors group-hover:text-accent truncate">
                      {train.name}
                    </h3>
                    <span className="text-[11px] text-muted md:hidden">
                      {train.originCity} to {train.destCity}
                    </span>
                  </div>
                </div>

                {/* Col 2: Route Corridor */}
                <div className="hidden md:flex md:col-span-3 items-center gap-2 text-xs">
                  <div className="text-left shrink-0">
                    <span className="font-bold text-ink">{train.origin}</span>
                    <span className="text-[10px] text-muted block -mt-0.5">{train.originCity}</span>
                  </div>
                  <div className="flex-1 mx-2 flex items-center gap-1 opacity-50">
                    <span className="h-px bg-rule-2 flex-1" />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    <span className="h-px bg-rule-2 flex-1" />
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-ink">{train.dest}</span>
                    <span className="text-[10px] text-muted block -mt-0.5">{train.destCity}</span>
                  </div>
                </div>

                {/* Col 3: Status & Speed */}
                <div className="md:col-span-3 flex items-center justify-between md:justify-start md:gap-4 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        train.delay === "On time" ? "bg-ok" : "bg-accent"
                      }`}
                    />
                    <span
                      className={`font-outlier font-semibold shrink-0 ${
                        train.delay === "On time" ? "text-ok" : "text-accent"
                      }`}
                    >
                      {train.delay}
                    </span>
                    <span className="text-muted truncate hidden sm:inline">
                      • {train.status}
                    </span>
                  </div>
                  <span className="font-outlier text-[11px] text-muted md:ml-auto shrink-0 flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-muted" />
                    {train.speed}
                  </span>
                </div>

                {/* Col 4: Action Link */}
                <div className="md:col-span-2 flex items-center justify-between md:justify-end text-xs pt-2 md:pt-0 border-t md:border-t-0 border-rule/50">
                  <span className="text-[11px] text-muted sm:hidden">
                    {train.status}
                  </span>
                  <span className="text-accent group-hover:text-accent-ink group-hover:bg-accent px-2.5 py-1 rounded-pill transition-colors font-medium flex items-center gap-1">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3 motion-safe:group-hover:translate-x-0.5 motion-safe:transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Services Directory - Unified 4-Column Panel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-sm sm:text-base font-display font-bold text-ink tracking-tight">
            Transit services
          </h2>
          <span className="text-xs text-muted font-outlier">System directory</span>
        </div>

        <div className="bg-paper-2 rounded-card border border-rule overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-rule">
          <Link
            href="/stations"
            className="p-5 hover:bg-paper-3/60 active:bg-paper-3 transition-colors group flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div>
              <div className="flex items-center justify-between mb-3 text-cool">
                <Building2 className="w-4 h-4 text-cool" />
                <span className="text-[10px] font-outlier text-muted">01 / Terminal</span>
              </div>
              <h3 className="font-display font-semibold text-sm text-ink mb-1 group-hover:text-cool transition-colors">
                Station live boards
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Arrival and departure schedules at major junction stations.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-rule/50 flex items-center justify-between text-xs text-muted group-hover:text-ink">
              <span className="font-medium">View stations</span>
              <ArrowRight className="w-3.5 h-3.5 text-cool motion-safe:group-hover:translate-x-0.5 motion-safe:transition-transform" />
            </div>
          </Link>

          <Link
            href="/pnr"
            className="p-5 hover:bg-paper-3/60 active:bg-paper-3 transition-colors group flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div>
              <div className="flex items-center justify-between mb-3 text-ok">
                <Ticket className="w-4 h-4 text-ok" />
                <span className="text-[10px] font-outlier text-muted">02 / Booking</span>
              </div>
              <h3 className="font-display font-semibold text-sm text-ink mb-1 group-hover:text-ok transition-colors">
                PNR status enquiry
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Current booking status, coach allotment, and chart preparation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-rule/50 flex items-center justify-between text-xs text-muted group-hover:text-ink">
              <span className="font-medium">Check PNR</span>
              <ArrowRight className="w-3.5 h-3.5 text-ok motion-safe:group-hover:translate-x-0.5 motion-safe:transition-transform" />
            </div>
          </Link>

          <Link
            href="/coach"
            className="p-5 hover:bg-paper-3/60 active:bg-paper-3 transition-colors group flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div>
              <div className="flex items-center justify-between mb-3 text-accent">
                <LayoutGrid className="w-4 h-4 text-accent" />
                <span className="text-[10px] font-outlier text-muted">03 / Layout</span>
              </div>
              <h3 className="font-display font-semibold text-sm text-ink mb-1 group-hover:text-accent transition-colors">
                Coach composition
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Coach order and seat positions from engine to rear.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-rule/50 flex items-center justify-between text-xs text-muted group-hover:text-ink">
              <span className="font-medium">Inspect rakes</span>
              <ArrowRight className="w-3.5 h-3.5 text-accent motion-safe:group-hover:translate-x-0.5 motion-safe:transition-transform" />
            </div>
          </Link>

          <Link
            href="/fare"
            className="p-5 hover:bg-paper-3/60 active:bg-paper-3 transition-colors group flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div>
              <div className="flex items-center justify-between mb-3 text-ink">
                <Calculator className="w-4 h-4 text-ink" />
                <span className="text-[10px] font-outlier text-muted">04 / Tariff</span>
              </div>
              <h3 className="font-display font-semibold text-sm text-ink mb-1 group-hover:text-accent transition-colors">
                Fare calculator
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Base fares, reservation fees, Tatkal charges, and GST by distance.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-rule/50 flex items-center justify-between text-xs text-muted group-hover:text-ink">
              <span className="font-medium">Calculate fares</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink motion-safe:group-hover:translate-x-0.5 motion-safe:transition-transform" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
