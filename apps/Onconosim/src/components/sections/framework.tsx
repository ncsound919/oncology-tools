"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, AlertTriangle, Flag, Target, TrendingUp } from "lucide-react";
import { LEGS, TIER_LADDER } from "@/lib/data";
import { GTerm } from "@/components/glossary-term";
import { NarrateButton } from "@/components/narrate-button";

export default function Framework() {
  const [activeLeg, setActiveLeg] = useState<1 | 2 | 3 | 4>(1);
  const [hoveredTier, setHoveredTier] = useState<number | null>(null);
  const leg = LEGS.find((l) => l.id === activeLeg)!;

  return (
    <section id="framework" className="relative border-t border-[#1F262D] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        {/* section header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#4FD1C0]">
              The cure framework
            </div>
            <h2 className="onc-sans mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              Four legs, one cure — scored on a ladder that refuses to round up.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              A durable cure is not one endpoint. It is four independent biology problems that have
              to be solved in sequence — and each one has its own slow failure mode. Pick a leg to
              see its tier ladder, endpoints, and kill criteria. Scientific terms like{" "}
              <GTerm>PROTAC</GTerm>, <GTerm>DC50</GTerm>, <GTerm>DTC</GTerm>, and{" "}
              <GTerm>MHC-I</GTerm> are hoverable throughout the platform.
            </p>
          </div>
          <div className="onc-mono text-[10.5px] uppercase tracking-[0.1em] text-[#5C646C]">
            tier 5 ≠ “interesting mechanism”
          </div>
        </div>

        {/* leg selector */}
        <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LEGS.map((l) => {
            const active = l.id === activeLeg;
            return (
              <button
                key={l.id}
                onClick={() => setActiveLeg(l.id)}
                className="group relative overflow-hidden rounded-lg border p-4 text-left transition-all"
                style={{
                  borderColor: active ? l.color : "#1F262D",
                  background: active ? `${l.color}10` : "#0D1013",
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-0.5 transition-opacity"
                  style={{ background: l.color, opacity: active ? 1 : 0.3 }}
                />
                <div className="flex items-center justify-between">
                  <span
                    className="onc-mono text-[10px] uppercase tracking-[0.12em]"
                    style={{ color: active ? l.color : "#5C646C" }}
                  >
                    Leg {l.id}
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 transition-transform"
                    style={{ color: active ? l.color : "#5C646C", transform: active ? "translateX(2px)" : "none" }}
                  />
                </div>
                <div className="onc-sans mt-2 text-[13px] font-medium text-[#E9E7DF]">
                  {l.short}
                </div>
                <div className="onc-sans mt-0.5 text-[11px] leading-tight text-[#5C646C]">
                  {l.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* active leg detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeLeg}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]"
          >
            {/* thesis + tier ladder */}
            <div className="rounded-xl border border-[#1F262D] bg-[#0D1013] p-6">
              <div className="flex items-center gap-2">
                <span
                  className="onc-mono rounded px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]"
                  style={{ background: `${leg.color}18`, color: leg.color }}
                >
                  Leg {leg.id}
                </span>
                <h3 className="onc-sans text-[20px] font-semibold text-[#E9E7DF]">{leg.name}</h3>
                <div className="ml-auto">
                  <NarrateButton text={`Leg ${leg.id}: ${leg.name}. ${leg.thesis}`} label="Narrate" />
                </div>
              </div>
              <p className="onc-sans mt-3 text-[13.5px] leading-relaxed text-[#8B9299]">
                {leg.thesis}
              </p>

              {/* tier ladder */}
              <div className="mt-6">
                <div className="onc-mono mb-3 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.12em] text-[#5C646C]">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Evidence tier ladder
                </div>
                <div className="space-y-1.5">
                  {TIER_LADDER.map((t) => {
                    const reached = hoveredTier === null ? false : t.tier <= hoveredTier;
                    return (
                      <div
                        key={t.tier}
                        onMouseEnter={() => setHoveredTier(t.tier)}
                        onMouseLeave={() => setHoveredTier(null)}
                        className="group flex items-start gap-3 rounded-md border p-3 transition-all cursor-default"
                        style={{
                          borderColor: reached ? leg.color : "#1F262D",
                          background: reached ? `${leg.color}0a` : "transparent",
                        }}
                      >
                        <div
                          className="onc-mono mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded text-[11px] font-semibold"
                          style={{
                            background: reached ? leg.color : "#161B20",
                            color: reached ? "#0D1013" : "#8B9299",
                          }}
                        >
                          {t.tier}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="onc-sans text-[13px] font-medium text-[#E9E7DF]">{t.name}</span>
                            <span className="onc-mono text-[10px] uppercase tracking-[0.08em] text-[#5C646C]">
                              tier {t.tier}
                            </span>
                          </div>
                          <p className="onc-sans mt-1 text-[11.5px] leading-snug text-[#8B9299]">
                            {t.establishes}
                          </p>
                          {hoveredTier === t.tier && (
                            <p className="onc-sans mt-1.5 text-[11px] italic leading-snug text-[#5C646C]">
                              Does <span style={{ color: leg.color }}>not</span> establish: {t.notEstablish}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* right column: tier5 meaning, endpoints, kill criteria, gap */}
            <div className="space-y-4">
              <div
                className="rounded-xl border p-5"
                style={{ borderColor: `${leg.color}40`, background: `${leg.color}08` }}
              >
                <div className="onc-mono mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em]" style={{ color: leg.color }}>
                  <Flag className="h-3.5 w-3.5" />
                  What tier 5 means here
                  <span className="ml-auto">
                    <NarrateButton text={`What tier 5 means for leg ${leg.id}: ${leg.tier5}`} />
                  </span>
                </div>
                <p className="onc-sans text-[12.5px] leading-relaxed text-[#E9E7DF]">{leg.tier5}</p>
              </div>

              <div className="rounded-xl border border-[#1F262D] bg-[#0D1013] p-5">
                <div className="onc-mono mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[#5C646C]">
                  <Target className="h-3.5 w-3.5" />
                  Tier-specific endpoints
                </div>
                <ul className="space-y-2">
                  {leg.endpoints.map((e, i) => (
                    <li key={i} className="onc-mono flex gap-2 text-[11.5px] leading-relaxed text-[#8B9299]">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: leg.color }} />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[#E8664F]/30 bg-[#E8664F]/08 p-5">
                <div className="onc-mono mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[#E8664F]">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Kill criteria
                </div>
                <ul className="space-y-2">
                  {leg.killCriteria.map((k, i) => (
                    <li key={i} className="onc-sans flex gap-2 text-[12px] leading-relaxed text-[#C9BFB5]">
                      <span className="onc-mono mt-0.5 text-[10px] text-[#E8664F]">✕</span>
                      {k}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[#1F262D] bg-[#161B20]/60 p-5">
                <div className="onc-mono mb-2 text-[10px] uppercase tracking-[0.12em] text-[#9E8CF2]">
                  Open scoring gap
                </div>
                <p className="onc-sans text-[12px] leading-relaxed text-[#8B9299]">{leg.gaps}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
