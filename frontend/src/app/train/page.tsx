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
import { StationWakeupAlarm } from "@/components/tracking/StationWakeupAlarm";
import { TripShareModal } from "@/components/tracking/TripShareModal";
import { TrainMap } from "@/components/map/TrainMap";
import {
  Train,
  MapPin,
  RefreshCw,
  AlertCircle,
  Calculator,
  Loader2,
  Wifi,
  WifiOff,
  Map,
  ListOrdered,
  Radio,
  Clock,
  Bell,
  ArrowRight,
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
  const [showWakeupAlarm, setShowWakeupAlarm] = useState(false);
  const [disruptions, setDisruptions] = useState<RailwayAlert[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

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
        <Loader2 className="w-5 h-5 text-accent motion-safe:animate-spin motion-reduce:animate-none" />
        <p className="text-xs text-muted font-outlier tabular-nums">
          Checking train {trainNumber} status…
        </p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-paper-2 rounded-card border border-rule text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-accent mx-auto" />
        <h2 className="text-base font-display font-semibold text-ink">
          Train Status Unavailable
        </h2>
        <p className="text-xs text-muted leading-relaxed">
          {error ||
            `Unable to fetch live telemetry for train ${trainNumber}. Please verify the number.`}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="px-4 py-2 bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink rounded text-xs font-medium cursor-pointer transition-opacity focus-visible:outline-2 focus-visible:outline-accent"
          >
            Retry status
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-paper-3 hover:bg-paper active:bg-paper-2 text-ink rounded text-xs font-medium border border-rule transition-colors focus-visible:outline-2 focus-visible:outline-accent"
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
  const currentHalt =
    status.halts?.find((h) => h.station_code === status.current_station) ||
    status.halts?.find((h) => h.has_arrived && !h.has_departed) ||
    originHalt;
  const currentKm = currentHalt?.distance_km ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8 py-2">
      {/* Editorial Train Tracking Console Header */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="text-xs font-outlier font-bold px-2 py-0.5 rounded bg-paper-3 text-ink border border-rule tabular-nums">
                #{status.train_number}
              </span>

              <h1 className="text-xl sm:text-2xl font-display font-bold text-ink tracking-tight">
                {status.train_name}
              </h1>

              {status.service_state === "NOT_RUNNING_TODAY" || status.runs_today === false ? (
                <span className="text-xs px-2.5 py-0.5 rounded font-outlier font-medium bg-paper-3 text-bad border border-bad/30">
                  Non-operating day · Weekly maintenance
                </span>
              ) : status.service_state === "NOT_STARTED" ? (
                <span className="text-xs px-2.5 py-0.5 rounded font-outlier font-medium bg-paper-3 text-accent border border-accent/30">
                  Scheduled departure pending
                </span>
              ) : status.service_state === "COMPLETED" ? (
                <span className="text-xs px-2.5 py-0.5 rounded font-outlier font-medium bg-paper-3 text-ok border border-ok/30">
                  Journey terminated
                </span>
              ) : (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-outlier font-medium tabular-nums ${
                    status.delay_minutes > 0
                      ? "bg-paper-3 text-accent border border-accent/30"
                      : "bg-paper-3 text-ok border border-ok/30"
                  }`}
                >
                  {status.delay_minutes > 0
                    ? `+${status.delay_minutes}m late`
                    : "Running on time"}
                </span>
              )}

              <LocationTypePill
                locationType={status.location_type}
                isSimulated={status.is_simulated}
                sourceProvider={status.source_provider}
              />
            </div>
          </div>

          {/* Action Controls & Stream Indicator */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-outlier border ${
                wsStatus === "connected"
                  ? "bg-ok-soft/30 border-ok/30 text-ok"
                  : "bg-paper-3 border-rule text-muted"
              }`}
            >
              {wsStatus === "connected" ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-ok" aria-hidden="true" />
                  <span>Stream active</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                  <span>Connecting…</span>
                </>
              )}
            </div>

            <TripShareModal
              trainNumber={status.train_number}
              trainName={status.train_name}
              currentStationName={status.current_station}
              nextStationName={destHalt?.station_name}
              nextStationPlatform={destHalt?.platform}
              speedKmH={status.speed_kmph ?? 0}
              delayMinutes={status.delay_minutes}
            />

            <button
              type="button"
              onClick={() => setShowWakeupAlarm((prev) => !prev)}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${
                showWakeupAlarm
                  ? "bg-accent text-accent-ink border-accent font-semibold"
                  : "bg-paper-3 hover:bg-paper text-ink border-rule"
              }`}
            >
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Wakeup alarm</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGpsReporter((prev) => !prev)}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${
                showGpsReporter
                  ? "bg-accent text-accent-ink border-accent font-semibold"
                  : "bg-paper-3 hover:bg-paper text-ink border-rule"
              }`}
            >
              <Radio className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Share location</span>
            </button>

            <button
              type="button"
              onClick={fetchStatus}
              disabled={loading}
              className="p-1.5 rounded border border-rule bg-paper-3 hover:bg-paper active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-muted hover:text-ink transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
              title="Refresh status"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "motion-safe:animate-spin" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Quick Express Switcher Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rule text-xs">
          <span className="text-muted text-[11px] font-outlier uppercase tracking-wider">
            Expresses:
          </span>
          {[
            { num: "12951", label: "12951 Rajdhani (Daily)" },
            { num: "12158", label: "12158 Hutatma Morn" },
            { num: "12157", label: "12157 Hutatma Eve" },
            { num: "22225", label: "22225 Solapur VB" },
            { num: "12101", label: "12101 Jnaneswari" },
            { num: "22436", label: "22436 Vande Bharat" },
          ].map((item) => (
            <Link
              key={item.num}
              href={`/train?number=${item.num}`}
              className={`px-2 py-0.5 rounded text-[11px] font-outlier tabular-nums transition-colors border ${
                trainNumber === item.num
                  ? "bg-accent text-accent-ink border-accent font-semibold"
                  : "bg-paper-3 text-muted hover:text-ink hover:bg-paper border-rule"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Operational Days & Maintenance Advisory */}
        {(status.service_state === "NOT_RUNNING_TODAY" || status.runs_today === false) && (
          <div className="p-3.5 bg-paper-2 border border-rule border-l-2 border-l-bad text-xs space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-outlier font-semibold text-bad uppercase tracking-wider text-[10px]">
                Maintenance Day Advisory
              </span>
              <span className="text-muted">·</span>
              <strong className="text-ink font-semibold">{status.running_status}</strong>
            </div>
            <p className="text-muted leading-relaxed">
              {status.service_notice || `Train ${status.train_number} does not operate on this day of the week.`}
            </p>
            {status.days_of_run && status.days_of_run.length > 0 && (
              <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                <span className="text-muted font-outlier">Scheduled service days:</span>
                <div className="flex gap-1.5 font-outlier">
                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => {
                    const runs = status.days_of_run?.includes(day);
                    return (
                      <span
                        key={day}
                        className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                          runs
                            ? "bg-paper-3 text-ink border-rule font-semibold"
                            : "bg-transparent text-muted/30 border-transparent"
                        }`}
                      >
                        {day}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {status.pairing_train_number && (
              <p className="text-muted text-[11px] pt-0.5">
                Turnaround pair service:{" "}
                <Link
                  href={`/train?number=${status.pairing_train_number}`}
                  className="text-accent underline font-outlier font-semibold tabular-nums"
                >
                  Train #{status.pairing_train_number}
                </Link>
              </p>
            )}
          </div>
        )}

        {/* Not Started Yet Advisory */}
        {status.service_state === "NOT_STARTED" && (
          <div className="p-3.5 bg-paper-2 border border-rule border-l-2 border-l-accent text-xs space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-outlier font-semibold text-accent uppercase tracking-wider text-[10px]">
                Scheduled Origin Halt
              </span>
              <span className="text-muted">·</span>
              <strong className="text-ink font-semibold">{status.running_status}</strong>
            </div>
            <p className="text-muted leading-relaxed">
              {status.service_notice || `Train ${status.train_number} has not departed its origin station yet.`}
            </p>
            {status.pairing_train_number && (
              <p className="text-muted text-[11px] pt-0.5">
                Shared rake pair: Incoming service was{" "}
                <Link
                  href={`/train?number=${status.pairing_train_number}`}
                  className="text-accent underline font-outlier font-semibold tabular-nums"
                >
                  Train #{status.pairing_train_number}
                </Link>
              </p>
            )}
          </div>
        )}

        {/* Journey Completed Advisory */}
        {status.service_state === "COMPLETED" && (
          <div className="p-3.5 bg-paper-2 border border-rule border-l-2 border-l-ok text-xs space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-outlier font-semibold text-ok uppercase tracking-wider text-[10px]">
                Destination Reached
              </span>
              <span className="text-muted">·</span>
              <strong className="text-ink font-semibold">{status.running_status}</strong>
            </div>
            <p className="text-muted leading-relaxed">
              {status.service_notice || `Train ${status.train_number} has completed its scheduled journey.`}
            </p>
            {status.pairing_train_number && (
              <p className="text-muted text-[11px] pt-0.5">
                Turnaround rake next operates as:{" "}
                <Link
                  href={`/train?number=${status.pairing_train_number}`}
                  className="text-accent underline font-outlier font-semibold tabular-nums"
                >
                  Train #{status.pairing_train_number}
                </Link>
              </p>
            )}
          </div>
        )}

        {/* Route Disruption / Mega Block Notice */}
        {disruptions.length > 0 && (
          <div className="p-3.5 bg-paper-2 border border-rule border-l-2 border-l-accent text-xs space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-outlier font-semibold text-accent uppercase tracking-wider text-[10px]">
                {disruptions[0].alert_type.replace(/_/g, " ")}
              </span>
              <span className="text-muted">·</span>
              <strong className="text-ink font-semibold">{disruptions[0].title}</strong>
            </div>
            <p className="text-muted leading-relaxed">{disruptions[0].impact_description}</p>
            {disruptions[0].diverted_via && (
              <p className="text-ink">
                <span className="text-muted">Diverted via:</span> {disruptions[0].diverted_via}
              </p>
            )}
            {disruptions[0].skipped_halts && disruptions[0].skipped_halts.length > 0 && (
              <p className="text-accent">
                <span className="text-muted">Skipped halts:</span> {disruptions[0].skipped_halts.join(", ")}
              </p>
            )}
            <p className="text-ok">
              <span className="text-muted">Advisory:</span> {disruptions[0].action_advised}
            </p>
          </div>
        )}

        {/* Offline Satellite GPS Mode Notice */}
        {!isOnline && (
          <div className="p-3 bg-paper-2 border border-rule border-l-2 border-l-cool text-xs space-y-1">
            <div className="font-semibold text-cool font-outlier uppercase tracking-wider text-[10px]">
              Offline Satellite GPS Tracking
            </div>
            <p className="text-muted leading-relaxed">
              Cellular data connection is offline. RailPulse is actively tracking your train using device hardware satellite GPS fixes snapped to cached timetables with zero cellular data required.
            </p>
          </div>
        )}

        {/* Wakeup Alarm Drawer */}
        {showWakeupAlarm && (
          <div className="animate-in fade-in duration-150">
            <StationWakeupAlarm
              trainNumber={status.train_number}
              trainName={status.train_name}
              halts={(status.halts || []).map((h) => ({
                stationCode: h.station_code,
                stationName: h.station_name,
                distanceKm: h.distance_km,
                platform: h.platform,
                scheduledArrival: h.arrival_time,
                actualArrival: h.actual_arrival,
              }))}
              currentKm={currentKm}
              currentStationCode={status.current_station || ""}
              currentSpeedKmH={status.speed_kmph ?? 0}
            />
          </div>
        )}

        {/* Visual Route Corridor Bar */}
        {originHalt && destHalt && (
          <div className="py-2.5 px-3 border-y border-rule flex items-center justify-between text-xs font-outlier">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-ink tabular-nums">{originHalt.station_code}</span>
              <span className="text-[11px] text-muted hidden sm:inline">
                ({originHalt.station_name})
              </span>
            </div>

            <div className="flex-1 mx-4 sm:mx-8 flex items-center gap-1">
              <span className="h-px bg-rule flex-1" />
              <div className="w-2 h-2 rounded-full bg-accent flex items-center justify-center shrink-0" />
              <span className="h-px bg-rule flex-1" />
            </div>

            <div className="flex items-center gap-1.5 text-right">
              <span className="text-[11px] text-muted hidden sm:inline">
                ({destHalt.station_name})
              </span>
              <span className="font-bold text-ink tabular-nums">{destHalt.station_code}</span>
            </div>
          </div>
        )}

        {/* Typographic KPI Telemetry Strip (Hairline Columns, Tabular Numbers) */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-rule border-b border-rule pb-3 text-xs">
          {/* Current Delay */}
          <div className="py-2 md:px-4">
            <span className="text-[10px] text-muted uppercase tracking-wider block font-outlier">
              Delay status
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`text-xl font-outlier font-bold tracking-tight tabular-nums ${
                  status.delay_minutes > 0 ? "text-accent" : "text-ok"
                }`}
              >
                {status.delay_minutes > 0
                  ? `+${status.delay_minutes}m`
                  : "On time"}
              </span>
            </div>
          </div>

          {/* Current Location */}
          <div className="py-2 md:px-4">
            <span className="text-[10px] text-muted uppercase tracking-wider block font-outlier">
              Position
            </span>
            <div className="mt-1 text-sm sm:text-base font-semibold text-ink truncate">
              {status.current_station || "In transit"}
            </div>
          </div>

          {/* Next Halt */}
          <div className="py-2 md:px-4">
            <span className="text-[10px] text-muted uppercase tracking-wider block font-outlier">
              Next halt
            </span>
            <div className="mt-1 text-sm sm:text-base font-semibold text-ink truncate">
              {status.next_station || "Terminus"}
            </div>
          </div>

          {/* Speed */}
          <div className="py-2 md:px-4">
            <span className="text-[10px] text-muted uppercase tracking-wider block font-outlier">
              Telemetry speed
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-outlier font-bold text-ink tracking-tight tabular-nums">
                {status.speed_kmph ?? 0}
              </span>
              <span className="text-xs text-muted font-outlier">km/h</span>
            </div>
          </div>
        </div>

        {/* Freshness & Navigation Links */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <FreshnessBadge
            freshness={status.freshness}
            observedAt={status.observed_at}
            sourceProvider={status.source_provider}
            lastReportedStation={status.current_station}
          />

          <div className="flex items-center gap-3">
            <Link
              href={`/fare/?train=${status.train_number}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Fare calculator</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Onboard GPS Reporter Collapsible Drawer */}
      {showGpsReporter && (
        <div className="animate-in fade-in duration-150">
          <CrowdTelemetryReporter
            trainNumber={status.train_number}
            trainName={status.train_name}
            onTelemetryRelayed={fetchStatus}
          />
        </div>
      )}

      {/* Mobile Segmented View Switcher (<1024px) */}
      <div className="flex items-center gap-1 bg-paper-2 p-1 rounded border border-rule lg:hidden text-xs">
        <button
          type="button"
          onClick={() => setMobileTab("map")}
          className={`flex-1 py-1 px-3 rounded font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "map"
              ? "bg-paper-3 text-ink font-semibold"
              : "text-muted hover:text-ink"
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>Map radar</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("timeline")}
          className={`flex-1 py-1 px-3 rounded font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "timeline"
              ? "bg-paper-3 text-ink font-semibold"
              : "text-muted hover:text-ink"
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Halts ({status.halts?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("gps")}
          className={`flex-1 py-1 px-3 rounded font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "gps"
              ? "bg-paper-3 text-ink font-semibold"
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

      {/* Main Map & Timetable Ledger Grid */}
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

        {/* Station Timetable Ledger */}
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
          <Loader2 className="w-5 h-5 text-accent motion-safe:animate-spin motion-reduce:animate-none" />
          <p className="text-xs text-muted font-outlier">Loading train status…</p>
        </div>
      }
    >
      <TrainTrackingContent />
    </Suspense>
  );
}
