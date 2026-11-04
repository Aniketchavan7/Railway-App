"use client";

import { StationHalt } from "@/lib/types";
import { Check, Train, AlertCircle } from "lucide-react";

interface StationTimelineProps {
  halts: StationHalt[];
  currentStation?: string | null;
  selectedStationCode?: string | null;
  onSelectStation?: (stationCode: string) => void;
  className?: string;
}

export function StationTimeline({
  halts,
  currentStation,
  selectedStationCode,
  onSelectStation,
  className = "",
}: StationTimelineProps) {
  if (!halts || halts.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted border border-rule rounded-card bg-paper-2">
        No station halting records available for this journey.
      </div>
    );
  }

  const departedCount = halts.filter((h) => h.has_departed).length;
  const totalHalts = halts.length;
  const progressPercent = Math.min(
    100,
    Math.round((departedCount / Math.max(1, totalHalts - 1)) * 100)
  );
  const totalDistance =
    halts.length > 1
      ? Math.round(halts[halts.length - 1].distance_km - halts[0].distance_km)
      : 0;

  return (
    <div
      className={`bg-paper-2 border border-rule rounded-card flex flex-col h-[360px] sm:h-[440px] md:h-[520px] overflow-hidden ${className}`}
    >
      {/* Ledger Header & Progress Rail */}
      <div className="p-3.5 sm:px-4 sm:pt-4 sm:pb-3 border-b border-rule shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-ink font-outlier">
              Timetable ledger
            </h3>
            <span className="text-[11px] text-muted font-outlier tabular-nums">
              ({departedCount} of {totalHalts} halts passed)
            </span>
          </div>

          {totalDistance > 0 && (
            <span className="text-xs text-muted font-outlier tabular-nums">
              {totalDistance} km
            </span>
          )}
        </div>

        {/* 1px Minimal Progress Track */}
        <div className="w-full bg-paper-3 h-1 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent origin-left transition-transform duration-300 motion-reduce:transition-none"
            style={{ transform: `scaleX(${progressPercent / 100})` }}
          />
        </div>
      </div>

      {/* Column Titles Bar (Editorial Ledger Alignment) */}
      <div className="grid grid-cols-12 gap-2 px-3.5 sm:px-4 py-2 border-b border-rule bg-paper-3/40 text-[10px] font-outlier text-muted shrink-0">
        <div className="col-span-6 sm:col-span-5 pl-4">Station</div>
        <div className="col-span-2 text-center">PF</div>
        <div className="col-span-2 text-right hidden sm:block">Distance</div>
        <div className="col-span-4 sm:col-span-3 text-right">Schedule</div>
      </div>

      {/* Scrollable Ledger Rows - Pure hairline dividers, no nested cards */}
      <div className="flex-1 overflow-y-auto divide-y divide-rule/40 scrollbar-thin">
        {halts.map((h, idx) => {
          const isPassed = h.has_departed;
          const isCurrent =
            (h.has_arrived && !h.has_departed) ||
            Boolean(
              currentStation &&
                (currentStation.includes(h.station_code) ||
                  currentStation.includes(h.station_name))
            );
          const isSelected = selectedStationCode === h.station_code;

          return (
            <div
              key={`${h.station_code}-${idx}`}
              onClick={() => onSelectStation?.(h.station_code)}
              className={`grid grid-cols-12 gap-2 items-center px-3.5 sm:px-4 py-2.5 text-xs cursor-pointer transition-colors ${
                isSelected
                  ? "bg-paper-3 text-ink"
                  : isCurrent
                  ? "bg-accent/10 text-ink"
                  : "hover:bg-paper-3/40 text-muted"
              }`}
            >
              {/* Station Name + Rail Marker */}
              <div className="col-span-6 sm:col-span-5 flex items-center gap-2 min-w-0">
                <div
                  className={`w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center text-[9px] ${
                    isCurrent
                      ? "bg-accent text-accent-ink ring-2 ring-accent/30"
                      : isPassed
                      ? "bg-ok text-paper"
                      : "border border-rule-2 bg-paper-3"
                  }`}
                >
                  {isCurrent ? (
                    <Train className="w-2 h-2 text-accent-ink" />
                  ) : isPassed ? (
                    <Check className="w-2.5 h-2.5 text-paper stroke-[3]" />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-rule-2" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className={`truncate font-medium text-xs ${
                        isCurrent
                          ? "text-accent font-semibold"
                          : isSelected
                          ? "text-ink font-semibold"
                          : "text-ink group-hover:text-accent"
                      }`}
                    >
                      {h.station_name}
                    </span>
                    <span className="text-[10px] font-outlier text-muted tabular-nums">
                      {h.station_code}
                    </span>
                  </div>
                </div>
              </div>

              {/* Platform */}
              <div className="col-span-2 text-center">
                {h.platform ? (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-outlier bg-paper-3 text-ink border border-rule/60 tabular-nums">
                    PF {h.platform}
                  </span>
                ) : (
                  <span className="text-muted/40 text-[10px]">--</span>
                )}
              </div>

              {/* Distance */}
              <div className="col-span-2 text-right hidden sm:block font-outlier text-[11px] text-muted tabular-nums">
                {h.distance_km} km
              </div>

              {/* Schedule (Arr / Dep / Delay) */}
              <div className="col-span-4 sm:col-span-3 text-right font-outlier tabular-nums space-y-0.5">
                <div className="text-[11px] text-ink">
                  {h.departure_time || h.arrival_time || "--:--"}
                </div>
                {h.delay_minutes > 0 ? (
                  <div className="text-[10px] text-accent flex items-center justify-end gap-1">
                    <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                    <span>+{h.delay_minutes}m</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-ok">On time</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
