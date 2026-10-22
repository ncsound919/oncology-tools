"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Compass, CheckCircle2 } from "lucide-react";

const STORAGE_KEY = "oncosim:tour-completed";

interface TourStep {
  targetId: string;
  title: string;
  body: string;
  color: string;
}

const STEPS: TourStep[] = [
  {
    targetId: "top",
    title: "Welcome to OncoSIM",
    body: "A computational cancer systems biology platform that fuses genomic sequencing data and mechanistic models into a four-leg cure framework — with a strict 0-to-5 evidence ladder that refuses to round up. This 90-second tour highlights the key sections.",
    color: "#4FD1C0",
  },
  {
    targetId: "dashboard",
    title: "Your personalized dashboard",
    body: "Pin assets and open deep dives to build your dashboard. It shows your pinned assets, recently-viewed assets, and an aggregate evidence-tier distribution across the registry. Empty until you interact.",
    color: "#4FD1C0",
  },
  {
    targetId: "framework",
    title: "The four-leg cure framework",
    body: "The core of OncoSIM: four independent biology problems (debulk, block re-seeding, anticipate resistance, immune cleanup of dormant disease), each with its own 0–5 tier ladder, endpoints, and kill criteria. Switch legs to explore. Scientific terms are hoverable.",
    color: "#9E8CF2",
  },
  {
    targetId: "calculator",
    title: "The tier calculator",
    body: "Pick an asset, claim which evidence tiers you have, and see the tier you sit at — plus the specific gap to climb the next rung. Tiers above the reviewed ceiling are locked (you can't claim evidence that doesn't exist yet).",
    color: "#E8A94D",
  },
  {
    targetId: "assistant",
    title: "Ask the framework",
    body: "The AI research assistant reasons inside the cure framework and refuses to round evidence up. Ask it to score a combination, design an experiment, or stress-test a claim. Voice input is supported — click the mic to speak.",
    color: "#9E8CF2",
  },
];

let openSetter: ((open: boolean) => void) | null = null;
export function openTour() {
  openSetter?.(true);
}

/** Small client-side button for the footer that restarts the tour. */
export function FooterTourButton() {
  return (
    <button
      onClick={() => openTour()}
      className="onc-mono flex items-center gap-1 text-[10px] uppercase tracking-[0.06em] text-[#5C646C] transition-colors hover:text-[#4FD1C0]"
      aria-label="Restart guided tour"
      title="Restart guided tour"
    >
      <Compass className="h-4 w-4" />
      Tour
    </button>
  );
}

export default function GuidedTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    openSetter = setOpen;
    // first-visit auto-open
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else close();
  }, [step, close]);

  const prev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  // scroll target into view when step changes
  useEffect(() => {
    if (!open) return;
    const target = STEPS[step].targetId;
    const el = document.getElementById(target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [step, open]);

  // keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, close]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* spotlight overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] pointer-events-none"
            style={{
              background: "rgba(13,16,19,0.55)",
              backdropFilter: "blur(2px)",
            }}
          />
          {/* tooltip card — positioned bottom-center, above the fold */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 left-1/2 z-[120] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2"
          >
            <div className="overflow-hidden rounded-xl border border-[#262D34] bg-[#0D1013] shadow-2xl">
              {/* header */}
              <div
                className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1F262D]"
                style={{ background: `${current.color}10` }}
              >
                <Compass className="h-4 w-4" style={{ color: current.color }} />
                <span className="onc-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: current.color }}>
                  Tour · {step + 1} / {STEPS.length}
                </span>
                <div className="ml-auto flex gap-1">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className="h-1 w-4 rounded-full transition-all"
                      style={{
                        background: i === step ? current.color : i < step ? `${current.color}60` : "#1F262D",
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={close}
                  className="ml-2 text-[#5C646C] transition-colors hover:text-[#E8664F]"
                  aria-label="Skip tour"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* body */}
              <div className="p-4">
                <h3 className="onc-sans text-[16px] font-semibold text-[#E9E7DF]">{current.title}</h3>
                <p className="onc-sans mt-2 text-[12.5px] leading-relaxed text-[#8B9299]">{current.body}</p>
              </div>
              {/* footer / nav */}
              <div className="flex items-center justify-between border-t border-[#1F262D] px-4 py-2.5">
                <button
                  onClick={prev}
                  disabled={step === 0}
                  className="onc-mono flex items-center gap-1 text-[10px] uppercase tracking-[0.06em] text-[#5C646C] transition-colors hover:text-[#E9E7DF] disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <button
                  onClick={close}
                  className="onc-mono text-[10px] uppercase tracking-[0.06em] text-[#5C646C] transition-colors hover:text-[#E8664F]"
                >
                  Skip tour
                </button>
                <button
                  onClick={next}
                  className="onc-mono flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#0D1013] transition-all"
                  style={{ background: current.color }}
                >
                  {isLast ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Done
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
