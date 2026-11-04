"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { PNRStatus } from "@/lib/types";
import {
  Search,
  AlertCircle,
  Loader2,
  User,
  Train,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Ticket,
} from "lucide-react";

function PNRContent() {
  const searchParams = useSearchParams();
  const urlPnr = searchParams.get("pnr") || "";

  const [pnrInput, setPnrInput] = useState(urlPnr || "1234567890");
  const [pnrData, setPnrData] = useState<PNRStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPNR = async (pnrToFetch: string) => {
    const clean = pnrToFetch.replace(/\D/g, "");
    if (clean.length !== 10) {
      setError("PNR must be exactly 10 digits");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.getPNRStatus(clean);
      setPnrData(data);
    } catch (err: any) {
      setError(err.message || "PNR record not found or expired");
    } finally {
      setLoading(false);
    }
  };

  // If URL has ?pnr=..., fetch immediately on mount
  useEffect(() => {
    if (urlPnr && urlPnr.replace(/\D/g, "").length === 10) {
      setPnrInput(urlPnr);
      fetchPNR(urlPnr);
    } else {
      fetchPNR("1234567890");
    }
  }, [urlPnr]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPNR(pnrInput);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 sm:space-y-10 py-2">
      {/* Editorial Page Header */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-ink leading-tight">
            PNR status enquiry
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Booking confirmation, coach allotment, berth allocation, and chart preparation status.
          </p>
        </div>

        {/* Search Console (21st.dev Style Pill Input) */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg pt-2">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              maxLength={10}
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 10-digit PNR number…"
              className="w-full bg-paper-2 focus:bg-paper text-sm font-outlier font-bold pl-9 pr-3 py-2.5 rounded-pill border border-rule focus:border-accent outline-none text-ink placeholder:text-muted transition-colors disabled:opacity-40 shadow-xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading || pnrInput.trim().length !== 10}
            className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent shrink-0 cursor-pointer shadow-xs"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              "Check PNR"
            )}
          </button>
        </form>

        {/* Quick Demo Test Records */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-muted text-[11px] font-medium font-outlier">
            Verified samples:
          </span>
          {[
            { pnr: "1234567890", label: "Sample record 1234567890" },
            { pnr: "9876543210", label: "Sample record 9876543210" },
          ].map((item) => (
            <button
              key={item.pnr}
              type="button"
              disabled={loading}
              onClick={() => {
                setPnrInput(item.pnr);
                fetchPNR(item.pnr);
              }}
              className="px-2.5 py-1 rounded-pill bg-paper-2 hover:bg-paper-3 active:opacity-80 disabled:opacity-40 text-muted hover:text-ink border border-rule text-xs font-outlier transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Privacy Note */}
        <p className="text-[11px] text-muted flex items-center gap-1.5 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-ok shrink-0" aria-hidden="true" />
          <span>Queries are verified directly against Indian Railways reservation records.</span>
        </p>
      </section>

      {/* Error Message */}
      {error && (
        <div className="p-4 border border-bad/30 bg-paper-2 rounded-2xl text-xs text-bad flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* PNR Digital Record Display (21st.dev Card Design) */}
      {pnrData && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6 pt-4 border-t border-rule"
        >
          {/* Header Card */}
          <div className="p-5 rounded-2xl bg-paper-2 border border-rule/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-muted block font-medium font-outlier">
                Passenger Name Record (PNR)
              </span>
              <div className="text-2xl font-bold font-outlier text-ink tracking-tight mt-0.5">
                {pnrData.pnr}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-outlier px-3 py-1 rounded-pill border ${
                  pnrData.chart_status === "CHART_PREPARED"
                    ? "bg-ok-soft text-ok border-ok/30 font-semibold"
                    : "bg-cool-soft text-cool border-cool/30"
                }`}
              >
                {pnrData.chart_status.replace(/_/g, " ").toLowerCase()}
              </span>

              {pnrData.is_simulated && (
                <span className="text-xs px-2.5 py-1 rounded-pill bg-paper-3 text-muted border border-rule font-outlier">
                  sample record
                </span>
              )}
            </div>
          </div>

          {/* Journey Specs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-paper-2 border border-rule/60">
              <span className="text-muted block text-[11px] font-outlier">Train & Service</span>
              <div className="font-semibold text-ink mt-0.5">
                {pnrData.train_name}
              </div>
              <span className="text-[11px] text-accent font-outlier font-bold">#{pnrData.train_number}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-paper-2 border border-rule/60">
              <span className="text-muted block text-[11px] font-outlier">Journey Date</span>
              <div className="font-outlier font-semibold text-ink mt-0.5">{pnrData.journey_date}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-paper-2 border border-rule/60">
              <span className="text-muted block text-[11px] font-outlier">Origin → Destination</span>
              <div className="font-semibold text-ink mt-0.5">
                {pnrData.from_station} → {pnrData.to_station}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-paper-2 border border-rule/60">
              <span className="text-muted block text-[11px] font-outlier">Class & Quota</span>
              <div className="font-outlier font-semibold text-ink mt-0.5">
                {pnrData.reservation_class} ({pnrData.quota})
              </div>
            </div>
          </div>

          {/* Live Train Link Button */}
          <div className="pt-1">
            <Link
              href={`/train?number=${pnrData.train_number}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-paper-2 hover:bg-paper-3 border border-rule text-xs font-semibold text-ink transition-colors"
            >
              <Train className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
              <span>Track Train #{pnrData.train_number} Live Radar</span>
            </Link>
          </div>

          {/* Passengers Manifest */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted font-outlier">
                Passenger Manifest ({pnrData.passengers.length})
              </h2>
              <span className="text-[11px] text-muted font-outlier">Railway Board Records</span>
            </div>

            <div className="divide-y divide-rule/70 border border-rule/80 rounded-2xl overflow-hidden bg-paper shadow-xs">
              {pnrData.passengers.map((p) => (
                <div
                  key={p.passenger_number}
                  className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-paper-2 border border-rule flex items-center justify-center text-accent">
                      <User className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="font-semibold text-ink">
                        Passenger #{p.passenger_number}
                      </span>
                      <div className="text-[11px] text-muted font-outlier">
                        Booking status: <strong className="text-ink">{p.booking_status}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[10px] text-muted block font-outlier">Current status</span>
                      <span
                        className={`font-bold font-outlier text-sm ${
                          p.current_status.startsWith("CNF")
                            ? "text-ok"
                            : p.current_status.startsWith("WL")
                            ? "text-accent"
                            : "text-ink"
                        }`}
                      >
                        {p.current_status}
                      </span>
                    </div>

                    {p.coach && (
                      <div className="text-right font-outlier">
                        <span className="text-[10px] text-muted block">Coach / berth</span>
                        <span className="font-bold text-ink">
                          {p.coach}, Berth {p.berth_number} ({p.berth_type || "Berth"})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}
    </div>
  );
}

export default function PNRPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-5 h-5 text-accent motion-safe:animate-spin" />
        </div>
      }
    >
      <PNRContent />
    </Suspense>
  );
}