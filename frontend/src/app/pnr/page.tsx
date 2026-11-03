"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { PNRStatus } from "@/lib/types";
import {
  Ticket,
  Search,
  ShieldCheck,
  CheckCircle2,
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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket className="w-6 h-6 text-emerald-600" />
            <span>PNR Status Enquiry & Charting Status</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Check current passenger reservation status, coach, berth position, and chart preparation.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              maxLength={10}
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value)}
              placeholder="Enter 10-digit PNR Number..."
              className="w-full bg-slate-50 focus:bg-white text-sm font-mono font-bold pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-6 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check PNR"}
          </button>
        </form>

        {/* Privacy Note */}
        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Privacy Guarantee:</strong> PNR lookups are processed strictly in transit without retaining passenger personal names, contact info, or caching records in browser local storage.
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PNR Result Display */}
      {pnrData && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-6">
          {/* Top Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                PNR Number
              </span>
              <div className="text-xl font-black font-mono text-slate-900 tracking-wider">
                {pnrData.pnr}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  pnrData.chart_status === "CHART_PREPARED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {pnrData.chart_status.replace(/_/g, " ")}
              </span>

              {pnrData.is_simulated && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Demo Record
                </span>
              )}
            </div>
          </div>

          {/* Train Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Train:</span>
              <div className="font-bold text-slate-800">
                {pnrData.train_name} (#{pnrData.train_number})
              </div>
            </div>

            <div>
              <span className="text-slate-400">Journey Date:</span>
              <div className="font-bold text-slate-800">{pnrData.journey_date}</div>
            </div>

            <div>
              <span className="text-slate-400">From ➔ To:</span>
              <div className="font-bold text-slate-800">
                {pnrData.from_station} ➔ {pnrData.to_station}
              </div>
            </div>

            <div>
              <span className="text-slate-400">Class & Quota:</span>
              <div className="font-bold text-slate-800">
                {pnrData.reservation_class} ({pnrData.quota})
              </div>
            </div>
          </div>

          {/* Passengers List */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Passenger Booking Details
            </h3>

            <div className="space-y-2">
              {pnrData.passengers.map((p) => (
                <div
                  key={p.passenger_number}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">
                        Passenger #{p.passenger_number}
                      </span>
                      <div className="text-[11px] text-slate-500">
                        Booking Status: <strong>{p.booking_status}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Current Status</span>
                      <span className="font-black text-emerald-700 text-sm">
                        {p.current_status}
                      </span>
                    </div>

                    {p.coach && (
                      <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block">Coach / Berth</span>
                        <span className="font-extrabold text-slate-800">
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
