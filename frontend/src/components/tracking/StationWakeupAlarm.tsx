"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, BellOff, Volume2, VolumeX, AlertTriangle, CheckCircle, Navigation } from "lucide-react";

interface HaltStation {
  stationCode: string;
  stationName: string;
  distanceKm?: number;
  scheduledArrival?: string | null;
  scheduledDeparture?: string | null;
  actualArrival?: string | null;
  actualDeparture?: string | null;
  platform?: string | null;
}

interface StationWakeupAlarmProps {
  trainNumber: string;
  trainName: string;
  halts: HaltStation[];
  currentKm?: number;
  currentStationCode?: string;
  currentSpeedKmH?: number;
}

export function StationWakeupAlarm({
  trainNumber,
  trainName,
  halts,
  currentKm = 0,
  currentStationCode = "",
  currentSpeedKmH = 0,
}: StationWakeupAlarmProps) {
  const [targetStationCode, setTargetStationCode] = useState<string>("");
  const [triggerType, setTriggerType] = useState<"distance" | "time">("distance");
  const [distanceThresholdKm, setDistanceThresholdKm] = useState<number>(10);
  const [timeThresholdMin, setTimeThresholdMin] = useState<number>(15);
  const [isAlarmArmed, setIsAlarmArmed] = useState<boolean>(false);
  const [isAlarmFiring, setIsAlarmFiring] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [audioTesting, setAudioTesting] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const chimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Set default target station to the last halt if not selected
  useEffect(() => {
    if (!targetStationCode && halts && halts.length > 0) {
      setTargetStationCode(halts[halts.length - 1].stationCode);
    }
  }, [halts, targetStationCode]);

  // Find target station details
  const targetStation = halts.find((h) => h.stationCode === targetStationCode) || halts[halts.length - 1];
  const targetDistanceKm = targetStation?.distanceKm ?? 0;
  const remainingDistanceKm = Math.max(0, targetDistanceKm - currentKm);

  // Estimated time to destination
  const effectiveSpeed = currentSpeedKmH > 15 ? currentSpeedKmH : 60; // fallback to 60 km/h average
  const estimatedRemainingMin = Math.round((remainingDistanceKm / effectiveSpeed) * 60);

  // Authentic Web Audio Melodic Indian Railway Chime Synthesizer
  const playRailwayChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Classic Two-tone / Three-tone Indian Railway Gong Chime
      // Notes: C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz)
      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.4 },
        { freq: 659.25, time: 0.35, dur: 0.4 },
        { freq: 783.99, time: 0.7, dur: 0.7 },
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + time);

        // Soft bell-like envelope
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.35, now + time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      console.warn("Audio playback not permitted or failed:", e);
    }
  };

  // Web Speech Announcement
  const speakAnnouncement = (stationName: string, platform?: string | null) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const pfText = platform ? ` on platform ${platform}` : "";
      const text = `Attention please. Your destination ${stationName} is approaching in a few minutes${pfText}. Please prepare your luggage.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.lang = "en-IN";
      window.speechSynthesis.speak(utterance);
    }
  };

  // Trigger Full Alarm
  const triggerAlarm = () => {
    setIsAlarmFiring(true);
    playRailwayChime();

    // Haptic Vibration if supported
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([600, 200, 600, 200, 1000]);
    }

    // System Notification
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(`Station Approaching: ${targetStation?.stationName || targetStationCode}!`, {
        body: `Train ${trainNumber} is within ${remainingDistanceKm.toFixed(1)} km of your destination. Platform: ${targetStation?.platform || "TBA"}`,
        icon: "/icon.svg",
        requireInteraction: true,
      });
    }

    // Speak announcement after initial chime
    setTimeout(() => {
      speakAnnouncement(targetStation?.stationName || targetStationCode, targetStation?.platform);
    }, 1500);

    // Repeat chime every 10 seconds until user snoozes/dismisses
    if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
    chimeIntervalRef.current = setInterval(() => {
      playRailwayChime();
    }, 10000);
  };

  const dismissAlarm = () => {
    setIsAlarmFiring(false);
    setIsAlarmArmed(false);
    if (chimeIntervalRef.current) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Arm/Disarm handler
  const handleToggleArm = async () => {
    if (isAlarmArmed) {
      dismissAlarm();
      return;
    }

    // Request notification permission if not yet granted
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch (e) {
        console.warn("Notification request rejected", e);
      }
    }

    // Resume Audio Context on user gesture
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        if (audioCtxRef.current.state === "suspended") {
          await audioCtxRef.current.resume();
        }
      }
    } catch {
      // Audio resume optional
    }

    setIsAlarmArmed(true);
  };

  // Distance / Time Monitoring Loop
  useEffect(() => {
    if (!isAlarmArmed || isAlarmFiring || !targetStation) return;

    let shouldTrigger = false;

    if (triggerType === "distance") {
      if (remainingDistanceKm > 0 && remainingDistanceKm <= distanceThresholdKm) {
        shouldTrigger = true;
      }
    } else {
      if (estimatedRemainingMin > 0 && estimatedRemainingMin <= timeThresholdMin) {
        shouldTrigger = true;
      }
    }

    if (shouldTrigger) {
      triggerAlarm();
    }
  }, [isAlarmArmed, isAlarmFiring, remainingDistanceKm, estimatedRemainingMin, distanceThresholdKm, timeThresholdMin, triggerType, targetStation]);

  const testChimeSound = () => {
    setAudioTesting(true);
    playRailwayChime();
    setTimeout(() => {
      speakAnnouncement(targetStation?.stationName || "Pune Junction", targetStation?.platform || "1");
      setAudioTesting(false);
    }, 1600);
  };

  return (
    <div
      className={`rounded-card border transition-colors ${
        isAlarmFiring
          ? "border-bad bg-bad-soft text-ink"
          : isAlarmArmed
          ? "border-ok/40 bg-ok-soft/30"
          : "border-rule bg-paper-2"
      } p-5`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-pill ${
              isAlarmFiring
                ? "bg-bad text-paper"
                : isAlarmArmed
                ? "bg-ok-soft text-ok border border-ok/30"
                : "bg-paper-3 text-muted border border-rule"
            }`}
          >
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-display font-bold text-ink flex items-center gap-2">
              Station wakeup alarm
              {isAlarmArmed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-semibold font-outlier bg-ok-soft text-ok border border-ok/30">
                  Armed
                </span>
              )}
            </h3>
            <p className="text-xs text-muted font-outlier">
              Audio chime and voice announcement before approaching your destination
            </p>
          </div>
        </div>

        {/* Test Chime Button */}
        <button
          type="button"
          onClick={testChimeSound}
          disabled={audioTesting}
          className="text-xs px-3 py-1.5 rounded-pill border border-rule bg-paper-3 text-muted hover:text-ink transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
          title="Preview railway chime & voice announcement"
        >
          <Volume2 className="w-3.5 h-3.5 text-accent" />
          <span>Preview chime</span>
        </button>
      </div>

      {/* Alarm Firing Banner */}
      {isAlarmFiring && (
        <div className="mb-4 p-4 rounded-lg bg-bad-soft border border-bad text-ink flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-bad shrink-0" />
            <div>
              <div className="font-bold text-sm md:text-base text-bad">
                APPROACHING: {targetStation?.stationName} ({targetStation?.stationCode})!
              </div>
              <div className="text-xs text-muted font-outlier">
                Remaining distance: {remainingDistanceKm.toFixed(1)} km (~{estimatedRemainingMin} mins) • Platform: {targetStation?.platform || "TBA"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissAlarm}
            className="w-full md:w-auto px-4 py-2 rounded-pill bg-bad text-paper font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <BellOff className="w-4 h-4" />
            <span>Dismiss alarm</span>
          </button>
        </div>
      )}

      {/* Configuration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4 text-xs">
        {/* Target Station Selector */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5 font-outlier">
            Destination / alight halt
          </label>
          <select
            value={targetStationCode}
            onChange={(e) => setTargetStationCode(e.target.value)}
            disabled={isAlarmArmed}
            aria-label="Destination / Alight Halt"
            className="w-full bg-paper border border-rule text-ink rounded-pill px-3 py-2 text-xs outline-none focus:border-accent disabled:opacity-60 font-outlier font-semibold cursor-pointer"
          >
            {halts.map((h) => (
              <option key={h.stationCode} value={h.stationCode} className="bg-paper-2 text-ink">
                {h.stationName} ({h.stationCode}) {h.distanceKm ? `• ${h.distanceKm} km` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Mode */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5 font-outlier">
            Wakeup trigger by
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTriggerType("distance")}
              disabled={isAlarmArmed}
              className={`px-3 py-2 rounded-pill text-xs font-medium border transition-colors cursor-pointer font-outlier ${
                triggerType === "distance"
                  ? "bg-accent text-accent-ink border-accent font-semibold"
                  : "bg-paper border-rule text-muted hover:text-ink"
              } disabled:opacity-60`}
            >
              Distance (km)
            </button>
            <button
              type="button"
              onClick={() => setTriggerType("time")}
              disabled={isAlarmArmed}
              className={`px-3 py-2 rounded-pill text-xs font-medium border transition-colors cursor-pointer font-outlier ${
                triggerType === "time"
                  ? "bg-accent text-accent-ink border-accent font-semibold"
                  : "bg-paper border-rule text-muted hover:text-ink"
              } disabled:opacity-60`}
            >
              Time (mins)
            </button>
          </div>
        </div>

        {/* Threshold Value */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5 font-outlier">
            {triggerType === "distance" ? "Alert distance before stop" : "Alert time before stop"}
          </label>
          {triggerType === "distance" ? (
            <select
              value={distanceThresholdKm}
              onChange={(e) => setDistanceThresholdKm(Number(e.target.value))}
              disabled={isAlarmArmed}
              aria-label="Alert Distance Before Stop"
              className="w-full bg-paper border border-rule text-ink rounded-pill px-3 py-2 text-xs outline-none focus:border-accent disabled:opacity-60 font-outlier cursor-pointer"
            >
              <option value={5}>5 km before station (~5-7 mins)</option>
              <option value={10}>10 km before station (~10-12 mins)</option>
              <option value={15}>15 km before station (~15-18 mins)</option>
              <option value={20}>20 km before station (~20-25 mins)</option>
            </select>
          ) : (
            <select
              value={timeThresholdMin}
              onChange={(e) => setTimeThresholdMin(Number(e.target.value))}
              disabled={isAlarmArmed}
              aria-label="Alert Time Before Stop"
              className="w-full bg-paper border border-rule text-ink rounded-pill px-3 py-2 text-xs outline-none focus:border-accent disabled:opacity-60 font-outlier cursor-pointer"
            >
              <option value={10}>10 minutes before</option>
              <option value={15}>15 minutes before</option>
              <option value={20}>20 minutes before</option>
              <option value={30}>30 minutes before</option>
            </select>
          )}
        </div>
      </div>

      {/* Target Status Card & Arm Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-paper-3 border border-rule">
        <div className="flex items-center gap-3">
          <Navigation className="w-4 h-4 text-accent shrink-0" />
          <div className="text-xs">
            <span className="text-muted font-outlier">Destination: </span>
            <span className="font-semibold text-ink">
              {targetStation?.stationName} ({targetStation?.stationCode})
            </span>
            <span className="mx-2 text-rule-2">•</span>
            <span className="text-muted font-outlier">Remaining: </span>
            <span className="font-semibold text-ok font-outlier">
              {remainingDistanceKm.toFixed(1)} km
            </span>
            <span className="text-muted font-outlier"> (~{estimatedRemainingMin} mins)</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleArm}
          className={`px-4 py-2 rounded-pill text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${
            isAlarmArmed
              ? "bg-paper hover:bg-paper-2 text-ink border border-rule"
              : "bg-accent hover:opacity-90 text-accent-ink"
          }`}
        >
          {isAlarmArmed ? (
            <>
              <BellOff className="w-4 h-4 text-accent" />
              <span className="whitespace-nowrap">Disarm</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span className="whitespace-nowrap">Arm alarm</span>
            </>
          )}
        </button>
      </div>

      {notificationPermission !== "granted" && isAlarmArmed && (
        <p className="mt-2 text-[11px] text-accent flex items-center gap-1.5 font-outlier">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Tip: Enable browser notifications so audio triggers even when your mobile display is dimmed.</span>
        </p>
      )}
    </div>
  );
}
