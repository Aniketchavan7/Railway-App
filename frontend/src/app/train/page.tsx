"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { createTrainWebSocket } from "@/lib/ws";
import { RailwayStatus, TelemetryPacket } from "@/lib/types";
import { FreshnessBadge } from "@/components/tracking/FreshnessBadge";
import { LocationTypePill } from "@/components/tracking/LocationTypePill";
import { StationTimeline } from "@/components/tracking/StationTimeline";
import { CrowdTelemetryReporter } from "@/components/tracking/CrowdTelemetryReporter";
import { TrainMap } from "@/components/map/TrainMap";
import {
  Train,
  MapPin,
  RefreshCw,
  AlertTriangle,
  LayoutGrid,
  Calculator,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";

function TrainTrackingContent() {
  const searchParams = useSearchParams();
  const trainNumber = searchParams.get("number") || searchParams.get("train") || "12101";

  const [status, setStatus] = useState<RailwayStatus | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTrainStatus(trainNumber);
      setStatus(data);

      try {
        const route = await api.getTrainRoute(trainNumber);
        setRouteData(route);
      } catch {
        // Non-critical route geometry error
      }
    } catch (err: any) {
      setError(err.message || "Failed to load train status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [trainNumber]);

  useEffect(() => {
    const ws = createTrainWebSocket(
      trainNumber,
      (packet: TelemetryPacket) => {
        if (packet.telemetry) {
          setStatus(packet.telemetry);
        }
      },
      (newStatus) => {
        setWsStatus(newStatus);
      }
    );

    return () => {
      ws.disconnect();
    };
  }, [trainNumber]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-6 h-6 text-accent motion-safe:animate-spin motion-reduce:animate-none" />
        <p className="text-xs text-muted font-outlier">
          Checking train {trainNumber} status…
        </p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-paper-2 rounded-card border border-bad text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-bad mx-auto" />
        <h2 className="text-lg font-display font-bold text-ink">
          Status unavailable
        </h2>
        <p className="text-xs text-muted">
          {error || `Unable to fetch status for train ${trainNumber}. Please verify the number.`}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="px-4 py-2 bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink rounded-pill text-xs font-medium cursor-pointer transition-opacity focus-visible:outline-2 focus-visible:outline-accent"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-paper-3 hover:bg-paper active:bg-paper-2 text-ink rounded-pill text-xs font-medium border border-rule transition-colors focus-visible:outline-2 focus-visible:outline-accent"
          >
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LocationTypePill
        locationType={status.location_type}
        isSimulated={status.is_simulated}
        sourceProvider={status.source_provider}
      />

      {/* Main Header Card */}
      <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <span className="text-xs font-outlier font-bold px-2 py-0.5 rounded-pill bg-paper-3 text-ink border border-rule">
                #{status.train_number}
              </span>
              <h1 className="text-lg sm:text-2xl font-display font-bold text-ink tracking-tight">
                {status.train_name}
              </h1>
            </div>
            <p className="text-xs text-muted font-normal">
              Journey date: <strong className="text-ink font-outlier">{status.journey_date}</strong> / Running status:{" "}
              <strong className="text-ink font-medium">{status.running_status}</strong>
            </p>
          </div>

          {/* Quick Actions & Live WS Indicator */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-outlier border ${
                wsStatus === "connected"
                  ? "bg-ok-soft border-ok/30 text-ok"
                  : "bg-paper-3 border-rule text-muted"
              }`}
            >
              {wsStatus === "connected" ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-ok" />
                  <span>Live stream active</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-muted" />
                  <span>Connecting stream…</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={fetchStatus}
              disabled={loading}
              className="p-1.5 rounded-pill border border-rule bg-paper-3 hover:bg-paper active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-muted hover:text-ink transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
              title="Refresh status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-rule grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Current Delay */}
          <div className="p-3 rounded-pill bg-paper-3 border border-rule">
            <span className="text-[11px] text-muted block font-medium">
              Delay status
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`text-base font-outlier font-bold ${
                  status.delay_minutes > 0 ? "text-accent" : "text-ok"
                }`}
              >
                {status.delay_minutes > 0
                  ? `+${status.delay_minutes} mins`
                  : "On time"}
              </span>
              <span className="text-[10px] text-muted">
                {status.delay_minutes > 0 ? "behind schedule" : "normal speed"}
              </span>
            </div>
          </div>

          {/* Current Location */}
          <div className="p-3 rounded-pill bg-paper-3 border border-rule">
            <span className="text-[11px] text-muted block font-medium">
              Current location
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cool shrink-0" />
              <span className="text-xs font-semibold text-ink line-clamp-1">
                {status.current_station || "In transit"}
              </span>
            </div>
          </div>

          {/* Next Station */}
          <div className="p-3 rounded-pill bg-paper-3 border border-rule">
            <span className="text-[11px] text-muted block font-medium">
              Next station
            </span>
            <div className="mt-1 text-xs font-semibold text-ink line-clamp-1">
              {status.next_station || "Terminus"}
            </div>
          </div>

          {/* Speedometer */}
          <div className="p-3 rounded-pill bg-paper-3 border border-rule">
            <span className="text-[11px] text-muted block font-medium">
              Speed
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-base font-outlier font-bold text-ink">
                {status.speed_kmph ?? 0}
              </span>
              <span className="text-xs text-muted">km/h</span>
            </div>
          </div>
        </div>

        {/* Freshness & Attribution Footer */}
        <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-rule/50">
          <FreshnessBadge
            freshness={status.freshness}
            observedAt={status.observed_at}
            sourceProvider={status.source_provider}
            lastReportedStation={status.current_station}
          />

          <div className="flex items-center gap-3">
            <Link
              href={`/coach/?train=${status.train_number}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Coach composition</span>
            </Link>
            <span className="text-rule-2">/</span>
            <Link
              href={`/fare/?train=${status.train_number}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calculate fare</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Crowd-Sourced Passenger GPS Telemetry Relay */}
      <CrowdTelemetryReporter
        trainNumber={status.train_number}
        trainName={status.train_name}
        onTelemetryRelayed={fetchStatus}
      />

      {/* Map & Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <TrainMap status={status} routeData={routeData} />
        </div>

        <div className="lg:col-span-5 space-y-4">
          <StationTimeline
            halts={status.halts}
            currentStation={status.current_station}
          />
        </div>
      </div>
    </div>
  );
}

export default function TrainTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
          <Loader2 className="w-6 h-6 text-accent motion-safe:animate-spin motion-reduce:animate-none" />
          <p className="text-xs text-muted font-outlier">Loading train status…</p>
        </div>
      }
    >
      <TrainTrackingContent />
    </Suspense>
  );
}
