"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { createTrainWebSocket } from "@/lib/ws";
import { CoachComposition, RailwayAlert, RailwayStatus, TelemetryPacket } from "@/lib/types";
import { FreshnessBadge } from "@/components/tracking/FreshnessBadge";
import { LocationTypePill } from "@/components/tracking/LocationTypePill";
import { StationTimeline } from "@/components/tracking/StationTimeline";
import { CrowdTelemetryReporter } from "@/components/tracking/CrowdTelemetryReporter";
import { StationWakeupAlarm } from "@/components/tracking/StationWakeupAlarm";
import { TripShareModal } from "@/components/tracking/TripShareModal";
import { TrainMap } from "@/components/map/TrainMap";
import { TripProgressHUD } from "@/components/tracking/TripProgressHUD";
import { CoachPositionVisualizer } from "@/components/tracking/CoachPositionVisualizer";
import { ConcourseAudioAnnouncement } from "@/components/tracking/ConcourseAudioAnnouncement";
import { TurnaroundRakeCard } from "@/components/tracking/TurnaroundRakeCard";
import { FareMatrixTable } from "@/components/tracking/FareMatrixTable";
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
  LayoutGrid,
} from "lucide-react";

function TrainTrackingContent() {
  const searchParams = useSearchParams();
  const trainNumber =
    searchParams.get("number") || searchParams.get("train") || "12101";

  const [status, setStatus] = useState<RailwayStatus | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [coachData, setCoachData] = useState<CoachComposition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"radar" | "coaches" | "fares">("radar");
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
        const [route, alerts, coaches] = await Promise.all([
          api.getTrainRoute(trainNumber).catch(() => null),
          api.getTrainDisruptions(trainNumber).catch(() => []),
          api.getCoachComposition(trainNumber).catch(() => null),
        ]);
        if (route) setRouteData(route);
        if (alerts) setDisruptions(alerts);
        if (coaches) setCoachData(coaches);
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
          Checking train {trainNumber} live telemetry…
        </p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-paper-2 rounded-2xl border border-rule text-center space-y-4 shadow-sm">
        <AlertCircle className="w-8 h-8 text-accent mx-auto" />
        <h2 className="text-base font-display font-semibold text-ink">
          Train Telemetry Unavailable
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
            className="px-4 py-2 bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink rounded-pill text-xs font-semibold cursor-pointer transition-opacity"
          >
            Retry status
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-paper-3 hover:bg-paper active:bg-paper-2 text-ink rounded-pill text-xs font-medium border border-rule transition-colors"
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
              <span className="text-xs font-outlier font-bold px-2 py-0.5 rounded-md bg-paper-3 text-ink border border-rule tabular-nums">
                #{status.train_number}
              </span>

              <h1 className="text-xl sm:text-2xl font-display font-bold text-ink tracking-tight">
                {status.train_name}
              </h1>

              {status.service_state === "NOT_RUNNING_TODAY" || status.runs_today === false ? (
                <span className="text-xs px-2.5 py-0.5 rounded-pill font-outlier font-medium bg-paper-3 text-bad border border-bad/30">
                  Non-operating day · Weekly maintenance
                </span>
              ) : status.service_state === "NOT_STARTED" ? (
                <span className="text-xs px-2.5 py-0.5 rounded-pill font-outlier font-medium bg-paper-3 text-accent border border-accent/30">
                  Scheduled departure pending
                </span>
              ) : status.service_state === "COMPLETED" ? (
                <span className="text-xs px-2.5 py-0.5 rounded-pill font-outlier font-medium bg-paper-3 text-ok border border-ok/30">
                  Journey terminated
                </span>
              ) : (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-pill font-outlier font-medium tabular-nums ${
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

          {/* Action Controls: Audio Chime, Stream Indicator, Share, Alarm */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-outlier border ${
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

            {/* Authentic Concourse Broadcast Announcement Button */}
            <ConcourseAudioAnnouncement
              trainNumber={status.train_number}
              trainName={status.train_name}
              origin={originHalt?.station_name}
              dest={destHalt?.station_name}
              currentStation={status.current_station}
              platform={destHalt?.platform}
              delayMinutes={status.delay_minutes}
            />

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
              className={`px-3 py-1 rounded-pill text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${
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
              className="p-1.5 rounded-pill border border-rule bg-paper-3 hover:bg-paper active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-muted hover:text-ink transition-colors cursor-pointer"
              title="Refresh status"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "motion-safe:animate-spin" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Quick Express Fleet Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rule text-xs">
          <span className="text-muted text-[11px] font-outlier font-medium">
            Express Fleet:
          </span>
          {[
            { num: "22226", label: "22226 Solapur VB" },
            { num: "12951", label: "12951 Mumbai Rajdhani" },
            { num: "12124", label: "12124 Deccan Queen" },
            { num: "12158", label: "12158 Hutatma Exp" },
            { num: "22436", label: "22436 Vande Bharat" },
            { num: "12101", label: "12101 Jnaneswari" },
            { num: "11301", label: "11301 Udyan Express" },
          ].map((item) => (
            <Link
              key={item.num}
              href={`/train?number=${item.num}`}
              className={`px-2.5 py-0.5 rounded-pill text-[11px] font-outlier tabular-nums transition-colors border ${
                trainNumber === item.num
                  ? "bg-accent text-accent-ink border-accent font-semibold"
                  : "bg-paper-3 text-muted hover:text-ink hover:bg-paper border-rule"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Operational Days & Maintenance Advisory Banner */}
        {(status.service_state === "NOT_RUNNING_TODAY" || status.runs_today === false) && (
          <div className="p-3.5 bg-paper-2 border border-rule border-l-2 border-l-bad text-xs space-y-2 rounded-r-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-outlier font-semibold text-bad text-xs">
                Maintenance Day Advisory
              </span>
              <span className="text-muted">·</span>
              <span className="text-ink font-medium">
                Train #{status.train_number} {status.train_name} has scheduled depot maintenance today.
              </span>
            </div>
            {status.service_notice && (
              <p className="text-muted text-[11px] leading-relaxed">
                {status.service_notice}
              </p>
            )}
            {status.days_of_run && (
              <div className="flex items-center gap-1.5 text-[11px] font-outlier">
                <span className="text-muted">Operating Days:</span>
                <span className="font-semibold text-ink">{status.days_of_run.join(", ")}</span>
              </div>
            )}
          </div>
        )}

        {/* Pending Departure Notice */}
        {status.service_state === "NOT_STARTED" && (
          <div className="p-3.5 bg-paper-2 border border-rule border-l-2 border-l-accent text-xs space-y-2 rounded-r-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-outlier font-semibold text-accent text-xs">
                Scheduled Origin Halt
              </span>
              <span className="text-muted">·</span>
              <span className="text-ink font-medium">
                Rake stationed at {originHalt?.station_name || "Origin"}. Departure scheduled for{" "}
                {originHalt?.departure_time || originHalt?.actual_departure || "today"}.
              </span>
            </div>
            {status.service_notice && (
              <p className="text-muted text-[11px] leading-relaxed">
                {status.service_notice}
              </p>
            )}
          </div>
        )}

        {/* Journey Completed Notice */}
        {status.service_state === "COMPLETED" && (
          <div className="p-3.5 bg-paper-2 border border-rule border-l-2 border-l-ok text-xs space-y-2 rounded-r-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-outlier font-semibold text-ok text-xs">
                Destination Reached
              </span>
              <span className="text-muted">·</span>
              <span className="text-ink font-medium">
                Train #{status.train_number} has completed its schedule at {destHalt?.station_name || "Destination"}.
              </span>
            </div>
            {status.service_notice && (
              <p className="text-muted text-[11px] leading-relaxed">
                {status.service_notice}
              </p>
            )}
          </div>
        )}

        {/* High-Precision Trip Progress & Speedometer HUD */}
        <TripProgressHUD
          speedKmH={status.speed_kmph ?? 0}
          delayMinutes={status.delay_minutes}
          halts={status.halts}
          currentStationCode={status.current_station}
          originStationName={originHalt?.station_name}
          destStationName={destHalt?.station_name}
          trainType={status.train_name}
        />

        {/* Single Rake Turnaround Link Card */}
        {status.pairing_train_number && (
          <TurnaroundRakeCard
            currentTrainNumber={status.train_number}
            currentTrainName={status.train_name}
            pairingTrainNumber={status.pairing_train_number}
          />
        )}

        {/* Freshness Badge & Meta */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <FreshnessBadge
            freshness={status.freshness}
            observedAt={status.observed_at}
            sourceProvider={status.source_provider}
            lastReportedStation={status.current_station}
          />

          <div className="flex items-center gap-3">
            <Link
              href={`/fare?train=${status.train_number}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            >
              <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Full fare breakdown</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Onboard GPS Reporter Drawer */}
      {showGpsReporter && (
        <div className="animate-in fade-in duration-150">
          <CrowdTelemetryReporter
            trainNumber={status.train_number}
            trainName={status.train_name}
            onTelemetryRelayed={fetchStatus}
          />
        </div>
      )}

      {/* Station Wakeup Alarm Drawer */}
      {showWakeupAlarm && (
        <div className="animate-in fade-in duration-150">
          <StationWakeupAlarm
            trainNumber={status.train_number}
            trainName={status.train_name}
            halts={
              status.halts?.map((h) => ({
                stationCode: h.station_code,
                stationName: h.station_name,
                distanceKm: h.distance_km,
                scheduledArrival: h.arrival_time,
                scheduledDeparture: h.departure_time,
                platform: h.platform,
              })) || []
            }
            currentKm={currentKm}
            currentStationCode={status.current_station || ""}
            currentSpeedKmH={status.speed_kmph ?? 0}
          />
        </div>
      )}

      {/* Multi-Section Workspace Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-pill bg-paper-2 border border-rule/80 text-xs w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("radar")}
          className={`relative px-4 py-1.5 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "radar" ? "text-ink font-semibold" : "text-muted hover:text-ink"
          }`}
        >
          {activeTab === "radar" && (
            <motion.div
              layoutId="trainMainTab"
              className="absolute inset-0 bg-paper border border-rule rounded-pill shadow-xs"
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5" />
            <span>Live Radar & Route</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("coaches")}
          className={`relative px-4 py-1.5 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "coaches" ? "text-ink font-semibold" : "text-muted hover:text-ink"
          }`}
        >
          {activeTab === "coaches" && (
            <motion.div
              layoutId="trainMainTab"
              className="absolute inset-0 bg-paper border border-rule rounded-pill shadow-xs"
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <Train className="w-3.5 h-3.5" />
            <span>Coach & Platform Layout</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fares")}
          className={`relative px-4 py-1.5 rounded-pill font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "fares" ? "text-ink font-semibold" : "text-muted hover:text-ink"
          }`}
        >
          {activeTab === "fares" && (
            <motion.div
              layoutId="trainMainTab"
              className="absolute inset-0 bg-paper border border-rule rounded-pill shadow-xs"
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            <span>Tariff & Fares Matrix</span>
          </span>
        </button>
      </div>

      {/* Tab 1: Live Radar & Timetable View */}
      {activeTab === "radar" && (
        <div className="space-y-4">
          {/* Mobile Tab Switcher (<1024px) */}
          <div className="flex items-center gap-1 bg-paper-2 p-1 rounded-pill border border-rule lg:hidden text-xs">
            <button
              type="button"
              onClick={() => setMobileTab("map")}
              className={`flex-1 py-1 px-3 rounded-pill font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileTab === "map"
                  ? "bg-paper text-ink font-semibold border border-rule shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Map radar</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab("timeline")}
              className={`flex-1 py-1 px-3 rounded-pill font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileTab === "timeline"
                  ? "bg-paper text-ink font-semibold border border-rule shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Halts ({status.halts?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab("gps")}
              className={`flex-1 py-1 px-3 rounded-pill font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileTab === "gps"
                  ? "bg-paper text-ink font-semibold border border-rule shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Crowd GPS</span>
            </button>
          </div>

          {/* Main Map & Timetable Ledger Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
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
      )}

      {/* Tab 2: Coach & Platform Layout */}
      {activeTab === "coaches" && (
        <div className="space-y-4">
          {coachData ? (
            <CoachPositionVisualizer
              composition={coachData}
              currentPlatform={destHalt?.platform}
            />
          ) : (
            <div className="p-8 rounded-2xl bg-paper-2 border border-rule text-center space-y-2">
              <Loader2 className="w-5 h-5 text-accent motion-safe:animate-spin mx-auto" />
              <p className="text-xs text-muted font-outlier">
                Fetching coach composition and platform alignment metadata…
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Fares & Tariffs Matrix */}
      {activeTab === "fares" && (
        <div className="space-y-4">
          <FareMatrixTable
            trainNumber={status.train_number}
            originCode={originHalt?.station_code || "CSMT"}
            destCode={destHalt?.station_code || "SUR"}
          />
        </div>
      )}
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
