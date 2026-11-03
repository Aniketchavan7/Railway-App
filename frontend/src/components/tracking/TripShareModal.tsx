"use client";

import React, { useState } from "react";
import { Share2, Check, Copy, MessageCircle, Send, X, ExternalLink } from "lucide-react";

interface TripShareModalProps {
  trainNumber: string;
  trainName: string;
  currentStationName?: string | null;
  nextStationName?: string | null;
  nextStationPlatform?: string | null;
  nextStationEta?: string | null;
  speedKmH?: number;
  delayMinutes?: number;
}

export function TripShareModal({
  trainNumber,
  trainName,
  currentStationName = "En Route",
  nextStationName,
  nextStationPlatform,
  nextStationEta,
  speedKmH = 0,
  delayMinutes = 0,
}: TripShareModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayCurrentStation = currentStationName || "En Route";

  const delayText =
    delayMinutes > 0
      ? `Delayed by ${delayMinutes} min`
      : delayMinutes === 0
      ? "Running Right On Time"
      : `Running early by ${Math.abs(delayMinutes)} min`;

  const trackingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/train/?number=${trainNumber}`
    : `https://railpulse-01i.pages.dev/train/?number=${trainNumber}`;

  const shareText = `🚄 Live Train Journey Update — RailPulse:
Train: ${trainName || `Train #${trainNumber}`} (${trainNumber})
Status: ${delayText} ${speedKmH > 10 ? `(Speed: ${Math.round(speedKmH)} km/h)` : ""}
Current Position: ${displayCurrentStation}
Next Halt: ${nextStationName || "Next Station"}${nextStationEta ? ` • ETA: ${nextStationEta}` : ""}${nextStationPlatform ? ` • PF: ${nextStationPlatform}` : ""}

Track my train's exact live location here:
${trackingUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const handleTelegramShare = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(trackingUrl)}&text=${encoded}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Live Status: ${trainName} (${trainNumber})`,
          text: shareText,
          url: trackingUrl,
        });
      } catch {
        // User dismissed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
      >
        <Share2 className="w-3.5 h-3.5 text-blue-400" />
        <span>Share Trip</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Share Live Journey
                </h3>
                <p className="text-xs text-slate-400">
                  Send real-time status & live link to family or colleagues
                </p>
              </div>
            </div>

            {/* Live Message Preview */}
            <div className="mb-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {shareText}
            </div>

            {/* Share Options */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <button
                onClick={handleWhatsAppShare}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={handleTelegramShare}
                className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-sky-950/40"
              >
                <Send className="w-4 h-4" />
                <span>Telegram</span>
              </button>
            </div>

            {/* Copy / Native Share Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition flex items-center justify-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition flex items-center justify-center gap-1.5"
                  title="More share options"
                >
                  <ExternalLink className="w-4 h-4 text-blue-400" />
                  <span>More</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
