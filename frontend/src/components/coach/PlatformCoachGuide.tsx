"use client";

import React, { useState } from "react";
import { Train, MapPin, Footprints, Info, ArrowRight, Compass } from "lucide-react";

export interface CoachItem {
  position_number: number;
  coach_code: string;
  coach_type: string;
  total_berths?: number;
  platform_pole_number?: number;
  distance_from_engine_m?: number;
  nearest_fob?: string;
}

interface PlatformCoachGuideProps {
  trainNumber: string;
  trainName: string;
  coaches: CoachItem[];
  platformNumber?: string | null;
  stationName?: string;
}

export function PlatformCoachGuide({
  trainNumber,
  trainName,
  coaches = [],
  platformNumber,
  stationName,
}: PlatformCoachGuideProps) {
  const [selectedCoachCode, setSelectedCoachCode] = useState<string>(
    coaches.length > 2 ? coaches[2].coach_code : coaches[0]?.coach_code || ""
  );

  const selectedCoach =
    coaches.find((c) => c.coach_code === selectedCoachCode) || coaches[0];

  const totalLengthM = coaches.length * 24;

  const getCoachTypeBg = (code: string, type: string) => {
    if (code === "LOCO") return "bg-red-600/30 border-red-500 text-red-300";
    if (type === "1A") return "bg-purple-600/30 border-purple-500 text-purple-200";
    if (type === "2A") return "bg-indigo-600/30 border-indigo-500 text-indigo-200";
    if (type === "3A" || type === "3E") return "bg-blue-600/30 border-blue-500 text-blue-200";
    if (type === "EC") return "bg-amber-600/30 border-amber-500 text-amber-200";
    if (type === "CC") return "bg-cyan-600/30 border-cyan-500 text-cyan-200";
    if (type === "SL") return "bg-emerald-600/30 border-emerald-500 text-emerald-200";
    return "bg-slate-700/50 border-slate-600 text-slate-300";
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Train className="w-5 h-5" />
            </span>
            <h3 className="text-base font-semibold text-slate-100">
              Platform Coach Position & FOB Guide
            </h3>
            {platformNumber && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600/30 text-blue-300 border border-blue-500/40">
                Platform {platformNumber}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {trainName || `Train #${trainNumber}`} • {coaches.length} Coaches (~{totalLengthM} meters)
            {stationName ? ` at ${stationName}` : ""}
          </p>
        </div>

        {/* Selected Coach Quick Pill */}
        {selectedCoach && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-700 text-xs">
            <span className="text-slate-400">Selected:</span>
            <span className="font-bold text-white bg-blue-600/40 px-2 py-0.5 rounded border border-blue-500/50">
              {selectedCoach.coach_code}
            </span>
            <span className="text-slate-400">
              Pole #{selectedCoach.platform_pole_number || selectedCoach.position_number}
            </span>
          </div>
        )}
      </div>

      {/* Selected Coach Platform Details Banner */}
      {selectedCoach && (
        <div className="mb-5 p-4 rounded-lg bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-purple-950/30 border border-blue-500/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Platform Pole</span>
              <span className="font-bold text-slate-100 text-sm">
                Pole #{selectedCoach.platform_pole_number || selectedCoach.position_number}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Distance from Engine</span>
              <span className="font-bold text-slate-100 text-sm">
                ~{selectedCoach.distance_from_engine_m ?? (selectedCoach.position_number - 1) * 24} meters
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Nearest Foot Overbridge</span>
              <span className="font-bold text-emerald-300 text-sm">
                {selectedCoach.nearest_fob || "FOB 2 (Central Bridge)"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Walking Advice</span>
              <span className="text-slate-300 text-xs flex items-center gap-1 mt-0.5">
                <Footprints className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                ~{Math.max(1, Math.round(((selectedCoach.distance_from_engine_m ?? 50) % 150) / 60))} min walk from stairs
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Platform Direction Indicator */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
        <span className="flex items-center gap-1 font-mono">
          <ArrowRight className="w-3.5 h-3.5 text-red-400 rotate-180" /> Rear of Train (Guard Van / SLR)
        </span>
        <span className="text-slate-500 font-semibold">550m Platform Track</span>
        <span className="flex items-center gap-1 font-mono text-blue-300">
          Engine / Locomotive <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
        </span>
      </div>

      {/* Foot Overbridge (FOB) Reference Markers above track */}
      <div className="relative mb-1 flex justify-between px-4 text-[10px] text-slate-400">
        <div className="flex items-center gap-1 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800">
          <MapPin className="w-3 h-3 text-purple-400" />
          <span>FOB 1 (Rear Entry)</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800">
          <MapPin className="w-3 h-3 text-blue-400" />
          <span>FOB 2 (Main Concourse)</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800">
          <MapPin className="w-3 h-3 text-emerald-400" />
          <span>FOB 3 (Front Exit)</span>
        </div>
      </div>

      {/* Interactive Platform Rake Track */}
      <div className="relative overflow-x-auto pb-4 pt-2 no-scrollbar">
        {/* Track Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0" />

        <div className="relative z-10 flex items-center gap-1.5 min-w-max px-2">
          {coaches.map((c, idx) => {
            const isSelected = c.coach_code === selectedCoachCode;
            const poleNum = c.platform_pole_number || idx + 1;
            const typeStyle = getCoachTypeBg(c.coach_code, c.coach_type);

            return (
              <button
                key={`${c.coach_code}-${idx}`}
                onClick={() => setSelectedCoachCode(c.coach_code)}
                className={`group relative flex flex-col items-center justify-center rounded-lg border px-2.5 py-2 transition-all min-w-[56px] ${typeStyle} ${
                  isSelected
                    ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 scale-105 shadow-lg shadow-blue-500/20"
                    : "hover:scale-102 hover:border-slate-500"
                }`}
              >
                {/* Pole indicator */}
                <span className="text-[9px] font-mono opacity-60 block mb-0.5">
                  #{poleNum}
                </span>

                {/* Coach code */}
                <span className="text-xs font-bold font-mono tracking-tight block">
                  {c.coach_code}
                </span>

                {/* Coach Class tag */}
                <span className="text-[9px] opacity-75 uppercase font-medium">
                  {c.coach_type}
                </span>

                {/* Small indicator dot if selected */}
                {isSelected && (
                  <span className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend & Instructions */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 pt-3 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-purple-500/60" /> 1A (AC First)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-indigo-500/60" /> 2A (AC 2-Tier)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-blue-500/60" /> 3A / 3E (AC 3-Tier)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/60" /> SL (Sleeper)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500/60" /> EC / CC (Chair Car)
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <Info className="w-3.5 h-3.5" />
          <span>Click any coach to highlight platform pole and walking distance</span>
        </div>
      </div>
    </div>
  );
}
