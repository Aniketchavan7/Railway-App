"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { createTrainWebSocket } from "@/lib/ws";
import { RailwayStatus, TelemetryPacket } from "@/lib/types";
import { FreshnessBadge } from "@/components/tracking/FreshnessBadge";
import { LocationTypePill } from "@/components/tracking/LocationTypePill";
import { StationTimeline } from "@/components/tracking/StationTimeline";
import { TrainMap } from "@/components/map/TrainMap";
import {
  Train,
  Clock,
  Gauge,
  MapPin,
  RefreshCw,
  AlertTriangle,
  LayoutGrid,
  Calculator,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";

interface PageProps {
  params: Promise<{ trainNumber: string }>;
}

export default function TrainTrackingPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const trainNumber = resolvedParams.trainNumber;

  const [status, setStatus] = useState<RailwayStatus | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  // Initial HTTP Fetch
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

  // WebSocket Live Subscription
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
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">
          Retrieving telemetry for train {trainNumber}...
        </p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-red-200 text-center space-y-4 shadow-sm">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">
          Telemetry Unavailable
        </h2>
        <p className="text-sm text-slate-600">
          {error || `Unable to fetch status for train ${trainNumber}. Please verify the number.`}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={fetchStatus}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simulation / Verification Notice Banner */}
      <LocationTypePill
        locationType={status.location_type}
        isSimulated={status.is_simulated}
      />

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold px-2.5 py-1 rounded bg-slate-900 text-white">
                #{status.train_number}
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {status.train_name}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Journey Date: <strong>{status.journey_date}</strong> • Running Status:{" "}
              <strong className="text-slate-800">{status.running_status}</strong>
            </p>
          </div>

          {/* Quick Actions & Live WS Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                wsStatus === "connected"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-slate-100 border-slate-200 text-slate-600"
              }`}
            >
              {wsStatus === "connected" ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Live Stream Active</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Connecting Stream...</span>
                </>
              )}
            </div>

            <button
              onClick={fetchStatus}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Current Delay */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Delay Status
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`text-lg font-black ${
                  status.delay_minutes > 0 ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                {status.delay_minutes > 0
                  ? `+${status.delay_minutes} mins`
                  : "On Time"}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {status.delay_minutes > 0 ? "behind schedule" : "at speed"}
              </span>
            </div>
          </div>

          {/* Current Location */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Current Location
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-sm font-bold text-slate-800 line-clamp-1">
                {status.current_station || "In Transit"}
              </span>
            </div>
          </div>

          {/* Next Station */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Next Scheduled Halt
            </span>
            <div className="mt-1 text-sm font-bold text-slate-800 line-clamp-1">
              {status.next_station || "Terminus"}
            </div>
          </div>

          {/* Speedometer */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Speedometer
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-900">
                {status.speed_kmph ?? 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">km/h</span>
            </div>
          </div>
        </div>

        {/* Freshness & Attribution Footer */}
        <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <FreshnessBadge
            freshness={status.freshness}
            observedAt={status.observed_at}
            sourceProvider={status.source_provider}
            lastReportedStation={status.current_station}
          />

          <div className="flex items-center gap-2">
            <Link
              href={`/coach?train=${status.train_number}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Coach Composition</span>
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              href={`/fare?train=${status.train_number}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calculate Fare</span>
            </Link>
          </div>
        </div>
      </div>

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
