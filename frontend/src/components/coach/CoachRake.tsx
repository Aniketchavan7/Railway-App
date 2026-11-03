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
        return "bg-rose-700 text-white border-rose-800";
      case "1A":
        return "bg-amber-600 text-white border-amber-700";
      case "2A":
        return "bg-yellow-500 text-slate-900 border-yellow-600";
      case "3A":
      case "3E":
        return "bg-blue-600 text-white border-blue-700";
      case "CC":
      case "EC":
        return "bg-purple-600 text-white border-purple-700";
      case "SL":
        return "bg-emerald-600 text-white border-emerald-700";
      case "GEN":
      case "GS":
        return "bg-slate-500 text-white border-slate-600";
      case "PC":
        return "bg-orange-500 text-white border-orange-600";
      default:
        return "bg-slate-400 text-white border-slate-500";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Rake Composition & Coach Sequence
          </h3>
          <p className="text-xs text-slate-500">
            {composition.train_name} ({composition.train_number}) • {composition.total_coaches} Coaches
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 font-medium text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-700" /> Loco
          </span>
          <span className="flex items-center gap-1 font-medium text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> AC 3A
          </span>
          <span className="flex items-center gap-1 font-medium text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Sleeper
          </span>
          <span className="flex items-center gap-1 font-medium text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> General
          </span>
        </div>
      </div>

      {/* Rake Track */}
      <div className="relative overflow-x-auto py-6 border-b border-t border-slate-200 scrollbar-thin">
        {/* Railway Track rails */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-300 -translate-y-2 pointer-events-none" />
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-300 translate-y-2 pointer-events-none" />

        <div className="relative flex items-center gap-2 min-w-max px-4">
          {composition.coaches.map((c) => {
            const isSelected = selectedCoach?.position_number === c.position_number;
            return (
              <button
                key={c.position_number}
                onClick={() => setSelectedCoach(c)}
                className={`flex flex-col items-center justify-center w-14 h-16 rounded-md border-2 font-bold text-xs transition-all shadow-sm ${getCoachColor(
                  c.coach_type
                )} ${isSelected ? "ring-4 ring-blue-400 scale-105" : "hover:scale-102"}`}
              >
                <span className="text-[10px] opacity-80">#{c.position_number}</span>
                <span className="tracking-tight">{c.coach_code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Coach Inspector */}
      {selectedCoach && (
        <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="text-slate-400">Coach Code: </span>
            <span className="font-bold text-slate-900 text-sm">{selectedCoach.coach_code}</span>
            <span className="text-slate-400 ml-4">Class: </span>
            <span className="font-semibold text-slate-800">{selectedCoach.coach_type}</span>
            <span className="text-slate-400 ml-4">Position in Rake: </span>
            <span className="font-semibold text-slate-800">
              {selectedCoach.position_number} of {composition.total_coaches}
            </span>
          </div>

          <div className="text-slate-600">
            Total Berths: <strong>{selectedCoach.total_berths}</strong> berths
          </div>
        </div>
      )}
    </div>
  );
}
