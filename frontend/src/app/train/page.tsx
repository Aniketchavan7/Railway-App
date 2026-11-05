"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { createTrainWebSocket } from "@/lib/ws";
import { CoachComposition, RailwayStatus, TelemetryPacket } from "@/lib/types";
import { useLocationShare } from "@/lib/useLocationShare";
import { OnTrainPrompt } from "@/components/tracking/OnTrainPrompt";
import { TrainStateBanner } from "@/components/tracking/TrainStateBanner";
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
  RefreshCw,
  AlertCircle,
  Bot,
  Calculator,
  Loader2,
  Search,
  Wifi,
  WifiOff,
  Map,
  ListOrdered,
  Radio,
  Bell,
} from "lucide-react";

function TrainNumberPrompt({ message }: { message?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (/^\d{5}$/.test(value)) router.push(`/train?number=${value}`);
  };
  return (
    <div className="max-w-md mx-auto my-12 space-y-4 text-center">
      <h1 className="text-2xl font-display font-bold text-ink">Track a train</h1>
      <p className="text-xs text-muted">{message || "Enter a 5-digit train number to see what it's doing right now."}</p>
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 12951"
            aria-label="Train number"
            className="w-full bg-paper-2 focus:bg-paper text-sm font-outlier font-bold pl-9 pr-3 py-2.5 rounded-pill border border-rule focus:border-accent outline-none text-ink placeholder:text-muted transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={value.length !== 5}
          className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-5 py-2.5 rounded-pill transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
        >
          Track
        </button>
      </form>
    </div>
  );
}

function TrainTrackingContent() {
  const searchParams = useSearchParams();
  const trainNumber = searchParams.get("number") || searchParams.get("train");
  if (!trainNumber) return <TrainNumberPrompt />;
  return <TrainTracker key={trainNumber} trainNumber={trainNumber} />;
}

function TrainTracker({ trainNumber }: { trainNumber: string }) {
  const [status, setStatus] = useState<RailwayStatus | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [coachData, setCoachData] = useState<CoachComposition | null>(null);
  const [coachesLoaded, setCoachesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  // Held here so that refreshes and tab changes cannot interrupt a passenger's sharing.
  const share = useLocationShare(trainNumber);

  const refreshStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      setStatus(await api.getTrainStatus(trainNumber));
      setError(null);
    } catch (err) {
      // Keep showing what we have; only the first load needs a full error page.
      setError(err instanceof Error ? err.message : "Failed to load train status");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [trainNumber]);

  useEffect(() => {
    void refreshStatus();
    api.getTrainRoute(trainNumber).then(setRouteData).catch(() => setRouteData(null));
    api
      .getCoachComposition(trainNumber)
      .then(setCoachData)
      .catch(() => setCoachData(null))
      .finally(() => setCoachesLoaded(true));
  }, [trainNumber, refreshStatus]);

  useEffect(() => {
    const ws = createTrainWebSocket(
      trainNumber,
      (packet: TelemetryPacket) => {
        if (packet.telemetry) setStatus(packet.telemetry);
      },
      setWsStatus
    );
    return () => ws.disconnect();
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

  if (!status) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-paper-2 rounded-2xl border border-rule text-center space-y-4 shadow-sm">
        <AlertCircle className="w-8 h-8 text-accent mx-auto" />
        <h2 className="text-base font-display font-semibold text-ink">
          No information for train {trainNumber}
        </h2>
        <p className="text-xs text-muted leading-relaxed">{error}</p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={refreshStatus}
            disabled={refreshing}
            className="px-4 py-2 bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink rounded-pill text-xs font-semibold cursor-pointer transition-opacity"
          >
            Try again
          </button>
          <Link
            href="/train"
            className="px-4 py-2 bg-paper-3 hover:bg-paper active:bg-paper-2 text-ink rounded-pill text-xs font-medium border border-rule transition-colors"
          >
            Try another number
          </Link>
        </div>
      </div>
    );
  }

  const originHalt = status.halts?.[0] ?? null;
  const destHalt = status.halts?.length ? status.halts[status.halts.length - 1] : null;
  const nextHalt =
    status.halts?.find((h) => h.station_code === status.next_station_code) ??
    status.halts?.find((h) => !h.has_arrived) ??
    null;
  const lastArrivedHalt = status.halts ? [...status.halts].reverse().find((h) => h.has_arrived) : undefined;
  const currentKm = lastArrivedHalt?.distance_km ?? 0;
  const isRunning = status.service_state === "RUNNING";
  // Passengers can also help when live data can't see the train at all.
  const canShare = isRunning || status.service_state === "UNKNOWN";

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

              <LocationTypePill
                locationType={status.location_type}
                isSimulated={status.is_simulated}
                positionBasis={status.position_basis}
                crowdReporters={status.crowd_reporters}
                hasPosition={status.latitude != null}
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
              origin={status.origin_name ?? originHalt?.station_name}
              dest={status.destination_name ?? destHalt?.station_name}
              currentStation={status.current_station}
              platform={nextHalt?.platform}
              delayMinutes={status.delay_minutes}
            />

            <TripShareModal
              trainNumber={status.train_number}
              trainName={status.train_name}
              currentStationName={status.position_label ?? status.current_station}
              origin={status.origin_name ?? originHalt?.station_name}
              destination={status.destination_name ?? destHalt?.station_name}
              nextStationName={status.next_station}
              nextStationPlatform={nextHalt?.platform}
              speedKmH={status.speed_kmph}
              delayMinutes={status.delay_minutes}
              serviceState={status.service_state}
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
              <span>{share.phase === "idle" ? "Share location" : "Sharing location"}</span>
            </button>

            <button
              type="button"
              onClick={refreshStatus}
              disabled={refreshing}
              aria-label="Refresh status"
              className="p-1.5 rounded-pill border border-rule bg-paper-3 hover:bg-paper active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-muted hover:text-ink transition-colors cursor-pointer"
              title="Refresh status"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "motion-safe:animate-spin" : ""}`}
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

        {error && (
          <p className="text-[11px] text-accent">
            Couldn&apos;t refresh just now, so this may be out of date. {error}
          </p>
        )}

        <TrainStateBanner status={status} />

        {canShare && (
          <OnTrainPrompt trainNumber={status.train_number} trainName={status.train_name} share={share} />
        )}

        {isRunning && <TripProgressHUD status={status} />}

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
          />

          <div className="flex items-center gap-3">
            <Link
              href={`/ai-assistant?train=${status.train_number}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            >
              <Bot className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ask assistant</span>
            </Link>
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

      {/* Always visible while sharing, so "stop" is never hidden */}
      {(showGpsReporter || share.phase !== "idle" || share.error) && (
        <div className="hidden lg:block animate-in fade-in duration-150">
          <CrowdTelemetryReporter
            trainNumber={status.train_number}
            trainName={status.train_name}
            share={share}
            activeReporters={status.crowd_reporters}
            canShare={canShare}
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
            currentStationCode={status.current_station_code || ""}
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
              <span>Share location</span>
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
                selectedStationCode={selectedStationCode}
                onSelectStation={(code) => setSelectedStationCode(code)}
                showDelays={isRunning}
              />
            </div>

            <div className={`lg:hidden ${mobileTab === "gps" ? "block" : "hidden"}`}>
              <CrowdTelemetryReporter
                trainNumber={status.train_number}
                trainName={status.train_name}
                share={share}
                activeReporters={status.crowd_reporters}
                canShare={canShare}
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
              currentPlatform={nextHalt?.platform}
            />
          ) : coachesLoaded ? (
            <div className="p-8 rounded-2xl bg-paper-2 border border-rule text-center">
              <p className="text-xs text-muted">Coach layout isn&apos;t available for this train right now.</p>
            </div>
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
