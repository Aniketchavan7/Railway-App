"use client";

import { motion } from "framer-motion";
import { Gauge } from "lucide-react";
import { RailwayStatus } from "@/lib/types";
import { delayLabel, formatIstTime, stationOnly } from "@/lib/format";

/** Shown only while a train is running. Unknown values stay unknown instead of being filled in. */
export function TripProgressHUD({ status }: { status: RailwayStatus }) {
  const halts = status.halts ?? [];
  const speed = status.speed_kmph;
  const nextHalt = halts.find((h) => h.station_code === status.next_station_code) ?? halts.find((h) => !h.has_arrived);
  const nextName = stationOnly(status.next_station) ?? nextHalt?.station_name;
  const eta = formatIstTime(status.next_eta);

  const minutesToNext = status.next_eta
    ? Math.round((new Date(status.next_eta).getTime() - Date.now()) / 60000)
    : null;

  const totalKm = halts.length ? halts[halts.length - 1].distance_km : 0;
  const lastArrived = [...halts].reverse().find((h) => h.has_arrived);
  const kmDone = lastArrived?.distance_km ?? 0;
  const percent =
    status.route_progress_percent ?? (totalKm > 0 && lastArrived ? (kmDone / totalKm) * 100 : null);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-paper-2 border border-rule/80 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-4 p-4 rounded-xl bg-paper border border-rule/70 flex items-center gap-3">
          <Gauge className="w-5 h-5 text-cool shrink-0" aria-hidden="true" />
          <div>
            <span className="text-[11px] text-muted font-outlier block">Speed</span>
            {speed != null ? (
              <span className="text-lg font-bold font-outlier text-ink tabular-nums">{Math.round(speed)} km/h</span>
            ) : (
              <span className="text-sm font-outlier text-muted">Not reported</span>
            )}
          </div>
        </div>

        {nextName && (
          <div className="sm:col-span-8 p-4 rounded-xl bg-paper border border-rule/70 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] text-muted font-outlier block">Next stop</span>
              <h4 className="text-base font-display font-bold text-ink truncate">{nextName}</h4>
              <span className="text-xs text-muted font-outlier">
                {delayLabel(status.delay_minutes)}
                {nextHalt?.platform ? ` · Platform ${nextHalt.platform} (may change)` : ""}
              </span>
            </div>
            {eta && (
              <div className="text-right shrink-0">
                <span className="text-[11px] text-muted block font-outlier">Expected</span>
                <span className="text-base font-bold font-outlier text-accent tabular-nums">{eta}</span>
                {minutesToNext !== null && minutesToNext > 0 && (
                  <span className="text-[11px] text-muted block font-outlier">in {minutesToNext} min</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {percent !== null && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-outlier text-muted">
            <span className="font-semibold text-ink">
              {status.origin_name || halts[0]?.station_name} → {status.destination_name || halts[halts.length - 1]?.station_name}
            </span>
            <span>
              <strong className="text-ink">{Math.round(percent)}%</strong> of stops completed
            </span>
          </div>
          <div className="w-full h-2.5 bg-paper rounded-pill border border-rule/70 overflow-hidden">
            <motion.div
              initial={false}
              animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-accent rounded-pill"
            />
          </div>
        </div>
      )}
    </div>
  );
}
