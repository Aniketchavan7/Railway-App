"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { todayIstDate } from "@/lib/format";
import { LocationShare } from "@/lib/useLocationShare";

interface OnTrainPromptProps {
  trainNumber: string;
  trainName: string;
  share: LocationShare;
}

function declinedKey(trainNumber: string): string {
  return `railpulse_not_on_train:${trainNumber}:${todayIstDate()}`;
}

/** Asks first. The browser's own permission prompt only appears after "Yes". */
export function OnTrainPrompt({ trainNumber, trainName, share }: OnTrainPromptProps) {
  const [declined, setDeclined] = useState(true);

  useEffect(() => {
    try {
      setDeclined(localStorage.getItem(declinedKey(trainNumber)) === "1");
    } catch {
      setDeclined(false);
    }
  }, [trainNumber]);

  const decline = () => {
    setDeclined(true);
    try {
      localStorage.setItem(declinedKey(trainNumber), "1");
    } catch {
      // Without storage the question may simply return next visit.
    }
  };

  if (declined || share.phase !== "idle" || share.error) return null;

  return (
    <div className="p-4 rounded-card bg-paper-2 border border-accent/40 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="flex items-start gap-3 min-w-0">
        <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">Are you on {trainName}?</p>
          <p className="text-xs text-muted leading-relaxed">
            Share your location and everyone tracking #{trainNumber} sees where it really is. It&apos;s
            anonymous, and it stops when you tap stop or leave this page.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={share.start}
          className="px-3.5 py-2 rounded-pill bg-accent hover:opacity-90 active:opacity-80 text-accent-ink text-xs font-semibold cursor-pointer transition-opacity focus-visible:outline-2 focus-visible:outline-accent whitespace-nowrap"
        >
          Yes, I&apos;m on this train
        </button>
        <button
          type="button"
          onClick={decline}
          className="px-3.5 py-2 rounded-pill bg-paper-3 hover:bg-paper text-ink border border-rule text-xs font-medium cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-accent"
        >
          No
        </button>
      </div>
    </div>
  );
}
