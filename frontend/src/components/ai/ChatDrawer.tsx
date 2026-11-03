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
        "Welcome to RailPulse AI! Ask about live train status, mega blocks, route diversions, cancelled trains, running delays, platform numbers, or ticket fares.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Model is fixed to Mistral Small internally — no user chooser
  const fixedModel = "mistralai/mistral-small-2603";

  const sampleQuestions = [
    "What Mega Blocks, train diversions, or cancellations are active today?",
    "Is train 12115 Siddheshwar Express running diverted or delayed?",
    "Check heavy running delays and maintenance blocks on Central Railway",
    "Where is train 22225 Vande Bharat? When will it reach Solapur?",
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
    <div className="bg-paper-2 rounded-card border border-rule shadow-none flex flex-col h-[500px] sm:h-[580px] overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-5 py-3 sm:py-3.5 border-b border-rule bg-paper-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 rounded-pill bg-accent-soft border border-accent/30 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xs sm:text-sm tracking-tight text-ink">
              Railway Assistant
            </h3>
            <p className="text-[10px] sm:text-[11px] text-muted">
              Live information for Indian trains, halts, and fares
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Queries */}
      <div className="px-3 sm:px-4 py-2 bg-paper-3/50 border-b border-rule overflow-x-auto flex items-center gap-2 scrollbar-none">
        <span className="text-[11px] text-muted flex items-center gap-1 shrink-0 font-medium">
          <Sparkles className="w-3 h-3 text-accent" /> Sample queries:
        </span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(q)}
            className="text-[11px] whitespace-nowrap bg-paper-2 hover:bg-paper active:bg-paper-3 hover:text-ink text-muted font-normal px-2.5 py-1 rounded-pill border border-rule transition-colors shrink-0"
          >
            {q.length > 36 ? q.slice(0, 36) + "…" : q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-7 h-7 rounded-pill border flex items-center justify-center shrink-0 text-xs font-medium ${
                  isUser
                    ? "bg-accent text-accent-ink border-accent"
                    : "bg-paper-3 text-ink border-rule"
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[90%] sm:max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed border ${
                  isUser
                    ? "bg-paper-3 text-ink border-rule-2 font-medium"
                    : "bg-paper text-ink-2 border-rule"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted bg-paper-3 p-2.5 rounded-pill border border-rule w-fit">
            <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin motion-reduce:animate-none text-accent" />
            <span>Checking train schedules and verifying halts…</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-2.5 sm:p-3 bg-paper-3 border-t border-rule flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask train location, delay, schedule or fare…"
          className="flex-1 text-xs bg-paper text-ink placeholder:text-muted rounded-pill px-3.5 py-2 border border-rule outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink px-3 sm:px-4 py-2 rounded-pill transition-opacity font-medium text-xs flex items-center justify-center gap-1.5 shrink-0"
        >
          <span className="hidden sm:inline">Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
