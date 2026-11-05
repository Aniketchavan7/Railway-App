"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Train,
  ArrowRight,
  ArrowLeftRight,
  Search,
  Loader2,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";

const POPULAR_CORRIDORS = [
  { from: "CSMT", to: "PUNE", label: "Mumbai ⇄ Pune" },
  { from: "CSMT", to: "SUR", label: "Mumbai ⇄ Solapur" },
  { from: "NDLS", to: "BSB", label: "Delhi ⇄ Varanasi" },
  { from: "MMCT", to: "ADI", label: "Mumbai ⇄ Ahmedabad" },
  { from: "CSMT", to: "HWH", label: "Mumbai ⇄ Howrah" },
  { from: "SBC", to: "NDLS", label: "Bengaluru ⇄ Delhi" },
];

export function RouteFinder() {
  const [fromCode, setFromCode] = useState("CSMT");
  const [toCode, setToCode] = useState("PUNE");
  const [trains, setTrains] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchRoute = async (src: string, dst: string) => {
    if (!src || !dst || src === dst) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.getTrainsBetweenStations(src, dst);
      setTrains(res.trains || []);
    } catch {
      setTrains([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute(fromCode, toCode);
  }, []);

  const handleSwap = () => {
    const nextFrom = toCode;
    const nextTo = fromCode;
    setFromCode(nextFrom);
    setToCode(nextTo);
    fetchRoute(nextFrom, nextTo);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRoute(fromCode, toCode);
  };

  const handleSelectCorridor = (from: string, to: string) => {
    setFromCode(from);
    setToCode(to);
    fetchRoute(from, to);
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-paper-2 border border-rule/80 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rule/60">
        <div>
          <div className="flex items-center gap-2">
            <Train className="w-4 h-4 text-accent" />
            <h3 className="font-display font-bold text-ink text-base">
              Station-to-Station Route Finder
            </h3>
            <span className="text-[11px] font-outlier px-2 py-0.5 rounded-pill bg-paper-3 text-muted border border-rule">
              Direct Schedules
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5 font-outlier">
            Trains between two stations, from the timetable. Tap Track for live status.
          </p>
        </div>

        {/* Quick Corridor Selection Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-outlier">
          {POPULAR_CORRIDORS.map((c) => {
            const isActive = fromCode === c.from && toCode === c.to;
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => handleSelectCorridor(c.from, c.to)}
                className={`px-2.5 py-1 rounded-pill border text-xs transition-colors cursor-pointer ${
                  isActive
                    ? "bg-accent/10 text-accent border-accent/40 font-semibold"
                    : "bg-paper text-muted border-rule hover:text-ink hover:bg-paper-3"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inputs Form */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2">
        <div className="flex-1 w-full relative">
          <input
            type="text"
            value={fromCode}
            onChange={(e) => setFromCode(e.target.value.toUpperCase())}
            placeholder="From station (e.g. CSMT)"
            className="w-full bg-paper focus:bg-paper-2 text-xs font-outlier font-bold px-3.5 py-2.5 rounded-pill border border-rule focus:border-accent outline-none text-ink placeholder:text-muted transition-colors uppercase shadow-xs"
          />
        </div>

        {/* Swap Button */}
        <button
          type="button"
          onClick={handleSwap}
          className="p-2.5 rounded-pill bg-paper hover:bg-paper-3 active:opacity-80 border border-rule text-muted hover:text-ink transition-colors cursor-pointer shrink-0"
          title="Swap stations"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        <div className="flex-1 w-full relative">
          <input
            type="text"
            value={toCode}
            onChange={(e) => setToCode(e.target.value.toUpperCase())}
            placeholder="To station (e.g. PUNE)"
            className="w-full bg-paper focus:bg-paper-2 text-xs font-outlier font-bold px-3.5 py-2.5 rounded-pill border border-rule focus:border-accent outline-none text-ink placeholder:text-muted transition-colors uppercase shadow-xs"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !fromCode.trim() || !toCode.trim()}
          className="w-full sm:w-auto px-6 py-2.5 bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 text-accent-ink rounded-pill text-xs font-semibold cursor-pointer transition-opacity shrink-0 flex items-center justify-center gap-1.5 shadow-xs"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              <span>Find Trains</span>
            </>
          )}
        </button>
      </form>

      {/* Train Results List */}
      <div className="space-y-2 pt-1">
        {loading ? (
          <div className="p-8 text-center space-y-2">
            <Loader2 className="w-5 h-5 text-accent motion-safe:animate-spin mx-auto" />
            <p className="text-xs text-muted font-outlier">Finding express trains connecting {fromCode} and {toCode}…</p>
          </div>
        ) : trains.length > 0 ? (
          <div className="divide-y divide-rule/70 border border-rule/80 rounded-2xl overflow-hidden bg-paper shadow-xs">
            {trains.map((train) => {
              const isRunning = train.service_state === "RUNNING";
              const isNotRunningToday = train.service_state === "NOT_RUNNING_TODAY";
              const isCompleted = train.service_state === "COMPLETED";

              return (
                <div
                  key={train.train_number}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-paper-2/50 transition-colors"
                >
                  {/* Train Identity */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-outlier font-bold text-xs text-ink px-2 py-0.5 rounded-md bg-paper-2 border border-rule">
                        #{train.train_number}
                      </span>
                      <h4 className="font-display font-semibold text-sm text-ink truncate">
                        {train.train_name}
                      </h4>
                      <span
                        className={`text-[10px] font-outlier px-2 py-0.5 rounded-pill border shrink-0 ${
                          train.train_type === "Vande Bharat"
                            ? "bg-accent/10 text-accent border-accent/20 font-bold"
                            : train.train_type === "Rajdhani"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold"
                            : "bg-paper-2 text-muted border-rule"
                        }`}
                      >
                        {train.train_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted font-outlier">
                      <span>
                        Route: <strong className="text-ink">{train.origin}</strong> &rarr; <strong className="text-ink">{train.destination}</strong>
                      </span>
                      <span>•</span>
                      <span>MPS: {train.mps_speed} km/h</span>
                    </div>
                  </div>

                  {/* Timetable Times */}
                  <div className="flex items-center gap-6 text-xs font-outlier shrink-0">
                    <div>
                      <span className="text-[10px] text-muted block">Departure</span>
                      <span className="text-sm font-bold text-ink">{train.dep_time} IST</span>
                    </div>

                    <span className="text-muted">&rarr;</span>

                    <div>
                      <span className="text-[10px] text-muted block">Arrival</span>
                      <span className="text-sm font-bold text-ink">{train.arr_time} IST</span>
                    </div>

                    {/* Status Pill */}
                    <div className="min-w-24 text-right">
                      <span
                        className={`text-[11px] font-outlier px-2.5 py-0.5 rounded-pill border inline-block ${
                          isNotRunningToday
                            ? "bg-bad/10 text-bad border-bad/20 font-medium"
                            : isRunning
                            ? "bg-ok/10 text-ok border-ok/20 font-semibold"
                            : isCompleted
                            ? "bg-paper-2 text-muted border-rule"
                            : "bg-cool/10 text-cool border-cool/20"
                        }`}
                      >
                        {isNotRunningToday
                          ? "No run today"
                          : isRunning
                          ? "Due en route"
                          : isCompleted
                          ? "Arrived"
                          : "Scheduled"}
                      </span>
                    </div>

                    {/* Track Button */}
                    <Link
                      href={`/train?number=${train.train_number}`}
                      className="px-3.5 py-1.5 rounded-pill bg-accent hover:opacity-90 active:opacity-80 text-accent-ink text-xs font-semibold flex items-center gap-1 transition-opacity shrink-0"
                    >
                      <span>Track</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : searched ? (
          <div className="p-8 text-center space-y-2 border border-rule rounded-2xl bg-paper">
            <p className="text-xs font-semibold text-ink">No direct express trains found between {fromCode} and {toCode}</p>
            <p className="text-[11px] text-muted font-outlier">Try major junction codes like CSMT, PUNE, SUR, NDLS, BSB, HWH, or ADI.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
