"use client";

import { useState, useRef, useCallback } from "react";
import { Volume2, Loader2, Square } from "lucide-react";

interface NarrateButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "md";
}

/**
 * Fetches a WAV narration of `text` from /api/tts and plays it.
 * Click to generate + play; click again to stop.
 */
export function NarrateButton({ text, label, size = "sm" }: NarrateButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState("idle");
  }, []);

  const play = useCallback(async () => {
    if (state === "playing") {
      stop();
      return;
    }
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speed: 1.0 }),
      });
      if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
      const blob = await res.blob();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      audio.onerror = () => setState("idle");
      await audio.play();
      setState("playing");
    } catch {
      setState("idle");
    }
  }, [text, state, stop]);

  const isPlaying = state === "playing";
  const isLoading = state === "loading";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      onClick={play}
      disabled={isLoading}
      className="onc-mono inline-flex items-center gap-1.5 rounded-md border border-[#262D34] px-2 py-1 text-[10px] uppercase tracking-[0.06em] text-[#8B9299] transition-all hover:border-[#4FD1C0]/40 hover:text-[#4FD1C0] disabled:opacity-50"
      aria-label={label || "Narrate this explanation"}
      title={label || "Narrate"}
    >
      {isLoading ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : isPlaying ? (
        <Square className={iconSize} />
      ) : (
        <Volume2 className={iconSize} />
      )}
      {label && <span>{isPlaying ? "Stop" : isLoading ? "Loading" : label}</span>}
    </button>
  );
}
