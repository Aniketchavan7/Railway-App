"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Bot, Send, Sparkles, User, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatDrawer() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to RailPulse Assistant. Ask me anything about live train locations, delays, station arrival schedules, route diversions, or distance ticket tariffs.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Model is fixed internally to mistralai/mistral-small-2603 — no user chooser
  const fixedModel = "mistralai/mistral-small-2603";

  const sampleQuestions = [
    "Where is train 12101 currently? How late is it?",
    "Calculate fare for 12101 from CSMT to PUNE across all classes",
    "Does train 22225 run today on Wednesday?",
    "What are the halts and schedule for train 22225 Vande Bharat?",
  ];

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await api.chatWithAI(
        [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: query },
        ],
        fixedModel
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Railway query error: ${err.message || "Network request failed"}. Please verify the train number.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-paper-2 rounded-card border border-rule flex flex-col h-[520px] sm:h-[600px] overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-rule bg-paper-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Bot className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-display font-bold text-sm tracking-tight text-ink">
              RailPulse Assistant
            </h2>
            <p className="text-[11px] text-muted font-outlier">
              Live Indian Railways query intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-outlier text-muted">
          <span className="w-2 h-2 rounded-full bg-ok" aria-hidden="true" />
          <span>Active</span>
        </div>
      </div>

      {/* Suggested Queries */}
      <div className="px-3 sm:px-4 py-2 bg-paper-2/50 border-b border-rule overflow-x-auto flex items-center gap-2 scrollbar-none">
        <span className="text-[11px] text-muted flex items-center gap-1 shrink-0 font-medium font-outlier">
          <Sparkles className="w-3 h-3 text-accent" aria-hidden="true" /> Presets:
        </span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(q)}
            className="text-[11px] font-outlier whitespace-nowrap bg-paper hover:bg-paper-2 active:opacity-80 text-muted hover:text-ink px-2.5 py-1 rounded-pill border border-rule transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
          >
            {q.length > 40 ? q.slice(0, 40) + "…" : q}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className="shrink-0 pt-0.5">
                {isUser ? (
                  <User className="w-4 h-4 text-accent" aria-hidden="true" />
                ) : (
                  <Bot className="w-4 h-4 text-accent" aria-hidden="true" />
                )}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[78%] p-3.5 rounded-lg text-xs leading-relaxed border ${
                  isUser
                    ? "bg-accent-soft/40 text-ink border-accent/30 font-medium"
                    : "bg-paper text-ink border-rule"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted bg-paper-2 px-3 py-2 rounded-pill border border-rule w-fit font-outlier">
            <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin motion-reduce:animate-none text-accent" aria-hidden="true" />
            <span>Scanning live train schedules and verifying halts…</span>
          </div>
        )}
      </div>

      {/* Input Console */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-paper-2 border-t border-rule flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask train location, delay, station schedule, or fare calculation…"
          className="flex-1 text-xs bg-paper text-ink placeholder:text-muted rounded-pill px-4 py-2.5 border border-rule outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink px-4 py-2.5 rounded-pill transition-opacity font-medium text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className="hidden sm:inline">Send</span>
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
