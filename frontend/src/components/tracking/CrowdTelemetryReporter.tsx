"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  Activity,
  Compass,
  Gauge,
  Loader2,
  MapPin,
  Radio,
  ShieldCheck,
  StopCircle,
  Users,
} from "lucide-react";

interface CrowdTelemetryReporterProps {
  trainNumber: string;
  trainName: string;
  onTelemetryRelayed?: () => void;
}

export function CrowdTelemetryReporter({
  trainNumber,
  trainName,
  onTelemetryRelayed,
}: CrowdTelemetryReporterProps) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    speed: number | null;
    accuracy: number | null;
    heading: number | null;
  } | null>(null);
  const [transmitCount, setTransmitCount] = useState(0);
  const [lastRelayedAt, setLastRelayedAt] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [crowdMeta, setCrowdMeta] = useState<{
    active_reporters: number;
    last_reported?: string | null;
  } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastTransmitTimeRef = useRef<number>(0);

  // Poll crowd contributor metadata periodically
  useEffect(() => {
    let mounted = true;
    const fetchCrowdMeta = async () => {
      try {
        const meta = await api.getCrowdMeta(trainNumber);
        if (mounted) setCrowdMeta(meta);
      } catch {
        // Silently tolerate if offline
      }
    };

    fetchCrowdMeta();
    const interval = setInterval(fetchCrowdMeta, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [trainNumber]);

  // Clean up geolocation watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const sendTelemetry = async (coords: {
    latitude: number;
    longitude: number;
    speed: number | null;
    accuracy: number | null;
    heading: number | null;
  }) => {
    try {
      setIsSubmitting(true);
      const speedKmph =
        coords.speed !== null && coords.speed !== undefined
          ? Math.max(0, Math.round(coords.speed * 3.6))
          : undefined;

      await api.reportPassengerTelemetry(trainNumber, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        speed_kmph: speedKmph,
        accuracy_meters: coords.accuracy ? Math.round(coords.accuracy) : undefined,
        heading: coords.heading ? Math.round(coords.heading) : undefined,
      });

      setTransmitCount((prev) => prev + 1);
      setLastRelayedAt(new Date());
      setGpsError(null);
      if (onTelemetryRelayed) {
        onTelemetryRelayed();
      }
    } catch (err: any) {
      console.warn("Telemetry transmission error:", err);
      // Non-fatal, will retry on next watch tick
    } finally {
      setIsSubmitting(false);
    }
  };

  const startBroadcasting = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser/device.");
      return;
    }

    setGpsError(null);
    setIsBroadcasting(true);

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, accuracy, heading } = position.coords;
          const coords = { latitude, longitude, speed, accuracy, heading };
          setCurrentCoords(coords);

          const now = Date.now();
          // Throttle network reports to once every 10 seconds
          if (now - lastTransmitTimeRef.current >= 10000) {
            lastTransmitTimeRef.current = now;
            sendTelemetry(coords);
          }
        },
        (error) => {
          let msg = "Failed to access high-accuracy device location.";
          if (error.code === error.PERMISSION_DENIED) {
            msg = "Location permission denied. Please allow location access to stream live train GPS.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = "GPS signal currently unavailable. Retrying satellite lock…";
          } else if (error.code === error.TIMEOUT) {
            msg = "Location request timed out. Retrying…";
          }
          setGpsError(msg);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      );
    } catch (err: any) {
      setGpsError(err.message || "Could not initialize device GPS.");
      setIsBroadcasting(false);
    }
  };

  const stopBroadcasting = () => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsBroadcasting(false);
    setCurrentCoords(null);
  };

  return (
    <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-5 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-full shrink-0 ${
              isBroadcasting
                ? "bg-ok-soft text-ok ring-2 ring-ok/30"
                : "bg-paper-3 text-muted border border-rule"
            }`}
          >
            {isBroadcasting ? (
              <Radio className="w-5 h-5 motion-safe:animate-pulse motion-reduce:animate-none" />
            ) : (
              <Compass className="w-5 h-5" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-display font-bold text-ink">
                Onboard Crowd Telemetry Relay
              </h3>
              {crowdMeta && crowdMeta.active_reporters > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-outlier font-semibold bg-ok-soft text-ok border border-ok/30">
                  <Users className="w-3 h-3" />
                  {crowdMeta.active_reporters} onboard active
                </span>
              )}
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Traveling on <strong className="text-ink">#{trainNumber} {trainName}</strong>? Share anonymous device GPS to stream exact real-time train positioning for all passengers.
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-auto">
          {isBroadcasting ? (
            <button
              type="button"
              onClick={stopBroadcasting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-pill bg-bad/10 hover:bg-bad/20 active:bg-bad/30 text-bad border border-bad/30 text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-bad"
            >
              <StopCircle className="w-4 h-4" />
              <span>Stop GPS Relay</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startBroadcasting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-pill bg-accent hover:opacity-90 active:opacity-80 text-accent-ink text-xs font-semibold cursor-pointer transition-opacity shadow-sm focus-visible:outline-2 focus-visible:outline-accent"
            >
              <MapPin className="w-4 h-4" />
              <span>I&apos;m on this train &bull; Share Live GPS</span>
            </button>
          )}
        </div>
      </div>

      {gpsError && (
        <div className="mt-3 p-2.5 rounded-card bg-bad/10 border border-bad/30 text-bad text-xs font-medium flex items-center gap-2">
          <Activity className="w-4 h-4 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Broadcasting Active Dashboard Panel */}
      {isBroadcasting && (
        <div className="mt-4 pt-3 border-t border-rule space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Speed Gauge */}
            <div className="p-2.5 rounded-pill bg-paper-3 border border-rule flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cool shrink-0" />
              <div>
                <span className="text-[10px] text-muted block leading-none">GPS Speed</span>
                <span className="font-outlier font-bold text-ink">
                  {currentCoords?.speed != null
                    ? `${Math.max(0, Math.round(currentCoords.speed * 3.6))} km/h`
                    : "Calibrating…"}
                </span>
              </div>
            </div>

            {/* Accuracy */}
            <div className="p-2.5 rounded-pill bg-paper-3 border border-rule flex items-center gap-2">
              <Compass className="w-4 h-4 text-ok shrink-0" />
              <div>
                <span className="text-[10px] text-muted block leading-none">Accuracy</span>
                <span className="font-outlier font-semibold text-ink">
                  {currentCoords?.accuracy
                    ? `±${Math.round(currentCoords.accuracy)}m`
                    : "Detecting…"}
                </span>
              </div>
            </div>

            {/* Transmissions */}
            <div className="p-2.5 rounded-pill bg-paper-3 border border-rule flex items-center gap-2">
              <Radio className="w-4 h-4 text-accent shrink-0 motion-safe:animate-pulse" />
              <div>
                <span className="text-[10px] text-muted block leading-none">Pings Relayed</span>
                <span className="font-outlier font-bold text-ink">
                  {transmitCount} {transmitCount === 1 ? "packet" : "packets"}
                </span>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="p-2.5 rounded-pill bg-paper-3 border border-rule flex items-center gap-2">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 text-accent motion-safe:animate-spin shrink-0" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-ok motion-safe:animate-ping shrink-0" />
              )}
              <div className="overflow-hidden">
                <span className="text-[10px] text-muted block leading-none">Status</span>
                <span className="font-outlier font-semibold text-ink truncate block">
                  {isSubmitting ? "Transmitting…" : "Active Stream"}
                </span>
              </div>
            </div>
          </div>

          {currentCoords && (
            <p className="text-[11px] text-muted font-outlier">
              Live Satellite Fix: {currentCoords.latitude.toFixed(5)}° N, {currentCoords.longitude.toFixed(5)}° E
              {lastRelayedAt && (
                <span className="ml-2 text-ink">
                  (Relayed {lastRelayedAt.toLocaleTimeString()})
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Strict Privacy Guarantee Banner */}
      <div className="mt-3 pt-2.5 border-t border-rule/60 flex items-center gap-2 text-[11px] text-muted">
        <ShieldCheck className="w-4 h-4 text-ok shrink-0" />
        <span>
          <strong className="text-ink font-medium">Strict Zero-PII Policy:</strong> Anonymous relay. No user accounts, IP logs, or personal device identifiers are stored or disclosed. Only raw geographic coordinates are aligned to the train corridor.
        </span>
      </div>
    </div>
  );
}
