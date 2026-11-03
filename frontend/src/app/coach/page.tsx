"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CoachComposition } from "@/lib/types";
import { CoachRake } from "@/components/coach/CoachRake";
import { LayoutGrid, Search, Loader2 } from "lucide-react";

export default function CoachPage() {
  const [trainNum, setTrainNum] = useState("12101");
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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-purple-600" />
            <span>Coach Composition & Rake Layout Visualizer</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual rake arrangement from Locomotive to Rear Guard van across AC, Sleeper, and General coaches.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={trainNum}
              onChange={(e) => setTrainNum(e.target.value)}
              placeholder="Train number (e.g. 12101, 12951)..."
              className="w-full bg-slate-50 focus:bg-white text-xs font-bold pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
          >
            Inspect Rake
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold">Popular Rakes:</span>
          {["12101", "12951", "22436"].map((num) => (
            <button
              key={num}
              onClick={() => {
                setTrainNum(num);
                fetchComposition(num);
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                trainNum === num
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Train #{num}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <p className="text-xs text-slate-500">Retrieving coach rake composition...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-white rounded-xl border border-red-200 text-center text-xs text-rose-600">
          {error}
        </div>
      ) : composition ? (
        <CoachRake composition={composition} />
      ) : null}
    </div>
  );
}
