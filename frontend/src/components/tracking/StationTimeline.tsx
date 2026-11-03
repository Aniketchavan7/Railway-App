import { StationHalt } from "@/lib/types";
import { CheckCircle2, Clock, MapPin, AlertCircle } from "lucide-react";

interface StationTimelineProps {
  halts: StationHalt[];
  currentStation?: string | null;
}

export function StationTimeline({ halts, currentStation }: StationTimelineProps) {
  if (!halts || halts.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
        No halting stations data available for this journey.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
        <span>Route Halts & Platform Timeline</span>
        <span className="text-xs font-normal text-slate-500 lowercase">
          {halts.length} stations
        </span>
      </h3>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {halts.map((h, idx) => {
          const isPassed = h.has_departed;
          const isCurrent =
            h.has_arrived && !h.has_departed ||
            (currentStation &&
              (currentStation.includes(h.station_code) ||
                currentStation.includes(h.station_name)));

          return (
            <div key={`${h.station_code}-${idx}`} className="relative group">
              {/* Marker Icon */}
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  isCurrent
                    ? "bg-blue-600 ring-4 ring-blue-100 text-white"
                    : isPassed
                    ? "bg-emerald-500 text-white"
                    : "bg-white border-2 border-slate-300 text-slate-400"
                }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : isCurrent ? (
                  <MapPin className="w-3 h-3 animate-bounce" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                )}
              </div>

              {/* Station Info */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? "bg-blue-50/70 border-blue-200 shadow-sm"
                    : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {h.station_name}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/70 text-slate-700">
                      {h.station_code}
                    </span>
                    {h.platform && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        PF #{h.platform}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    {h.distance_km} km • Day {h.day_count}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-slate-400">Sch Arr: </span>
                    <span className="font-medium text-slate-700">
                      {h.arrival_time || "--"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Sch Dep: </span>
                    <span className="font-medium text-slate-700">
                      {h.departure_time || "--"}
                    </span>
                  </div>

                  {h.delay_minutes > 0 ? (
                    <div className="flex items-center gap-1 font-semibold text-amber-700">
                      <AlertCircle className="w-3 h-3" />
                      <span>{h.delay_minutes}m late</span>
                    </div>
                  ) : (
                    <span className="font-medium text-emerald-600">On time</span>
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
