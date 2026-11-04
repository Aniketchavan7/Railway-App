"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeftRight, Train, ArrowRight, ShieldCheck, Clock } from "lucide-react";

interface TurnaroundRakeCardProps {
  currentTrainNumber: string;
  currentTrainName: string;
  pairingTrainNumber: string;
}

export function TurnaroundRakeCard({
  currentTrainNumber,
  currentTrainName,
  pairingTrainNumber,
}: TurnaroundRakeCardProps) {
  if (!pairingTrainNumber || pairingTrainNumber === currentTrainNumber) {
    return null;
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-paper-2 border border-rule/80 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-rule/60">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-accent" />
          <h4 className="font-display font-bold text-sm text-ink">
            Rake Sharing & Turnaround Link
          </h4>
        </div>
        <span className="text-[11px] font-outlier px-2.5 py-0.5 rounded-pill bg-accent/10 text-accent border border-accent/20 font-semibold">
          Single Rake Turnaround
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs text-ink font-medium leading-relaxed">
            Train <strong className="font-outlier font-bold text-accent">#{currentTrainNumber}</strong> shares its physical rake with reverse service{" "}
            <strong className="font-outlier font-bold text-ink">#{pairingTrainNumber}</strong>.
          </p>
          <p className="text-[11px] text-muted font-outlier leading-relaxed">
            Turnaround punctuality guarantee: If the incoming rake for #{pairingTrainNumber} encounters terminal delays, the departing departure of #{currentTrainNumber} will be rescheduled.
          </p>
        </div>

        <Link
          href={`/train?number=${pairingTrainNumber}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-paper hover:bg-paper-3 border border-rule text-xs font-bold text-ink shrink-0 transition-colors shadow-xs"
        >
          <Train className="w-3.5 h-3.5 text-accent" />
          <span>Track #{pairingTrainNumber} Status</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted" />
        </Link>
      </div>
    </div>
  );
}
