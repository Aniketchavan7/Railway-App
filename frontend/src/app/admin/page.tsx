"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, Cpu, Server } from "lucide-react";

export default function AdminPage() {
  const [providerStatus, setProviderStatus] = useState<Record<string, any>>({});
  const [healthStatus, setHealthStatus] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const [pStatus, hStatus] = await Promise.all([
        api.getProviderRegistryStatus().catch(() => ({})),
        api.getProvidersHealth().catch(() => ({})),
      ]);
      setProviderStatus(pStatus);
      setHealthStatus(hStatus);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const getCircuitBadge = (state: string) => {
    switch (state) {
      case "CLOSED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "OPEN":
        return "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
      case "HALF_OPEN":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            <span>Provider Health & Circuit Breaker Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry provider status, circuit breaker states, and capability routing metrics.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(providerStatus).map(([name, data]) => {
          const health = healthStatus[name] || {};
          return (
            <div
              key={name}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-800 text-xs uppercase">
                    {name.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 capitalize">
                      {name.replace(/_/g, " ")}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Status: {health.status || "MONITORED"}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getCircuitBadge(
                    data.circuit_state
                  )}`}
                >
                  Circuit: {data.circuit_state}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Failure Count:</span>
                  <span className="font-bold text-slate-800">{data.failure_count} errors</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Recovery Policy:</span>
                  <span className="font-semibold text-slate-800">Exponential Backoff</span>
                </div>
              </div>

              {/* Supported Capabilities */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Supported Capabilities:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(data.supported_capabilities || []).map((cap: string) => (
                    <span
                      key={cap}
                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
