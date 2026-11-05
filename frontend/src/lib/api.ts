import {
  CoachComposition,
  DisruptionSummary,
  FareEnquiryResult,
  PassengerTelemetryReport,
  PNRStatus,
  RailwayAlert,
  RailwayStatus,
  Station,
  StationLiveBoard,
  TelemetryReportResult,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody.detail || `HTTP Error ${res.status}: ${res.statusText}`
    );
  }
  const payload = await res.json();
  return (payload.data !== undefined ? payload.data : payload) as T;
}

export const api = {
  getTrainStatus: (trainNumber: string) =>
    fetchJson<RailwayStatus>(`${API_BASE}/trains/${trainNumber}/status`),

  getTrainSchedule: (trainNumber: string) =>
    fetchJson<any>(`${API_BASE}/trains/${trainNumber}/schedule`),

  getTrainRoute: (trainNumber: string) =>
    fetchJson<any>(`${API_BASE}/trains/${trainNumber}/route`),

  searchTrains: (query: string) =>
    fetchJson<any[]>(`${API_BASE}/trains/search?q=${encodeURIComponent(query)}`),

  getTrainsBetweenStations: (fromStation: string, toStation: string) =>
    fetchJson<{
      from_station: string;
      to_station: string;
      count: number;
      trains: Array<{
        train_number: string;
        train_name: string;
        train_type: string;
        from_station: string;
        to_station: string;
        origin: string;
        origin_name: string;
        destination: string;
        destination_name: string;
        dep_time: string;
        arr_time: string;
        days_of_run: string[];
        mps_speed: number;
        pairing_train?: string;
        service_state: string;
        running_status: string;
        runs_today: boolean;
      }>;
    }>(
      `${API_BASE}/trains/between?from_station=${encodeURIComponent(
        fromStation.toUpperCase()
      )}&to_station=${encodeURIComponent(toStation.toUpperCase())}`
    ),

  searchStations: (query: string) =>
    fetchJson<Station[]>(
      `${API_BASE}/stations/search?q=${encodeURIComponent(query)}`
    ),

  getStationByCode: (stationCode: string) =>
    fetchJson<Station>(`${API_BASE}/station/${stationCode.toUpperCase()}`),

  getStationLiveBoard: (stationCode: string, hours = 4) =>
    fetchJson<StationLiveBoard>(
      `${API_BASE}/stations/${stationCode}/live?hours=${hours}`
    ),

  getCoachComposition: (trainNumber: string) =>
    fetchJson<CoachComposition>(`${API_BASE}/trains/${trainNumber}/coaches`),

  getPlatformNumbers: (trainNumber: string) =>
    fetchJson<any[]>(`${API_BASE}/trains/${trainNumber}/platforms`),

  getFareEnquiry: (
    trainNumber: string,
    origin: string,
    dest: string,
    quota = "GN"
  ) =>
    fetchJson<FareEnquiryResult>(
      `${API_BASE}/trains/${trainNumber}/fare?origin=${origin}&dest=${dest}&quota=${quota}`
    ),

  getPNRStatus: (pnr: string) =>
    fetchJson<PNRStatus>(`${API_BASE}/pnr/${pnr}`),

  reportPassengerTelemetry: (
    trainNumber: string,
    report: PassengerTelemetryReport
  ) =>
    fetchJson<TelemetryReportResult>(
      `${API_BASE}/trains/${trainNumber}/telemetry/report`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      }
    ),

  getCrowdMeta: (trainNumber: string) =>
    fetchJson<{ active_reporters: number; last_reported_seconds_ago?: number | null }>(
      `${API_BASE}/trains/${trainNumber}/crowd`
    ),

  chatWithAI: (messages: { role: string; content: string }[], contextTrain?: string) =>
    fetchJson<{ response: string; model: string; train?: RailwayStatus | null }>(
      `${API_BASE}/ai/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, context_train_number: contextTrain }),
      }
    ),

  getProvidersHealth: () =>
    fetchJson<Record<string, any>>(`${API_BASE.replace("/api/v1", "")}/providers/health`),

  getProviderRegistryStatus: () =>
    fetchJson<Record<string, any>>(`${API_BASE.replace("/api/v1", "")}/providers/status`),

  getDisruptions: (params?: { type?: string; zone?: string; train_number?: string; station?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.append("type", params.type);
    if (params?.zone) q.append("zone", params.zone);
    if (params?.train_number) q.append("train_number", params.train_number);
    if (params?.station) q.append("station", params.station);
    return fetchJson<DisruptionSummary>(`${API_BASE}/alerts/disruptions?${q.toString()}`);
  },

  getMegaBlocks: (stationOrZone?: string) =>
    fetchJson<RailwayAlert[]>(`${API_BASE}/alerts/mega-blocks${stationOrZone ? `?station=${stationOrZone}` : ""}`),

  getTrainDisruptions: (trainNumber: string) =>
    fetchJson<RailwayAlert[]>(`${API_BASE}/alerts/train/${trainNumber}`),
};
