"use client";

import React, { useState, useEffect } from "react";
import { Gauge, Zap, Maximize2, Minimize2, Flame, Compass, Activity } from "lucide-react";

interface SpeedometerHUDProps {
  speedKmH?: number;
  trainName?: string;
  trainNumber?: string;
  maxPermissibleSpeedKmH?: number;
  directionDegrees?: number;
}

export function SpeedometerHUD({
  speedKmH = 0,
  trainName = "",
  trainNumber = "",
  maxPermissibleSpeedKmH = 130,
  directionDegrees = 0,
}: SpeedometerHUDProps) {
  const [maxSpeedRecorded, setMaxSpeedRecorded] = useState<number>(speedKmH);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [prevSpeed, setPrevSpeed] = useState<number>(speedKmH);
  const [speedTrend, setSpeedTrend] = useState<"accelerating" | "braking" | "cruising" | "stopped">("stopped");

  // Keep track of top speed and trend
  useEffect(() => {
    if (speedKmH > maxSpeedRecorded) {
      setMaxSpeedRecorded(speedKmH);
    }

    if (speedKmH < 2) {
      setSpeedTrend("stopped");
    } else if (speedKmH > prevSpeed + 1.5) {
      setSpeedTrend("accelerating");
    } else if (speedKmH < prevSpeed - 1.5) {
      setSpeedTrend("braking");
    } else {
      setSpeedTrend("cruising");
    }
    setPrevSpeed(speedKmH);
  }, [speedKmH, maxSpeedRecorded, prevSpeed]);

  // Radial Dial Math
  // Speed mapped 0..160 km/h to angle -120 deg to +120 deg (240 deg sweep)
  const maxDialSpeed = Math.max(160, maxPermissibleSpeedKmH + 20);
  const clampedSpeed = Math.min(Math.max(speedKmH, 0), maxDialSpeed);
  const percentage = clampedSpeed / maxDialSpeed;
  const strokeDashoffset = 314 - percentage * 250; // arc circumference approximation

  const trendColor =
    speedTrend === "accelerating"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/40"
      : speedTrend === "braking"
      ? "text-amber-400 border-amber-500/30 bg-amber-950/40"
      : speedTrend === "cruising"
      ? "text-blue-400 border-blue-500/30 bg-blue-950/40"
      : "text-slate-400 border-slate-700 bg-slate-900/40";

  const trendLabel =
    speedTrend === "accelerating"
      ? "Accelerating"
      : speedTrend === "braking"
      ? "Decelerating / Braking"
      : speedTrend === "cruising"
      ? "Cruising Speed"
      : "Train Halted / Station";

  return (
    <div
      className={`rounded-xl border transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-950/95 p-8 flex flex-col justify-center items-center backdrop-blur-2xl"
          : "border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md"
      }`}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-semibold text-slate-100 flex items-center gap-2">
              GPS HUD Speedometer
              {speedKmH >= 110 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Flame className="w-3 h-3 mr-0.5 text-amber-400" /> HIGH SPEED
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Real-time telemetry velocity with Section MPS limit
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition"
          title={isFullscreen ? "Exit Fullscreen HUD" : "Enter Fullscreen HUD"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Gauge & Metrics Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center w-full max-w-4xl">
        {/* Left: Speed Dynamics & Section MPS */}
        <div className="flex flex-col gap-3 order-2 md:order-1">
          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              Dynamic State
            </div>
            <div className={`inline-block px-2.5 py-1 rounded text-xs font-semibold border ${trendColor}`}>
              {trendLabel}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Section Permissible MPS
            </div>
            <div className="text-lg font-bold text-slate-200">
              {maxPermissibleSpeedKmH} <span className="text-xs font-normal text-slate-400">km/h</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              Peak Speed Recorded
            </div>
            <div className="text-lg font-bold text-rose-300">
              {Math.round(maxSpeedRecorded)} <span className="text-xs font-normal text-slate-400">km/h</span>
            </div>
          </div>
        </div>

        {/* Center: Radial Dial with Massive Digital Speedometer */}
        <div className="relative flex flex-col items-center justify-center order-1 md:order-2">
          {/* Radial SVG Dial */}
          <div className="relative w-48 h-48 md:w-56 md:h-56">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              {/* Dial Track */}
              <circle
                cx="60"
                cy="60"
                r="50"
                className="stroke-slate-800"
                strokeWidth="8"
                fill="none"
                strokeDasharray="250 314"
                strokeLinecap="round"
              />
              {/* Dynamic Velocity Fill */}
              <circle
                cx="60"
                cy="60"
                r="50"
                className={`transition-all duration-700 ease-out ${
                  speedKmH >= 120
                    ? "stroke-amber-400"
                    : speedKmH >= 80
                    ? "stroke-emerald-400"
                    : "stroke-blue-500"
                }`}
                strokeWidth="8"
                fill="none"
                strokeDasharray="250 314"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>

            {/* Centered Digital Numbers */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-5xl md:text-6xl font-black tracking-tight text-white font-mono">
                {Math.round(speedKmH)}
              </span>
              <span className="text-xs md:text-sm font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
                KM / H
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center mt-2">
            Snapped from onboard GPS & crowd telemetry
          </div>
        </div>

        {/* Right: Train Identity & Heading */}
        <div className="flex flex-col gap-3 order-3">
          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1">Rake & Service</div>
            <div className="font-semibold text-slate-200 text-sm truncate">
              {trainName || "Indian Railways Service"}
            </div>
            <div className="text-xs text-blue-400 font-mono mt-0.5">
              Train #{trainNumber || "—"}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              Bearing / Heading
            </div>
            <div className="text-sm font-semibold text-slate-200">
              {Math.round(directionDegrees)}°{" "}
              <span className="text-xs text-slate-400 font-normal">
                ({directionDegrees >= 315 || directionDegrees < 45
                  ? "Northbound"
                  : directionDegrees < 135
                  ? "Eastbound"
                  : directionDegrees < 225
                  ? "Southbound"
                  : "Westbound"})
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1">Pacing Status</div>
            <div className="text-xs text-slate-300">
              {speedKmH > 70
                ? "Optimal clear section tracking"
                : speedKmH > 20
                ? "Yard / turnout speed restrictions"
                : "Halted at signal or platform"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
