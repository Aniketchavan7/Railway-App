import { LocationType } from "@/lib/types";
import { AlertTriangle, MapPin, Radio, Cpu } from "lucide-react";

interface LocationTypePillProps {
  locationType: LocationType;
  isSimulated: boolean;
}

export function LocationTypePill({ locationType, isSimulated }: LocationTypePillProps) {
  if (isSimulated || locationType === "SIMULATED") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-semibold">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>SIMULATED DEMO DATA — Offline Timetable Mode (Not Genuine Satellite GPS)</span>
      </div>
    );
  }

  if (locationType === "GPS_OBSERVED") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
        <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
        <span>Live RTIS/GPS Coordinates</span>
      </div>
    );
  }

  if (locationType === "STATION_OBSERVED") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
        <MapPin className="w-3.5 h-3.5 text-slate-500" />
        <span>Station Movement Event</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium">
      <Cpu className="w-3.5 h-3.5 text-purple-500" />
      <span>Estimated Trajectory</span>
    </div>
  );
}
