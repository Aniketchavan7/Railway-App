"use client";

import React, { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
  Send,
} from "lucide-react";

interface TripShareModalProps {
  trainNumber: string;
  trainName: string;
  currentStation?: string | null;
  currentStationName?: string | null;
  delayMinutes?: number;
  speedKmH?: number;
  origin?: string;
  destination?: string;
  nextStationName?: string | null;
  nextStationPlatform?: string | null;
  platform?: string | null;
}

export function TripShareModal({
  trainNumber,
  trainName,
  currentStation,
  currentStationName,
  delayMinutes = 0,
  speedKmH = 0,
  origin,
  destination,
  nextStationName,
  nextStationPlatform,
  platform,
}: TripShareModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeStation = currentStation || currentStationName;
  const activeDest = destination || nextStationName;
  const activePlatform = platform || nextStationPlatform;

  const trackingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/train?number=${trainNumber}`
      : `https://railpulse.app/train?number=${trainNumber}`;

  const delayText =
    delayMinutes === 0
      ? "Running on time"
      : delayMinutes > 0
      ? `${delayMinutes} mins behind schedule`
      : `${Math.abs(delayMinutes)} mins ahead of schedule`;

  const shareText = `Live Train Status: #${trainNumber} ${trainName}
Route: ${origin || "Origin"} to ${activeDest || "Destination"}
Location: ${activeStation || "In transit"}
Status: ${delayText}
Speed: ${Math.round(speedKmH)} km/h
${activePlatform ? `Platform: ${activePlatform}` : ""}

Track live radar:
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
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  const handleTelegramShare = () => {
    const encoded = encodeURIComponent(shareText);
    const url = encodeURIComponent(trackingUrl);
    window.open(`https://t.me/share/url?url=${url}&text=${encoded}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${trainName} (#${trainNumber}) Status`,
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
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 rounded-pill border border-rule bg-paper-3 hover:bg-paper text-ink text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent active:opacity-80"
      >
        <Share2 className="w-3.5 h-3.5 text-accent" />
        <span>Share trip</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paper/80">
          <div className="relative w-full max-w-md rounded-card border border-rule bg-paper-2 p-6 space-y-4">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-pill text-muted hover:text-ink hover:bg-paper-3 transition-colors cursor-pointer"
              aria-label="Close share dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2.5">
              <Share2 className="w-5 h-5 text-accent shrink-0" />
              <div>
                <h3 className="text-base font-display font-bold text-ink">
                  Share live journey
                </h3>
                <p className="text-xs text-muted font-outlier">
                  Send live status and radar link to family or colleagues
                </p>
              </div>
            </div>

            {/* Live Message Preview */}
            <div className="p-3.5 rounded-lg bg-paper-3 border border-rule font-outlier text-xs text-ink whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {shareText}
            </div>

            {/* Share Options */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-full py-2 px-3 rounded-pill bg-paper-3 hover:bg-paper border border-rule text-ink font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
              >
                <MessageCircle className="w-4 h-4 text-ok" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleTelegramShare}
                className="w-full py-2 px-3 rounded-pill bg-paper-3 hover:bg-paper border border-rule text-ink font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Send className="w-4 h-4 text-cool" />
                <span>Telegram</span>
              </button>
            </div>

            {/* Copy / Native Share Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-rule/50">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2 px-3 rounded-pill border border-rule bg-paper-3 hover:bg-paper text-ink font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-ok" />
                    <span className="text-ok font-semibold whitespace-nowrap">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-muted" />
                    <span className="whitespace-nowrap">Copy text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="py-2 px-4 rounded-pill bg-accent hover:opacity-90 active:opacity-80 text-accent-ink font-semibold text-xs transition-opacity flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Share</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
