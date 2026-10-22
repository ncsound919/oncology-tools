"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Loader2, Square } from "lucide-react";

interface VoiceInputProps {
  /** Called with the transcribed text. */
  onTranscript: (text: string) => void;
  /** Optional label for the button (screen readers). */
  label?: string;
}

type State = "idle" | "recording" | "transcribing";

/**
 * Records audio from the microphone via MediaRecorder, POSTs the base64 audio
 * to /api/asr, and calls onTranscript with the recognized text.
 */
export function VoiceInput({ onTranscript, label = "Speak your question" }: VoiceInputProps) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        cleanup();
        // transcribe
        setState("transcribing");
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1] ?? "";
            try {
              const res = await fetch("/api/asr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audio: base64 }),
              });
              const data = await res.json();
              if (data.error) throw new Error(data.error);
              const text = (data.text || "").trim();
              if (text) onTranscript(text);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setState("idle");
            }
          };
          reader.readAsDataURL(blob);
        } catch (e) {
          setError((e as Error).message);
          setState("idle");
        }
      };
      mr.start();
      setState("recording");
    } catch {
      setError("Microphone access denied or unavailable.");
      setState("idle");
    }
  }, [cleanup, onTranscript]);

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  }, []);

  const toggle = useCallback(() => {
    if (state === "recording") stop();
    else if (state === "idle") start();
  }, [state, start, stop]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={state === "transcribing"}
        className="onc-mono relative flex items-center justify-center rounded-md border p-2.5 transition-all disabled:opacity-50"
        style={{
          borderColor: state === "recording" ? "#E8664F" : "#262D34",
          background: state === "recording" ? "rgba(232,102,79,0.10)" : "transparent",
          color: state === "recording" ? "#E8664F" : "#8B9299",
        }}
        aria-label={label}
        title={label}
      >
        {state === "transcribing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "recording" ? (
          <>
            <Square className="h-4 w-4" />
            <span
              className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#E8664F]"
              style={{ animation: "onc-pulse 1s ease-in-out infinite" }}
            />
          </>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
      {state === "recording" && (
        <span className="onc-mono text-[10px] uppercase tracking-[0.06em] text-[#E8664F]">
          Recording… click to stop
        </span>
      )}
      {state === "transcribing" && (
        <span className="onc-mono text-[10px] uppercase tracking-[0.06em] text-[#8B9299]">
          Transcribing…
        </span>
      )}
      {error && (
        <span className="onc-sans text-[10.5px] text-[#E8664F]">{error}</span>
      )}
    </div>
  );
}
