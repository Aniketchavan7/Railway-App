import { LocationType, PositionBasis } from "@/lib/types";
import { AlertTriangle, MapPin, MapPinOff, Radio, Route, Users } from "lucide-react";

interface LocationTypePillProps {
  locationType: LocationType;
  isSimulated: boolean;
  positionBasis?: PositionBasis;
  crowdReporters?: number;
  hasPosition?: boolean;
}

const PILL = "flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium border";

export function LocationTypePill({
  locationType,
  isSimulated,
  positionBasis,
  crowdReporters = 0,
  hasPosition = true,
}: LocationTypePillProps) {
  if (isSimulated || locationType === "SIMULATED") {
    return (
      <div className={`${PILL} bg-accent-soft border-accent/40 text-accent`}>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span className="font-outlier">Simulated demo data</span>
      </div>
    );
  }
  if (positionBasis === "PASSENGER_GPS") {
    return (
      <div className={`${PILL} bg-ok-soft border-ok/40 text-ok`}>
        <Users className="w-3.5 h-3.5" />
        <span className="font-outlier">
          GPS from {crowdReporters === 1 ? "1 passenger" : `${crowdReporters} passengers`}
        </span>
      </div>
    );
  }
  if (positionBasis === "PROVIDER_GPS") {
    return (
      <div className={`${PILL} bg-ok-soft border-ok/30 text-ok`}>
        <Radio className="w-3 h-3" />
        <span className="font-outlier">Live GPS</span>
      </div>
    );
  }
  if (!hasPosition) {
    return (
      <div className={`${PILL} bg-paper-3 border-rule text-muted`}>
        <MapPinOff className="w-3 h-3" />
        <span className="font-outlier">No live position</span>
      </div>
    );
  }
  if (positionBasis === "ESTIMATED") {
    return (
      <div className={`${PILL} bg-cool-soft border-cool/30 text-cool`}>
        <Route className="w-3 h-3" />
        <span className="font-outlier">Estimated position</span>
      </div>
    );
  }
  if (positionBasis === "SCHEDULED") {
    return (
      <div className={`${PILL} bg-paper-3 border-rule text-ink`}>
        <MapPin className="w-3 h-3 text-cool" />
        <span className="font-outlier">Starting station</span>
      </div>
    );
  }
  return (
    <div className={`${PILL} bg-paper-3 border-rule text-ink`}>
      <MapPin className="w-3 h-3 text-cool" />
      <span className="font-outlier">Last reported station</span>
    </div>
  );
}
