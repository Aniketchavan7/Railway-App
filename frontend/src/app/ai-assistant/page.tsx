"use client";

import { ChatDrawer } from "@/components/ai/ChatDrawer";
import { Bot, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export default function AIAssistantPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Overview Card */}
      <div className="bg-paper-2 rounded-card border border-rule p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent" />
              <span>Grounded Indian Railway AI assistant</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Deterministic operational queries executed via LangGraph and fixed Mistral Small.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-paper border border-rule text-ink text-xs font-outlier">
            <span className="w-1.5 h-1.5 rounded-full bg-ok" />
            <span>Telemetry-grounded mode</span>
          </div>
        </div>

        {/* Capabilities badges */}
        <div className="mt-4 pt-4 border-t border-rule grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
            <span>Deterministic delay calculation</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cool shrink-0" />
            <span>Live telemetry verification</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Official telescopic fares</span>
          </div>
        </div>
      </div>

      {/* Main Chat Assistant */}
      <ChatDrawer />
    </div>
  );
}
