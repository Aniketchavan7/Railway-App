"use client";

import { ChatDrawer } from "@/components/ai/ChatDrawer";

export default function AIAssistantPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* Open Page Header */}
      <section className="space-y-1">
        <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-ink leading-tight">
          Railway assistant
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Natural language queries for live train telemetry, halts, delays, and fares.
        </p>
      </section>

      {/* Main Chat Assistant */}
      <ChatDrawer />
    </div>
  );
}
