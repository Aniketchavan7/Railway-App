"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { TelemetryReportResult } from "./types";

const PING_INTERVAL_MS = 10_000;
/** Don't report a position the phone hasn't refreshed for this long. */
const MAX_POSITION_AGE_MS = 120_000;

export type SharePhase = "idle" | "requesting" | "active";

export interface LocationShare {
  phase: SharePhase;
  error: string | null;
  notice: string | null;
  coords: GeolocationCoordinates | null;
  sentCount: number;
  lastResult: TelemetryReportResult | null;
  start: () => void;
  stop: () => void;
}

/** A new random id per train and tab. Nothing links it to a person or device. */
function reporterIdFor(trainNumber: string): string {
  const key = `railpulse_reporter:${trainNumber}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
  } catch {
    // Storage can be blocked; a fresh id only means this trip restarts its count.
  }
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `r-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  try {
    sessionStorage.setItem(key, id);
  } catch {
    // See above.
  }
  return id;
}

function permissionMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. To share, allow location for this site in your browser settings.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your phone can't get a GPS signal right now. We will keep trying.";
  }
  return "Getting your location is taking a while. We will keep trying.";
}

/**
 * Lives at page level so tab switches and status refreshes cannot interrupt sharing.
 * Only start() opens the browser permission prompt, and it is only called from a tap.
 */
export function useLocationShare(trainNumber: string): LocationShare {
  const [phase, setPhase] = useState<SharePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [lastResult, setLastResult] = useState<TelemetryReportResult | null>(null);

  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPosition = useRef<GeolocationPosition | null>(null);
  const sharing = useRef(false);

  const releaseWakeLock = () => {
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
  };

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLock.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      // Refused on low battery or unsupported. Sharing still works while the screen is on.
    }
  };

  const clearTracking = () => {
    sharing.current = false;
    latestPosition.current = null;
    if (pingTimer.current !== null) {
      clearInterval(pingTimer.current);
      pingTimer.current = null;
    }
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    releaseWakeLock();
  };

  const endSharing = useCallback(() => {
    clearTracking();
    setPhase("idle");
    setCoords(null);
  }, []);

  const stop = useCallback(() => {
    endSharing();
    setNotice(null);
    setError(null);
  }, [endSharing]);

  const sendPing = useCallback(
    async (position: GeolocationPosition) => {
      const { latitude, longitude, speed, accuracy, heading } = position.coords;
      try {
        const result = await api.reportPassengerTelemetry(trainNumber, {
          reporter_id: reporterIdFor(trainNumber),
          latitude,
          longitude,
          speed_kmph: speed != null ? Math.max(0, Math.round(speed * 3.6)) : undefined,
          accuracy_meters: accuracy ? Math.round(accuracy) : undefined,
          heading: heading != null ? Math.round(heading) : undefined,
        });
        if (!sharing.current) return;
        setLastResult(result);
        setSentCount((count) => count + 1);
        setError(null);
        setNotice(result.status === "rejected" ? result.message ?? null : null);
        // Nothing more this train can use, so don't keep reading the person's location.
        if (result.status === "rejected" && result.reason === "train_not_running") {
          endSharing();
          setNotice(result.message ?? "This train is not running right now, so sharing has stopped.");
        }
      } catch {
        // A dropped connection is normal on a train. The next ping tries again.
        if (sharing.current) setNotice("Connection lost. We will keep trying while you have signal.");
      }
    },
    [trainNumber, endSharing]
  );

  const start = useCallback(() => {
    if (sharing.current) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Your browser doesn't support location sharing.");
      return;
    }
    setError(null);
    setNotice(null);
    setPhase("requesting");
    sharing.current = true;
    latestPosition.current = null;

    // Pings run on a timer, not on position changes: phones often stop reporting while
    // a train stands at a station, and that passenger must not silently drop out.
    pingTimer.current = setInterval(() => {
      const position = latestPosition.current;
      if (position && Date.now() - position.timestamp <= MAX_POSITION_AGE_MS) void sendPing(position);
    }, PING_INTERVAL_MS);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!sharing.current) return;
        const isFirstFix = latestPosition.current === null;
        latestPosition.current = position;
        setPhase("active");
        setCoords(position.coords);
        if (!wakeLock.current) void requestWakeLock();
        if (isFirstFix) void sendPing(position);
      },
      (geoError) => {
        setError(permissionMessage(geoError));
        if (geoError.code === geoError.PERMISSION_DENIED) endSharing();
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 5_000 }
    );
  }, [sendPing, endSharing]);

  // The browser drops the wake lock whenever the page is hidden.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && sharing.current) void requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Moving to another train or page always stops sharing.
  useEffect(() => {
    return () => {
      clearTracking();
      setPhase("idle");
      setCoords(null);
      setSentCount(0);
      setLastResult(null);
      setNotice(null);
      setError(null);
    };
  }, [trainNumber]);

  return { phase, error, notice, coords, sentCount, lastResult, start, stop };
}
