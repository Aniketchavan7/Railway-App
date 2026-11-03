"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Activity, RefreshCw } from "lucide-react";

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
      // Non-critical fallback
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
        return "bg-ok-soft text-ok border-ok/30";
      case "OPEN":
        return "bg-bad-soft text-bad border-bad/30";
      case "HALF_OPEN":
        return "bg-accent-soft text-accent border-accent/30";
      default:
        return "bg-paper-3 text-muted border-rule";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-paper-2 rounded-card border border-rule p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            <span>Service status and connectivity</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Live connection health and response metrics for railway data services.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHealth}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-paper-3 hover:bg-paper active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-ink border border-rule rounded-pill text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "motion-safe:animate-spin motion-reduce:animate-none text-accent" : ""}`} />
          <span>Refresh metrics</span>
        </button>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {Object.entries(providerStatus).map(([name, data]) => {
          const health = healthStatus[name] || {};
          return (
            <div
              key={name}
              className="bg-paper-2 rounded-card border border-rule p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-pill bg-paper-3 border border-rule flex items-center justify-center font-bold text-ink text-xs font-outlier">
                    {name.slice(0, 2).toLowerCase()}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm text-ink capitalize">
                      {name.replace(/_/g, " ")}
                    </h3>
                    <span className="text-[11px] text-muted font-outlier">
                      Status: {health.status || "monitored"}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-xs font-outlier px-2.5 py-0.5 rounded-pill border ${getCircuitBadge(
                    data.circuit_state
                  )}`}
                >
                  Status: {data.circuit_state}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs bg-paper-3 p-3 rounded-pill border border-rule">
                <div>
                  <span className="text-muted block text-[11px]">Recorded errors</span>
                  <span className="font-outlier font-bold text-ink">{data.failure_count}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">Recovery state</span>
                  <span className="font-medium text-ink">Active auto-retry</span>
                </div>
              </div>

              {/* Supported Capabilities */}
              <div>
                <span className="text-[11px] font-medium text-muted block mb-1.5">
                  Supported services
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(data.supported_capabilities || []).map((cap: string) => (
                    <span
                      key={cap}
                      className="text-[11px] font-outlier px-2 py-0.5 rounded-pill bg-paper text-muted border border-rule"
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
