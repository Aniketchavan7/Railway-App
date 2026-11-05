"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Train,
  Compass,
  ArrowRight,
  Search,
  CheckCircle2,
  MapPin,
  HelpCircle,
  Footprints,
  Info,
} from "lucide-react";
import { CoachComposition, CoachPosition } from "@/lib/types";

interface CoachPositionVisualizerProps {
  composition: CoachComposition;
  currentPlatform?: string | null;
}

export function CoachPositionVisualizer({
  composition,
  currentPlatform,
}: CoachPositionVisualizerProps) {
  const [selectedCoachCode, setSelectedCoachCode] = useState<string>(
    composition.coaches[0]?.coach_code || ""
  );
  const [searchCoachQuery, setSearchCoachQuery] = useState("");
  const [direction, setDirection] = useState<"LEFT" | "RIGHT">("LEFT");

  const orderedCoaches = useMemo(() => {
    const list = [...composition.coaches];
    return direction === "LEFT" ? list : list.reverse();
  }, [composition.coaches, direction]);

  const selectedCoach = useMemo(() => {
    return (
      composition.coaches.find(
        (c) => c.coach_code.toLowerCase() === selectedCoachCode.toLowerCase()
      ) || composition.coaches[0]
    );
  }, [composition.coaches, selectedCoachCode]);

  const handleSearchCoach = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchCoachQuery.trim().toUpperCase();
    const found = composition.coaches.find(
      (c) => c.coach_code.toUpperCase() === clean
    );
    if (found) {
      setSelectedCoachCode(found.coach_code);
    }
  };

  const getCoachColor = (type: string, code: string) => {
    const upper = (code || type || "").toUpperCase();
    if (upper.includes("ENG") || upper.includes("LOCO")) {
      return "bg-accent/20 border-accent text-accent";
    }
    if (upper.startsWith("EC") || upper.startsWith("EA") || upper.startsWith("1A") || upper.startsWith("H")) {
      return "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400";
    }
    if (upper.startsWith("C") || upper.startsWith("2A") || upper.startsWith("A")) {
      return "bg-cool/15 border-cool/40 text-cool";
    }
    if (upper.startsWith("B") || upper.startsWith("3A") || upper.startsWith("M")) {
      return "bg-ok/15 border-ok/40 text-ok";
    }
    if (upper.startsWith("S") || upper.startsWith("SL")) {
      return "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400";
    }
    if (upper.startsWith("PC") || upper.includes("PANTRY")) {
      return "bg-orange-500/15 border-orange-500/40 text-orange-600 dark:text-orange-400";
    }
    return "bg-paper-3 border-rule text-muted";
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 rounded-2xl bg-paper-2 border border-rule/80 shadow-xs">
      {/* Header with Title and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rule/70">
        <div>
          <div className="flex items-center gap-2">
            <Train className="w-4 h-4 text-accent" />
            <h3 className="font-display font-bold text-ink text-base">
              Rake & Coach Position Layout
            </h3>
            <span className="text-[11px] font-outlier px-2 py-0.5 rounded-pill bg-paper-3 text-muted border border-rule">
              {composition.total_coaches} Coaches
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5 font-outlier">
            Platform alignment, pole markers, and distance from locomotive
          </p>
        </div>

        {/* Coach Finder Input */}
        <form onSubmit={handleSearchCoach} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchCoachQuery}
              onChange={(e) => setSearchCoachQuery(e.target.value)}
              placeholder="Find coach (e.g. B4, C1)…"
              className="w-36 sm:w-44 bg-paper focus:bg-paper-2 text-xs font-outlier font-bold pl-8 pr-2.5 py-1.5 rounded-pill border border-rule focus:border-accent outline-none text-ink placeholder:text-muted transition-colors uppercase"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-accent hover:opacity-90 text-accent-ink rounded-pill text-xs font-semibold cursor-pointer transition-opacity"
          >
            Locate
          </button>
        </form>
      </div>

      {/* Horizontal Rake Train Track Visualizer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted font-outlier">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>Direction: Engine facing {direction === "LEFT" ? "Forward (Left)" : "Rear (Right)"}</span>
          </span>
          <button
            type="button"
            onClick={() => setDirection((d) => (d === "LEFT" ? "RIGHT" : "LEFT"))}
            className="text-[11px] text-accent hover:underline cursor-pointer flex items-center gap-1"
          >
            <Compass className="w-3 h-3" />
            <span>Reverse Platform Orientation</span>
          </button>
        </div>

        {/* Track Bed with Horizontal Scroll */}
        <div className="relative overflow-x-auto p-4 rounded-xl bg-paper border border-rule/70 scrollbar-thin">
          {/* Rails Graphic */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-rule/50 pointer-events-none" />

          <div className="flex items-center gap-2 min-w-max relative z-10 py-2">
            {/* Engine Cab */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-12 rounded-l-2xl rounded-r-md bg-accent text-accent-ink flex flex-col items-center justify-center font-outlier font-black text-xs shadow-xs border border-accent">
                <span>LOCO</span>
                <span className="text-[9px] opacity-80">WAP-7</span>
              </div>
              <span className="text-[10px] font-outlier text-muted mt-1">Engine</span>
            </div>

            {/* Coaches Strip */}
            {orderedCoaches.map((coach) => {
              const isSelected = selectedCoach?.coach_code === coach.coach_code;
              const colorClass = getCoachColor(coach.coach_type, coach.coach_code);
              return (
                <button
                  key={coach.coach_code}
                  type="button"
                  onClick={() => setSelectedCoachCode(coach.coach_code)}
                  className={`group relative flex flex-col items-center cursor-pointer transition-all ${
                    isSelected ? "scale-105" : "hover:scale-102"
                  }`}
                >
                  <div
                    className={`w-14 h-12 rounded-lg border-2 flex flex-col items-center justify-center font-outlier font-bold text-xs transition-all shadow-xs ${colorClass} ${
                      isSelected
                        ? "ring-2 ring-accent ring-offset-2 ring-offset-paper border-accent shadow-md"
                        : ""
                    }`}
                  >
                    <span>{coach.coach_code}</span>
                    <span className="text-[9px] opacity-80 font-normal">
                      {coach.coach_type}
                    </span>
                  </div>

                  {/* Pole Marker Number */}
                  <div className="flex items-center gap-0.5 text-[10px] font-outlier text-muted mt-1">
                    <span>P{coach.platform_pole_number || coach.position_number}</span>
                  </div>

                  {/* Selected Indicator Arrow */}
                  {isSelected && (
                    <motion.div
                      layoutId="coachIndicator"
                      className="absolute -top-2 w-2 h-2 bg-accent rounded-full"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}

            {/* Rear Guard Brake Van */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-r-2xl rounded-l-md bg-paper-3 text-muted border border-rule flex flex-col items-center justify-center font-outlier font-bold text-xs">
                <span>SLR</span>
                <span className="text-[9px] opacity-80">Guard</span>
              </div>
              <span className="text-[10px] font-outlier text-muted mt-1">Rear</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Coach Detailed Inspector Card */}
      {selectedCoach && (
        <motion.div
          key={selectedCoach.coach_code}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="p-4 rounded-xl bg-paper border border-rule space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-rule/60">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold font-outlier text-ink">
                Coach {selectedCoach.coach_code}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-pill bg-accent/10 text-accent border border-accent/20 font-semibold font-outlier">
                {selectedCoach.coach_type} • Position #{selectedCoach.position_number}
              </span>
              {currentPlatform && (
                <span className="text-xs px-2 py-0.5 rounded-pill bg-paper-3 border border-rule text-ink font-outlier">
                  Platform {currentPlatform}
                </span>
              )}
            </div>

            <span className="text-xs font-outlier text-muted">
              Capacity: <strong>{selectedCoach.total_berths} Berths</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-paper-2 border border-rule/70 space-y-0.5">
              <span className="text-[11px] text-muted font-outlier block flex items-center gap-1">
                <MapPin className="w-3 h-3 text-accent" />
                <span>Approximate pole (estimated)</span>
              </span>
              <div className="font-bold text-ink text-sm font-outlier">
                Pole #{selectedCoach.platform_pole_number || selectedCoach.position_number}
              </div>
              <p className="text-[10px] text-muted">
                Look for the overhead digital display or platform pole #{selectedCoach.platform_pole_number || selectedCoach.position_number}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-paper-2 border border-rule/70 space-y-0.5">
              <span className="text-[11px] text-muted font-outlier block flex items-center gap-1">
                <Train className="w-3 h-3 text-cool" />
                <span>Distance from Engine</span>
              </span>
              <div className="font-bold text-ink text-sm font-outlier">
                ~{selectedCoach.distance_from_engine_m ?? (selectedCoach.position_number - 1) * 24} Meters
              </div>
              <p className="text-[10px] text-muted">
                {selectedCoach.position_number <= 4
                  ? "Near locomotive front section"
                  : selectedCoach.position_number <= 10
                  ? "Middle rake concourse section"
                  : "Rear rake section"}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-paper-2 border border-rule/70 space-y-0.5">
              <span className="text-[11px] text-muted font-outlier block flex items-center gap-1">
                <Footprints className="w-3 h-3 text-ok" />
                <span>Nearest Foot Over Bridge</span>
              </span>
              <div className="font-bold text-ok text-sm font-outlier">
                {selectedCoach.nearest_fob || "Central Concourse Bridge"}
              </div>
              <p className="text-[10px] text-muted">
                Closest stairs, escalator, and station exit ramp
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
