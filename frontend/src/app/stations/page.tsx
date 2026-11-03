"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { StationLiveBoard } from "@/lib/types";
import { Building2, Search, Clock, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function StationsPage() {
  const [stationCode, setStationCode] = useState("PUNE");
  const [windowHours, setWindowHours] = useState(4);
  const [board, setBoard] = useState<StationLiveBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const popularStations = [
    { code: "CSMT", name: "Mumbai CSMT" },
    { code: "PUNE", name: "Pune Jn" },
    { code: "NDLS", name: "New Delhi" },
    { code: "HWH", name: "Howrah Jn" },
    { code: "KYN", name: "Kalyan Jn" },
    { code: "NGP", name: "Nagpur Jn" },
  ];

  const fetchBoard = async (code: string, hours: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStationLiveBoard(code, hours);
      setBoard(data);
    } catch (err: any) {
      setError(err.message || "Failed to load station live board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard(stationCode, windowHours);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (stationCode.trim()) {
      fetchBoard(stationCode.trim(), windowHours);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              <span>Station Live Arrival & Departure Board</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time station movements, platform assignments, and expected arrivals.
            </p>
          </div>

          {/* Time Window Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[2, 4, 8].map((h) => (
              <button
                key={h}
                onClick={() => {
                  setWindowHours(h);
                  fetchBoard(stationCode, h);
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  windowHours === h
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {h} Hours
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={stationCode}
              onChange={(e) => setStationCode(e.target.value.toUpperCase())}
              placeholder="Station code (e.g. CSMT, PUNE, NDLS)..."
              className="w-full bg-slate-50 focus:bg-white text-xs font-bold pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
          >
            Update Board
          </button>
        </form>

        {/* Popular Station Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold">Quick Stations:</span>
          {popularStations.map((st) => (
            <button
              key={st.code}
              onClick={() => {
                setStationCode(st.code);
                fetchBoard(st.code, windowHours);
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                stationCode === st.code
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {st.name} ({st.code})
            </button>
          ))}
        </div>
      </div>

      {/* Live Board Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs text-slate-500">Querying station live board...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-white rounded-xl border border-red-200 text-center text-xs text-rose-600">
          {error}
        </div>
      ) : board ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>
              {board.station_name} ({board.station_code}) • {board.trains.length} Trains in Next {board.window_hours}h
            </span>
            <span className="text-[11px] text-slate-400">
              Source: {board.source_provider} {board.is_simulated ? "(Demo Mode)" : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/60 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Train</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Sch Arrival / Exp</th>
                  <th className="py-3 px-4">Sch Dep / Exp</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {board.trains.map((t, idx) => (
                  <tr key={`${t.train_number}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{t.train_name}</div>
                      <div className="text-[11px] font-semibold text-blue-600">#{t.train_number}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {t.origin} ➔ {t.destination}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{t.scheduled_arrival || "--"}</div>
                      {t.delay_arrival_minutes > 0 ? (
                        <div className="text-[11px] text-amber-600 font-semibold">
                          Exp: {t.expected_arrival} (+{t.delay_arrival_minutes}m)
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-600 font-medium">On time</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{t.scheduled_departure || "--"}</div>
                      {t.delay_departure_minutes > 0 ? (
                        <div className="text-[11px] text-amber-600 font-semibold">
                          Exp: {t.expected_departure} (+{t.delay_departure_minutes}m)
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-600 font-medium">On time</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        PF #{t.platform || "1"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === "AT_STATION"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : t.status === "DEPARTED"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/train/${t.train_number}`}
                        className="text-blue-600 hover:text-blue-800 font-bold text-xs inline-flex items-center gap-1"
                      >
                        <span>Track</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
