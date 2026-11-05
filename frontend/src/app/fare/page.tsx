"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { FareEnquiryResult } from "@/lib/types";
import {
  Calculator,
  ArrowRight,
  ArrowLeftRight,
  ShieldCheck,
  Loader2,
  Train,
  LayoutGrid,
  Receipt,
} from "lucide-react";

const STATION_NAMES: Record<string, string> = {
  CSMT: "Mumbai CSMT",
  LTT: "Mumbai LTT",
  DR: "Dadar",
  TNA: "Thane",
  KYN: "Kalyan Jn",
  IGP: "Igatpuri",
  NK: "Nashik Road",
  MMR: "Manmad Jn",
  BSL: "Bhusawal Jn",
  AK: "Akola Jn",
  BD: "Badnera Jn",
  NGP: "Nagpur Jn",
  G: "Gondia Jn",
  DURG: "Durg Jn",
  R: "Raipur Jn",
  BSP: "Bilaspur Jn",
  ROU: "Rourkela",
  CKP: "Chakradharpur",
  TATA: "Tatanagar",
  KGP: "Kharagpur",
  HWH: "Howrah Jn",
  PUNE: "Pune Jn",
  SUR: "Solapur Jn",
  WD: "Wadi Jn",
  RC: "Raichur",
  GTL: "Guntakal Jn",
  NDLS: "New Delhi",
  BVI: "Borivali",
  ST: "Surat",
  BRC: "Vadodara Jn",
  RTM: "Ratlam Jn",
  KOTA: "Kota Jn",
  CNB: "Kanpur Central",
  PRYJ: "Prayagraj Jn",
  BSB: "Varanasi Jn",
  MMCT: "Mumbai Central",
};

function getStationName(code: string): string {
  const c = code.toUpperCase().trim();
  return STATION_NAMES[c] || c;
}

function getClassMeta(code: string) {
  switch (code) {
    case "1A":
    case "EC":
      return {
        badge: "First class",
        pillClass: "bg-accent-soft text-accent border border-accent/40",
        description: "Air-conditioned luxury coupe or 2-berth cabin",
      };
    case "2A":
      return {
        badge: "Tier two AC",
        pillClass: "bg-cool-soft text-cool border border-cool/40",
        description: "Air-conditioned 2-tier berths with privacy curtains",
      };
    case "3A":
      return {
        badge: "Tier three AC",
        pillClass: "bg-paper-3 text-ink border border-rule",
        description: "Air-conditioned 3-tier sleeper berths with linen",
      };
    case "3E":
      return {
        badge: "3 AC economy",
        pillClass: "bg-paper-3 text-ink border border-rule",
        description: "High-capacity air-conditioned modular sleeper",
      };
    case "CC":
      return {
        badge: "Chair car AC",
        pillClass: "bg-cool-soft text-cool border border-cool/40",
        description: "Air-conditioned ergonomic seating",
      };
    case "SL":
      return {
        badge: "Sleeper class",
        pillClass: "bg-ok-soft text-ok border border-ok/40",
        description: "Non-AC 3-tier berths (GST exempt)",
      };
    case "2S":
      return {
        badge: "Second seating",
        pillClass: "bg-paper-3 text-muted border border-rule",
        description: "Standard non-AC seating",
      };
    default:
      return {
        badge: "Standard class",
        pillClass: "bg-paper-3 text-muted border border-rule",
        description: "Indian Railways standard distance tariff",
      };
  }
}

function FareContent() {
  const searchParams = useSearchParams();
  const [trainNumber, setTrainNumber] = useState(
    searchParams.get("train") || searchParams.get("number") || "22225"
  );
  const [origin, setOrigin] = useState(searchParams.get("origin") || "CSMT");
  const [dest, setDest] = useState(searchParams.get("dest") || "SUR");
  const [quota, setQuota] = useState(searchParams.get("quota") || "GN");
  const [fareData, setFareData] = useState<FareEnquiryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "ledger">("cards");

  const fetchFares = async (tNum: string, org: string, dst: string, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFareEnquiry(tNum, org, dst, q);
      setFareData(data);
    } catch (err: any) {
      setError(err.message || "Failed to calculate fare");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFares(trainNumber, origin, dest, quota);
  }, []);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (trainNumber.trim() && origin.trim() && dest.trim()) {
      fetchFares(trainNumber.trim(), origin.trim().toUpperCase(), dest.trim().toUpperCase(), quota);
    }
  };

  const handleSwapStations = () => {
    const nextOrigin = dest;
    const nextDest = origin;
    setOrigin(nextOrigin);
    setDest(nextDest);
    fetchFares(trainNumber, nextOrigin, nextDest, quota);
  };

  const handleQuickRoute = (tNum: string, o: string, d: string) => {
    setTrainNumber(tNum);
    setOrigin(o);
    setDest(d);
    fetchFares(tNum, o, d, quota);
  };

  const handleQuotaChange = (q: string) => {
    setQuota(q);
    fetchFares(trainNumber, origin, dest, q);
  };

  const quotas = [
    { code: "GN", label: "General" },
    { code: "TQ", label: "Tatkal" },
    { code: "PT", label: "Premium Tatkal" },
    { code: "SS", label: "Senior Citizen" },
    { code: "LD", label: "Ladies" },
  ];

  return (
    <div className="space-y-10 py-2">
      {/* Open Page Header */}
      <section className="space-y-4 max-w-4xl">
        <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-ink leading-tight">
          Fare tariff calculator
        </h1>
        <p className="text-xs sm:text-sm text-muted max-w-2xl">
          Estimated fares from distance tariffs, with a class-by-class breakdown.
        </p>

        {/* Clean Route Input Form */}
        <form onSubmit={handleCalculate} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Train Number */}
            <div className="md:col-span-3">
              <label className="text-[11px] text-muted block mb-1.5 font-medium font-outlier">
                Train number
              </label>
              <div className="relative">
                <Train className="w-3.5 h-3.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  type="text"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  placeholder="e.g. 22225"
                  className="w-full bg-paper-2 focus:bg-paper text-xs font-outlier font-bold pl-9 pr-3 py-2.5 rounded-pill border border-rule outline-none text-ink focus:border-accent transition-colors disabled:opacity-40"
                />
              </div>
            </div>

            {/* Origin Station */}
            <div className="md:col-span-4">
              <label className="text-[11px] text-muted block mb-1.5 font-medium font-outlier">
                Origin station
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                  placeholder="Code (e.g. CSMT)"
                  className="w-full bg-paper-2 focus:bg-paper text-xs font-outlier font-bold px-3.5 py-2.5 rounded-pill border border-rule outline-none text-ink focus:border-accent transition-colors disabled:opacity-40"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-muted pointer-events-none hidden sm:inline">
                  {getStationName(origin)}
                </span>
              </div>
            </div>

            {/* Station Swap */}
            <div className="md:col-span-1 flex items-center justify-center pb-0.5">
              <button
                type="button"
                onClick={handleSwapStations}
                className="p-2.5 rounded-pill bg-paper-2 hover:bg-paper-3 text-muted hover:text-ink border border-rule transition-colors cursor-pointer active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent"
                title="Swap origin and destination"
                aria-label="Swap origin and destination stations"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Destination Station */}
            <div className="md:col-span-4">
              <label className="text-[11px] text-muted block mb-1.5 font-medium font-outlier">
                Destination station
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={dest}
                  onChange={(e) => setDest(e.target.value.toUpperCase())}
                  placeholder="Code (e.g. SUR)"
                  className="w-full bg-paper-2 focus:bg-paper text-xs font-outlier font-bold px-3.5 py-2.5 rounded-pill border border-rule outline-none text-ink focus:border-accent transition-colors disabled:opacity-40"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-muted pointer-events-none hidden sm:inline">
                  {getStationName(dest)}
                </span>
              </div>
            </div>
          </div>

          {/* Quota Row & Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted font-medium font-outlier mr-1">
                Quota:
              </span>
              {quotas.map((q) => (
                <button
                  key={q.code}
                  type="button"
                  onClick={() => handleQuotaChange(q.code)}
                  className={`px-3 py-1 rounded-pill text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent font-outlier ${
                    quota === q.code
                      ? "bg-accent text-accent-ink font-semibold"
                      : "bg-paper-2 text-muted hover:text-ink hover:bg-paper-3 border border-rule"
                  }`}
                >
                  {q.label} ({q.code})
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs py-2.5 px-6 rounded-pill transition-opacity flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent self-start sm:self-auto shrink-0"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <>
                  <span>Calculate fares</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Route Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          <span className="text-muted text-[11px] font-medium font-outlier">
            Corridors:
          </span>
          {[
            { num: "22225", o: "CSMT", d: "SUR", label: "22225 CSMT to SUR" },
            { num: "12951", o: "MMCT", d: "NDLS", label: "12951 MMCT to NDLS" },
            { num: "12101", o: "LTT", d: "HWH", label: "12101 LTT to HWH" },
            { num: "12158", o: "SUR", d: "PUNE", label: "12158 SUR to PUNE" },
          ].map((item) => (
            <button
              key={item.num}
              type="button"
              disabled={loading}
              onClick={() => handleQuickRoute(item.num, item.o, item.d)}
              className="px-2.5 py-1 rounded-pill border border-rule bg-paper-2 hover:bg-paper-3 active:opacity-80 disabled:opacity-40 text-xs font-outlier text-muted hover:text-ink transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center p-12 space-y-2">
          <Loader2 className="w-6 h-6 motion-safe:animate-spin motion-reduce:animate-none text-accent" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-card border border-bad text-xs text-bad">
          {error}
        </div>
      ) : fareData ? (
        <section className="space-y-6">
          {/* Corridor Bar - Hairline separator style, not boxed */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-rule">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-outlier font-bold text-xs text-ink px-2 py-0.5 rounded-pill bg-paper-2 border border-rule">
                  #{fareData.train_number}
                </span>
                <h2 className="text-lg sm:text-xl font-display font-bold text-ink">
                  {fareData.train_name}
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted font-outlier mt-1">
                <span>
                  {fareData.origin_station} ({getStationName(fareData.origin_station)}) to {fareData.destination_station} ({getStationName(fareData.destination_station)})
                </span>
                <span className="text-rule-2">/</span>
                <span>{fareData.distance_km} km</span>
                <span className="text-rule-2">/</span>
                <span>Quota {fareData.quota}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <Link
                href={`/train?number=${fareData.train_number}`}
                className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Train className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Track live</span>
              </Link>

              {/* View Switcher */}
              <div className="inline-flex items-center gap-1 p-0.5 rounded-pill bg-paper-2 border border-rule text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent ${
                    viewMode === "cards"
                      ? "bg-accent text-accent-ink font-semibold"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" aria-hidden="true" />
                  <span>Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("ledger")}
                  className={`px-3 py-1 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent ${
                    viewMode === "ledger"
                      ? "bg-accent text-accent-ink font-semibold"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <Receipt className="w-3 h-3" aria-hidden="true" />
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW A: Cards Grid */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fareData.classes.map((c) => {
                const meta = getClassMeta(c.class_code);
                return (
                  <div
                    key={c.class_code}
                    className="p-5 rounded-card border border-rule bg-paper-2 hover:border-rule-2 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      {/* Class Badge Row */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-outlier font-bold text-xs text-ink px-2 py-0.5 rounded-pill bg-paper border border-rule">
                            {c.class_code}
                          </span>
                          <span className={`text-[11px] font-outlier px-2 py-0.5 rounded-pill ${meta.pillClass}`}>
                            {meta.badge}
                          </span>
                        </div>
                        {c.tatkal_surcharge > 0 && (
                          <span className="text-[10px] font-outlier text-accent px-1.5 py-0.5 rounded-pill bg-accent-soft border border-accent/30">
                            Tatkal
                          </span>
                        )}
                      </div>

                      <h3 className="font-display font-semibold text-ink text-sm">
                        {c.class_name}
                      </h3>
                      <p className="text-[11px] text-muted mt-0.5 line-clamp-1">
                        {meta.description}
                      </p>

                      {/* Price */}
                      <div className="mt-4 pt-3 border-t border-rule/50 flex items-baseline justify-between">
                        <span className="text-[11px] text-muted font-outlier">Total payable</span>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xs text-muted font-outlier">₹</span>
                          <span className="text-2xl sm:text-3xl font-outlier font-bold text-ink tracking-tight">
                            {c.total_fare}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Itemized Line Items */}
                    <div className="mt-4 pt-3 border-t border-rule/50 space-y-1.5 text-[11px] font-outlier text-muted">
                      <div className="flex items-center justify-between">
                        <span>Base telescopic tariff</span>
                        <span className="text-ink font-medium">₹{c.base_fare}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Reservation & superfast</span>
                        <span className="text-ink font-medium">
                          ₹{c.reservation_charge + c.superfast_charge}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>GST</span>
                        <span className={c.gst > 0 ? "text-ink font-medium" : "text-muted"}>
                          {c.gst > 0 ? `₹${c.gst}` : "Exempt"}
                        </span>
                      </div>
                      {c.tatkal_surcharge > 0 && (
                        <div className="flex items-center justify-between text-accent">
                          <span>Tatkal fee</span>
                          <span className="font-medium">+₹{c.tatkal_surcharge}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW B: Ledger Table */}
          {viewMode === "ledger" && (
            <div className="overflow-x-auto border border-rule rounded-card">
              <table className="w-full text-xs text-left min-w-[620px]">
                <thead className="bg-paper-2 text-muted text-[11px] border-b border-rule font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Class</th>
                    <th className="py-2.5 px-4 text-right">Base tariff</th>
                    <th className="py-2.5 px-4 text-right">Reservation</th>
                    <th className="py-2.5 px-4 text-right">Superfast</th>
                    <th className="py-2.5 px-4 text-right">Tatkal extra</th>
                    <th className="py-2.5 px-4 text-right">GST (5%)</th>
                    <th className="py-2.5 px-4 text-right font-bold text-ink">Total payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule bg-paper">
                  {fareData.classes.map((c) => (
                    <tr key={c.class_code} className="hover:bg-paper-2 transition-colors">
                      <td className="py-3 px-4 font-semibold text-ink">
                        <div className="flex items-center gap-2">
                          <span className="font-outlier font-bold text-xs text-ink px-2 py-0.5 rounded-pill bg-paper-2 border border-rule">
                            {c.class_code}
                          </span>
                          <span>{c.class_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-outlier text-muted text-right">₹{c.base_fare}</td>
                      <td className="py-3 px-4 font-outlier text-muted text-right">₹{c.reservation_charge}</td>
                      <td className="py-3 px-4 font-outlier text-muted text-right">₹{c.superfast_charge}</td>
                      <td className="py-3 px-4 font-outlier text-accent text-right">
                        {c.tatkal_surcharge > 0 ? `₹${c.tatkal_surcharge}` : "-"}
                      </td>
                      <td className="py-3 px-4 font-outlier text-muted text-right">
                        {c.gst > 0 ? `₹${c.gst}` : "Exempt"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-outlier font-bold text-ink">
                          ₹{c.total_fare}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tariff Notes */}
          <div className="pt-4 border-t border-rule text-[11px] text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-outlier">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-ok shrink-0" aria-hidden="true" />
              <span>
                Estimated from distance tariffs, tapering beyond 500 km. GST applies to AC classes. Check the actual fare when booking.
              </span>
            </div>
            <span>
              Dynamic pricing may apply on select special trains.
            </span>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function FarePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 motion-safe:animate-spin motion-reduce:animate-none text-accent" aria-hidden="true" />
        </div>
      }
    >
      <FareContent />
    </Suspense>
  );
}
