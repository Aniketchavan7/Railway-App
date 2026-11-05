import { CheckCircle2, CircleSlash, Clock, HelpCircle, Train, XCircle } from "lucide-react";
import { RailwayStatus } from "@/lib/types";
import { delayLabel, formatDay, formatIstTime, stationOnly } from "@/lib/format";

interface Presentation {
  headline: string;
  tone: string;
  Icon: typeof Train;
  facts: string[];
}

function present(status: RailwayStatus): Presentation {
  const journey = status.journey_date_label;
  const nextRun = formatDay(status.next_run_date);
  const nextRunFact = nextRun ? `Next run: ${nextRun}` : null;
  const days = status.days_of_run?.length ? `Runs on ${status.days_of_run.join(", ")}` : null;

  switch (status.service_state) {
    case "RUNNING": {
      const eta = formatIstTime(status.next_eta);
      const next = stationOnly(status.next_station);
      return {
        headline: `Running · ${delayLabel(status.delay_minutes)}`,
        tone: status.delay_minutes > 0 ? "border-l-accent text-accent" : "border-l-ok text-ok",
        Icon: Train,
        facts: [
          status.position_label || (status.current_station ? `Near ${stationOnly(status.current_station)}` : ""),
          next ? `Next stop: ${next}${eta ? ` at ${eta}` : ""}` : "",
          journey ? `Journey started ${journey}` : "",
        ].filter(Boolean),
      };
    }
    case "COMPLETED":
      return {
        headline: `Reached ${status.destination_name || "its destination"}`,
        tone: "border-l-ok text-ok",
        Icon: CheckCircle2,
        facts: [journey ? `Journey started ${journey}` : "", nextRunFact ?? ""].filter(Boolean),
      };
    case "NOT_STARTED": {
      const first = stationOnly(status.next_station);
      const eta = formatIstTime(status.next_eta);
      return {
        headline: "Not started yet",
        tone: "border-l-accent text-accent",
        Icon: Clock,
        facts: [
          status.origin_name ? `Starts from ${status.origin_name}` : "",
          first && eta ? `First stop: ${first} at ${eta}` : "",
          days ?? "",
        ].filter(Boolean),
      };
    }
    case "NOT_RUNNING_TODAY":
      return {
        headline: "Not running today",
        tone: "border-l-bad text-bad",
        Icon: CircleSlash,
        facts: [nextRunFact ?? "", days ?? ""].filter(Boolean),
      };
    case "CANCELLED":
      return {
        headline: "Reported as cancelled",
        tone: "border-l-bad text-bad",
        Icon: XCircle,
        facts: [journey ? `Journey of ${journey}` : "", "Check with Indian Railways before travelling"].filter(Boolean),
      };
    default:
      return {
        headline: status.running_status || "Live data unavailable",
        tone: "border-l-rule-2 text-muted",
        Icon: HelpCircle,
        facts: [nextRunFact ?? ""].filter(Boolean),
      };
  }
}

export function TrainStateBanner({ status, compact = false }: { status: RailwayStatus; compact?: boolean }) {
  const { headline, tone, Icon, facts } = present(status);
  return (
    <div className={`bg-paper-2 border border-rule border-l-2 rounded-r-xl ${tone} ${compact ? "p-3" : "p-4"} space-y-1.5`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
        <p className={`font-display font-bold ${compact ? "text-sm" : "text-base sm:text-lg"}`}>{headline}</p>
      </div>
      {facts.length > 0 && (
        <ul className="text-xs text-ink flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-1">
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      )}
      {status.service_notice && <p className="text-[11px] text-muted leading-relaxed">{status.service_notice}</p>}
      {status.also_running_note && <p className="text-[11px] text-muted leading-relaxed">{status.also_running_note}</p>}
      {status.exceptions?.map((item, index) => {
        const message = item.message || item.description || item.type;
        return message ? (
          <p key={index} className="text-[11px] text-bad leading-relaxed">
            Provider notice: {String(message)}
          </p>
        ) : null;
      })}
      {status.is_simulated && (
        <p className="text-[11px] font-semibold text-accent">⚠️ Simulated demo data, not live information.</p>
      )}
      {status.freshness === "STALE" && !status.is_simulated && (
        <p className="text-[11px] font-semibold text-accent">Last known status, from {formatIstTime(status.observed_at)}.</p>
      )}
    </div>
  );
}
