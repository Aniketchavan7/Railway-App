"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { PNRStatus } from "@/lib/types";
import {
  Ticket,
  Search,
  ShieldCheck,
  AlertCircle,
  Loader2,
  User,
} from "lucide-react";

export default function PNRPage() {
  const [pnrInput, setPnrInput] = useState("1234567890");
  const [pnrData, setPnrData] = useState<PNRStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pnrInput.replace(/\D/g, "");
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
            <Ticket className="w-5 h-5 text-accent" />
            <span>PNR status enquiry and charting state</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Passenger reservation status, coach, berth position, and chart preparation.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              maxLength={10}
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value)}
              placeholder="Enter 10-digit PNR number…"
              className="w-full bg-paper focus:bg-paper-3 text-sm font-outlier font-bold pl-9 pr-3 py-2.5 rounded-pill border border-rule focus:border-accent outline-none text-ink placeholder:text-muted transition-colors disabled:opacity-40"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin motion-reduce:animate-none" />
            ) : (
              "Check PNR"
            )}
          </button>
        </form>

        {/* Privacy Note */}
        <div className="flex items-start gap-2.5 p-3 bg-paper-3 rounded-pill border border-rule text-xs text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-ok shrink-0 mt-0.5" />
          <span>
            <strong className="text-ink">Privacy guarantee:</strong> PNR lookups are processed strictly in transit without retaining passenger personal names, contact info, or caching records in browser local storage.
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

      {/* PNR Result Display */}
      {pnrData && (
        <div className="bg-paper-2 rounded-card border border-rule space-y-4 p-6">
          {/* Top Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-rule">
            <div>
              <span className="text-[11px] text-muted block font-medium">
                PNR record
              </span>
              <div className="text-xl font-bold font-outlier text-ink">
                {pnrData.pnr}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-outlier px-2.5 py-1 rounded-pill border ${
                  pnrData.chart_status === "CHART_PREPARED"
                    ? "bg-ok-soft text-ok border-ok/30"
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

          {/* Train Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted block">Train</span>
              <div className="font-semibold text-ink">
                {pnrData.train_name} (#{pnrData.train_number})
              </div>
            </div>

            <div>
              <span className="text-muted block">Journey date</span>
              <div className="font-outlier text-ink">{pnrData.journey_date}</div>
            </div>

            <div>
              <span className="text-muted block">Route</span>
              <div className="font-semibold text-ink">
                {pnrData.from_station} to {pnrData.to_station}
              </div>
            </div>

            <div>
              <span className="text-muted block">Class and quota</span>
              <div className="font-outlier text-ink">
                {pnrData.reservation_class} ({pnrData.quota})
              </div>
            </div>
          </div>

          {/* Passengers List */}
          <div className="pt-4 border-t border-rule">
            <h3 className="text-xs font-semibold text-muted mb-3">
              Passenger booking details
            </h3>

            <div className="divide-y divide-rule border-y border-rule">
              {pnrData.passengers.map((p) => (
                <div
                  key={p.passenger_number}
                  className="py-3 px-1 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-pill bg-paper border border-rule text-ink flex items-center justify-center font-bold">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-ink">
                        Passenger #{p.passenger_number}
                      </span>
                      <div className="text-[11px] text-muted">
                        Booking: <strong className="text-ink font-outlier">{p.booking_status}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-muted block">Current status</span>
                      <span className="font-bold text-ok font-outlier text-sm">
                        {p.current_status}
                      </span>
                    </div>

                    {p.coach && (
                      <div className="px-2.5 py-1 bg-paper border border-rule rounded-pill text-center font-outlier">
                        <span className="text-[10px] text-muted block">Coach / berth</span>
                        <span className="font-bold text-ink">
                          {p.coach}, {p.berth_number} ({p.berth_type || "Berth"})
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
