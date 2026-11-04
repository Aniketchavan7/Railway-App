"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import {
  Train,
  Building2,
  Ticket,
  Calculator,
  ArrowRight,
  Gauge,
  Radio,
  Sparkles,
} from "lucide-react";
import { ActionSearchBar } from "@/components/ui/action-search-bar";
import { BentoMetrics } from "@/components/ui/bento-metrics";
import { RouteFinder } from "@/components/ui/route-finder";

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
  const [selectedZone, setSelectedZone] = useState<"ALL" | "CR" | "NR" | "WR">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ON_TIME" | "DELAYED">("ALL");

  const fleetTrains: FleetTrain[] = [
    {
      number: "22226",
      name: "Mumbai CSMT Vande Bharat Express",
      type: "Vande Bharat",
      zone: "CR",
      origin: "SUR",
      dest: "CSMT",
      originCity: "Solapur",
      destCity: "Mumbai",
      speed: "118 km/h",
      delay: "On time",
      status: "Approaching Karjat Jn",
      nextHalt: "Karjat Jn",
      platform: "PF 2",
    },
    {
      number: "12124",
      name: "Deccan Queen Superfast Express",
      type: "Superfast",
      zone: "CR",
      origin: "PUNE",
      dest: "CSMT",
      originCity: "Pune",
      destCity: "Mumbai",
      speed: "105 km/h",
      delay: "On time",
      status: "In transit near Matunga",
      nextHalt: "Mumbai CSMT",
      platform: "PF 5",
    },
    {
      number: "12126",
      name: "Pragati Express",
      type: "Superfast",
      zone: "CR",
      origin: "PUNE",
      dest: "CSMT",
      originCity: "Pune",
      destCity: "Mumbai",
      speed: "98 km/h",
      delay: "On time",
      status: "In transit near Sion",
      nextHalt: "Dadar Central",
      platform: "PF 7",
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
      speed: "130 km/h",
      delay: "On time",
      status: "Scheduled departure 17:00 IST",
      nextHalt: "Borivali",
      platform: "PF 1",
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
      status: "In transit near Khaga",
      nextHalt: "Prayagraj Jn",
      platform: "PF 16",
    },
    {
      number: "12009",
      name: "Mumbai Ahmedabad Shatabdi Express",
      type: "Shatabdi",
      zone: "WR",
      origin: "MMCT",
      dest: "ADI",
      originCity: "Mumbai",
      destCity: "Ahmedabad",
      speed: "120 km/h",
      delay: "On time",
      status: "In transit near Adas Road",
      nextHalt: "Vadodara Jn",
      platform: "PF 1",
    },
    {
      number: "12115",
      name: "Siddheshwar Superfast Express",
      type: "Superfast",
      zone: "CR",
      origin: "CSMT",
      dest: "SUR",
      originCity: "Mumbai",
      destCity: "Solapur",
      speed: "110 km/h",
      delay: "On time",
      status: "Scheduled overnight departure 22:40 IST",
      nextHalt: "Dadar Central",
      platform: "PF 16",
    },
    {
      number: "22225",
      name: "Solapur Vande Bharat Express",
      type: "Vande Bharat",
      zone: "CR",
      origin: "CSMT",
      dest: "SUR",
      originCity: "Mumbai",
      destCity: "Solapur",
      speed: "0 km/h",
      delay: "On time",
      status: "Wadi Bunder Maintenance (No Wed Run)",
      nextHalt: "Depot",
      platform: "Depot",
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

  return (
    <div className="space-y-12 sm:space-y-16 py-2">
      {/* 21st.dev Style Hero Section */}
      <section className="space-y-6 max-w-4xl mx-auto text-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-pill bg-paper-2 border border-rule text-xs text-muted font-outlier">
            <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
            <span>High-Precision Indian Railway SaaS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight text-ink leading-[1.05]">
            Track any train across India.
          </h1>
          <p className="text-sm sm:text-base text-muted max-w-xl mx-auto">
            Live GPS telemetry, platform arrival concourse boards, and distance tariffs.
          </p>
        </div>

        {/* 21st.dev Interactive Action Search Bar */}
        <div className="pt-2">
          <ActionSearchBar />
        </div>
      </section>

      {/* Station-to-Station Route Finder Section */}
      <section className="space-y-4">
        <RouteFinder />
      </section>

      {/* 21st.dev Bento Grid Metrics */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-rule">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink tracking-tight">
            Network telemetry & intelligence
          </h2>
          <span className="text-xs font-outlier text-muted">Real-Time Core Engine</span>
        </div>
        <BentoMetrics />
      </section>

      {/* Featured Train Spotlight Strip */}
      <section className="border-y border-rule py-4">
        <Link
          href="/train?number=22226"
          className="group flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs focus-visible:outline-2 focus-visible:outline-accent"
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-ok shrink-0 animate-ping" aria-hidden="true" />
            <span className="font-outlier font-bold text-ink">#22226</span>
            <span className="font-semibold text-ink group-hover:text-accent transition-colors">
              Mumbai CSMT Vande Bharat Express
            </span>
            <span className="text-muted hidden sm:inline">
              Solapur SUR &rarr; Mumbai CSMT
            </span>
          </div>

          <div className="flex items-center gap-4 text-muted font-outlier">
            <span className="text-ok font-semibold">Live in transit • Near Karjat</span>
            <span>118 km/h</span>
            <span className="text-accent group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-sans font-medium">
              <span>Track live radar</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      </section>

      {/* Open Transit Departure Board */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-rule">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink tracking-tight">
            Live express fleet radar
          </h2>

          {/* Clean Segmented Filters */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-muted">
              {(["ALL", "CR", "NR", "WR"] as const).map((z, idx) => (
                <span key={z} className="flex items-center gap-1">
                  {idx > 0 && <span>/</span>}
                  <button
                    type="button"
                    onClick={() => setSelectedZone(z)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      selectedZone === z ? "text-ink font-semibold" : "hover:text-ink"
                    }`}
                  >
                    {z}
                  </button>
                </span>
              ))}
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

        {/* Departure Table Rows */}
        <div className="divide-y divide-rule border-b border-rule pb-2">
          {filteredFleet.length > 0 ? (
            filteredFleet.map((train) => (
              <Link
                key={train.number}
                href={`/train?number=${train.number}`}
                className="group py-3.5 flex flex-col md:grid md:grid-cols-12 md:items-center gap-2 hover:bg-paper-2/50 transition-colors focus-visible:outline-2 focus-visible:outline-accent rounded-xl px-2"
              >
                {/* Col 1: Train & Number */}
                <div className="md:col-span-5 flex items-center gap-3">
                  <span className="font-outlier font-bold text-xs text-ink shrink-0 tracking-wide px-2 py-0.5 rounded bg-paper-2 border border-rule">
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
                  <span className="font-semibold text-ink font-outlier">{train.origin}</span>
                  <span>&rarr;</span>
                  <span className="font-semibold text-ink font-outlier">{train.dest}</span>
                  <span className="text-[11px] text-muted">({train.type})</span>
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

      {/* Transit Services Links */}
      <section className="border-t border-rule pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
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
              Live arrival and departure boards across Indian Railways terminals.
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
              Ticket booking verification and passenger berth allocation.
            </p>
          </Link>

          <Link
            href="/fare"
            className="group space-y-1.5 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="flex items-center gap-2 text-accent">
              <Calculator className="w-4 h-4 text-accent" aria-hidden="true" />
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
