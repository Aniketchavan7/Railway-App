"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { PNRStatus } from "@/lib/types";
import {
  Ticket,
  Search,
  ShieldCheck,
  AlertCircle,
  Loader2,
  User,
  Train,
  LayoutGrid,
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
            <Ticket className="w-5 h-5 text-accent" />
            <span>PNR status enquiry</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Current booking status, coach allotment, berth position, and chart preparation.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              maxLength={10}
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 10-digit PNR number…"
              className="w-full bg-paper focus:bg-paper-3 text-sm font-outlier font-bold pl-9 pr-3 py-2.5 rounded-pill border border-rule focus:border-accent outline-none text-ink placeholder:text-muted transition-colors disabled:opacity-40"
            />
          </div>
          <button
            type="submit"
            disabled={loading || pnrInput.trim().length !== 10}
            className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent shrink-0 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin motion-reduce:animate-none" />
            ) : (
              "Check PNR"
            )}
          </button>
        </form>

        {/* Quick Demo Test Records */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rule/60 text-xs">
          <span className="text-muted text-[11px] font-medium font-outlier">
            Demo test records:
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
              className="px-2.5 py-0.5 rounded-pill bg-paper-3 hover:bg-paper active:opacity-80 disabled:opacity-40 text-muted hover:text-ink border border-rule text-[11px] font-outlier transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Privacy Note */}
        <div className="flex items-start gap-2.5 p-3 bg-paper-3/50 rounded-pill border border-rule/60 text-xs text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-ok shrink-0 mt-0.5" />
          <span>
            <strong className="text-ink">Privacy guarantee:</strong> Lookups are processed in transit. No names, phone numbers, or booking records are stored.
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-paper-2 border border-bad rounded-card text-xs text-bad flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PNR Digital Boarding Pass Display */}
      {pnrData && (
        <div className="bg-paper-2 rounded-card border border-rule space-y-4 p-5 sm:p-6">
          {/* Top Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-rule">
            <div>
              <span className="text-[11px] text-muted block font-medium font-outlier">
                Passenger name record
              </span>
              <div className="text-xl sm:text-2xl font-bold font-outlier text-ink tracking-tight">
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
                <span className="text-xs px-2.5 py-1 rounded-pill bg-paper-3 text-muted border border-rule font-outlier">
                  demo record
                </span>
              )}
            </div>
          </div>

          {/* Train & Journey Details */}
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

          {/* Quick Cross Navigation */}
          <div className="pt-3 pb-1 border-t border-rule/50 flex items-center gap-3 text-xs">
            <Link
              href={`/train?number=${pnrData.train_number}`}
              className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Train className="w-3.5 h-3.5" />
              <span>Track train #{pnrData.train_number}</span>
            </Link>
          </div>

          {/* Passengers List */}
          <div className="pt-4 border-t border-rule">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted font-outlier">
                Passengers ({pnrData.passengers.length})
              </h3>
              <span className="text-[11px] text-muted font-outlier">Booking verification</span>
            </div>

            <div className="divide-y divide-rule border-y border-rule">
              {pnrData.passengers.map((p) => (
                <div
                  key={p.passenger_number}
                  className="py-3 px-1 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-accent shrink-0" />
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
        </div>
      )}
    </div>
  );
}
