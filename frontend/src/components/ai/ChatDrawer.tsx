"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { api } from "@/lib/api";
import { RailwayStatus } from "@/lib/types";
import { useLocationShare } from "@/lib/useLocationShare";
import { createTrainWebSocket } from "@/lib/ws";
import { OnTrainPrompt } from "@/components/tracking/OnTrainPrompt";
import { TrainStateBanner } from "@/components/tracking/TrainStateBanner";

interface Message {
  role: "user" | "assistant";
  content: string;
  /** Errors and the greeting are not part of the conversation sent to the server. */
  local?: boolean;
}

const WELCOME =
  "Enter a train number and I'll tell you exactly what it's doing: running, reached, or not running today. You can also ask about delays, fares and coaches.";

const SAMPLE_QUESTIONS = [
  "12951",
  "Is 22226 running today?",
  "Where is 12627 right now?",
  "Fare for 12101 from LTT to HWH",
];

/** Stays current over the WebSocket, so it can't go stale like text in the chat can. */
function LiveTrainCard({ initial }: { initial: RailwayStatus }) {
  const [status, setStatus] = useState(initial);
  const share = useLocationShare(initial.train_number);

  useEffect(() => {
    setStatus(initial);
  }, [initial]);

  useEffect(() => {
    const socket = createTrainWebSocket(initial.train_number, (packet) => {
      if (packet.telemetry) setStatus(packet.telemetry);
    });
    return () => socket.disconnect();
  }, [initial.train_number]);

  const isOn = share.phase !== "idle";

  return (
    <div className="px-3 sm:px-4 py-3 border-b border-rule space-y-2 bg-paper-2 max-h-[45%] overflow-y-auto">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-outlier font-semibold text-ink truncate">
          Live: #{status.train_number} {status.train_name}
        </span>
        <Link href={`/train?number=${status.train_number}`} className="text-accent hover:underline shrink-0 font-medium">
          Open map
        </Link>
      </div>
      <TrainStateBanner status={status} compact />
      {status.service_state === "RUNNING" && (
        <OnTrainPrompt trainNumber={status.train_number} trainName={status.train_name} share={share} />
      )}
      {isOn && (
        <div className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-ok-soft border border-ok/30 text-ok">
          <span>Sharing your location. Keep this page open with your screen on.</span>
          <button type="button" onClick={share.stop} className="font-semibold underline cursor-pointer shrink-0">
            Stop
          </button>
        </div>
      )}
      {(share.error || share.notice) && <p className="text-[11px] text-accent">{share.error || share.notice}</p>}
    </div>
  );
}

const markdownComponents = {
  p: (props: React.ComponentProps<"p">) => <p className="mb-2 last:mb-0" {...props} />,
  ul: (props: React.ComponentProps<"ul">) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-0.5" {...props} />,
  ol: (props: React.ComponentProps<"ol">) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-0.5" {...props} />,
  h1: (props: React.ComponentProps<"h1">) => <h3 className="font-bold text-sm mb-1.5" {...props} />,
  h2: (props: React.ComponentProps<"h2">) => <h3 className="font-bold text-sm mb-1.5" {...props} />,
  h3: (props: React.ComponentProps<"h3">) => <h3 className="font-bold mb-1.5" {...props} />,
  strong: (props: React.ComponentProps<"strong">) => <strong className="font-semibold text-ink" {...props} />,
  a: (props: React.ComponentProps<"a">) => <a className="text-accent underline" target="_blank" rel="noreferrer" {...props} />,
  table: (props: React.ComponentProps<"table">) => (
    <div className="overflow-x-auto mb-2">
      <table className="w-full text-[11px] border-collapse" {...props} />
    </div>
  ),
  th: (props: React.ComponentProps<"th">) => <th className="border border-rule px-2 py-1 text-left font-semibold bg-paper-3" {...props} />,
  td: (props: React.ComponentProps<"td">) => <td className="border border-rule px-2 py-1" {...props} />,
};

export function ChatDrawer({ initialTrain }: { initialTrain?: string | null }) {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: WELCOME, local: true }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveTrain, setLiveTrain] = useState<RailwayStatus | null>(null);
  const feedEnd = useRef<HTMLDivElement>(null);
  const askedInitial = useRef(false);

  useEffect(() => {
    feedEnd.current?.scrollIntoView({ block: "nearest" });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const history = messages
      .filter((m) => !m.local)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await api.chatWithAI(
        [...history, { role: "user", content: query }],
        liveTrain?.train_number ?? initialTrain ?? undefined
      );
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
      if (res.train) setLiveTrain(res.train);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Network request failed";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, I couldn't get an answer: ${reason}. Please try again.`, local: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Arriving from a train page goes straight to that train's status.
  useEffect(() => {
    if (initialTrain && !askedInitial.current) {
      askedInitial.current = true;
      void handleSend(initialTrain);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTrain]);

  return (
    <div className="bg-paper-2 rounded-card border border-rule flex flex-col h-[calc(100dvh-13rem)] min-h-[520px] overflow-hidden">
      <div className="px-4 sm:px-6 py-3.5 border-b border-rule bg-paper-2 flex items-center gap-2.5">
        <Bot className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
        <div>
          <h2 className="font-display font-bold text-sm tracking-tight text-ink">RailPulse Assistant</h2>
          <p className="text-[11px] text-muted font-outlier">Answers from live railway data</p>
        </div>
      </div>

      {liveTrain && <LiveTrainCard key={liveTrain.train_number} initial={liveTrain} />}

      <div className="px-3 sm:px-4 py-2 bg-paper-2/50 border-b border-rule overflow-x-auto flex items-center gap-2 scrollbar-none">
        <span className="text-[11px] text-muted flex items-center gap-1 shrink-0 font-medium font-outlier">
          <Sparkles className="w-3 h-3 text-accent" aria-hidden="true" /> Try:
        </span>
        {SAMPLE_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => handleSend(question)}
            className="text-[11px] font-outlier whitespace-nowrap bg-paper hover:bg-paper-2 active:opacity-80 text-muted hover:text-ink px-2.5 py-1 rounded-pill border border-rule transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
          >
            {question}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4" aria-live="polite">
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          return (
            <div key={index} className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
              <div className="shrink-0 pt-0.5">
                {isUser ? (
                  <User className="w-4 h-4 text-accent" aria-hidden="true" />
                ) : (
                  <Bot className="w-4 h-4 text-accent" aria-hidden="true" />
                )}
              </div>
              <div
                className={`max-w-[85%] sm:max-w-[78%] p-3.5 rounded-lg text-xs leading-relaxed border ${
                  isUser ? "bg-accent-soft/40 text-ink border-accent/30 font-medium" : "bg-paper text-ink border-rule"
                }`}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted bg-paper-2 px-3 py-2 rounded-pill border border-rule w-fit font-outlier">
            <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin motion-reduce:animate-none text-accent" aria-hidden="true" />
            <span>Checking live railway data…</span>
          </div>
        )}
        <div ref={feedEnd} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
        className="p-3 bg-paper-2 border-t border-rule flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Train number, or ask a question…"
          aria-label="Message"
          className="flex-1 min-w-0 text-xs bg-paper text-ink placeholder:text-muted rounded-pill px-4 py-2.5 border border-rule outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          aria-label="Send"
          className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink px-4 py-2.5 rounded-pill transition-opacity font-medium text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className="hidden sm:inline">Send</span>
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
