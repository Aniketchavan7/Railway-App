"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { FareEnquiryResult } from "@/lib/types";
import { Calculator, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";

function FareContent() {
  const searchParams = useSearchParams();
  const [trainNumber, setTrainNumber] = useState(searchParams.get("train") || searchParams.get("number") || "22225");
  const [origin, setOrigin] = useState(searchParams.get("origin") || "CSMT");
  const [dest, setDest] = useState(searchParams.get("dest") || "SUR");
  const [quota, setQuota] = useState(searchParams.get("quota") || "GN");
  const [fareData, setFareData] = useState<FareEnquiryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateFare = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFareEnquiry(trainNumber, origin, dest, quota);
      setFareData(data);
    } catch (err: any) {
      setError(err.message || "Failed to calculate fare");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateFare();
  }, []);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    calculateFare();
  };

  const quotas = [
    { code: "GN", label: "General Quota" },
    { code: "TQ", label: "Tatkal Quota" },
    { code: "PT", label: "Premium Tatkal" },
    { code: "SS", label: "Senior Citizen" },
    { code: "LD", label: "Ladies Quota" },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Calculator Form */}
      <div className="bg-paper-2 rounded-card border border-rule p-6 space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-accent" />
            <span>Telescopic distance fare calculator</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Calculates official Indian Railways distance-based tariff with base fare, reservation fee, superfast surcharge, GST, and Tatkal caps.
          </p>
        </div>

        <form onSubmit={handleCalculate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          <div>
            <label className="text-[11px] text-muted block mb-1 font-medium">
              Train number
            </label>
            <input
              type="text"
              value={trainNumber}
              onChange={(e) => setTrainNumber(e.target.value)}
              className="w-full bg-paper text-xs font-outlier font-bold px-3 py-2 rounded-pill border border-rule outline-none text-ink focus:bg-paper-3 focus:border-accent transition-colors disabled:opacity-40"
              placeholder="e.g. 22225, 12158"
            />
          </div>

          <div>
            <label className="text-[11px] text-muted block mb-1 font-medium">
              Origin station
            </label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              className="w-full bg-paper text-xs font-outlier font-bold px-3 py-2 rounded-pill border border-rule outline-none text-ink focus:bg-paper-3 focus:border-accent transition-colors disabled:opacity-40"
              placeholder="e.g. CSMT"
            />
          </div>

          <div>
            <label className="text-[11px] text-muted block mb-1 font-medium">
              Destination station
            </label>
            <input
              type="text"
              value={dest}
              onChange={(e) => setDest(e.target.value.toUpperCase())}
              className="w-full bg-paper text-xs font-outlier font-bold px-3 py-2 rounded-pill border border-rule outline-none text-ink focus:bg-paper-3 focus:border-accent transition-colors disabled:opacity-40"
              placeholder="e.g. SUR"
            />
          </div>

          <div>
            <label className="text-[11px] text-muted block mb-1 font-medium">
              Quota
            </label>
            <select
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              className="w-full bg-paper text-xs font-outlier font-medium px-3 py-2 rounded-pill border border-rule outline-none text-ink focus:bg-paper-3 focus:border-accent cursor-pointer transition-colors disabled:opacity-40"
            >
              {quotas.map((q) => (
                <option key={q.code} value={q.code} className="bg-paper-2 text-ink">
                  {q.label} ({q.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs py-2 px-4 rounded-pill transition-opacity flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span>Calculate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rule text-xs">
          <span className="text-muted text-[11px] font-medium">Quick routes:</span>
          {[
            { num: "22225", o: "CSMT", d: "SUR", label: "#22225 (CSMT to SUR)" },
            { num: "12158", o: "SUR", d: "PUNE", label: "#12158 (SUR to PUNE)" },
            { num: "12101", o: "LTT", d: "HWH", label: "#12101 (LTT to HWH)" },
            { num: "12951", o: "MMCT", d: "NDLS", label: "#12951 (MMCT to NDLS)" },
          ].map((item) => (
            <button
              key={item.num}
              type="button"
              disabled={loading}
              onClick={() => {
                setTrainNumber(item.num);
                setOrigin(item.o);
                setDest(item.d);
              }}
              className="px-2.5 py-1 rounded-pill border border-rule bg-paper hover:bg-paper-3 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-outlier text-muted hover:text-ink transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-paper-2 rounded-card border border-rule space-y-2">
          <Loader2 className="w-6 h-6 motion-safe:animate-spin motion-reduce:animate-none text-accent" />
          <p className="text-xs text-muted font-outlier">Calculating official tariff breakdown…</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-paper-2 rounded-card border border-bad text-center text-xs text-bad">
          {error}
        </div>
      ) : fareData ? (
        <div className="bg-paper-2 rounded-card border border-rule overflow-hidden">
          <div className="p-5 border-b border-rule flex flex-wrap items-center justify-between gap-3 bg-paper-3">
            <div>
              <span className="text-xs font-outlier font-bold px-2 py-0.5 rounded-pill bg-paper text-ink border border-rule mr-2">
                #{fareData.train_number}
              </span>
              <strong className="text-ink text-sm font-display">{fareData.train_name}</strong>
              <span className="text-xs text-muted ml-2 font-outlier">
                ({fareData.origin_station} to {fareData.destination_station} / {fareData.distance_km} km)
              </span>
            </div>
            <span className="text-xs font-outlier px-2.5 py-0.5 rounded-pill bg-paper border border-rule text-muted">
              Quota: {fareData.quota}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-paper-3 text-muted text-[11px] border-b border-rule font-medium">
                <tr>
                  <th className="py-2.5 px-4">Class</th>
                  <th className="py-2.5 px-4">Base fare</th>
                  <th className="py-2.5 px-4">Reservation</th>
                  <th className="py-2.5 px-4">Superfast</th>
                  <th className="py-2.5 px-4">Tatkal extra</th>
                  <th className="py-2.5 px-4">GST (5%)</th>
                  <th className="py-2.5 px-4 text-right">Total fare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {fareData.classes.map((c) => (
                  <tr key={c.class_code} className="hover:bg-paper-3/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-ink">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-5 rounded-pill bg-paper border border-rule text-ink font-outlier text-[11px] flex items-center justify-center font-bold">
                          {c.class_code}
                        </span>
                        <span>{c.class_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-outlier text-muted">₹{c.base_fare}</td>
                    <td className="py-3 px-4 font-outlier text-muted">₹{c.reservation_charge}</td>
                    <td className="py-3 px-4 font-outlier text-muted">₹{c.superfast_charge}</td>
                    <td className="py-3 px-4 font-outlier text-accent">
                      {c.tatkal_surcharge > 0 ? `₹${c.tatkal_surcharge}` : "—"}
                    </td>
                    <td className="py-3 px-4 font-outlier text-muted">
                      {c.gst > 0 ? `₹${c.gst}` : "Exempt"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-xs font-outlier font-bold text-ink bg-paper-3 px-2.5 py-1 rounded-pill border border-rule">
                        ₹{c.total_fare}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-paper-3 border-t border-rule text-[11px] text-muted flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-ok shrink-0" />
            <span>
              Telescopic fare formulas reflect official Railway Board tariff standards. Dynamic surge pricing (for Suvidha/Special trains) may vary at booking time on IRCTC.
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
