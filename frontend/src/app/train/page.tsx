"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { createTrainWebSocket } from "@/lib/ws";
import { RailwayAlert, RailwayStatus, TelemetryPacket } from "@/lib/types";
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
  Map,
  ListOrdered,
  Radio,
  Clock,
  Gauge,
} from "lucide-react";

function TrainTrackingContent() {
  const searchParams = useSearchParams();
  const trainNumber =
    searchParams.get("number") || searchParams.get("train") || "12101";

  const [status, setStatus] = useState<RailwayStatus | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>(
    null
  );
  const [mobileTab, setMobileTab] = useState<"map" | "timeline" | "gps">("map");
  const [showGpsReporter, setShowGpsReporter] = useState(false);
  const [disruptions, setDisruptions] = useState<RailwayAlert[]>([]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTrainStatus(trainNumber);
      setStatus(data);

      try {
        const [route, alerts] = await Promise.all([
          api.getTrainRoute(trainNumber).catch(() => null),
          api.getTrainDisruptions(trainNumber).catch(() => []),
        ]);
        if (route) setRouteData(route);
        if (alerts) setDisruptions(alerts);
      } catch {
        // Non-critical supplementary data error
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
          {error ||
            `Unable to fetch status for train ${trainNumber}. Please verify the number.`}
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

  const originHalt = status.halts && status.halts.length > 0 ? status.halts[0] : null;
  const destHalt =
    status.halts && status.halts.length > 0
      ? status.halts[status.halts.length - 1]
      : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tactical Train Command Console Header */}
      <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="text-xs font-outlier font-bold px-2 py-0.5 rounded-pill bg-paper-3 text-ink border border-rule">
                #{status.train_number}
              </span>

              <h1 className="text-lg sm:text-2xl font-display font-bold text-ink tracking-tight">
                {status.train_name}
              </h1>

              <span
                className={`text-xs px-2.5 py-0.5 rounded-pill font-outlier font-semibold ${
                  status.delay_minutes > 0
                    ? "bg-accent-soft text-accent border border-accent/40"
                    : "bg-ok-soft text-ok border border-ok/40"
                }`}
              >
                {status.delay_minutes > 0
                  ? `+${status.delay_minutes}m late`
                  : "On time"}
              </span>

              <LocationTypePill
                locationType={status.location_type}
                isSimulated={status.is_simulated}
                sourceProvider={status.source_provider}
              />
            </div>

            <p className="text-xs text-muted font-normal">
              Journey date:{" "}
              <strong className="text-ink font-outlier">
                {status.journey_date}
              </strong>{" "}
              / Running status:{" "}
              <strong className="text-ink font-medium">
                {status.running_status}
              </strong>
            </p>
          </div>

          {/* Action Tools & WebSocket Light */}
          <div className="flex flex-wrap items-center gap-2">
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
              onClick={() => setShowGpsReporter((prev) => !prev)}
              className={`px-3 py-1 rounded-pill text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent ${
                showGpsReporter
                  ? "bg-accent text-accent-ink border-accent font-semibold"
                  : "bg-paper-3 hover:bg-paper text-ink border-rule"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Share location</span>
            </button>

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

        {/* Quick Express Switcher Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rule/50 text-xs">
          <span className="text-muted text-[11px] font-medium font-outlier">
            Live expresses:
          </span>
          {[
            { num: "22225", label: "22225 Solapur VB" },
            { num: "12101", label: "12101 Jnaneswari" },
            { num: "12951", label: "12951 Rajdhani" },
            { num: "12158", label: "12158 Hutatma" },
            { num: "22436", label: "22436 Vande Bharat" },
          ].map((item) => (
            <Link
              key={item.num}
              href={`/train?number=${item.num}`}
              className={`px-2.5 py-0.5 rounded-pill text-[11px] font-outlier transition-colors border ${
                trainNumber === item.num
                  ? "bg-accent text-accent-ink border-accent font-semibold"
                  : "bg-paper-3 text-muted hover:text-ink hover:bg-paper border-rule"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Active Disruption / Route Change / Mega Block Banner */}
        {disruptions.length > 0 && (
          <div className="p-3 sm:p-4 rounded-lg bg-accent/5 border border-accent/25 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-accent text-xs px-1.5 py-0.5 rounded bg-accent/15 border border-accent/30 font-outlier">
                  {disruptions[0].alert_type.replace(/_/g, " ")}
                </span>
                <strong className="text-ink font-semibold">{disruptions[0].title}</strong>
              </div>
              <p className="text-muted leading-relaxed">{disruptions[0].impact_description}</p>
              {disruptions[0].diverted_via && (
                <p className="text-ink font-medium">
                  <span className="text-muted font-normal">Diverted via:</span> {disruptions[0].diverted_via}
                </p>
              )}
              {disruptions[0].skipped_halts && disruptions[0].skipped_halts.length > 0 && (
                <p className="text-accent font-medium">
                  <span className="text-muted font-normal">Skipped halts:</span> {disruptions[0].skipped_halts.join(", ")}
                </p>
              )}
              <p className="text-ok font-medium">
                <span className="text-muted font-normal">Advisory:</span> {disruptions[0].action_advised}
              </p>
            </div>
          </div>
        )}

        {/* Visual Route Corridor Bar */}
        {originHalt && destHalt && (
          <div className="py-2.5 px-3 sm:px-4 rounded-pill bg-paper-3/50 border border-rule/60 flex items-center justify-between text-xs font-outlier">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-ink">{originHalt.station_code}</span>
              <span className="text-[11px] text-muted hidden sm:inline">
                ({originHalt.station_name})
              </span>
            </div>

            <div className="flex-1 mx-3 sm:mx-6 flex items-center gap-1 opacity-70">
              <span className="h-0.5 bg-rule-2 flex-1" />
              <div className="w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-accent/30 flex items-center justify-center shrink-0">
                <span className="w-1 h-1 rounded-full bg-paper" />
              </div>
              <span className="h-0.5 bg-rule-2 flex-1" />
            </div>

            <div className="flex items-center gap-1.5 text-right">
              <span className="text-[11px] text-muted hidden sm:inline">
                ({destHalt.station_name})
              </span>
              <span className="font-bold text-ink">{destHalt.station_code}</span>
            </div>
          </div>
        )}

        {/* Typographic KPI Telemetry Strip - Type not tiles, no card-in-card */}
        <div className="pt-3 border-t border-rule/70 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-rule text-xs">
          {/* Current Delay */}
          <div className="p-3 sm:px-4">
            <span className="text-[10px] text-muted block font-outlier">
              Delay status
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`text-lg sm:text-xl font-outlier font-bold tracking-tight ${
                  status.delay_minutes > 0 ? "text-accent" : "text-ok"
                }`}
              >
                {status.delay_minutes > 0
                  ? `+${status.delay_minutes}m`
                  : "On time"}
              </span>
              <span className="text-[10px] text-muted">
                {status.delay_minutes > 0 ? "behind schedule" : "normal run"}
              </span>
            </div>
          </div>

          {/* Current Location */}
          <div className="p-3 sm:px-4 pt-3 md:pt-3">
            <span className="text-[10px] text-muted block font-outlier">
              Current position
            </span>
            <div className="mt-1 text-sm sm:text-base font-semibold text-ink truncate">
              {status.current_station || "In transit"}
            </div>
            <span className="text-[10px] text-muted block">live telemetry</span>
          </div>

          {/* Next Station */}
          <div className="p-3 sm:px-4 pt-3 md:pt-3">
            <span className="text-[10px] text-muted block font-outlier">
              Next halt
            </span>
            <div className="mt-1 text-sm sm:text-base font-semibold text-ink truncate">
              {status.next_station || "Terminus"}
            </div>
            <span className="text-[10px] text-muted block">scheduled stop</span>
          </div>

          {/* Speed */}
          <div className="p-3 sm:px-4 pt-3 md:pt-3">
            <span className="text-[10px] text-muted block font-outlier">
              Speed
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-outlier font-bold text-ink tracking-tight">
                {status.speed_kmph ?? 0}
              </span>
              <span className="text-xs text-muted font-outlier">km/h</span>
            </div>
            <span className="text-[10px] text-muted block">instantaneous</span>
          </div>
        </div>

        {/* Freshness & Navigation Links */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-rule/50">
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
              <span>Coach layout</span>
            </Link>
            <span className="text-rule-2">/</span>
            <Link
              href={`/fare/?train=${status.train_number}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Fare calculator</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Onboard GPS Reporter Collapsible Drawer */}
      {showGpsReporter && (
        <div className="animate-in fade-in duration-200">
          <CrowdTelemetryReporter
            trainNumber={status.train_number}
            trainName={status.train_name}
            onTelemetryRelayed={fetchStatus}
          />
        </div>
      )}

      {/* Mobile Segmented View Switcher (<1024px) */}
      <div className="flex items-center gap-1 bg-paper-2 p-1 rounded-pill border border-rule lg:hidden text-xs">
        <button
          type="button"
          onClick={() => setMobileTab("map")}
          className={`flex-1 py-1.5 px-3 rounded-pill font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mobileTab === "map"
              ? "bg-accent text-accent-ink font-semibold"
              : "text-muted hover:text-ink"
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>Map radar</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("timeline")}
          className={`flex-1 py-1.5 px-3 rounded-pill font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mobileTab === "timeline"
              ? "bg-accent text-accent-ink font-semibold"
              : "text-muted hover:text-ink"
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Halts ({status.halts?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("gps")}
          className={`flex-1 py-1.5 px-3 rounded-pill font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mobileTab === "gps"
              ? "bg-accent text-accent-ink font-semibold"
              : "text-muted hover:text-ink"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>GPS</span>
        </button>
      </div>

      {/* Mobile GPS Tab Content */}
      {mobileTab === "gps" && (
        <div className="lg:hidden">
          <CrowdTelemetryReporter
            trainNumber={status.train_number}
            trainName={status.train_name}
            onTelemetryRelayed={fetchStatus}
          />
        </div>
      )}

      {/* Main Map & Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Map View */}
        <div
          className={`lg:col-span-7 ${
            mobileTab === "map" ? "block" : "hidden lg:block"
          }`}
        >
          <TrainMap
            status={status}
            routeData={routeData}
            selectedStationCode={selectedStationCode}
            onSelectStation={(code) => setSelectedStationCode(code)}
          />
        </div>

        {/* Station Timeline Itinerary */}
        <div
          className={`lg:col-span-5 ${
            mobileTab === "timeline" ? "block" : "hidden lg:block"
          }`}
        >
          <StationTimeline
            halts={status.halts}
            currentStation={status.current_station}
            selectedStationCode={selectedStationCode}
            onSelectStation={(code) => setSelectedStationCode(code)}
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
