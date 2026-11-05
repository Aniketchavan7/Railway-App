"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { StationBoardItem, StationLiveBoard } from "@/lib/types";
import { Search, ArrowRight, Loader2, Building2, Clock, Train, ArrowUpDown } from "lucide-react";

function formatTime(timeStr?: string | null): string {
  if (!timeStr) return "--";
  if (timeStr.includes("T")) {
    const parts = timeStr.split("T");
    return `${parts[1].slice(0, 5)} IST`;
  }
  return timeStr;
}

const BOARD_REFRESH_MS = 60_000;

/** At the station now, or due within the window. Unparseable times stay visible. */
function isWithinMinutes(train: StationBoardItem, minutes: number): boolean {
  const status = (train.status || "").toLowerCase().replace("_", "-");
  if (status === "at-station") return true;
  const expected = train.expected_arrival || train.expected_departure;
  if (!expected || !expected.includes("T")) return true;
  const due = new Date(expected).getTime();
  if (Number.isNaN(due)) return true;
  const now = Date.now();
  return due >= now - 60_000 && due <= now + minutes * 60_000;
}

const POPULAR_STATIONS = [
  { code: "CSMT", name: "Mumbai CSMT" },
  { code: "PUNE", name: "Pune Jn" },
  { code: "SUR", name: "Solapur Jn" },
  { code: "NDLS", name: "New Delhi" },
  { code: "HWH", name: "Howrah Jn" },
  { code: "KWV", name: "Kurduvadi Jn" },
  { code: "KYN", name: "Kalyan Jn" },
  { code: "SBC", name: "KSR Bengaluru" },
];

function StationsBoardContent() {
  const searchParams = useSearchParams();
  const initialCode = (searchParams.get("code") || searchParams.get("station") || "PUNE").toUpperCase();

  const [stationCode, setStationCode] = useState(initialCode);
  const [windowHours, setWindowHours] = useState(4);
  const [board, setBoard] = useState<StationLiveBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBoard = async (code: string, hours: number, silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const queryHours = hours < 1 ? 1 : Math.ceil(hours);
      const data = await api.getStationLiveBoard(code, queryHours);
      setBoard(
        hours < 1 && data.trains
          ? {
              ...data,
              window_hours: hours,
              trains: data.trains.filter((t) => isWithinMinutes(t, hours * 60)),
            }
          : data
      );
      setError(null);
    } catch (err: any) {
      // A failed background refresh keeps the board on screen.
      if (!silent) {
        setBoard(null);
        setError(err.message || "Failed to load station live board");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard(stationCode, windowHours);
  }, []);

  // The board is live data, so keep it current while it's on screen.
  useEffect(() => {
    if (!board) return;
    const code = board.station_code;
    const timer = setInterval(() => fetchBoard(code, windowHours, true), BOARD_REFRESH_MS);
    return () => clearInterval(timer);
  }, [board?.station_code, windowHours]);

  // When url query param changes
  useEffect(() => {
    const codeParam = searchParams.get("code") || searchParams.get("station");
    if (codeParam && codeParam.toUpperCase() !== stationCode) {
      const formatted = codeParam.toUpperCase();
      setStationCode(formatted);
      fetchBoard(formatted, windowHours);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (stationCode.trim()) {
      fetchBoard(stationCode.trim(), windowHours);
    }
  };

  const handleSelectStation = (code: string) => {
    setStationCode(code);
    fetchBoard(code, windowHours);
  };

  return (
    <div className="space-y-8 sm:space-y-10 py-2">
      {/* Editorial Concourse Header */}
      <section className="space-y-4 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-ink leading-tight">
              Station live board
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Live platform allocations, scheduled arrivals, departures, and delay tracking.
            </p>
          </div>

          {/* Time Window Switcher (21st.dev Capsule Style) */}
          <div className="flex items-center gap-1 bg-paper-2 p-1 rounded-pill border border-rule text-xs self-start sm:self-auto overflow-x-auto max-w-full">
            {[
              { h: 0.5, label: "30m" },
              { h: 1, label: "1h" },
              { h: 2, label: "2h" },
              { h: 4, label: "4h" },
            ].map(({ h, label }) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  setWindowHours(h);
                  fetchBoard(stationCode, h);
                }}
                disabled={loading}
                className={`relative px-3 py-1 rounded-pill whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent font-outlier text-xs ${
                  windowHours === h
                    ? "text-accent-ink font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                {windowHours === h && (
                  <motion.div
                    layoutId="stationWindowTab"
                    className="absolute inset-0 bg-accent rounded-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Input Bar (21st.dev Style) */}
        <div className="space-y-3 pt-2">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={stationCode}
                onChange={(e) => setStationCode(e.target.value.toUpperCase())}
                placeholder="Station code (e.g. CSMT, PUNE, NDLS)…"
                className="w-full bg-paper-2 focus:bg-paper text-xs font-outlier font-bold pl-9 pr-3 py-2.5 rounded-pill border border-rule focus:border-accent outline-none text-ink placeholder:text-muted transition-colors disabled:opacity-40 shadow-xs"
              />
            </div>
            <button
              type="submit"
              disabled={!stationCode.trim() || loading}
              className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity focus-visible:outline-2 focus-visible:outline-accent shrink-0 cursor-pointer shadow-xs"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" /> : "View board"}
            </button>
          </form>

          {/* Quick Station Selection Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-muted text-[11px] font-medium font-outlier mr-1">
              Popular stations:
            </span>
            {POPULAR_STATIONS.map((st) => (
              <button
                key={st.code}
                type="button"
                disabled={loading}
                onClick={() => handleSelectStation(st.code)}
                className={`px-2.5 py-1 rounded-pill border text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-outlier ${
                  stationCode === st.code
                    ? "bg-accent/10 text-accent border-accent/40 font-semibold"
                    : "bg-paper-2 text-muted border-rule hover:text-ink hover:bg-paper-3"
                }`}
              >
                {st.name} <span className="text-[10px] opacity-75">({st.code})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Live Board Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <Loader2 className="w-6 h-6 text-accent motion-safe:animate-spin" />
          <p className="text-xs text-muted font-outlier">Fetching live concourse telemetry…</p>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-paper-2 border border-bad/30 text-xs text-bad max-w-lg space-y-2">
          <p className="font-semibold">Unable to load live board</p>
          <p className="text-muted text-[11px]">{error}</p>
        </div>
      ) : board ? (
        <section className="space-y-4">
          {/* Concourse Summary Banner */}
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-rule text-xs text-muted gap-2">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-ink text-sm sm:text-base">
                {board.station_name} ({board.station_code})
              </span>
              <span className="text-rule">/</span>
              <span className="font-outlier font-semibold text-accent">
                {board.trains.length} trains
              </span>
              <span className="text-muted font-outlier">
                next {board.window_hours < 1 ? `${board.window_hours * 60} min` : `${board.window_hours}h`} window
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-outlier">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-ok" aria-hidden="true" />
                <span>Live Feed</span>
              </span>
              <span className="text-muted hidden sm:inline">
                {board.is_simulated ? "⚠️ Simulated demo data" : `Source: ${board.source_provider === "railway_engine" ? "Railway Engine" : board.source_provider}`}
              </span>
            </div>
          </div>

          {/* Mobile Card List (<768px) */}
          <div className="md:hidden space-y-3">
            {board.trains.map((t, idx) => (
              <div
                key={`mob-${t.train_number}-${idx}`}
                className="p-4 rounded-xl bg-paper-2 border border-rule/80 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-sm text-ink">{t.train_name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted font-outlier">
                      <span className="font-bold text-accent">#{t.train_number}</span>
                      <span>to {t.destination}</span>
                    </div>
                  </div>
                  <span className="font-outlier font-bold text-xs px-2.5 py-1 rounded-pill bg-paper-3 border border-rule text-ink shrink-0">
                    {t.platform ? `PF ${t.platform}` : "TBA"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-rule/50">
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
                    className="px-3 py-1 rounded-pill bg-accent text-accent-ink font-medium text-xs flex items-center gap-1 shrink-0 transition-opacity hover:opacity-90"
                  >
                    <span>Track</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Tabular Board (>=768px) */}
          <div className="hidden md:block overflow-hidden border border-rule/80 rounded-2xl shadow-xs bg-paper">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-2 text-muted text-[11px] border-b border-rule/80 font-medium">
                <tr>
                  <th className="py-3 px-4 font-semibold">Train & service</th>
                  <th className="py-3 px-4 font-semibold">Destination</th>
                  <th className="py-3 px-4 font-semibold">Platform</th>
                  <th className="py-3 px-4 font-semibold">Arrival</th>
                  <th className="py-3 px-4 font-semibold">Departure</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/60 bg-paper">
                {board.trains.map((t, idx) => (
                  <tr key={`${t.train_number}-${idx}`} className="hover:bg-paper-2/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink">{t.train_name}</div>
                      <div className="text-[11px] text-accent font-outlier font-bold">#{t.train_number}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink">{t.destination}</div>
                      <div className="text-[11px] text-muted font-outlier">
                        Origin: {t.origin}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-outlier font-bold text-ink px-2.5 py-1 rounded-pill bg-paper-2 border border-rule text-xs inline-flex items-center gap-1">
                        {t.platform ? `Platform ${t.platform}` : "TBA"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-outlier text-ink font-medium">{formatTime(t.scheduled_arrival)}</div>
                      {t.delay_arrival_minutes > 0 ? (
                        <div className="text-[11px] text-accent font-outlier">
                          Exp: {formatTime(t.expected_arrival)} (+{t.delay_arrival_minutes}m)
                        </div>
                      ) : (
                        <div className="text-[11px] text-ok font-outlier font-medium">On time</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-outlier text-ink font-medium">{formatTime(t.scheduled_departure)}</div>
                      {t.delay_departure_minutes > 0 ? (
                        <div className="text-[11px] text-accent font-outlier">
                          Exp: {formatTime(t.expected_departure)} (+{t.delay_departure_minutes}m)
                        </div>
                      ) : (
                        <div className="text-[11px] text-ok font-outlier font-medium">On time</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-outlier px-2.5 py-0.5 rounded-pill border ${
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

                    <td className="py-3.5 px-4 text-right">
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

export default function StationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-5 h-5 text-accent motion-safe:animate-spin" />
        </div>
      }
    >
      <StationsBoardContent />
    </Suspense>
  );
}