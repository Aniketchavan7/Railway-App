import { TelemetryPacket } from "./types";

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/live-tracking";

export function createTrainWebSocket(
  trainNumber: string,
  onPacket: (packet: TelemetryPacket) => void,
  onStatusChange?: (status: "connecting" | "connected" | "disconnected") => void
) {
  let ws: WebSocket | null = null;
  let isClosedManually = false;
  let reconnectTimer: any = null;

  function connect() {
    if (isClosedManually) return;
    onStatusChange?.("connecting");

    const url = `${WS_BASE}/${trainNumber}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      onStatusChange?.("connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "telemetry_update") {
          onPacket(data as TelemetryPacket);
        }
      } catch (e) {
        console.error("WS Parse error:", e);
      }
    };

    ws.onclose = () => {
      onStatusChange?.("disconnected");
      if (!isClosedManually) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  connect();

  return {
    disconnect: () => {
      isClosedManually = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    },
    ping: () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send("ping");
      }
    },
  };
}
