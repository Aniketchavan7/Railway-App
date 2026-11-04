"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Train,
  Building2,
  ShieldCheck,
  Bot,
  ArrowRight,
  Activity,
  Radio,
  Clock,
  Compass,
  CheckCircle2,
} from "lucide-react";

export function BentoMetrics() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Bento Item 1: Live Fleet Telemetry (Span 2 Cols on MD) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="md:col-span-2 p-6 rounded-2xl bg-paper-2 border border-rule/80 hover:border-rule-2 transition-all flex flex-col justify-between relative overflow-hidden group shadow-xs"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-ok animate-pulse" />
              <span className="text-xs font-outlier font-semibold uppercase tracking-wider text-muted">
                GNSS Network Telemetry
              </span>
            </div>
            <span className="text-xs font-outlier px-2.5 py-0.5 rounded-pill bg-ok/10 text-ok border border-ok/20 font-medium">
              11 Trains Active Now
            </span>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-ink">
              Multi-Provider Telemetry Engine
            </h3>
            <p className="text-xs sm:text-sm text-muted mt-1 max-w-lg leading-relaxed">
              Real-time synchronization across CRIS APIs, GPS transponders, and verified crowd telemetry with sub-second websocket streaming.
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-paper border border-rule">
              <span className="text-[11px] text-muted font-outlier block">Verified Speed</span>
              <span className="text-lg font-bold font-outlier text-ink">130 km/h</span>
              <span className="text-[10px] text-ok block mt-0.5 font-outlier">MPS Certified</span>
            </div>
            <div className="p-3 rounded-xl bg-paper border border-rule">
              <span className="text-[11px] text-muted font-outlier block">Sync Latency</span>
              <span className="text-lg font-bold font-outlier text-ink">&lt; 450 ms</span>
              <span className="text-[10px] text-cool block mt-0.5 font-outlier">Direct WebSocket</span>
            </div>
            <div className="p-3 rounded-xl bg-paper border border-rule">
              <span className="text-[11px] text-muted font-outlier block">On-Time Index</span>
              <span className="text-lg font-bold font-outlier text-ink">94.2%</span>
              <span className="text-[10px] text-ok block mt-0.5 font-outlier">Today&apos;s Run</span>
            </div>
          </div>
        </div>

        <div className="pt-5 mt-4 border-t border-rule/60 flex items-center justify-between">
          <span className="text-[11px] font-outlier text-muted">
            Tracking Solapur VB #22226, Rajdhani #12951, Deccan Queen #12124
          </span>
          <Link
            href="/train?number=22226"
            className="text-accent text-xs font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
          >
            <span>Launch Live Radar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.div>

      {/* Bento Item 2: Concourse Terminal Platforms */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="p-6 rounded-2xl bg-paper-2 border border-rule/80 hover:border-rule-2 transition-all flex flex-col justify-between group shadow-xs"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Building2 className="w-5 h-5 text-accent" />
            <span className="text-[11px] font-outlier text-muted bg-paper-3 px-2 py-0.5 rounded-pill border border-rule">
              Major Hubs
            </span>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-display font-bold text-ink">
              Concourse Live Boards
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Track platform assignments and arrivals for CSMT, Pune, New Delhi, and Howrah.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            {[
              { code: "CSMT", name: "Mumbai CSMT", pf: "18 Platforms", state: "Active" },
              { code: "PUNE", name: "Pune Jn", pf: "6 Platforms", state: "Active" },
              { code: "NDLS", name: "New Delhi", pf: "16 Platforms", state: "Active" },
            ].map((st) => (
              <div
                key={st.code}
                className="flex items-center justify-between p-2 rounded-lg bg-paper border border-rule text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold font-outlier text-accent">{st.code}</span>
                  <span className="text-muted text-[11px]">{st.name}</span>
                </div>
                <span className="text-[10px] font-outlier text-muted">{st.pf}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 mt-3 border-t border-rule/60">
          <Link
            href="/stations"
            className="text-accent text-xs font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
          >
            <span>View All Boards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.div>

      {/* Bento Item 3: Zero-Fake Telemetry Guarantee */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="p-6 rounded-2xl bg-paper-2 border border-rule/80 hover:border-rule-2 transition-all flex flex-col justify-between group shadow-xs"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <ShieldCheck className="w-5 h-5 text-ok" />
            <span className="text-[11px] font-outlier text-ok bg-ok/10 border border-ok/20 px-2 py-0.5 rounded-pill">
              Guaranteed
            </span>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-display font-bold text-ink">
              Zero-Fake Telemetry
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Every coordinate is authentic. When offline, we clearly state the last physical halt instead of hallucinating movement.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-paper border border-rule space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-ink">
              <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
              <span>Authentic GPS Coordinates</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-ink">
              <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
              <span>Direct Circuit-Breaker Resilience</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-ink">
              <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
              <span>Offline Transparency Fallback</span>
            </div>
          </div>
        </div>

        <div className="pt-4 mt-3 border-t border-rule/60">
          <Link
            href="/admin"
            className="text-accent text-xs font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
          >
            <span>Telemetry Health</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.div>

      {/* Bento Item 4: Operations Copilot AI (Span 2 Cols on MD) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.15 }}
        className="md:col-span-2 p-6 rounded-2xl bg-paper-2 border border-rule/80 hover:border-rule-2 transition-all flex flex-col justify-between group shadow-xs"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent" />
              <span className="text-xs font-outlier font-semibold uppercase tracking-wider text-muted">
                Operations AI Copilot
              </span>
            </div>
            <span className="text-[11px] font-outlier px-2 py-0.5 rounded-pill bg-paper-3 text-muted border border-rule">
              Grounded on Timetable Engine
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-display font-bold text-ink">
                Timetable Intelligence & Queries
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Ask about train punctuality, platform assignments, turnaround rakes, and route disruptions with zero hallucination.
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-paper border border-rule text-xs text-ink">
                <span className="text-muted block text-[10px] font-outlier">Prompt</span>
                &ldquo;Where is Solapur Vande Bharat #22226 right now?&rdquo;
              </div>
              <div className="p-2.5 rounded-xl bg-accent/5 border border-accent/20 text-xs text-accent">
                <span className="text-accent/70 block text-[10px] font-outlier">Copilot response</span>
                &ldquo;Train 22226 is approaching Karjat Jn on time at 118 km/h. Expected CSMT arrival 12:35 IST.&rdquo;
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 mt-3 border-t border-rule/60 flex items-center justify-between">
          <span className="text-[11px] font-outlier text-muted">
            Integrated with Gemini 2.5 Flash & RailPulse Registry
          </span>
          <Link
            href="/ai-assistant"
            className="text-accent text-xs font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
          >
            <span>Ask AI Copilot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
