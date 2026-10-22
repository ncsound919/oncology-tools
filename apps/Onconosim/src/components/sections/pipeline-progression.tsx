"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Layers, ChevronRight, Clock, GitCommit } from "lucide-react";
import { ASSETS, PIPELINE_STEPS, LEGS, TIER_LADDER } from "@/lib/data";

type LegFilter = "all" | 1 | 2 | 3 | 4;

export default function PipelineProgression() {
  const [legFilter, setLegFilter] = useState<LegFilter>("all");

  const steps = useMemo(() => {
    const list = legFilter === "all" ? PIPELINE_STEPS : PIPELINE_STEPS.filter((s) => s.leg === legFilter);
    return [...list].sort((a, b) => a.leg - b.leg || a.currentTier - b.currentTier);
  }, [legFilter]);

  return (
    <section id="pipeline" className="border-t border-[#1F262D] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#E8A94D]">
              Pipeline progression
            </div>
            <h2 className="onc-sans mt-3 max-w-2xl text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              Every asset's next rung — and the gap to climb it.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              Where each tracked asset sits on its leg's tier ladder, the next tier it's pursuing,
              and the specific evidence gap between current and next. The horizontal track is the
              0→5 evidence ladder; the bracket shows the climb still owed.
            </p>
          </div>
          <div className="onc-mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#5C646C]">
            <Layers className="h-3.5 w-3.5 text-[#E8A94D]" />
            {PIPELINE_STEPS.length} active programs
          </div>
        </div>

        {/* leg filter */}
        <div className="mt-8 flex flex-wrap gap-2">
          <LegChip active={legFilter === "all"} onClick={() => setLegFilter("all")} label="All legs" color="#E8A94D" />
          {LEGS.map((l) => (
            <LegChip
              key={l.id}
              active={legFilter === l.id}
              onClick={() => setLegFilter(l.id)}
              label={`Leg ${l.id} · ${l.short}`}
              color={l.color}
            />
          ))}
        </div>

        {/* ladder header */}
        <div className="mt-8 mb-3 grid grid-cols-[180px_1fr] gap-3 onc-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5C646C] md:grid-cols-[220px_1fr_160px]">
          <div>Asset</div>
          <div>Tier ladder · 0 → 5</div>
          <div className="hidden md:block">Next rung</div>
        </div>

        <div className="space-y-2">
          {steps.map((step, i) => {
            const asset = ASSETS.find((a) => a.code === step.assetCode)!;
            const leg = LEGS.find((l) => l.id === step.leg)!;
            return (
              <motion.div
                key={step.assetCode}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="grid grid-cols-[180px_1fr] gap-3 rounded-lg border border-[#1F262D] bg-[#0D1013] p-4 transition-colors hover:border-[#262D34] md:grid-cols-[220px_1fr_160px] md:items-center"
              >
                {/* asset label */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="onc-mono text-[11px] font-semibold text-[#E9E7DF]">{asset.code}</span>
                    <span className="onc-mono rounded px-1 py-0.5 text-[8.5px] uppercase tracking-[0.06em]" style={{ background: `${leg.color}18`, color: leg.color }}>
                      L{step.leg}
                    </span>
                  </div>
                  <div className="onc-sans mt-0.5 text-[10px] leading-tight text-[#8B9299] line-clamp-2">{asset.name}</div>
                </div>

                {/* ladder track */}
                <div className="min-w-0">
                  <TierTrack
                    current={step.currentTier}
                    target={step.targetTier}
                    color={leg.color}
                  />
                  <p className="onc-sans mt-2.5 text-[10.5px] leading-snug text-[#8B9299]">
                    <span className="onc-mono text-[#5C646C]">gap:</span> {step.nextGap}
                  </p>
                </div>

                {/* eta */}
                <div className="hidden md:flex md:items-center md:justify-end md:gap-1.5">
                  <Clock className="h-3 w-3 text-[#5C646C]" />
                  <span className="onc-mono text-[10px] uppercase tracking-[0.04em] text-[#8B9299]">{step.eta}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* tier legend */}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 onc-mono text-[9.5px] uppercase tracking-[0.08em] text-[#5C646C]">
          {TIER_LADDER.slice(0, 6).map((t) => (
            <span key={t.tier} className="flex items-center gap-1">
              <span className="font-semibold text-[#8B9299]">T{t.tier}</span>
              <span className="hidden sm:inline">{t.name}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function TierTrack({ current, target, color }: { current: number; target: number; color: string }) {
  return (
    <div className="relative">
      {/* base track */}
      <div className="flex h-7 items-center gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => {
          const tier = i;
          const isReached = tier <= current;
          const isGap = tier > current && tier <= target;
          return (
            <div key={tier} className="relative flex-1">
              <div
                className="h-2 rounded-sm transition-all"
                style={{
                  background: isReached ? color : isGap ? `${color}40` : "#1F262D",
                }}
              />
              {/* current marker */}
              {tier === current && (
                <div
                  className="absolute -top-1 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-[#0D1013]"
                  style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
                />
              )}
              {/* target marker */}
              {tier === target && target !== current && (
                <div
                  className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-2"
                  style={{ borderColor: color, background: "#0D1013" }}
                />
              )}
              {/* tier number */}
              <div
                className="onc-mono mt-1.5 text-center text-[9.5px] font-semibold"
                style={{ color: isReached ? color : isGap ? "#C9BFB5" : "#8B9299" }}
              >
                {tier}
              </div>
            </div>
          );
        })}
      </div>
      {/* gap bracket */}
      {target > current && (
        <div className="mt-0.5 flex items-center gap-1.5 onc-mono text-[9px] uppercase tracking-[0.08em]" style={{ color }}>
          <GitCommit className="h-3 w-3" />
          <span>
            climb T{current} → T{target}
          </span>
          <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

function LegChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button
      onClick={onClick}
      className="onc-mono rounded-md border px-3 py-1.5 text-[10.5px] uppercase tracking-[0.06em] transition-all"
      style={{
        borderColor: active ? color : "#1F262D",
        background: active ? `${color}12` : "transparent",
        color: active ? color : "#8B9299",
      }}
    >
      {label}
    </button>
  );
}
