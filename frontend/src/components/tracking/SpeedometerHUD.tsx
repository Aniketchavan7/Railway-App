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
  const maxDialSpeed = Math.max(160, maxPermissibleSpeedKmH + 20);
  const clampedSpeed = Math.min(Math.max(speedKmH, 0), maxDialSpeed);
  const percentage = clampedSpeed / maxDialSpeed;
  const strokeDashoffset = 314 - percentage * 250;

  const trendColor =
    speedTrend === "accelerating"
      ? "text-ok border-ok/30 bg-ok-soft"
      : speedTrend === "braking"
      ? "text-accent border-accent/30 bg-accent-soft"
      : speedTrend === "cruising"
      ? "text-cool border-cool/30 bg-cool-soft"
      : "text-muted border-rule bg-paper-3";

  const trendLabel =
    speedTrend === "accelerating"
      ? "Accelerating"
      : speedTrend === "braking"
      ? "Decelerating / braking"
      : speedTrend === "cruising"
      ? "Cruising speed"
      : "Train halted / station";

  return (
    <div
      className={`rounded-card border border-rule transition-colors ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-paper/95 p-8 flex flex-col justify-center items-center"
          : "bg-paper-2 p-5"
      }`}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-accent shrink-0" />
          <div>
            <h3 className="text-sm md:text-base font-display font-bold text-ink flex items-center gap-2">
              GPS HUD speedometer
              {speedKmH >= 110 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-pill text-[10px] font-outlier font-semibold bg-accent-soft text-accent border border-accent/30">
                  <Flame className="w-3 h-3 mr-0.5 text-accent" /> High speed
                </span>
              )}
            </h3>
            <p className="text-xs text-muted font-outlier">
              Real-time telemetry velocity with Section MPS limit
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-pill border border-rule bg-paper-3 text-muted hover:text-ink transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
          title={isFullscreen ? "Exit fullscreen HUD" : "Enter fullscreen HUD"}
          aria-label={isFullscreen ? "Exit fullscreen HUD" : "Enter fullscreen HUD"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Gauge & Metrics Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center w-full max-w-4xl">
        {/* Left: Speed Dynamics & Section MPS */}
        <div className="flex flex-col gap-3 order-2 md:order-1 text-xs">
          <div className="p-3.5 rounded-lg bg-paper-3 border border-rule">
            <div className="text-[11px] text-muted mb-1 flex items-center gap-1.5 font-outlier">
              <Activity className="w-3.5 h-3.5 text-cool" />
              <span>Dynamic state</span>
            </div>
            <div className={`inline-block px-2.5 py-1 rounded-pill text-xs font-semibold font-outlier border ${trendColor}`}>
              {trendLabel}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-paper-3 border border-rule">
            <div className="text-[11px] text-muted mb-1 flex items-center gap-1.5 font-outlier">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span>Section permissible MPS</span>
            </div>
            <div className="text-lg font-bold text-ink font-outlier">
              {maxPermissibleSpeedKmH} <span className="text-xs font-normal text-muted">km/h</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-paper-3 border border-rule">
            <div className="text-[11px] text-muted mb-1 flex items-center gap-1.5 font-outlier">
              <Flame className="w-3.5 h-3.5 text-accent" />
              <span>Peak speed recorded</span>
            </div>
            <div className="text-lg font-bold text-accent font-outlier">
              {Math.round(maxSpeedRecorded)} <span className="text-xs font-normal text-muted">km/h</span>
            </div>
          </div>
        </div>

        {/* Center: Radial Dial with Massive Digital Speedometer */}
        <div className="relative flex flex-col items-center justify-center order-1 md:order-2">
          {/* Radial SVG Dial */}
          <div className="relative w-48 h-48 md:w-56 md:h-56">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 120 120"
              aria-hidden="true"
            >
              {/* Dial Track */}
              <circle
                cx="60"
                cy="60"
                r="50"
                className="stroke-paper-3"
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
                className={`transition-colors duration-500 ease-out ${
                  speedKmH >= 120
                    ? "stroke-accent"
                    : speedKmH >= 80
                    ? "stroke-ok"
                    : "stroke-cool"
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
              <span className="text-5xl md:text-6xl font-bold tracking-tight text-ink font-outlier">
                {Math.round(speedKmH)}
              </span>
              <span className="text-xs font-medium text-muted font-outlier mt-0.5">
                km/h
              </span>
            </div>
          </div>

          <div className="text-[11px] text-muted text-center mt-2 font-outlier">
            Live telemetry velocity
          </div>
        </div>

        {/* Right: Train Identity & Heading */}
        <div className="flex flex-col gap-3 order-3 text-xs">
          <div className="p-3.5 rounded-lg bg-paper-3 border border-rule">
            <div className="text-[11px] text-muted mb-1 font-outlier">Rake & service</div>
            <div className="font-semibold text-ink text-sm truncate">
              {trainName || "Indian Railways service"}
            </div>
            <div className="text-xs text-accent font-outlier mt-0.5">
              Train #{trainNumber || "—"}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-paper-3 border border-rule">
            <div className="text-[11px] text-muted mb-1 flex items-center gap-1.5 font-outlier">
              <Compass className="w-3.5 h-3.5 text-cool" />
              <span>Bearing / heading</span>
            </div>
            <div className="text-sm font-semibold text-ink font-outlier">
              {Math.round(directionDegrees)}°{" "}
              <span className="text-xs text-muted font-normal">
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

          <div className="p-3.5 rounded-lg bg-paper-3 border border-rule">
            <div className="text-[11px] text-muted mb-1 font-outlier">Pacing status</div>
            <div className="text-xs text-muted leading-relaxed">
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
