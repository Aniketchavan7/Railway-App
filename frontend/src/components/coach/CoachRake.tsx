"use client";

import { useState } from "react";
import Link from "next/link";
import { CoachComposition, CoachPosition } from "@/lib/types";
import {
  Train,
  MapPin,
  Footprints,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  Calculator,
} from "lucide-react";

interface CoachRakeProps {
  composition: CoachComposition;
}

export function CoachRake({ composition }: CoachRakeProps) {
  const [selectedCoach, setSelectedCoach] = useState<CoachPosition>(
    composition.coaches.length > 2
      ? composition.coaches[2]
      : composition.coaches[0]
  );

  const totalLengthM = composition.total_coaches * 24;

  const getCoachColor = (type: string) => {
    switch (type) {
      case "LOCO":
        return "bg-bad-soft text-bad border-bad/50";
      case "1A":
        return "bg-accent-soft text-accent border-accent/50";
      case "2A":
        return "bg-accent-soft/70 text-ink border-accent/30";
      case "3A":
      case "3E":
        return "bg-cool-soft text-cool border-cool/50";
      case "CC":
        return "bg-cool-soft/80 text-cool border-cool/40";
      case "EC":
        return "bg-accent-soft text-accent border-accent/50";
      case "SL":
        return "bg-ok-soft text-ok border-ok/50";
      case "GEN":
      case "GS":
        return "bg-paper-3 text-muted border-rule";
      case "PC":
        return "bg-accent-soft text-ink border-accent/40";
      default:
        return "bg-paper-3 text-muted border-rule";
    }
  };

  const getNearestFOB = (pos: number, total: number) => {
    const ratio = pos / total;
    if (ratio < 0.33) return "FOB 1 (Rear Entry)";
    if (ratio < 0.66) return "FOB 2 (Central Concourse)";
    return "FOB 3 (Front Exit)";
  };

  const getWalkingMinutes = (pos: number) => {
    const distM = (pos - 1) * 24;
    return Math.max(1, Math.round((distM % 150) / 60));
  };

  return (
    <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-6 space-y-5">
      {/* Header & Track Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-rule">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-outlier font-bold text-xs text-ink px-2 py-0.5 rounded-pill bg-paper-3 border border-rule">
              #{composition.train_number}
            </span>
            <h2 className="text-base sm:text-lg font-display font-bold text-ink">
              {composition.train_name}
            </h2>
          </div>
          <p className="text-xs text-muted font-outlier mt-1">
            {composition.total_coaches} coaches in rake / ~{totalLengthM} meters total length
          </p>
        </div>

        {/* Action Links & Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Link
            href={`/train?number=${composition.train_number}`}
            className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Train className="w-3.5 h-3.5" />
            <span>Track live</span>
          </Link>
          <span className="text-rule-2">/</span>
          <Link
            href={`/fare?train=${composition.train_number}`}
            className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Tariff fares</span>
          </Link>
        </div>
      </div>

      {/* Class Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="text-[11px] font-outlier font-medium">Classes:</span>
        <span className="flex items-center gap-1.5 font-outlier text-[11px]">
          <span className="w-2 h-2 rounded-full bg-bad" /> Loco
        </span>
        <span className="flex items-center gap-1.5 font-outlier text-[11px]">
          <span className="w-2 h-2 rounded-full bg-accent" /> 1A / EC
        </span>
        <span className="flex items-center gap-1.5 font-outlier text-[11px]">
          <span className="w-2 h-2 rounded-full bg-cool" /> 2A / 3A / CC
        </span>
        <span className="flex items-center gap-1.5 font-outlier text-[11px]">
          <span className="w-2 h-2 rounded-full bg-ok" /> Sleeper (SL)
        </span>
        <span className="flex items-center gap-1.5 font-outlier text-[11px]">
          <span className="w-2 h-2 rounded-full bg-muted" /> General (GS)
        </span>
      </div>

      {/* Platform Direction & FOB Markers */}
      <div className="space-y-1.5 pt-2">
        {/* Foot Overbridge (FOB) Reference Markers */}
        <div className="flex justify-between items-center text-[10px] font-outlier text-muted px-2">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-cool" />
            <span>FOB 1 (Rear Entry)</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-accent" />
            <span>FOB 2 (Main Concourse)</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-ok" />
            <span>FOB 3 (Front Exit)</span>
          </div>
        </div>

        {/* Direction Indicator */}
        <div className="flex items-center justify-between text-[11px] font-outlier text-muted px-1">
          <span className="flex items-center gap-1">
            <ArrowLeft className="w-3 h-3 text-muted" /> Rear of train (Guard van)
          </span>
          <span className="text-[10px] text-muted">Standard 550m platform alignment</span>
          <span className="flex items-center gap-1 text-ink font-semibold">
            Locomotive engine <ArrowRight className="w-3 h-3 text-accent" />
          </span>
        </div>
      </div>

      {/* Rake Track Visualizer */}
      <div className="relative overflow-x-auto py-6 border-b border-t border-rule scrollbar-thin">
        {/* Parallel Railway Rails */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rule-2 -translate-y-2 pointer-events-none" />
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rule-2 translate-y-2 pointer-events-none" />

        <div className="relative flex items-center gap-2 min-w-max px-4">
          {composition.coaches.map((c) => {
            const isSelected = selectedCoach?.position_number === c.position_number;
            return (
              <button
                key={c.position_number}
                type="button"
                onClick={() => setSelectedCoach(c)}
                className={`flex flex-col items-center justify-center w-14 h-16 rounded-pill border font-outlier font-bold text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent active:opacity-80 ${getCoachColor(
                  c.coach_type
                )} ${
                  isSelected
                    ? "border-accent ring-2 ring-accent shadow-xs"
                    : "hover:border-ink opacity-90 hover:opacity-100"
                }`}
              >
                <span className="text-[10px] opacity-70">#{c.position_number}</span>
                <span className="tracking-tight">{c.coach_code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Coach Platform Telemetry Strip - Type not tiles */}
      {selectedCoach && (
        <div className="pt-2 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-rule text-xs">
          <div className="p-3 sm:px-4">
            <span className="text-[10px] text-muted block font-outlier">
              Coach & class
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-outlier font-bold text-ink">
                {selectedCoach.coach_code}
              </span>
              <span className="text-xs text-muted font-outlier">
                ({selectedCoach.coach_type})
              </span>
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              Position {selectedCoach.position_number} of {composition.total_coaches}
            </span>
          </div>

          <div className="p-3 sm:px-4 pt-3 md:pt-3">
            <span className="text-[10px] text-muted block font-outlier">
              Platform pole location
            </span>
            <div className="mt-1 text-sm sm:text-base font-semibold text-ink font-outlier">
              Pole #{selectedCoach.position_number}
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              ~{(selectedCoach.position_number - 1) * 24}m from locomotive
            </span>
          </div>

          <div className="p-3 sm:px-4 pt-3 md:pt-3">
            <span className="text-[10px] text-muted block font-outlier">
              Nearest foot overbridge
            </span>
            <div className="mt-1 text-sm sm:text-base font-semibold text-ink">
              {getNearestFOB(selectedCoach.position_number, composition.total_coaches)}
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              Direct concourse access
            </span>
          </div>

          <div className="p-3 sm:px-4 pt-3 md:pt-3">
            <span className="text-[10px] text-muted block font-outlier">
              Walking guidance
            </span>
            <div className="mt-1 flex items-center gap-1.5 text-sm sm:text-base font-semibold text-ink">
              <Footprints className="w-4 h-4 text-accent shrink-0" />
              <span>~{getWalkingMinutes(selectedCoach.position_number)} min walk</span>
            </div>
            <span className="text-[10px] text-muted block mt-0.5 font-outlier">
              {selectedCoach.total_berths} total berths capacity
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
