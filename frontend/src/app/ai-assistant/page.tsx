"use client";

import { ChatDrawer } from "@/components/ai/ChatDrawer";
import { Bot, Sparkles, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export default function AIAssistantPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Bot className="w-6 h-6 text-blue-600" />
              <span>Grounded Indian Railway AI Assistant</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Powered by LangGraph tool execution and the unified xKiro model API (api.xkiro.com/v1).
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Anti-Hallucination Grounded Mode</span>
          </div>
        </div>

        {/* Capabilities badges */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Real-Time ETA & Delay Calculation</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Strict Provenance (No Fake GPS)</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Official Telescopic Fares & Halts</span>
          </div>
        </div>
      </div>

      {/* Main Chat Assistant */}
      <ChatDrawer />
    </div>
  );
}
