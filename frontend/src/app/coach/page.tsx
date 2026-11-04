"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { CoachComposition } from "@/lib/types";
import { CoachRake } from "@/components/coach/CoachRake";
import { LayoutGrid, Search, Loader2 } from "lucide-react";

function CoachContent() {
  const searchParams = useSearchParams();
  const initialTrain = searchParams.get("train") || searchParams.get("number") || "22225";
  const [trainNum, setTrainNum] = useState(initialTrain);
  const [composition, setComposition] = useState<CoachComposition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComposition = async (num: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCoachComposition(num);
      setComposition(data);
    } catch (err: any) {
      setError(err.message || "Failed to load coach composition");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComposition(trainNum);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trainNum.trim()) {
      fetchComposition(trainNum.trim());
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-accent" />
            <span>Coach layout</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Coach arrangement and seat classes from locomotive to rear guard.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={trainNum}
              onChange={(e) => setTrainNum(e.target.value)}
              placeholder="Train number (e.g. 22225, 12158, 12101)…"
              className="w-full bg-paper focus:bg-paper-3 text-xs font-outlier font-bold pl-9 pr-3 py-2 rounded-pill border border-rule focus:border-accent outline-none text-ink placeholder:text-muted transition-colors disabled:opacity-40"
            />
          </div>
          <button
            type="submit"
            disabled={!trainNum.trim() || loading}
            className="bg-accent hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink font-medium text-xs px-4 py-2 rounded-pill transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-accent shrink-0"
          >
            View layout
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rule text-xs">
          <span className="text-muted text-[11px] font-medium">Popular trains:</span>
          {["22225", "12158", "12101", "12951", "22436"].map((num) => (
            <button
              key={num}
              type="button"
              disabled={loading}
              onClick={() => {
                setTrainNum(num);
                fetchComposition(num);
              }}
              className={`px-2.5 py-1 rounded-pill border text-xs transition-colors cursor-pointer font-outlier disabled:opacity-40 disabled:cursor-not-allowed active:opacity-80 focus-visible:outline-2 focus-visible:outline-accent ${
                trainNum === num
                  ? "bg-paper-3 text-ink border-accent"
                  : "bg-paper text-muted border-rule hover:text-ink hover:bg-paper-3"
              }`}
            >
              Train #{num}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-paper-2 rounded-card border border-rule space-y-2">
          <Loader2 className="w-6 h-6 motion-safe:animate-spin motion-reduce:animate-none text-accent" />
          <p className="text-xs text-muted font-outlier">Loading coach layout…</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-paper-2 rounded-card border border-bad text-center text-xs text-bad">
          {error}
        </div>
      ) : composition ? (
        <CoachRake composition={composition} />
      ) : null}
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-12 space-y-2">
          <Loader2 className="w-6 h-6 motion-safe:animate-spin motion-reduce:animate-none text-accent" />
          <p className="text-xs text-muted font-outlier">Loading coach layout…</p>
        </div>
      }
    >
      <CoachContent />
    </Suspense>
  );
}
