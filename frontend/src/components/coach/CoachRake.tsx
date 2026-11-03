"use client";

import { useState } from "react";
import { CoachComposition, CoachPosition } from "@/lib/types";

interface CoachRakeProps {
  composition: CoachComposition;
}

export function CoachRake({ composition }: CoachRakeProps) {
  const [selectedCoach, setSelectedCoach] = useState<CoachPosition | null>(null);

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
      case "EC":
        return "bg-cool-soft/80 text-ink border-cool/40";
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

  return (
    <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 mb-4">
        <div>
          <h3 className="text-sm font-display font-bold text-ink">
            Rake composition and coach sequence
          </h3>
          <p className="text-xs text-muted">
            {composition.train_name} ({composition.train_number}) / {composition.total_coaches} coaches
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-normal text-muted">
            <span className="w-2 h-2 rounded-full bg-bad" /> Loco
          </span>
          <span className="flex items-center gap-1.5 font-normal text-muted">
            <span className="w-2 h-2 rounded-full bg-cool" /> AC 3A
          </span>
          <span className="flex items-center gap-1.5 font-normal text-muted">
            <span className="w-2 h-2 rounded-full bg-ok" /> Sleeper
          </span>
          <span className="flex items-center gap-1.5 font-normal text-muted">
            <span className="w-2 h-2 rounded-full bg-muted" /> General
          </span>
        </div>
      </div>

      {/* Rake Track */}
      <div className="relative overflow-x-auto py-6 border-b border-t border-rule scrollbar-thin">
        {/* Railway Track rails */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rule -translate-y-2 pointer-events-none" />
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rule translate-y-2 pointer-events-none" />

        <div className="relative flex items-center gap-2 min-w-max px-4">
          {composition.coaches.map((c) => {
            const isSelected = selectedCoach?.position_number === c.position_number;
            return (
              <button
                key={c.position_number}
                type="button"
                onClick={() => setSelectedCoach(c)}
                className={`flex flex-col items-center justify-center w-14 h-16 rounded-pill border font-outlier font-bold text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed ${getCoachColor(
                  c.coach_type
                )} ${isSelected ? "border-accent ring-2 ring-accent" : "hover:border-ink"}`}
              >
                <span className="text-[10px] opacity-70">#{c.position_number}</span>
                <span className="tracking-tight">{c.coach_code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Coach Inspector */}
      {selectedCoach && (
        <div className="mt-4 p-4 rounded-pill bg-paper-3 border border-rule flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="text-muted">Coach code: </span>
            <span className="font-bold text-ink text-sm font-outlier">{selectedCoach.coach_code}</span>
            <span className="text-muted ml-4">Class: </span>
            <span className="font-semibold text-ink font-outlier">{selectedCoach.coach_type}</span>
            <span className="text-muted ml-4">Position in rake: </span>
            <span className="font-semibold text-ink font-outlier">
              {selectedCoach.position_number} of {composition.total_coaches}
            </span>
          </div>

          <div className="text-muted font-outlier">
            Total berths: <strong className="text-ink">{selectedCoach.total_berths}</strong> berths
          </div>
        </div>
      )}
    </div>
  );
}
