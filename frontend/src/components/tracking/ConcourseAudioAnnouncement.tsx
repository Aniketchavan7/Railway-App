"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Radio, Sparkles, Languages } from "lucide-react";

interface ConcourseAudioAnnouncementProps {
  trainNumber: string;
  trainName: string;
  origin?: string;
  dest?: string;
  currentStation?: string | null;
  platform?: string | null;
  delayMinutes?: number;
}

export function ConcourseAudioAnnouncement({
  trainNumber,
  trainName,
  origin = "Origin",
  dest = "Destination",
  currentStation,
  platform,
  delayMinutes = 0,
}: ConcourseAudioAnnouncementProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const playChimeAndAnnounce = () => {
    if (isPlaying) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);

    try {
      // 1. Play Authentic 3-Tone Indian Railways Melodic Gong
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const now = ctx.currentTime;
        // Classic Indian Railways announcement chime: C5 -> E5 -> G5
        const notes = [
          { freq: 523.25, time: 0.0, dur: 0.35 },
          { freq: 659.25, time: 0.32, dur: 0.35 },
          { freq: 783.99, time: 0.64, dur: 0.65 },
        ];

        notes.forEach(({ freq, time, dur }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + time);
          gain.gain.setValueAtTime(0.001, now + time);
          gain.gain.exponentialRampToValueAtTime(0.25, now + time + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + time);
          osc.stop(now + time + dur);
        });
      }

      // 2. Play Concourse Spoken Announcement after chime (1.3s delay)
      setTimeout(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          setIsPlaying(false);
          return;
        }

        const pfText = platform ? `platform number ${platform}` : "the designated platform";
        const spokenTrainNum = trainNumber.split("").join(" ");

        let text = "";
        if (lang === "en") {
          if (delayMinutes > 0) {
            text = `May I have your attention please. Train number ${spokenTrainNum}, ${trainName}, from ${origin} to ${dest}, is running late by ${delayMinutes} minutes. Expected arrival on ${pfText}. Inconvenience caused is deeply regretted.`;
          } else {
            text = `May I have your attention please. Train number ${spokenTrainNum}, ${trainName}, from ${origin} to ${dest}, is running on time. Expected arrival on ${pfText}.`;
          }
        } else {
          // Hindi announcement
          if (delayMinutes > 0) {
            text = `Kripya dhyan dijiye. Gaadi sankhya ${spokenTrainNum}, ${trainName}, ${origin} se chalkar ${dest} ko jaane waali, apne nirdharit samay se ${delayMinutes} minute deri se chal rahi hai. Iske ${pfText} par aane ki sambhavna hai.`;
          } else {
            text = `Kripya dhyan dijiye. Gaadi sankhya ${spokenTrainNum}, ${trainName}, ${origin} se chalkar ${dest} ko jaane waali, samay par chal rahi hai. Iske ${pfText} par aane ki sambhavna hai.`;
          }
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";

        utterance.onend = () => {
          setIsPlaying(false);
        };
        utterance.onerror = () => {
          setIsPlaying(false);
        };

        window.speechSynthesis.speak(utterance);
      }, 1300);
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Language Toggle */}
      <div className="flex items-center bg-paper-3 p-0.5 rounded-pill border border-rule text-[11px] font-outlier">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`px-2 py-0.5 rounded-pill transition-colors ${
            lang === "en" ? "bg-paper text-ink font-bold shadow-xs" : "text-muted hover:text-ink"
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLang("hi")}
          className={`px-2 py-0.5 rounded-pill transition-colors ${
            lang === "hi" ? "bg-paper text-ink font-bold shadow-xs" : "text-muted hover:text-ink"
          }`}
        >
          HI
        </button>
      </div>

      {/* Main Broadcast Button */}
      <button
        type="button"
        onClick={playChimeAndAnnounce}
        className={`px-3 py-1 rounded-pill text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
          isPlaying
            ? "bg-accent text-accent-ink border-accent animate-pulse"
            : "bg-paper-2 hover:bg-paper-3 text-ink border-rule hover:border-rule-2"
        }`}
        title="Play authentic Indian Railways platform announcement"
      >
        {isPlaying ? (
          <>
            <VolumeX className="w-3.5 h-3.5" />
            <span>Broadcasting…</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5 text-accent" />
            <span>Platform Chime</span>
          </>
        )}
      </button>
    </div>
  );
}
