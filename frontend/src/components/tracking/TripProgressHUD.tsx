"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Gauge,
  Navigation,
  Clock,
  MapPin,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { StationHalt } from "@/lib/types";

interface TripProgressHUDProps {
  speedKmH: number;
  delayMinutes: number;
  halts?: StationHalt[];
  currentStationCode?: string | null;
  originStationName?: string;
  destStationName?: string;
  trainType?: string;
}

export function TripProgressHUD({
  speedKmH = 0,
  delayMinutes = 0,
  halts = [],
  currentStationCode,
  originStationName = "Origin",
  destStationName = "Destination",
  trainType = "Express",
}: TripProgressHUDProps) {
  // Determine MPS (Max Permissible Speed)
  const isVandeBharatOrRajdhani =
    trainType.toLowerCase().includes("vande") ||
    trainType.toLowerCase().includes("rajdhani") ||
    trainType.toLowerCase().includes("tejas") ||
    trainType.toLowerCase().includes("shatabdi");
  const mps = isVandeBharatOrRajdhani ? 130 : 110;

  // Calculate distance covered and remaining
  const totalDistanceKm =
    halts.length > 0 ? halts[halts.length - 1].distance_km : 400;

  const currentHaltIndex = halts.findIndex(
    (h) => h.station_code === currentStationCode || (h.has_arrived && !h.has_departed)
  );

  const currentKm =
    currentHaltIndex >= 0 && halts[currentHaltIndex]
      ? halts[currentHaltIndex].distance_km
      : Math.min(totalDistanceKm, Math.round(totalDistanceKm * 0.5));

  const distanceRemainingKm = Math.max(0, totalDistanceKm - currentKm);
  const progressPercent = totalDistanceKm > 0
    ? Math.min(100, Math.max(0, Math.round((currentKm / totalDistanceKm) * 100)))
    : 50;

  // Next Station
  const nextHalt =
    halts.find((h) => !h.has_arrived && !h.has_departed) ||
    (currentHaltIndex >= 0 && currentHaltIndex + 1 < halts.length
      ? halts[currentHaltIndex + 1]
      : halts[halts.length - 1]);

  const nextStationDistanceKm = nextHalt
    ? Math.max(0, nextHalt.distance_km - currentKm)
    : 0;

  const estimatedMinsToNext = speedKmH > 15
    ? Math.max(1, Math.round((nextStationDistanceKm / speedKmH) * 60))
    : Math.max(1, Math.round((nextStationDistanceKm / 60) * 60));

  // Gauge percentage
  const gaugePercent = Math.min(100, Math.max(0, (speedKmH / mps) * 100));

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-paper-2 border border-rule/80 shadow-xs space-y-5">
      {/* HUD Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Speedometer Section (5 Cols) */}
        <div className="md:col-span-5 flex items-center gap-5 p-4 rounded-xl bg-paper border border-rule/70">
          {/* Circular / Arc Gauge Graphic */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-paper-3"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress Arc */}
              <circle
                cx="50"
                cy="50"
                r="40"
                className={`transition-all duration-500 ${
                  speedKmH >= 110 ? "stroke-accent" : speedKmH > 40 ? "stroke-ok" : "stroke-cool"
                }`}
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * gaugePercent) / 100}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl sm:text-2xl font-bold font-outlier text-ink tabular-nums leading-none">
                {speedKmH}
              </span>
              <span className="text-[10px] font-outlier text-muted mt-0.5">km/h</span>
            </div>
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted font-outlier">
              <Gauge className="w-3.5 h-3.5 text-accent" />
              <span>Speedometer HUD</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-outlier px-2 py-0.5 rounded-pill bg-paper-3 border border-rule text-ink font-semibold">
                MPS: {mps} km/h
              </span>
              {speedKmH >= 110 && (
                <span className="text-[10px] font-outlier px-2 py-0.5 rounded-pill bg-accent/10 text-accent border border-accent/20 font-bold flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  <span>Cruising</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted truncate font-outlier">
              {speedKmH === 0
                ? "Station stop / zero velocity"
                : speedKmH > 100
                ? "High-speed line corridor"
                : "Transit speed between blocks"}
            </p>
          </div>
        </div>

        {/* Next Halt Countdown Card (7 Cols) */}
        {nextHalt && (
          <div className="md:col-span-7 p-4 rounded-xl bg-paper border border-rule/70 flex flex-col justify-between space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                <span className="text-xs font-outlier font-semibold uppercase tracking-wider text-muted">
                  Next Approaching Halt
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-outlier font-bold px-2.5 py-0.5 rounded-pill bg-paper-3 border border-rule text-ink">
                  {nextHalt.platform ? `PF ${nextHalt.platform}` : "PF TBA"}
                </span>
                <span
                  className={`text-xs font-outlier px-2.5 py-0.5 rounded-pill border ${
                    delayMinutes > 0
                      ? "bg-accent/10 text-accent border-accent/20 font-semibold"
                      : "bg-ok/10 text-ok border-ok/20 font-medium"
                  }`}
                >
                  {delayMinutes > 0 ? `+${delayMinutes}m delay` : "On time"}
                </span>
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h4 className="text-base sm:text-lg font-display font-bold text-ink">
                  {nextHalt.station_name} ({nextHalt.station_code})
                </h4>
                <div className="flex items-center gap-3 text-xs text-muted font-outlier mt-0.5">
                  <span>
                    Scheduled:{" "}
                    <strong className="text-ink">
                      {nextHalt.arrival_time || nextHalt.departure_time || "--:--"}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Distance: <strong className="text-ink">{nextStationDistanceKm} km away</strong>
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-muted block font-outlier">Estimated Arrival</span>
                <span className="text-base sm:text-lg font-bold font-outlier text-accent">
                  ~{estimatedMinsToNext} mins
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trip Journey Progress Bar */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-outlier text-muted">
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            <span>{originStationName}</span>
            <span>&rarr;</span>
            <span>{destStationName}</span>
          </span>
          <span>
            <strong className="text-ink">{progressPercent}%</strong> Completed ({currentKm} of {totalDistanceKm} km • {distanceRemainingKm} km remaining)
          </span>
        </div>

        {/* Multi-segmented animated bar */}
        <div className="w-full h-2.5 bg-paper rounded-pill border border-rule/70 overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-accent rounded-pill relative"
          />
        </div>
      </div>
    </div>
  );
}
