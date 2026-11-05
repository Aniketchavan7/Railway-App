export type FreshnessState = "LIVE" | "RECENT" | "STALE" | "UNKNOWN";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type LocationType =
  | "GPS_OBSERVED"
  | "STATION_OBSERVED"
  | "PROVIDER_ESTIMATED"
  | "APPLICATION_ESTIMATED"
  | "SIMULATED"
  | "UNKNOWN";

export interface StationHalt {
  station_code: string;
  station_name: string;
  arrival_time?: string | null;
  departure_time?: string | null;
  actual_arrival?: string | null;
  actual_departure?: string | null;
  distance_km: number;
  day_count: number;
  platform?: string | null;
  delay_minutes: number;
  has_arrived: boolean;
  has_departed: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PassengerTelemetryReport {
  reporter_id: string;
  latitude: number;
  longitude: number;
  speed_kmph?: number;
  accuracy_meters?: number;
  heading?: number;
}

export interface TelemetryReportResult {
  status: "accepted" | "pending" | "ignored" | "rejected";
  reason?: string | null;
  message?: string | null;
  active_reporters: number;
}

export type ServiceState =
  | "RUNNING"
  | "NOT_STARTED"
  | "COMPLETED"
  | "NOT_RUNNING_TODAY"
  | "CANCELLED"
  | "UNKNOWN";

export type PositionBasis = "PASSENGER_GPS" | "PROVIDER_GPS" | "ESTIMATED" | "STATION" | "SCHEDULED" | "NONE";

export interface RailwayStatus {
  train_number: string;
  train_name: string;
  journey_date: string;
  running_status: string;
  delay_minutes: number;
  current_station?: string | null;
  previous_station?: string | null;
  next_station?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  speed_kmph?: number | null;
  expected_arrival?: string | null;
  expected_departure?: string | null;
  source_provider: string;
  observed_at: string;
  fetched_at: string;
  age_seconds: number;
  freshness: FreshnessState;
  confidence: ConfidenceLevel;
  location_type: LocationType;
  is_simulated: boolean;
  halts: StationHalt[];
  runs_today?: boolean | null;
  days_of_run?: string[];
  service_state: ServiceState;
  service_notice?: string | null;
  pairing_train_number?: string | null;
  journey_date_label?: string | null;
  also_running_note?: string | null;
  next_run_date?: string | null;
  origin_code?: string | null;
  origin_name?: string | null;
  destination_code?: string | null;
  destination_name?: string | null;
  previous_station_code?: string | null;
  current_station_code?: string | null;
  next_station_code?: string | null;
  next_eta?: string | null;
  route_progress_percent?: number | null;
  position_basis: PositionBasis;
  position_label?: string | null;
  crowd_reporters: number;
  exceptions: Array<Record<string, unknown>>;
}

export interface Station {
  station_code: string;
  station_name: string;
  state?: string | null;
  zone?: string | null;
  division?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface StationBoardItem {
  train_number: string;
  train_name: string;
  origin: string;
  destination: string;
  scheduled_arrival?: string | null;
  expected_arrival?: string | null;
  scheduled_departure?: string | null;
  expected_departure?: string | null;
  delay_arrival_minutes: number;
  delay_departure_minutes: number;
  platform?: string | null;
  status: string;
}

export interface StationLiveBoard {
  station_code: string;
  station_name: string;
  window_hours: number;
  updated_at: string;
  trains: StationBoardItem[];
  source_provider: string;
  is_simulated: boolean;
}

export interface CoachPosition {
  position_number: number;
  coach_code: string;
  coach_type: string;
  total_berths: number;
  platform_pole_number?: number;
  distance_from_engine_m?: number;
  nearest_fob?: string;
}

export interface CoachComposition {
  train_number: string;
  train_name: string;
  total_coaches: number;
  coaches: CoachPosition[];
  source_provider: string;
  is_simulated: boolean;
  engine_direction?: string;
  total_length_meters?: number;
}

export interface FareClassBreakdown {
  class_code: string;
  class_name: string;
  base_fare: number;
  reservation_charge: number;
  superfast_charge: number;
  gst: number;
  tatkal_surcharge: number;
  total_fare: number;
}

export interface FareEnquiryResult {
  train_number: string;
  train_name: string;
  origin_station: string;
  destination_station: string;
  distance_km: number;
  quota: string;
  classes: FareClassBreakdown[];
  pricing_engine: string;
  source_provider: string;
  is_simulated: boolean;
}

export interface PassengerStatus {
  passenger_number: number;
  booking_status: string;
  current_status: string;
  coach?: string | null;
  berth_number?: number | null;
  berth_type?: string | null;
}

export interface PNRStatus {
  pnr: string;
  train_number: string;
  train_name: string;
  journey_date: string;
  from_station: string;
  to_station: string;
  boarding_station: string;
  reserved_up_to: string;
  reservation_class: string;
  quota: string;
  chart_status: string;
  passengers: PassengerStatus[];
  source_provider: string;
  is_simulated: boolean;
  verification_tier: string;
  privacy_notice: string;
}

export interface TelemetryPacket {
  type: string;
  train_number: string;
  transport: {
    server_time: string;
    heartbeat_interval_ms: number;
  };
  telemetry: RailwayStatus & {
    current_age_seconds: number;
  };
}

export type DisruptionType =
  | "MEGA_BLOCK"
  | "ROUTE_DIVERSION"
  | "CANCELLATION"
  | "RESCHEDULED"
  | "RUNNING_LATE"
  | "SHORT_TERMINATION"
  | "SAFETY_REGULATION";

export type DisruptionSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "ADVISORY";

export interface RailwayAlert {
  id: string;
  alert_type: DisruptionType;
  title: string;
  train_number?: string | null;
  train_name?: string | null;
  zone: string;
  section_or_corridor: string;
  diverted_via?: string | null;
  skipped_halts: string[];
  delay_minutes?: number | null;
  rescheduled_time?: string | null;
  reason: string;
  impact_description: string;
  action_advised: string;
  effective_from: string;
  effective_to: string;
  severity: DisruptionSeverity;
  source_bulletin: string;
  is_active: boolean;
}

export interface DisruptionSummary {
  total_active_alerts: number;
  mega_blocks_count: number;
  diverted_trains_count: number;
  cancelled_trains_count: number;
  delayed_trains_count: number;
  alerts: RailwayAlert[];
  generated_at: string;
  source_provider: string;
}
