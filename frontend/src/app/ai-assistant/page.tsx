"use client";

import { ChatDrawer } from "@/components/ai/ChatDrawer";
import { Bot, CheckCircle2, ShieldCheck, Ticket } from "lucide-react";

export default function AIAssistantPage() {
  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Overview Card */}
      <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-accent" />
            <span>Railway assistant</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time Indian Railways intelligence for live locations, delays, Mega Blocks, route diversions, cancellations, and fares.
          </p>
        </div>

        {/* Capabilities badges */}
        <div className="mt-4 pt-3 sm:pt-4 border-t border-rule grid grid-cols-1 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
            <span>Live route and delay checks</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cool shrink-0" />
            <span>Mega Blocks & diversions</span>
          </div>
          <div className="flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-warn shrink-0" />
            <span>Cancellations & regulations</span>
          </div>
          <div className="flex items-center gap-2">
            <Ticket className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Fares & coach composition</span>
          </div>
        </div>
      </div>

      {/* Main Chat Assistant */}
      <ChatDrawer />
    </div>
  );
}
