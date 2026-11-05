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
                Live train status
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-ink">
              Running, reached or not running today
            </h3>
            <p className="text-xs sm:text-sm text-muted mt-1 max-w-lg leading-relaxed">
              Enter a train number to see what it's doing now, including trains that started yesterday. Position comes from live running data, sharpened by passengers on board who choose to share their GPS.
            </p>
          </div>

        </div>

        <div className="pt-5 mt-4 border-t border-rule/60 flex items-center justify-between">
          <span className="text-[11px] font-outlier text-muted">
            Try Rajdhani #12951 or Deccan Queen #12124
          </span>
          <Link
            href="/train?number=12951"
            className="text-accent text-xs font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
          >
            <span>Track a train</span>
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
              Station boards
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Arrivals, departures and platforms for stations such as CSMT, Pune and New Delhi.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            {[
              { code: "CSMT", name: "Mumbai CSMT" },
              { code: "PUNE", name: "Pune Jn" },
              { code: "NDLS", name: "New Delhi" },
            ].map((st) => (
              <div
                key={st.code}
                className="flex items-center justify-between p-2 rounded-lg bg-paper border border-rule text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold font-outlier text-accent">{st.code}</span>
                  <span className="text-muted text-[11px]">{st.name}</span>
                </div>
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

      {/* Bento Item 3: We label what we know Guarantee */}
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
              Our rule
            </span>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-display font-bold text-ink">
              We label what we know
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Every position says whether it's passenger GPS, a reported station or an estimate. If we don't know, we say so.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-paper border border-rule space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-ink">
              <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
              <span>Estimates are labelled as estimates</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-ink">
              <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
              <span>No made-up trains or bookings</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-ink">
              <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
              <span>Outages are shown as outages</span>
            </div>
          </div>
        </div>

        <div className="pt-4 mt-3 border-t border-rule/60">
          <Link
            href="/admin"
            className="text-accent text-xs font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
          >
            <span>Service status</span>
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
                Assistant
              </span>
            </div>
            <span className="text-[11px] font-outlier px-2 py-0.5 rounded-pill bg-paper-3 text-muted border border-rule">
              Answers from live data
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-display font-bold text-ink">
                Just ask
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Ask where a train is, how late it is, or what it costs. Status answers come straight from live data.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-paper border border-rule text-xs text-ink self-start">
              <span className="text-muted block text-[10px] font-outlier">For example</span>
              &ldquo;Where is 12951 right now?&rdquo;
            </div>
          </div>
        </div>

        <div className="pt-4 mt-3 border-t border-rule/60 flex items-center justify-between">
          <span className="text-[11px] font-outlier text-muted">
            Enter just a train number to get started
          </span>
          <Link
            href="/ai-assistant"
            className="text-accent text-xs font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
          >
            <span>Open assistant</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
