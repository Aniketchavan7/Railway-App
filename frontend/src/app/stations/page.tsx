"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { StationLiveBoard } from "@/lib/types";
import { Search, ArrowRight, Loader2 } from "lucide-react";

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
        const filtered = data.trains.filter((t) => {
          const st = (t.status || "").toLowerCase();
          if (st === "at-station" || st === "at_station") return true;
          return true;
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
    <div className="space-y-10 py-2">
      {/* Open Page Header */}
      <section className="space-y-4 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-ink leading-tight">
              Station live board
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Real-time arrivals, departures, and platform assignments.
            </p>
          </div>

          {/* Time Window Switcher */}
          <div className="flex items-center gap-1 bg-paper-2 p-1 rounded-pill border border-rule text-xs self-start sm:self-auto overflow-x-auto max-w-full">
            {[
              { h: 0.5, label: "30 mins" },
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
                className={`px-3 py-1 rounded-pill whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent font-outlier ${
                  windowHours === h
                    ? "bg-accent text-accent-ink font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input & Stations */}
        <div className="space-y-3 pt-2">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                value={stationCode}
                onChange={(e) => setStationCode(e.target.value.toUpperCase())}
                placeholder="Station code (e.g. CSMT, PUNE, NDLS)…"
                className="w-full bg-paper-2 focus:bg-paper text-xs font-outlier font-bold pl-9 pr-3 py-2.5 rounded-pill border border-rule focus:border-accent outline-none text-ink placeholder:text-muted transition-colors disabled:opacity-40"
              />
            </div>
            <button
              type="submit"
              disabled={!stationCode.trim() || loading}
              className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity focus-visible:outline-2 focus-visible:outline-accent shrink-0 cursor-pointer"
            >
              View board
            </button>
          </form>

          {/* Popular Stations */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-muted text-[11px] font-medium font-outlier">
              Quick:
            </span>
            {popularStations.map((st) => (
              <button
                key={st.code}
                type="button"
                disabled={loading}
                onClick={() => {
                  setStationCode(st.code);
                  fetchBoard(st.code, windowHours);
                }}
                className={`px-2.5 py-1 rounded-pill border text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent font-outlier ${
                  stationCode === st.code
                    ? "bg-paper-3 text-ink border-accent font-semibold"
                    : "bg-paper-2 text-muted border-rule hover:text-ink hover:bg-paper-3"
                }`}
              >
                {st.name} ({st.code})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Live Board Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 motion-safe:animate-spin motion-reduce:animate-none text-accent" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-card border border-bad text-xs text-bad">
          {error}
        </div>
      ) : board ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rule text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink text-sm">
                {board.station_name} ({board.station_code})
              </span>
              <span className="text-rule-2">/</span>
              <span className="font-outlier">
                {board.trains.length} trains in next {board.window_hours}h
              </span>
            </div>
            <span className="text-[11px] font-outlier hidden sm:inline">
              Source: {board.source_provider}
            </span>
          </div>

          {/* Mobile Card List (<768px) */}
          <div className="md:hidden divide-y divide-rule border-y border-rule">
            {board.trains.map((t, idx) => (
              <div key={`mob-${t.train_number}-${idx}`} className="py-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-sm text-ink">{t.train_name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted font-outlier">
                      <span className="font-bold text-accent">#{t.train_number}</span>
                      <span>to {t.destination}</span>
                    </div>
                  </div>
                  <span className="font-outlier font-bold text-xs px-2.5 py-0.5 rounded-pill bg-paper-2 border border-rule text-ink shrink-0">
                    {t.platform ? `PF ${t.platform}` : "TBA"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="space-y-0.5">
                    <div className="font-outlier text-ink">
                      Arr: {formatTime(t.scheduled_arrival)}
                      {t.delay_arrival_minutes > 0 ? (
                        <span className="text-accent ml-1 font-outlier">(+{t.delay_arrival_minutes}m)</span>
                      ) : (
                        <span className="text-ok ml-1 font-outlier">(On time)</span>
                      )}
                    </div>
                    <div className="font-outlier text-muted text-[11px]">
                      Dep: {formatTime(t.scheduled_departure)}
                    </div>
                  </div>

                  <Link
                    href={`/train?number=${t.train_number}`}
                    className="px-3 py-1 rounded-pill bg-accent text-accent-ink font-medium text-xs flex items-center gap-1 shrink-0"
                  >
                    <span>Track</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Tabular Board (>=768px) */}
          <div className="hidden md:block overflow-x-auto border border-rule rounded-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-2 text-muted text-[11px] border-b border-rule font-medium">
                <tr>
                  <th className="py-2.5 px-4">Train & service</th>
                  <th className="py-2.5 px-4">Destination</th>
                  <th className="py-2.5 px-4">Platform</th>
                  <th className="py-2.5 px-4">Arrival</th>
                  <th className="py-2.5 px-4">Departure</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule bg-paper">
                {board.trains.map((t, idx) => (
                  <tr key={`${t.train_number}-${idx}`} className="hover:bg-paper-2 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-ink">{t.train_name}</div>
                      <div className="text-[11px] text-accent font-outlier">#{t.train_number}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-ink">{t.destination}</div>
                      <div className="text-[11px] text-muted font-outlier">
                        Origin: {t.origin}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-outlier font-bold text-ink px-2.5 py-1 rounded-pill bg-paper-2 border border-rule text-xs inline-flex items-center gap-1">
                        {t.platform ? `Platform ${t.platform}` : "TBA"}
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
                            ? "bg-ok-soft text-ok border-ok/30 font-semibold"
                            : t.status === "DEPARTED" || t.status === "departed"
                            ? "bg-paper-2 text-muted border-rule"
                            : "bg-cool-soft text-cool border-cool/30 font-medium"
                        }`}
                      >
                        {t.status === "AT_STATION" || t.status === "at-station"
                          ? "At station"
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
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
