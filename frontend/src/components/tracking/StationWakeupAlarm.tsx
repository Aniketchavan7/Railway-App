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
    <div className={`rounded-xl border transition-all ${
      isAlarmFiring
        ? "border-red-500 bg-red-950/40 shadow-lg shadow-red-500/20 animate-pulse"
        : isAlarmArmed
        ? "border-emerald-500/50 bg-emerald-950/20"
        : "border-slate-800 bg-slate-900/60"
    } p-5 backdrop-blur-md`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${
            isAlarmFiring ? "bg-red-500 text-white animate-bounce" : isAlarmArmed ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
          }`}>
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Station Wakeup Alarm
              {isAlarmArmed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ARMED
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Chime chime + voice reminder before approaching your alight station
            </p>
          </div>
        </div>

        {/* Test Chime Button */}
        <button
          onClick={testChimeSound}
          disabled={audioTesting}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:border-slate-600 transition flex items-center gap-1.5"
          title="Preview railway chime & voice announcement"
        >
          {audioTesting ? <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>Preview Chime</span>
        </button>
      </div>

      {/* Alarm Firing Banner */}
      {isAlarmFiring && (
        <div className="mb-4 p-4 rounded-lg bg-red-600/30 border border-red-500 text-red-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 animate-bounce" />
            <div>
              <div className="font-bold text-sm md:text-base">
                APPROACHING: {targetStation?.stationName} ({targetStation?.stationCode})!
              </div>
              <div className="text-xs text-red-200">
                Remaining distance: {remainingDistanceKm.toFixed(1)} km (~{estimatedRemainingMin} mins) • Platform: {targetStation?.platform || "TBA"}
              </div>
            </div>
          </div>
          <button
            onClick={dismissAlarm}
            className="w-full md:w-auto px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 font-bold text-white text-xs shadow-lg transition flex items-center justify-center gap-1.5"
          >
            <BellOff className="w-4 h-4" />
            Dismiss Alarm
          </button>
        </div>
      )}

      {/* Configuration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4">
        {/* Target Station Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Destination / Alight Halt
          </label>
          <select
            value={targetStationCode}
            onChange={(e) => setTargetStationCode(e.target.value)}
            disabled={isAlarmArmed}
            aria-label="Destination / Alight Halt"
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
          >
            {halts.map((h) => (
              <option key={h.stationCode} value={h.stationCode}>
                {h.stationName} ({h.stationCode}) {h.distanceKm ? `• ${h.distanceKm} km` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Mode */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Wakeup Trigger By
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTriggerType("distance")}
              disabled={isAlarmArmed}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                triggerType === "distance"
                  ? "bg-blue-600/30 border-blue-500 text-blue-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
              } disabled:opacity-60`}
            >
              Distance (km)
            </button>
            <button
              type="button"
              onClick={() => setTriggerType("time")}
              disabled={isAlarmArmed}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                triggerType === "time"
                  ? "bg-blue-600/30 border-blue-500 text-blue-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
              } disabled:opacity-60`}
            >
              Time (mins)
            </button>
          </div>
        </div>

        {/* Threshold Value */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            {triggerType === "distance" ? "Alert Distance Before Stop" : "Alert Time Before Stop"}
          </label>
          {triggerType === "distance" ? (
            <select
              value={distanceThresholdKm}
              onChange={(e) => setDistanceThresholdKm(Number(e.target.value))}
              disabled={isAlarmArmed}
              aria-label="Alert Distance Before Stop"
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
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
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
        <div className="flex items-center gap-3">
          <Navigation className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="text-slate-400">Destination: </span>
            <span className="font-semibold text-slate-200">
              {targetStation?.stationName} ({targetStation?.stationCode})
            </span>
            <span className="mx-2 text-slate-600">•</span>
            <span className="text-slate-400">Remaining: </span>
            <span className="font-semibold text-emerald-400">
              {remainingDistanceKm.toFixed(1)} km
            </span>
            <span className="text-slate-400"> (~{estimatedRemainingMin} mins)</span>
          </div>
        </div>

        <button
          onClick={handleToggleArm}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md ${
            isAlarmArmed
              ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40"
          }`}
        >
          {isAlarmArmed ? (
            <>
              <BellOff className="w-4 h-4 text-amber-400" />
              <span>Disarm Alarm</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span>Arm Wakeup Alarm</span>
            </>
          )}
        </button>
      </div>

      {notificationPermission !== "granted" && isAlarmArmed && (
        <p className="mt-2 text-[11px] text-amber-400/90 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Tip: Grant browser notification permissions so alerts ring even when your screen is locked.
        </p>
      )}
    </div>
  );
}
