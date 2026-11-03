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
        "Namaste! I am RailPulse AI, your grounded Indian Railways travel assistant powered by LangGraph and xKiro API.\n\nAsk me about train locations, delays, ETAs, fares, or coach layouts (e.g. *Where is train 12101 currently? How late is it, and when will it reach Pune?*).",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sampleQuestions = [
    "Where is train 12101 currently? How late is it, and when will it reach Pune?",
    "Calculate fare for 12101 from CSMT to PUNE across all classes",
    "Show coach layout for 12951 Mumbai Rajdhani",
    "What is the schedule and halts for train 22436 Vande Bharat?",
  ];

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await api.chatWithAI([
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: query },
      ]);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error retrieving railway information: ${err.message || "Network request failed"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[560px] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
              RailPulse Assistant
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-300">
                LangGraph + xKiro
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Grounded Railway Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active</span>
        </div>
      </div>

      {/* Suggested Chips */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto flex items-center gap-2 scrollbar-none">
        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-amber-500" /> Prompts:
        </span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="text-[11px] whitespace-nowrap bg-white hover:bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-full border border-slate-200 transition-colors shadow-2xs shrink-0"
          >
            {q.length > 40 ? q.slice(0, 40) + "..." : q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser ? "bg-slate-800 text-white" : "bg-blue-600 text-white"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? "bg-slate-900 text-white rounded-tr-none font-medium"
                    : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Consulting railway engine & calculating telemetry...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask e.g. 'Where is train 12101 currently? How late is it, and when will it reach Pune?'"
          className="flex-1 text-xs bg-slate-100 rounded-lg px-3.5 py-2.5 border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-lg transition-colors font-medium text-xs flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
