"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FareEnquiryResult } from "@/lib/types";
import { Calculator, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";

export default function FarePage() {
  const [trainNumber, setTrainNumber] = useState("12101");
  const [origin, setOrigin] = useState("CSMT");
  const [dest, setDest] = useState("PUNE");
  const [quota, setQuota] = useState("GN");
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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator className="w-6 h-6 text-amber-600" />
            <span>Telescopic Distance Fare Calculator</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Calculates official Indian Railways distance-based tariff with base fare, reservation fee, superfast surcharge, GST, and Tatkal caps.
          </p>
        </div>

        <form onSubmit={handleCalculate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Train Number
            </label>
            <input
              type="text"
              value={trainNumber}
              onChange={(e) => setTrainNumber(e.target.value)}
              className="w-full bg-slate-50 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Origin Station
            </label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Destination Station
            </label>
            <input
              type="text"
              value={dest}
              onChange={(e) => setDest(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Quota
            </label>
            <select
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              className="w-full bg-slate-50 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-amber-500"
            >
              {quotas.map((q) => (
                <option key={q.code} value={q.code}>
                  {q.label} ({q.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm"
            >
              Calculate Fare
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          <p className="text-xs text-slate-500">Computing telescopic fare breakdown...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-white rounded-xl border border-red-200 text-center text-xs text-rose-600">
          {error}
        </div>
      ) : fareData ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-bold text-slate-800">
              {fareData.origin_station} ➔ {fareData.destination_station} ({fareData.distance_km} km) • Train #{fareData.train_number}
            </div>
            <div className="text-slate-500">
              Engine: <span className="font-semibold text-slate-700">{fareData.pricing_engine}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/60 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Base Fare</th>
                  <th className="py-3 px-4">Res Fee</th>
                  <th className="py-3 px-4">Superfast</th>
                  <th className="py-3 px-4">Tatkal Fee</th>
                  <th className="py-3 px-4">GST (5%)</th>
                  <th className="py-3 px-4 text-right">Total Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fareData.classes.map((c) => (
                  <tr key={c.class_code} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {c.class_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">₹{c.base_fare}</td>
                    <td className="py-3.5 px-4 text-slate-600">₹{c.reservation_charge}</td>
                    <td className="py-3.5 px-4 text-slate-600">₹{c.superfast_charge}</td>
                    <td className="py-3.5 px-4 text-amber-700 font-medium">
                      {c.tatkal_surcharge > 0 ? `₹${c.tatkal_surcharge}` : "--"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {c.gst > 0 ? `₹${c.gst}` : "Exempt"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        ₹{c.total_fare}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Telescopic fare formulas reflect official Railway Board tariff standards. Dynamic surge pricing (for Suvidha/Special trains) may vary at booking time on IRCTC.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
