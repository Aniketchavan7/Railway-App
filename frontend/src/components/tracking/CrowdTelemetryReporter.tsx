"use client";

import { Activity, Compass, Gauge, Loader2, MapPin, Radio, ShieldCheck, StopCircle, Users } from "lucide-react";
import { LocationShare } from "@/lib/useLocationShare";

interface CrowdTelemetryReporterProps {
  trainNumber: string;
  trainName: string;
  share: LocationShare;
  activeReporters: number;
  canShare: boolean;
}

function statusText(share: LocationShare): string {
  const result = share.lastResult;
  if (share.phase === "requesting") return "Waiting for GPS…";
  if (!result) return "Getting your first fix…";
  if (result.status === "accepted") return "Helping others now";
  if (result.status === "pending") return "Checking your position…";
  if (result.status === "rejected") return "Not being used";
  return "Sharing";
}

export function CrowdTelemetryReporter({
  trainNumber,
  trainName,
  share,
  activeReporters,
  canShare,
}: CrowdTelemetryReporterProps) {
  const isOn = share.phase !== "idle";
  const coords = share.coords;

  return (
    <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-full shrink-0 ${
              isOn ? "bg-ok-soft text-ok ring-2 ring-ok/30" : "bg-paper-3 text-muted border border-rule"
            }`}
          >
            {isOn ? <Radio className="w-5 h-5 text-ok" /> : <Compass className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-display font-bold text-ink">Share train location</h3>
              {activeReporters > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-outlier font-semibold bg-ok-soft text-ok border border-ok/30">
                  <Users className="w-3 h-3" />
                  {activeReporters} {activeReporters === 1 ? "passenger" : "passengers"} sharing
                </span>
              )}
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {canShare ? (
                <>
                  On <strong className="text-ink">#{trainNumber} {trainName}</strong>? Your GPS shows everyone where it really is.
                </>
              ) : (
                "Sharing is available while this train is running."
              )}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-auto">
          {isOn ? (
            <button
              type="button"
              onClick={share.stop}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-pill bg-bad/10 hover:bg-bad/20 active:bg-bad/30 text-bad border border-bad/30 text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-bad"
            >
              <StopCircle className="w-4 h-4" />
              <span>Stop sharing</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={share.start}
              disabled={!canShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-pill bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink text-xs font-semibold cursor-pointer transition-opacity whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
            >
              <MapPin className="w-4 h-4" />
              <span>Share location</span>
            </button>
          )}
        </div>
      </div>

      {share.error && (
        <div className="mt-3 p-2.5 rounded-lg bg-bad/10 border border-bad/30 text-bad text-xs font-medium flex items-start gap-2">
          <Activity className="w-4 h-4 shrink-0" />
          <span>{share.error}</span>
        </div>
      )}
      {share.notice && !share.error && (
        <div className="mt-3 p-2.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-xs font-medium flex items-start gap-2">
          <Activity className="w-4 h-4 shrink-0" />
          <span>{share.notice}</span>
        </div>
      )}

      {isOn && (
        <div className="mt-4 pt-3 border-t border-rule space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-paper-3 border border-rule flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cool shrink-0" />
              <div>
                <span className="text-[10px] text-muted block leading-none">Your speed</span>
                <span className="font-outlier font-bold text-ink">
                  {coords?.speed != null ? `${Math.max(0, Math.round(coords.speed * 3.6))} km/h` : "Not known yet"}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-paper-3 border border-rule flex items-center gap-2">
              <Compass className="w-4 h-4 text-ok shrink-0" />
              <div>
                <span className="text-[10px] text-muted block leading-none">GPS accuracy</span>
                <span className="font-outlier font-semibold text-ink">
                  {coords?.accuracy ? `±${Math.round(coords.accuracy)} m` : "Detecting…"}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-paper-3 border border-rule flex items-center gap-2 col-span-2 sm:col-span-1">
              {share.phase === "requesting" ? (
                <Loader2 className="w-4 h-4 text-accent motion-safe:animate-spin shrink-0" />
              ) : (
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    share.lastResult?.status === "rejected" ? "bg-bad" : "bg-ok"
                  }`}
                />
              )}
              <div className="overflow-hidden">
                <span className="text-[10px] text-muted block leading-none">Status</span>
                <span className="font-outlier font-semibold text-ink truncate block">{statusText(share)}</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            Keep this page open with your screen on. Phones pause location for web pages when locked or in the background.
          </p>
        </div>
      )}

      <div className="mt-3 pt-2.5 border-t border-rule/60 flex items-start gap-2 text-[11px] text-muted leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-ok shrink-0" />
        <span>
          <strong className="text-ink font-medium">Privacy:</strong> no account or personal details. Your position shows
          anonymously as the train&apos;s position while you share, and is deleted within about a minute of your last update.
        </span>
      </div>
    </div>
  );
}
