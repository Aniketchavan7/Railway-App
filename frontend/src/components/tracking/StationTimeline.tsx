"use client";

import { StationHalt } from "@/lib/types";
import { CheckCircle2, MapPin, AlertCircle, Train } from "lucide-react";

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
      <div className="p-6 text-center text-xs text-muted bg-paper-2 rounded-card border border-rule">
        No station halting data available for this journey.
      </div>
    );
  }

  // Calculate Journey Progress
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
      className={`bg-paper-2 rounded-card border border-rule p-4 sm:p-5 flex flex-col h-[360px] sm:h-[440px] md:h-[520px] ${className}`}
    >
      {/* Header & Progress Summary */}
      <div className="border-b border-rule pb-3.5 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-display font-bold text-ink flex items-center gap-2">
            <span>Route halts</span>
            <span className="text-[11px] font-normal text-muted font-outlier">
              ({departedCount}/{totalHalts} passed)
            </span>
          </h3>

          {totalDistance > 0 && (
            <span className="text-xs font-outlier text-muted">
              {totalDistance} km total
            </span>
          )}
        </div>

        {/* Progress Rail */}
        <div className="w-full bg-paper-3 h-1.5 rounded-full overflow-hidden border border-rule">
          <div
            className="h-full bg-accent origin-left transition-transform motion-reduce:transition-none"
            style={{ transform: `scaleX(${progressPercent / 100})` }}
          />
        </div>
      </div>

      {/* Scrollable Stations Rail */}
      <div className="flex-1 overflow-y-auto pt-4 pr-1 pl-4 space-y-3.5 scrollbar-thin">
        <div className="relative space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-rule">
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
                className="relative group cursor-pointer"
                onClick={() => onSelectStation?.(h.station_code)}
              >
                {/* Rail Node Marker */}
                <div
                  className={`absolute -left-4 top-2 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                    isCurrent
                      ? "bg-accent text-accent-ink ring-2 ring-accent/40"
                      : isPassed
                      ? "bg-ok text-paper"
                      : "bg-paper-3 border border-rule text-muted group-hover:border-accent"
                  }`}
                >
                  {isCurrent ? (
                    <Train className="w-2.5 h-2.5 text-accent-ink" />
                  ) : isPassed ? (
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-rule-2 group-hover:bg-accent" />
                  )}
                </div>

                {/* Station Info Row */}
                <div
                  className={`p-2.5 sm:p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? "bg-paper-3 border-accent ring-1 ring-accent"
                      : isCurrent
                      ? "bg-paper-3 border-accent"
                      : "bg-paper border-rule hover:border-rule-2 group-hover:bg-paper-3/50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="font-semibold text-xs text-ink group-hover:text-accent transition-colors">
                        {h.station_name}
                      </span>
                      <span className="text-[10px] font-outlier px-1.5 py-0.5 rounded-pill bg-paper-3 text-muted border border-rule">
                        {h.station_code}
                      </span>
                      {h.platform && (
                        <span className="text-[10px] font-outlier px-1.5 py-0.5 rounded-pill bg-cool-soft text-cool border border-cool/30">
                          PF {h.platform}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-muted font-outlier">
                      {h.distance_km} km
                    </div>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-muted text-[10px]">Arr: </span>
                      <span className="font-outlier text-ink text-[11px]">
                        {h.arrival_time || "--"}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted text-[10px]">Dep: </span>
                      <span className="font-outlier text-ink text-[11px]">
                        {h.departure_time || "--"}
                      </span>
                    </div>

                    {h.delay_minutes > 0 ? (
                      <div className="flex items-center gap-1 font-outlier text-accent text-[11px] ml-auto">
                        <AlertCircle className="w-3 h-3" />
                        <span>+{h.delay_minutes}m late</span>
                      </div>
                    ) : (
                      <span className="font-outlier text-ok text-[11px] ml-auto">
                        On time
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
