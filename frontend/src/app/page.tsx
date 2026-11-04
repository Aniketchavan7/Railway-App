"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import {
  Train,
  Search,
  Building2,
  Ticket,
  Calculator,
  ArrowRight,
  Gauge,
  Radio,
} from "lucide-react";

interface FleetTrain {
  number: string;
  name: string;
  type: string;
  zone: "CR" | "NR" | "WR" | "ER";
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
      type: "Vande Bharat",
      zone: "CR",
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
      type: "Rajdhani",
      zone: "WR",
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
      type: "Superfast",
      zone: "CR",
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
      type: "Vande Bharat",
      zone: "NR",
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
      type: "Vande Bharat",
      zone: "CR",
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
    { code: "CSMT", label: "CSMT" },
    { code: "PUNE", label: "PUNE" },
    { code: "NDLS", label: "NDLS" },
    { code: "HWH", label: "HWH" },
    { code: "SUR", label: "SUR" },
  ];

  return (
    <div className="space-y-12 sm:space-y-16 py-2">
      {/* Open Hero Section - No enclosing card boxes, pure typography and spatial hierarchy */}
      <section className="space-y-6 max-w-4xl">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight text-ink leading-[1.05]">
            Track any train across India.
          </h1>
          <p className="text-sm sm:text-base text-muted max-w-xl">
            Live GPS telemetry, platform arrival boards, and distance tariffs.
          </p>
        </div>

        {/* Clean Single-Tier Search Console */}
        <div className="space-y-3 pt-1">
          {/* Mode Switcher */}
          <div className="inline-flex items-center gap-1 p-1 rounded-pill bg-paper-2 border border-rule text-xs">
            <button
              type="button"
              onClick={() => setSearchMode("train")}
              className={`px-3 py-1.5 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent ${
                searchMode === "train"
                  ? "bg-accent text-accent-ink font-semibold"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Train className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Train</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchMode("station")}
              className={`px-3 py-1.5 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent ${
                searchMode === "station"
                  ? "bg-accent text-accent-ink font-semibold"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Station</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchMode("pnr")}
              className={`px-3 py-1.5 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent ${
                searchMode === "pnr"
                  ? "bg-accent text-accent-ink font-semibold"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
              <span>PNR</span>
            </button>
          </div>

          {/* Unified Omnibar Search Shell */}
          {searchMode === "train" && (
            <form
              onSubmit={handleSearch}
              className="relative flex items-center w-full max-w-2xl bg-paper-2 border border-rule hover:border-rule-2 focus-within:border-accent focus-within:bg-paper focus-within:ring-1 focus-within:ring-accent rounded-pill p-1.5 pl-4 sm:pl-5 transition-colors"
            >
              <Search
                className="w-4 h-4 text-muted shrink-0 mr-3 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={trainQuery}
                onChange={(e) => setTrainQuery(e.target.value)}
                placeholder="Enter train number or name (e.g. 22225, 12951) …"
                className="bg-transparent text-sm text-ink placeholder:text-muted outline-none flex-1 min-w-0 font-outlier font-semibold disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!trainQuery.trim()}
                className="bg-accent hover:opacity-90 active:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span>Track</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </form>
          )}

          {searchMode === "station" && (
            <form
              onSubmit={handleSearch}
              className="relative flex items-center w-full max-w-2xl bg-paper-2 border border-rule hover:border-rule-2 focus-within:border-accent focus-within:bg-paper focus-within:ring-1 focus-within:ring-accent rounded-pill p-1.5 pl-4 sm:pl-5 transition-colors"
            >
              <Building2
                className="w-4 h-4 text-muted shrink-0 mr-3 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={stationQuery}
                onChange={(e) => setStationQuery(e.target.value.toUpperCase())}
                placeholder="Station code (e.g. CSMT, PUNE, NDLS, HWH) …"
                className="bg-transparent text-sm text-ink placeholder:text-muted outline-none flex-1 min-w-0 font-outlier font-semibold disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!stationQuery.trim()}
                className="bg-accent hover:opacity-90 active:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span>View</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </form>
          )}

          {searchMode === "pnr" && (
            <form
              onSubmit={handleSearch}
              className="relative flex items-center w-full max-w-2xl bg-paper-2 border border-rule hover:border-rule-2 focus-within:border-accent focus-within:bg-paper focus-within:ring-1 focus-within:ring-accent rounded-pill p-1.5 pl-4 sm:pl-5 transition-colors"
            >
              <Ticket
                className="w-4 h-4 text-muted shrink-0 mr-3 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                maxLength={10}
                value={pnrQuery}
                onChange={(e) => setPnrQuery(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 10-digit PNR number …"
                className="bg-transparent text-sm text-ink placeholder:text-muted outline-none flex-1 min-w-0 font-outlier font-semibold disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={pnrQuery.trim().length !== 10}
                className="bg-accent hover:opacity-90 active:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span>Check</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </form>
          )}

          {/* Quick Shortcuts */}
          {searchMode === "train" && (
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="text-muted text-[11px] font-medium font-outlier">Quick:</span>
              {popularTrains.map((item) => (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => {
                    setTrainQuery(item.num);
                    router.push(`/train?number=${item.num}`);
                  }}
                  className="px-2.5 py-1 rounded-pill bg-paper-2 hover:bg-paper-3 text-muted hover:text-ink border border-rule transition-colors font-outlier text-[11px] cursor-pointer focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {searchMode === "station" && (
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="text-muted text-[11px] font-medium font-outlier">Quick:</span>
              {popularStations.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setStationQuery(item.code);
                    router.push(`/stations?code=${item.code}`);
                  }}
                  className="px-2.5 py-1 rounded-pill bg-paper-2 hover:bg-paper-3 text-muted hover:text-ink border border-rule transition-colors font-outlier text-[11px] cursor-pointer focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {searchMode === "pnr" && (
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="text-muted text-[11px] font-medium font-outlier">Quick:</span>
              <button
                type="button"
                onClick={() => {
                  setPnrQuery("1234567890");
                  router.push(`/pnr?pnr=1234567890`);
                }}
                className="px-2.5 py-1 rounded-pill bg-paper-2 hover:bg-paper-3 text-muted hover:text-ink border border-rule transition-colors font-outlier text-[11px] cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
              >
                Demo #1234567890
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Featured Train Spotlight Strip - Open Transit Corridor */}
      <section className="border-y border-rule py-4">
        <Link
          href="/train?number=22225"
          className="group flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs focus-visible:outline-2 focus-visible:outline-accent"
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-ok shrink-0" aria-hidden="true" />
            <span className="font-outlier font-bold text-ink">#22225</span>
            <span className="font-semibold text-ink group-hover:text-accent transition-colors">
              Solapur Vande Bharat Express
            </span>
            <span className="text-muted hidden sm:inline">
              CSMT &rarr; SUR
            </span>
          </div>

          <div className="flex items-center gap-4 text-muted font-outlier">
            <span className="text-ok font-semibold">On time</span>
            <span>118 km/h</span>
            <span className="text-accent group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-sans font-medium">
              <span>Track live</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      </section>

      {/* Open Transit Departure Board - Not trapped in a box */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-rule">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink tracking-tight">
            Live express trains
          </h2>

          {/* Clean Segmented Filters */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-muted">
              <button
                type="button"
                onClick={() => setSelectedZone("ALL")}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  selectedZone === "ALL" ? "text-ink font-semibold" : "hover:text-ink"
                }`}
              >
                All
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => setSelectedZone("CR")}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  selectedZone === "CR" ? "text-ink font-semibold" : "hover:text-ink"
                }`}
              >
                CR
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => setSelectedZone("NR")}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  selectedZone === "NR" ? "text-ink font-semibold" : "hover:text-ink"
                }`}
              >
                NR
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => setSelectedZone("WR")}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  selectedZone === "WR" ? "text-ink font-semibold" : "hover:text-ink"
                }`}
              >
                WR
              </button>
            </div>

            <span className="text-rule-2">|</span>

            <div className="flex items-center gap-1 text-muted">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  statusFilter === "ALL" ? "text-ink font-semibold" : "hover:text-ink"
                }`}
              >
                All
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => setStatusFilter("ON_TIME")}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  statusFilter === "ON_TIME" ? "text-ok font-semibold" : "hover:text-ink"
                }`}
              >
                On time
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => setStatusFilter("DELAYED")}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  statusFilter === "DELAYED" ? "text-accent font-semibold" : "hover:text-ink"
                }`}
              >
                Delayed
              </button>
            </div>
          </div>
        </div>

        {/* Departure Table Rows - Open, Elegant Hairlines */}
        <div className="divide-y divide-rule">
          {filteredFleet.length > 0 ? (
            filteredFleet.map((train) => (
              <Link
                key={train.number}
                href={`/train?number=${train.number}`}
                className="group py-3.5 flex flex-col md:grid md:grid-cols-12 md:items-center gap-2 hover:bg-paper-2/40 transition-colors focus-visible:outline-2 focus-visible:outline-accent"
              >
                {/* Col 1: Train & Number */}
                <div className="md:col-span-5 flex items-center gap-3">
                  <span className="font-outlier font-bold text-xs text-ink shrink-0 tracking-wide">
                    #{train.number}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display font-medium text-ink text-sm transition-colors group-hover:text-accent truncate">
                      {train.name}
                    </h3>
                  </div>
                </div>

                {/* Col 2: Route */}
                <div className="md:col-span-3 flex items-center gap-2 text-xs text-muted">
                  <span className="font-semibold text-ink">{train.origin}</span>
                  <span>&rarr;</span>
                  <span className="font-semibold text-ink">{train.dest}</span>
                </div>

                {/* Col 3: Status & Speed */}
                <div className="md:col-span-3 flex items-center gap-3 text-xs">
                  <span
                    className={`font-outlier font-medium ${
                      train.delay === "On time" ? "text-ok" : "text-accent"
                    }`}
                  >
                    {train.delay}
                  </span>
                  <span className="text-muted font-outlier">
                    {train.speed}
                  </span>
                </div>

                {/* Col 4: Action */}
                <div className="md:col-span-1 text-right">
                  <span className="text-accent text-xs group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5 font-medium">
                    <span>Track</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-muted">No trains match filter</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedZone("ALL");
                  setStatusFilter("ALL");
                }}
                className="text-xs text-accent hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Transit Services - Open Airy Columns, No Box-in-Box */}
      <section className="border-t border-rule pt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <Link
            href="/stations"
            className="group space-y-1.5 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="flex items-center gap-2 text-cool">
              <Building2 className="w-4 h-4 text-cool" aria-hidden="true" />
              <h3 className="font-display font-semibold text-sm text-ink group-hover:text-cool transition-colors">
                Stations
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Live arrival and departure boards across terminals.
            </p>
          </Link>

          <Link
            href="/pnr"
            className="group space-y-1.5 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="flex items-center gap-2 text-ok">
              <Ticket className="w-4 h-4 text-ok" aria-hidden="true" />
              <h3 className="font-display font-semibold text-sm text-ink group-hover:text-ok transition-colors">
                PNR status
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Ticket booking verification and coach berth position.
            </p>
          </Link>

          <Link
            href="/coach"
            className="group space-y-1.5 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="flex items-center gap-2 text-accent">
              <LayoutGrid className="w-4 h-4 text-accent" aria-hidden="true" />
              <h3 className="font-display font-semibold text-sm text-ink group-hover:text-accent transition-colors">
                Coach guide
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Rake composition and platform pole alignment.
            </p>
          </Link>

          <Link
            href="/fare"
            className="group space-y-1.5 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="flex items-center gap-2 text-ink">
              <Calculator className="w-4 h-4 text-ink" aria-hidden="true" />
              <h3 className="font-display font-semibold text-sm text-ink group-hover:text-accent transition-colors">
                Fare engine
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Distance tariffs, Tatkal charges, and GST breakdown.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
