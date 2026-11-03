import { LocationType } from "@/lib/types";
import { AlertTriangle, MapPin, Radio, Cpu } from "lucide-react";

interface LocationTypePillProps {
  locationType: LocationType;
  isSimulated: boolean;
}

export function LocationTypePill({ locationType, isSimulated }: LocationTypePillProps) {
  if (isSimulated || locationType === "SIMULATED") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-accent-soft border border-accent/40 text-accent text-xs font-medium">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span className="font-outlier">Simulated timetable mode (offline trajectory)</span>
      </div>
    );
  }

  if (locationType === "GPS_OBSERVED") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-ok-soft border border-ok/30 text-ok text-xs font-medium">
        <Radio className="w-3 h-3 text-ok motion-safe:animate-pulse motion-reduce:animate-none" />
        <span className="font-outlier">Live satellite telemetry</span>
      </div>
    );
  }

  if (locationType === "STATION_OBSERVED") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-paper-3 border border-rule text-ink text-xs font-medium">
        <MapPin className="w-3 h-3 text-cool" />
        <span className="font-outlier">Station movement observation</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-cool-soft border border-cool/30 text-cool text-xs font-medium">
      <Cpu className="w-3 h-3 text-cool" />
      <span className="font-outlier">Estimated trajectory model</span>
    </div>
  );
}
