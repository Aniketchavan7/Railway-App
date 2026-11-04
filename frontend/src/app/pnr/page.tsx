"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { PNRStatus } from "@/lib/types";
import {
  Search,
  AlertCircle,
  Loader2,
  User,
  Train,
  ShieldCheck,
} from "lucide-react";

export default function PNRPage() {
  const [pnrInput, setPnrInput] = useState("1234567890");
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPNR(pnrInput);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 py-2">
      {/* Open Page Header */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-ink leading-tight">
            PNR status enquiry
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Booking status, coach allotment, berth position, and chart preparation.
          </p>
        </div>

        {/* Search Console */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              maxLength={10}
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 10-digit PNR number…"
              className="w-full bg-paper-2 focus:bg-paper text-sm font-outlier font-bold pl-9 pr-3 py-2.5 rounded-pill border border-rule focus:border-accent outline-none text-ink placeholder:text-muted transition-colors disabled:opacity-40"
            />
          </div>
          <button
            type="submit"
            disabled={loading || pnrInput.trim().length !== 10}
            className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent shrink-0 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              "Check PNR"
            )}
          </button>
        </form>

        {/* Quick Demo Test Records */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-muted text-[11px] font-medium font-outlier">
            Demo records:
          </span>
          {[
            { pnr: "1234567890", label: "PNR #1234567890 (3A status)" },
            { pnr: "9876543210", label: "PNR #9876543210 (Waitlist WL)" },
          ].map((item) => (
            <button
              key={item.pnr}
              type="button"
              disabled={loading}
              onClick={() => {
                setPnrInput(item.pnr);
                fetchPNR(item.pnr);
              }}
              className="px-2.5 py-1 rounded-pill bg-paper-2 hover:bg-paper-3 active:opacity-80 disabled:opacity-40 text-muted hover:text-ink border border-rule text-xs font-outlier transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Privacy Note */}
        <p className="text-[11px] text-muted flex items-center gap-1.5 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-ok shrink-0" aria-hidden="true" />
          <span>Lookups are processed in transit. No names, phone numbers, or booking records are stored.</span>
        </p>
      </section>

      {/* Error Message */}
      {error && (
        <div className="p-4 border border-bad rounded-card text-xs text-bad flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* PNR Digital Record Display */}
      {pnrData && (
        <section className="space-y-6 pt-4 border-t border-rule">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-rule">
            <div>
              <span className="text-[11px] text-muted block font-medium font-outlier">
                Passenger name record
              </span>
              <div className="text-2xl font-bold font-outlier text-ink tracking-tight">
                {pnrData.pnr}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-outlier px-2.5 py-1 rounded-pill border ${
                  pnrData.chart_status === "CHART_PREPARED"
                    ? "bg-ok-soft text-ok border-ok/30 font-semibold"
                    : "bg-cool-soft text-cool border-cool/30"
                }`}
              >
                {pnrData.chart_status.replace(/_/g, " ").toLowerCase()}
              </span>

              {pnrData.is_simulated && (
                <span className="text-xs px-2.5 py-1 rounded-pill bg-paper-2 text-muted border border-rule font-outlier">
                  demo record
                </span>
              )}
            </div>
          </div>

          {/* Journey Specs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted block text-[11px] font-outlier">Train</span>
              <div className="font-semibold text-ink mt-0.5">
                {pnrData.train_name}
              </div>
              <span className="text-[11px] text-accent font-outlier">#{pnrData.train_number}</span>
            </div>

            <div>
              <span className="text-muted block text-[11px] font-outlier">Journey date</span>
              <div className="font-outlier font-semibold text-ink mt-0.5">{pnrData.journey_date}</div>
            </div>

            <div>
              <span className="text-muted block text-[11px] font-outlier">Route</span>
              <div className="font-semibold text-ink mt-0.5">
                {pnrData.from_station} to {pnrData.to_station}
              </div>
            </div>

            <div>
              <span className="text-muted block text-[11px] font-outlier">Class and quota</span>
              <div className="font-outlier font-semibold text-ink mt-0.5">
                {pnrData.reservation_class} ({pnrData.quota})
              </div>
            </div>
          </div>

          {/* Live Train Link */}
          <div className="pt-2 flex items-center gap-3 text-xs">
            <Link
              href={`/train?number=${pnrData.train_number}`}
              className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Train className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Track train #{pnrData.train_number} live</span>
            </Link>
          </div>

          {/* Passengers List */}
          <div className="space-y-2 pt-4 border-t border-rule">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted font-outlier">
                Passengers ({pnrData.passengers.length})
              </h2>
              <span className="text-[11px] text-muted font-outlier">Verified manifest</span>
            </div>

            <div className="divide-y divide-rule border-y border-rule">
              {pnrData.passengers.map((p) => (
                <div
                  key={p.passenger_number}
                  className="py-3 px-1 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                    <div>
                      <span className="font-semibold text-ink">
                        Passenger #{p.passenger_number}
                      </span>
                      <div className="text-[11px] text-muted font-outlier">
                        Booking: <strong className="text-ink">{p.booking_status}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
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
        </section>
      )}
    </div>
  );
}
