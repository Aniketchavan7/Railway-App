"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { createTrainWebSocket } from "@/lib/ws";
import { CoachComposition, RailwayAlert, RailwayStatus, TelemetryPacket } from "@/lib/types";
import { FreshnessBadge } from "@/components/tracking/FreshnessBadge";
import { LocationTypePill } from "@/components/tracking/LocationTypePill";
import { StationTimeline } from "@/components/tracking/StationTimeline";
import { CrowdTelemetryReporter } from "@/components/tracking/CrowdTelemetryReporter";
import { StationWakeupAlarm } from "@/components/tracking/StationWakeupAlarm";
import { SpeedometerHUD } from "@/components/tracking/SpeedometerHUD";
import { TripShareModal } from "@/components/tracking/TripShareModal";
import { CoachRake } from "@/components/coach/CoachRake";
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
  Bell,
  Share2,
  CheckCircle2,
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
  const [coachComposition, setCoachComposition] = useState<CoachComposition | null>(null);
  const [activePassengerTool, setActivePassengerTool] = useState<"none" | "alarm" | "speed" | "coach">("none");
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
        const [route, alerts, coaches] = await Promise.all([
          api.getTrainRoute(trainNumber).catch(() => null),
          api.getTrainDisruptions(trainNumber).catch(() => []),
          api.getCoachComposition(trainNumber).catch(() => null),
        ]);
        if (route) setRouteData(route);
        if (alerts) setDisruptions(alerts);
        if (coaches) setCoachComposition(coaches);
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
  const currentHalt =
    status.halts?.find((h) => h.station_code === status.current_station) ||
    status.halts?.find((h) => h.has_arrived && !h.has_departed) ||
    originHalt;
  const currentKm = currentHalt?.distance_km ?? 0;

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

              {status.service_state === "NOT_RUNNING_TODAY" || status.runs_today === false ? (
                <span className="text-xs px-2.5 py-0.5 rounded-pill font-outlier font-semibold bg-bad-soft text-bad border border-bad/40 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-bad" aria-hidden="true" />
                  <span>Non-operating day</span>
                </span>
              ) : status.service_state === "NOT_STARTED" ? (
                <span className="text-xs px-2.5 py-0.5 rounded-pill font-outlier font-semibold bg-accent-soft text-accent border border-accent/40 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-accent" aria-hidden="true" />
                  <span>Not started yet</span>
                </span>
              ) : status.service_state === "COMPLETED" ? (
                <span className="text-xs px-2.5 py-0.5 rounded-pill font-outlier font-semibold bg-ok-soft text-ok border border-ok/40">
                  Journey completed
                </span>
              ) : (
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
              )}

              <LocationTypePill
                locationType={status.location_type}
                isSimulated={status.is_simulated}
                sourceProvider={status.source_provider}
              />
            </div>

            {/* Operational Specifications */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="border-r border-rule pr-3">
                Service: <strong className="text-ink font-semibold">Superfast Express</strong>
              </span>
              <span className="border-r border-rule pr-3">
                Traction: <strong className="text-ink font-semibold">25 kV AC</strong>
              </span>
              <span className="border-r border-rule pr-3">
                Consist: <strong className="text-ink font-semibold">16 Coaches</strong>
              </span>
              <span className="border-r border-rule pr-3">
                Max speed: <strong className="text-accent font-semibold font-outlier">130 km/h</strong>
              </span>
              <span>
                Positioning: <strong className="text-ok font-semibold">GNSS Active</strong>
              </span>
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
                  <Wifi className="w-3.5 h-3.5 text-ok" aria-hidden="true" />
                  <span>Live stream active</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                  <span>Connecting stream…</span>
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
              onClick={() =>
                setActivePassengerTool((prev) => (prev === "speed" ? "none" : "speed"))
              }
              className={`px-3 py-1 rounded-pill text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${
                activePassengerTool === "speed"
                  ? "bg-accent text-accent-ink border-accent font-semibold"
                  : "bg-paper-3 hover:bg-paper text-ink border-rule"
              }`}
            >
              <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {status.service_state && status.service_state !== "RUNNING"
                  ? "0 km/h"
                  : `${Math.round(status.speed_kmph || 0)} km/h`}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActivePassengerTool((prev) => (prev === "alarm" ? "none" : "alarm"))
              }
              className={`px-3 py-1 rounded-pill text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${
                activePassengerTool === "alarm"
                  ? "bg-ok-soft text-ok border-ok/40 font-semibold"
                  : "bg-paper-3 hover:bg-paper text-ink border-rule"
              }`}
            >
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Wakeup Alarm</span>
            </button>

            {coachComposition && (
              <button
                type="button"
                onClick={() =>
                  setActivePassengerTool((prev) => (prev === "coach" ? "none" : "coach"))
                }
                className={`px-3 py-1 rounded-pill text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${
                  activePassengerTool === "coach"
                    ? "bg-cool-soft text-cool border-cool/40 font-semibold"
                    : "bg-paper-3 hover:bg-paper text-ink border-rule"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Coach Guide</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowGpsReporter((prev) => !prev)}
              className={`px-3 py-1 rounded-pill text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${
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
              className="p-1.5 rounded-pill border border-rule bg-paper-3 hover:bg-paper active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-muted hover:text-ink transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
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
            { num: "12158", label: "12158 Hutatma (Morn)" },
            { num: "12157", label: "12157 Hutatma (Eve)" },
            { num: "12101", label: "12101 Jnaneswari" },
            { num: "12951", label: "12951 Rajdhani" },
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

        {/* Train Operational Days & Maintenance Notice Banner */}
        {(status.service_state === "NOT_RUNNING_TODAY" || status.runs_today === false) && (
          <div className="p-3 sm:p-4 rounded-lg bg-bad/10 border border-bad/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-bad shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-bad text-xs px-2 py-0.5 rounded-pill bg-bad/20 border border-bad/40 font-outlier">
                  Scheduled maintenance day
                </span>
                <strong className="text-ink font-semibold">{status.running_status}</strong>
              </div>
              <p className="text-muted leading-relaxed">
                {status.service_notice || `Train ${status.train_number} does not operate on this day of the week.`}
              </p>
              {status.days_of_run && status.days_of_run.length > 0 && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-muted text-[11px]">Scheduled days:</span>
                  <div className="flex gap-1">
                    {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => {
                      const runs = status.days_of_run?.includes(day);
                      return (
                        <span
                          key={day}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-outlier font-semibold ${
                            runs
                              ? "bg-ok-soft text-ok border border-ok/30"
                              : "bg-paper-3 text-muted/40 border border-rule line-through"
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
                <p className="text-accent text-[11px] pt-1">
                  Turnaround / Reverse service:{" "}
                  <Link href={`/train?number=${status.pairing_train_number}`} className="underline font-semibold font-outlier">
                    Train #{status.pairing_train_number}
                  </Link>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Service / Not Started Yet Banner */}
        {status.service_state === "NOT_STARTED" && (
          <div className="p-3 sm:p-4 rounded-lg bg-accent/10 border border-accent/30 flex items-start gap-3">
            <Clock className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-accent text-xs px-2 py-0.5 rounded-pill bg-accent/20 border border-accent/40 font-outlier">
                  Not departed yet
                </span>
                <strong className="text-ink font-semibold">{status.running_status}</strong>
              </div>
              <p className="text-muted leading-relaxed">
                {status.service_notice || `Train ${status.train_number} has not departed its origin station yet.`}
              </p>
              {status.pairing_train_number && (
                <p className="text-accent text-[11px] pt-1">
                  Shared rake pair: Incoming service was{" "}
                  <Link href={`/train?number=${status.pairing_train_number}`} className="underline font-semibold font-outlier">
                    Train #{status.pairing_train_number}
                  </Link>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Service Completed / Terminated Banner */}
        {status.service_state === "COMPLETED" && (
          <div className="p-3 sm:p-4 rounded-lg bg-ok-soft border border-ok/40 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-ok shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-ok text-xs px-2 py-0.5 rounded-pill bg-ok/20 border border-ok/40 font-outlier">
                  Journey completed
                </span>
                <strong className="text-ink font-semibold">{status.running_status}</strong>
              </div>
              <p className="text-muted leading-relaxed">
                {status.service_notice || `Train ${status.train_number} has completed its scheduled journey.`}
              </p>
              {status.pairing_train_number && (
                <p className="text-accent text-[11px] pt-1">
                  Turnaround rake next operates as:{" "}
                  <Link href={`/train?number=${status.pairing_train_number}`} className="underline font-semibold font-outlier">
                    Train #{status.pairing_train_number}
                  </Link>
                </p>
              )}
            </div>
          </div>
        )}

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

        {/* Offline Satellite GPS Mode Banner */}
        {!isOnline && (
          <div className="p-3 sm:p-4 rounded-lg bg-ok-soft border border-ok/40 text-ok text-xs flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-ok shrink-0" aria-hidden="true" />
            <div>
              <span className="font-bold">Offline satellite GPS active:</span> Cellular data is offline. RailPulse is actively tracking your train using device hardware satellite GPS fixes snapped to cached timetables with zero cellular data required.
            </div>
          </div>
        )}

        {/* Active Passenger Tool Drawers */}
        {activePassengerTool === "speed" && (
          <SpeedometerHUD
            speedKmH={status.speed_kmph ?? 0}
            trainName={status.train_name}
            trainNumber={status.train_number}
            maxPermissibleSpeedKmH={130}
          />
        )}

        {activePassengerTool === "alarm" && (
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
        )}

        {activePassengerTool === "coach" && coachComposition && (
          <CoachRake composition={coachComposition} />
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
