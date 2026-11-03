"use client";

import { useEffect, useState } from "react";
import { FreshnessState } from "@/lib/types";
import { Clock } from "lucide-react";

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
          bg: "bg-ok-soft border-ok/30 text-ok",
          dot: "bg-ok",
          label: "Live location",
        };
      case "RECENT":
        return {
          bg: "bg-cool-soft border-cool/30 text-cool",
          dot: "bg-cool",
          label: "Recent observation",
        };
      case "STALE":
        return {
          bg: "bg-accent-soft border-accent/30 text-accent",
          dot: "bg-accent",
          label: "Delayed update",
        };
      default:
        return {
          bg: "bg-paper-3 border-rule text-muted",
          dot: "bg-muted",
          label: "Recorded log",
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill border font-medium ${style.bg}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span className="font-outlier">{style.label}</span>
      </div>

      <div className="flex items-center gap-1 text-muted bg-paper-3 border border-rule px-2.5 py-0.5 rounded-pill font-outlier">
        <Clock className="w-3 h-3 text-muted" />
        <span>
          {formatElapsed(elapsedSec)}
          {lastReportedStation ? ` at ${lastReportedStation}` : ""}
        </span>
      </div>

      <div className="text-[11px] text-muted font-outlier">
        Source: <span className="text-ink">{sourceProvider}</span>
      </div>
    </div>
  );
}
