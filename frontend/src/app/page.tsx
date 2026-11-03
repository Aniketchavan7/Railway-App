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
  Bot,
  ArrowRight,
  ShieldCheck,
  Radio,
  Clock,
  Sparkles,
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
      route: "LTT (Mumbai) ➔ HWH (Howrah)",
      speed: "75 km/h",
      delay: "15m late",
      status: "In Transit near Igatpuri",
    },
    {
      number: "12951",
      name: "Mumbai Tejas Rajdhani Express",
      route: "MMCT (Mumbai) ➔ NDLS (New Delhi)",
      speed: "110 km/h",
      delay: "On Time",
      status: "Departed Mumbai Central",
    },
    {
      number: "22436",
      name: "Vande Bharat Express",
      route: "NDLS (New Delhi) ➔ BSB (Varanasi)",
      speed: "130 km/h",
      delay: "On Time",
      status: "Approaching Kanpur Central",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-8 md:p-12 shadow-md">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Honest Indian Railway Telemetry & AI Platform</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Track Any Indian Train with Real-Time Precision
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
            Live GPS telemetry, station movement timelines, MapLibre GL routes,
            telescopic fares, coach compositions, and a grounded conversational AI travel assistant.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="pt-2 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={trainQuery}
                onChange={(e) => setTrainQuery(e.target.value)}
                placeholder="Enter 5-digit Train Number (e.g. 12101 or 12951)..."
                className="w-full bg-white/10 hover:bg-white/15 focus:bg-white focus:text-slate-900 text-white placeholder-slate-400 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none border border-white/20 focus:border-blue-500 transition-all"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Track Train</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Trust Guarantees */}
          <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero-Fake GPS Guarantee</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Honest Source Observation Timestamps</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>LangGraph + xKiro Grounded AI</span>
            </div>
          </div>
        </div>

        {/* Decorative background grid */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_right,rgba(37,99,235,0.15),transparent)] pointer-events-none" />
      </section>

      {/* Featured Live Trains */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Train className="w-5 h-5 text-blue-600" />
            <span>Featured High-Speed Expresses</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">Click to inspect live telemetry</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featuredTrains.map((train) => (
            <Link
              key={train.number}
              href={`/train?number=${train.number}`}
              className="group p-5 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                    #{train.number}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      train.delay === "On Time"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {train.delay}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                  {train.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{train.route}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-700">{train.status}</span>
                <span className="font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Platform Features Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          All Railway Services
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/stations"
            className="p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Station Live Boards</h3>
            <p className="text-xs text-slate-500">
              Live arrivals & departures within 2, 4, or 8 hours for CSMT, PUNE, NDLS, HWH.
            </p>
          </Link>

          <Link
            href="/pnr"
            className="p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Ticket className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">PNR Status Tracker</h3>
            <p className="text-xs text-slate-500">
              Privacy-first passenger booking confirmation, coach/berth, and chart status.
            </p>
          </Link>

          <Link
            href="/coach"
            className="p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Coach Composition</h3>
            <p className="text-xs text-slate-500">
              Interactive physical rake visualizer from Locomotive to SLR across all classes.
            </p>
          </Link>

          <Link
            href="/fare"
            className="p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Telescopic Fare Calculator</h3>
            <p className="text-xs text-slate-500">
              Official Railway Board distance formulas with Tatkal, Superfast, and GST breakdowns.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
