"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
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
  Radio,
  SlidersHorizontal,
  Activity,
  Bot,
} from "lucide-react";

interface FleetTrain {
  number: string;
  name: string;
  type: string;
  zone: "CR" | "NR" | "WR" | "ER";
  zoneName: string;
  origin: string;
  dest: string;
  originCity: string;
  destCity: string;
  speed: string;
  delay: "On time" | "15m late" | "8m late";
  status: string;
  nextHalt: string;
  platform: string;
}

export default function HomePage() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<"train" | "station" | "pnr">("train");
  const [trainQuery, setTrainQuery] = useState("");
  const [stationQuery, setStationQuery] = useState("");
  const [pnrQuery, setPnrQuery] = useState("");

  // Fleet Filter State
  const [selectedZone, setSelectedZone] = useState<"ALL" | "CR" | "NR" | "WR">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ON_TIME" | "DELAYED">("ALL");

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

  const fleetTrains: FleetTrain[] = [
    {
      number: "22225",
      name: "Solapur Vande Bharat Express",
      type: "Semi-High Speed",
      zone: "CR",
      zoneName: "Central Railway",
      origin: "CSMT",
      dest: "SUR",
      originCity: "Mumbai",
      destCity: "Solapur",
      speed: "118 km/h",
      delay: "On time",
      status: "In transit near Karjat Jn",
      nextHalt: "Karjat Jn",
      platform: "PF 2",
    },
    {
      number: "12951",
      name: "Mumbai Tejas Rajdhani Express",
      type: "Premier Superfast",
      zone: "WR",
      zoneName: "Western Railway",
      origin: "MMCT",
      dest: "NDLS",
      originCity: "Mumbai",
      destCity: "New Delhi",
      speed: "110 km/h",
      delay: "On time",
      status: "Departed Mumbai Central",
      nextHalt: "Surat",
      platform: "PF 1",
    },
    {
      number: "12101",
      name: "Jnaneswari Super Deluxe Express",
      type: "Superfast Express",
      zone: "CR",
      zoneName: "Central Railway",
      origin: "LTT",
      dest: "HWH",
      originCity: "Mumbai",
      destCity: "Howrah",
      speed: "75 km/h",
      delay: "15m late",
      status: "In transit near Igatpuri",
      nextHalt: "Nashik Road",
      platform: "PF 3",
    },
    {
      number: "22436",
      name: "Vande Bharat Express",
      type: "Semi-High Speed",
      zone: "NR",
      zoneName: "Northern Railway",
      origin: "NDLS",
      dest: "BSB",
      originCity: "New Delhi",
      destCity: "Varanasi",
      speed: "130 km/h",
      delay: "On time",
      status: "Approaching Kanpur Central",
      nextHalt: "Kanpur Central",
      platform: "PF 5",
    },
    {
      number: "22226",
      name: "Mumbai CSMT Vande Bharat",
      type: "Semi-High Speed",
      zone: "CR",
      zoneName: "Central Railway",
      origin: "SUR",
      dest: "CSMT",
      originCity: "Solapur",
      destCity: "Mumbai",
      speed: "112 km/h",
      delay: "On time",
      status: "Approaching Daund Jn",
      nextHalt: "Pune Jn",
      platform: "PF 2",
    },
  ];

  const filteredFleet = useMemo(() => {
    return fleetTrains.filter((train) => {
      if (selectedZone !== "ALL" && train.zone !== selectedZone) {
        return false;
      }
      if (statusFilter === "ON_TIME" && train.delay !== "On time") {
        return false;
      }
      if (statusFilter === "DELAYED" && train.delay === "On time") {
        return false;
      }
      return true;
    });
  }, [fleetTrains, selectedZone, statusFilter]);

  const popularTrains = [
    { num: "22225", label: "22225 Solapur VB" },
    { num: "12951", label: "12951 Rajdhani" },
    { num: "12101", label: "12101 Jnaneswari" },
    { num: "22436", label: "22436 Vande Bharat" },
  ];

  const popularStations = [
    { code: "CSMT", label: "Mumbai CSMT" },
    { code: "PUNE", label: "Pune Jn" },
    { code: "NDLS", label: "New Delhi" },
    { code: "HWH", label: "Howrah Jn" },
    { code: "SUR", label: "Solapur Jn" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Enterprise Operations Banner / Context Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-pill bg-paper-2 border border-rule text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-paper-3 border border-rule text-[11px] font-outlier font-semibold text-ink shrink-0">
            <Radio className="w-3 h-3 text-ok" aria-hidden="true" />
            <span>DISPATCH OPS</span>
          </span>
          <span className="text-muted truncate text-[11px] font-outlier">
            Central Railway HQ &bull; Monitoring 42 scheduled express rakes across 14 divisions
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px] font-outlier text-muted">
          <span>GNSS LOCK: 100%</span>
          <span className="text-rule-2">&bull;</span>
          <span className="text-ok font-semibold">FEED NORMAL</span>
        </div>
      </div>

      {/* Hero Operations Search Cockpit */}
      <section className="bg-paper-2 border border-rule rounded-card p-5 sm:p-8 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <span className="text-[11px] font-outlier text-accent font-semibold tracking-wide">
                ENTERPRISE TRANSIT INTELLIGENCE
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold tracking-tight text-ink mt-1">
                National Rail Operations Console
              </h1>
            </div>

            <p className="lead text-ink-2 text-xs sm:text-sm md:text-base">
              Live GNSS telemetry, platform allocations, rake compositions, and distance tariffs.
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
                  <Train className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Fleet tracking</span>
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
                  <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Terminal boards</span>
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
                  <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Passenger PNR</span>
                </button>
              </div>

              {/* Mode Input Forms */}
              {searchMode === "train" && (
                <form
                  onSubmit={handleSearch}
                  className="flex flex-col sm:flex-row gap-2 max-w-xl"
                >
                  <div className="relative flex-1">
                    <Search
                      className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={trainQuery}
                      onChange={(e) => setTrainQuery(e.target.value)}
                      placeholder="Enter 5-digit train number (e.g. 22225, 12951) …"
                      className="w-full bg-paper text-ink placeholder:text-muted rounded-pill pl-9 pr-4 py-2.5 text-xs outline-none border border-rule transition-colors focus:border-accent disabled:opacity-40"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!trainQuery.trim()}
                    className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-2 shrink-0 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span>Track rake</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </form>
              )}

              {searchMode === "station" && (
                <form
                  onSubmit={handleSearch}
                  className="flex flex-col sm:flex-row gap-2 max-w-xl"
                >
                  <div className="relative flex-1">
                    <Building2
                      className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
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
                    className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-2 shrink-0 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span>View terminal</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </form>
              )}

              {searchMode === "pnr" && (
                <form
                  onSubmit={handleSearch}
                  className="flex flex-col sm:flex-row gap-2 max-w-xl"
                >
                  <div className="relative flex-1">
                    <Ticket
                      className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
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
                    className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-2 shrink-0 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span>Verify PNR</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </form>
              )}

              {/* Mode-Specific Quick Shortcuts */}
              {searchMode === "train" && (
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className="text-muted text-[11px] font-medium font-outlier">
                    Express fleet:
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
                  <span className="text-muted text-[11px] font-medium font-outlier">
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
                  <span className="text-muted text-[11px] font-medium font-outlier">
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
                <ShieldCheck className="w-3.5 h-3.5 text-ok" aria-hidden="true" />
                <span>Real-time GNSS telemetry</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cool" aria-hidden="true" />
                <span>Station platform allocation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                <span>Telescopic distance tariff</span>
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
                Vande Bharat EMU
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
                    CSMT (Mumbai) &rarr; SUR (Solapur)
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
                  Approaching Karjat Jn &bull; PF 2
                </span>
                <span className="text-accent font-medium flex items-center gap-1 shrink-0 font-outlier text-[11px]">
                  <span>Track live</span>
                  <ArrowRight className="w-3 h-3 motion-safe:group-hover:translate-x-1 motion-safe:transition-transform" aria-hidden="true" />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* National Rail Telemetry Metrics Strip (Linear / Vercel high-density numbers) */}
      <section className="bg-paper-2 rounded-card border border-rule overflow-hidden grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-rule">
        <div className="p-4 sm:p-5">
          <span className="text-[10px] font-outlier text-muted block">Active telemetry</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-outlier font-bold text-ink">42</span>
            <span className="text-xs text-muted font-outlier">express rakes</span>
          </div>
          <span className="text-[11px] text-muted mt-0.5 block">GNSS satellite lock</span>
        </div>

        <div className="p-4 sm:p-5">
          <span className="text-[10px] font-outlier text-muted block">Network punctuality</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-outlier font-bold text-ok">98.4%</span>
          </div>
          <span className="text-[11px] text-muted mt-0.5 block">+0.6% 24h corridor index</span>
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
          <span className="text-[10px] font-outlier text-muted block">Telemetry latency</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-outlier font-bold text-accent">&lt; 3s</span>
            <span className="text-xs text-muted font-outlier">cadence</span>
          </div>
          <span className="text-[11px] text-muted mt-0.5 block">WebSocket real-time push</span>
        </div>
      </section>

      {/* Operational Dispatch Advisory Bulletin */}
      <div className="px-4 py-3 rounded-card bg-paper-2 border border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded bg-paper-3 border border-rule text-[10px] font-outlier font-semibold text-ok shrink-0">
            BULLETIN #2026-CR-04
          </span>
          <p className="text-muted text-xs truncate">
            Normal line speeds (110–130 km/h) active on Mumbai–Pune and Delhi–Kanpur corridors. Automatic block signalling operational.
          </p>
        </div>
        <span className="text-[11px] text-muted font-outlier shrink-0">
          Updated 4m ago
        </span>
      </div>

      {/* Featured Live Trains - Interactive Enterprise Fleet Ledger Panel */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2">
            <Train className="w-4 h-4 text-accent" aria-hidden="true" />
            <h2 className="text-sm sm:text-base font-display font-bold text-ink tracking-tight">
              Active Express Fleet Ledger
            </h2>
            <span className="text-xs text-muted font-outlier">({filteredFleet.length} in transit)</span>
          </div>

          {/* Interactive Filters Toolbar */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            <div className="flex items-center gap-1 p-0.5 rounded-pill bg-paper-2 border border-rule text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedZone("ALL")}
                className={`px-2.5 py-0.5 rounded-pill font-medium transition-colors cursor-pointer ${
                  selectedZone === "ALL"
                    ? "bg-paper-3 text-ink font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                All Zones
              </button>
              <button
                type="button"
                onClick={() => setSelectedZone("CR")}
                className={`px-2.5 py-0.5 rounded-pill font-medium transition-colors cursor-pointer ${
                  selectedZone === "CR"
                    ? "bg-paper-3 text-ink font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                Central (CR)
              </button>
              <button
                type="button"
                onClick={() => setSelectedZone("NR")}
                className={`px-2.5 py-0.5 rounded-pill font-medium transition-colors cursor-pointer ${
                  selectedZone === "NR"
                    ? "bg-paper-3 text-ink font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                Northern (NR)
              </button>
              <button
                type="button"
                onClick={() => setSelectedZone("WR")}
                className={`px-2.5 py-0.5 rounded-pill font-medium transition-colors cursor-pointer ${
                  selectedZone === "WR"
                    ? "bg-paper-3 text-ink font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                Western (WR)
              </button>
            </div>

            <div className="flex items-center gap-1 p-0.5 rounded-pill bg-paper-2 border border-rule text-[11px]">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-0.5 rounded-pill font-medium transition-colors cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-paper-3 text-ink font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ON_TIME")}
                className={`px-2.5 py-0.5 rounded-pill font-medium transition-colors cursor-pointer ${
                  statusFilter === "ON_TIME"
                    ? "bg-paper-3 text-ok font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                On Time
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DELAYED")}
                className={`px-2.5 py-0.5 rounded-pill font-medium transition-colors cursor-pointer ${
                  statusFilter === "DELAYED"
                    ? "bg-paper-3 text-accent font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                Delayed
              </button>
            </div>
          </div>
        </div>

        {/* Cohesive Transit Board Panel - No nested card-in-a-card */}
        <div className="bg-paper-2 rounded-card border border-rule overflow-hidden">
          {/* Table Header (Desktop/Tablet) */}
          <div className="hidden md:grid md:grid-cols-12 px-5 py-2.5 bg-paper-3 border-b border-rule text-[11px] font-medium text-muted">
            <span className="col-span-4">TRAIN & SERVICE CLASS</span>
            <span className="col-span-3">ROUTE CORRIDOR</span>
            <span className="col-span-3">POSITION & SPEED</span>
            <span className="col-span-2 text-right">DISPATCH</span>
          </div>

          <div className="divide-y divide-rule">
            {filteredFleet.length > 0 ? (
              filteredFleet.map((train) => (
                <Link
                  key={train.number}
                  href={`/train?number=${train.number}`}
                  className="group p-4 sm:px-5 sm:py-3.5 flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 hover:bg-paper-3/60 active:bg-paper-3 transition-colors focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {/* Col 1: Train & Number */}
                  <div className="md:col-span-4 flex items-start sm:items-center gap-3">
                    <span className="font-outlier font-bold text-xs text-ink shrink-0 tracking-wide bg-paper-3 px-2 py-1 rounded border border-rule">
                      #{train.number}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold text-ink text-sm transition-colors group-hover:text-accent truncate">
                          {train.name}
                        </h3>
                        <span className="hidden sm:inline-block text-[10px] font-outlier text-muted bg-paper px-1.5 py-0.2 rounded border border-rule/50 shrink-0">
                          {train.zone}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted md:hidden">
                        {train.originCity} to {train.destCity} &bull; {train.nextHalt} ({train.platform})
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
                        &bull; {train.nextHalt} ({train.platform})
                      </span>
                    </div>
                    <span className="font-outlier text-[11px] text-muted md:ml-auto shrink-0 flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-muted" aria-hidden="true" />
                      {train.speed}
                    </span>
                  </div>

                  {/* Col 4: Action Link */}
                  <div className="md:col-span-2 flex items-center justify-between md:justify-end text-xs pt-2 md:pt-0 border-t md:border-t-0 border-rule/50">
                    <span className="text-[11px] text-muted sm:hidden">
                      {train.status}
                    </span>
                    <span className="text-accent group-hover:text-accent-ink group-hover:bg-accent px-2.5 py-1 rounded-pill transition-colors font-medium flex items-center gap-1">
                      <span>Dispatch</span>
                      <ArrowRight className="w-3 h-3 motion-safe:group-hover:translate-x-0.5 motion-safe:transition-transform" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs text-ink font-semibold">No express rakes match the selected filter criteria</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedZone("ALL");
                    setStatusFilter("ALL");
                  }}
                  className="text-xs text-accent hover:underline cursor-pointer"
                >
                  Reset all fleet filters
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Platform Services Directory - Unified 4-Column Panel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-sm sm:text-base font-display font-bold text-ink tracking-tight">
            Enterprise Operations Modules
          </h2>
          <span className="text-xs text-muted font-outlier">System workspaces</span>
        </div>

        <div className="bg-paper-2 rounded-card border border-rule overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-rule">
          <Link
            href="/stations"
            className="p-5 hover:bg-paper-3/60 active:bg-paper-3 transition-colors group flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div>
              <div className="flex items-center justify-between mb-3 text-cool">
                <Building2 className="w-4 h-4 text-cool" aria-hidden="true" />
                <span className="text-[10px] font-outlier text-muted">01 / Terminal</span>
              </div>
              <h3 className="font-display font-semibold text-sm text-ink mb-1 group-hover:text-cool transition-colors">
                Station concourse boards
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Platform allocations, turnaround schedules, and live arrival boards.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-rule/50 flex items-center justify-between text-xs text-muted group-hover:text-ink">
              <span className="font-medium">Open terminal board</span>
              <ArrowRight className="w-3.5 h-3.5 text-cool motion-safe:group-hover:translate-x-0.5 motion-safe:transition-transform" aria-hidden="true" />
            </div>
          </Link>

          <Link
            href="/pnr"
            className="p-5 hover:bg-paper-3/60 active:bg-paper-3 transition-colors group flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div>
              <div className="flex items-center justify-between mb-3 text-ok">
                <Ticket className="w-4 h-4 text-ok" aria-hidden="true" />
                <span className="text-[10px] font-outlier text-muted">02 / Passenger</span>
              </div>
              <h3 className="font-display font-semibold text-sm text-ink mb-1 group-hover:text-ok transition-colors">
                PNR passenger verification
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Current booking status, coach allotment, and chart preparation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-rule/50 flex items-center justify-between text-xs text-muted group-hover:text-ink">
              <span className="font-medium">Verify itinerary</span>
              <ArrowRight className="w-3.5 h-3.5 text-ok motion-safe:group-hover:translate-x-0.5 motion-safe:transition-transform" aria-hidden="true" />
            </div>
          </Link>

          <Link
            href="/coach"
            className="p-5 hover:bg-paper-3/60 active:bg-paper-3 transition-colors group flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div>
              <div className="flex items-center justify-between mb-3 text-accent">
                <LayoutGrid className="w-4 h-4 text-accent" aria-hidden="true" />
                <span className="text-[10px] font-outlier text-muted">03 / Consist</span>
              </div>
              <h3 className="font-display font-semibold text-sm text-ink mb-1 group-hover:text-accent transition-colors">
                Coach consist architect
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Rolling stock sequence, locomotive position, and platform pole alignment.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-rule/50 flex items-center justify-between text-xs text-muted group-hover:text-ink">
              <span className="font-medium">Inspect consist</span>
              <ArrowRight className="w-3.5 h-3.5 text-accent motion-safe:group-hover:translate-x-0.5 motion-safe:transition-transform" aria-hidden="true" />
            </div>
          </Link>

          <Link
            href="/fare"
            className="p-5 hover:bg-paper-3/60 active:bg-paper-3 transition-colors group flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div>
              <div className="flex items-center justify-between mb-3 text-ink">
                <Calculator className="w-4 h-4 text-ink" aria-hidden="true" />
                <span className="text-[10px] font-outlier text-muted">04 / Tariff</span>
              </div>
              <h3 className="font-display font-semibold text-sm text-ink mb-1 group-hover:text-accent transition-colors">
                Telescopic tariff engine
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Distance rate slabs, Tatkal charges, superfast fees, and GST breakdown.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-rule/50 flex items-center justify-between text-xs text-muted group-hover:text-ink">
              <span className="font-medium">Calculate tariff</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink motion-safe:group-hover:translate-x-0.5 motion-safe:transition-transform" aria-hidden="true" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
