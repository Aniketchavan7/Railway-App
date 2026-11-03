import { StationHalt } from "@/lib/types";
import { CheckCircle2, MapPin, AlertCircle } from "lucide-react";

interface StationTimelineProps {
  halts: StationHalt[];
  currentStation?: string | null;
}

export function StationTimeline({ halts, currentStation }: StationTimelineProps) {
  if (!halts || halts.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted bg-paper-2 rounded-card border border-rule">
        No halting stations data available for this journey.
      </div>
    );
  }

  return (
    <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-5">
      <h3 className="text-sm font-display font-bold text-ink mb-4 flex items-center justify-between">
        <span>Route halts and platform timeline</span>
        <span className="text-xs font-normal text-muted font-outlier">
          {halts.length} stations
        </span>
      </h3>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-rule">
        {halts.map((h, idx) => {
          const isPassed = h.has_departed;
          const isCurrent =
            (h.has_arrived && !h.has_departed) ||
            Boolean(
              currentStation &&
                (currentStation.includes(h.station_code) ||
                  currentStation.includes(h.station_name))
            );

          return (
            <div key={`${h.station_code}-${idx}`} className="relative group">
              {/* Marker Icon */}
              <div
                className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                  isCurrent
                    ? "bg-accent text-accent-ink ring-2 ring-accent/30"
                    : isPassed
                    ? "bg-ok text-paper"
                    : "bg-paper-3 border border-rule text-muted"
                }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : isCurrent ? (
                  <MapPin className="w-2.5 h-2.5 text-accent-ink" />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-rule-2" />
                )}
              </div>

              {/* Station Info */}
              <div
                className={`p-3 rounded-pill border transition-colors ${
                  isCurrent
                    ? "bg-paper-3 border-accent"
                    : "bg-paper border-rule hover:border-rule-2"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-ink">
                      {h.station_name}
                    </span>
                    <span className="text-[11px] font-outlier px-1.5 py-0.2 rounded-pill bg-paper-3 text-muted border border-rule">
                      {h.station_code}
                    </span>
                    {h.platform && (
                      <span className="text-[10px] font-outlier px-1.5 py-0.2 rounded-pill bg-cool-soft text-cool border border-cool/30">
                        PF {h.platform}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-muted font-outlier">
                    {h.distance_km} km / Day {h.day_count}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted text-[11px]">Sch Arr: </span>
                    <span className="font-outlier text-ink">
                      {h.arrival_time || "--"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-[11px]">Sch Dep: </span>
                    <span className="font-outlier text-ink">
                      {h.departure_time || "--"}
                    </span>
                  </div>

                  {h.delay_minutes > 0 ? (
                    <div className="flex items-center gap-1 font-outlier text-accent text-[11px]">
                      <AlertCircle className="w-3 h-3" />
                      <span>{h.delay_minutes}m late</span>
                    </div>
                  ) : (
                    <span className="font-outlier text-ok text-[11px]">On time</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
