"use client";

import { useEffect, useState } from "react";
import { FreshnessState } from "@/lib/types";
import { Clock, RefreshCw } from "lucide-react";

interface FreshnessBadgeProps {
  freshness: FreshnessState;
  observedAt: string;
  sourceProvider: string;
  lastReportedStation?: string | null;
}

export function FreshnessBadge({
  freshness,
  observedAt,
  sourceProvider,
  lastReportedStation,
}: FreshnessBadgeProps) {
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  useEffect(() => {
    function update() {
      try {
        const obs = new Date(observedAt).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((now - obs) / 1000));
        setElapsedSec(diff);
      } catch {
        setElapsedSec(0);
      }
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [observedAt]);

  const formatElapsed = (sec: number) => {
    if (sec < 60) return `${sec}s ago`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) return `${m}m ${s}s ago`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ago`;
  };

  const getBadgeStyle = () => {
    switch (freshness) {
      case "LIVE":
        return {
          bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
          dot: "bg-emerald-500 animate-pulse",
          label: "LIVE TELEMETRY",
        };
      case "RECENT":
        return {
          bg: "bg-blue-50 border-blue-200 text-blue-800",
          dot: "bg-blue-500",
          label: "RECENT DATA",
        };
      case "STALE":
        return {
          bg: "bg-amber-50 border-amber-200 text-amber-800",
          dot: "bg-amber-500",
          label: "STALE TELEMETRY",
        };
      default:
        return {
          bg: "bg-slate-100 border-slate-200 text-slate-700",
          dot: "bg-slate-400",
          label: "RECORDED",
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-semibold ${style.bg}`}
      >
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        <span>{style.label}</span>
      </div>

      <div className="flex items-center gap-1 text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>
          {formatElapsed(elapsedSec)}
          {lastReportedStation ? ` at ${lastReportedStation}` : ""}
        </span>
      </div>

      <div className="text-[11px] text-slate-400">
        Source: <span className="font-medium text-slate-600">{sourceProvider}</span>
      </div>
    </div>
  );
}
