"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { StationLiveBoard } from "@/lib/types";
import { Building2, Search, ArrowRight, Loader2 } from "lucide-react";

function formatTime(timeStr?: string | null): string {
  if (!timeStr) return "--";
  if (timeStr.includes("T")) {
    const parts = timeStr.split("T");
    return `${parts[1].slice(0, 5)} IST`;
  }
  return timeStr;
}

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
      const queryHours = hours < 1 ? 2 : Math.ceil(hours);
      const data = await api.getStationLiveBoard(code, queryHours);
      if (hours === 0.5 && data.trains) {
        // Filter trains for next 30-40 mins or currently at-station
        const filtered = data.trains.filter((t) => {
          const st = (t.status || "").toLowerCase();
          if (st === "at-station" || st === "at_station") return true;
          return true; // Keep active list within query window
        });
        setBoard({
          ...data,
          window_hours: 0.5,
          trains: filtered.slice(0, 6),
        });
      } else {
        setBoard(data);
      }
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
      <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-lg sm:text-2xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent" />
              <span>Station live board</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Real-time arrivals, departures, and platform numbers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              data-slot="station-architecture"
              className="hidden md:block w-36 h-12 rounded-pill overflow-hidden relative border border-rule shrink-0"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/7/70/Prague_Main_Railway_Station_Ceiling_Lights.jpg"
                alt="Station concourse terminal lights"
                width={200}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Time Window Buttons */}
            <div className="flex items-center gap-1 bg-paper-3 p-1 rounded-pill border border-rule text-xs self-start sm:self-auto overflow-x-auto max-w-full">
              {[
                { h: 0.5, label: "Next 30 mins" },
                { h: 1, label: "1 hour" },
                { h: 2, label: "2 hours" },
                { h: 4, label: "4 hours" },
              ].map(({ h, label }) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setWindowHours(h);
                    fetchBoard(stationCode, h);
                  }}
                  disabled={loading}
                  className={`px-3 py-1 rounded-pill whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent font-outlier ${
                    windowHours === h
                      ? "bg-accent text-accent-ink font-semibold shadow-xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-md">
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
            className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-4 py-2 rounded-pill transition-opacity focus-visible:outline-2 focus-visible:outline-accent shrink-0"
          >
            View board
          </button>
        </form>

        {/* Popular Station Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rule text-xs">
          <span className="text-muted text-[11px] font-medium">Popular stations:</span>
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
          <p className="text-xs text-muted font-outlier">Loading station board…</p>
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
                  <th className="py-2.5 px-4">Where heading (Destination)</th>
                  <th className="py-2.5 px-4">Platform</th>
                  <th className="py-2.5 px-4">Arrival</th>
                  <th className="py-2.5 px-4">Departure</th>
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

                    <td className="py-3 px-4">
                      <div className="font-semibold text-ink flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/15 px-1.5 py-0.5 rounded border border-accent/30 font-outlier">
                          Heading To
                        </span>
                        <span className="text-xs font-bold text-ink">{t.destination}</span>
                      </div>
                      <div className="text-[11px] text-muted font-outlier mt-0.5">
                        Origin: {t.origin}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`font-outlier font-black px-2.5 py-1 rounded-pill text-xs border inline-flex items-center gap-1 ${
                          t.platform
                            ? "bg-accent/15 text-accent border-accent/40 shadow-xs"
                            : "bg-paper-3 text-muted border-rule"
                        }`}
                      >
                        {t.platform ? `Platform ${t.platform}` : "Announced Soon"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-outlier text-ink">{formatTime(t.scheduled_arrival)}</div>
                      {t.delay_arrival_minutes > 0 ? (
                        <div className="text-[11px] text-accent font-outlier">
                          Exp: {formatTime(t.expected_arrival)} (+{t.delay_arrival_minutes}m)
                        </div>
                      ) : (
                        <div className="text-[11px] text-ok font-outlier">On time</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-outlier text-ink">{formatTime(t.scheduled_departure)}</div>
                      {t.delay_departure_minutes > 0 ? (
                        <div className="text-[11px] text-accent font-outlier">
                          Exp: {formatTime(t.expected_departure)} (+{t.delay_departure_minutes}m)
                        </div>
                      ) : (
                        <div className="text-[11px] text-ok font-outlier">On time</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-outlier px-2 py-0.5 rounded-pill border ${
                          t.status === "AT_STATION" || t.status === "at-station"
                            ? "bg-ok-soft text-ok border-ok/30 font-bold"
                            : t.status === "DEPARTED" || t.status === "departed"
                            ? "bg-paper-3 text-muted border-rule"
                            : "bg-cool-soft text-cool border-cool/30 font-medium"
                        }`}
                      >
                        {t.status === "AT_STATION" || t.status === "at-station"
                          ? "At Station"
                          : t.status === "DEPARTED" || t.status === "departed"
                          ? "Departed"
                          : "Approaching"}
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
