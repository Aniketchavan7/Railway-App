const IST_ZONE = "Asia/Kolkata";

export function formatIstTime(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${parsed.toLocaleTimeString("en-GB", {
    timeZone: IST_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  })} IST`;
}

/** "2026-11-06" -> "Fri 6 Nov" */
export function formatDay(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00+05:30`);
  if (Number.isNaN(parsed.getTime())) return value;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(parsed);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}

export function todayIstDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST_ZONE }).format(new Date());
}

export function stationOnly(name?: string | null): string | null {
  return name ? name.split(" (")[0] : null;
}

export function delayLabel(minutes: number): string {
  return minutes > 0 ? `${minutes} min late` : "On time";
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
