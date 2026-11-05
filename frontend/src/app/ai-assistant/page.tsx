"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatDrawer } from "@/components/ai/ChatDrawer";

function AssistantContent() {
  const searchParams = useSearchParams();
  const train = searchParams.get("train");
  return <ChatDrawer initialTrain={train && /^\d{5}$/.test(train) ? train : null} />;
}

export default function AIAssistantPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <section className="space-y-1">
        <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-ink leading-tight">
          Railway assistant
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Enter a train number to see exactly what it&apos;s doing right now.
        </p>
      </section>
      <Suspense fallback={null}>
        <AssistantContent />
      </Suspense>
    </div>
  );
}
