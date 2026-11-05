"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Ticket, Calculator, ArrowRight } from "lucide-react";
import { ActionSearchBar } from "@/components/ui/action-search-bar";
import { BentoMetrics } from "@/components/ui/bento-metrics";
import { RouteFinder } from "@/components/ui/route-finder";
import { api } from "@/lib/api";
import { RailwayStatus } from "@/lib/types";
import { delayLabel, stationOnly } from "@/lib/format";

interface FleetTrain {
  number: string;
  name: string;
  type: string;
  zone: "CR" | "NR" | "WR";
  origin: string;
  dest: string;
}

// Identity only. Everything about what a train is doing comes from the API.
const FLEET_TRAINS: FleetTrain[] = [
  { number: "12124", name: "Deccan Queen Superfast Express", type: "Superfast", zone: "CR", origin: "PUNE", dest: "CSMT" },
  { number: "22226", name: "Mumbai CSMT Vande Bharat Express", type: "Vande Bharat", zone: "CR", origin: "SUR", dest: "CSMT" },
  { number: "12115", name: "Siddheshwar Superfast Express", type: "Superfast", zone: "CR", origin: "CSMT", dest: "SUR" },
  { number: "12951", name: "Mumbai Tejas Rajdhani Express", type: "Rajdhani", zone: "WR", origin: "MMCT", dest: "NDLS" },
  { number: "12009", name: "Mumbai Ahmedabad Shatabdi Express", type: "Shatabdi", zone: "WR", origin: "MMCT", dest: "ADI" },
  { number: "22436", name: "Vande Bharat Express", type: "Vande Bharat", zone: "NR", origin: "NDLS", dest: "BSB" },
];

const FLEET_REFRESH_MS = 60_000;

function stateText(status?: RailwayStatus | null): { text: string; tone: string } {
  if (!status) return { text: "Checking…", tone: "text-muted" };
  switch (status.service_state) {
    case "RUNNING":
      return { text: `Running · ${delayLabel(status.delay_minutes)}`, tone: status.delay_minutes > 0 ? "text-accent" : "text-ok" };
    case "COMPLETED":
      return { text: "Reached", tone: "text-ok" };
    case "NOT_STARTED":
      return { text: "Not started", tone: "text-muted" };
    case "NOT_RUNNING_TODAY":
      return { text: "Not running today", tone: "text-bad" };
    case "CANCELLED":
      return { text: "Cancelled", tone: "text-bad" };
    default:
      return { text: "No live data", tone: "text-muted" };
  }
}

export default function HomePage() {
  const [selectedZone, setSelectedZone] = useState<"ALL" | "CR" | "NR" | "WR">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RUNNING" | "DELAYED">("ALL");
  const [statuses, setStatuses] = useState<Record<string, RailwayStatus | null>>({});

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      FLEET_TRAINS.forEach((train) => {
        api
          .getTrainStatus(train.number)
          .then((status) => {
            if (!cancelled) setStatuses((prev) => ({ ...prev, [train.number]: status }));
          })
          .catch(() => {
            if (!cancelled) setStatuses((prev) => ({ ...prev, [train.number]: prev[train.number] ?? null }));
          });
      });
    };
    load();
    const timer = setInterval(load, FLEET_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const filteredFleet = useMemo(() => {
    return FLEET_TRAINS.filter((train) => {
      if (selectedZone !== "ALL" && train.zone !== selectedZone) return false;
      const status = statuses[train.number];
      if (statusFilter === "RUNNING" && status?.service_state !== "RUNNING") return false;
      if (statusFilter === "DELAYED" && !(status?.service_state === "RUNNING" && status.delay_minutes > 0)) return false;
      return true;
    });
  }, [selectedZone, statusFilter, statuses]);

  const spotlight = FLEET_TRAINS.map((t) => statuses[t.number]).find((s) => s?.service_state === "RUNNING");

  return (
    <div className="space-y-12 sm:space-y-16 py-2">
      {/* 21st.dev Style Hero Section */}
      <section className="space-y-6 max-w-4xl mx-auto text-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-pill bg-paper-2 border border-rule text-xs text-muted font-outlier">
            <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
            <span>Indian Railways live tracker</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight text-ink leading-[1.05]">
            Track any train across India.
          </h1>
          <p className="text-sm sm:text-base text-muted max-w-xl mx-auto">
            See whether a train is running, has reached, or isn't running today, plus station boards and fares.
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
            What RailPulse does
          </h2>
        </div>
        <BentoMetrics />
      </section>

      {/* A train that is actually running now */}
      {spotlight && (
        <section className="border-y border-rule py-4">
          <Link
            href={`/train?number=${spotlight.train_number}`}
            className="group flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-2 h-2 rounded-full bg-ok shrink-0" aria-hidden="true" />
              <span className="font-outlier font-bold text-ink">#{spotlight.train_number}</span>
              <span className="font-semibold text-ink group-hover:text-accent transition-colors truncate">
                {spotlight.train_name}
              </span>
            </div>
            <div className="flex items-center gap-4 text-muted font-outlier">
              <span className="text-ok font-semibold">
                Running{spotlight.current_station ? ` near ${stationOnly(spotlight.current_station)}` : ""}
              </span>
              <span className="text-accent group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-sans font-medium">
                <span>Track</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* Open Transit Departure Board */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-rule">
          <h2 className="text-lg sm:text-xl font-display font-bold text-ink tracking-tight">
            Popular trains right now
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
                onClick={() => setStatusFilter("RUNNING")}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  statusFilter === "RUNNING" ? "text-ok font-semibold" : "hover:text-ink"
                }`}
              >
                Running
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

                {/* Col 3: Live state */}
                <div className="md:col-span-3 flex items-center gap-3 text-xs">
                  <span className={`font-outlier font-medium ${stateText(statuses[train.number]).tone}`}>
                    {stateText(statuses[train.number]).text}
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
              Booking status and berth allocation.
            </p>
          </Link>

          <Link
            href="/fare"
            className="group space-y-1.5 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="flex items-center gap-2 text-accent">
              <Calculator className="w-4 h-4 text-accent" aria-hidden="true" />
              <h3 className="font-display font-semibold text-sm text-ink group-hover:text-accent transition-colors">
                Fare calculator
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Estimated fares with Tatkal charges and GST.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
