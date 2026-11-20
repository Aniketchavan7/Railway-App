export interface TrainCoordinates {
  latitude: number;
  longitude: number;
  speedKmH: number;
  headingDegrees?: number;
  timestamp: string;
}

export interface TrainStationHalt {
  stationCode: string;
  stationName: string;
  scheduledArrival: string;
  scheduledDeparture: string;
  actualArrival?: string;
  actualDeparture?: string;
  delayMinutes: number;
  platform?: string;
  distanceKm: number;
}

export interface LiveTrainStatus {
  trainNumber: string;
  trainName: string;
  currentStationCode: string;
  nextStationCode: string;
  delayMinutes: number;
  coordinates: TrainCoordinates;
  halts: TrainStationHalt[];
  lastUpdated: string;
}
