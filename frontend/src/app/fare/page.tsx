"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { FareEnquiryResult, FareClassBreakdown } from "@/lib/types";
import {
  Calculator,
  ArrowRight,
  ArrowLeftRight,
  ShieldCheck,
  Loader2,
  Train,
  LayoutGrid,
  Receipt,
  Info,
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
    <div className="space-y-6">
      {/* Route & Tariff Console Form */}
      <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-rule/60 pb-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
              <Calculator className="w-5 h-5 text-accent" />
              <span>Fare tariff calculator</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Official Railway Board distance tariff schedule including telescopic tapering, reservation, superfast surcharges, and GST.
            </p>
          </div>
          <span className="text-[11px] font-outlier text-muted self-start sm:self-auto">
            Tariff v2024
          </span>
        </div>

        <form onSubmit={handleCalculate} className="space-y-4 pt-1">
          {/* Form Row 1: Train & Route Corridor */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Train Number */}
            <div className="md:col-span-3">
              <label className="text-[11px] text-muted block mb-1 font-medium font-outlier">
                Train number
              </label>
              <div className="relative">
                <Train className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  placeholder="e.g. 22225, 12101"
                  className="w-full bg-paper text-xs font-outlier font-bold pl-8 pr-3 py-2.5 rounded-pill border border-rule outline-none text-ink focus:bg-paper-3 focus:border-accent transition-colors disabled:opacity-40"
                />
              </div>
            </div>

            {/* Origin Station */}
            <div className="md:col-span-4">
              <label className="text-[11px] text-muted block mb-1 font-medium font-outlier">
                Origin station
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                  placeholder="Station code (e.g. CSMT)"
                  className="w-full bg-paper text-xs font-outlier font-bold px-3 py-2.5 rounded-pill border border-rule outline-none text-ink focus:bg-paper-3 focus:border-accent transition-colors disabled:opacity-40"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted pointer-events-none hidden sm:inline">
                  {getStationName(origin)}
                </span>
              </div>
            </div>

            {/* Station Swap Button */}
            <div className="md:col-span-1 flex items-center justify-center pb-1">
              <button
                type="button"
                onClick={handleSwapStations}
                className="p-2 rounded-pill bg-paper-3 hover:bg-paper text-muted hover:text-ink border border-rule transition-colors cursor-pointer active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent"
                title="Swap origin and destination"
                aria-label="Swap origin and destination stations"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Destination Station */}
            <div className="md:col-span-4">
              <label className="text-[11px] text-muted block mb-1 font-medium font-outlier">
                Destination station
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={dest}
                  onChange={(e) => setDest(e.target.value.toUpperCase())}
                  placeholder="Station code (e.g. SUR)"
                  className="w-full bg-paper text-xs font-outlier font-bold px-3 py-2.5 rounded-pill border border-rule outline-none text-ink focus:bg-paper-3 focus:border-accent transition-colors disabled:opacity-40"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted pointer-events-none hidden sm:inline">
                  {getStationName(dest)}
                </span>
              </div>
            </div>
          </div>

          {/* Form Row 2: Quota Selector & Action */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted font-medium font-outlier mr-1">
                Tariff quota:
              </span>
              {quotas.map((q) => (
                <button
                  key={q.code}
                  type="button"
                  onClick={() => handleQuotaChange(q.code)}
                  className={`px-3 py-1 rounded-pill text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent font-outlier ${
                    quota === q.code
                      ? "bg-accent text-accent-ink font-semibold"
                      : "bg-paper-3 text-muted hover:text-ink hover:bg-paper border border-rule"
                  }`}
                >
                  {q.label} ({q.code})
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs py-2 px-5 rounded-pill transition-opacity flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent self-start lg:self-auto shrink-0"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin motion-reduce:animate-none" />
              ) : (
                <>
                  <span>Calculate fares</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Popular Express Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-rule/50 text-xs">
          <span className="text-muted text-[11px] font-medium font-outlier">
            Trunk routes:
          </span>
          {[
            { num: "22225", o: "CSMT", d: "SUR", label: "#22225 Vande Bharat (CSMT to SUR)" },
            { num: "12951", o: "MMCT", d: "NDLS", label: "#12951 Mumbai Rajdhani (MMCT to NDLS)" },
            { num: "12101", o: "LTT", d: "HWH", label: "#12101 Jnaneswari (LTT to HWH)" },
            { num: "12158", o: "SUR", d: "PUNE", label: "#12158 Hutatma (SUR to PUNE)" },
          ].map((item) => (
            <button
              key={item.num}
              type="button"
              disabled={loading}
              onClick={() => handleQuickRoute(item.num, item.o, item.d)}
              className="px-2.5 py-1 rounded-pill border border-rule bg-paper hover:bg-paper-3 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-outlier text-muted hover:text-ink transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-paper-2 rounded-card border border-rule space-y-2">
          <Loader2 className="w-6 h-6 motion-safe:animate-spin motion-reduce:animate-none text-accent" />
          <p className="text-xs text-muted font-outlier">Computing distance tariff schedule…</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-paper-2 rounded-card border border-bad text-center text-xs text-bad">
          {error}
        </div>
      ) : fareData ? (
        <div className="bg-paper-2 rounded-card border border-rule overflow-hidden">
          {/* Executive Journey Header */}
          <div className="p-4 sm:p-6 bg-paper-3 border-b border-rule space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-outlier font-bold text-xs text-ink px-2 py-0.5 rounded-pill bg-paper border border-rule">
                    #{fareData.train_number}
                  </span>
                  <h2 className="text-base sm:text-lg font-display font-bold text-ink">
                    {fareData.train_name}
                  </h2>
                </div>
                <p className="text-xs text-muted font-outlier mt-1">
                  Pricing engine: {fareData.pricing_engine} / Quota: {fareData.quota}
                </p>
              </div>

              {/* Navigation Cross-Links */}
              <div className="flex items-center gap-3 text-xs">
                <Link
                  href={`/train?number=${fareData.train_number}`}
                  className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <Train className="w-3.5 h-3.5" />
                  <span>Track live</span>
                </Link>
              </div>
            </div>

            {/* Visual Route Corridor Strip */}
            <div className="py-2.5 px-3 sm:px-4 rounded-pill bg-paper border border-rule/60 flex items-center justify-between text-xs font-outlier">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-ink">{fareData.origin_station}</span>
                <span className="text-[11px] text-muted hidden sm:inline">
                  ({getStationName(fareData.origin_station)})
                </span>
              </div>

              <div className="flex-1 mx-3 sm:mx-6 flex items-center gap-1 opacity-70">
                <span className="h-0.5 bg-rule-2 flex-1" />
                <span className="text-[10px] text-muted font-bold px-2 py-0.5 rounded-pill bg-paper-3 border border-rule">
                  {fareData.distance_km} km
                </span>
                <span className="h-0.5 bg-rule-2 flex-1" />
              </div>

              <div className="flex items-center gap-1.5 text-right">
                <span className="text-[11px] text-muted hidden sm:inline">
                  ({getStationName(fareData.destination_station)})
                </span>
                <span className="font-bold text-ink">{fareData.destination_station}</span>
              </div>
            </div>
          </div>

          {/* View Mode Segmented Controls */}
          <div className="px-4 sm:px-6 py-2.5 bg-paper-2 border-b border-rule flex items-center justify-between gap-3 text-xs">
            <span className="text-muted font-outlier text-[11px]">
              Available classes: {fareData.classes.length} tiers
            </span>

            <div className="inline-flex items-center gap-1 p-0.5 rounded-pill bg-paper-3 border border-rule text-xs">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent ${
                  viewMode === "cards"
                    ? "bg-accent text-accent-ink font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Class cards</span>
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
                <Receipt className="w-3 h-3" />
                <span>Audit table</span>
              </button>
            </div>
          </div>

          {/* VIEW A: Visual Class Comparison Cards Grid */}
          {viewMode === "cards" && (
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 bg-paper-2">
              {fareData.classes.map((c) => {
                const meta = getClassMeta(c.class_code);
                return (
                  <div
                    key={c.class_code}
                    className="p-4 sm:p-5 rounded-pill border border-rule bg-paper-3/50 hover:bg-paper-3 hover:border-rule-2 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      {/* Class Badge Row */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-outlier font-bold text-sm text-ink px-2 py-0.5 rounded-pill bg-paper border border-rule">
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

                      {/* Class Full Name */}
                      <h3 className="font-display font-semibold text-ink text-sm">
                        {c.class_name}
                      </h3>
                      <p className="text-[11px] text-muted mt-0.5 line-clamp-1">
                        {meta.description}
                      </p>

                      {/* Prominent Price */}
                      <div className="mt-4 pt-3 border-t border-rule/50 flex items-baseline justify-between">
                        <span className="text-[11px] text-muted font-outlier">Total fare</span>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xs text-muted font-outlier">₹</span>
                          <span className="text-2xl sm:text-3xl font-outlier font-bold text-ink tracking-tight">
                            {c.total_fare}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transparent Itemized Line Items */}
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
                        <span>GST (5%)</span>
                        <span className={c.gst > 0 ? "text-ink font-medium" : "text-muted"}>
                          {c.gst > 0 ? `₹${c.gst}` : "Exempt"}
                        </span>
                      </div>
                      {c.tatkal_surcharge > 0 && (
                        <div className="flex items-center justify-between text-accent">
                          <span>Tatkal surcharge</span>
                          <span className="font-medium">+₹{c.tatkal_surcharge}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW B: Official Audit Tariff Table */}
          {viewMode === "ledger" && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[620px]">
                <thead className="bg-paper-3 text-muted text-[11px] border-b border-rule font-medium">
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
                <tbody className="divide-y divide-rule">
                  {fareData.classes.map((c) => (
                    <tr key={c.class_code} className="hover:bg-paper-3/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-ink">
                        <div className="flex items-center gap-2">
                          <span className="font-outlier font-bold text-xs text-ink px-2 py-0.5 rounded-pill bg-paper border border-rule">
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

          {/* Tariff Rules Notice */}
          <div className="p-4 bg-paper-3 border-t border-rule text-[11px] text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-ok shrink-0" />
              <span>
                Computed via Railway Board telescopic distance tariffs with tapering for distances &gt; 500 km. GST applies to AC classes.
              </span>
            </div>
            <span className="font-outlier text-muted shrink-0">
              IRCTC dynamic pricing may apply on select special trains.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function FarePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-12 space-y-2">
          <Loader2 className="w-6 h-6 motion-safe:animate-spin motion-reduce:animate-none text-accent" />
          <p className="text-xs text-muted font-outlier">Loading fare calculator…</p>
        </div>
      }
    >
      <FareContent />
    </Suspense>
  );
}
