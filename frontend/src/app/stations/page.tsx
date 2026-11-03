"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { StationLiveBoard } from "@/lib/types";
import { Building2, Search, ArrowRight, Loader2 } from "lucide-react";

export default function StationsPage() {
  const [stationCode, setStationCode] = useState("PUNE");
  const [windowHours, setWindowHours] = useState(4);
  const [board, setBoard] = useState<StationLiveBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const popularStations = [
    { code: "CSMT", name: "Mumbai CSMT" },
    { code: "PUNE", name: "Pune Jn" },
    { code: "SUR", name: "Solapur Jn" },
    { code: "KWV", name: "Kurduvadi Jn" },
    { code: "NDLS", name: "New Delhi" },
    { code: "HWH", name: "Howrah Jn" },
    { code: "KYN", name: "Kalyan Jn" },
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
      <div className="bg-paper-2 rounded-card border border-rule p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent" />
              <span>Station live arrival and departure board</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Station movements, platform allocations, and estimated arrivals.
            </p>
          </div>

          {/* Time Window Buttons */}
          <div className="flex items-center gap-1 bg-paper-3 p-1 rounded-pill border border-rule text-xs">
            {[2, 4, 8].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  setWindowHours(h);
                  fetchBoard(stationCode, h);
                }}
                disabled={loading}
                className={`px-3 py-1 rounded-pill transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent font-outlier ${
                  windowHours === h
                    ? "bg-accent text-accent-ink font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                {h}h window
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={stationCode}
              onChange={(e) => setStationCode(e.target.value.toUpperCase())}
              placeholder="Station code (e.g. CSMT, PUNE, NDLS)…"
              className="w-full bg-paper focus:bg-paper-3 text-xs font-outlier font-bold pl-9 pr-3 py-2 rounded-pill border border-rule focus:border-accent outline-none text-ink placeholder:text-muted transition-colors disabled:opacity-40"
            />
          </div>
          <button
            type="submit"
            disabled={!stationCode.trim() || loading}
            className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-4 py-2 rounded-pill transition-opacity focus-visible:outline-2 focus-visible:outline-accent"
          >
            Update board
          </button>
        </form>

        {/* Popular Station Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rule text-xs">
          <span className="text-muted text-[11px] font-medium">Quick select:</span>
          {popularStations.map((st) => (
            <button
              key={st.code}
              type="button"
              disabled={loading}
              onClick={() => {
                setStationCode(st.code);
                fetchBoard(st.code, windowHours);
              }}
              className={`px-2.5 py-1 rounded-pill border text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent font-outlier ${
                stationCode === st.code
                  ? "bg-paper-3 text-ink border-accent"
                  : "bg-paper text-muted border-rule hover:text-ink hover:bg-paper-3"
              }`}
            >
              {st.name} ({st.code})
            </button>
          ))}
        </div>
      </div>

      {/* Live Board Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-paper-2 rounded-card border border-rule space-y-2">
          <Loader2 className="w-6 h-6 motion-safe:animate-spin motion-reduce:animate-none text-accent" />
          <p className="text-xs text-muted font-outlier">Querying station live board…</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-paper-2 rounded-card border border-bad text-center text-xs text-bad">
          {error}
        </div>
      ) : board ? (
        <div className="bg-paper-2 rounded-card border border-rule overflow-hidden">
          <div className="px-5 py-3.5 bg-paper-3 border-b border-rule flex items-center justify-between text-xs text-muted">
            <span className="font-medium text-ink">
              {board.station_name} ({board.station_code}) / {board.trains.length} trains in next {board.window_hours}h
            </span>
            <span className="text-[11px] font-outlier">
              Source: {board.source_provider}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-3 text-muted text-[11px] border-b border-rule font-medium">
                <tr>
                  <th className="py-2.5 px-4">Train</th>
                  <th className="py-2.5 px-4">Route</th>
                  <th className="py-2.5 px-4">Arrival</th>
                  <th className="py-2.5 px-4">Departure</th>
                  <th className="py-2.5 px-4">Platform</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {board.trains.map((t, idx) => (
                  <tr key={`${t.train_number}-${idx}`} className="hover:bg-paper-3/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-ink">{t.train_name}</div>
                      <div className="text-[11px] text-accent font-outlier">#{t.train_number}</div>
                    </td>

                    <td className="py-3 px-4 text-muted">
                      {t.origin} to {t.destination}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-outlier text-ink">{t.scheduled_arrival || "--"}</div>
                      {t.delay_arrival_minutes > 0 ? (
                        <div className="text-[11px] text-accent font-outlier">
                          Exp: {t.expected_arrival} (+{t.delay_arrival_minutes}m)
                        </div>
                      ) : (
                        <div className="text-[11px] text-ok font-outlier">On time</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-outlier text-ink">{t.scheduled_departure || "--"}</div>
                      {t.delay_departure_minutes > 0 ? (
                        <div className="text-[11px] text-accent font-outlier">
                          Exp: {t.expected_departure} (+{t.delay_departure_minutes}m)
                        </div>
                      ) : (
                        <div className="text-[11px] text-ok font-outlier">On time</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-outlier font-bold text-ink px-2 py-0.5 rounded-pill bg-paper-3 border border-rule text-[11px]">
                        PF {t.platform || "1"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-outlier px-2 py-0.5 rounded-pill border ${
                          t.status === "AT_STATION"
                            ? "bg-ok-soft text-ok border-ok/30"
                            : t.status === "DEPARTED"
                            ? "bg-paper-3 text-muted border-rule"
                            : "bg-cool-soft text-cool border-cool/30"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/train?number=${t.train_number}`}
                        className="text-accent hover:underline active:opacity-80 font-medium text-xs inline-flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-accent"
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
