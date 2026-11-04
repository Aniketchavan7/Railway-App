"use client";

import React, { useState, useEffect } from "react";
import { Calculator, Loader2, Info, Ticket, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { FareEnquiryResult } from "@/lib/types";

interface FareMatrixTableProps {
  trainNumber: string;
  originCode: string;
  destCode: string;
}

export function FareMatrixTable({
  trainNumber,
  originCode,
  destCode,
}: FareMatrixTableProps) {
  const [quota, setQuota] = useState<"GN" | "TQ">("GN");
  const [fareData, setFareData] = useState<FareEnquiryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trainNumber || !originCode || !destCode) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    api
      .getFareEnquiry(trainNumber, originCode, destCode, quota)
      .then((data) => {
        if (mounted) setFareData(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message || "Failed to load tariff breakdown");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [trainNumber, originCode, destCode, quota]);

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-paper-2 border border-rule flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-5 h-5 text-accent motion-safe:animate-spin" />
        <span className="text-xs text-muted font-outlier">Calculating distance telescopic tariffs…</span>
      </div>
    );
  }

  if (error || !fareData) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-paper-2 border border-rule/80 shadow-xs space-y-4">
      {/* Header with Quota Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rule/70">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-accent" />
            <h3 className="font-display font-bold text-ink text-base">
              Telescopic Tariff & Class Matrix
            </h3>
            <span className="text-[11px] font-outlier px-2 py-0.5 rounded-pill bg-paper-3 text-muted border border-rule">
              {fareData.distance_km} km Journey
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5 font-outlier">
            Official Indian Railways distance slab tariffs between {originCode} and {destCode}
          </p>
        </div>

        {/* Quota Selector */}
        <div className="flex items-center gap-1 bg-paper p-1 rounded-pill border border-rule text-xs font-outlier self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setQuota("GN")}
            className={`px-3 py-1 rounded-pill font-medium transition-colors ${
              quota === "GN"
                ? "bg-accent text-accent-ink font-semibold"
                : "text-muted hover:text-ink"
            }`}
          >
            General Quota
          </button>
          <button
            type="button"
            onClick={() => setQuota("TQ")}
            className={`px-3 py-1 rounded-pill font-medium transition-colors ${
              quota === "TQ"
                ? "bg-accent text-accent-ink font-semibold"
                : "text-muted hover:text-ink"
            }`}
          >
            Tatkal Quota
          </button>
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {fareData.classes.map((cls) => (
          <div
            key={cls.class_code}
            className="p-3.5 rounded-xl bg-paper border border-rule/70 hover:border-accent/40 transition-colors space-y-2 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-outlier font-bold text-sm text-ink">
                  {cls.class_code}
                </span>
                <span className="text-[10px] font-outlier text-muted bg-paper-2 px-1.5 py-0.5 rounded border border-rule">
                  {quota}
                </span>
              </div>
              <span className="text-[11px] text-muted block truncate mt-0.5">
                {cls.class_name}
              </span>
            </div>

            <div className="pt-2 border-t border-rule/50">
              <span className="text-[10px] text-muted font-outlier block">Total Tariff</span>
              <span className="text-lg font-bold font-outlier text-accent">
                ₹{cls.total_fare}
              </span>
              <span className="text-[10px] text-muted block font-outlier mt-0.5">
                Base ₹{cls.base_fare} + GST ₹{cls.gst}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted font-outlier pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-ok shrink-0" />
        <span>Grounded on Ministry of Railways Telescopic Fare Slab rules with standard Superfast charges.</span>
      </div>
    </div>
  );
}
